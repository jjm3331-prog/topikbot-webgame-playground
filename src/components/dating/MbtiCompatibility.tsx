import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Heart, Sparkles, Star } from "lucide-react";

interface MbtiCompatibilityProps {
  npcName: string;
  npcMbti: string;
  onClose: () => void;
}

const MBTI_COMPATIBILITY: Record<string, Record<string, number>> = {
  "ENFP": { "INTJ": 95, "INFJ": 90, "ENFJ": 85, "ENTJ": 85, "INTP": 80, "ENTP": 75, "INFP": 70, "ENFP": 65, "ISFJ": 60, "ESFJ": 55, "ISTJ": 50, "ESTJ": 45, "ISTP": 40, "ESTP": 35, "ISFP": 30, "ESFP": 25 },
  "INTJ": { "ENFP": 95, "ENTP": 90, "INFP": 85, "INFJ": 80, "ENTJ": 75, "INTP": 70, "ENFJ": 65, "INTJ": 60, "ISTJ": 55, "ISTP": 50, "ESTJ": 45, "ESTP": 40, "ISFJ": 35, "ESFJ": 30, "ISFP": 25, "ESFP": 20 },
  "INFJ": { "ENFP": 90, "ENTP": 85, "INFP": 80, "INTJ": 80, "ENFJ": 75, "ENTJ": 70, "INTP": 65, "INFJ": 60, "ISFJ": 55, "ESFJ": 50, "ISTJ": 45, "ESTJ": 40, "ISFP": 35, "ESFP": 30, "ISTP": 25, "ESTP": 20 },
  "INTP": { "ENTJ": 90, "ENTP": 85, "INTJ": 80, "ENFP": 80, "INFJ": 65, "ENFJ": 60, "INFP": 55, "INTP": 50, "ISTP": 45, "ESTP": 40, "ISTJ": 35, "ESTJ": 30, "ISFP": 25, "ESFP": 20, "ISFJ": 15, "ESFJ": 10 },
  "ISFP": { "ENFJ": 90, "ESFJ": 85, "ESTJ": 80, "ENTJ": 75, "ISFJ": 70, "INFJ": 65, "ESTP": 60, "ISTP": 55, "ISFP": 50, "INFP": 45, "ESFP": 40, "ENFP": 35, "INTJ": 30, "INTP": 25, "ENTP": 20, "ISTJ": 15 },
  "ENFJ": { "INFP": 95, "ISFP": 90, "INFJ": 85, "ENFP": 80, "INTJ": 75, "INTP": 70, "ENTJ": 65, "ENFJ": 60, "ESFJ": 55, "ISFJ": 50, "ESTP": 45, "ISTP": 40, "ESFP": 35, "ISTJ": 30, "ESTJ": 25, "ENTP": 20 },
  "ESTP": { "ISFJ": 85, "ISTJ": 80, "ESFJ": 75, "ESTJ": 70, "ISTP": 65, "ESTP": 60, "ESFP": 55, "ISFP": 50, "ENFJ": 45, "INFJ": 40, "ENTJ": 35, "INTJ": 30, "ENFP": 25, "INFP": 20, "ENTP": 15, "INTP": 10 },
  "ISFJ": { "ESTP": 85, "ESFP": 80, "ESTJ": 75, "ESFJ": 70, "ISFP": 65, "ISFJ": 60, "ISTP": 55, "ISTJ": 50, "ENFP": 60, "INFP": 55, "ENFJ": 50, "INFJ": 55, "ENTJ": 40, "INTJ": 35, "ENTP": 30, "INTP": 25 },
  "ENTJ": { "INTP": 90, "INFP": 85, "ENTP": 80, "INTJ": 75, "ENFP": 85, "INFJ": 70, "ENFJ": 65, "ENTJ": 60, "ISTP": 55, "ESTP": 50, "ISTJ": 55, "ESTJ": 60, "ISFP": 45, "ESFP": 40, "ISFJ": 35, "ESFJ": 30 },
  "ESFP": { "ISFJ": 80, "ISTJ": 75, "ESFJ": 70, "ESTJ": 65, "ISFP": 60, "ESFP": 55, "ISTP": 50, "ESTP": 55, "ENFJ": 45, "INFJ": 40, "ENFP": 35, "INFP": 30, "ENTJ": 25, "INTJ": 20, "ENTP": 15, "INTP": 10 },
  "ISTP": { "ESTJ": 85, "ESFJ": 80, "ENTJ": 75, "ENFJ": 70, "ISTJ": 65, "ISFJ": 60, "ESTP": 55, "ISTP": 50, "ESFP": 45, "ISFP": 40, "INTJ": 50, "INTP": 45, "ENTP": 40, "ENFP": 35, "INFJ": 30, "INFP": 25 },
  "ESTJ": { "ISTP": 85, "ISFP": 80, "INTP": 70, "INFP": 65, "ISTJ": 60, "ESTP": 55, "ESTJ": 50, "ESFJ": 55, "ENTJ": 60, "INTJ": 50, "ISFJ": 45, "ESFP": 40, "ENTP": 35, "ENFP": 30, "INFJ": 25, "ENFJ": 20 },
  "ESFJ": { "ISTP": 80, "ISFP": 85, "ESTP": 75, "ESFP": 70, "ISFJ": 70, "ISTJ": 65, "ESFJ": 60, "ESTJ": 55, "INFP": 50, "ENFP": 55, "INFJ": 50, "ENFJ": 55, "INTP": 40, "ENTP": 35, "INTJ": 30, "ENTJ": 25 },
  "INFP": { "ENFJ": 95, "ENTJ": 85, "INFJ": 80, "INTJ": 85, "ENFP": 70, "ENTP": 65, "INFP": 60, "INTP": 55, "ISFJ": 55, "ESFJ": 50, "ISFP": 45, "ESFP": 40, "ISTJ": 35, "ESTJ": 30, "ISTP": 25, "ESTP": 20 },
  "ENTP": { "INFJ": 85, "INTJ": 90, "ENFJ": 75, "ENTJ": 80, "INTP": 85, "ENFP": 75, "INFP": 65, "ENTP": 60, "ISTP": 50, "ESTP": 45, "ISTJ": 40, "ESTJ": 35, "ISFP": 30, "ESFP": 25, "ISFJ": 30, "ESFJ": 25 },
  "ISTJ": { "ESFP": 75, "ESTP": 80, "ISFP": 70, "ISTP": 65, "ESFJ": 60, "ESTJ": 60, "ISFJ": 55, "ISTJ": 50, "ENFP": 50, "ENTP": 40, "ENFJ": 35, "ENTJ": 55, "INFP": 35, "INTP": 35, "INFJ": 30, "INTJ": 55 },
};

