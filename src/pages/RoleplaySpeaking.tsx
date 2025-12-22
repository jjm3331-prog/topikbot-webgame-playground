import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";

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

export default function RoleplaySpeaking() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
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

  // Start new roleplay scenario
  const startRoleplay = async () => {
    setIsLoading(true);
    setMessages([]);
    setShowQuiz(false);
    setQuizData(null);

    try {
      const { data, error } = await supabase.functions.invoke("roleplay-speak", {
        body: { action: "start_roleplay" },
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
      toast.success("🎭 Bắt đầu tình huống mới!");
    } catch (error: any) {
      console.error("Start roleplay error:", error);
      toast.error(error.message || "Lỗi khởi tạo. Vui lòng thử lại.");
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

    // Add user message
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
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const result = data.data;

      // Update user message with feedback
      setMessages(prev => prev.map(m => 
        m.id === userMessage.id 
          ? { ...m, feedback: result.feedback }
          : m
      ));

      // Add assistant response
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

      // Scroll to bottom
      setTimeout(() => {
        chatContainerRef.current?.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 100);

    } catch (error: any) {
      console.error("Send message error:", error);
      toast.error(error.message || "Lỗi gửi tin nhắn");
      // Remove user message on error
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  // Generate quiz from conversation
  const generateQuiz = async () => {
    if (messages.length < 2) {
      toast.error("Cần ít nhất 1 vòng hội thoại để tạo quiz!");
      return;
    }

    setIsGeneratingQuiz(true);

    try {
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.korean,
      }));

      const { data, error } = await supabase.functions.invoke("roleplay-speak", {
        body: {
          action: "generate_quiz",
          conversationHistory,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setQuizData(data.data);
      setShowQuiz(true);
      setCurrentQuizIndex(0);
      setSelectedAnswers({});
      setShowResults(false);
      toast.success("📝 Quiz đã được tạo!");
    } catch (error: any) {
      console.error("Generate quiz error:", error);
      toast.error(error.message || "Lỗi tạo quiz");
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  // TTS for Korean
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
        toast.error("Lỗi phát âm thanh");
      };
      await audioRef.current.play();
    } catch (error) {
      console.error("TTS error:", error);
      setIsSpeaking(false);
      toast.error("Lỗi phát âm");
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
              toast.success("Đã nhận diện giọng nói!");
            }
          } catch (err: any) {
            console.error("STT error:", err);
            toast.error("Lỗi nhận diện giọng nói");
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.info("🎤 Đang ghi âm...");
    } catch (error) {
      console.error("Recording error:", error);
      toast.error("Không thể truy cập microphone");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Quiz answer selection
  const selectAnswer = (questionId: number, answer: string) => {
    setSelectedAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  // Calculate quiz score
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
              className="text-center mb-6"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
                <MessageCircle className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">AI Roleplay Speaking</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold mb-2">
                🎭 <span className="text-gradient-primary">Luyện Nói Roleplay</span> Thực Tế
              </h1>
              <p className="text-muted-foreground max-w-xl mx-auto text-sm">
                Trò chuyện với AI trong các tình huống đời thường • Nhận phản hồi ngữ pháp • Tạo quiz TOPIK
              </p>
            </motion.div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto grid lg:grid-cols-3 gap-6">
              {/* Chat Panel - 2 columns */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="lg:col-span-2"
              >
                <Card className="premium-card overflow-hidden h-[600px] flex flex-col">
                  {/* Scenario Context */}
                  {messages.length > 0 && messages[messages.length - 1].scenarioContext && (
                    <div className="px-4 py-3 bg-primary/5 border-b border-border">
                      <div className="flex items-center gap-2 text-sm">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-muted-foreground">Tình huống:</span>
                        <span className="font-medium">{messages[messages.length - 1].scenarioContext}</span>
                      </div>
                    </div>
                  )}

                  {/* Chat Messages */}
                  <div
                    ref={chatContainerRef}
                    className="flex-1 overflow-y-auto p-4 space-y-4"
                  >
                    {messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6">
                        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                          <MessageCircle className="w-10 h-10 text-primary" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">Bắt đầu luyện nói!</h3>
                        <p className="text-muted-foreground text-sm mb-6 max-w-sm">
                          AI sẽ tạo tình huống ngẫu nhiên và bạn sẽ thực hành hội thoại tiếng Hàn thực tế
                        </p>
                        <Button
                          onClick={startRoleplay}
                          disabled={isLoading}
                          className="gap-2"
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                          Bắt đầu Roleplay
                        </Button>
                      </div>
                    ) : (
                      <>
                        <AnimatePresence>
                          {messages.map((message) => (
                            <motion.div
                              key={message.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[85%] rounded-2xl p-4 ${
                                  message.role === "user"
                                    ? "bg-primary text-primary-foreground rounded-br-md"
                                    : "bg-muted rounded-bl-md"
                                }`}
                              >
                                {/* Korean text */}
                                <p className="text-lg font-medium mb-1">{message.korean}</p>

                                {/* Vietnamese & Pronunciation for assistant */}
                                {message.role === "assistant" && (
                                  <>
                                    <p className="text-sm opacity-80 mb-1">{message.vietnamese}</p>
                                    {message.pronunciation && (
                                      <p className="text-xs opacity-60 italic">{message.pronunciation}</p>
                                    )}

                                    {/* Listen button */}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleSpeak(message.korean)}
                                      disabled={isSpeaking}
                                      className="mt-2 h-7 text-xs"
                                    >
                                      <Volume2 className={`w-3 h-3 mr-1 ${isSpeaking ? "animate-pulse" : ""}`} />
                                      Nghe
                                    </Button>

                                    {/* Grammar highlight */}
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

                                    {/* Suggested responses */}
                                    {message.suggestedResponses && message.suggestedResponses.length > 0 && (
                                      <div className="mt-3 pt-3 border-t border-border/50">
                                        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                          <Lightbulb className="w-3 h-3" /> Gợi ý trả lời:
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

                                {/* Feedback for user messages */}
                                {message.role === "user" && message.feedback && (
                                  <div className="mt-2 pt-2 border-t border-primary-foreground/20">
                                    <div className="flex items-center gap-1.5 text-xs">
                                      {message.feedback.is_correct ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-green-300" />
                                      ) : (
                                        <XCircle className="w-3.5 h-3.5 text-red-300" />
                                      )}
                                      <span className={message.feedback.is_correct ? "text-green-200" : "text-red-200"}>
                                        {message.feedback.is_correct ? "Tốt lắm!" : "Cần sửa"}
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

                        {/* Loading indicator */}
                        {isLoading && (
                          <div className="flex justify-start">
                            <div className="bg-muted rounded-2xl rounded-bl-md p-4">
                              <Loader2 className="w-5 h-5 animate-spin text-primary" />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Input Area */}
                  {messages.length > 0 && (
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
                          placeholder="Nhập câu trả lời tiếng Hàn..."
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

                      {/* Action buttons */}
                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={startRoleplay}
                          disabled={isLoading}
                          className="gap-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Tình huống mới
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
                          Tạo Quiz TOPIK
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>

              {/* Side Panel - Quiz & Tips */}
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
                      <>
                        {/* Current Question */}
                        <div className="space-y-4">
                          <div className="text-xs text-muted-foreground">
                            Câu {currentQuizIndex + 1}/{quizData.questions.length}
                          </div>

                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-sm italic text-muted-foreground mb-2">
                              {quizData.questions[currentQuizIndex].korean_context}
                            </p>
                            <p className="font-medium">
                              {quizData.questions[currentQuizIndex].question}
                            </p>
                          </div>

                          {/* Options */}
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

                          {/* Navigation */}
                          <div className="flex gap-2 pt-2">
                            {currentQuizIndex > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentQuizIndex((i) => i - 1)}
                              >
                                Trước
                              </Button>
                            )}
                            {currentQuizIndex < quizData.questions.length - 1 ? (
                              <Button
                                size="sm"
                                onClick={() => setCurrentQuizIndex((i) => i + 1)}
                                disabled={!selectedAnswers[quizData.questions[currentQuizIndex].id]}
                              >
                                Tiếp
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => setShowResults(true)}
                                disabled={Object.keys(selectedAnswers).length < quizData.questions.length}
                              >
                                Xem kết quả
                              </Button>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      /* Results */
                      <div className="space-y-4">
                        <div className="text-center p-4 bg-primary/10 rounded-lg">
                          <div className="text-3xl font-bold text-primary mb-1">
                            {calculateScore()}/{quizData.questions.length}
                          </div>
                          <p className="text-sm text-muted-foreground">Điểm số của bạn</p>
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
                                        Đáp án đúng: {q.correct_answer}
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
                          Đóng Quiz
                        </Button>
                      </div>
                    )}
                  </Card>
                ) : (
                  /* Tips Card */
                  <Card className="premium-card p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-primary" />
                      Hướng dẫn
                    </h3>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-primary">1.</span>
                        Nhấn "Bắt đầu Roleplay" để nhận tình huống ngẫu nhiên
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">2.</span>
                        Trả lời bằng tiếng Hàn (gõ hoặc nói)
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">3.</span>
                        AI sẽ sửa lỗi và hướng dẫn ngữ pháp
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">4.</span>
                        Tạo Quiz TOPIK từ nội dung đã học!
                      </li>
                    </ul>

                    <div className="mt-4 p-3 bg-korean-blue/10 rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        💡 <strong>Mẹo:</strong> Dùng các gợi ý trả lời nếu chưa biết nói gì!
                      </p>
                    </div>
                  </Card>
                )}

                {/* Stats Card */}
                <Card className="premium-card p-4">
                  <h3 className="font-semibold mb-3">📊 Phiên này</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-2 bg-muted/50 rounded-lg">
                      <div className="text-xl font-bold text-primary">
                        {messages.filter((m) => m.role === "user").length}
                      </div>
                      <div className="text-xs text-muted-foreground">Câu đã nói</div>
                    </div>
                    <div className="text-center p-2 bg-muted/50 rounded-lg">
                      <div className="text-xl font-bold text-green-500">
                        {messages.filter((m) => m.feedback?.is_correct).length}
                      </div>
                      <div className="text-xs text-muted-foreground">Câu đúng</div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
