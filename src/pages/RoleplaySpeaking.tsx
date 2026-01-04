import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import confetti from "canvas-confetti";
import {
  MessageCircle,
  Play,
  Volume2,
  VolumeX,
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
  Zap,
  Target,
  Flame,
  Settings,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  korean: string;
  vietnamese: string;
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
}

// 15가지 대표 시나리오
const PRESET_SCENARIOS: Scenario[] = [
  { id: "cafe", icon: Coffee, color: "text-amber-500" },
  { id: "subway", icon: Train, color: "text-blue-500" },
  { id: "shopping", icon: ShoppingBag, color: "text-pink-500" },
  { id: "direction", icon: MapPin, color: "text-green-500" },
  { id: "phone", icon: Phone, color: "text-purple-500" },
  { id: "movie", icon: Film, color: "text-red-500" },
  { id: "hotel", icon: Hotel, color: "text-indigo-500" },
  { id: "restaurant", icon: Utensils, color: "text-orange-500" },
  { id: "bank", icon: Building2, color: "text-slate-500" },
  { id: "dating", icon: Heart, color: "text-rose-500" },
  { id: "interview", icon: Briefcase, color: "text-teal-500" },
  { id: "airport", icon: Plane, color: "text-sky-500" },
  { id: "hospital", icon: Stethoscope, color: "text-emerald-500" },
  { id: "school", icon: BookOpen, color: "text-yellow-500" },
  { id: "meeting", icon: Users, color: "text-cyan-500" },
];

// 레벨 옵션 - badge는 컴포넌트에서 t()로 처리
const LEVEL_OPTIONS = [
  { id: "topik1", label: "TOPIK I", badgeKey: "roleplay.level.beginner" },
  { id: "topik2", label: "TOPIK II", badgeKey: "roleplay.level.intermediate" },
];

