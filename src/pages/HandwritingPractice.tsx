import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  PenTool,
  Type,
  FileText,
  Sparkles,
  Keyboard,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  Lightbulb
} from "lucide-react";
import HangulTracing from "@/components/learning/HangulTracing";

type PracticeMode = "handwriting" | "keyboard";
type TabType = "consonants" | "words" | "sentences";

interface PracticeModeCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
}

const PracticeModeCard = ({ icon: Icon, title, description, isActive, onClick }: PracticeModeCardProps) => (
  <motion.button
    onClick={onClick}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    className={`relative flex-1 p-4 sm:p-6 rounded-2xl border-2 transition-all duration-300 text-left ${
      isActive 
        ? "border-primary bg-primary/5 shadow-lg" 
        : "border-border bg-card hover:border-primary/50"
    }`}
  >
    {isActive && (
      <motion.div
        layoutId="activeModeIndicator"
        className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10"
        initial={false}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    )}
    <div className="relative z-10">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
        isActive 
          ? "bg-gradient-to-br from-primary to-secondary text-white" 
          : "bg-muted text-muted-foreground"
      }`}>
        <Icon className="w-6 h-6" />
      </div>
      <h3 className={`font-bold text-lg mb-1 ${isActive ? "text-primary" : "text-foreground"}`}>
        {title}
      </h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    {isActive && (
      <div className="absolute top-3 right-3">
        <CheckCircle2 className="w-5 h-5 text-primary" />
      </div>
    )}
  </motion.button>
);

// Sample data for practice
const consonantsData = {
  basic: ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"],
  double: ["ㄲ", "ㄸ", "ㅃ", "ㅆ", "ㅉ"],
  vowels: ["ㅏ", "ㅑ", "ㅓ", "ㅕ", "ㅗ", "ㅛ", "ㅜ", "ㅠ", "ㅡ", "ㅣ"],
  compound: ["ㅐ", "ㅒ", "ㅔ", "ㅖ", "ㅘ", "ㅙ", "ㅚ", "ㅝ", "ㅞ", "ㅟ", "ㅢ"],
};

const wordsData = ["사랑", "감사", "한국", "친구", "행복", "가족", "음식", "학교", "서울", "안녕"];

const sentencesData = [
  "안녕하세요",
  "감사합니다", 
  "사랑해요",
  "만나서 반가워요",
  "한국어를 공부해요",
];

// Spelling quiz data (confusing pairs)
const spellingQuizData = [
  { question: "사과를 먹__요", options: ["어", "여"], answer: "어", hint: "ㅓ 모음 뒤에는 '어'" },
  { question: "학교에 __요", options: ["가", "까"], answer: "가", hint: "기본 자음 ㄱ" },
  { question: "__기 싫어요", options: ["되", "돼"], answer: "되", hint: "'되다'의 어간" },
  { question: "밥을 __요", options: ["먹어", "먹여"], answer: "먹어", hint: "먹다 + 어요" },
  { question: "날씨가 __요", options: ["좋아", "조아"], answer: "좋아", hint: "'좋다'의 활용" },
];

const HandwritingPractice = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>("consonants");
  const [practiceMode, setPracticeMode] = useState<PracticeMode>("handwriting");
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkAuth();
  }, []);

  const getCurrentCharacters = () => {
    switch (activeTab) {
      case "consonants":
        return [...consonantsData.basic, ...consonantsData.vowels];
      case "words":
        return wordsData;
      case "sentences":
        return sentencesData;
      default:
        return consonantsData.basic;
    }
  };

  const handleQuizAnswer = (selectedAnswer: string) => {
    const currentQuiz = spellingQuizData[currentQuizIndex];
    if (selectedAnswer === currentQuiz.answer) {
      setQuizScore(prev => prev + 1);
      toast({
        title: "정답! 🎉",
        description: currentQuiz.hint,
      });
    } else {
      toast({
        title: "틀렸어요 😢",
        description: `정답: ${currentQuiz.answer} - ${currentQuiz.hint}`,
        variant: "destructive",
      });
    }
    
    if (currentQuizIndex < spellingQuizData.length - 1) {
      setCurrentQuizIndex(prev => prev + 1);
    } else {
      toast({
        title: "퀴즈 완료!",
        description: `총 ${quizScore + (selectedAnswer === currentQuiz.answer ? 1 : 0)}/${spellingQuizData.length} 정답`,
      });
      setShowQuiz(false);
      setCurrentQuizIndex(0);
      setQuizScore(0);
    }
  };

  const tabConfig = [
    { id: "consonants" as TabType, label: "자음·모음", icon: Type },
    { id: "words" as TabType, label: "단어", icon: PenTool },
    { id: "sentences" as TabType, label: "문장", icon: FileText },
  ];

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
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-korean-purple to-korean-pink flex items-center justify-center shadow-lg">
                <PenTool className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">손글씨 연습</h1>
                <p className="text-muted-foreground text-sm">Handwriting Practice</p>
              </div>
            </div>
          </motion.div>

          {/* Practice Mode Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              연습 모드 선택
            </h2>
            <div className="flex gap-4">
              <PracticeModeCard
                icon={PenTool}
                title="손글씨"
                description="캔버스에 직접 써보기"
                isActive={practiceMode === "handwriting"}
                onClick={() => setPracticeMode("handwriting")}
              />
              <PracticeModeCard
                icon={Keyboard}
                title="키보드"
                description="빈칸 채우기 퀴즈"
                isActive={practiceMode === "keyboard"}
                onClick={() => {
                  setPracticeMode("keyboard");
                  setShowQuiz(true);
                }}
              />
            </div>
          </motion.div>

          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6 h-14 p-1.5 bg-muted/50 rounded-2xl">
                {tabConfig.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex items-center gap-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-300 h-full"
                  >
                    <tab.icon className="w-4 h-4" />
                    <span className="font-medium">{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              <AnimatePresence mode="wait">
                {practiceMode === "handwriting" ? (
                  <motion.div
                    key="handwriting"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <TabsContent value={activeTab} className="mt-0">
                      <div className="glass-card p-6">
                        <HangulTracing
                          characters={getCurrentCharacters()}
                          onComplete={(scores) => {
                            const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
                            toast({
                              title: "연습 완료! 🎉",
                              description: `평균 점수: ${avg}점`,
                            });
                          }}
                        />
                      </div>
                    </TabsContent>
                  </motion.div>
                ) : (
                  <motion.div
                    key="keyboard"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Keyboard Quiz Mode */}
                    <div className="glass-card p-6 sm:p-8">
                      <div className="text-center mb-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-korean-yellow/10 text-korean-yellow text-sm font-semibold mb-4">
                          <Lightbulb className="w-4 h-4" />
                          <span>맞춤법 퀴즈</span>
                        </div>
                        <p className="text-muted-foreground text-sm">
                          헷갈리는 자음·모음을 구분해보세요!
                        </p>
                      </div>

                      {/* Quiz Content */}
                      <div className="max-w-md mx-auto">
                        <div className="text-center mb-8">
                          <span className="text-xs text-muted-foreground">
                            문제 {currentQuizIndex + 1} / {spellingQuizData.length}
                          </span>
                          <div className="w-full bg-muted rounded-full h-2 mt-2">
                            <motion.div
                              className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${((currentQuizIndex + 1) / spellingQuizData.length) * 100}%` }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                        </div>

                        <motion.div
                          key={currentQuizIndex}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-center mb-8"
                        >
                          <p className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                            {spellingQuizData[currentQuizIndex].question.split("__")[0]}
                            <span className="inline-block w-12 h-12 mx-1 border-b-4 border-primary align-bottom" />
                            {spellingQuizData[currentQuizIndex].question.split("__")[1]}
                          </p>
                        </motion.div>

                        <div className="grid grid-cols-2 gap-4">
                          {spellingQuizData[currentQuizIndex].options.map((option, idx) => (
                            <motion.button
                              key={option}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.1 }}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleQuizAnswer(option)}
                              className="p-6 rounded-2xl border-2 border-border bg-card hover:border-primary hover:bg-primary/5 transition-all duration-300 text-center group"
                            >
                              <span className="text-3xl font-bold text-foreground group-hover:text-primary transition-colors">
                                {option}
                              </span>
                            </motion.button>
                          ))}
                        </div>

                        <div className="mt-6 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCurrentQuizIndex(0);
                              setQuizScore(0);
                            }}
                            className="gap-2"
                          >
                            <RotateCcw className="w-4 h-4" />
                            처음부터
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Tabs>
          </motion.div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
};

export default HandwritingPractice;
