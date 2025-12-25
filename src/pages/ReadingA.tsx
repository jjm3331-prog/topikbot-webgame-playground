import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  BookOpen,
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

// Tab categories - 정적 데이터는 fallback용
const tabCategories = {
  grammar: {
    label: "빈칸 문법",
    sublabel: "Ngữ pháp điền chỗ trống",
    emoji: "📝",
  },
  vocabulary: {
    label: "유의어/의미",
    sublabel: "Từ đồng nghĩa / Nghĩa",
    emoji: "📚",
  },
  topic: {
    label: "주제파악",
    sublabel: "Xác định chủ đề",
    emoji: "🎯",
  },
  advertisement: {
    label: "광고/안내문",
    sublabel: "Quảng cáo / Thông báo",
    emoji: "📰",
  },
};

// Fallback questions
const fallbackQuestions: Record<string, Question[]> = {
  grammar: [
    {
      id: 1,
      passage: "저는 매일 아침 7시에 일어나서 운동( ) 합니다.",
      question: "빈칸에 들어갈 알맞은 것을 고르세요.",
      options: ["을", "를", "이", "가"],
      answer: 0,
      explanationKo: "정답: ① 을\n\n'운동'은 받침이 있는 명사이므로 목적격 조사 '을'이 맞습니다.",
      explanationVi: "Đáp án: ① 을\n\n'운동' là danh từ có patchim nên phải dùng trợ từ tân ngữ '을'.",
    },
  ],
  vocabulary: [
    {
      id: 1,
      passage: "오늘 날씨가 매우 춥습니다.",
      question: "'매우'와 의미가 비슷한 것을 고르세요.",
      options: ["아주", "조금", "별로", "전혀"],
      answer: 0,
      explanationKo: "정답: ① 아주\n\n'매우'와 '아주'는 모두 '대단히'의 의미입니다.",
      explanationVi: "Đáp án: ① 아주\n\n'매우' và '아주' đều có nghĩa 'rất'.",
    },
  ],
  topic: [
    {
      id: 1,
      passage: "서울에는 많은 박물관이 있습니다. 국립중앙박물관에서는 한국의 역사를 배울 수 있습니다.",
      question: "이 글의 주제는 무엇입니까?",
      options: ["서울의 박물관", "한국의 역사", "한국 전쟁", "서울 여행"],
      answer: 0,
      explanationKo: "정답: ① 서울의 박물관\n\n글은 서울에 있는 박물관을 소개하고 있습니다.",
      explanationVi: "Đáp án: ① 서울의 박물관\n\nBài viết giới thiệu các bảo tàng ở Seoul.",
    },
  ],
  advertisement: [
    {
      id: 1,
      passage: "📚 서울도서관\n운영: 09:00-21:00\n휴관: 매주 월요일",
      question: "이 안내문에 대한 설명으로 맞는 것은?",
      options: ["월요일에 쉽니다", "24시간 운영합니다", "화요일에 쉽니다", "주말에만 운영합니다"],
      answer: 0,
      explanationKo: "정답: ① 월요일에 쉽니다\n\n휴관일이 '매주 월요일'입니다.",
      explanationVi: "Đáp án: ① 월요일에 쉽니다\n\nNgày nghỉ là 'thứ Hai hàng tuần'.",
    },
  ],
};

type TabKey = keyof typeof tabCategories;

// TOPIK 급수 레벨
const topikLevels = {
  "1-2": { label: "TOPIK I (1-2급)", sublabel: "Sơ cấp", color: "from-green-500 to-emerald-500" },
  "3-4": { label: "TOPIK II (3-4급)", sublabel: "Trung cấp", color: "from-blue-500 to-cyan-500" },
  "5-6": { label: "TOPIK II (5-6급)", sublabel: "Cao cấp", color: "from-purple-500 to-pink-500" },
};

type TopikLevel = keyof typeof topikLevels;

