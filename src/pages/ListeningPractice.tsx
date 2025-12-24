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
  ChevronRight
} from "lucide-react";

interface Question {
  id: number;
  type: "single" | "dialogue";
  audio?: string;
  speaker1Text?: string;
  speaker2Text?: string;
  singleText?: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

// Sample questions for listening practice
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
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  const [playedAudio, setPlayedAudio] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkAuth();
  }, []);

  const currentQuestion = listeningQuestions[currentQuestionIndex];

  const playAudio = async () => {
    setIsPlaying(true);
    setPlayedAudio(true);
    
    // Simulate TTS playback
    // In real implementation, this would use ElevenLabs TTS
    if (currentQuestion.type === "dialogue") {
      toast({
        title: "🔊 재생 중...",
        description: "대화를 잘 들어보세요.",
      });
      
      // Simulate audio duration
      await new Promise(resolve => setTimeout(resolve, 3000));
    } else {
      toast({
        title: "🔊 재생 중...",
        description: "내용을 잘 들어보세요.",
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    setIsPlaying(false);
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
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              레슨 메뉴
            </Button>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-korean-blue to-korean-cyan flex items-center justify-center shadow-lg">
                <Headphones className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">듣기 연습</h1>
                <p className="text-muted-foreground text-sm">Listening Practice</p>
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
                className="glass-card p-8 sm:p-12 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="w-24 h-24 rounded-full bg-gradient-to-br from-korean-yellow to-korean-orange flex items-center justify-center mx-auto mb-6"
                >
                  <Trophy className="w-12 h-12 text-white" />
                </motion.div>

                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                  퀴즈 완료!
                </h2>
                <p className="text-muted-foreground mb-6">
                  총 {listeningQuestions.length}문제 중 {score}문제 정답
                </p>

                <div className="w-full max-w-xs mx-auto mb-8">
                  <div className="flex justify-between text-sm text-muted-foreground mb-2">
                    <span>정답률</span>
                    <span className="font-bold text-foreground">
                      {Math.round((score / listeningQuestions.length) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3">
                    <motion.div
                      className="bg-gradient-to-r from-primary to-secondary h-3 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(score / listeningQuestions.length) * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.3 }}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={handleRestart}
                    variant="outline"
                    className="gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    다시 풀기
                  </Button>
                  <Button
                    onClick={() => navigate("/lesson-menu")}
                    className="gap-2 btn-primary text-white"
                  >
                    레슨 메뉴로
                    <ChevronRight className="w-4 h-4" />
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
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-muted-foreground mb-2">
                    <span>문제 {currentQuestionIndex + 1} / {listeningQuestions.length}</span>
                    <span>점수: {score}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <motion.div
                      className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${((currentQuestionIndex + 1) / listeningQuestions.length) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                <div className="glass-card p-6 sm:p-8">
                  {/* Question Type Badge */}
                  <div className="flex items-center gap-2 mb-6">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
                      currentQuestion.type === "dialogue" 
                        ? "bg-korean-purple/10 text-korean-purple" 
                        : "bg-korean-blue/10 text-korean-blue"
                    }`}>
                      {currentQuestion.type === "dialogue" ? (
                        <>
                          <Users className="w-3.5 h-3.5" />
                          <span>대화 듣기</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>내용 듣기</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Audio Player */}
                  <div className="mb-8">
                    <motion.button
                      onClick={playAudio}
                      disabled={isPlaying}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full p-6 rounded-2xl border-2 transition-all duration-300 ${
                        playedAudio 
                          ? "border-green-500/50 bg-green-500/5" 
                          : "border-primary/50 bg-primary/5"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-4">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                          isPlaying 
                            ? "bg-primary animate-pulse" 
                            : "bg-gradient-to-br from-primary to-secondary"
                        }`}>
                          {isPlaying ? (
                            <Pause className="w-8 h-8 text-white" />
                          ) : (
                            <Play className="w-8 h-8 text-white ml-1" />
                          )}
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-foreground">
                            {isPlaying ? "재생 중..." : playedAudio ? "다시 듣기" : "듣기 시작"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {currentQuestion.type === "dialogue" 
                              ? "두 사람의 대화를 들어보세요" 
                              : "내용을 잘 들어보세요"}
                          </p>
                        </div>
                      </div>
                      
                      {/* Audio visualization */}
                      {isPlaying && (
                        <div className="flex justify-center gap-1 mt-4">
                          {[...Array(12)].map((_, i) => (
                            <motion.div
                              key={i}
                              className="w-1.5 bg-primary rounded-full"
                              animate={{
                                height: [12, 24 + Math.random() * 20, 12],
                              }}
                              transition={{
                                duration: 0.5,
                                repeat: Infinity,
                                delay: i * 0.05,
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </motion.button>
                  </div>

                  {/* Question */}
                  <div className="mb-6">
                    <h3 className="text-lg sm:text-xl font-bold text-foreground text-center">
                      {currentQuestion.question}
                    </h3>
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    {currentQuestion.options.map((option, index) => (
                      <motion.button
                        key={index}
                        onClick={() => handleAnswerSelect(index)}
                        whileHover={{ scale: showResult ? 1 : 1.02 }}
                        whileTap={{ scale: showResult ? 1 : 0.98 }}
                        disabled={showResult}
                        className={`relative p-4 rounded-xl border-2 text-left transition-all duration-300 ${
                          showResult
                            ? index === currentQuestion.answer
                              ? "border-green-500 bg-green-500/10"
                              : selectedAnswer === index
                                ? "border-red-500 bg-red-500/10"
                                : "border-border bg-card opacity-50"
                            : selectedAnswer === index
                              ? "border-primary bg-primary/10"
                              : "border-border bg-card hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
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
                            {index + 1}
                          </span>
                          <span className="font-medium text-foreground">{option}</span>
                        </div>

                        {showResult && index === currentQuestion.answer && (
                          <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                        )}
                        {showResult && selectedAnswer === index && index !== currentQuestion.answer && (
                          <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
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
                        className="mb-6 p-4 rounded-xl bg-muted/50 border border-border"
                      >
                        <div className="flex items-start gap-3">
                          <Sparkles className="w-5 h-5 text-korean-yellow shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-foreground mb-1">해설</p>
                            <p className="text-sm text-muted-foreground">
                              {currentQuestion.explanation}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Actions */}
                  <div className="flex justify-center gap-3">
                    {!showResult ? (
                      <Button
                        onClick={handleSubmit}
                        disabled={selectedAnswer === null}
                        className="btn-primary text-white px-8"
                      >
                        정답 확인
                      </Button>
                    ) : (
                      <Button
                        onClick={handleNext}
                        className="btn-primary text-white px-8 gap-2"
                      >
                        {currentQuestionIndex < listeningQuestions.length - 1 ? "다음 문제" : "결과 보기"}
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    )}
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
