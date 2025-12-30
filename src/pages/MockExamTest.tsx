import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Play,
  Pause,
  BookOpen,
  Headphones,
  PenTool,
  Flag,
  CheckCircle2,
  X,
  Send,
  Home,
  FileText,
  Lightbulb,
  Target,
  Gauge,
  Grid3X3,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { mapExamTypeToDb } from "@/lib/mockExamDb";
import { getPreset, getPresetTotalTime, type ExamPreset } from "@/lib/examPresets";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: number;
  section: string;
  part_number: number;
  question_number?: number;
  question_audio_url?: string;
  question_image_url?: string;
  option_images?: string[];
  explanation_ko?: string;
  explanation_vi?: string;
  explanation_en?: string;
  explanation_ja?: string;
  explanation_zh?: string;
  explanation_ru?: string;
  explanation_uz?: string;
  point_value?: number;
  instruction_text?: string;
  exam_round?: number;
  exam_year?: number;
  question_type?: 'multiple_choice' | 'short_answer' | 'essay';
  word_limit?: number;
  sample_answer?: string;
}

interface AttemptData {
  id: string;
  user_id: string;
  exam_type: string;
  exam_mode: string;
  section?: string;
  part_number?: number;
  total_questions: number;
  correct_count: number;
  started_at: string;
  finished_at?: string;
  is_completed: boolean;
  time_taken_seconds?: number;
  time_limit_seconds?: number;
}

interface AnswerData {
  question_id: string;
  user_answer: number | null;
  is_correct?: boolean;
  time_spent_seconds?: number;
  text_answer?: string;
}

