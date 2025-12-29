import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
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
  Loader2,
  RefreshCw,
  Gauge
} from "lucide-react";
import { useAutoTranslate } from "@/hooks/useAutoTranslate";

// Auto-translated explanation component
function TranslatedExplanation({ explanationKo, explanationVi }: { explanationKo: string; explanationVi?: string }) {
  const { i18n } = useTranslation();
  const uiLang = (i18n.language || "ko").split("-")[0];

  // 베트남어: 그대로 표시
  if (uiLang === "vi") return <p className="text-muted-foreground">{explanationVi || explanationKo}</p>;
  // 한국어: 한국어만 표시
  if (uiLang === "ko") return <p className="text-muted-foreground">{explanationKo}</p>;

  // 그 외 언어: 한국어 원문을 해당 언어로 자동번역
  const { text: translatedText, isTranslating } = useAutoTranslate(explanationKo, { sourceLanguage: "ko" });

  return (
    <p className="text-muted-foreground">
      {isTranslating ? (
        <span className="inline-flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          {explanationKo}
        </span>
      ) : (
        translatedText
      )}
    </p>
  );
}

interface Question {
  id?: number;
  type: "single" | "dialogue";
  speaker1Text?: string;
  speaker2Text?: string;
  singleText?: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  explanationVi?: string;
  audioUrl?: string; // Pre-generated audio URL from DB
}

// Fallback TOPIK style questions
const fallbackQuestions: Question[] = [
  {
    id: 1,
    type: "dialogue",
    speaker1Text: "안녕하세요. 어디 가세요?",
    speaker2Text: "학교에 가요. 오늘 시험이 있어요.",
    question: "남자는 어디에 가고 있습니까?",
    options: ["집", "학교", "병원", "회사"],
    answer: 1,
    explanation: "남자가 '학교에 가요'라고 말했습니다.",
    explanationVi: "Người nam nói 'Tôi đi học'.",
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
    explanationVi: "Người nữ nói 'Trời mưa'.",
  },
  {
    id: 3,
    type: "single",
    singleText: "내일은 친구 생일이에요. 선물을 사야 해요.",
    question: "이 사람은 내일 무엇을 할 거예요?",
    options: ["친구를 만날 거예요", "선물을 살 거예요", "생일 파티를 할 거예요", "집에 있을 거예요"],
    answer: 1,
    explanation: "'선물을 사야 해요'라고 말했으므로 선물을 살 예정입니다.",
    explanationVi: "Họ nói 'Tôi phải mua quà' nên sẽ mua quà.",
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
    explanationVi: "Người nữ nói 'Tôi thích đồ ăn cay'.",
  },
  {
    id: 5,
    type: "single",
    singleText: "지하철역에서 오른쪽으로 가세요. 5분 정도 걸어요.",
    question: "목적지까지 얼마나 걸립니까?",
    options: ["3분", "5분", "10분", "15분"],
    answer: 1,
    explanation: "'5분 정도 걸어요'라고 안내했습니다.",
    explanationVi: "Họ nói 'Đi bộ khoảng 5 phút'.",
  },
];

// TOPIK 급수 레벨
const topikLevels = {
  "1-2": { label: "TOPIK I (1-2급)", sublabel: "Sơ cấp", color: "from-green-500 to-emerald-500" },
  "3-4": { label: "TOPIK II (3-4급)", sublabel: "Trung cấp", color: "from-blue-500 to-cyan-500" },
  "5-6": { label: "TOPIK II (5-6급)", sublabel: "Cao cấp", color: "from-purple-500 to-pink-500" },
};

type TopikLevel = keyof typeof topikLevels;

