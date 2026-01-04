import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Gamepad2, Heart, Check, X } from "lucide-react";

interface MiniGameProps {
  npcName: string;
  onComplete: (bonusAffinity: number) => void;
  onClose: () => void;
}

type GameType = 'telepathy' | 'preference';

interface GameQuestion {
  question: string;
  questionVi: string;
  options: { label: string; labelVi: string }[];
  npcAnswer: number;
}

const TELEPATHY_QUESTIONS: GameQuestion[] = [
  {
    question: "지금 뭐 먹고 싶어?",
    questionVi: "Bạn muốn ăn gì bây giờ?",
    options: [
      { label: "🍕 피자", labelVi: "Pizza" },
      { label: "🍜 라면", labelVi: "Mì ramen" },
      { label: "🍣 초밥", labelVi: "Sushi" },
      { label: "🍔 버거", labelVi: "Burger" },
    ],
    npcAnswer: Math.floor(Math.random() * 4),
  },
  {
    question: "이상형 데이트 장소는?",
    questionVi: "Địa điểm hẹn hò lý tưởng?",
    options: [
      { label: "🎬 영화관", labelVi: "Rạp phim" },
      { label: "☕ 카페", labelVi: "Quán cafe" },
      { label: "🌊 바다", labelVi: "Biển" },
      { label: "🎢 놀이공원", labelVi: "Công viên giải trí" },
    ],
    npcAnswer: Math.floor(Math.random() * 4),
  },
  {
    question: "주말에 뭐 하고 싶어?",
    questionVi: "Bạn muốn làm gì cuối tuần?",
    options: [
      { label: "🏠 집에서 쉬기", labelVi: "Nghỉ ở nhà" },
      { label: "🛍️ 쇼핑", labelVi: "Mua sắm" },
      { label: "🏃 운동", labelVi: "Tập thể dục" },
      { label: "🎮 게임", labelVi: "Chơi game" },
    ],
    npcAnswer: Math.floor(Math.random() * 4),
  },
];

const PREFERENCE_QUESTIONS: GameQuestion[] = [
  {
    question: "더 좋아하는 건?",
    questionVi: "Bạn thích cái nào hơn?",
    options: [
      { label: "🌅 아침형", labelVi: "Người dậy sớm" },
      { label: "🌙 저녁형", labelVi: "Người thức khuya" },
    ],
    npcAnswer: Math.floor(Math.random() * 2),
  },
  {
    question: "여행 스타일은?",
    questionVi: "Phong cách du lịch?",
    options: [
      { label: "📋 계획형", labelVi: "Có kế hoạch" },
      { label: "🎲 즉흥형", labelVi: "Tự phát" },
    ],
    npcAnswer: Math.floor(Math.random() * 2),
  },
  {
    question: "선호하는 연락 방식?",
    questionVi: "Phương thức liên lạc ưa thích?",
    options: [
      { label: "📱 전화", labelVi: "Gọi điện" },
      { label: "💬 문자", labelVi: "Nhắn tin" },
    ],
    npcAnswer: Math.floor(Math.random() * 2),
  },
];

