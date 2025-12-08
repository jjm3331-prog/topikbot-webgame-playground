import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Heart, Sparkles, Crown, Users, Drama, Star } from "lucide-react";

export type EndingType = 'romantic' | 'friend' | 'tsundere' | 'dramatic';

interface EndingData {
  type: EndingType;
  title: string;
  titleVi: string;
  description: string;
  descriptionVi: string;
  icon: React.ReactNode;
  color: string;
  bgGradient: string;
}

const ENDINGS: Record<EndingType, EndingData> = {
  romantic: {
    type: 'romantic',
    title: "💕 로맨틱 엔딩",
    titleVi: "Kết thúc lãng mạn",
    description: "달콤한 고백과 함께 연인이 되었어요! 서로를 향한 진심이 통했네요.",
    descriptionVi: "Với lời tỏ tình ngọt ngào, hai bạn đã trở thành người yêu! Tình cảm chân thành đã kết nối hai trái tim.",
    icon: <Heart className="w-12 h-12 fill-pink-400 text-pink-400" />,
    color: "text-pink-400",
    bgGradient: "from-pink-900 via-red-900 to-pink-900",
  },
  friend: {
    type: 'friend',
    title: "🤝 베프 엔딩",
    titleVi: "Kết thúc bạn thân",
    description: "친한 친구가 되었어요! 연인보다 더 소중한 사이가 될 거예요.",
    descriptionVi: "Hai bạn đã trở thành bạn thân! Sẽ là mối quan hệ quý giá hơn cả người yêu.",
    icon: <Users className="w-12 h-12 text-blue-400" />,
    color: "text-blue-400",
    bgGradient: "from-blue-900 via-indigo-900 to-blue-900",
  },
  tsundere: {
    type: 'tsundere',
    title: "😤💕 츤데레 엔딩",
    titleVi: "Kết thúc Tsundere",
    description: "싸우면서 사랑하는 사이! 밀당의 끝에 서로를 인정했어요.",
    descriptionVi: "Cãi nhau nhưng vẫn yêu! Sau những lần đẩy-kéo, cuối cùng đã thừa nhận tình cảm.",
    icon: <Sparkles className="w-12 h-12 text-orange-400" />,
    color: "text-orange-400",
    bgGradient: "from-orange-900 via-red-900 to-orange-900",
  },
  dramatic: {
    type: 'dramatic',
    title: "🎬 드라마틱 엔딩",
    titleVi: "Kết thúc kịch tính",
    description: "운명적인 만남! 마치 드라마 같은 이야기가 펼쳐졌어요.",
    descriptionVi: "Cuộc gặp gỡ định mệnh! Một câu chuyện như phim đã được viết nên.",
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
          className={`text-2xl font-bold ${endingData.color} mb-1`}
        >
          {endingData.title}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-white/60 text-sm mb-4"
        >
          {endingData.titleVi}
        </motion.p>

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
          <p className="text-white font-bold mb-1">{npcName}와(과)의 이야기</p>
          <p className="text-white/80 text-sm mb-2">{endingData.description}</p>
          <p className="text-white/50 text-xs">{endingData.descriptionVi}</p>
        </motion.div>

        {/* Unlock Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex items-center justify-center gap-2 mb-6"
        >
          <Star className="w-5 h-5 text-yellow-400" />
          <span className="text-yellow-400 text-sm font-medium">엔딩 컬렉션에 추가됨!</span>
          <Star className="w-5 h-5 text-yellow-400" />
        </motion.div>

        <Button
          onClick={onClose}
          className="w-full bg-white/20 hover:bg-white/30 text-white"
        >
          확인 / OK
        </Button>
      </motion.div>
    </motion.div>
  );
};

export default SecretEnding;