const MockExamTest = () => {
  const { examType } = useParams<{ examType: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  
  const mode = searchParams.get('mode') || 'full';
  const sectionRaw = searchParams.get('section');
  const partRaw = searchParams.get('part');
  const partNumber = partRaw ? Number(partRaw) : null;
  const weaknessQuestionIds = searchParams.get('questions')?.split(',').filter(Boolean) || [];
  const weaknessReasons = searchParams.get('reasons')?.split(',') || [];

  const allowedSections = new Set(['listening', 'reading', 'writing']);
  const section = sectionRaw ? String(sectionRaw).toLowerCase() : null;
  const safePartNumber = partNumber !== null && Number.isFinite(partNumber) ? partNumber : null;

  // 잘못된 경로/파라미터 방어 (훅 순서 깨지지 않도록 "리다이렉트 플래그"만 계산)
  const invalidRoute =
    (mode === 'section' && section !== null && !allowedSections.has(section)) ||
    (mode === 'part' && (!section || !allowedSections.has(section) || safePartNumber === null || safePartNumber <= 0));
  const dbExamTypeForPreset = mapExamTypeToDb(examType || 'topik1');
  const examPreset = getPreset(dbExamTypeForPreset, mode);
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, AnswerData>>(new Map());
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [attempt, setAttempt] = useState<AttemptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [showQuestionGrid, setShowQuestionGrid] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState<Map<string, number>>(new Map());
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const isPracticeMode = examPreset ? 
    examPreset.settings.explanationTiming === 'immediate' : 
    (mode === 'section' || mode === 'part' || mode === 'weakness');
  const [showExplanation, setShowExplanation] = useState<Map<string, boolean>>(new Map());
  
  const allowPause = examPreset?.settings.allowPause ?? isPracticeMode;
  const allowSkip = examPreset?.settings.allowSkip ?? true;
  const explanationTiming = examPreset?.settings.explanationTiming ?? (isPracticeMode ? 'immediate' : 'after_exam');
  const scoringMethod = examPreset?.settings.scoringMethod ?? (isPracticeMode ? 'immediate' : 'after_submit');
  
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentQuestion = questions[currentIndex];
  const isListeningSection = currentQuestion?.section === 'listening';
  const isWritingSection = currentQuestion?.section === 'writing';
  const isReadingSection = currentQuestion?.section === 'reading';
  
  const [writingAnswers, setWritingAnswers] = useState<Map<string, string>>(new Map());
  
  const getTimeLimit = useCallback(() => {
    if (examPreset) {
      if (!examPreset.settings.timeLimit) return null;
      if (examPreset.settings.timeLimitSeconds) {
        return examPreset.settings.timeLimitSeconds;
      }
      if (examPreset.sections) {
        if (section && examPreset.sections[section as keyof typeof examPreset.sections]) {
          return examPreset.sections[section as keyof typeof examPreset.sections]?.timeSeconds || null;
        }
        return getPresetTotalTime(examPreset);
      }
    }
    if (isPracticeMode) return null;
    
    const timeLimits: Record<string, { listening: number; reading: number; writing?: number }> = {
      topik1: { listening: 40 * 60, reading: 60 * 60 },
      topik2: { listening: 60 * 60, reading: 70 * 60, writing: 50 * 60 },
      eps: { listening: 25 * 60, reading: 25 * 60 }
    };
    
    const examLimits = timeLimits[examType || 'topik1'];
    if (!examLimits) return null;
    if (section) {
      return examLimits[section as keyof typeof examLimits] || null;
    }
    return examLimits.listening + examLimits.reading + (examLimits.writing || 0);
  }, [examType, section, isPracticeMode, examPreset]);
  
  const getWeaknessReason = (questionId: string): string | null => {
    if (mode !== 'weakness' || weaknessQuestionIds.length === 0) return null;
    const idx = weaknessQuestionIds.indexOf(questionId);
    if (idx >= 0 && weaknessReasons[idx]) {
      return decodeURIComponent(weaknessReasons[idx]);
    }
    return null;
  };

  useEffect(() => {
    const initExam = async () => {
      if (invalidRoute) {
        toast({ title: '잘못된 접근', description: '선택한 영역/파트 경로가 올바르지 않습니다.', variant: 'destructive' });
        navigate('/mock-exam');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "로그인이 필요합니다", variant: "destructive" });
        navigate('/auth');
        return;
      }
      setUser(user);
      
      const dbExamType = mapExamTypeToDb(examType || 'topik1');

      let existingAttempt: any = null;
      if (mode !== 'weakness') {
        let attemptQuery = supabase
          .from('mock_exam_attempts')
          .select('*')
          .eq('user_id', user.id)
          .eq('exam_type', dbExamType)
          .eq('exam_mode', mode)
          .eq('is_completed', false);

        if (mode === 'section') {
          attemptQuery = attemptQuery.eq('section', section || null).is('part_number', null);
        } else if (mode === 'part') {
          attemptQuery = attemptQuery.eq('section', section || null).eq('part_number', safePartNumber);
        } else {
          attemptQuery = attemptQuery.is('section', null).is('part_number', null);
        }

        const { data, error } = await attemptQuery
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.warn('[MockExamTest] existing attempt lookup error (ignored)', {
            examType,
            mode,
            section,
            safePartNumber,
            error,
          });
        }

        // 안전장치: 현재 라우트 파라미터와 불일치하는 attempt는 절대 재개하지 않음
        if (data) {
          const sameSection = (data.section ?? null) === (section ?? null);
          const samePart = (data.part_number ?? null) === (safePartNumber ?? null);
          const shouldResume =
            (mode === 'full' && data.section === null && data.part_number === null) ||
            (mode === 'section' && sameSection && data.part_number === null) ||
            (mode === 'part' && sameSection && samePart);

          existingAttempt = shouldResume ? data : null;
        }
      }
      
      if (existingAttempt) {
        await resumeAttempt(existingAttempt, user.id);
      } else {
        await startNewAttempt(user.id);
      }
    };
    
    initExam();
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
    };
  }, [examType, mode, section, safePartNumber, invalidRoute]);

  const startNewAttempt = async (userId: string) => {
    try {
      const dbExamType = mapExamTypeToDb(examType || 'topik1');
      const difficulty = searchParams.get('difficulty') || 'intermediate';
      
      const { data: answeredQuestions } = await supabase
        .from('mock_exam_answers')
        .select('question_id, mock_exam_attempts!inner(user_id)')
        .eq('mock_exam_attempts.user_id', userId);
      
      const answeredQuestionIds = new Set(
        (answeredQuestions || []).map(a => a.question_id)
      );
      
      let query = supabase
        .from('mock_question_bank')
        .select('*')
        .eq('exam_type', dbExamType)
        .eq('is_active', true);

      const difficultyMap: Record<string, string[]> = {
        beginner: ['easy', '쉬움', 'beginner'],
        intermediate: ['medium', '보통', 'intermediate', 'normal'],
        advanced: ['hard', '어려움', 'advanced', 'difficult'],
      };
      const difficultyValues = difficultyMap[difficulty] || difficultyMap.intermediate;

      // ========== 데이터 기반 "경로 전수 검증" (해당 examType/section/part에 실제 문제가 존재하는지) ==========
      // 섹션/파트가 DB에 없으면, 사용자는 "경로 꼬임"으로 느끼기 때문에 여기서 명확히 차단한다.
      if (mode !== 'weakness') {
        let countQuery = supabase
          .from('mock_question_bank')
          .select('id', { count: 'exact', head: true })
          .eq('exam_type', dbExamType)
          .eq('is_active', true);

        if (section) countQuery = countQuery.eq('section', section);
        if (safePartNumber) countQuery = countQuery.eq('part_number', safePartNumber);

        const { count, error: countError } = await countQuery;

        if (countError) {
          console.error('[MockExamTest] question count check error', {
            examType,
            mode,
            section,
            safePartNumber,
            countError,
          });
          toast({ title: '문제를 불러올 수 없습니다', description: '잠시 후 다시 시도해주세요.', variant: 'destructive' });
          navigate('/mock-exam');
          return;
        }

        if (!count || count <= 0) {
          console.warn('[MockExamTest] no questions for this route', { examType, mode, section, safePartNumber });
          toast({
            title: '문제 준비중',
            description: '선택한 영역/파트에 아직 문제가 없습니다. 다른 항목을 선택해주세요.',
          });
          navigate('/mock-exam');
          return;
        }
      }

      if (mode === 'weakness' && weaknessQuestionIds.length > 0) {
        query = supabase
          .from('mock_question_bank')
          .select('*')
          .in('id', weaknessQuestionIds)
          .eq('is_active', true);
      } else {
        if (section) {
          query = query.eq('section', section);
        }
        if (safePartNumber) {
          query = query.eq('part_number', safePartNumber);
        }
        if (mode !== 'full' && difficulty !== 'all') {
          query = query.in('difficulty', difficultyValues);
        }
      }

      const { data: allQuestionData, error } = await query.order('section').order('part_number').order('question_number');

      if (error) {
        console.error('[MockExamTest] question load error', { examType, mode, section, safePartNumber, error });
        toast({ title: '문제를 불러올 수 없습니다', description: '잠시 후 다시 시도해주세요.', variant: 'destructive' });
        navigate('/mock-exam');
        return;
      }

      let questionData = (allQuestionData || []).filter((q) => !answeredQuestionIds.has(q.id));

      if (questionData.length < 10 && allQuestionData && allQuestionData.length > 0) {
        const shuffledAll = [...allQuestionData].sort(() => Math.random() - 0.5);
        questionData = shuffledAll;
      }

      if (!questionData.length) {
        console.warn('[MockExamTest] no questions found after filtering', { examType, mode, section, safePartNumber });
        toast({
          title: '문제 준비중',
          description: '현재 조건으로 출제할 문제가 없습니다. 다른 난이도/항목을 선택해주세요.',
        });
        navigate('/mock-exam');
        return;
      }
      
      const shuffledQuestions = [...questionData].sort(() => Math.random() - 0.5);
      
      const getFullModeQuestionLimit = (): number => {
        const dbType = dbExamType;
        if (dbType === 'TOPIK_I') return 70;
        if (dbType === 'TOPIK_II') return 104;
        if (dbType === 'TOPIK_EPS') return 50;
        return 70;
      };
      
      const questionLimits: Record<string, number> = {
        'full': getFullModeQuestionLimit(),
        'section': section === 'listening' ? (dbExamType === 'TOPIK_II' ? 50 : dbExamType === 'TOPIK_I' ? 30 : 25) : 
                   section === 'reading' ? (dbExamType === 'TOPIK_II' ? 50 : dbExamType === 'TOPIK_I' ? 40 : 25) : 30,
        'part': 15,
        'weakness': weaknessQuestionIds.length
      };
      const limitedQuestions = shuffledQuestions.slice(0, Math.min(questionLimits[mode] || 30, shuffledQuestions.length));
      
      const formattedQuestions: Question[] = limitedQuestions.map(q => ({
        id: q.id,
        question_text: q.question_text,
        options: Array.isArray(q.options) ? q.options as string[] : [],
        correct_answer: q.correct_answer,
        section: q.section,
        part_number: q.part_number,
        question_number: q.question_number || undefined,
        question_audio_url: q.question_audio_url || undefined,
        question_image_url: q.question_image_url || undefined,
        explanation_ko: q.explanation_ko || undefined,
        explanation_vi: q.explanation_vi || undefined,
        explanation_en: q.explanation_en || undefined,
        explanation_ja: q.explanation_ja || undefined,
        explanation_zh: q.explanation_zh || undefined,
        explanation_ru: q.explanation_ru || undefined,
        explanation_uz: q.explanation_uz || undefined,
        point_value: (q as any).point_value || 3,
        instruction_text: (q as any).instruction_text || undefined,
        exam_round: (q as any).exam_round || undefined,
        exam_year: (q as any).exam_year || undefined,
        question_type: q.section === 'writing' ? 
          (q.part_number <= 2 ? 'short_answer' : 'essay') : 'multiple_choice',
        word_limit: q.section === 'writing' ? 
          (q.part_number === 1 ? 30 : q.part_number === 2 ? 50 : q.part_number === 3 ? 300 : 700) : undefined,
        sample_answer: undefined
      }));
      
      setQuestions(formattedQuestions);
      
      const attemptTimeLimit = getTimeLimit();
      
      const { data: newAttempt, error: attemptError } = await supabase
        .from('mock_exam_attempts')
        .insert({
          user_id: userId,
          exam_type: dbExamType,
          exam_mode: mode,
          section: section || null,
          part_number: safePartNumber,
          total_questions: formattedQuestions.length,
          correct_count: 0,
          time_limit_seconds: attemptTimeLimit,
          is_completed: false
        })
        .select()
        .single();
      
      if (attemptError) throw attemptError;
      
      setAttempt(newAttempt);
      setTimeRemaining(attemptTimeLimit);
      setLoading(false);
      
      if (attemptTimeLimit) {
        startTimer();
      }
      
      startAutoSave(newAttempt.id);
      
    } catch (error) {
      console.error('Failed to start exam:', error);
      toast({ title: "시험 시작 실패", variant: "destructive" });
    }
  };

  const resumeAttempt = async (existingAttempt: any, userId: string) => {
    try {
      let query = supabase
        .from('mock_question_bank')
        .select('*')
        .eq('exam_type', existingAttempt.exam_type)
        .eq('is_active', true);
      
      if (existingAttempt.section) {
        query = query.eq('section', existingAttempt.section);
      }
      if (existingAttempt.part_number) {
        query = query.eq('part_number', existingAttempt.part_number);
      }
      
      const { data: questionData } = await query.order('section').order('part_number').order('question_number');
      
      if (!questionData?.length) {
        navigate('/mock-exam');
        return;
      }
      
      const formattedQuestions: Question[] = questionData.map(q => ({
        id: q.id,
        question_text: q.question_text,
        options: Array.isArray(q.options) ? q.options as string[] : [],
        correct_answer: q.correct_answer,
        section: q.section,
        part_number: q.part_number,
        question_audio_url: q.question_audio_url || undefined,
        question_image_url: q.question_image_url || undefined,
        explanation_ko: q.explanation_ko || undefined,
        explanation_vi: q.explanation_vi || undefined,
        explanation_en: q.explanation_en || undefined
      }));
      
      setQuestions(formattedQuestions);
      
      const { data: existingAnswers } = await supabase
        .from('mock_exam_answers')
        .select('*')
        .eq('attempt_id', existingAttempt.id);
      
      if (existingAnswers) {
        const answerMap = new Map<string, AnswerData>();
        existingAnswers.forEach(a => {
          answerMap.set(a.question_id, {
            question_id: a.question_id,
            user_answer: a.user_answer,
            is_correct: a.is_correct ?? undefined
          });
        });
        setAnswers(answerMap);
      }
      
      setAttempt(existingAttempt);
      
      const elapsed = existingAttempt.time_taken_seconds || 0;
      if (existingAttempt.time_limit_seconds) {
        setTimeRemaining(Math.max(0, existingAttempt.time_limit_seconds - elapsed));
        startTimer();
      }
      
      setLoading(false);
      startAutoSave(existingAttempt.id);
      
    } catch (error) {
      console.error('Failed to resume:', error);
      navigate('/mock-exam');
    }
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startAutoSave = (attemptId: string) => {
    saveIntervalRef.current = setInterval(() => {
      saveProgress(attemptId);
    }, 30000);
  };

  const saveProgress = async (attemptId: string) => {
    if (!attemptId || answers.size === 0) return;
    
    try {
      const answerData = Array.from(answers.values()).map(a => ({
        attempt_id: attemptId,
        question_id: a.question_id,
        user_answer: a.user_answer,
        is_correct: a.is_correct,
        time_spent_seconds: a.time_spent_seconds
      }));
      
      await supabase.from('mock_exam_answers').upsert(answerData, { onConflict: 'attempt_id,question_id' });
      
      const correctCount = Array.from(answers.values()).filter(a => a.is_correct).length;
      await supabase
        .from('mock_exam_attempts')
        .update({
          correct_count: correctCount,
          time_taken_seconds: timeRemaining !== null ? (getTimeLimit() || 0) - timeRemaining : undefined
        })
        .eq('id', attemptId);
        
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const handleAnswer = (optionIndex: number) => {
    if (!currentQuestion) return;
    
    const isCorrect = (optionIndex + 1) === currentQuestion.correct_answer;
    
    setAnswers(prev => new Map(prev).set(currentQuestion.id, {
      question_id: currentQuestion.id,
      user_answer: optionIndex,
      is_correct: isPracticeMode ? isCorrect : undefined
    }));
    
    if (isPracticeMode) {
      setShowExplanation(prev => new Map(prev).set(currentQuestion.id, true));
    }
  };

  const handleFlag = () => {
    if (!currentQuestion) return;
    setFlagged(prev => {
      const next = new Set(prev);
      if (next.has(currentQuestion.id)) {
        next.delete(currentQuestion.id);
      } else {
        next.add(currentQuestion.id);
      }
      return next;
    });
  };

  const handlePlayAudio = () => {
    if (!currentQuestion?.question_audio_url) return;
    
    if (!audioRef.current) {
      audioRef.current = new Audio(currentQuestion.question_audio_url);
      audioRef.current.playbackRate = playbackSpeed;
      audioRef.current.onended = () => setIsPlaying(false);
    }
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.src = currentQuestion.question_audio_url;
      audioRef.current.playbackRate = playbackSpeed;
      audioRef.current.play();
      setIsPlaying(true);
      
      setPlayCount(prev => {
        const count = prev.get(currentQuestion.id) || 0;
        return new Map(prev).set(currentQuestion.id, count + 1);
      });
    }
  };

  const handleSpeedChange = (value: number[]) => {
    setPlaybackSpeed(value[0]);
    if (audioRef.current) {
      audioRef.current.playbackRate = value[0];
    }
  };

  const handleSubmit = async () => {
    if (!attempt) return;
    
    try {
      await saveProgress(attempt.id);
      
      const correctCount = isPracticeMode 
        ? Array.from(answers.values()).filter(a => a.is_correct).length
        : 0;
      
      await supabase
        .from('mock_exam_attempts')
        .update({
          is_completed: true,
          finished_at: new Date().toISOString(),
          correct_count: correctCount,
          time_taken_seconds: timeRemaining !== null ? (getTimeLimit() || 0) - timeRemaining : undefined
        })
        .eq('id', attempt.id);
      
      if (!isPracticeMode) {
        const evaluatedAnswers = Array.from(answers.entries()).map(([qId, ans]) => {
          const q = questions.find(q => q.id === qId);
          const isCorrect = q && (ans.user_answer !== null) && ((ans.user_answer + 1) === q.correct_answer);
          return { ...ans, is_correct: isCorrect };
        });
        
        evaluatedAnswers.forEach(ans => {
          answers.set(ans.question_id, ans);
        });
        setAnswers(new Map(answers));
        
        const finalCorrect = evaluatedAnswers.filter(a => a.is_correct).length;
        await supabase
          .from('mock_exam_attempts')
          .update({ correct_count: finalCorrect })
          .eq('id', attempt.id);
      }
      
      if (timerRef.current) clearInterval(timerRef.current);
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
      
      setShowSubmitDialog(false);
      setShowResultDialog(true);
      
    } catch (error) {
      console.error('Submit failed:', error);
      toast({ title: "제출 실패", variant: "destructive" });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getExplanation = (question: Question) => {
    const lang = i18n.language;
    if (lang === 'vi' && question.explanation_vi) return question.explanation_vi;
    if (lang === 'en' && question.explanation_en) return question.explanation_en;
    if (lang === 'ja' && question.explanation_ja) return question.explanation_ja;
    if (lang === 'zh' && question.explanation_zh) return question.explanation_zh;
    if (lang === 'ru' && question.explanation_ru) return question.explanation_ru;
    if (lang === 'uz' && question.explanation_uz) return question.explanation_uz;
    return question.explanation_ko || "해설이 없습니다.";
  };

  const getAnswerStatus = (questionId: string) => {
    const answer = answers.get(questionId);
    if (!answer) return 'unanswered';
    if (isPracticeMode) {
      return answer.is_correct ? 'correct' : 'incorrect';
    }
    return 'answered';
  };

  const answeredCount = answers.size;
  const progress = (answeredCount / questions.length) * 100;

  const getSectionIcon = (sec: string) => {
    if (sec === 'listening') return Headphones;
    if (sec === 'reading') return BookOpen;
    return PenTool;
  };

  const getSectionLabel = (sec: string) => {
    if (sec === 'listening') return '듣기';
    if (sec === 'reading') return '읽기';
    return '쓰기';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">시험 준비 중...</p>
        </div>
      </div>
    );
  }

  const SectionIcon = currentQuestion ? getSectionIcon(currentQuestion.section) : BookOpen;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ========== TOP HEADER (심플) ========== */}
      <header className="sticky top-0 z-20 bg-card/95 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          {/* Left: Back + Title */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowExitDialog(true)}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant={isPracticeMode ? "secondary" : "default"} className="text-xs">
                  {isPracticeMode ? "연습" : "실전"}
                </Badge>
                <span className="text-sm font-medium text-muted-foreground">
                  {examType?.toUpperCase().replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
          
          {/* Right: Timer */}
          {timeRemaining !== null && (
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-mono font-bold",
              timeRemaining < 300 ? "bg-destructive/10 text-destructive" : "bg-muted"
            )}>
              <Clock className="w-4 h-4" />
              {formatTime(timeRemaining)}
            </div>
          )}
        </div>
        
        {/* Progress Bar */}
        <div className="px-4 pb-3 max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Progress value={progress} className="h-2 flex-1" />
            <span className="text-xs text-muted-foreground font-medium shrink-0">
              {answeredCount}/{questions.length}
            </span>
          </div>
        </div>
      </header>

      {/* ========== MAIN CONTENT ========== */}
      <ScrollArea className="flex-1">
        <main className="max-w-3xl mx-auto px-4 py-6">
          {currentQuestion && (
            <div className="space-y-6">
              {/* Question Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    isListeningSection ? "bg-blue-500/10" : isReadingSection ? "bg-emerald-500/10" : "bg-purple-500/10"
                  )}>
                    <SectionIcon className={cn(
                      "w-5 h-5",
                      isListeningSection ? "text-blue-500" : isReadingSection ? "text-emerald-500" : "text-purple-500"
                    )} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {getSectionLabel(currentQuestion.section)} · Part {currentQuestion.part_number}
                    </p>
                    <h1 className="text-xl font-bold">문제 {currentIndex + 1}</h1>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Audio Controls */}
                  {isListeningSection && currentQuestion.question_audio_url && (
                    <Button
                      variant={isPlaying ? "secondary" : "default"}
                      size="sm"
                      onClick={handlePlayAudio}
                      className="gap-1.5"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      {isPlaying ? "재생중" : "듣기"}
                    </Button>
                  )}
                  
                  {/* Flag */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleFlag}
                    className={cn(
                      flagged.has(currentQuestion.id) && "text-amber-500"
                    )}
                  >
                    <Flag className={cn(
                      "w-5 h-5",
                      flagged.has(currentQuestion.id) && "fill-amber-500"
                    )} />
                  </Button>
                </div>
              </div>
              
              {/* Weakness Reason Badge */}
              {mode === 'weakness' && getWeaknessReason(currentQuestion.id) && (
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <Target className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    💡 {getWeaknessReason(currentQuestion.id)}
                  </span>
                </div>
              )}
              
              {/* Question Image */}
              {currentQuestion.question_image_url && (
                <img 
                  src={currentQuestion.question_image_url} 
                  alt="문제 이미지" 
                  className="w-full max-w-lg rounded-xl border mx-auto"
                />
              )}
              
              {/* Instruction Text */}
              {currentQuestion.instruction_text && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="py-3 px-4">
                    <p className="text-sm text-primary font-medium whitespace-pre-wrap">
                      {currentQuestion.instruction_text}
                    </p>
                  </CardContent>
                </Card>
              )}
              
              {/* Question Text */}
              <Card>
                <CardContent className="py-5 px-5">
                  <p className="text-lg leading-relaxed whitespace-pre-wrap">{currentQuestion.question_text}</p>
                </CardContent>
              </Card>
              
              {/* Multiple Choice Options */}
              {!isWritingSection && (
                <div className="space-y-3">
                  {currentQuestion.options.map((option, idx) => {
                    const answer = answers.get(currentQuestion.id);
                    const isSelected = answer?.user_answer === idx;
                    const isCorrect = (idx + 1) === currentQuestion.correct_answer;
                    const showResult = isPracticeMode && answer !== undefined;
                    const circledNumbers = ['①', '②', '③', '④'];
                    
                    return (
                      <button
                        key={idx}
                        onClick={() => handleAnswer(idx)}
                        disabled={isPracticeMode && answer !== undefined}
                        className={cn(
                          "w-full p-4 rounded-xl border-2 text-left transition-all flex items-start gap-4 group",
                          !showResult && isSelected && "border-primary bg-primary/5",
                          !showResult && !isSelected && "border-border hover:border-primary/50 hover:bg-muted/30",
                          showResult && isCorrect && "border-green-500 bg-green-50 dark:bg-green-950/30",
                          showResult && isSelected && !isCorrect && "border-destructive bg-destructive/5"
                        )}
                      >
                        <span className={cn(
                          "text-2xl font-bold shrink-0 transition-colors",
                          isSelected ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                          showResult && isCorrect && "text-green-600 dark:text-green-400",
                          showResult && isSelected && !isCorrect && "text-destructive"
                        )}>
                          {circledNumbers[idx]}
                        </span>
                        <span className="flex-1 pt-1 text-base">{option}</span>
                        {showResult && isCorrect && (
                          <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                        )}
                        {showResult && isSelected && !isCorrect && (
                          <X className="w-6 h-6 text-destructive shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              
              {/* Writing Section */}
              {isWritingSection && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PenTool className="w-5 h-5 text-primary" />
                      <span className="font-medium">
                        {currentQuestion.question_type === 'short_answer' ? '단답형' : '서술형'}
                      </span>
                    </div>
                    {currentQuestion.word_limit && (
                      <Badge variant="outline">
                        권장 {currentQuestion.word_limit}자
                      </Badge>
                    )}
                  </div>
                  
                  <div className="relative">
                    <textarea
                      value={writingAnswers.get(currentQuestion.id) || ''}
                      onChange={(e) => {
                        const newText = e.target.value;
                        setWritingAnswers(prev => new Map(prev).set(currentQuestion.id, newText));
                        setAnswers(prev => new Map(prev).set(currentQuestion.id, {
                          question_id: currentQuestion.id,
                          user_answer: null,
                          text_answer: newText
                        }));
                      }}
                      placeholder="여기에 답을 작성하세요..."
                      className={cn(
                        "w-full rounded-xl border-2 bg-background p-4 text-base resize-none focus:outline-none focus:border-primary",
                        currentQuestion.question_type === 'short_answer' ? "h-32" : "h-64"
                      )}
                    />
                    <div className="absolute bottom-3 right-3 text-sm text-muted-foreground">
                      {(writingAnswers.get(currentQuestion.id) || '').length}자
                    </div>
                  </div>
                </div>
              )}
              
              {/* Explanation (Practice Mode) */}
              {isPracticeMode && !isWritingSection && answers.has(currentQuestion.id) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        <span className="flex items-center gap-2">
                          <Lightbulb className="w-4 h-4 text-amber-500" />
                          해설 보기
                        </span>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <Card className="mt-2 border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
                        <CardContent className="py-4 px-4">
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{getExplanation(currentQuestion)}</p>
                        </CardContent>
                      </Card>
                    </CollapsibleContent>
                  </Collapsible>
                </motion.div>
              )}
            </div>
          )}
        </main>
      </ScrollArea>

      {/* ========== BOTTOM NAVIGATION ========== */}
      <footer className="sticky bottom-0 bg-card/95 backdrop-blur-sm border-t">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto gap-3">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="flex-1 max-w-[120px]"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            이전
          </Button>
          
          {/* Question Grid Trigger */}
          <Drawer open={showQuestionGrid} onOpenChange={setShowQuestionGrid}>
            <DrawerTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <Grid3X3 className="w-4 h-4" />
                <span className="font-bold">{currentIndex + 1}</span>
                <span className="text-muted-foreground">/ {questions.length}</span>
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader className="text-left">
                <DrawerTitle>문제 목록</DrawerTitle>
              </DrawerHeader>
              <div className="px-4 pb-6 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                  {questions.map((q, idx) => {
                    const status = getAnswerStatus(q.id);
                    const isFlagged = flagged.has(q.id);
                    
                    return (
                      <button
                        key={q.id}
                        onClick={() => {
                          setCurrentIndex(idx);
                          setShowQuestionGrid(false);
                        }}
                        className={cn(
                          "w-10 h-10 rounded-lg text-sm font-medium transition-all relative",
                          idx === currentIndex && "ring-2 ring-primary",
                          status === 'unanswered' && "bg-muted hover:bg-muted/80",
                          status === 'answered' && "bg-primary text-primary-foreground",
                          status === 'correct' && "bg-green-500 text-white",
                          status === 'incorrect' && "bg-destructive text-white"
                        )}
                      >
                        {idx + 1}
                        {isFlagged && (
                          <Flag className="w-2.5 h-2.5 absolute -top-0.5 -right-0.5 text-amber-500 fill-amber-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
                
                <div className="flex gap-2 mt-6 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      setShowQuestionGrid(false);
                      setShowExitDialog(true);
                    }}
                  >
                    <Home className="w-4 h-4 mr-2" />
                    나가기
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={() => {
                      setShowQuestionGrid(false);
                      setShowSubmitDialog(true);
                    }}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    제출하기
                  </Button>
                </div>
              </div>
            </DrawerContent>
          </Drawer>
          
          <Button
            variant={currentIndex === questions.length - 1 ? "default" : "outline"}
            onClick={() => {
              if (currentIndex === questions.length - 1) {
                setShowSubmitDialog(true);
              } else {
                setCurrentIndex(currentIndex + 1);
              }
            }}
            className="flex-1 max-w-[120px]"
          >
            {currentIndex === questions.length - 1 ? (
              <>
                제출
                <Send className="w-4 h-4 ml-1" />
              </>
            ) : (
              <>
                다음
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </footer>

      {/* ========== DIALOGS ========== */}
      
      {/* Exit Dialog */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>시험을 나가시겠습니까?</DialogTitle>
            <DialogDescription>
              진행 상황은 자동 저장되며, 나중에 이어서 풀 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExitDialog(false)}>
              계속 풀기
            </Button>
            <Button variant="destructive" onClick={() => {
              saveProgress(attempt?.id || '');
              navigate('/mock-exam');
            }}>
              저장 후 나가기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>답안을 제출하시겠습니까?</DialogTitle>
            <DialogDescription>
              {questions.length - answeredCount > 0 && (
                <span className="text-destructive">
                  아직 {questions.length - answeredCount}개의 문제를 풀지 않았습니다.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex justify-between text-sm mb-2">
              <span>풀이 완료</span>
              <span className="font-medium">{answeredCount} / {questions.length}</span>
            </div>
            <Progress value={progress} className="h-2" />
            {flagged.size > 0 && (
              <p className="text-sm text-amber-600 mt-2">
                <Flag className="w-4 h-4 inline mr-1" />
                표시한 문제: {flagged.size}개
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              돌아가기
            </Button>
            <Button onClick={handleSubmit}>
              제출하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">시험 결과</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center mb-4">
              <span className="text-3xl font-bold text-white">
                {Math.round((Array.from(answers.values()).filter(a => a.is_correct).length / questions.length) * 100)}
              </span>
            </div>
            <p className="text-lg font-medium mb-2">
              {Array.from(answers.values()).filter(a => a.is_correct).length} / {questions.length} 정답
            </p>
            <div className={cn(
              "grid gap-4 mt-6 text-sm",
              questions.some(q => q.section === 'writing') ? "grid-cols-3" : "grid-cols-2"
            )}>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-muted-foreground">듣기</p>
                <p className="font-bold text-lg">
                  {Array.from(answers.values()).filter(a => {
                    const q = questions.find(q => q.id === a.question_id);
                    return q?.section === 'listening' && a.is_correct;
                  }).length} / {questions.filter(q => q.section === 'listening').length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-muted-foreground">읽기</p>
                <p className="font-bold text-lg">
                  {Array.from(answers.values()).filter(a => {
                    const q = questions.find(q => q.id === a.question_id);
                    return q?.section === 'reading' && a.is_correct;
                  }).length} / {questions.filter(q => q.section === 'reading').length}
                </p>
              </div>
              {questions.some(q => q.section === 'writing') && (
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-muted-foreground">쓰기</p>
                  <p className="font-bold text-lg">
                    {writingAnswers.size} / {questions.filter(q => q.section === 'writing').length}
                    <span className="text-xs font-normal ml-1 text-primary">작성</span>
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button className="w-full" onClick={() => navigate(`/mock-exam/report/${attempt?.id}`)}>
              AI 리포트 보기
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate('/mock-exam/mistakes')}>
              오답노트로 이동
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MockExamTest;