const MiniGame = ({ npcName, onComplete, onClose }: MiniGameProps) => {
  const { t, i18n } = useTranslation();
  const [gameType, setGameType] = useState<GameType | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [userAnswer, setUserAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [questions, setQuestions] = useState<GameQuestion[]>([]);

  useEffect(() => {
    if (gameType) {
      // Regenerate random NPC answers when game starts
      const baseQuestions = gameType === 'telepathy' ? TELEPATHY_QUESTIONS : PREFERENCE_QUESTIONS;
      setQuestions(baseQuestions.map(q => ({
        ...q,
        npcAnswer: Math.floor(Math.random() * q.options.length)
      })));
    }
  }, [gameType]);

  const handleAnswer = (answerIndex: number) => {
    setUserAnswer(answerIndex);
    setShowResult(true);

    const isCorrect = answerIndex === questions[currentQuestion].npcAnswer;
    if (isCorrect) {
      setScore(prev => prev + 1);
    }

    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
        setUserAnswer(null);
        setShowResult(false);
      } else {
        setGameComplete(true);
      }
    }, 1500);
  };

  const getBonusAffinity = () => {
    const percentage = (score / questions.length) * 100;
    if (percentage === 100) return 20;
    if (percentage >= 66) return 15;
    if (percentage >= 33) return 10;
    return 5;
  };

  const handleComplete = () => {
    onComplete(getBonusAffinity());
    onClose();
  };

  if (!gameType) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-lg z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.8, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-gradient-to-b from-green-900 to-teal-900 rounded-3xl p-6 max-w-sm w-full border border-white/20"
        >
          <div className="text-center mb-6">
            <Gamepad2 className="w-12 h-12 text-green-400 mx-auto mb-2" />
            <h2 className="text-2xl font-bold text-white">🎮 {t("dating.miniGame.title")}</h2>
            <p className="text-white/60 text-sm mt-1">{t("dating.miniGame.subtitle")}</p>
            <p className="text-green-300 text-sm mt-2">
              {t("dating.miniGame.playWith", { name: npcName })}
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => setGameType('telepathy')}
              className="w-full h-20 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 flex flex-col"
            >
              <span className="text-xl">🔮</span>
              <span className="font-bold">{t("dating.miniGame.telepathy")}</span>
              <span className="text-xs opacity-80">{t("dating.miniGame.telepathySub")}</span>
            </Button>

            <Button
              onClick={() => setGameType('preference')}
              className="w-full h-20 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 flex flex-col"
            >
              <span className="text-xl">💕</span>
              <span className="font-bold">{t("dating.miniGame.preference")}</span>
              <span className="text-xs opacity-80">{t("dating.miniGame.preferenceSub")}</span>
            </Button>
          </div>

          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full mt-4 text-white/60 hover:text-white"
          >
            {t("common.close")}
          </Button>
        </motion.div>
      </motion.div>
    );
  }

  if (gameComplete) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-lg z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="bg-gradient-to-b from-pink-900 to-purple-900 rounded-3xl p-6 max-w-sm w-full border border-white/20 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ delay: 0.2 }}
          >
            {score === questions.length ? (
              <span className="text-6xl">🎉</span>
            ) : score >= questions.length / 2 ? (
              <span className="text-6xl">😊</span>
            ) : (
              <span className="text-6xl">😅</span>
            )}
          </motion.div>

          <h2 className="text-2xl font-bold text-white mt-4 mb-2">
            {score === questions.length ? t("dating.miniGame.perfectMatch") : score >= questions.length / 2 ? t("dating.miniGame.goodMatch") : t("dating.miniGame.tryAgain")}
          </h2>
          
          <p className="text-pink-300 text-lg mb-4">
            {score} / {questions.length} {t("dating.miniGame.correct")}
          </p>

          <div className="bg-white/10 rounded-2xl p-4 mb-6">
            <Heart className="w-8 h-8 text-pink-400 mx-auto mb-2" />
            <p className="text-white font-bold">+{getBonusAffinity()} {t("dating.miniGame.affinity")}</p>
            <p className="text-white/60 text-sm">+{getBonusAffinity()} {t("dating.miniGame.affinitySub")}</p>
          </div>

          <Button
            onClick={handleComplete}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
          >
            {t("common.confirm")}
          </Button>
        </motion.div>
      </motion.div>
    );
  }

  const question = questions[currentQuestion];
  if (!question) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-lg z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        className="bg-gradient-to-b from-indigo-900 to-purple-900 rounded-3xl p-6 max-w-sm w-full border border-white/20"
      >
        {/* Progress */}
        <div className="flex gap-1 mb-6">
          {questions.map((_, idx) => (
            <div
              key={idx}
              className={`flex-1 h-2 rounded-full ${
                idx < currentQuestion
                  ? "bg-green-400"
                  : idx === currentQuestion
                  ? "bg-pink-400"
                  : "bg-white/20"
              }`}
            />
          ))}
        </div>

        <div className="text-center mb-6">
          <p className="text-white/60 text-sm mb-1">
            {gameType === 'telepathy' ? `🔮 ${t("dating.miniGame.telepathy")}` : `💕 ${t("dating.miniGame.preference")}`}
          </p>
          <h3 className="text-xl font-bold text-white">{i18n.language === 'ko' ? question.question : question.questionVi}</h3>
          <p className="text-white/60 text-sm">{i18n.language === 'ko' ? question.questionVi : question.question}</p>
          <p className="text-pink-300 text-sm mt-2">
            {t("dating.miniGame.guessNpc", { name: npcName })}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {question.options.map((option, idx) => (
            <motion.button
              key={idx}
              whileHover={{ scale: showResult ? 1 : 1.05 }}
              whileTap={{ scale: showResult ? 1 : 0.95 }}
              onClick={() => !showResult && handleAnswer(idx)}
              disabled={showResult}
              className={`p-4 rounded-xl text-center transition-all ${
                showResult
                  ? idx === question.npcAnswer
                    ? "bg-green-500 text-white"
                    : userAnswer === idx
                    ? "bg-red-500 text-white"
                    : "bg-white/10 text-white/50"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              <span className="text-2xl block mb-1">{(i18n.language === 'ko' ? option.label : option.labelVi).split(" ")[0]}</span>
              <span className="text-sm block">{(i18n.language === 'ko' ? option.label : option.labelVi).split(" ").slice(1).join(" ")}</span>
              {showResult && idx === question.npcAnswer && (
                <Check className="w-5 h-5 mx-auto mt-2" />
              )}
              {showResult && userAnswer === idx && idx !== question.npcAnswer && (
                <X className="w-5 h-5 mx-auto mt-2" />
              )}
            </motion.button>
          ))}
        </div>

        {showResult && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-center font-bold ${
              userAnswer === question.npcAnswer ? "text-green-400" : "text-red-400"
            }`}
          >
            {userAnswer === question.npcAnswer ? `${t("dating.miniGame.correctAnswer")} 💕` : t("dating.miniGame.wrongAnswer", { name: npcName })}
          </motion.p>
        )}
      </motion.div>
    </motion.div>
  );
};

export default MiniGame;
