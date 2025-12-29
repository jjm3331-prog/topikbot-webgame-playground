import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AnsweredQuestionsState {
  questionIds: Set<string>;
  vocabularyIds: Set<string>;
  lessonIds: Set<string>;
  loading: boolean;
}

/**
 * 사용자가 이미 푼 문제/학습한 항목을 추적하는 Hook
 * 중복 문제 출제 방지를 위해 사용
 */
export const useAnsweredQuestions = () => {
  const [state, setState] = useState<AnsweredQuestionsState>({
    questionIds: new Set(),
    vocabularyIds: new Set(),
    lessonIds: new Set(),
    loading: true
  });
  const [userId, setUserId] = useState<string | null>(null);

  // 사용자 인증 확인 및 데이터 로드
  useEffect(() => {
    const loadAnsweredData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setState(prev => ({ ...prev, loading: false }));
        return;
      }
      
      setUserId(user.id);
      
      try {
        // 병렬로 데이터 로드
        const [answersResult, progressResult, mistakesResult] = await Promise.all([
          // 모의고사 답변 기록
          supabase
            .from('mock_exam_answers')
            .select('question_id, mock_exam_attempts!inner(user_id)')
            .eq('mock_exam_attempts.user_id', user.id),
          
          // 학습 진행 기록
          supabase
            .from('learning_progress')
            .select('lesson_id')
            .eq('user_id', user.id)
            .eq('completed', true),
          
          // 오답 노트 (mastered된 것들)
          supabase
            .from('user_mistakes')
            .select('item_id, item_type')
            .eq('user_id', user.id)
            .eq('mastered', true)
        ]);

        const questionIds = new Set<string>(
          (answersResult.data || []).map(a => a.question_id)
        );
        
        const lessonIds = new Set<string>(
          (progressResult.data || []).map(p => p.lesson_id)
        );
        
        // mastered된 어휘는 중복 출제 방지에서 제외
        const vocabularyIds = new Set<string>(
          (mistakesResult.data || [])
            .filter(m => m.item_type === 'vocabulary')
            .map(m => m.item_id)
        );

        console.log(`[useAnsweredQuestions] Loaded: ${questionIds.size} questions, ${lessonIds.size} lessons, ${vocabularyIds.size} mastered vocab`);

        setState({
          questionIds,
          vocabularyIds,
          lessonIds,
          loading: false
        });
      } catch (error) {
        console.error('[useAnsweredQuestions] Error loading data:', error);
        setState(prev => ({ ...prev, loading: false }));
      }
    };

    loadAnsweredData();
  }, []);

  /**
   * 문제 ID가 이미 푼 것인지 확인
   */
  const isQuestionAnswered = useCallback((questionId: string): boolean => {
    return state.questionIds.has(questionId);
  }, [state.questionIds]);

  /**
   * 어휘 ID가 이미 마스터한 것인지 확인
   */
  const isVocabularyMastered = useCallback((vocabularyId: string): boolean => {
    return state.vocabularyIds.has(vocabularyId);
  }, [state.vocabularyIds]);

  /**
   * 레슨 ID가 이미 완료된 것인지 확인
   */
  const isLessonCompleted = useCallback((lessonId: string): boolean => {
    return state.lessonIds.has(lessonId);
  }, [state.lessonIds]);

  /**
   * 문제 목록에서 이미 푼 문제 제외 (중복 방지 핵심 로직)
   * @param questions 전체 문제 목록
   * @param idField 문제 ID 필드명 (기본값: 'id')
   * @param minCount 최소 필요 문제 수 (부족하면 이미 푼 문제도 포함)
   */
  const filterAnsweredQuestions = useCallback(<T extends Record<string, any>>(
    questions: T[],
    idField: keyof T = 'id' as keyof T,
    minCount: number = 5
  ): T[] => {
    if (state.loading) return questions;
    
    // 이미 푼 문제 제외
    const unanswered = questions.filter(q => !state.questionIds.has(String(q[idField])));
    
    console.log(`[filterAnsweredQuestions] ${unanswered.length}/${questions.length} new questions available`);
    
    // 충분한 문제가 있으면 미답 문제만 반환
    if (unanswered.length >= minCount) {
      // 랜덤 셔플
      return [...unanswered].sort(() => Math.random() - 0.5);
    }
    
    // 문제가 부족하면 전체에서 랜덤 셔플 (이미 푼 문제도 포함)
    console.log(`[filterAnsweredQuestions] Not enough new questions (${unanswered.length}), including answered ones`);
    return [...questions].sort(() => Math.random() - 0.5);
  }, [state.questionIds, state.loading]);

  /**
   * 어휘 목록에서 마스터한 어휘 제외 (선택적)
   */
  const filterMasteredVocabulary = useCallback(<T extends Record<string, any>>(
    vocabulary: T[],
    idField: keyof T = 'id' as keyof T,
    excludeMastered: boolean = false
  ): T[] => {
    if (state.loading || !excludeMastered) {
      return [...vocabulary].sort(() => Math.random() - 0.5);
    }
    
    const unmastered = vocabulary.filter(v => !state.vocabularyIds.has(String(v[idField])));
    
    if (unmastered.length >= 10) {
      return [...unmastered].sort(() => Math.random() - 0.5);
    }
    
    return [...vocabulary].sort(() => Math.random() - 0.5);
  }, [state.vocabularyIds, state.loading]);

  /**
   * 새로 푼 문제 ID 추가 (로컬 상태 업데이트)
   */
  const markQuestionAnswered = useCallback((questionId: string) => {
    setState(prev => ({
      ...prev,
      questionIds: new Set([...prev.questionIds, questionId])
    }));
  }, []);

  /**
   * 세션 내 임시 제외 목록 (서버 저장 전 로컬 추적용)
   */
  const [sessionExcluded, setSessionExcluded] = useState<Set<string>>(new Set());

  const addToSessionExcluded = useCallback((id: string) => {
    setSessionExcluded(prev => new Set([...prev, id]));
  }, []);

  const isSessionExcluded = useCallback((id: string): boolean => {
    return sessionExcluded.has(id);
  }, [sessionExcluded]);

  const clearSessionExcluded = useCallback(() => {
    setSessionExcluded(new Set());
  }, []);

  return {
    loading: state.loading,
    userId,
    answeredQuestionIds: state.questionIds,
    masteredVocabularyIds: state.vocabularyIds,
    completedLessonIds: state.lessonIds,
    isQuestionAnswered,
    isVocabularyMastered,
    isLessonCompleted,
    filterAnsweredQuestions,
    filterMasteredVocabulary,
    markQuestionAnswered,
    // 세션 내 임시 제외
    sessionExcluded,
    addToSessionExcluded,
    isSessionExcluded,
    clearSessionExcluded
  };
};

export default useAnsweredQuestions;
