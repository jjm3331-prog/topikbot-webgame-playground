/**
 * 약점집중 모드를 위한 분석 & 스코어링 로직
 * - 오답률 (wrong_rate)
 * - 최근 오답 가중치 (recency)
 * - 파트별 성취도 (part_achievement)
 */

import { supabase } from "@/integrations/supabase/client";

export interface WeaknessScore {
  questionId: string;
  score: number; // Higher = more weakness (higher priority)
  reasons: WeaknessReason[];
  sectionScore: number;
  partScore: number;
  wrongCount: number;
  lastWrongAt?: string;
}

export interface WeaknessReason {
  type: 'wrong_rate' | 'recent_wrong' | 'low_part_achievement' | 'repeated_mistake';
  label: string;
  weight: number;
}

export interface PartAchievement {
  section: string;
  partNumber: number;
  totalAttempts: number;
  correctCount: number;
  wrongCount: number;
  achievementRate: number;
}

export interface WeaknessAnalysis {
  questions: WeaknessScore[];
  partAchievements: PartAchievement[];
  weakestSections: string[];
  weakestParts: number[];
  totalAnalyzed: number;
}

/**
 * 사용자의 약점 분석 수행
 */
export async function analyzeUserWeakness(
  userId: string,
  examType: string,
  limit: number = 20
): Promise<WeaknessAnalysis> {
  // 1. 사용자의 모든 오답 기록 조회
  const { data: mistakes } = await supabase
    .from('mock_exam_mistakes')
    .select(`
      id,
      question_id,
      review_count,
      mastered,
      created_at,
      updated_at,
      mistake_category
    `)
    .eq('user_id', userId)
    .eq('mastered', false)
    .order('updated_at', { ascending: false });

  // 2. 사용자의 모든 답안 기록 조회 (파트별 성취도 계산용)
  const { data: answers } = await supabase
    .from('mock_exam_answers')
    .select(`
      question_id,
      is_correct,
      attempt_id,
      answered_at
    `)
    .eq('is_correct', false);

  // 3. 문제은행에서 해당 시험 유형의 문제 조회
  const { data: questions } = await supabase
    .from('mock_question_bank')
    .select('id, section, part_number, difficulty')
    .eq('exam_type', examType)
    .eq('is_active', true);

  if (!questions?.length) {
    return {
      questions: [],
      partAchievements: [],
      weakestSections: [],
      weakestParts: [],
      totalAnalyzed: 0
    };
  }

  // 4. 파트별 성취도 계산
  const partStats = new Map<string, { correct: number; wrong: number }>();
  
  answers?.forEach(answer => {
    const question = questions.find(q => q.id === answer.question_id);
    if (question) {
      const key = `${question.section}-${question.part_number}`;
      const stats = partStats.get(key) || { correct: 0, wrong: 0 };
      if (answer.is_correct) {
        stats.correct++;
      } else {
        stats.wrong++;
      }
      partStats.set(key, stats);
    }
  });

  const partAchievements: PartAchievement[] = [];
  partStats.forEach((stats, key) => {
    const [section, partStr] = key.split('-');
    const partNumber = parseInt(partStr);
    const total = stats.correct + stats.wrong;
    partAchievements.push({
      section,
      partNumber,
      totalAttempts: total,
      correctCount: stats.correct,
      wrongCount: stats.wrong,
      achievementRate: total > 0 ? (stats.correct / total) * 100 : 0
    });
  });

  // 5. 각 문제에 대한 약점 점수 계산
  const mistakeMap = new Map(mistakes?.map(m => [m.question_id, m]) || []);
  const now = new Date().getTime();
  
  const weaknessScores: WeaknessScore[] = questions
    .filter(q => {
      // 오답 기록이 있거나, 파트 성취도가 낮은 문제
      const hasMistake = mistakeMap.has(q.id);
      const partKey = `${q.section}-${q.part_number}`;
      const partAch = partAchievements.find(
        pa => `${pa.section}-${pa.partNumber}` === partKey
      );
      const lowAchievement = partAch && partAch.achievementRate < 70;
      return hasMistake || lowAchievement;
    })
    .map(q => {
      const mistake = mistakeMap.get(q.id);
      const reasons: WeaknessReason[] = [];
      let score = 0;
      let sectionScore = 0;
      let partScore = 0;

      // 오답률 가중치
      if (mistake) {
        const reviewCount = mistake.review_count || 1;
        const wrongWeight = Math.min(reviewCount * 15, 50); // 최대 50점
        score += wrongWeight;
        sectionScore += wrongWeight / 2;
        
        reasons.push({
          type: 'wrong_rate',
          label: `${reviewCount}회 오답`,
          weight: wrongWeight
        });

        // 반복 오답 가중치
        if (reviewCount >= 3) {
          const repeatedWeight = 20;
          score += repeatedWeight;
          reasons.push({
            type: 'repeated_mistake',
            label: '반복 오답 문제',
            weight: repeatedWeight
          });
        }

        // 최근 오답 가중치 (7일 이내 = 높은 가중치)
        const lastWrong = new Date(mistake.updated_at).getTime();
        const daysSinceWrong = (now - lastWrong) / (1000 * 60 * 60 * 24);
        
        if (daysSinceWrong <= 7) {
          const recencyWeight = Math.round((7 - daysSinceWrong) * 4); // 최대 28점
          score += recencyWeight;
          reasons.push({
            type: 'recent_wrong',
            label: `${Math.round(daysSinceWrong)}일 전 오답`,
            weight: recencyWeight
          });
        }
      }

      // 파트별 성취도 가중치
      const partKey = `${q.section}-${q.part_number}`;
      const partAch = partAchievements.find(
        pa => `${pa.section}-${pa.partNumber}` === partKey
      );
      
      if (partAch && partAch.achievementRate < 70) {
        const achWeight = Math.round((70 - partAch.achievementRate) / 2); // 최대 35점
        score += achWeight;
        partScore = achWeight;
        
        reasons.push({
          type: 'low_part_achievement',
          label: `${q.section} Part ${q.part_number} 성취도 ${Math.round(partAch.achievementRate)}%`,
          weight: achWeight
        });
      }

      return {
        questionId: q.id,
        score,
        reasons,
        sectionScore,
        partScore,
        wrongCount: mistake?.review_count || 0,
        lastWrongAt: mistake?.updated_at
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // 6. 가장 약한 영역/파트 도출
  const sectionScores = new Map<string, number>();
  const partScores = new Map<number, number>();
  
  weaknessScores.forEach(ws => {
    const q = questions.find(q => q.id === ws.questionId);
    if (q) {
      sectionScores.set(q.section, (sectionScores.get(q.section) || 0) + ws.score);
      partScores.set(q.part_number, (partScores.get(q.part_number) || 0) + ws.score);
    }
  });

  const weakestSections = Array.from(sectionScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([section]) => section);

  const weakestParts = Array.from(partScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([part]) => part);

  return {
    questions: weaknessScores,
    partAchievements,
    weakestSections,
    weakestParts,
    totalAnalyzed: weaknessScores.length
  };
}

/**
 * 약점 점수를 사람이 읽을 수 있는 설명으로 변환
 */
export function getWeaknessReasonText(reasons: WeaknessReason[], lang: string = 'ko'): string {
  const labels: Record<string, Record<string, string>> = {
    wrong_rate: {
      ko: '오답 누적',
      vi: 'Lỗi tích lũy',
      en: 'Accumulated errors',
      ja: '累積誤答',
      zh: '累计错误',
      ru: 'Накопленные ошибки',
      uz: 'To\'plangan xatolar'
    },
    recent_wrong: {
      ko: '최근 오답',
      vi: 'Lỗi gần đây',
      en: 'Recent mistake',
      ja: '最近の誤答',
      zh: '最近错误',
      ru: 'Недавняя ошибка',
      uz: 'Yaqinda xato'
    },
    low_part_achievement: {
      ko: '취약 파트',
      vi: 'Phần yếu',
      en: 'Weak part',
      ja: '弱点パート',
      zh: '薄弱部分',
      ru: 'Слабая часть',
      uz: 'Zaif qism'
    },
    repeated_mistake: {
      ko: '반복 오답',
      vi: 'Lỗi lặp lại',
      en: 'Repeated mistake',
      ja: '繰り返し誤答',
      zh: '重复错误',
      ru: 'Повторяющаяся ошибка',
      uz: 'Takroriy xato'
    }
  };

  return reasons
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 2)
    .map(r => labels[r.type]?.[lang] || r.label)
    .join(', ');
}
