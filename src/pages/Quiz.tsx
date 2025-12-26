import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  Sparkles,
  RotateCcw,
  CheckCircle,
  XCircle,
  Lightbulb,
  Flame
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";

interface QuizOption {
  ko: string;
  vi: string;
}

interface QuizQuestion {
  expression: string;
  type: "idiom" | "proverb" | "slang" | "internet";
  difficulty: "easy" | "medium" | "hard";
  hint_ko?: string;
  hint_vi?: string;
  correct_answer_ko: string;
  correct_answer_vi: string;
  correct_index: number;
  options: QuizOption[];
  explanation_ko: string;
  explanation_vi: string;
  example_sentence: string;
  example_translation: string;
}

const Quiz = () => {
  const { t } = useTranslation();
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [usedExpressions, setUsedExpressions] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [hintUsed, setHintUsed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [savedScore, setSavedScore] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  const saveScoreToProfile = async () => {
    if (score <= savedScore) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: profile } = await supabase.from('profiles').select('points, money').eq('id', session.user.id).single();
    if (profile) {
      const pointsEarned = score - savedScore;
      const moneyEarned = Math.floor(pointsEarned * 10);
      await supabase.from('profiles').update({ points: profile.points + pointsEarned, money: profile.money + moneyEarned }).eq('id', session.user.id);
      setSavedScore(score);
    }
  };

  useEffect(() => {
    return () => { saveScoreToProfile(); };
  }, [score, savedScore]);

  const fetchQuestion = async () => {
    setIsLoading(true);
    setSelectedAnswer(null);
    setShowResult(false);
    setHintUsed(false);
    setShowHint(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;
      const sessionId = userId ? null : `anon_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      
      const { data, error } = await supabase.functions.invoke("idiom-quiz", { 
        body: { difficulty, userId, sessionId } 
      });
      if (error) throw error;
      if (data.error) { toast({ title: t("quiz.error"), description: data.error, variant: "destructive" }); return; }
      setQuestion(data);
      setUsedExpressions(prev => [...prev, data.expression]);
    } catch (error) {
      toast({ title: t("quiz.errorOccurred"), description: t("quiz.tryAgain"), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchQuestion(); }, [difficulty]);

  const handleAnswer = (index: number) => {
    if (showResult || !question) return;
    setSelectedAnswer(index.toString());
    setShowResult(true);
    setTotalQuestions(prev => prev + 1);

    const isCorrect = index === question.correct_index;
    if (isCorrect) {
      let points = difficulty === "easy" ? 10 : difficulty === "medium" ? 20 : 30;
      if (hintUsed) points = Math.floor(points / 2);
      const totalPoints = points + streak * 5;
      setScore(prev => prev + totalPoints);
      setStreak(prev => prev + 1);
      toast({ title: t("quiz.correctAnswer"), description: hintUsed ? `+${totalPoints}${t("quiz.pointsUnit")} (${t("quiz.hint")})` : `+${totalPoints}${t("quiz.pointsUnit")}` });
    } else {
      setStreak(0);
      toast({ title: t("quiz.wrongAnswer"), description: t("quiz.tryNext"), variant: "destructive" });
    }
  };

  const handleUseHint = () => {
    if (hintUsed || showResult) return;
    setHintUsed(true);
    setShowHint(true);
    toast({ title: t("quiz.hintUsed"), description: t("quiz.halfPoints") });
  };

  const getTypeLabel = (type: string) => {
    const labels: { [key: string]: { ko: string; vi: string; color: string } } = {
      idiom: { ko: t("quiz.types.idiom"), vi: t("quiz.types.idiom"), color: "bg-purple-500" },
      proverb: { ko: t("quiz.types.proverb"), vi: t("quiz.types.proverb"), color: "bg-blue-500" },
      slang: { ko: t("quiz.types.slang"), vi: t("quiz.types.slang"), color: "bg-pink-500" },
      internet: { ko: t("quiz.types.internet"), vi: t("quiz.types.internet"), color: "bg-green-500" },
    };
    return labels[type] || labels.idiom;
  };

  const resetGame = async () => {
    await saveScoreToProfile();
    setScore(0); setSavedScore(0); setStreak(0); setTotalQuestions(0); setUsedExpressions([]);
    fetchQuestion();
  };

  const handleBackToGame = async () => { await saveScoreToProfile(); navigate("/dashboard"); };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-amber-900 via-orange-900 to-[#0f0f23] flex flex-col overflow-hidden">
      <CleanHeader />
      
      {/* Stats Bar */}
      <div className="px-3 py-2 flex items-center justify-between border-b border-white/10 shrink-0">
        <span className="text-white font-medium">{t("quiz.idiomQuiz")}</span>
        <div className="flex items-center gap-2">
          {streak > 0 && (
            <div className="flex items-center gap-0.5 text-orange-400">
              <Flame className="w-4 h-4" />
              <span className="font-bold text-sm">{streak}</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-yellow-400">
            <Sparkles className="w-4 h-4" />
            <span className="font-bold text-sm">{score}{t("quiz.pointsUnit")}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={resetGame} className="text-white/70 hover:text-white h-8 w-8 p-0">
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Difficulty Selector */}
      <div className="px-3 py-2 shrink-0">
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl">
          {(["easy", "medium", "hard"] as const).map((diff) => (
            <Button
              key={diff}
              variant={difficulty === diff ? "default" : "ghost"}
              size="sm"
              onClick={() => { setDifficulty(diff); setUsedExpressions([]); }}
              className={`flex-1 h-9 text-[10px] ${difficulty === diff 
                ? `${diff === "easy" ? "bg-green-600" : diff === "medium" ? "bg-yellow-600" : "bg-red-600"}` 
                : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              <div className="flex flex-col leading-tight">
                <span>{diff === "easy" ? t("quiz.difficulty.easy") : diff === "medium" ? t("quiz.difficulty.medium") : t("quiz.difficulty.hard")}</span>
                <span className="opacity-70">{diff === "easy" ? t("quiz.difficulty.easyShort") : diff === "medium" ? t("quiz.difficulty.mediumShort") : t("quiz.difficulty.hardShort")}</span>
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-3 py-2 flex flex-col overflow-y-auto">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-3">
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
              </div>
              <p className="text-white/60 text-sm">{t("quiz.generating")}</p>
            </div>
          </div>
        ) : question ? (
          <AnimatePresence mode="wait">
            <motion.div key={question.expression} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex-1 flex flex-col">
              {/* Question Card */}
              <div className="glass-card p-4 rounded-xl mb-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex flex-col">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] text-white ${getTypeLabel(question.type).color}`}>
                      {getTypeLabel(question.type).ko} / {getTypeLabel(question.type).vi}
                    </span>
                  </div>
                  <span className={`text-sm ${question.difficulty === "easy" ? "text-green-400" : question.difficulty === "medium" ? "text-yellow-400" : "text-red-400"}`}>
                    {question.difficulty === "easy" ? "★" : question.difficulty === "medium" ? "★★" : "★★★"}
                  </span>
                </div>
                
                <h2 className="text-2xl font-bold text-white text-center mb-2">{question.expression}</h2>
                <p className="text-white/50 text-xs text-center">{t("quiz.whatMeaning")}</p>

                {!showResult && (
                  <div className="mt-3">
                    {!showHint ? (
                      <Button variant="outline" size="sm" onClick={handleUseHint} disabled={hintUsed} className="w-full border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/20 text-xs h-8">
                        <Lightbulb className="w-3 h-3 mr-1" />
                        {t("quiz.useHint")}
                      </Button>
                    ) : (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-yellow-500/20 border border-yellow-500/30 p-2 rounded-lg">
                        <p className="text-white/90 text-xs">{question.hint_ko || t("quiz.noHint")}</p>
                        <p className="text-white/60 text-[10px] italic">{question.hint_vi || t("quiz.noHint")}</p>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="space-y-2 mb-3">
                {question.options.map((option, index) => {
                  const isSelected = selectedAnswer === index.toString();
                  const isCorrect = index === question.correct_index;
                  const showCorrect = showResult && isCorrect;
                  const showWrong = showResult && isSelected && !isCorrect;

                  return (
                    <motion.button key={index} whileHover={!showResult ? { scale: 1.01 } : {}} whileTap={!showResult ? { scale: 0.99 } : {}} onClick={() => handleAnswer(index)} disabled={showResult}
                      className={`w-full p-3 rounded-xl text-left transition-all ${
                        showCorrect ? "bg-green-500/30 border-2 border-green-500"
                          : showWrong ? "bg-red-500/30 border-2 border-red-500"
                          : isSelected ? "bg-amber-500/30 border-2 border-amber-500"
                          : "bg-white/10 border-2 border-white/20 hover:bg-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-white font-medium text-sm">{option.ko}</p>
                          <p className="text-white/60 text-xs italic">{option.vi}</p>
                        </div>
                        {showCorrect && <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />}
                        {showWrong && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Explanation */}
              <AnimatePresence>
                {showResult && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="glass-card p-3 rounded-xl mb-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Lightbulb className="w-4 h-4 text-yellow-400" />
                      <span className="text-white font-bold text-sm">{t("quiz.explanation")}</span>
                    </div>
                    <p className="text-white/90 text-sm mb-1">{question.explanation_ko}</p>
                    <p className="text-white/60 text-xs italic mb-3">{question.explanation_vi}</p>
                    <div className="bg-white/5 p-2 rounded-lg">
                      <p className="text-white/50 text-[10px] mb-0.5">{t("quiz.example")}</p>
                      <p className="text-amber-300 text-sm">{question.example_sentence}</p>
                      <p className="text-white/60 text-xs italic">{question.example_translation}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {showResult && (
                <Button onClick={fetchQuestion} className="w-full bg-amber-600 hover:bg-amber-700 h-11 text-sm">
                  {t("quiz.nextQuestion")}
                </Button>
              )}
            </motion.div>
          </AnimatePresence>
        ) : null}
      </div>

      {/* Stats Footer */}
      <div className="p-3 border-t border-white/10 bg-gray-900/80 shrink-0">
        <div className="flex items-center justify-between text-white/60 text-xs">
          <span>{t("quiz.questions")}: {totalQuestions}</span>
          <span>{t("quiz.accuracy")}: {totalQuestions > 0 ? Math.round((score / (totalQuestions * 20)) * 100) : 0}%</span>
          <span>{t("quiz.streak")}: {streak}</span>
        </div>
      </div>
      <AppFooter />
    </div>
  );
};

export default Quiz;
