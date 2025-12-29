/**
 * 실전 모의고사 프리셋
 * - 시험 종류별 시간제한
 * - 해설 공개 시점
 * - 채점 방식 설정
 */

export type ExplanationTiming = 'immediate' | 'after_section' | 'after_exam';
export type ScoringMethod = 'immediate' | 'after_submit';

export interface ExamPreset {
  id: string;
  examType: string;
  mode: 'full' | 'section' | 'part' | 'weakness';
  label: {
    ko: string;
    en: string;
    vi: string;
    ja: string;
    zh: string;
    ru: string;
    uz: string;
  };
  description: {
    ko: string;
    en: string;
    vi: string;
  };
  settings: {
    timeLimit: boolean;
    timeLimitSeconds?: number;
    explanationTiming: ExplanationTiming;
    scoringMethod: ScoringMethod;
    allowPause: boolean;
    allowSkip: boolean;
    showProgressBar: boolean;
    showAnswerAfterSubmit: boolean;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    maxAttempts?: number;
  };
  sections?: {
    listening?: { timeSeconds: number; questionCount: number };
    reading?: { timeSeconds: number; questionCount: number };
    writing?: { timeSeconds: number; questionCount: number };
  };
}

export const EXAM_PRESETS: ExamPreset[] = [
  // TOPIK I 프리셋
  {
    id: 'topik1-full-real',
    examType: 'TOPIK_I',
    mode: 'full',
    label: {
      ko: 'TOPIK I 실전',
      en: 'TOPIK I Real Exam',
      vi: 'TOPIK I Thực tế',
      ja: 'TOPIK I 本番',
      zh: 'TOPIK I 实战',
      ru: 'TOPIK I Реальный',
      uz: 'TOPIK I Haqiqiy'
    },
    description: {
      ko: '실제 TOPIK I 시험과 동일한 환경',
      en: 'Same environment as real TOPIK I exam',
      vi: 'Môi trường giống kỳ thi TOPIK I thực tế'
    },
    settings: {
      timeLimit: true,
      explanationTiming: 'after_exam',
      scoringMethod: 'after_submit',
      allowPause: false,
      allowSkip: true,
      showProgressBar: true,
      showAnswerAfterSubmit: true,
      shuffleQuestions: false,
      shuffleOptions: false
    },
    sections: {
      listening: { timeSeconds: 40 * 60, questionCount: 30 },
      reading: { timeSeconds: 60 * 60, questionCount: 40 }
    }
  },
  {
    id: 'topik1-section-practice',
    examType: 'TOPIK_I',
    mode: 'section',
    label: {
      ko: 'TOPIK I 영역별 연습',
      en: 'TOPIK I Section Practice',
      vi: 'TOPIK I Luyện theo phần',
      ja: 'TOPIK I セクション練習',
      zh: 'TOPIK I 分区练习',
      ru: 'TOPIK I По разделам',
      uz: 'TOPIK I Bo\'lim mashqi'
    },
    description: {
      ko: '시간 제한 없이 영역별 집중 연습',
      en: 'Focus practice by section without time limit',
      vi: 'Luyện tập tập trung theo phần không giới hạn thời gian'
    },
    settings: {
      timeLimit: false,
      explanationTiming: 'immediate',
      scoringMethod: 'immediate',
      allowPause: true,
      allowSkip: true,
      showProgressBar: true,
      showAnswerAfterSubmit: true,
      shuffleQuestions: true,
      shuffleOptions: false
    }
  },
  
  // TOPIK II 프리셋
  {
    id: 'topik2-full-real',
    examType: 'TOPIK_II',
    mode: 'full',
    label: {
      ko: 'TOPIK II 실전',
      en: 'TOPIK II Real Exam',
      vi: 'TOPIK II Thực tế',
      ja: 'TOPIK II 本番',
      zh: 'TOPIK II 实战',
      ru: 'TOPIK II Реальный',
      uz: 'TOPIK II Haqiqiy'
    },
    description: {
      ko: '실제 TOPIK II 시험과 동일한 환경 (3-6급)',
      en: 'Same environment as real TOPIK II exam (Level 3-6)',
      vi: 'Môi trường giống kỳ thi TOPIK II thực tế (Cấp 3-6)'
    },
    settings: {
      timeLimit: true,
      explanationTiming: 'after_exam',
      scoringMethod: 'after_submit',
      allowPause: false,
      allowSkip: true,
      showProgressBar: true,
      showAnswerAfterSubmit: true,
      shuffleQuestions: false,
      shuffleOptions: false
    },
    sections: {
      listening: { timeSeconds: 60 * 60, questionCount: 50 },
      reading: { timeSeconds: 70 * 60, questionCount: 50 },
      writing: { timeSeconds: 50 * 60, questionCount: 4 }
    }
  },
  {
    id: 'topik2-section-practice',
    examType: 'TOPIK_II',
    mode: 'section',
    label: {
      ko: 'TOPIK II 영역별 연습',
      en: 'TOPIK II Section Practice',
      vi: 'TOPIK II Luyện theo phần',
      ja: 'TOPIK II セクション練習',
      zh: 'TOPIK II 分区练习',
      ru: 'TOPIK II По разделам',
      uz: 'TOPIK II Bo\'lim mashqi'
    },
    description: {
      ko: '시간 제한 없이 영역별 집중 연습',
      en: 'Focus practice by section without time limit',
      vi: 'Luyện tập tập trung theo phần không giới hạn thời gian'
    },
    settings: {
      timeLimit: false,
      explanationTiming: 'immediate',
      scoringMethod: 'immediate',
      allowPause: true,
      allowSkip: true,
      showProgressBar: true,
      showAnswerAfterSubmit: true,
      shuffleQuestions: true,
      shuffleOptions: false
    }
  },
  {
    id: 'topik2-part-drill',
    examType: 'TOPIK_II',
    mode: 'part',
    label: {
      ko: 'TOPIK II 파트별 훈련',
      en: 'TOPIK II Part Drill',
      vi: 'TOPIK II Luyện theo Part',
      ja: 'TOPIK II パート訓練',
      zh: 'TOPIK II 部分训练',
      ru: 'TOPIK II Тренировка',
      uz: 'TOPIK II Part mashqi'
    },
    description: {
      ko: '특정 문제 유형만 집중 반복',
      en: 'Intensive repetition of specific question types',
      vi: 'Lặp lại tập trung các loại câu hỏi cụ thể'
    },
    settings: {
      timeLimit: false,
      explanationTiming: 'immediate',
      scoringMethod: 'immediate',
      allowPause: true,
      allowSkip: false,
      showProgressBar: true,
      showAnswerAfterSubmit: true,
      shuffleQuestions: true,
      shuffleOptions: false
    }
  },
  
  // EPS-TOPIK 프리셋
  {
    id: 'eps-full-real',
    examType: 'TOPIK_EPS',
    mode: 'full',
    label: {
      ko: 'EPS-TOPIK 실전',
      en: 'EPS-TOPIK Real Exam',
      vi: 'EPS-TOPIK Thực tế',
      ja: 'EPS-TOPIK 本番',
      zh: 'EPS-TOPIK 实战',
      ru: 'EPS-TOPIK Реальный',
      uz: 'EPS-TOPIK Haqiqiy'
    },
    description: {
      ko: '고용허가제 시험과 동일한 환경',
      en: 'Same environment as EPS-TOPIK exam',
      vi: 'Môi trường giống kỳ thi EPS-TOPIK thực tế'
    },
    settings: {
      timeLimit: true,
      explanationTiming: 'after_exam',
      scoringMethod: 'after_submit',
      allowPause: false,
      allowSkip: true,
      showProgressBar: true,
      showAnswerAfterSubmit: true,
      shuffleQuestions: false,
      shuffleOptions: false
    },
    sections: {
      listening: { timeSeconds: 25 * 60, questionCount: 25 },
      reading: { timeSeconds: 25 * 60, questionCount: 25 }
    }
  },
  {
    id: 'eps-section-practice',
    examType: 'TOPIK_EPS',
    mode: 'section',
    label: {
      ko: 'EPS-TOPIK 영역별',
      en: 'EPS-TOPIK Section',
      vi: 'EPS-TOPIK Theo phần',
      ja: 'EPS-TOPIK セクション',
      zh: 'EPS-TOPIK 分区',
      ru: 'EPS-TOPIK Раздел',
      uz: 'EPS-TOPIK Bo\'lim'
    },
    description: {
      ko: '듣기/읽기 영역별 집중 연습',
      en: 'Focus practice by listening/reading section',
      vi: 'Luyện tập tập trung theo phần nghe/đọc'
    },
    settings: {
      timeLimit: false,
      explanationTiming: 'immediate',
      scoringMethod: 'immediate',
      allowPause: true,
      allowSkip: true,
      showProgressBar: true,
      showAnswerAfterSubmit: true,
      shuffleQuestions: true,
      shuffleOptions: false
    }
  },
  
  // 공통 약점집중 프리셋
  {
    id: 'weakness-focus',
    examType: 'ALL',
    mode: 'weakness',
    label: {
      ko: '약점 집중',
      en: 'Weakness Focus',
      vi: 'Tập trung điểm yếu',
      ja: '弱点集中',
      zh: '弱点集中',
      ru: 'Слабые места',
      uz: 'Zaif tomonlar'
    },
    description: {
      ko: 'AI가 분석한 취약 유형 맞춤 문제',
      en: 'AI-analyzed weakness-targeted questions',
      vi: 'Câu hỏi nhắm vào điểm yếu được AI phân tích'
    },
    settings: {
      timeLimit: false,
      explanationTiming: 'immediate',
      scoringMethod: 'immediate',
      allowPause: true,
      allowSkip: false,
      showProgressBar: true,
      showAnswerAfterSubmit: true,
      shuffleQuestions: false, // 약점 점수 순서대로
      shuffleOptions: false
    }
  }
];

/**
 * 시험 유형과 모드에 맞는 프리셋 조회
 */
export function getPreset(examType: string, mode: string): ExamPreset | undefined {
  // 정확히 매치되는 프리셋 찾기
  let preset = EXAM_PRESETS.find(
    p => p.examType === examType && p.mode === mode
  );
  
  // 없으면 ALL 타입에서 찾기
  if (!preset) {
    preset = EXAM_PRESETS.find(
      p => p.examType === 'ALL' && p.mode === mode
    );
  }
  
  return preset;
}

/**
 * 프리셋의 총 시간 계산 (초)
 */
export function getPresetTotalTime(preset: ExamPreset): number {
  if (!preset.settings.timeLimit || !preset.sections) return 0;
  
  let total = 0;
  if (preset.sections.listening) total += preset.sections.listening.timeSeconds;
  if (preset.sections.reading) total += preset.sections.reading.timeSeconds;
  if (preset.sections.writing) total += preset.sections.writing.timeSeconds;
  
  return total;
}

/**
 * 프리셋 라벨 조회
 */
export function getPresetLabel(preset: ExamPreset, lang: string = 'ko'): string {
  return preset.label[lang as keyof typeof preset.label] || preset.label.ko;
}