// 난이도 옵션
const DIFFICULTY_OPTIONS = [
  { id: "easy", icon: Zap, color: "text-green-500" },
  { id: "medium", icon: Target, color: "text-amber-500" },
  { id: "hard", icon: Flame, color: "text-red-500" },
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
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  // TTS settings
  const [ttsSpeed, setTtsSpeed] = useState<number>(1.0);
  const [showSettings, setShowSettings] = useState(false);

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

  // Auto scroll on new messages
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  // Confetti effect for scenario selection
  const triggerConfetti = useCallback((e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;
    
    confetti({
      particleCount: 30,
      spread: 50,
      origin: { x, y },
      colors: ['#8B5CF6', '#EC4899', '#10B981'],
      ticks: 80,
      gravity: 1.2,
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
        suggestedResponses: result.suggested_responses,
        scenarioContext: result.scenario_context,
        grammarHighlight: result.grammar_highlight,
      };

      setMessages([newMessage]);
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
        suggestedResponses: result.suggested_responses,
        scenarioContext: result.scenario_context,
        grammarHighlight: result.grammar_highlight,
      };

      setMessages(prev => [...prev, assistantMessage]);

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

  // TTS - OpenAI TTS HD (korean-tts edge function)
  const handleSpeak = async (text: string, messageId: string) => {
    if (!text.trim()) return;

    // If already speaking this message, stop it
    if (speakingMessageId === messageId && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsSpeaking(false);
      setSpeakingMessageId(null);
      return;
    }

    // Stop any current audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setIsSpeaking(true);
    setSpeakingMessageId(messageId);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/korean-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            text, 
            voice: "nova", // Most natural for Korean
            speed: ttsSpeed 
          }),
        }
      );

      if (!response.ok) throw new Error("TTS failed");

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => {
        setIsSpeaking(false);
        setSpeakingMessageId(null);
      };
      audioRef.current.onerror = () => {
        setIsSpeaking(false);
        setSpeakingMessageId(null);
        toast.error(t("roleplay.toast.audioFailed"));
      };
      await audioRef.current.play();
    } catch (error) {
      console.error("TTS error:", error);
      setIsSpeaking(false);
      setSpeakingMessageId(null);
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

  // Render Setup UI - Simplified
  const renderSetupUI = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-lg mx-auto px-4"
    >
      {/* Level Selection */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground mb-2">{t("roleplay.setup.levelTitle")}</p>
        <div className="flex gap-2">
          {LEVEL_OPTIONS.map((level) => (
            <button
              key={level.id}
              onClick={() => setSelectedLevel(level.id)}
              className={cn(
                "flex-1 py-3 px-4 rounded-xl border-2 transition-all text-sm font-medium",
                selectedLevel === level.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50"
              )}
            >
              {level.label}
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty Selection */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground mb-2">{t("roleplay.setup.difficultyTitle")}</p>
        <div className="flex gap-2">
          {DIFFICULTY_OPTIONS.map((diff) => {
            const Icon = diff.icon;
            return (
              <button
                key={diff.id}
                onClick={() => setSelectedDifficulty(diff.id)}
                className={cn(
                  "flex-1 py-3 px-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2",
                  selectedDifficulty === diff.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
              >
                <Icon className={cn("w-4 h-4", diff.color)} />
                <span className="text-sm font-medium">{t(`roleplay.difficulty.${diff.id}`)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scenario Selection - Compact Grid */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground mb-2">{t("roleplay.setup.scenarioTitle")}</p>
        <div className="grid grid-cols-5 gap-2">
          {PRESET_SCENARIOS.map((scenario) => {
            const Icon = scenario.icon;
            const isSelected = selectedScenario === scenario.id && !customScenario;
            return (
              <button
                key={scenario.id}
                onClick={(e) => {
                  if (selectedScenario !== scenario.id) triggerConfetti(e);
                  setSelectedScenario(scenario.id);
                  setCustomScenario("");
                }}
                className={cn(
                  "aspect-square rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 p-2",
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
              >
                <Icon className={cn("w-5 h-5", scenario.color)} />
                <span className="text-[10px] text-muted-foreground line-clamp-1">
                  {t(`roleplay.scenarios.${scenario.id}`)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Scenario Input */}
      <div className="mb-6">
        <Input
          value={customScenario}
          onChange={(e) => {
            setCustomScenario(e.target.value);
            if (e.target.value.trim()) setSelectedScenario(null);
          }}
          placeholder={t("roleplay.setup.customPlaceholder")}
          className="h-12 rounded-xl"
        />
      </div>

      {/* Start Button */}
      <Button
        size="lg"
        onClick={startRoleplay}
        disabled={isLoading || (!selectedScenario && !customScenario.trim())}
        className="w-full h-12 rounded-xl gap-2"
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Play className="w-5 h-5" />
        )}
        {t("roleplay.actions.startRoleplay")}
      </Button>
    </motion.div>
  );

  // Render Chat UI - ChatGPT Style
  const renderChatUI = () => (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-2xl mx-auto">
      {/* Minimal Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
        <button onClick={resetToSetup} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">{t("roleplay.actions.back")}</span>
        </button>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {selectedLevel === "topik1" ? "TOPIK I" : "TOPIK II"}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {t(`roleplay.difficulty.${selectedDifficulty}`)}
          </Badge>
        </div>
        <button 
          onClick={() => setShowSettings(!showSettings)} 
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <Settings className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border/50"
          >
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">TTS {t("roleplay.settings.speed")}</span>
                <span className="text-sm font-medium">{ttsSpeed.toFixed(1)}x</span>
              </div>
              <Slider
                value={[ttsSpeed]}
                onValueChange={(v) => setTtsSpeed(v[0])}
                min={0.5}
                max={2.0}
                step={0.1}
                className="w-full"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Messages - Full Height */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
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
                  "max-w-[85%] rounded-2xl px-4 py-3",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {/* Korean Text */}
                <p className="text-base leading-relaxed">{message.korean}</p>

                {/* Translation - Only for assistant */}
                {message.role === "assistant" && message.vietnamese && (
                  <p className="text-sm opacity-70 mt-1">{message.vietnamese}</p>
                )}

                {/* Assistant Actions */}
                {message.role === "assistant" && (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => handleSpeak(message.korean, message.id)}
                      disabled={isSpeaking && speakingMessageId !== message.id}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        speakingMessageId === message.id 
                          ? "bg-primary/20 text-primary" 
                          : "hover:bg-background/50 text-muted-foreground"
                      )}
                    >
                      {speakingMessageId === message.id ? (
                        <VolumeX className="w-4 h-4 animate-pulse" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                )}

                {/* Grammar Highlight - Collapsible */}
                {message.role === "assistant" && message.grammarHighlight && (
                  <div className="mt-3 pt-2 border-t border-border/30">
                    <button
                      onClick={() => setExpandedGrammar(
                        expandedGrammar === message.id ? null : message.id
                      )}
                      className="flex items-center gap-2 text-xs text-primary/80"
                    >
                      <GraduationCap className="w-3 h-3" />
                      <span>{message.grammarHighlight.pattern}</span>
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
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

                {/* Suggested Responses */}
                {message.role === "assistant" && message.suggestedResponses && message.suggestedResponses.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-border/30">
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" /> {t("roleplay.labels.suggestions")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {message.suggestedResponses.map((suggestion, i) => (
                        <button
                          key={i}
                          onClick={() => sendMessage(suggestion)}
                          className="text-xs px-2.5 py-1.5 rounded-full bg-background/50 hover:bg-background border border-border/50 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* User Feedback */}
                {message.role === "user" && message.feedback && (
                  <div className="mt-2 pt-2 border-t border-primary-foreground/20">
                    <div className="flex items-center gap-1.5 text-xs">
                      {message.feedback.is_correct ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-300" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-red-300" />
                      )}
                      <span className={message.feedback.is_correct ? "text-green-200" : "text-red-200"}>
                        {message.feedback.is_correct ? "✓" : "△"}
                      </span>
                    </div>
                    {message.feedback.correction && (
                      <p className="text-xs mt-1 opacity-90">→ {message.feedback.correction}</p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl px-4 py-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          </div>
        )}
      </div>

      {/* Input Area - Fixed Bottom */}
      <div className="border-t border-border/50 p-4 bg-background">
        <div className="flex gap-2">
          <button
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            className={cn(
              "p-3 rounded-xl transition-colors",
              isRecording 
                ? "bg-destructive text-destructive-foreground animate-pulse" 
                : "bg-muted hover:bg-muted/80"
            )}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder={t("roleplay.placeholders.input")}
            className="flex-1 h-12 rounded-xl"
            disabled={isLoading}
          />

          <button
            onClick={() => sendMessage()}
            disabled={!inputText.trim() || isLoading}
            className={cn(
              "p-3 rounded-xl transition-colors",
              inputText.trim() 
                ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                : "bg-muted text-muted-foreground"
            )}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={startRoleplay}
            disabled={isLoading}
            className="gap-1.5 text-xs h-8"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {t("roleplay.actions.restart")}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={generateQuiz}
            disabled={isGeneratingQuiz || messages.length < 2}
            className="gap-1.5 text-xs h-8"
          >
            {isGeneratingQuiz ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trophy className="w-3.5 h-3.5" />
            )}
            {t("roleplay.actions.quiz")}
          </Button>
        </div>
      </div>

      {/* Quiz Modal */}
      <AnimatePresence>
        {showQuiz && quizData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-card rounded-2xl border border-border p-6 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  {quizData.quiz_title}
                </h3>
                <button onClick={() => setShowQuiz(false)} className="text-muted-foreground hover:text-foreground">
                  ✕
                </button>
              </div>

              {!showResults ? (
                <div className="space-y-4">
                  <div className="text-xs text-muted-foreground">
                    {currentQuizIndex + 1} / {quizData.questions.length}
                  </div>

                  <div className="p-3 bg-muted/50 rounded-xl">
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
                          onClick={() => selectAnswer(quizData.questions[currentQuizIndex].id, key)}
                          className={cn(
                            "w-full text-left p-3 rounded-xl border transition-all text-sm",
                            selectedAnswers[quizData.questions[currentQuizIndex].id] === key
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          )}
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
                  <div className="text-center p-4 bg-primary/10 rounded-xl">
                    <div className="text-3xl font-bold text-primary mb-1">
                      {calculateScore()}/{quizData.questions.length}
                    </div>
                    <p className="text-sm text-muted-foreground">{t("roleplay.quiz.yourScore")}</p>
                  </div>

                  <div className="space-y-3 max-h-[200px] overflow-y-auto">
                    {quizData.questions.map((q) => {
                      const isCorrect = selectedAnswers[q.id] === q.correct_answer;
                      return (
                        <div
                          key={q.id}
                          className={cn(
                            "p-3 rounded-xl border text-sm",
                            isCorrect 
                              ? "border-green-500/50 bg-green-500/10" 
                              : "border-red-500/50 bg-red-500/10"
                          )}
                        >
                          <div className="flex items-start gap-2">
                            {isCorrect ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                            )}
                            <div>
                              <p className="font-medium">{q.question}</p>
                              {!isCorrect && (
                                <p className="text-xs mt-1 text-muted-foreground">
                                  ✓ {q.correct_answer}
                                </p>
                              )}
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {!isSetupComplete ? (
        <div className="flex-1 flex flex-col justify-center py-8">
          {/* Simple Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8 px-4"
          >
            <h1 className="text-xl font-bold mb-2">
              🎭 {t("roleplay.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("roleplay.subtitle")}
            </p>
          </motion.div>

          {renderSetupUI()}
        </div>
      ) : (
        renderChatUI()
      )}
    </div>
  );
}
