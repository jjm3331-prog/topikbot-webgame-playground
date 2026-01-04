import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Heart, Sparkles, Crown, Users, Star } from "lucide-react";

export type EndingType = 'romantic' | 'friend' | 'tsundere' | 'dramatic';

interface EndingData {
  type: EndingType;
  titleKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
  color: string;
  bgGradient: string;
}

const ENDINGS: Record<EndingType, EndingData> = {
  romantic: {
    type: 'romantic',
    titleKey: "dating.endings.romantic.title",
    descriptionKey: "dating.endings.romantic.description",
    icon: <Heart className="w-12 h-12 fill-pink-400 text-pink-400" />,
    color: "text-pink-400",
    bgGradient: "from-pink-900 via-red-900 to-pink-900",
  },
  friend: {
    type: 'friend',
    titleKey: "dating.endings.friend.title",
    descriptionKey: "dating.endings.friend.description",
    icon: <Users className="w-12 h-12 text-blue-400" />,
    color: "text-blue-400",
    bgGradient: "from-blue-900 via-indigo-900 to-blue-900",
  },
  tsundere: {
    type: 'tsundere',
    titleKey: "dating.endings.tsundere.title",
    descriptionKey: "dating.endings.tsundere.description",
    icon: <Sparkles className="w-12 h-12 text-orange-400" />,
    color: "text-orange-400",
    bgGradient: "from-orange-900 via-red-900 to-orange-900",
  },
  dramatic: {
    type: 'dramatic',
    titleKey: "dating.endings.dramatic.title",
    descriptionKey: "dating.endings.dramatic.description",
    icon: <Crown className="w-12 h-12 text-yellow-400" />,
    color: "text-yellow-400",
    bgGradient: "from-purple-900 via-pink-900 to-purple-900",
  },
};

interface SecretEndingProps {
  ending: EndingType;
  npcName: string;
  npcImage: string;
  onClose: () => void;
}

const SecretEnding = ({ ending, npcName, npcImage, onClose }: SecretEndingProps) => {
  const { t } = useTranslation();
  const endingData = ENDINGS[ending];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-lg z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        className={`bg-gradient-to-b ${endingData.bgGradient} rounded-3xl p-6 max-w-sm w-full border border-white/20 text-center`}
      >
        {/* Confetti Effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                backgroundColor: ['#FFD700', '#FF69B4', '#00CED1', '#FF6347', '#9370DB'][Math.floor(Math.random() * 5)],
              }}
              initial={{ y: -20, opacity: 0 }}
              animate={{
                y: ['0%', '100vh'],
                opacity: [1, 1, 0],
                rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                delay: Math.random() * 2,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          ))}
        </div>

        {/* Badge */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          className="mb-4"
        >
          <div className="w-24 h-24 mx-auto rounded-full bg-white/10 flex items-center justify-center">
            {endingData.icon}
          </div>
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className={`text-2xl font-bold ${endingData.color} mb-4`}
        >
          {t(endingData.titleKey)}
        </motion.h2>


        {/* NPC Image */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
          className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-white/30 mb-4"
        >
          <img src={npcImage} alt={npcName} className="w-full h-full object-cover" />
        </motion.div>

        {/* Description */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-black/30 rounded-2xl p-4 mb-6"
        >
          <p className="text-white font-bold mb-1">{t("dating.endings.storyWith", { name: npcName })}</p>
          <p className="text-white/80 text-sm">{t(endingData.descriptionKey)}</p>
        </motion.div>

        {/* Unlock Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex items-center justify-center gap-2 mb-6"
        >
          <Star className="w-5 h-5 text-yellow-400" />
          <span className="text-yellow-400 text-sm font-medium">{t("dating.endings.addedToCollection")}</span>
          <Star className="w-5 h-5 text-yellow-400" />
        </motion.div>

        <Button
          onClick={onClose}
          className="w-full bg-white/20 hover:bg-white/30 text-white"
        >
          {t("common.confirm")}
        </Button>
      </motion.div>
    </motion.div>
  );
};

export default SecretEnding;
