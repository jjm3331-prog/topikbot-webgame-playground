import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  MessageSquare,
  Sparkles,
  RotateCcw,
  CheckCircle,
  XCircle,
  Lightbulb,
  Trophy,
  Flame,
  Volume2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface QuizQuestion {
  expression: string;
  type: "idiom" | "proverb" | "slang" | "internet";
  difficulty: "easy" | "medium" | "hard";
  correct_answer: string;
  options: string[];
  explanation_ko: string;
  explanation_vi: string;
  example_sentence: string;
  example_translation: string;
}

const Quiz = () => {
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [usedExpressions, setUsedExpressions] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchQuestion = async () => {
    setIsLoading(true);
    setSelectedAnswer(null);
    setShowResult(false);

    try {
      const { data, error } = await supabase.functions.invoke("idiom-quiz", {
        body: { difficulty, usedExpressions },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "오류",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      setQuestion(data);
      setUsedExpressions(prev => [...prev, data.expression]);
    } catch (error) {
      console.error("Quiz error:", error);
      toast({
        title: "오류가 발생했습니다",
        description: "다시 시도해주세요",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestion();
  }, []);

  const handleAnswer = (answer: string) => {
    if (showResult) return;
    
    setSelectedAnswer(answer);
    setShowResult(true);
    setTotalQuestions(prev => prev + 1);

    const isCorrect = answer === question?.correct_answer;
    
    if (isCorrect) {
      const points = difficulty === "easy" ? 10 : difficulty === "medium" ? 20 : 30;
      setScore(prev => prev + points + streak * 5);
      setStreak(prev => prev + 1);
      toast({
        title: "정답! 🎉",
        description: `+${points + streak * 5}점`,
      });
    } else {
      setStreak(0);
      toast({
        title: "오답! 😢",
        description: "다음 문제에서 다시 도전하세요!",
        variant: "destructive",
      });
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: { [key: string]: { ko: string; vi: string; color: string } } = {
      idiom: { ko: "관용어", vi: "Thành ngữ", color: "bg-purple-500" },
      proverb: { ko: "속담", vi: "Tục ngữ", color: "bg-blue-500" },
      slang: { ko: "유행어", vi: "Tiếng lóng", color: "bg-pink-500" },
      internet: { ko: "인터넷 용어", vi: "Từ internet", color: "bg-green-500" },
    };
    return labels[type] || labels.idiom;
  };

  const getDifficultyColor = (diff: string) => {
    if (diff === "easy") return "text-green-400";
    if (diff === "medium") return "text-yellow-400";
    return "text-red-400";
  };

  const resetGame = () => {
    setScore(0);
    setStreak(0);
    setTotalQuestions(0);
    setUsedExpressions([]);
    fetchQuestion();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-900 via-orange-900 to-gray-900 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/game")} className="text-white/70 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <MessageSquare className="w-5 h-5 text-amber-400" />
          <span className="text-white font-medium">관용어 퀴즈</span>
        </div>
        <div className="flex items-center gap-4">
          {streak > 0 && (
            <div className="flex items-center gap-1 text-orange-400">
              <Flame className="w-4 h-4" />
              <span className="font-bold">{streak}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-yellow-400">
            <Sparkles className="w-4 h-4" />
            <span className="font-bold">{score}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetGame}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Difficulty Selector */}
      <div className="p-4">
        <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
          {(["easy", "medium", "hard"] as const).map((diff) => (
            <Button
              key={diff}
              variant={difficulty === diff ? "default" : "ghost"}
              size="sm"
              onClick={() => setDifficulty(diff)}
              className={difficulty === diff 
                ? `flex-1 ${diff === "easy" ? "bg-green-600" : diff === "medium" ? "bg-yellow-600" : "bg-red-600"}` 
                : "flex-1 text-white/60 hover:text-white hover:bg-white/10"
              }
            >
              {diff === "easy" ? "쉬움" : diff === "medium" ? "보통" : "어려움"}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-3 h-3 bg-amber-400 rounded-full animate-bounce" />
                <div className="w-3 h-3 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                <div className="w-3 h-3 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
              </div>
              <p className="text-white/60">문제 생성중...</p>
            </div>
          </div>
        ) : question ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={question.expression}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col"
            >
              {/* Question Card */}
              <div className="glass-card p-6 rounded-2xl mb-4">
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs text-white ${getTypeLabel(question.type).color}`}>
                    {getTypeLabel(question.type).ko}
                  </span>
                  <span className={`text-sm ${getDifficultyColor(question.difficulty)}`}>
                    {question.difficulty === "easy" ? "★" : question.difficulty === "medium" ? "★★" : "★★★"}
                  </span>
                </div>
                
                <h2 className="text-3xl font-bold text-white text-center mb-2">
                  {question.expression}
                </h2>
                <p className="text-white/40 text-center text-sm">
                  이 표현의 의미는 무엇일까요?
                </p>
              </div>

              {/* Options */}
              <div className="space-y-3 mb-4">
                {question.options.map((option, index) => {
                  const isSelected = selectedAnswer === option;
                  const isCorrect = option === question.correct_answer;
                  const showCorrect = showResult && isCorrect;
                  const showWrong = showResult && isSelected && !isCorrect;

                  return (
                    <motion.button
                      key={index}
                      whileHover={!showResult ? { scale: 1.02 } : {}}
                      whileTap={!showResult ? { scale: 0.98 } : {}}
                      onClick={() => handleAnswer(option)}
                      disabled={showResult}
                      className={`w-full p-4 rounded-xl text-left transition-all ${
                        showCorrect
                          ? "bg-green-500/30 border-2 border-green-500"
                          : showWrong
                          ? "bg-red-500/30 border-2 border-red-500"
                          : isSelected
                          ? "bg-amber-500/30 border-2 border-amber-500"
                          : "bg-white/10 border-2 border-white/20 hover:bg-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white">{option}</span>
                        {showCorrect && <CheckCircle className="w-5 h-5 text-green-400" />}
                        {showWrong && <XCircle className="w-5 h-5 text-red-400" />}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Explanation (after answer) */}
              <AnimatePresence>
                {showResult && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="glass-card p-4 rounded-xl mb-4"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="w-5 h-5 text-yellow-400" />
                      <span className="text-white font-bold">설명</span>
                    </div>
                    
                    <p className="text-white/90 mb-3">{question.explanation_ko}</p>
                    <p className="text-white/60 text-sm mb-4 italic">{question.explanation_vi}</p>
                    
                    <div className="bg-white/5 p-3 rounded-lg">
                      <p className="text-amber-300 mb-1">예문: {question.example_sentence}</p>
                      <p className="text-white/60 text-sm">{question.example_translation}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Next Button */}
              {showResult && (
                <Button
                  onClick={fetchQuestion}
                  className="w-full bg-amber-600 hover:bg-amber-700 h-14 text-lg"
                >
                  다음 문제
                </Button>
              )}
            </motion.div>
          </AnimatePresence>
        ) : null}
      </div>

      {/* Stats Footer */}
      <div className="p-4 border-t border-white/10 bg-gray-900/50">
        <div className="flex items-center justify-between text-white/60 text-sm">
          <span>문제: {totalQuestions}개</span>
          <span>정답률: {totalQuestions > 0 ? Math.round((score / (totalQuestions * 20)) * 100) : 0}%</span>
          <span>연속: {streak}개</span>
        </div>
      </div>
    </div>
  );
};

export default Quiz;