const MBTI_LIST = ["ENFP", "INTJ", "INFJ", "INTP", "ISFP", "ENFJ", "ESTP", "ISFJ", "ENTJ", "ESFP", "ISTP", "ESTJ", "ESFJ", "INFP", "ENTP", "ISTJ"];

const getCompatibilityAdvice = (score: number): { advice: string; adviceVi: string } => {
  if (score >= 85) return { 
    advice: "운명적인 만남! 서로를 완벽하게 이해할 수 있어요 💫", 
    adviceVi: "Cuộc gặp gỡ định mệnh! Hai bạn có thể hiểu nhau hoàn hảo 💫" 
  };
  if (score >= 70) return { 
    advice: "아주 잘 맞아요! 깊은 관계를 발전시킬 수 있어요 💕", 
    adviceVi: "Rất hợp nhau! Có thể phát triển mối quan hệ sâu sắc 💕" 
  };
  if (score >= 55) return { 
    advice: "서로 다른 점이 매력! 노력하면 좋은 관계가 될 거예요 ✨", 
    adviceVi: "Sự khác biệt là điểm hấp dẫn! Cố gắng sẽ có mối quan hệ tốt ✨" 
  };
  if (score >= 40) return { 
    advice: "도전적인 조합이지만 서로에게서 많이 배울 수 있어요 📚", 
    adviceVi: "Sự kết hợp thử thách nhưng có thể học hỏi nhiều từ nhau 📚" 
  };
  return { 
    advice: "어려울 수 있지만, 진정한 사랑은 모든 걸 극복해요! 💪", 
    adviceVi: "Có thể khó khăn nhưng tình yêu đích thực sẽ vượt qua tất cả! 💪" 
  };
};

