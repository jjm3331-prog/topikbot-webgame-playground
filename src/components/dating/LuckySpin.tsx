import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Gift, Sparkles, Star } from "lucide-react";

interface SpinReward {
  id: number;
  labelKey: string;
  value: number;
  type: 'affinity' | 'topic' | 'item';
  color: string;
  icon: string;
}

const REWARDS: SpinReward[] = [
  { id: 1, labelKey: "dating.luckySpin.rewards.affinity20", value: 20, type: 'affinity', color: "#FF6B6B", icon: "💕" },
  { id: 2, labelKey: "dating.luckySpin.rewards.affinity10", value: 10, type: 'affinity', color: "#FFE66D", icon: "💗" },
  { id: 3, labelKey: "dating.luckySpin.rewards.affinity5", value: 5, type: 'affinity', color: "#4ECDC4", icon: "💖" },
  { id: 4, labelKey: "dating.luckySpin.rewards.specialTopic", value: 1, type: 'topic', color: "#A855F7", icon: "💬" },
  { id: 5, labelKey: "dating.luckySpin.rewards.affinity15", value: 15, type: 'affinity', color: "#F472B6", icon: "💝" },
  { id: 6, labelKey: "dating.luckySpin.rewards.dateItem", value: 1, type: 'item', color: "#818CF8", icon: "🎁" },
  { id: 7, labelKey: "dating.luckySpin.rewards.affinity8", value: 8, type: 'affinity', color: "#2DD4BF", icon: "💓" },
  { id: 8, labelKey: "dating.luckySpin.rewards.luckyBonus", value: 25, type: 'affinity', color: "#FBBF24", icon: "🌟" },
];

interface LuckySpinProps {
  onReward: (reward: SpinReward) => void;
  canSpin: boolean;
  onClose: () => void;
}

const LuckySpin = ({ onReward, canSpin, onClose }: LuckySpinProps) => {
  const { t } = useTranslation();
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<SpinReward | null>(null);

  const segmentAngle = 360 / REWARDS.length;

  const spin = () => {
    if (isSpinning || !canSpin) return;

    setIsSpinning(true);
    setResult(null);

    // Random reward selection
    const randomIndex = Math.floor(Math.random() * REWARDS.length);
    const selectedReward = REWARDS[randomIndex];

    // Calculate rotation to land on the selected reward
    const baseRotation = 360 * 5; // 5 full rotations
    const targetAngle = (randomIndex * segmentAngle) + (segmentAngle / 2);
    const finalRotation = rotation + baseRotation + (360 - targetAngle);

    setRotation(finalRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setResult(selectedReward);
      onReward(selectedReward);
    }, 4000);
  };

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
        className="bg-gradient-to-b from-purple-900 to-pink-900 rounded-3xl p-6 max-w-sm w-full border border-white/20"
      >
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
            <Gift className="w-6 h-6 text-pink-400" />
            {t("dating.luckySpin.title")}
          </h2>
          <p className="text-white/60 text-sm mt-1">{t("dating.luckySpin.subtitle")}</p>
        </div>

        {/* Wheel */}
        <div className="relative w-64 h-64 mx-auto mb-6">
          {/* Pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
            <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-yellow-400 drop-shadow-lg" />
          </div>

          {/* Wheel Circle */}
          <motion.div
            className="w-full h-full rounded-full relative overflow-hidden border-4 border-yellow-400 shadow-2xl"
            style={{
              background: `conic-gradient(${REWARDS.map((r, i) => 
                `${r.color} ${i * segmentAngle}deg ${(i + 1) * segmentAngle}deg`
              ).join(', ')})`,
            }}
            animate={{ rotate: rotation }}
            transition={{ duration: 4, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {REWARDS.map((reward, index) => {
              const angle = index * segmentAngle + segmentAngle / 2;
              return (
                <div
                  key={reward.id}
                  className="absolute text-2xl"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: `rotate(${angle}deg) translateY(-90px) rotate(-${angle}deg)`,
                  }}
                >
                  {reward.icon}
                </div>
              );
            })}
          </motion.div>

          {/* Center */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-gradient-to-b from-yellow-300 to-yellow-500 border-4 border-white flex items-center justify-center shadow-lg">
            <Star className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Result */}
        {result && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center mb-4 p-4 bg-white/10 rounded-2xl"
          >
            <Sparkles className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <p className="text-2xl mb-1">{result.icon}</p>
            <p className="text-white font-bold">{t(result.labelKey)}</p>
          </motion.div>
        )}

        {/* Buttons */}
        <div className="space-y-3">
          {!result ? (
            <Button
              onClick={spin}
              disabled={isSpinning || !canSpin}
              className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-black font-bold text-lg py-6"
            >
              {isSpinning ? (
                <span className="flex items-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    🎰
                  </motion.span>
                  {t("dating.luckySpin.spinning")}
                </span>
              ) : canSpin ? (
                t("dating.luckySpin.spin")
              ) : (
                t("dating.luckySpin.alreadySpun")
              )}
            </Button>
          ) : (
            <Button
              onClick={onClose}
              className="w-full bg-pink-500 hover:bg-pink-600"
            >
              {t("common.confirm")}
            </Button>
          )}
          
          {!result && (
            <Button
              variant="ghost"
              onClick={onClose}
              className="w-full text-white/60 hover:text-white"
            >
              {t("common.close")}
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default LuckySpin;
