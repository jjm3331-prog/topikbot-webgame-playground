import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { 
  CheckCircle2,
  XCircle,
  RotateCcw,
  Loader2,
  Timer,
  Flame,
  Circle,
  X
} from "lucide-react";

interface OXQuestion {
  id: string;
  statement: string;
  is_correct: boolean;
  explanation: string;
  explanation_vi?: string;
  grammar_point?: string;
  level: number;
}

interface OXSpeedProps {
  level: number;
  onMistake?: (question: OXQuestion) => void;
}

const OXSpeed = ({ level, onMistake }: OXSpeedProps) => {
  const { t } = useTranslation();
  const [questions, setQuestions] = useState<OXQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(5);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentQuestion = questions[currentIndex];

  // Fetch OX questions from DB
  const fetchQuestions = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('grammar_ox_questions')
        .select('*')
        .eq('level', level)
        .order('created_at')
        .limit(20);

      if (error) throw error;

      if (data && data.length > 0) {
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        setQuestions(shuffled.slice(0, 5)); // 5문제 연속
      } else {
        setQuestions([]);
      }
    } catch (error) {
      console.error('Error fetching OX questions:', error);
      setQuestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [level]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Timer logic
  useEffect(() => {
    if (!isTimerActive || timeLeft <= 0) return;

    timerRef.current = setTimeout(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft, isTimerActive]);

  // Time up handler
  useEffect(() => {
    if (timeLeft === 0 && isTimerActive && !showResult) {
      handleTimeUp();
    }
  }, [timeLeft, isTimerActive, showResult]);

  const handleTimeUp = () => {
    setShowResult(true);
    setIsTimerActive(false);
    setStreak(0);
    onMistake?.(currentQuestion);
  };

  const startGame = () => {
    setGameStarted(true);
    setIsTimerActive(true);
    setTimeLeft(5);
  };

  const handleAnswer = (answer: boolean) => {
    if (showResult) return;
    
    setSelectedAnswer(answer);
    setShowResult(true);
    setIsTimerActive(false);
    
    const isCorrect = answer === currentQuestion.is_correct;
    
    if (isCorrect) {
      const timeBonus = timeLeft * 2;
      const streakBonus = Math.min(streak, 5) * 3;
      setScore(prev => prev + 10 + timeBonus + streakBonus);
      setStreak(prev => prev + 1);
    } else {
      setStreak(0);
      onMistake?.(currentQuestion);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setTimeLeft(5);
      setIsTimerActive(true);
    } else {
      setSessionComplete(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setSessionComplete(false);
    setGameStarted(false);
    setSelectedAnswer(null);
    setShowResult(false);
    setTimeLeft(5);
    setIsTimerActive(false);
    fetchQuestions();
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">{t("oxSpeed.loading")}</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">
          {t("oxSpeed.noQuestions")}
        </p>
        <Button onClick={fetchQuestions}>{t("oxSpeed.retry")}</Button>
      </div>
    );
  }

  if (!gameStarted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center mx-auto mb-6">
          <Timer className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-2xl font-bold mb-2">{t("oxSpeed.title")}</h2>
        <p className="text-muted-foreground mb-6">
          {t("oxSpeed.description")}
        </p>
        <Button onClick={startGame} size="lg" className="bg-gradient-to-r from-orange-500 to-red-500">
          {t("oxSpeed.start")}
        </Button>
      </motion.div>
    );
  }

  if (sessionComplete) {
    const accuracy = Math.round((score / (questions.length * 20)) * 100);
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-2xl font-bold mb-2">{t("oxSpeed.complete")} ⚡</h2>
        <p className="text-4xl font-bold text-primary mb-2">{score}{t("oxSpeed.points")}</p>
        <p className="text-muted-foreground mb-6">
          {t("oxSpeed.accuracy")}: {accuracy}% | {t("oxSpeed.maxStreak")}: {streak}
        </p>
        <Button onClick={handleRestart} size="lg">
          <RotateCcw className="w-4 h-4 mr-2" />
          {t("oxSpeed.tryAgain")}
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Timer & Progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            {currentIndex + 1} / {questions.length}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {streak >= 2 && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1 text-orange-500"
            >
              <Flame className="w-5 h-5" />
              <span className="font-bold">{streak}</span>
            </motion.div>
          )}
          <div className={`text-2xl font-bold ${timeLeft <= 2 ? 'text-red-500 animate-pulse' : 'text-foreground'}`}>
            ⏱️ {timeLeft}s
          </div>
          <span className="text-lg font-bold text-primary">{score}{t("oxSpeed.points")}</span>
        </div>
      </div>

      {/* Timer Bar */}
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <motion.div 
          className={`h-full ${timeLeft <= 2 ? 'bg-red-500' : 'bg-orange-500'}`}
          initial={{ width: '100%' }}
          animate={{ width: `${(timeLeft / 5) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-2 border-orange-500/20 rounded-3xl p-6 md:p-8"
        >
          {/* Grammar Point Tag */}
          {currentQuestion.grammar_point && (
            <div className="inline-block px-3 py-1 rounded-full bg-orange-500/20 text-orange-600 dark:text-orange-400 text-sm font-medium mb-4">
              📚 {currentQuestion.grammar_point}
            </div>
          )}

          {/* Statement */}
          <h2 className="text-xl md:text-2xl font-bold text-center mb-8 leading-relaxed">
            "{currentQuestion.statement}"
          </h2>

          {/* O/X Buttons */}
          <div className="grid grid-cols-2 gap-6">
            <motion.button
              whileHover={{ scale: showResult ? 1 : 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleAnswer(true)}
              disabled={showResult}
              className={`aspect-square max-w-[150px] mx-auto rounded-full flex items-center justify-center transition-all ${
                showResult
                  ? currentQuestion.is_correct
                    ? "bg-green-500 text-white"
                    : selectedAnswer === true
                      ? "bg-red-500 text-white"
                      : "bg-muted text-muted-foreground"
                  : "bg-blue-500 hover:bg-blue-600 text-white"
              }`}
            >
              <Circle className="w-16 h-16 md:w-20 md:h-20" strokeWidth={4} />
            </motion.button>

            <motion.button
              whileHover={{ scale: showResult ? 1 : 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleAnswer(false)}
              disabled={showResult}
              className={`aspect-square max-w-[150px] mx-auto rounded-full flex items-center justify-center transition-all ${
                showResult
                  ? !currentQuestion.is_correct
                    ? "bg-green-500 text-white"
                    : selectedAnswer === false
                      ? "bg-red-500 text-white"
                      : "bg-muted text-muted-foreground"
                  : "bg-red-500 hover:bg-red-600 text-white"
              }`}
            >
              <X className="w-16 h-16 md:w-20 md:h-20" strokeWidth={4} />
            </motion.button>
          </div>

          {/* Explanation */}
          {showResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 p-4 rounded-xl bg-background/50"
            >
              <p className={`text-lg font-bold mb-2 ${
                selectedAnswer === currentQuestion.is_correct ? 'text-green-500' : 'text-red-500'
              }`}>
                {selectedAnswer === currentQuestion.is_correct ? t("oxSpeed.correct") : t("oxSpeed.wrong")}
                {timeLeft === 0 && ` (${t("oxSpeed.timeout")})`}
              </p>
              <p className="text-muted-foreground">
                {currentQuestion.explanation}
              </p>
              {currentQuestion.explanation_vi && (
                <p className="text-muted-foreground text-sm mt-2">
                  🇻🇳 {currentQuestion.explanation_vi}
                </p>
              )}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Next Button */}
      {showResult && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center"
        >
          <Button onClick={handleNext} size="lg">
            {currentIndex < questions.length - 1 ? t("oxSpeed.next") : t("oxSpeed.viewResults")}
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default OXSpeed;
