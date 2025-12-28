import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { 
  CheckCircle2,
  XCircle,
  RotateCcw,
  Loader2,
  Lightbulb,
  ChevronRight
} from "lucide-react";

interface ClozeQuestion {
  id: string;
  sentence: string;
  blank_word: string;
  wrong_answer: string;
  hint?: string;
  level: number;
}

interface MiniClozeProps {
  level: number;
  onMistake?: (question: ClozeQuestion) => void;
}

const MiniCloze = ({ level, onMistake }: MiniClozeProps) => {
  const [questions, setQuestions] = useState<ClozeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [options, setOptions] = useState<string[]>([]);

  const currentQuestion = questions[currentIndex];

  // Fetch cloze questions from DB
  const fetchQuestions = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('cloze_questions')
        .select('*')
        .eq('level', level)
        .order('created_at')
        .limit(20);

      if (error) throw error;

      if (data && data.length > 0) {
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        setQuestions(shuffled.slice(0, 10));
      } else {
        setQuestions([]);
      }
    } catch (error) {
      console.error('Error fetching cloze questions:', error);
      setQuestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [level]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Generate shuffled options when question changes
  useEffect(() => {
    if (!currentQuestion) return;
    
    const opts = [currentQuestion.blank_word, currentQuestion.wrong_answer];
    setOptions(opts.sort(() => Math.random() - 0.5));
  }, [currentQuestion]);

  const handleSelect = (answer: string) => {
    if (showResult) return;
    
    setSelectedAnswer(answer);
    setShowResult(true);
    
    const isCorrect = answer === currentQuestion.blank_word;
    
    if (isCorrect) {
      const bonus = Math.min(streak, 5) * 2;
      setScore(prev => prev + 10 + bonus);
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
      setShowHint(false);
    } else {
      setSessionComplete(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setSessionComplete(false);
    setSelectedAnswer(null);
    setShowResult(false);
    setShowHint(false);
    fetchQuestions();
  };

  // Render sentence with blank
  const renderSentence = () => {
    if (!currentQuestion) return null;
    const parts = currentQuestion.sentence.split('_____');
    return (
      <p className="text-xl md:text-2xl font-medium leading-relaxed">
        {parts[0]}
        <span className="inline-block min-w-[80px] border-b-4 border-primary mx-2 text-center">
          {showResult ? (
            <span className={selectedAnswer === currentQuestion.blank_word ? 'text-green-500' : 'text-red-500'}>
              {currentQuestion.blank_word}
            </span>
          ) : (
            <span className="text-muted-foreground">?</span>
          )}
        </span>
        {parts[1] || ''}
      </p>
    );
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">문제 로딩 중...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">
          이 레벨의 빈칸 문제가 없습니다.
        </p>
        <Button onClick={fetchQuestions}>다시 시도</Button>
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-2xl font-bold mb-2">완료! 🎯</h2>
        <p className="text-3xl font-bold text-primary mb-2">{score}점</p>
        <p className="text-muted-foreground mb-6">
          {questions.length}문제 중 정답률: {Math.round((score / (questions.length * 10)) * 100)}%
        </p>
        <Button onClick={handleRestart} size="lg">
          <RotateCcw className="w-4 h-4 mr-2" />
          다시 시작
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress & Score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            {currentIndex + 1} / {questions.length}
          </span>
          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          {streak >= 3 && (
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-orange-500 font-bold"
            >
              🔥 {streak} 연속!
            </motion.span>
          )}
          <span className="text-lg font-bold text-primary">{score}점</span>
        </div>
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-2 border-blue-500/20 rounded-3xl p-6 md:p-8"
        >
          {/* Sentence with blank */}
          <div className="text-center mb-8">
            {renderSentence()}
          </div>

          {/* Hint Button */}
          {currentQuestion.hint && !showResult && (
            <div className="text-center mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHint(!showHint)}
                className="text-muted-foreground"
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                힌트 보기
              </Button>
              <AnimatePresence>
                {showHint && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-sm text-muted-foreground mt-2"
                  >
                    💡 {currentQuestion.hint}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Options */}
          <div className="grid grid-cols-2 gap-4">
            {options.map((option, idx) => {
              const isCorrect = option === currentQuestion.blank_word;
              const isSelected = selectedAnswer === option;
              
              return (
                <motion.button
                  key={idx}
                  whileHover={{ scale: showResult ? 1 : 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleSelect(option)}
                  disabled={showResult}
                  className={`p-4 md:p-6 rounded-2xl text-lg font-medium transition-all flex items-center justify-center gap-2 ${
                    showResult
                      ? isCorrect
                        ? "bg-green-100 dark:bg-green-900/30 border-2 border-green-500 text-green-700 dark:text-green-400"
                        : isSelected
                          ? "bg-red-100 dark:bg-red-900/30 border-2 border-red-500 text-red-700 dark:text-red-400"
                          : "bg-muted border-2 border-border text-muted-foreground"
                      : "bg-card border-2 border-border hover:border-blue-500/50 hover:bg-blue-500/5"
                  }`}
                >
                  {showResult && isCorrect && <CheckCircle2 className="w-5 h-5" />}
                  {showResult && isSelected && !isCorrect && <XCircle className="w-5 h-5" />}
                  {option}
                </motion.button>
              );
            })}
          </div>

          {/* Result Feedback */}
          {showResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 text-center"
            >
              {selectedAnswer === currentQuestion.blank_word ? (
                <p className="text-green-500 font-bold text-lg">정답입니다! ✨</p>
              ) : (
                <p className="text-red-500 font-bold text-lg">
                  오답! 정답은 "{currentQuestion.blank_word}" 입니다.
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
            다음 문제 <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default MiniCloze;
