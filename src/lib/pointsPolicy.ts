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
 * 2. 레벨 시스템 (Hệ thống cấp bậc)
 * ---------------------------------
 * - 초급 (Sơ cấp): 0 ~ 499 điểm
 * - 중급 (Trung cấp): 500 ~ 1,999 điểm
 * - 고급 (Cao đẳng): 2,000 ~ 4,999 điểm
 * - 지역대학 (Đại học Địa phương): 5,000 ~ 9,999 điểm
 * - 국립대학 (Đại học Quốc gia): 10,000+ điểm
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
  BEGINNER: { min: 0, max: 499, name: "Sơ cấp", nameKo: "초급" },
  INTERMEDIATE: { min: 500, max: 1999, name: "Trung cấp", nameKo: "중급" },
  ADVANCED: { min: 2000, max: 4999, name: "Cao đẳng", nameKo: "고급" },
  LOCAL_UNIVERSITY: { min: 5000, max: 9999, name: "Đại học Địa phương", nameKo: "지역대학" },
  NATIONAL_UNIVERSITY: { min: 10000, max: Infinity, name: "Đại học Quốc gia", nameKo: "국립대학" },
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
} {
  if (points >= LEVEL_THRESHOLDS.NATIONAL_UNIVERSITY.min) {
    return {
      name: LEVEL_THRESHOLDS.NATIONAL_UNIVERSITY.name,
      nameKo: LEVEL_THRESHOLDS.NATIONAL_UNIVERSITY.nameKo,
      color: "text-korean-purple",
      nextLevelPoints: 10000,
      progress: 100,
    };
  }
  
  if (points >= LEVEL_THRESHOLDS.LOCAL_UNIVERSITY.min) {
    const progress = ((points - 5000) / 5000) * 100;
    return {
      name: LEVEL_THRESHOLDS.LOCAL_UNIVERSITY.name,
      nameKo: LEVEL_THRESHOLDS.LOCAL_UNIVERSITY.nameKo,
      color: "text-korean-orange",
      nextLevelPoints: 10000,
      progress,
    };
  }
  
  if (points >= LEVEL_THRESHOLDS.ADVANCED.min) {
    const progress = ((points - 2000) / 3000) * 100;
    return {
      name: LEVEL_THRESHOLDS.ADVANCED.name,
      nameKo: LEVEL_THRESHOLDS.ADVANCED.nameKo,
      color: "text-korean-cyan",
      nextLevelPoints: 5000,
      progress,
    };
  }
  
  if (points >= LEVEL_THRESHOLDS.INTERMEDIATE.min) {
    const progress = ((points - 500) / 1500) * 100;
    return {
      name: LEVEL_THRESHOLDS.INTERMEDIATE.name,
      nameKo: LEVEL_THRESHOLDS.INTERMEDIATE.nameKo,
      color: "text-korean-green",
      nextLevelPoints: 2000,
      progress,
    };
  }
  
  const progress = (points / 500) * 100;
  return {
    name: LEVEL_THRESHOLDS.BEGINNER.name,
    nameKo: LEVEL_THRESHOLDS.BEGINNER.nameKo,
    color: "text-muted-foreground",
    nextLevelPoints: 500,
    progress,
  };
}

/**
 * 포인트 획득 메시지 생성
 */
export function getPointsEarnedMessage(points: number, reason: string): string {
  return `+${points} điểm! ${reason}`;
}
