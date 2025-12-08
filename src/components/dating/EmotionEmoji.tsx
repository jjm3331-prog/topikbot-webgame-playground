import { motion, AnimatePresence } from "framer-motion";

interface EmotionEmojiProps {
  affinity: number;
}

const getEmoji = (affinity: number) => {
  if (affinity >= 90) return { emoji: "💘", label: "완전 반했어!" };
  if (affinity >= 75) return { emoji: "🥰", label: "너무 좋아!" };
  if (affinity >= 60) return { emoji: "😍", label: "설레어~" };
  if (affinity >= 45) return { emoji: "😊", label: "좋은 느낌" };
  if (affinity >= 30) return { emoji: "🙂", label: "관심있어" };
  if (affinity >= 15) return { emoji: "😐", label: "아직 모르겠어" };
  return { emoji: "😒", label: "별로야..." };
};

const EmotionEmoji = ({ affinity }: EmotionEmojiProps) => {
  const { emoji, label } = getEmoji(affinity);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={emoji}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0, rotate: 180 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="relative"
      >
        <motion.span
          className="text-2xl"
          animate={{
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {emoji}
        </motion.span>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap"
        >
          <span className="text-[10px] text-white/60 bg-black/40 px-1.5 py-0.5 rounded-full">
            {label}
          </span>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EmotionEmoji;