const ListeningPractice = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
  
  // TTS Speed control (0.7 ~ 1.0)
  const [ttsSpeed, setTtsSpeed] = useState(0.8);
  
  // TOPIK Level
  const [topikLevel, setTopikLevel] = useState<TopikLevel>("1-2");
  
  // RAG-powered questions
  const [listeningQuestions, setListeningQuestions] = useState<Question[]>(fallbackQuestions);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  
  // 세션 내 푼 문제 ID 추적 (중복 방지)
  const sessionSeenQuestions = useRef<Set<string>>(new Set());

  // Fetch pre-generated listening questions from DB (mock_question_bank)
  const fetchListeningQuestions = useCallback(async (level: TopikLevel) => {
    setIsLoadingQuestions(true);
    
    try {
      // Map TOPIK level to difficulty
      const difficultyMap: Record<TopikLevel, string> = {
        "1-2": "beginner",
        "3-4": "intermediate",
        "5-6": "advanced",
      };
      const difficulty = difficultyMap[level];
      
      // Map TOPIK level to exam_type
      const examType = level === "1-2" ? "TOPIK_I" : "TOPIK_II";
      
      // Query pre-generated questions from mock_question_bank
      // Randomly select 5 listening questions with matching difficulty
      const { data: dbQuestions, error } = await supabase
        .from("mock_question_bank")
        .select("*")
        .eq("section", "listening")
        .eq("exam_type", examType)
        .eq("is_active", true)
        .not("question_audio_url", "is", null) // Only questions with audio
        .order("created_at", { ascending: false })
        .limit(50); // Get more to randomize
      
      if (error) {
        console.error("DB query error:", error);
        throw error;
      }
      
      if (dbQuestions && dbQuestions.length > 0) {
        // 이미 본 문제 제외 (중복 방지)
        const unseenQuestions = dbQuestions.filter(q => !sessionSeenQuestions.current.has(q.id));
        
        // 새 문제가 충분하면 새 문제만, 부족하면 전체에서 선택
        const pool = unseenQuestions.length >= 5 ? unseenQuestions : dbQuestions;
        const shuffled = pool.sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, 5);
        
        // 선택된 문제 ID를 세션에 기록
        selected.forEach(q => sessionSeenQuestions.current.add(q.id));
        
        console.log(`[ListeningPractice] 새 문제: ${unseenQuestions.length}/${dbQuestions.length}, 선택: ${selected.length}`);
        
        // Transform DB format to component format
        const transformedQuestions: Question[] = selected.map((q, idx) => {
          // Parse listening_script to extract dialogue
          const script = (q as any).listening_script || "";
          const lines = script.split(/\\n|\n/).filter((l: string) => l.trim());
          
          // Check if it's a dialogue or monologue
          const isDialogue = lines.some((line: string) => 
            line.includes("남자:") || line.includes("남:") || 
            line.includes("여자:") || line.includes("여:")
          );
          
          if (isDialogue && lines.length >= 2) {
            // Extract speaker lines
            const speaker1Text = lines[0]?.replace(/^(남자:|남:|여자:|여:)\s*/, "") || "";
            const speaker2Text = lines[1]?.replace(/^(남자:|남:|여자:|여:)\s*/, "") || "";
            
            return {
              id: idx + 1,
              type: "dialogue" as const,
              speaker1Text,
              speaker2Text,
              question: q.question_text,
              options: (q.options as string[]) || [],
              answer: (q.correct_answer || 1) - 1, // DB uses 1-indexed, component uses 0-indexed
              explanation: q.explanation_ko || "",
              explanationVi: q.explanation_vi || "",
              audioUrl: q.question_audio_url,
            };
          } else {
            // Single speaker / monologue
            return {
              id: idx + 1,
              type: "single" as const,
              singleText: script.replace(/^(남자:|남:|여자:|여:|화자:)\s*/gm, "").trim() || q.question_text,
              question: q.question_text,
              options: (q.options as string[]) || [],
              answer: (q.correct_answer || 1) - 1,
              explanation: q.explanation_ko || "",
              explanationVi: q.explanation_vi || "",
              audioUrl: q.question_audio_url,
            };
          }
        });
        
        setListeningQuestions(transformedQuestions);
        console.log(`✅ Loaded ${transformedQuestions.length} pre-generated listening questions from DB`);
      } else {
        // Fallback: try without audio filter
        const { data: fallbackDbQuestions, error: fallbackError } = await supabase
          .from("mock_question_bank")
          .select("*")
          .eq("section", "listening")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(30);
        
        if (fallbackDbQuestions && fallbackDbQuestions.length > 0) {
          const shuffled = fallbackDbQuestions.sort(() => Math.random() - 0.5);
          const selected = shuffled.slice(0, 5);
          
          const transformedQuestions: Question[] = selected.map((q, idx) => {
            const script = (q as any).listening_script || "";
            const lines = script.split(/\\n|\n/).filter((l: string) => l.trim());
            const isDialogue = lines.some((line: string) => 
              line.includes("남자:") || line.includes("남:") || 
              line.includes("여자:") || line.includes("여:")
            );
            
            if (isDialogue && lines.length >= 2) {
              const speaker1Text = lines[0]?.replace(/^(남자:|남:|여자:|여:)\s*/, "") || "";
              const speaker2Text = lines[1]?.replace(/^(남자:|남:|여자:|여:)\s*/, "") || "";
              
              return {
                id: idx + 1,
                type: "dialogue" as const,
                speaker1Text,
                speaker2Text,
                question: q.question_text,
                options: (q.options as string[]) || [],
                answer: (q.correct_answer || 1) - 1,
                explanation: q.explanation_ko || "",
                explanationVi: q.explanation_vi || "",
                audioUrl: q.question_audio_url,
              };
            } else {
              return {
                id: idx + 1,
                type: "single" as const,
                singleText: script.replace(/^(남자:|남:|여자:|여:|화자:)\s*/gm, "").trim() || q.question_text,
                question: q.question_text,
                options: (q.options as string[]) || [],
                answer: (q.correct_answer || 1) - 1,
                explanation: q.explanation_ko || "",
                explanationVi: q.explanation_vi || "",
                audioUrl: q.question_audio_url,
              };
            }
          });
          
          setListeningQuestions(transformedQuestions);
          console.log(`✅ Loaded ${transformedQuestions.length} listening questions (without audio filter)`);
        } else {
          console.log("No questions in DB, using fallback");
          setListeningQuestions(fallbackQuestions);
        }
      }
    } catch (error) {
      console.error('Error fetching listening questions from DB:', error);
      setListeningQuestions(fallbackQuestions);
      toast({
        title: "DB 문제 로드 실패",
        description: "기본 문제로 연습합니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingQuestions(false);
    }
  }, [toast]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkAuth();
  }, []);

  // Load questions when level changes
  useEffect(() => {
    fetchListeningQuestions(topikLevel);
  }, [topikLevel]);

  const currentQuestion = listeningQuestions[currentQuestionIndex];

  const playTTS = async (text: string, lineIndex?: number, isMale?: boolean): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      try {
        setIsLoading(true);
        if (lineIndex !== undefined) setCurrentPlayingLine(lineIndex);
        
        // OpenAI TTS HD voices: onyx for male, nova for female (most natural Korean)
        const voice = isMale ? "onyx" : "nova";
        
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/korean-tts`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ text, speed: ttsSpeed, voice }),
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
          resolve();
        };
        
        audio.onerror = () => {
          setIsPlaying(false);
          setCurrentPlayingLine(null);
          URL.revokeObjectURL(audioUrl);
          reject(new Error("Audio playback failed"));
        };
        
        await audio.play();
      } catch (error) {
        console.error("TTS error:", error);
        setIsLoading(false);
        setIsPlaying(false);
        setCurrentPlayingLine(null);
        toast({
          title: t('listening.audioPlaybackError'),
          description: t('listening.tryAgain'),
          variant: "destructive",
        });
        reject(error);
      }
    });
  };

  // Play pre-generated audio URL directly
  const playPreGeneratedAudio = async (audioUrl: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        setIsLoading(true);
        const audio = new Audio(audioUrl);
        audio.playbackRate = ttsSpeed;
        
        audio.oncanplaythrough = () => {
          setIsLoading(false);
          setIsPlaying(true);
          audio.play();
        };
        
        audio.onended = () => {
          setIsPlaying(false);
          resolve();
        };
        
        audio.onerror = () => {
          setIsPlaying(false);
          setIsLoading(false);
          reject(new Error("Audio playback failed"));
        };
        
        audio.load();
      } catch (error) {
        setIsLoading(false);
        setIsPlaying(false);
        reject(error);
      }
    });
  };

  const playFullAudio = async () => {
    setPlayedAudio(true);
    
    // If pre-generated audio exists, use it (more stable, no LLM cost)
    if (currentQuestion.audioUrl) {
      try {
        await playPreGeneratedAudio(currentQuestion.audioUrl);
        return;
      } catch (error) {
        console.error("Pre-generated audio failed, falling back to TTS:", error);
        // Fall through to TTS fallback
      }
    }
    
    // Fallback: Generate TTS on-the-fly (for questions without pre-generated audio)
    if (currentQuestion.type === "dialogue") {
      if (currentQuestion.speaker1Text) {
        // Speaker 1 is male (Daniel)
        await playTTS(currentQuestion.speaker1Text, 0, true);
        // 1초 대기 (대화자 간 자연스러운 텀)
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      if (currentQuestion.speaker2Text) {
        // Speaker 2 is female (Sarah)
        await playTTS(currentQuestion.speaker2Text, 1, false);
      }
    } else if (currentQuestion.singleText) {
      await playTTS(currentQuestion.singleText, 0, false);
    }
  };

  // Speed labels for display
  const getSpeedLabel = (speed: number) => {
    if (speed >= 1.0) return t('listening.normal');
    if (speed >= 0.9) return "0.9x";
    if (speed >= 0.8) return "0.8x";
    return t('listening.slow');
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (showResult) return;
    setSelectedAnswer(answerIndex);
  };

  const handleSubmit = () => {
    if (selectedAnswer === null) {
      toast({
        title: t('listening.pleaseSelectAnswer'),
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

  const handleLevelChange = (level: TopikLevel) => {
    setTopikLevel(level);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setIsQuizComplete(false);
    setPlayedAudio(false);
  };

  const handleNewQuestions = async () => {
    await fetchListeningQuestions(topikLevel);
    handleRestart();
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
              {t('common.back')}
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
                    {t('listening.topikStyle')}
                  </motion.div>
                  <motion.h1 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-3xl sm:text-4xl font-bold text-white mb-1"
                  >
                    {t('listening.title')}
                  </motion.h1>
                  <motion.p 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-white/80"
                  >
                    {t('listening.subtitle')}
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
            {/* Speed Control Slider */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mb-6 p-4 rounded-2xl bg-card border border-border"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Gauge className="w-5 h-5" />
                  <span className="text-sm font-medium">{t('listening.speedControl')}</span>
                </div>
                <div className="flex-1">
                  <Slider
                    value={[ttsSpeed]}
                    onValueChange={(value) => setTtsSpeed(value[0])}
                    min={0.7}
                    max={1.0}
                    step={0.1}
                    className="w-full"
                    disabled={isPlaying || isLoading}
                  />
                </div>
                <span className="text-sm font-bold text-primary min-w-[90px] text-right">
                  {getSpeedLabel(ttsSpeed)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {t('listening.speedHelp')}
              </p>
            </motion.div>
          </motion.div>

          <AnimatePresence mode="wait">
            {isLoadingQuestions ? (
              /* Loading Questions Screen */
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-3xl bg-gradient-to-b from-card to-card/50 border border-border/50 shadow-2xl p-12 text-center"
              >
                <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-6" />
                <h2 className="text-xl font-bold text-foreground mb-2">{t('listening.loadingDesc')}</h2>
                <p className="text-muted-foreground">{t('listening.loadingWait')}</p>
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
                  className="w-28 h-28 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mx-auto mb-6 shadow-xl"
                >
                  <Trophy className="w-14 h-14 text-white" />
                </motion.div>

                <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                  {t('listening.listeningComplete')} 🎉
                </h2>
                <p className="text-muted-foreground mb-8 text-lg">
                  {t('listening.totalQuestions')} {listeningQuestions.length}, {t('listening.correct')} <span className="text-primary font-bold">{score}</span>
                </p>

                <div className="w-full max-w-sm mx-auto mb-8">
                  <div className="flex justify-between text-sm text-muted-foreground mb-3">
                    <span>{t('listening.accuracy')}</span>
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
                    {t('listening.playAgain')}
                  </Button>
                  <Button
                    onClick={handleNewQuestions}
                    variant="outline"
                    size="lg"
                    className="gap-2"
                    disabled={isLoadingQuestions}
                  >
                    {isLoadingQuestions ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-5 h-5" />
                    )}
                    {t('listening.newQuestionsBtn')}
                  </Button>
                  <Button
                    onClick={() => navigate("/dashboard")}
                    size="lg"
                    className="gap-2 bg-gradient-to-r from-primary to-blue-500 hover:opacity-90 text-white"
                  >
                    {t('common.backToDashboard')}
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
                      {t('listening.question')} {currentQuestionIndex + 1} / {listeningQuestions.length}
                    </span>
                    <span className="text-sm font-bold text-primary">
                      {t('listening.score')}: {score}
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
                            <span>{t('listening.dialogue')}</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-4 h-4" />
                            <span>{t('listening.single')}</span>
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
                            onClick={() => currentQuestion.speaker1Text && playTTS(currentQuestion.speaker1Text, 0, true)}
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
                                <p className="text-xs text-muted-foreground mb-1">{t('listening.speaker1')}</p>
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
                            onClick={() => currentQuestion.speaker2Text && playTTS(currentQuestion.speaker2Text, 1, false)}
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
                                <p className="text-xs text-muted-foreground mb-1">{t('listening.speaker2')}</p>
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
                          onClick={() => currentQuestion.singleText && playTTS(currentQuestion.singleText, 0, false)}
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
                              <p className="text-xs text-muted-foreground mb-2">{t('listening.playAudio')}</p>
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
                        {isPlaying ? t('listening.playing') : playedAudio ? t('listening.replay') : t('listening.playAudio')}
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
                              <p className="font-bold text-foreground mb-1">{t('listening.explanation')}</p>
                              <TranslatedExplanation 
                                explanationKo={currentQuestion.explanation} 
                                explanationVi={currentQuestion.explanationVi} 
                              />
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
                          {t('listening.submit')}
                        </Button>
                      ) : (
                        <Button
                          onClick={handleNext}
                          className="flex-1 h-14 text-lg gap-2 bg-gradient-to-r from-primary to-blue-500 hover:opacity-90 text-white rounded-xl"
                        >
                          {currentQuestionIndex < listeningQuestions.length - 1 ? (
                            <>
                              {t('listening.next')}
                              <ChevronRight className="w-5 h-5" />
                            </>
                          ) : (
                            <>
                              {t('listening.complete')}
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
