/**
 * LUKATO AI 포인트 시스템 정책
 * ================================
 * 
 * 1. 포인트 획득 방법 (Cách kiếm điểm)
 * ------------------------------------
 * - 일일 출석 (Điểm danh hàng ngày): +50 điểm
 * - 7일 연속 출석 보너스 (7 ngày liên tiếp): +500 điểm
 * - 퀴즈 5문제 정답 (Đúng cả 5 câu quiz): +200 điểm
 * - 퀴즈 기본 점수 (Điểm quiz cơ bản): +10~50 điểm/câu
 * - 친구 초대 (Mời bạn bè): +500 điểm (초대자) / +200 điểm (초대받은 사람)
 * - 게임 클리어 (Hoàn thành game): +100~500 điểm
 * - 주간 목표 달성 (Mục tiêu tuần): +500 điểm
 * 
 * 2. 레벨 시스템 - TOPIK 급수 (Hệ thống cấp bậc TOPIK)
 * ---------------------------------
 * - TOPIK 1급: 0 ~ 9,999 điểm
 * - TOPIK 2급: 10,000 ~ 49,999 điểm
 * - TOPIK 3급: 50,000 ~ 149,999 điểm
 * - TOPIK 4급: 150,000 ~ 349,999 điểm
 * - TOPIK 5급: 350,000 ~ 999,999 điểm
 * - TOPIK 6급: 1,000,000+ điểm (최고 등급!)
 * 
 * 3. 프리미엄 기능 (Tính năng Premium)
 * ------------------------------------
 * - AI 질문 무제한 (Hỏi AI không giới hạn)
 * - Writing 첨삭 (Chấm bài viết chuyên sâu)
 * - 학습 진도 분석 (Tiến độ học tập AI)
 * - 오답노트 AI 분석 (Sổ lỗi sai AI phân tích)
 * 
 * 4. 무료 기능 (Tính năng miễn phí)
 * ---------------------------------
 * - AI 질문 30회/일 (Hỏi AI 30 lần/ngày)
 * - TOPIK I/II 학습 (Học TOPIK I/II)
 * - 게임 학습 (Game học tiếng Hàn)
 * - 저장 단어 50개 (Từ vựng đã lưu 50 từ)
 * - 랭킹 확인 (Xếp hạng)
 */

export const POINTS_CONFIG = {
  // 일일 출석
  DAILY_CHECKIN: 50,
  WEEKLY_STREAK_BONUS: 500,
  
  // 퀴즈
  QUIZ_PERFECT_SCORE: 200,
  QUIZ_PER_CORRECT: 10,
  
  // 친구 초대
  REFERRAL_INVITER: 500,
  REFERRAL_INVITED: 200,
  
  // 게임
  GAME_COMPLETE_MIN: 100,
  GAME_COMPLETE_MAX: 500,
  
  // 주간 목표
  WEEKLY_GOAL_COMPLETE: 500,
};

export const LEVEL_THRESHOLDS = {
  TOPIK_1: { min: 0, max: 9999, name: "TOPIK 1급", nameKo: "TOPIK 1급", color: "text-slate-400" },
  TOPIK_2: { min: 10000, max: 49999, name: "TOPIK 2급", nameKo: "TOPIK 2급", color: "text-emerald-500" },
  TOPIK_3: { min: 50000, max: 149999, name: "TOPIK 3급", nameKo: "TOPIK 3급", color: "text-blue-500" },
  TOPIK_4: { min: 150000, max: 349999, name: "TOPIK 4급", nameKo: "TOPIK 4급", color: "text-purple-500" },
  TOPIK_5: { min: 350000, max: 999999, name: "TOPIK 5급", nameKo: "TOPIK 5급", color: "text-orange-500" },
  TOPIK_6: { min: 1000000, max: Infinity, name: "TOPIK 6급", nameKo: "TOPIK 6급", color: "text-red-500" },
};

export const FREE_LIMITS = {
  AI_QUESTIONS_PER_DAY: 30,
  SAVED_VOCABULARY: 50,
};

export const PREMIUM_FEATURES = [
  { id: "unlimited_ai", name: "AI không giới hạn", nameKo: "AI 무제한" },
  { id: "writing_correction", name: "Chấm bài viết", nameKo: "Writing 첨삭" },
  { id: "progress_analysis", name: "Tiến độ học tập AI", nameKo: "학습진도 분석" },
  { id: "mistake_analysis", name: "Sổ lỗi sai AI phân tích", nameKo: "오답노트 AI분석" },
];

/**
 * 포인트로 레벨 계산
 */
export function getLevelFromPoints(points: number): {
  name: string;
  nameKo: string;
  color: string;
  nextLevelPoints: number;
  progress: number;
  level: number;
} {
  if (points >= LEVEL_THRESHOLDS.TOPIK_6.min) {
    return {
      name: LEVEL_THRESHOLDS.TOPIK_6.name,
      nameKo: LEVEL_THRESHOLDS.TOPIK_6.nameKo,
      color: LEVEL_THRESHOLDS.TOPIK_6.color,
      nextLevelPoints: 1000000,
      progress: 100,
      level: 6,
    };
  }
  
  if (points >= LEVEL_THRESHOLDS.TOPIK_5.min) {
    const progress = ((points - 350000) / 650000) * 100;
    return {
      name: LEVEL_THRESHOLDS.TOPIK_5.name,
      nameKo: LEVEL_THRESHOLDS.TOPIK_5.nameKo,
      color: LEVEL_THRESHOLDS.TOPIK_5.color,
      nextLevelPoints: 1000000,
      progress,
      level: 5,
    };
  }
  
  if (points >= LEVEL_THRESHOLDS.TOPIK_4.min) {
    const progress = ((points - 150000) / 200000) * 100;
    return {
      name: LEVEL_THRESHOLDS.TOPIK_4.name,
      nameKo: LEVEL_THRESHOLDS.TOPIK_4.nameKo,
      color: LEVEL_THRESHOLDS.TOPIK_4.color,
      nextLevelPoints: 350000,
      progress,
      level: 4,
    };
  }
  
  if (points >= LEVEL_THRESHOLDS.TOPIK_3.min) {
    const progress = ((points - 50000) / 100000) * 100;
    return {
      name: LEVEL_THRESHOLDS.TOPIK_3.name,
      nameKo: LEVEL_THRESHOLDS.TOPIK_3.nameKo,
      color: LEVEL_THRESHOLDS.TOPIK_3.color,
      nextLevelPoints: 150000,
      progress,
      level: 3,
    };
  }
  
  if (points >= LEVEL_THRESHOLDS.TOPIK_2.min) {
    const progress = ((points - 10000) / 40000) * 100;
    return {
      name: LEVEL_THRESHOLDS.TOPIK_2.name,
      nameKo: LEVEL_THRESHOLDS.TOPIK_2.nameKo,
      color: LEVEL_THRESHOLDS.TOPIK_2.color,
      nextLevelPoints: 50000,
      progress,
      level: 2,
    };
  }
  
  const progress = (points / 10000) * 100;
  return {
    name: LEVEL_THRESHOLDS.TOPIK_1.name,
    nameKo: LEVEL_THRESHOLDS.TOPIK_1.nameKo,
    color: LEVEL_THRESHOLDS.TOPIK_1.color,
    nextLevelPoints: 10000,
    progress,
    level: 1,
  };
}

/**
 * 포인트 획득 메시지 생성
 */
export function getPointsEarnedMessage(points: number, reason: string): string {
  return `+${points} điểm! ${reason}`;
}
