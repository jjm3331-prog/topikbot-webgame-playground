import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  FileText,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Trophy,
  Sparkles,
  ChevronRight,
  Loader2,
  RefreshCw
} from "lucide-react";

interface Question {
  id: number;
  passage: string;
  question: string;
  options: string[];
  answer: number;
  explanationKo: string;
  explanationVi: string;
}

type TabKey = "arrangement" | "inference" | "paired" | "long";
type TopikLevel = "1-2" | "3-4" | "5-6";

const ReadingB = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("arrangement");
  const [topikLevel, setTopikLevel] = useState<TopikLevel>("3-4");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const tabCategories = {
    arrangement: {
      label: t("readingB.tabs.arrangement"),
      sublabel: t("readingB.tabs.arrangementSub"),
      emoji: "🔢",
    },
    inference: {
      label: t("readingB.tabs.inference"),
      sublabel: t("readingB.tabs.inferenceSub"),
      emoji: "🧠",
    },
    paired: {
      label: t("readingB.tabs.paired"),
      sublabel: t("readingB.tabs.pairedSub"),
      emoji: "🔗",
    },
    long: {
      label: t("readingB.tabs.long"),
      sublabel: t("readingB.tabs.longSub"),
      emoji: "📖",
    },
  };

  const topikLevels = {
    "1-2": { label: "TOPIK I (1-2급)", sublabel: t("readingB.levels.beginner"), color: "from-green-500 to-emerald-500" },
    "3-4": { label: "TOPIK II (3-4급)", sublabel: t("readingB.levels.intermediate"), color: "from-blue-500 to-cyan-500" },
    "5-6": { label: "TOPIK II (5-6급)", sublabel: t("readingB.levels.advanced"), color: "from-purple-500 to-pink-500" },
  };

  const fallbackQuestions: Record<string, Question[]> = {
    arrangement: [
      {
        id: 1,
        passage: "(가) 그래서 우산을 가져갔습니다.\n(나) 아침에 일어났습니다.\n(다) 밖에 비가 오고 있었습니다.\n(라) 회사에 갈 준비를 했습니다.",
        question: t("readingB.arrangeInOrder"),
        options: ["(나)-(라)-(다)-(가)", "(나)-(다)-(가)-(라)", "(다)-(나)-(라)-(가)", "(라)-(나)-(다)-(가)"],
        answer: 0,
        explanationKo: "정답: ① (나)-(라)-(다)-(가)\n\n시간 순서와 인과관계를 따릅니다.",
        explanationVi: t("readingB.fallback.arrangement.explanation"),
      },
    ],
    inference: [
      {
        id: 1,
        passage: "한국에서는 설날에 떡국을 먹습니다. 떡국을 먹으면 한 살을 더 먹는다고 합니다. 그래서 아이들은 설날이 되면 ( ).",
        question: t("readingB.chooseCorrect"),
        options: ["떡국을 먹고 싶어합니다", "떡국을 싫어합니다", "학교에 갑니다", "친구를 만납니다"],
        answer: 0,
        explanationKo: "정답: ① 떡국을 먹고 싶어합니다\n\n아이들은 나이를 먹기 위해 떡국을 먹고 싶어합니다.",
        explanationVi: t("readingB.fallback.inference.explanation"),
      },
    ],
    paired: [
      {
        id: 1,
        passage: "📚 서울시립도서관\n• 운영시간: 평일 09:00-21:00\n• 휴관일: 매주 월요일",
        question: t("readingB.aboutLibrary"),
        options: ["월요일에는 이용할 수 없습니다", "주말에만 운영합니다", "24시간 운영합니다", "화요일에 쉽니다"],
        answer: 0,
        explanationKo: "정답: ① 월요일에는 이용할 수 없습니다\n\n휴관일이 매주 월요일입니다.",
        explanationVi: t("readingB.fallback.paired.explanation"),
      },
    ],
    long: [
      {
        id: 1,
        passage: "최근 한국에서는 1인 가구가 빠르게 증가하고 있습니다. 특히 젊은 층에서 혼자 사는 것을 선호하는 경향이 나타나고 있습니다.",
        question: t("readingB.matchContent"),
        options: ["1인 가구가 늘어나고 있습니다", "가족과 함께 사는 것이 유행입니다", "노년층이 혼자 살기를 원합니다", "1인 가구가 줄어들고 있습니다"],
        answer: 0,
        explanationKo: "정답: ① 1인 가구가 늘어나고 있습니다\n\n글에서 1인 가구가 빠르게 증가한다고 했습니다.",
        explanationVi: t("readingB.fallback.long.explanation"),
      },
    ],
  };

  const fetchQuestions = useCallback(async (tabType: string, level: TopikLevel) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('reading-content', {
        body: { type: 'readingB', tabType, topikLevel: level, count: 5 }
      });
      if (error) throw error;
      if (data?.questions && data.questions.length > 0) {
        setQuestions(data.questions);
      } else {
        setQuestions(fallbackQuestions[tabType] || fallbackQuestions.arrangement);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      setQuestions(fallbackQuestions[tabType] || fallbackQuestions.arrangement);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    fetchQuestions(activeTab, topikLevel);
  }, [activeTab, topikLevel, fetchQuestions]);

  const currentCategory = tabCategories[activeTab];
  const currentQuestion = questions[currentQuestionIndex];

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setIsQuizComplete(false);
  };

  const handleLevelChange = (level: TopikLevel) => {
    setTopikLevel(level);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setIsQuizComplete(false);
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (showResult) return;
    setSelectedAnswer(answerIndex);
  };

  const handleSubmit = () => {
    if (selectedAnswer === null) {
      toast({ title: t("readingB.selectAnswer"), variant: "destructive" });
      return;
    }
    setShowResult(true);
    if (currentQuestion && selectedAnswer === currentQuestion.answer) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setIsQuizComplete(true);
    }
  };

  const handleRestart = () => {
    fetchQuestions(activeTab, topikLevel);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setIsQuizComplete(false);
  };

  const optionLabels = ["①", "②", "③", "④"];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CleanHeader />
      
      <main className="flex-1 pb-24">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-6"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="mb-6 hover:bg-primary/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("common.back")}
            </Button>

            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-600 via-amber-600 to-yellow-600 p-8 mb-8">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjIiLz48L2c+PC9zdmc+')] opacity-30" />
              
              <div className="relative z-10 flex items-center gap-6">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-2xl border border-white/30"
                >
                  <FileText className="w-10 h-10 text-white" />
                </motion.div>
                <div>
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-medium mb-2"
                  >
                    <Sparkles className="w-3 h-3" />
                    {t("readingB.topikStyle")}
                  </motion.div>
                  <motion.h1 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-3xl sm:text-4xl font-bold text-white mb-1"
                  >
                    {t("readingB.title")}
                  </motion.h1>
                  <motion.p 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-white/80"
                  >
                    {t("readingB.subtitle")}
                  </motion.p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
              {(Object.keys(topikLevels) as TopikLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => handleLevelChange(level)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all font-medium ${
                    topikLevel === level
                      ? `bg-gradient-to-r ${topikLevels[level].color} text-white shadow-lg`
                      : "bg-muted hover:bg-muted/80 text-muted-foreground"
                  }`}
                >
                  <span className="text-sm font-bold">{level}급</span>
                  <span className="text-xs opacity-80">{topikLevels[level].sublabel}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
              {(Object.keys(tabCategories) as TabKey[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all font-medium ${
                    activeTab === tab
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground"
                  }`}
                >
                  <span>{tabCategories[tab].emoji}</span>
                  <span>{tabCategories[tab].label}</span>
                </button>
              ))}
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-3xl bg-gradient-to-b from-card to-card/50 border border-border/50 shadow-2xl p-12 text-center"
              >
                <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-6" />
                <h3 className="text-xl font-bold text-foreground mb-2">{t("readingB.loading")}</h3>
                <p className="text-muted-foreground">{t("readingB.aiGenerating")}</p>
              </motion.div>
            ) : !currentQuestion ? (
              <motion.div
                key="no-questions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-3xl bg-card border border-border p-12 text-center"
              >
                <p className="text-muted-foreground mb-4">{t("readingB.noQuestions")}</p>
                <Button onClick={() => fetchQuestions(activeTab, topikLevel)}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t("readingB.reload")}
                </Button>
              </motion.div>
            ) : isQuizComplete ? (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="rounded-3xl bg-gradient-to-b from-card to-card/50 border border-border/50 shadow-2xl p-8 sm:p-12 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="w-28 h-28 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center mx-auto mb-6 shadow-xl"
                >
                  <Trophy className="w-14 h-14 text-white" />
                </motion.div>

                <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                  {currentCategory.label} {t("readingB.completed")}
                </h2>
                <p className="text-muted-foreground mb-8 text-lg">
                  {t("readingB.totalQuestions", { total: questions.length })} <span className="text-primary font-bold">{t("readingB.correctCount", { count: score })}</span>
                </p>

                <div className="w-full max-w-sm mx-auto mb-8">
                  <div className="flex justify-between text-sm text-muted-foreground mb-3">
                    <span>{t("readingB.accuracy")}</span>
                    <span className="font-bold text-foreground text-lg">
                      {Math.round((score / questions.length) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                    <motion.div
                      className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(score / questions.length) * 100}%` }}
                      transition={{ duration: 1, delay: 0.3 }}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={handleRestart}
                    variant="outline"
                    size="lg"
                    className="gap-2"
                  >
                    <RotateCcw className="w-5 h-5" />
                    {t("readingB.retry")}
                  </Button>
                  <Button
                    onClick={() => navigate("/dashboard")}
                    size="lg"
                    className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-90 text-white"
                  >
                    {t("common.back")}
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={`quiz-${activeTab}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="mb-6 p-4 rounded-2xl bg-card border border-border">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-foreground">
                      {currentCategory.emoji} {currentCategory.label} - {t("readingB.questionNum", { current: currentQuestionIndex + 1, total: questions.length })}
                    </span>
                    <span className="text-sm font-bold text-primary">
                      {t("readingB.score")}: {score}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <motion.div
                      className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-3xl bg-gradient-to-b from-card to-card/50 border border-border/50 shadow-2xl overflow-hidden">
                  <div className="p-6 sm:p-8">
                    <div className="mb-6 p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20">
                      <p className="text-base sm:text-lg text-foreground whitespace-pre-wrap leading-relaxed">
                        {currentQuestion.passage}
                      </p>
                    </div>

                    <div className="mb-6">
                      <h3 className="text-lg sm:text-xl font-bold text-foreground mb-4">
                        Q. {currentQuestion.question}
                      </h3>

                      <div className="space-y-3">
                        {currentQuestion.options.map((option, index) => {
                          const isSelected = selectedAnswer === index;
                          const isCorrect = currentQuestion.answer === index;
                          const showCorrectness = showResult;

                          return (
                            <button
                              key={index}
                              onClick={() => handleAnswerSelect(index)}
                              disabled={showResult}
                              className={`w-full p-4 rounded-xl text-left transition-all flex items-center gap-3 ${
                                showCorrectness
                                  ? isCorrect
                                    ? "bg-green-500/20 border-2 border-green-500 text-foreground"
                                    : isSelected
                                    ? "bg-red-500/20 border-2 border-red-500 text-foreground"
                                    : "bg-muted border-2 border-transparent text-muted-foreground"
                                  : isSelected
                                  ? "bg-primary/20 border-2 border-primary text-foreground"
                                  : "bg-muted border-2 border-transparent text-foreground hover:bg-muted/80"
                              }`}
                            >
                              <span className={`text-lg font-bold ${
                                showCorrectness && isCorrect ? "text-green-500" : 
                                showCorrectness && isSelected ? "text-red-500" : 
                                isSelected ? "text-primary" : "text-muted-foreground"
                              }`}>
                                {optionLabels[index]}
                              </span>
                              <span className="flex-1">{option}</span>
                              {showCorrectness && isCorrect && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                              {showCorrectness && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-500" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {showResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 sm:p-6 rounded-2xl ${
                          selectedAnswer === currentQuestion.answer
                            ? "bg-green-500/10 border border-green-500/30"
                            : "bg-red-500/10 border border-red-500/30"
                        }`}
                      >
                        <h4 className={`font-bold mb-3 flex items-center gap-2 ${
                          selectedAnswer === currentQuestion.answer ? "text-green-500" : "text-red-500"
                        }`}>
                          {selectedAnswer === currentQuestion.answer ? (
                            <>
                              <CheckCircle2 className="w-5 h-5" />
                              {t("readingB.correct")}
                            </>
                          ) : (
                            <>
                              <XCircle className="w-5 h-5" />
                              {t("readingB.wrong")}
                            </>
                          )}
                        </h4>
                        <p className="text-foreground whitespace-pre-wrap">{currentQuestion.explanationKo}</p>
                      </motion.div>
                    )}

                    <div className="mt-6 flex justify-center">
                      {!showResult ? (
                        <Button
                          onClick={handleSubmit}
                          size="lg"
                          className="px-8 bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-90 text-white"
                          disabled={selectedAnswer === null}
                        >
                          {t("readingB.submit")}
                        </Button>
                      ) : (
                        <Button
                          onClick={handleNext}
                          size="lg"
                          className="px-8 bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-90 text-white gap-2"
                        >
                          {currentQuestionIndex < questions.length - 1 ? t("readingB.next") : t("readingB.seeResult")}
                          <ChevronRight className="w-5 h-5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <AppFooter />
    </div>
  );
};

export default ReadingB;
