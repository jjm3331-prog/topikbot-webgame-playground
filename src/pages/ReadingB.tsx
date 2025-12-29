import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAutoTranslate } from "@/hooks/useAutoTranslate";
import { languages } from "@/i18n/config";
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
  RefreshCw,
  Database
} from "lucide-react";

interface Question {
  id: string;
  passage: string;
  question: string;
  options: string[];
  answer: number;
  explanationKo: string;
  explanationVi: string;
}

// Tab categories mapping to part_numbers
// Reading B: 고급 읽기 (Part 6+)
// arrangement: part 6-7 (순서 배열)
// inference: part 8-9 (추론)
// paired: part 10-11 (복합 문항)
// long: part 12+ (장문 독해)
type TabKey = "arrangement" | "inference" | "paired" | "long";
type TopikLevel = "1-2" | "3-4" | "5-6";

// Map TopikLevel to exam_type
const levelToExamType: Record<TopikLevel, string> = {
  "1-2": "TOPIK_I",
  "3-4": "TOPIK_II",
  "5-6": "TOPIK_II",
};

const ReadingB = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
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
  const [dbQuestionCount, setDbQuestionCount] = useState(0);
  
  // 세션 내 푼 문제 ID 추적 (중복 방지)
  const sessionSeenQuestions = useRef<Set<string>>(new Set());

  const tabCategories = {
    arrangement: {
      label: t("readingB.tabs.arrangement"),
      sublabel: t("readingB.tabs.arrangementSub"),
      emoji: "🔢",
      partNumbers: [6, 7],
    },
    inference: {
      label: t("readingB.tabs.inference"),
      sublabel: t("readingB.tabs.inferenceSub"),
      emoji: "🧠",
      partNumbers: [8, 9],
    },
    paired: {
      label: t("readingB.tabs.paired"),
      sublabel: t("readingB.tabs.pairedSub"),
      emoji: "🔗",
      partNumbers: [10, 11],
    },
    long: {
      label: t("readingB.tabs.long"),
      sublabel: t("readingB.tabs.longSub"),
      emoji: "📖",
      partNumbers: [12, 13, 14, 15],
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
        id: "fallback-1",
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
        id: "fallback-2",
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
        id: "fallback-3",
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
        id: "fallback-4",
        passage: "최근 한국에서는 1인 가구가 빠르게 증가하고 있습니다. 특히 젊은 층에서 혼자 사는 것을 선호하는 경향이 나타나고 있습니다.",
        question: t("readingB.matchContent"),
        options: ["1인 가구가 늘어나고 있습니다", "가족과 함께 사는 것이 유행입니다", "노년층이 혼자 살기를 원합니다", "1인 가구가 줄어들고 있습니다"],
        answer: 0,
        explanationKo: "정답: ① 1인 가구가 늘어나고 있습니다\n\n글에서 1인 가구가 빠르게 증가한다고 했습니다.",
        explanationVi: t("readingB.fallback.long.explanation"),
      },
    ],
  };

  // DB에서 읽기 문제 가져오기
  const fetchQuestions = useCallback(async (tabType: TabKey, level: TopikLevel) => {
    setIsLoading(true);
    try {
      const examType = levelToExamType[level];
      const partNumbers = tabCategories[tabType].partNumbers;

      // Fetch questions from mock_question_bank
      const { data, error } = await supabase
        .from('mock_question_bank')
        .select('id, question_text, options, correct_answer, explanation_ko, explanation_vi, instruction_text')
        .eq('section', 'reading')
        .eq('exam_type', examType)
        .eq('is_active', true)
        .in('part_number', partNumbers)
        .limit(50);

      if (error) throw error;

      if (data && data.length > 0) {
        setDbQuestionCount(data.length);
        
        // 이미 본 문제 제외 (중복 방지)
        const unseenQuestions = data.filter(q => !sessionSeenQuestions.current.has(q.id));
        
        // 새 문제가 충분하면 새 문제만, 부족하면 전체에서 선택
        const pool = unseenQuestions.length >= 5 ? unseenQuestions : data;
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, 5);
        
        // 선택된 문제 ID를 세션에 기록
        selected.forEach(q => sessionSeenQuestions.current.add(q.id));
        
        console.log(`[ReadingB] 새 문제: ${unseenQuestions.length}/${data.length}, 선택: ${selected.length}`);

        const formattedQuestions: Question[] = selected.map((q, idx) => {
          const opts = Array.isArray(q.options) ? q.options : [];
          return {
            id: q.id,
            passage: q.instruction_text || q.question_text,
            question: q.instruction_text ? q.question_text : "다음 질문에 답하세요.",
            options: opts.map((o: any) => typeof o === 'string' ? o : o.text || String(o)),
            answer: q.correct_answer - 1, // DB is 1-indexed, UI is 0-indexed
            explanationKo: q.explanation_ko || "해설이 준비 중입니다.",
            explanationVi: q.explanation_vi || "Giải thích đang được chuẩn bị.",
          };
        });

        setQuestions(formattedQuestions);
        console.log(`✅ DB에서 ${formattedQuestions.length}개 읽기B 문제 로드 (전체: ${data.length}개)`);
      } else {
        // No DB questions, use fallback
        setDbQuestionCount(0);
        setQuestions(fallbackQuestions[tabType] || fallbackQuestions.arrangement);
        toast({
          title: "DB 문제 없음",
          description: "해당 조건의 문제가 없어 샘플 문제를 사용합니다.",
        });
      }
    } catch (error) {
      console.error('Error fetching questions from DB:', error);
      setDbQuestionCount(0);
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
  }, [activeTab, topikLevel]);

  const currentCategory = tabCategories[activeTab];
  const currentQuestion = questions[currentQuestionIndex];

  // Language-based auto-translate for explanation
  const uiLang = (i18n.language || "ko").split("-")[0];
  const translatedExplanation = useAutoTranslate(currentQuestion?.explanationKo ?? "", {
    sourceLanguage: "ko",
  });
  const targetMeta = languages.find((l) => l.code === uiLang);
  const targetFlag = targetMeta?.flag ?? "🌐";
  const targetLabel = targetMeta?.nativeName ?? uiLang;

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
                <Database className="w-16 h-16 animate-pulse text-primary mx-auto mb-6" />
                <h3 className="text-xl font-bold text-foreground mb-2">문제 불러오는 중...</h3>
                <p className="text-muted-foreground">DB에서 읽기 문제를 불러오고 있습니다</p>
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

                        {/* Korean Explanation (always shown) */}
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
                            🇰🇷 {t('reading.explanationKo')}
                          </p>
                          <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                            {currentQuestion.explanationKo}
                          </p>
                        </div>

                        {/* Localized explanation: vi uses provided field, others auto-translate */}
                        {uiLang !== "ko" && (
                          <>
                            <div className="border-t border-border/50 my-3" />
                            <div>
                              <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-1 flex items-center gap-1">
                                {uiLang === "vi" ? (
                                  <>
                                    🇻🇳 {t('reading.explanationVi')}
                                  </>
                                ) : (
                                  <>
                                    {targetFlag} {targetLabel}
                                  </>
                                )}
                              </p>
                              <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                                {uiLang === "vi" ? currentQuestion.explanationVi : translatedExplanation.text}
                              </p>
                              {uiLang !== "vi" && translatedExplanation.isTranslating && (
                                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  {t('board.translation.translating')}
                                </div>
                              )}
                            </div>
                          </>
                        )}
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
