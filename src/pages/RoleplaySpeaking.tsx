import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import confetti from "canvas-confetti";
import {
  MessageCircle,
  Play,
  Volume2,
  Mic,
  MicOff,
  Send,
  Sparkles,
  RefreshCw,
  GraduationCap,
  Loader2,
  ChevronDown,
  ChevronUp,
  Trophy,
  Lightbulb,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Coffee,
  MapPin,
  ShoppingBag,
  Train,
  Phone,
  Film,
  Hotel,
  Utensils,
  Building2,
  Heart,
  Briefcase,
  Plane,
  Stethoscope,
  BookOpen,
  Users,
  PenLine,
  Zap,
  Star,
  Target,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  korean: string;
  vietnamese: string;
  pronunciation?: string;
  feedback?: {
    is_correct: boolean;
    correction?: string;
    explanation?: string;
  };
  grammarHighlight?: {
    pattern: string;
    level: string;
    usage: string;
  };
  suggestedResponses?: string[];
  scenarioContext?: string;
}

interface QuizQuestion {
  id: number;
  question: string;
  korean_context: string;
  options: { A: string; B: string; C: string; D: string };
  correct_answer: string;
  explanation: string;
  grammar_point: string;
  topik_level: string;
}

interface QuizData {
  quiz_title: string;
  based_on_conversation: string;
  questions: QuizQuestion[];
}

interface Scenario {
  id: string;
  icon: React.ElementType;
  color: string;
  bgGradient: string;
}

// 15가지 대표 시나리오
const PRESET_SCENARIOS: Scenario[] = [
  { id: "cafe", icon: Coffee, color: "text-amber-500", bgGradient: "from-amber-500/20 to-orange-500/10" },
  { id: "subway", icon: Train, color: "text-blue-500", bgGradient: "from-blue-500/20 to-cyan-500/10" },
  { id: "shopping", icon: ShoppingBag, color: "text-pink-500", bgGradient: "from-pink-500/20 to-rose-500/10" },
  { id: "direction", icon: MapPin, color: "text-green-500", bgGradient: "from-green-500/20 to-emerald-500/10" },
  { id: "phone", icon: Phone, color: "text-purple-500", bgGradient: "from-purple-500/20 to-violet-500/10" },
  { id: "movie", icon: Film, color: "text-red-500", bgGradient: "from-red-500/20 to-rose-500/10" },
  { id: "hotel", icon: Hotel, color: "text-indigo-500", bgGradient: "from-indigo-500/20 to-blue-500/10" },
  { id: "restaurant", icon: Utensils, color: "text-orange-500", bgGradient: "from-orange-500/20 to-amber-500/10" },
  { id: "bank", icon: Building2, color: "text-slate-500", bgGradient: "from-slate-500/20 to-gray-500/10" },
  { id: "dating", icon: Heart, color: "text-rose-500", bgGradient: "from-rose-500/20 to-pink-500/10" },
  { id: "interview", icon: Briefcase, color: "text-teal-500", bgGradient: "from-teal-500/20 to-cyan-500/10" },
  { id: "airport", icon: Plane, color: "text-sky-500", bgGradient: "from-sky-500/20 to-blue-500/10" },
  { id: "hospital", icon: Stethoscope, color: "text-emerald-500", bgGradient: "from-emerald-500/20 to-green-500/10" },
  { id: "school", icon: BookOpen, color: "text-yellow-500", bgGradient: "from-yellow-500/20 to-amber-500/10" },
  { id: "meeting", icon: Users, color: "text-cyan-500", bgGradient: "from-cyan-500/20 to-teal-500/10" },
];

// 레벨 옵션
const LEVEL_OPTIONS = [
  { id: "topik1", label: "TOPIK I (1-2급)", badge: "초급", color: "bg-green-500" },
  { id: "topik2", label: "TOPIK II (3-6급)", badge: "중고급", color: "bg-blue-500" },
];

// 난이도 옵션
const DIFFICULTY_OPTIONS = [
  { id: "easy", icon: Zap, color: "text-green-500", bgColor: "bg-green-500/10 border-green-500/30" },
  { id: "medium", icon: Target, color: "text-amber-500", bgColor: "bg-amber-500/10 border-amber-500/30" },
  { id: "hard", icon: Flame, color: "text-red-500", bgColor: "bg-red-500/10 border-red-500/30" },
];

