import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Headphones,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Volume2,
  Users,
  Trophy,
  Sparkles,
  ChevronRight,
  MessageCircle,
  Loader2
} from "lucide-react";

interface Question {
  id: number;
  type: "single" | "dialogue";
  speaker1Text?: string;
  speaker2Text?: string;
  singleText?: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

// TOPIK style questions
const listeningQuestions: Question[] = [
  {
    id: 1,
    type: "dialogue",
    speaker1Text: "안녕하세요. 어디 가세요?",
    speaker2Text: "학교에 가요. 오늘 시험이 있어요.",
    question: "남자는 어디에 가고 있습니까?",
    options: ["집", "학교", "병원", "회사"],
    answer: 1,
    explanation: "남자가 '학교에 가요'라고 말했습니다.",
  },
  {
    id: 2,
    type: "dialogue",
    speaker1Text: "오늘 날씨가 어때요?",
    speaker2Text: "비가 와요. 우산을 가져가세요.",
    question: "오늘 날씨는 어떻습니까?",
    options: ["맑아요", "흐려요", "비가 와요", "눈이 와요"],
    answer: 2,
    explanation: "여자가 '비가 와요'라고 말했습니다.",
  },
  {
    id: 3,
    type: "single",
    singleText: "내일은 친구 생일이에요. 선물을 사야 해요.",
    question: "이 사람은 내일 무엇을 할 거예요?",
    options: ["친구를 만날 거예요", "선물을 살 거예요", "생일 파티를 할 거예요", "집에 있을 거예요"],
    answer: 1,
    explanation: "'선물을 사야 해요'라고 말했으므로 선물을 살 예정입니다.",
  },
  {
    id: 4,
    type: "dialogue",
    speaker1Text: "이 음식 맛있어요?",
    speaker2Text: "네, 아주 맛있어요. 매운 음식을 좋아해요.",
    question: "여자는 어떤 음식을 좋아합니까?",
    options: ["단 음식", "짠 음식", "매운 음식", "신 음식"],
    answer: 2,
    explanation: "여자가 '매운 음식을 좋아해요'라고 말했습니다.",
  },
  {
    id: 5,
    type: "single",
    singleText: "지하철역에서 오른쪽으로 가세요. 5분 정도 걸어요.",
    question: "목적지까지 얼마나 걸립니까?",
    options: ["3분", "5분", "10분", "15분"],
    answer: 1,
    explanation: "'5분 정도 걸어요'라고 안내했습니다.",
  },
];

const ListeningPractice = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  const [playedAudio, setPlayedAudio] = useState(false);
  const [currentPlayingLine, setCurrentPlayingLine] = useState<number | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkAuth();
  }, []);

  const currentQuestion = listeningQuestions[currentQuestionIndex];

  const playTTS = async (text: string, lineIndex?: number) => {
    try {
      setIsLoading(true);
      if (lineIndex !== undefined) setCurrentPlayingLine(lineIndex);
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/korean-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text }),
        }
      );

      if (!response.ok) {
        throw new Error("TTS 요청 실패");
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      setIsLoading(false);
      setIsPlaying(true);
      
      audio.onended = () => {
        setIsPlaying(false);
        setCurrentPlayingLine(null);
        URL.revokeObjectURL(audioUrl);
      };
      
      await audio.play();
    } catch (error) {
      console.error("TTS error:", error);
      setIsLoading(false);
      setIsPlaying(false);
      setCurrentPlayingLine(null);
      toast({
        title: "음성 재생 실패",
        description: "다시 시도해주세요",
        variant: "destructive",
      });
    }
  };

  const playFullAudio = async () => {
    setPlayedAudio(true);
    
    if (currentQuestion.type === "dialogue") {
      if (currentQuestion.speaker1Text) {
        await playTTS(currentQuestion.speaker1Text, 0);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      if (currentQuestion.speaker2Text) {
        await playTTS(currentQuestion.speaker2Text, 1);
      }
    } else if (currentQuestion.singleText) {
      await playTTS(currentQuestion.singleText, 0);
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (showResult) return;
    setSelectedAnswer(answerIndex);
  };

  const handleSubmit = () => {
    if (selectedAnswer === null) {
      toast({
        title: "답을 선택해주세요",
        variant: "destructive",
      });
      return;
    }

    setShowResult(true);
    if (selectedAnswer === currentQuestion.answer) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < listeningQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setPlayedAudio(false);
    } else {
      setIsQuizComplete(true);
    }
  };

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setIsQuizComplete(false);
    setPlayedAudio(false);
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
              onClick={() => navigate("/lesson-menu")}
              className="mb-6 hover:bg-primary/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              레슨 메뉴
            </Button>

            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-600 p-8 mb-8">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjIiLz48L2c+PC9zdmc+')] opacity-30" />
              
              <div className="relative z-10 flex items-center gap-6">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-2xl border border-white/30"
                >
                  <Headphones className="w-10 h-10 text-white" />
                </motion.div>
                <div>
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-medium mb-2"
                  >
                    <Sparkles className="w-3 h-3" />
                    TOPIK 스타일
                  </motion.div>
                  <motion.h1 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-3xl sm:text-4xl font-bold text-white mb-1"
                  >
                    듣기 연습
                  </motion.h1>
                  <motion.p 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-white/80"
                  >
                    AI TTS 대화형 듣기
                  </motion.p>
                </div>
              </div>
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            {isQuizComplete ? (
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
                  className="w-28 h-28 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mx-auto mb-6 shadow-xl"
                >
                  <Trophy className="w-14 h-14 text-white" />
                </motion.div>

                <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                  퀴즈 완료!
                </h2>
                <p className="text-muted-foreground mb-8 text-lg">
                  총 {listeningQuestions.length}문제 중 <span className="text-primary font-bold">{score}문제</span> 정답
                </p>

                <div className="w-full max-w-sm mx-auto mb-8">
                  <div className="flex justify-between text-sm text-muted-foreground mb-3">
                    <span>정답률</span>
                    <span className="font-bold text-foreground text-lg">
                      {Math.round((score / listeningQuestions.length) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                    <motion.div
                      className="bg-gradient-to-r from-primary via-blue-500 to-cyan-500 h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(score / listeningQuestions.length) * 100}%` }}
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
                    다시 풀기
                  </Button>
                  <Button
                    onClick={() => navigate("/lesson-menu")}
                    size="lg"
                    className="gap-2 bg-gradient-to-r from-primary to-blue-500 hover:opacity-90 text-white"
                  >
                    레슨 메뉴로
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            ) : (
              /* Quiz Question Screen */
              <motion.div
                key="quiz"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {/* Progress */}
                <div className="mb-6 p-4 rounded-2xl bg-card border border-border">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-foreground">
                      문제 {currentQuestionIndex + 1} / {listeningQuestions.length}
                    </span>
                    <span className="text-sm font-bold text-primary">
                      점수: {score}점
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <motion.div
                      className="bg-gradient-to-r from-primary to-cyan-500 h-2.5 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${((currentQuestionIndex + 1) / listeningQuestions.length) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                <div className="rounded-3xl bg-gradient-to-b from-card to-card/50 border border-border/50 shadow-2xl overflow-hidden">
                  {/* Top accent */}
                  <div className="h-1.5 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500" />
                  
                  <div className="p-6 sm:p-8">
                    {/* Question Type Badge */}
                    <div className="flex items-center gap-3 mb-6">
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
                        currentQuestion.type === "dialogue" 
                          ? "bg-violet-500/10 text-violet-500 border border-violet-500/20" 
                          : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                      }`}>
                        {currentQuestion.type === "dialogue" ? (
                          <>
                            <Users className="w-4 h-4" />
                            <span>대화 듣기</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-4 h-4" />
                            <span>내용 듣기</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Dialogue/Content Display with TTS */}
                    <div className="mb-8 space-y-3">
                      {currentQuestion.type === "dialogue" ? (
                        <>
                          {/* Speaker 1 */}
                          <motion.button
                            onClick={() => currentQuestion.speaker1Text && playTTS(currentQuestion.speaker1Text, 0)}
                            disabled={isPlaying || isLoading}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            className={`w-full p-4 rounded-2xl border-2 transition-all duration-300 text-left ${
                              currentPlayingLine === 0 
                                ? "border-primary bg-primary/10" 
                                : "border-border bg-muted/30 hover:border-primary/50"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                currentPlayingLine === 0 
                                  ? "bg-primary animate-pulse" 
                                  : "bg-blue-500"
                              }`}>
                                <MessageCircle className="w-5 h-5 text-white" />
                              </div>
                              <div className="flex-1">
                                <p className="text-xs text-muted-foreground mb-1">남자</p>
                                <p className="text-lg font-medium text-foreground">
                                  {currentQuestion.speaker1Text}
                                </p>
                              </div>
                              {currentPlayingLine === 0 && isLoading ? (
                                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                              ) : (
                                <Play className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                          </motion.button>

                          {/* Speaker 2 */}
                          <motion.button
                            onClick={() => currentQuestion.speaker2Text && playTTS(currentQuestion.speaker2Text, 1)}
                            disabled={isPlaying || isLoading}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            className={`w-full p-4 rounded-2xl border-2 transition-all duration-300 text-left ${
                              currentPlayingLine === 1 
                                ? "border-primary bg-primary/10" 
                                : "border-border bg-muted/30 hover:border-primary/50"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                currentPlayingLine === 1 
                                  ? "bg-primary animate-pulse" 
                                  : "bg-pink-500"
                              }`}>
                                <MessageCircle className="w-5 h-5 text-white" />
                              </div>
                              <div className="flex-1">
                                <p className="text-xs text-muted-foreground mb-1">여자</p>
                                <p className="text-lg font-medium text-foreground">
                                  {currentQuestion.speaker2Text}
                                </p>
                              </div>
                              {currentPlayingLine === 1 && isLoading ? (
                                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                              ) : (
                                <Play className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                          </motion.button>
                        </>
                      ) : (
                        /* Single speaker */
                        <motion.button
                          onClick={() => currentQuestion.singleText && playTTS(currentQuestion.singleText, 0)}
                          disabled={isPlaying || isLoading}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          className={`w-full p-5 rounded-2xl border-2 transition-all duration-300 text-left ${
                            currentPlayingLine === 0 
                              ? "border-primary bg-primary/10" 
                              : "border-border bg-muted/30 hover:border-primary/50"
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                              currentPlayingLine === 0 
                                ? "bg-primary animate-pulse" 
                                : "bg-gradient-to-br from-blue-500 to-cyan-500"
                            }`}>
                              {currentPlayingLine === 0 && isLoading ? (
                                <Loader2 className="w-6 h-6 text-white animate-spin" />
                              ) : (
                                <Volume2 className="w-6 h-6 text-white" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="text-xs text-muted-foreground mb-2">클릭하여 듣기</p>
                              <p className="text-lg font-medium text-foreground leading-relaxed">
                                {currentQuestion.singleText}
                              </p>
                            </div>
                          </div>
                        </motion.button>
                      )}

                      {/* Play All Button */}
                      <Button
                        onClick={playFullAudio}
                        disabled={isPlaying || isLoading}
                        variant="outline"
                        className="w-full gap-2 h-12 rounded-xl"
                      >
                        {isLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : isPlaying ? (
                          <Pause className="w-5 h-5" />
                        ) : (
                          <Play className="w-5 h-5" />
                        )}
                        {isPlaying ? "재생 중..." : playedAudio ? "전체 다시 듣기" : "전체 듣기"}
                      </Button>
                    </div>

                    {/* Question */}
                    <div className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
                      <h3 className="text-lg sm:text-xl font-bold text-foreground text-center">
                        {currentQuestion.question}
                      </h3>
                    </div>

                    {/* TOPIK Style 4-Choice Options */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                      {currentQuestion.options.map((option, index) => (
                        <motion.button
                          key={index}
                          onClick={() => handleAnswerSelect(index)}
                          whileHover={{ scale: showResult ? 1 : 1.02 }}
                          whileTap={{ scale: showResult ? 1 : 0.98 }}
                          disabled={showResult}
                          className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-300 ${
                            showResult
                              ? index === currentQuestion.answer
                                ? "border-green-500 bg-green-500/10"
                                : selectedAnswer === index
                                  ? "border-red-500 bg-red-500/10"
                                  : "border-border bg-card opacity-50"
                              : selectedAnswer === index
                                ? "border-primary bg-primary/10 shadow-lg"
                                : "border-border bg-card hover:border-primary/50 hover:shadow-md"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 ${
                              showResult
                                ? index === currentQuestion.answer
                                  ? "bg-green-500 text-white"
                                  : selectedAnswer === index
                                    ? "bg-red-500 text-white"
                                    : "bg-muted text-muted-foreground"
                                : selectedAnswer === index
                                  ? "bg-primary text-white"
                                  : "bg-muted text-muted-foreground"
                            }`}>
                              {optionLabels[index]}
                            </span>
                            <span className="font-medium text-foreground">{option}</span>
                          </div>

                          {showResult && index === currentQuestion.answer && (
                            <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 text-green-500" />
                          )}
                          {showResult && selectedAnswer === index && index !== currentQuestion.answer && (
                            <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 text-red-500" />
                          )}
                        </motion.button>
                      ))}
                    </div>

                    {/* Explanation */}
                    <AnimatePresence>
                      {showResult && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                              <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="font-bold text-foreground mb-1">해설</p>
                              <p className="text-muted-foreground">{currentQuestion.explanation}</p>
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
                          className="flex-1 h-14 text-lg gap-2 bg-gradient-to-r from-primary to-blue-500 hover:opacity-90 text-white rounded-xl"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                          정답 확인
                        </Button>
                      ) : (
                        <Button
                          onClick={handleNext}
                          className="flex-1 h-14 text-lg gap-2 bg-gradient-to-r from-primary to-blue-500 hover:opacity-90 text-white rounded-xl"
                        >
                          {currentQuestionIndex < listeningQuestions.length - 1 ? (
                            <>
                              다음 문제
                              <ChevronRight className="w-5 h-5" />
                            </>
                          ) : (
                            <>
                              결과 보기
                              <Trophy className="w-5 h-5" />
                            </>
                          )}
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

export default ListeningPractice;