const MbtiCompatibility = ({ npcName, npcMbti, onClose }: MbtiCompatibilityProps) => {
  const [userMbti, setUserMbti] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleSelectMbti = (mbti: string) => {
    setUserMbti(mbti);
    setTimeout(() => setShowResult(true), 500);
  };

  const getScore = () => {
    if (!userMbti) return 0;
    return MBTI_COMPATIBILITY[userMbti]?.[npcMbti] || MBTI_COMPATIBILITY[npcMbti]?.[userMbti] || 50;
  };

  const score = getScore();
  const { advice, adviceVi } = getCompatibilityAdvice(score);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-lg z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-gradient-to-b from-indigo-900 to-purple-900 rounded-3xl p-6 max-w-sm w-full border border-white/20 max-h-[90vh] overflow-y-auto"
      >
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
            🔮 MBTI 궁합
          </h2>
          <p className="text-white/60 text-sm mt-1">MBTI Compatibility Test</p>
          <p className="text-pink-300 text-sm mt-2">
            {npcName}의 MBTI: <span className="font-bold">{npcMbti}</span>
          </p>
        </div>

        {!showResult ? (
          <div>
            <p className="text-white/80 text-center mb-4">
              당신의 MBTI를 선택하세요
              <br />
              <span className="text-white/50 text-sm">Chọn MBTI của bạn</span>
            </p>
            <div className="grid grid-cols-4 gap-2">
              {MBTI_LIST.map((mbti) => (
                <motion.button
                  key={mbti}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSelectMbti(mbti)}
                  className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                    userMbti === mbti
                      ? "bg-pink-500 text-white"
                      : "bg-white/10 text-white/80 hover:bg-white/20"
                  }`}
                >
                  {mbti}
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            {/* Compatibility Score */}
            <div className="relative w-40 h-40 mx-auto mb-6">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="12"
                  fill="none"
                />
                <motion.circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="url(#gradient)"
                  strokeWidth="12"
                  fill="none"
                  strokeLinecap="round"
                  initial={{ strokeDasharray: "0 440" }}
                  animate={{ strokeDasharray: `${score * 4.4} 440` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#F472B6" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                  className="text-4xl font-bold text-white"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {score}%
                </motion.span>
                <span className="text-white/60 text-sm">궁합</span>
              </div>
            </div>

            {/* MBTI Pair */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="bg-gradient-to-r from-pink-500 to-purple-500 px-4 py-2 rounded-xl">
                <span className="text-white font-bold">{userMbti}</span>
              </div>
              <Heart className="w-6 h-6 text-pink-400" />
              <div className="bg-gradient-to-r from-purple-500 to-indigo-500 px-4 py-2 rounded-xl">
                <span className="text-white font-bold">{npcMbti}</span>
              </div>
            </div>

            {/* Advice */}
            <div className="bg-white/10 rounded-2xl p-4 mb-6">
              <Sparkles className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <p className="text-white text-sm">{advice}</p>
              <p className="text-white/60 text-xs mt-2">{adviceVi}</p>
            </div>

            <Button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
            >
              확인 / OK
            </Button>
          </motion.div>
        )}

        {!showResult && (
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full mt-4 text-white/60 hover:text-white"
          >
            닫기 / Đóng
          </Button>
        )}
      </motion.div>
    </motion.div>
  );
};

export default MbtiCompatibility;
