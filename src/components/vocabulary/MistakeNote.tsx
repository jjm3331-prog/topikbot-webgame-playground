import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { 
  BookX, 
  Loader2, 
  RotateCcw, 
  Timer,
  CheckCircle2,
  XCircle,
  Trophy,
  Sparkles,
  AlertCircle
} from "lucide-react";
import confetti from "canvas-confetti";

interface MistakeItem {
  id: string;
  item_type: string;
  item_id: string;
  item_data: any;
  mistake_count: number;
  last_reviewed: string | null;
  mastered: boolean;
}

interface MistakeNoteProps {
  userId: string;
}

const MistakeNote = ({ userId }: MistakeNoteProps) => {
  const { t, i18n } = useTranslation();
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  const currentItem = mistakes[currentIndex];

  // Fetch user's mistakes
  useEffect(() => {
    const fetchMistakes = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_mistakes')
          .select('*')
          .eq('user_id', userId)
          .eq('mastered', false)
          .order('mistake_count', { ascending: false })
          .limit(20);

        if (error) throw error;

        if (data && data.length > 0) {
          // Shuffle mistakes for variety
          const shuffled = [...data].sort(() => Math.random() - 0.5).slice(0, 10);
          setMistakes(shuffled);
        }
      } catch (error) {
        console.error('Error fetching mistakes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMistakes();
  }, [userId]);

  // Timer
  useEffect(() => {
    if (!gameStarted || timeLeft <= 0 || gameComplete) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleGameComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameStarted, timeLeft, gameComplete]);

  const handleGameComplete = async () => {
    setGameComplete(true);
    
    if (correctCount >= mistakes.length * 0.8) {
      confetti({ particleCount: 100, spread: 70 });
    }

    // Update mastered status for items answered correctly
    // This would be done via API in production
  };

  const handleAnswer = async (correct: boolean) => {
    if (showAnswer) return;
    setShowAnswer(true);

    if (correct) {
      setScore(prev => prev + 10);
      setCorrectCount(prev => prev + 1);
    }

    setTimeout(() => {
      if (currentIndex < mistakes.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setShowAnswer(false);
      } else {
        handleGameComplete();
      }
    }, 1500);
  };

  const handleStart = () => {
    setGameStarted(true);
    setCurrentIndex(0);
    setScore(0);
    setCorrectCount(0);
    setTimeLeft(60);
    setShowAnswer(false);
    setGameComplete(false);
  };

  const renderQuestionContent = () => {
    if (!currentItem) return null;

    const data = currentItem.item_data;
    const type = currentItem.item_type;

    switch (type) {
      case 'vocabulary':
        return (
          <div className="text-center">
            <p className="text-3xl font-bold text-foreground mb-4">{data.word}</p>
            <p className="text-muted-foreground mb-6">{t("mistakeNote.questions.vocabulary", "이 단어의 뜻은?")}</p>
            
            <div className="grid grid-cols-1 gap-3">
              {/* Correct answer */}
              <Button
                variant={showAnswer ? "default" : "outline"}
                className={`p-4 h-auto text-left ${showAnswer ? 'bg-green-500 hover:bg-green-500 text-white' : ''}`}
                onClick={() => handleAnswer(true)}
                disabled={showAnswer}
              >
                {data.meaning}
                {showAnswer && <CheckCircle2 className="w-5 h-5 ml-auto" />}
              </Button>
              
              {/* Wrong answer (shuffled) */}
              {data.wrong_option && (
                <Button
                  variant="outline"
                  className={`p-4 h-auto text-left ${showAnswer ? 'bg-red-100 dark:bg-red-950/30 border-red-300' : ''}`}
                  onClick={() => handleAnswer(false)}
                  disabled={showAnswer}
                >
                  {data.wrong_option}
                  {showAnswer && <XCircle className="w-5 h-5 ml-auto text-red-500" />}
                </Button>
              )}
            </div>
          </div>
        );

      case 'cloze':
        return (
          <div className="text-center">
            <p className="text-xl text-foreground mb-4">{data.sentence?.replace(data.blank_word, '_____')}</p>
            <p className="text-muted-foreground mb-6">{t("mistakeNote.questions.cloze", "빈칸에 들어갈 단어는?")}</p>
            
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={showAnswer ? "default" : "outline"}
                className={`p-4 h-auto ${showAnswer ? 'bg-green-500 hover:bg-green-500 text-white' : ''}`}
                onClick={() => handleAnswer(true)}
                disabled={showAnswer}
              >
                {data.blank_word}
              </Button>
              <Button
                variant="outline"
                className={`p-4 h-auto ${showAnswer ? 'bg-red-100 dark:bg-red-950/30 border-red-300' : ''}`}
                onClick={() => handleAnswer(false)}
                disabled={showAnswer}
              >
                {data.wrong_answer}
              </Button>
            </div>
          </div>
        );

      case 'grammar_ox':
        return (
          <div className="text-center">
            <p className="text-xl text-foreground mb-6">{data.statement}</p>
            <p className="text-muted-foreground mb-6">{t("mistakeNote.questions.grammarOX", "이 문장은 맞을까요?")}</p>
            
            <div className="flex gap-4 justify-center">
              <Button
                size="lg"
                variant={showAnswer && data.is_correct ? "default" : "outline"}
                className={`w-24 h-24 rounded-full text-3xl font-bold ${
                  showAnswer && data.is_correct ? 'bg-green-500 hover:bg-green-500 text-white' : ''
                } ${showAnswer && !data.is_correct ? 'opacity-50' : ''}`}
                onClick={() => handleAnswer(data.is_correct)}
                disabled={showAnswer}
              >
                O
              </Button>
              <Button
                size="lg"
                variant={showAnswer && !data.is_correct ? "default" : "outline"}
                className={`w-24 h-24 rounded-full text-3xl font-bold ${
                  showAnswer && !data.is_correct ? 'bg-green-500 hover:bg-green-500 text-white' : ''
                } ${showAnswer && data.is_correct ? 'opacity-50' : ''}`}
                onClick={() => handleAnswer(!data.is_correct)}
                disabled={showAnswer}
              >
                X
              </Button>
            </div>
            
            {showAnswer && data.explanation && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 bg-muted rounded-xl text-left"
              >
                <p className="text-sm text-muted-foreground">{t("mistakeNote.explanationLabel", "설명:")}</p>
                <p className="text-foreground">{data.explanation}</p>
              </motion.div>
            )}
          </div>
        );

      case 'idiom':
        return (
          <div className="text-center">
            <p className="text-3xl font-bold text-foreground mb-4">{data.idiom}</p>
            <p className="text-muted-foreground mb-6">{t("mistakeNote.questions.idiom", "이 관용표현의 실제 의미는?")}</p>
            
            <div className="grid grid-cols-1 gap-3">
              <Button
                variant={showAnswer ? "default" : "outline"}
                className={`p-4 h-auto text-left ${showAnswer ? 'bg-green-500 hover:bg-green-500 text-white' : ''}`}
                onClick={() => handleAnswer(true)}
                disabled={showAnswer}
              >
                {data.actual_meaning}
              </Button>
              <Button
                variant="outline"
                className={`p-4 h-auto text-left ${showAnswer ? 'bg-red-100 dark:bg-red-950/30 border-red-300' : ''}`}
                onClick={() => handleAnswer(false)}
                disabled={showAnswer}
              >
                {data.literal_meaning}
              </Button>
            </div>
          </div>
        );

      default:
        return <p>{t("mistakeNote.unknownType", "알 수 없는 문제 유형입니다.")}</p>;
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">{t("mistakeNote.loading", "실수 노트 로딩 중...")}</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">{t("mistakeNote.loginRequired.title", "로그인이 필요합니다")}</h2>
        <p className="text-muted-foreground">{t("mistakeNote.loginRequired.description", "실수 노트를 사용하려면 로그인해주세요.")}</p>
      </div>
    );
  }

  if (mistakes.length === 0) {
    return (
      <div className="text-center py-12">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto mb-6"
        >
          <Sparkles className="w-12 h-12 text-white" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">{t("mistakeNote.perfect.title")} 🎉</h2>
        <p className="text-muted-foreground mb-6">
          {t("mistakeNote.perfect.description1")}<br />
          {t("mistakeNote.perfect.description2")}
        </p>
      </div>
    );
  }

  if (gameComplete) {
    const percentage = Math.round((correctCount / mistakes.length) * 100);
    
    return (
      <div className="text-center py-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mx-auto mb-6"
        >
          <Trophy className="w-10 h-10 text-white" />
        </motion.div>
        
        <h2 className="text-2xl font-bold mb-4">{t("mistakeNote.complete.title")} 🎉</h2>
        
        <div className="mb-6 space-y-2">
          <p className="text-3xl font-bold text-primary">{score}{t("common.pointsUnit")}</p>
          <p className="text-muted-foreground">
            {t("mistakeNote.complete.stats", { total: mistakes.length, correct: correctCount, percentage })}
          </p>
        </div>

        <div className="p-4 bg-muted rounded-xl mb-6">
          {percentage >= 80 ? (
            <p className="text-green-600 dark:text-green-400 font-medium">
              {t("mistakeNote.complete.excellent")} 💪
            </p>
          ) : percentage >= 50 ? (
            <p className="text-yellow-600 dark:text-yellow-400 font-medium">
              {t("mistakeNote.complete.good")} 📚
            </p>
          ) : (
            <p className="text-orange-600 dark:text-orange-400 font-medium">
              {t("mistakeNote.complete.keepGoing")} 🔄
            </p>
          )}
        </div>

        <Button onClick={handleStart} className="w-full">
          <RotateCcw className="w-4 h-4 mr-2" />
          {t("mistakeNote.complete.reviewAgain")}
        </Button>
      </div>
    );
  }

  if (!gameStarted) {
    return (
      <div className="text-center py-12">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 rounded-full bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center mx-auto mb-6"
        >
          <BookX className="w-12 h-12 text-white" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">{t("mistakeNote.title")}</h2>
        <p className="text-muted-foreground mb-2">{t("mistakeNote.intro.description")}</p>
        <p className="text-sm text-primary mb-6">
          {t("mistakeNote.intro.reviewCount", { count: mistakes.length })}
        </p>
        
        <Button 
          size="lg" 
          onClick={handleStart}
          className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600"
        >
          <Timer className="w-5 h-5 mr-2" />
          {t("mistakeNote.intro.start")}
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Timer & Progress */}
      <div className="flex justify-between items-center mb-6">
        <div className={`text-2xl font-bold ${timeLeft <= 10 ? "text-red-500 animate-pulse" : "text-foreground"}`}>
          ⏱️ {timeLeft}s
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-primary">{score}{t("common.pointsUnit")}</div>
          <div className="text-sm text-muted-foreground">
            {currentIndex + 1} / {mistakes.length}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-muted rounded-full mb-6 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-red-500 to-rose-500"
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + 1) / mistakes.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-card border-2 border-border rounded-2xl p-6"
      >
        {/* Item Type Badge */}
        <div className="flex justify-center mb-4">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            currentItem?.item_type === 'vocabulary' ? 'bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400' :
            currentItem?.item_type === 'cloze' ? 'bg-purple-100 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400' :
            currentItem?.item_type === 'grammar_ox' ? 'bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400' :
            'bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'
          }`}>
            {currentItem?.item_type === 'vocabulary' ? t("mistakeNote.types.vocabulary") :
             currentItem?.item_type === 'cloze' ? t("mistakeNote.types.cloze") :
             currentItem?.item_type === 'grammar_ox' ? t("mistakeNote.types.grammarOX") : t("mistakeNote.types.idiom")}
          </span>
          <span className="ml-2 px-2 py-1 bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-full text-xs">
            {t("mistakeNote.mistakeCount", { count: currentItem?.mistake_count })}
          </span>
        </div>

        {renderQuestionContent()}
      </motion.div>
    </div>
  );
};

export default MistakeNote;