const ReadingA = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("grammar");
  const [topikLevel, setTopikLevel] = useState<TopikLevel>("1-2");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  const [questions, setQuestions] = useState<Question[]>(fallbackQuestions.grammar);
  const [isLoading, setIsLoading] = useState(false);

  // RAG에서 문제 가져오기
  const fetchQuestions = useCallback(async (tabType: string, level: TopikLevel) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('reading-content', {
        body: { type: 'readingA', tabType, topikLevel: level, count: 5 }
      });

      if (error) throw error;

      if (data?.questions && data.questions.length > 0) {
        setQuestions(data.questions);
        console.log(`✅ Loaded ${data.questions.length} questions for TOPIK ${level}`);
      } else {
        setQuestions(fallbackQuestions[tabType] || fallbackQuestions.grammar);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      setQuestions(fallbackQuestions[tabType] || fallbackQuestions.grammar);
      toast({
        title: "Đang sử dụng câu hỏi mẫu",
        description: "Không thể tải câu hỏi mới",
      });
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

  // 탭/레벨 변경 또는 초기 로드 시 문제 가져오기
  useEffect(() => {
    fetchQuestions(activeTab, topikLevel);
  }, [activeTab, topikLevel]);

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
      toast({
        title: "Vui lòng chọn đáp án",
        variant: "destructive",
      });
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
          {/* Header */}
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
              Quay lại
            </Button>

            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 p-8 mb-8">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjIiLz48L2c+PC9zdmc+')] opacity-30" />
              
              <div className="relative z-10 flex items-center gap-6">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-2xl border border-white/30"
                >
                  <BookOpen className="w-10 h-10 text-white" />
                </motion.div>
                <div>
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-medium mb-2"
                  >
                    <Sparkles className="w-3 h-3" />
                    Phong cách TOPIK
                  </motion.div>
                  <motion.h1 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-3xl sm:text-4xl font-bold text-white mb-1"
                  >
                    읽기A
                  </motion.h1>
                  <motion.p 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-white/80"
                  >
                    Đọc hiểu cơ bản
                  </motion.p>
                </div>
              </div>
            </div>

            {/* TOPIK Level Selection */}
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

            {/* Tab Navigation */}
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
              /* Loading Screen */
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-3xl bg-gradient-to-b from-card to-card/50 border border-border/50 shadow-2xl p-12 text-center"
              >
                <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-6" />
                <h3 className="text-xl font-bold text-foreground mb-2">Đang tạo câu hỏi...</h3>
                <p className="text-muted-foreground">AI đang tạo câu hỏi TOPIK phù hợp</p>
              </motion.div>
            ) : !currentQuestion ? (
              <motion.div
                key="no-questions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-3xl bg-card border border-border p-12 text-center"
              >
                <p className="text-muted-foreground mb-4">Không có câu hỏi</p>
                <Button onClick={() => fetchQuestions(activeTab, topikLevel)}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tải lại
                </Button>
              </motion.div>
            ) : isQuizComplete ? (
              /* Quiz Complete Screen */
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
                  className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto mb-6 shadow-xl"
                >
                  <Trophy className="w-14 h-14 text-white" />
                </motion.div>

                <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                  {currentCategory.label} Hoàn thành!
                </h2>
                <p className="text-muted-foreground mb-8 text-lg">
                  Tổng {questions.length} câu, đúng <span className="text-primary font-bold">{score} câu</span>
                </p>

                <div className="w-full max-w-sm mx-auto mb-8">
                  <div className="flex justify-between text-sm text-muted-foreground mb-3">
                    <span>Tỷ lệ đúng</span>
                    <span className="font-bold text-foreground text-lg">
                      {Math.round((score / questions.length) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                    <motion.div
                      className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 h-full rounded-full"
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
                    Làm lại
                  </Button>
                  <Button
                    onClick={() => navigate("/dashboard")}
                    size="lg"
                    className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 text-white"
                  >
                    Quay lại
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            ) : (
              /* Quiz Question Screen */
              <motion.div
                key={`quiz-${activeTab}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {/* Progress */}
                <div className="mb-6 p-4 rounded-2xl bg-card border border-border">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-foreground">
                      {currentCategory.emoji} {currentCategory.label} - Câu {currentQuestionIndex + 1} / {questions.length}
                    </span>
                    <span className="text-sm font-bold text-primary">
                      Điểm: {score}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <motion.div
                      className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-2.5 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                <div className="rounded-3xl bg-gradient-to-b from-card to-card/50 border border-border/50 shadow-2xl overflow-hidden">
                  {/* Top accent */}
                  <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
                  
                  <div className="p-6 sm:p-8">
                    {/* Passage */}
                    <div className="mb-6 p-5 rounded-2xl bg-muted/50 border border-border">
                      <p className="text-lg leading-relaxed text-foreground whitespace-pre-wrap">
                        {currentQuestion.passage}
                      </p>
                    </div>

                    {/* Question */}
                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-foreground">
                        {currentQuestion.question}
                      </h3>
                    </div>

                    {/* Options */}
                    <div className="space-y-3 mb-8">
                      {currentQuestion.options.map((option, index) => (
                        <motion.button
                          key={index}
                          onClick={() => handleAnswerSelect(index)}
                          whileHover={{ scale: showResult ? 1 : 1.01 }}
                          whileTap={{ scale: showResult ? 1 : 0.99 }}
                          className={`w-full p-4 rounded-2xl border-2 transition-all duration-300 text-left ${
                            showResult
                              ? index === currentQuestion.answer
                                ? "border-green-500 bg-green-500/10"
                                : selectedAnswer === index
                                ? "border-red-500 bg-red-500/10"
                                : "border-border bg-muted/30"
                              : selectedAnswer === index
                              ? "border-primary bg-primary/10"
                              : "border-border bg-muted/30 hover:border-primary/50"
                          }`}
                          disabled={showResult}
                        >
                          <div className="flex items-center gap-4">
                            <span className={`text-xl font-bold ${
                              showResult
                                ? index === currentQuestion.answer
                                  ? "text-green-500"
                                  : selectedAnswer === index
                                  ? "text-red-500"
                                  : "text-muted-foreground"
                                : selectedAnswer === index
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}>
                              {optionLabels[index]}
                            </span>
                            <span className="text-foreground font-medium flex-1">
                              {option}
                            </span>
                            {showResult && index === currentQuestion.answer && (
                              <CheckCircle2 className="w-6 h-6 text-green-500" />
                            )}
                            {showResult && selectedAnswer === index && index !== currentQuestion.answer && (
                              <XCircle className="w-6 h-6 text-red-500" />
                            )}
                          </div>
                        </motion.button>
                      ))}
                    </div>

                    {/* Explanation - 한국어/베트남어 병기 */}
                    <AnimatePresence>
                      {showResult && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mb-6 rounded-2xl overflow-hidden border border-blue-500/30"
                        >
                          <div className="bg-blue-500/10 p-4 border-b border-blue-500/20">
                            <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                              💡 해설 / Giải thích
                            </p>
                          </div>
                          <div className="p-5 space-y-4 bg-blue-500/5">
                            {/* Korean Explanation */}
                            <div>
                              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1">
                                🇰🇷 한국어
                              </p>
                              <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                                {currentQuestion.explanationKo}
                              </p>
                            </div>
                            
                            <div className="border-t border-border/50" />
                            
                            {/* Vietnamese Explanation */}
                            <div>
                              <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-1">
                                🇻🇳 Tiếng Việt
                              </p>
                              <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                                {currentQuestion.explanationVi}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      {!showResult ? (
                        <Button
                          onClick={handleSubmit}
                          disabled={selectedAnswer === null}
                          className="flex-1 h-14 text-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 text-white"
                        >
                          Kiểm tra đáp án
                        </Button>
                      ) : (
                        <Button
                          onClick={handleNext}
                          className="flex-1 h-14 text-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 text-white"
                        >
                          {currentQuestionIndex < questions.length - 1 ? "Câu tiếp theo" : "Xem kết quả"}
                          <ChevronRight className="w-5 h-5 ml-2" />
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

export default ReadingA;