export default function RoleplaySpeaking() {
  const { t } = useTranslation();
  
  // Setup states
  const [selectedLevel, setSelectedLevel] = useState<string>("topik1");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("medium");
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [customScenario, setCustomScenario] = useState("");
  const [isSetupComplete, setIsSetupComplete] = useState(false);

  // Chat states
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Quiz states
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [expandedGrammar, setExpandedGrammar] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  // Confetti effect for scenario selection
  const triggerConfetti = useCallback((e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;
    
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { x, y },
      colors: ['#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6'],
      ticks: 100,
      gravity: 1.2,
      decay: 0.94,
      startVelocity: 20,
      shapes: ['circle', 'square'],
    });
  }, []);


  // Start roleplay
  const startRoleplay = async () => {
    const scenario = customScenario.trim() || selectedScenario;
    if (!scenario) {
      toast.error(t("roleplay.toast.selectScenario"));
      return;
    }

    setIsLoading(true);
    setMessages([]);
    setShowQuiz(false);
    setQuizData(null);
    setIsSetupComplete(true);

    try {
      const { data, error } = await supabase.functions.invoke("roleplay-speak", {
        body: { 
          action: "start_roleplay",
          level: selectedLevel,
          difficulty: selectedDifficulty,
          scenarioId: customScenario.trim() ? "custom" : selectedScenario,
          customScenario: customScenario.trim() || undefined,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const result = data.data;
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        korean: result.korean_response,
        vietnamese: result.vietnamese_meaning,
        pronunciation: result.pronunciation,
        suggestedResponses: result.suggested_responses,
        scenarioContext: result.scenario_context,
        grammarHighlight: result.grammar_highlight,
      };

      setMessages([newMessage]);
      toast.success(t("roleplay.toast.started"));
    } catch (error: any) {
      console.error("Start roleplay error:", error);
      toast.error(error.message || t("roleplay.toast.startFailed"));
      setIsSetupComplete(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Send user message
  const sendMessage = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText || isLoading) return;

    setInputText("");
    setIsLoading(true);

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      korean: messageText,
      vietnamese: "",
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.korean,
      }));

      const { data, error } = await supabase.functions.invoke("roleplay-speak", {
        body: {
          action: "continue_roleplay",
          messages: [{ role: "user", content: messageText }],
          conversationHistory: [...conversationHistory, { role: "user", content: messageText }],
          level: selectedLevel,
          difficulty: selectedDifficulty,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const result = data.data;

      setMessages(prev => prev.map(m => 
        m.id === userMessage.id 
          ? { ...m, feedback: result.feedback }
          : m
      ));

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        korean: result.korean_response,
        vietnamese: result.vietnamese_meaning,
        pronunciation: result.pronunciation,
        suggestedResponses: result.suggested_responses,
        scenarioContext: result.scenario_context,
        grammarHighlight: result.grammar_highlight,
      };

      setMessages(prev => [...prev, assistantMessage]);

      setTimeout(() => {
        chatContainerRef.current?.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 100);

    } catch (error: any) {
      console.error("Send message error:", error);
      toast.error(error.message || t("roleplay.toast.sendFailed"));
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  // Generate quiz
  const generateQuiz = async () => {
    if (messages.length < 2) {
      toast.error(t("roleplay.toast.needConversation"));
      return;
    }

    setIsGeneratingQuiz(true);

    try {
      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.korean,
      }));

      const { data, error } = await supabase.functions.invoke("roleplay-speak", {
        body: {
          action: "generate_quiz",
          conversationHistory,
          level: selectedLevel,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setQuizData(data.data);
      setShowQuiz(true);
      setCurrentQuizIndex(0);
      setSelectedAnswers({});
      setShowResults(false);
      toast.success(t("roleplay.toast.quizCreated"));
    } catch (error: any) {
      console.error("Generate quiz error:", error);
      toast.error(error.message || t("roleplay.toast.quizFailed"));
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  // TTS
  const handleSpeak = async (text: string) => {
    if (!text.trim() || isSpeaking) return;

    setIsSpeaking(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text }),
        }
      );

      if (!response.ok) throw new Error("TTS failed");

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.pause();
      }

      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsSpeaking(false);
      audioRef.current.onerror = () => {
        setIsSpeaking(false);
        toast.error(t("roleplay.toast.audioFailed"));
      };
      await audioRef.current.play();
    } catch (error) {
      console.error("TTS error:", error);
      setIsSpeaking(false);
      toast.error(t("roleplay.toast.audioFailed"));
    }
  };

  // Voice recording
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());

        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(",")[1];

          try {
            const { data, error } = await supabase.functions.invoke("korean-stt", {
              body: { audio: base64, language: "ko" },
            });

            if (error) throw error;
            if (data.text) {
              setInputText(data.text);
              toast.success(t("roleplay.toast.sttSuccess"));
            }
          } catch (err: any) {
            console.error("STT error:", err);
            toast.error(t("roleplay.toast.sttFailed"));
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.info(t("roleplay.toast.recording"));
    } catch (error) {
      console.error("Recording error:", error);
      toast.error(t("roleplay.toast.micDenied"));
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Quiz functions
  const selectAnswer = (questionId: number, answer: string) => {
    setSelectedAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const calculateScore = () => {
    if (!quizData) return 0;
    let correct = 0;
    quizData.questions.forEach(q => {
      if (selectedAnswers[q.id] === q.correct_answer) {
        correct++;
      }
    });
    return correct;
  };

  // Reset to setup
  const resetToSetup = () => {
    setIsSetupComplete(false);
    setMessages([]);
    setShowQuiz(false);
    setQuizData(null);
    setCustomScenario("");
    setSelectedScenario(null);
  };

  // Render Setup UI
  const renderSetupUI = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto"
    >
      {/* Level Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-primary" />
          {t("roleplay.setup.levelTitle")}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {LEVEL_OPTIONS.map((level, index) => {
            const isSelected = selectedLevel === level.id;
            return (
              <motion.button
                key={level.id}
                initial={{ opacity: 0, x: index === 0 ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ 
                  scale: 1.03, 
                  y: -4,
                  transition: { type: "spring", stiffness: 400, damping: 15 }
                }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedLevel(level.id)}
                className={cn(
                  "relative p-6 rounded-2xl border-2 transition-all duration-500 text-left group overflow-hidden",
                  isSelected
                    ? "border-primary shadow-2xl shadow-primary/25 bg-primary/5"
                    : "border-border/50 hover:border-primary/60 hover:shadow-xl hover:shadow-primary/15 bg-card"
                )}
              >
                {/* Animated gradient background */}
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent transition-opacity duration-500",
                  isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-60"
                )} />
                
                {/* Shimmer effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                </div>
                
                {/* Glow ring */}
                <div className={cn(
                  "absolute inset-0 rounded-2xl transition-all duration-500",
                  isSelected 
                    ? "ring-4 ring-primary/20 ring-offset-2 ring-offset-background" 
                    : "ring-0 group-hover:ring-2 group-hover:ring-primary/10"
                )} />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <motion.div whileHover={{ scale: 1.1 }} transition={{ type: "spring", stiffness: 400 }}>
                      <Badge variant="secondary" className={cn(
                        "text-white px-3 py-1 text-sm font-bold shadow-lg",
                        level.color,
                        isSelected && "shadow-lg"
                      )}>
                        {level.badge}
                      </Badge>
                    </motion.div>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        <div className="relative">
                          <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-30" />
                          <CheckCircle2 className="w-6 h-6 text-primary" />
                        </div>
                      </motion.div>
                    )}
                  </div>
                  <p className={cn(
                    "font-bold text-lg transition-colors duration-300",
                    isSelected ? "text-primary" : "text-foreground group-hover:text-primary/80"
                  )}>
                    {level.label}
                  </p>
                </div>
                
                {/* Bottom accent line */}
                <div className={cn(
                  "absolute bottom-0 left-1/2 -translate-x-1/2 h-1 rounded-full transition-all duration-500",
                  isSelected 
                    ? "w-20 bg-primary" 
                    : "w-0 group-hover:w-12 bg-primary/50"
                )} />
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Difficulty Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          {t("roleplay.setup.difficultyTitle")}
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {DIFFICULTY_OPTIONS.map((diff, index) => {
            const Icon = diff.icon;
            const isSelected = selectedDifficulty === diff.id;
            const colorClass = diff.id === "easy" ? "green" : diff.id === "medium" ? "amber" : "red";
            
            return (
              <motion.button
                key={diff.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ 
                  scale: 1.08, 
                  y: -6,
                  transition: { type: "spring", stiffness: 400, damping: 15 }
                }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedDifficulty(diff.id)}
                className={cn(
                  "relative p-5 rounded-2xl border-2 transition-all duration-500 flex flex-col items-center gap-3 group overflow-hidden",
                  isSelected
                    ? `border-${colorClass}-500/60 shadow-2xl shadow-${colorClass}-500/25 ${diff.bgColor}`
                    : "border-border/50 hover:border-primary/60 hover:shadow-xl hover:shadow-primary/15 bg-card"
                )}
              >
                {/* Background gradient */}
                <div className={cn(
                  "absolute inset-0 transition-opacity duration-500",
                  `bg-gradient-to-br from-${colorClass}-500/20 to-${colorClass}-500/5`,
                  isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-60"
                )} />
                
                {/* Shimmer effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                </div>
                
                {/* Glow ring */}
                <div className={cn(
                  "absolute inset-0 rounded-2xl transition-all duration-500",
                  isSelected 
                    ? `ring-4 ring-${colorClass}-500/20 ring-offset-2 ring-offset-background` 
                    : "ring-0 group-hover:ring-2 group-hover:ring-primary/10"
                )} />
                
                {/* Icon container with effects */}
                <motion.div 
                  className="relative z-10"
                  whileHover={{ rotate: [0, -10, 10, -5, 5, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  <div className={cn(
                    "w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300",
                    isSelected 
                      ? `bg-${colorClass}-500/20 shadow-lg shadow-${colorClass}-500/30` 
                      : "bg-muted/50 group-hover:bg-primary/10 group-hover:shadow-md"
                  )}>
                    <Icon className={cn(
                      "w-8 h-8 transition-all duration-300",
                      diff.color,
                      "group-hover:scale-110"
                    )} />
                  </div>
                </motion.div>
                
                {/* Label */}
                <span className={cn(
                  "relative z-10 font-semibold transition-all duration-300",
                  isSelected ? diff.color : "text-foreground/80 group-hover:text-foreground"
                )}>
                  {t(`roleplay.difficulty.${diff.id}`)}
                </span>
                
                {/* Selected indicator with pulse */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="absolute -top-2 -right-2"
                  >
                    <div className="relative">
                      <div className={cn("absolute inset-0 rounded-full animate-ping opacity-30", `bg-${colorClass}-500`)} />
                      <div className={cn("relative rounded-full p-1 shadow-lg", `bg-${colorClass}-500 shadow-${colorClass}-500/50`)}>
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  </motion.div>
                )}
                
                {/* Bottom accent line */}
                <div className={cn(
                  "absolute bottom-0 left-1/2 -translate-x-1/2 h-1 rounded-full transition-all duration-500",
                  isSelected 
                    ? `w-12 bg-${colorClass}-500` 
                    : `w-0 group-hover:w-8 bg-${colorClass}-500/50`
                )} />
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Scenario Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-8"
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          {t("roleplay.setup.scenarioTitle")}
        </h3>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
          {PRESET_SCENARIOS.map((scenario, index) => {
            const Icon = scenario.icon;
            const isSelected = selectedScenario === scenario.id && !customScenario;
            return (
              <motion.button
                key={scenario.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                whileHover={{ 
                  scale: 1.08, 
                  y: -8,
                  transition: { type: "spring", stiffness: 400, damping: 15 }
                }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  if (selectedScenario !== scenario.id) {
                    triggerConfetti(e);
                  }
                  setSelectedScenario(scenario.id);
                  setCustomScenario("");
                }}
                className={cn(
                  "relative p-5 rounded-2xl border-2 transition-all duration-500 flex flex-col items-center gap-3 group overflow-hidden",
                  isSelected
                    ? "border-primary shadow-2xl shadow-primary/30 bg-primary/5"
                    : "border-border/50 hover:border-primary/60 hover:shadow-xl hover:shadow-primary/20 bg-card"
                )}
              >
                {/* Animated gradient background */}
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-br transition-all duration-500",
                  scenario.bgGradient,
                  isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-80"
                )} />
                
                {/* Shimmer effect on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                </div>
                
                {/* Glow ring effect */}
                <div className={cn(
                  "absolute inset-0 rounded-2xl transition-all duration-500",
                  isSelected 
                    ? "ring-4 ring-primary/20 ring-offset-2 ring-offset-background" 
                    : "ring-0 group-hover:ring-2 group-hover:ring-primary/10"
                )} />
                
                {/* Icon with float animation */}
                <motion.div 
                  className="relative z-10"
                  whileHover={{ rotate: [0, -10, 10, -5, 5, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  <div className={cn(
                    "w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300",
                    isSelected 
                      ? "bg-primary/20 shadow-lg shadow-primary/30" 
                      : "bg-muted/50 group-hover:bg-primary/10 group-hover:shadow-md"
                  )}>
                    <Icon className={cn(
                      "w-7 h-7 transition-all duration-300",
                      scenario.color,
                      "group-hover:scale-110"
                    )} />
                  </div>
                </motion.div>
                
                {/* Label */}
                <span className={cn(
                  "relative z-10 text-xs font-semibold text-center transition-all duration-300",
                  isSelected ? "text-primary" : "text-foreground/80 group-hover:text-foreground"
                )}>
                  {t(`roleplay.scenarios.${scenario.id}`)}
                </span>
                
                {/* Selected indicator with pulse */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="absolute -top-2 -right-2"
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-30" />
                      <div className="relative bg-primary rounded-full p-1 shadow-lg shadow-primary/50">
                        <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                      </div>
                    </div>
                  </motion.div>
                )}
                
                {/* Bottom accent line */}
                <div className={cn(
                  "absolute bottom-0 left-1/2 -translate-x-1/2 h-1 rounded-full transition-all duration-500",
                  isSelected 
                    ? "w-12 bg-primary" 
                    : "w-0 group-hover:w-8 bg-primary/50"
                )} />
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Custom Scenario Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-8"
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <PenLine className="w-5 h-5 text-primary" />
          {t("roleplay.setup.customTitle")}
        </h3>
        <div className="relative">
          <Input
            value={customScenario}
            onChange={(e) => {
              setCustomScenario(e.target.value);
              if (e.target.value.trim()) setSelectedScenario(null);
            }}
            placeholder={t("roleplay.setup.customPlaceholder")}
            className="h-14 text-lg pl-5 pr-14 rounded-xl border-2 focus:border-primary"
          />
          {customScenario.trim() && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute right-4 top-1/2 -translate-y-1/2"
            >
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </motion.div>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {t("roleplay.setup.customHint")}
        </p>
      </motion.div>

      {/* Start Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex justify-center"
      >
        <Button
          size="lg"
          onClick={startRoleplay}
          disabled={isLoading || (!selectedScenario && !customScenario.trim())}
          className="h-14 px-10 text-lg gap-3 rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Play className="w-5 h-5" />
          )}
          {t("roleplay.actions.startRoleplay")}
        </Button>
      </motion.div>
    </motion.div>
  );

  // Render Chat UI
  const renderChatUI = () => (
    <div className="max-w-4xl mx-auto grid lg:grid-cols-3 gap-6">
      {/* Chat Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="lg:col-span-2"
      >
        <Card className="premium-card overflow-hidden h-[600px] flex flex-col">
          {/* Header with settings */}
          <div className="px-4 py-3 bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="gap-1">
                <GraduationCap className="w-3 h-3" />
                {selectedLevel === "topik1" ? "TOPIK I" : "TOPIK II"}
              </Badge>
              <Badge variant="outline" className={cn(
                "gap-1",
                selectedDifficulty === "easy" ? "text-green-500" :
                selectedDifficulty === "medium" ? "text-amber-500" : "text-red-500"
              )}>
                {selectedDifficulty === "easy" && <Zap className="w-3 h-3" />}
                {selectedDifficulty === "medium" && <Target className="w-3 h-3" />}
                {selectedDifficulty === "hard" && <Flame className="w-3 h-3" />}
                {t(`roleplay.difficulty.${selectedDifficulty}`)}
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={resetToSetup} className="gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              {t("roleplay.actions.changeSettings")}
            </Button>
          </div>

          {/* Scenario Context */}
          {messages.length > 0 && messages[0].scenarioContext && (
            <div className="px-4 py-2 bg-muted/50 border-b border-border">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">{t("roleplay.labels.scenario")}</span>
                <span className="font-medium">{messages[0].scenarioContext}</span>
              </div>
            </div>
          )}

          {/* Chat Messages */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl p-4",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    )}
                  >
                    <p className="text-lg font-medium mb-1">{message.korean}</p>

                    {message.role === "assistant" && (
                      <>
                        <p className="text-sm opacity-80 mb-1">{message.vietnamese}</p>
                        {message.pronunciation && (
                          <p className="text-xs opacity-60 italic">{message.pronunciation}</p>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSpeak(message.korean)}
                          disabled={isSpeaking}
                          className="mt-2 h-7 text-xs"
                        >
                          <Volume2 className={`w-3 h-3 mr-1 ${isSpeaking ? "animate-pulse" : ""}`} />
                          {t("roleplay.actions.listen")}
                        </Button>

                        {message.grammarHighlight && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <button
                              onClick={() => setExpandedGrammar(
                                expandedGrammar === message.id ? null : message.id
                              )}
                              className="flex items-center gap-2 text-xs text-primary"
                            >
                              <GraduationCap className="w-3 h-3" />
                              <span>{message.grammarHighlight.pattern}</span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {message.grammarHighlight.level}
                              </Badge>
                              {expandedGrammar === message.id ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                            {expandedGrammar === message.id && (
                              <p className="mt-2 text-xs text-muted-foreground">
                                {message.grammarHighlight.usage}
                              </p>
                            )}
                          </div>
                        )}

                        {message.suggestedResponses && message.suggestedResponses.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                              <Lightbulb className="w-3 h-3" /> {t("roleplay.labels.suggestions")}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {message.suggestedResponses.map((suggestion, i) => (
                                <Button
                                  key={i}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => sendMessage(suggestion)}
                                  className="h-7 text-xs"
                                >
                                  {suggestion}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {message.role === "user" && message.feedback && (
                      <div className="mt-2 pt-2 border-t border-primary-foreground/20">
                        <div className="flex items-center gap-1.5 text-xs">
                          {message.feedback.is_correct ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-300" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-red-300" />
                          )}
                          <span className={message.feedback.is_correct ? "text-green-200" : "text-red-200"}>
                            {message.feedback.is_correct ? t("roleplay.feedback.good") : t("roleplay.feedback.needsFix")}
                          </span>
                        </div>
                        {message.feedback.correction && (
                          <p className="text-xs mt-1 opacity-90">
                            ✓ {message.feedback.correction}
                          </p>
                        )}
                        {message.feedback.explanation && (
                          <p className="text-xs mt-1 opacity-75">
                            {message.feedback.explanation}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-md p-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-border bg-background/50">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                className={isRecording ? "text-destructive animate-pulse" : ""}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>

              <Input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder={t("roleplay.placeholders.input")}
                className="flex-1"
                disabled={isLoading}
              />

              <Button
                onClick={() => sendMessage()}
                disabled={!inputText.trim() || isLoading}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={startRoleplay}
                disabled={isLoading}
                className="gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {t("roleplay.actions.newScenario")}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={generateQuiz}
                disabled={isGeneratingQuiz || messages.length < 2}
                className="gap-1.5"
              >
                {isGeneratingQuiz ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trophy className="w-3.5 h-3.5" />
                )}
                {t("roleplay.actions.makeQuiz")}
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Side Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        {/* Quiz Panel */}
        {showQuiz && quizData ? (
          <Card className="premium-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                {quizData.quiz_title}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowQuiz(false)}
              >
                ✕
              </Button>
            </div>

            {!showResults ? (
              <div className="space-y-4">
                <div className="text-xs text-muted-foreground">
                  {t("roleplay.quiz.progress", { current: currentQuizIndex + 1, total: quizData.questions.length })}
                </div>

                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm italic text-muted-foreground mb-2">
                    {quizData.questions[currentQuizIndex].korean_context}
                  </p>
                  <p className="font-medium">
                    {quizData.questions[currentQuizIndex].question}
                  </p>
                </div>

                <div className="space-y-2">
                  {Object.entries(quizData.questions[currentQuizIndex].options).map(
                    ([key, value]) => (
                      <button
                        key={key}
                        onClick={() =>
                          selectAnswer(quizData.questions[currentQuizIndex].id, key)
                        }
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          selectedAnswers[quizData.questions[currentQuizIndex].id] === key
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <span className="font-medium mr-2">{key}.</span>
                        {value}
                      </button>
                    )
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  {currentQuizIndex > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentQuizIndex((i) => i - 1)}
                    >
                      {t("roleplay.actions.prev")}
                    </Button>
                  )}
                  {currentQuizIndex < quizData.questions.length - 1 ? (
                    <Button
                      size="sm"
                      onClick={() => setCurrentQuizIndex((i) => i + 1)}
                      disabled={!selectedAnswers[quizData.questions[currentQuizIndex].id]}
                    >
                      {t("roleplay.actions.next")}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => setShowResults(true)}
                      disabled={Object.keys(selectedAnswers).length < quizData.questions.length}
                    >
                      {t("roleplay.actions.showResults")}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center p-4 bg-primary/10 rounded-lg">
                  <div className="text-3xl font-bold text-primary mb-1">
                    {calculateScore()}/{quizData.questions.length}
                  </div>
                  <p className="text-sm text-muted-foreground">{t("roleplay.quiz.yourScore")}</p>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {quizData.questions.map((q) => {
                    const isCorrect = selectedAnswers[q.id] === q.correct_answer;
                    return (
                      <div
                        key={q.id}
                        className={`p-3 rounded-lg border ${
                          isCorrect ? "border-green-500/50 bg-green-500/10" : "border-red-500/50 bg-red-500/10"
                        }`}
                      >
                        <div className="flex items-start gap-2 text-sm">
                          {isCorrect ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 mt-0.5" />
                          )}
                          <div>
                            <p className="font-medium">{q.question}</p>
                            {!isCorrect && (
                              <p className="text-xs mt-1 text-muted-foreground">
                                {t("roleplay.quiz.correctAnswer", { answer: q.correct_answer })}
                              </p>
                            )}
                            <p className="text-xs mt-1 text-muted-foreground">{q.explanation}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setShowQuiz(false);
                    setShowResults(false);
                    setSelectedAnswers({});
                    setCurrentQuizIndex(0);
                  }}
                >
                  {t("roleplay.actions.closeQuiz")}
                </Button>
              </div>
            )}
          </Card>
        ) : (
          <Card className="premium-card p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-primary" />
              {t("roleplay.tips.title")}
            </h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary">1.</span>
                {t("roleplay.tips.step1")}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">2.</span>
                {t("roleplay.tips.step2")}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">3.</span>
                {t("roleplay.tips.step3")}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">4.</span>
                {t("roleplay.tips.step4")}
              </li>
            </ul>

            <div className="mt-4 p-3 bg-primary/10 rounded-lg">
              <p className="text-xs text-muted-foreground">
                💡 <strong>{t("roleplay.tips.tipLabel")}</strong> {t("roleplay.tips.tipText")}
              </p>
            </div>
          </Card>
        )}

        {/* Stats Card */}
        <Card className="premium-card p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" />
            {t("roleplay.stats.title")}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20">
              <div className="text-2xl font-bold text-primary">
                {messages.filter((m) => m.role === "user").length}
              </div>
              <div className="text-xs text-muted-foreground">{t("roleplay.stats.spoken")}</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-xl border border-green-500/20">
              <div className="text-2xl font-bold text-green-500">
                {messages.filter((m) => m.feedback?.is_correct).length}
              </div>
              <div className="text-xs text-muted-foreground">{t("roleplay.stats.correct")}</div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CleanHeader />

      <main className="flex-1 pb-24">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-8 lg:py-12">
          <div className="absolute inset-0 pointer-events-none">
            <div className="blob-primary w-96 h-96 -top-48 -left-48 opacity-20" />
            <div className="blob-secondary w-80 h-80 -bottom-40 -right-40 opacity-15" />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
                <MessageCircle className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">{t("roleplay.badge")}</span>
              </div>
              <h1 className="text-2xl lg:text-4xl font-bold mb-3">
                🎭 <span className="text-gradient-primary">{t("roleplay.title")}</span>
              </h1>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {t("roleplay.subtitle")}
              </p>
            </motion.div>

            {/* Main Content */}
            {!isSetupComplete ? renderSetupUI() : renderChatUI()}
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
