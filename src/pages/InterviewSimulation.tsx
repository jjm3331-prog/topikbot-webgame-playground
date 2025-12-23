import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mic, 
  MicOff,
  Send,
  Loader2, 
  ArrowLeft,
  Building2,
  User,
  Users,
  Volume2,
  VolumeX,
  RotateCcw,
  Trophy,
  Sparkles,
  MessageSquare,
  Heart,
  Zap,
  Target,
  Award,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Lightbulb
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { PremiumPreviewBanner } from "@/components/PremiumPreviewBanner";
import { useSubscription } from "@/hooks/useSubscription";

interface Message {
  role: "user" | "assistant";
  content: string;
  feedback?: string;
}

interface Evaluation {
  scores: {
    overall: number;
    content: number;
    communication: number;
    korean: number;
    attitude: number;
    jobFit: number;
  };
  strengths: string[];
  improvements: string[];
  overallFeedback: string;
  tips: string[];
  grade: string;
}

const InterviewSimulation = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isPremium } = useSubscription();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // Setup states
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [customCompany, setCustomCompany] = useState("");
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [selectedInterviewer, setSelectedInterviewer] = useState<string | null>(null);
  
  // Interview states
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewEnded, setInterviewEnded] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const companies = [
    { name: "삼성전자", type: "대기업", color: "from-blue-600 to-blue-700", emoji: "🏢" },
    { name: "LG전자", type: "대기업", color: "from-red-600 to-red-700", emoji: "🏭" },
    { name: "현대자동차", type: "대기업", color: "from-slate-600 to-slate-700", emoji: "🚗" },
    { name: "네이버", type: "IT", color: "from-green-600 to-green-700", emoji: "🌐" },
    { name: "카카오", type: "IT", color: "from-yellow-500 to-yellow-600", emoji: "💬" },
    { name: "쿠팡", type: "이커머스", color: "from-amber-600 to-amber-700", emoji: "📦" },
    { name: "SK하이닉스", type: "반도체", color: "from-orange-600 to-orange-700", emoji: "💾" },
    { name: "기타 (직접 입력)", type: "custom", color: "from-purple-600 to-purple-700", emoji: "✏️" }
  ];

  const positions = [
    { name: "소프트웨어 개발", icon: "💻" },
    { name: "마케팅/홍보", icon: "📢" },
    { name: "영업/세일즈", icon: "🤝" },
    { name: "인사/HR", icon: "👥" },
    { name: "디자인/UX", icon: "🎨" },
    { name: "재무/회계", icon: "📊" },
    { name: "생산/제조", icon: "🏭" },
    { name: "일반 사무", icon: "📋" }
  ];

  const interviewerTypes = [
    { 
      id: "friendly", 
      name: "친절한 면접관", 
      nameVi: "Người phỏng vấn thân thiện",
      description: "편안한 분위기, 격려하는 스타일", 
      emoji: "😊",
      color: "from-green-500 to-emerald-500"
    },
    { 
      id: "strict", 
      name: "엄격한 면접관", 
      nameVi: "Người phỏng vấn nghiêm khắc",
      description: "논리적, 구체적인 답변 요구", 
      emoji: "🧐",
      color: "from-blue-500 to-indigo-500"
    },
    { 
      id: "pressure", 
      name: "압박 면접관", 
      nameVi: "Phỏng vấn áp lực",
      description: "스트레스 테스트, 도전적 질문", 
      emoji: "😤",
      color: "from-red-500 to-rose-500"
    },
    { 
      id: "technical", 
      name: "기술 면접관", 
      nameVi: "Phỏng vấn kỹ thuật",
      description: "직무 관련 심층 질문", 
      emoji: "🔧",
      color: "from-purple-500 to-violet-500"
    }
  ];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const getCompanyName = () => {
    if (selectedCompany === "기타 (직접 입력)") {
      return customCompany || "기업";
    }
    return selectedCompany || "기업";
  };

  const speakText = async (text: string) => {
    if (!ttsEnabled) return;
    
    setIsSpeaking(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
          },
          body: JSON.stringify({ 
            text: text.slice(0, 800),
            voiceId: "onwK4e9ZLuTAKqWW03F9" // Daniel - Korean professional male
          })
        }
      );
      
      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.onended = () => setIsSpeaking(false);
        audio.onerror = () => setIsSpeaking(false);
        await audio.play();
      } else {
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error("TTS error:", error);
      setIsSpeaking(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Recording error:", error);
      toast({
        title: "마이크 접근 오류",
        description: "마이크 권한을 허용해주세요.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsLoading(true);
    try {
      // Convert to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(audioBlob);
      const base64Audio = await base64Promise;

      // Send to Korean STT
      const { data, error } = await supabase.functions.invoke("korean-stt", {
        body: { audio: base64Audio }
      });

      if (error) throw error;

      if (data.text) {
        setInputText(data.text);
        // Auto-send the transcribed text
        await sendMessageWithText(data.text);
      } else {
        toast({
          title: "음성 인식 실패",
          description: "다시 말씀해 주세요.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Transcription error:", error);
      toast({
        title: "음성 인식 오류",
        description: "다시 시도해 주세요.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startInterview = async () => {
    const companyName = getCompanyName();
    if (!companyName || !selectedPosition || !selectedInterviewer) {
      toast({
        title: "선택이 필요합니다",
        description: "기업, 직무, 면접관 유형을 모두 선택해주세요.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setInterviewStarted(true);
    setQuestionCount(1);
    
    try {
      const { data, error } = await supabase.functions.invoke("interview-simulation", {
        body: { 
          action: "start",
          company: companyName,
          position: selectedPosition,
          interviewerType: selectedInterviewer,
          questionCount: 1
        }
      });
      
      if (error) throw error;
      
      if (data.success) {
        setMessages([{ role: "assistant", content: data.message }]);
        await speakText(data.message);
      } else {
        throw new Error(data.error || "Failed to start interview");
      }
    } catch (error: any) {
      console.error("Interview start error:", error);
      toast({
        title: "오류 발생",
        description: "면접을 시작할 수 없습니다. 다시 시도해주세요.",
        variant: "destructive"
      });
      setInterviewStarted(false);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessageWithText = async (text: string) => {
    if (!text.trim() || isLoading) return;
    
    const userMessage = text.trim();
    setInputText("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);
    
    try {
      const newQuestionCount = questionCount + 1;
      const { data, error } = await supabase.functions.invoke("interview-simulation", {
        body: { 
          action: "respond",
          company: getCompanyName(),
          position: selectedPosition,
          interviewerType: selectedInterviewer,
          messages: [...messages, { role: "user", content: userMessage }],
          userMessage,
          questionCount: newQuestionCount
        }
      });
      
      if (error) throw error;
      
      if (data.success) {
        setQuestionCount(newQuestionCount);
        setMessages(prev => [...prev, { role: "assistant", content: data.message }]);
        
        if (data.ended) {
          setInterviewEnded(true);
          // Request evaluation
          await requestEvaluation([...messages, { role: "user", content: userMessage }, { role: "assistant", content: data.message }]);
        } else {
          await speakText(data.message);
        }
      } else {
        throw new Error(data.error || "Failed to get response");
      }
    } catch (error: any) {
      console.error("Interview error:", error);
      toast({
        title: "오류 발생",
        description: "응답을 받을 수 없습니다.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    await sendMessageWithText(inputText);
  };

  const requestEvaluation = async (conversationMessages: Message[]) => {
    setIsEvaluating(true);
    try {
      const { data, error } = await supabase.functions.invoke("interview-simulation", {
        body: { 
          action: "evaluate",
          company: getCompanyName(),
          position: selectedPosition,
          interviewerType: selectedInterviewer,
          messages: conversationMessages
        }
      });
      
      if (error) throw error;
      
      if (data.success && data.evaluation) {
        setEvaluation(data.evaluation);
      }
    } catch (error) {
      console.error("Evaluation error:", error);
    } finally {
      setIsEvaluating(false);
    }
  };

  const endInterviewEarly = async () => {
    setInterviewEnded(true);
    await requestEvaluation(messages);
  };

  const resetInterview = () => {
    setSelectedCompany(null);
    setCustomCompany("");
    setSelectedPosition(null);
    setSelectedInterviewer(null);
    setMessages([]);
    setInterviewStarted(false);
    setInterviewEnded(false);
    setEvaluation(null);
    setQuestionCount(0);
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'S': return 'from-yellow-400 to-amber-500';
      case 'A': return 'from-green-400 to-emerald-500';
      case 'B': return 'from-blue-400 to-indigo-500';
      case 'C': return 'from-orange-400 to-orange-500';
      case 'D': return 'from-red-400 to-rose-500';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-yellow-500';
    if (score >= 80) return 'text-green-500';
    if (score >= 70) return 'text-blue-500';
    if (score >= 60) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CleanHeader />

      <main className="flex-1 pt-8 pb-12 px-4 max-w-4xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/korea-career")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Korea Career Hub
          </Button>

          {/* Premium Banner */}
          {!isPremium && <PremiumPreviewBanner featureName="면접 시뮬레이션" />}

          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30">
              <Mic className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium">LUKATO RAG AI · Mô phỏng phỏng vấn</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-bold">
              <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                면접 시뮬레이션
              </span>
            </h1>
            <p className="text-muted-foreground text-sm">
              실제 한국 기업 면접과 똑같이 연습하세요 · 음성 & 텍스트 지원
            </p>
          </div>

          {/* Selection Phase */}
          {!interviewStarted && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Company Selection */}
              <Card className="p-6">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-500" />
                  1. 면접 기업 선택
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {companies.map((company) => (
                    <Button
                      key={company.name}
                      variant={selectedCompany === company.name ? "default" : "outline"}
                      onClick={() => setSelectedCompany(company.name)}
                      className={`h-auto py-3 flex-col gap-1 ${
                        selectedCompany === company.name 
                          ? `bg-gradient-to-r ${company.color} text-white border-0`
                          : ""
                      }`}
                    >
                      <span className="text-lg">{company.emoji}</span>
                      <span className="font-medium text-sm">{company.name.replace(" (직접 입력)", "")}</span>
                      <span className="text-xs opacity-70">{company.type}</span>
                    </Button>
                  ))}
                </div>
                
                {selectedCompany === "기타 (직접 입력)" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-4"
                  >
                    <Input
                      value={customCompany}
                      onChange={(e) => setCustomCompany(e.target.value)}
                      placeholder="기업명을 입력하세요"
                      className="max-w-sm"
                    />
                  </motion.div>
                )}
              </Card>

              {/* Position Selection */}
              <Card className="p-6">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-green-500" />
                  2. 지원 직무 선택
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {positions.map((position) => (
                    <Button
                      key={position.name}
                      variant={selectedPosition === position.name ? "default" : "outline"}
                      onClick={() => setSelectedPosition(position.name)}
                      className="h-auto py-3 flex-col gap-1"
                    >
                      <span className="text-lg">{position.icon}</span>
                      <span className="font-medium text-sm">{position.name}</span>
                    </Button>
                  ))}
                </div>
              </Card>

              {/* Interviewer Selection */}
              <Card className="p-6">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-purple-500" />
                  3. 면접관 유형 선택
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {interviewerTypes.map((interviewer) => (
                    <Button
                      key={interviewer.id}
                      variant="outline"
                      onClick={() => setSelectedInterviewer(interviewer.id)}
                      className={`h-auto p-4 flex items-start gap-3 justify-start text-left ${
                        selectedInterviewer === interviewer.id 
                          ? `ring-2 ring-primary bg-gradient-to-r ${interviewer.color} text-white`
                          : ""
                      }`}
                    >
                      <span className="text-2xl">{interviewer.emoji}</span>
                      <div>
                        <p className="font-bold">{interviewer.name}</p>
                        <p className="text-xs opacity-80">{interviewer.nameVi}</p>
                        <p className={`text-xs mt-1 ${selectedInterviewer === interviewer.id ? 'opacity-90' : 'text-muted-foreground'}`}>
                          {interviewer.description}
                        </p>
                      </div>
                    </Button>
                  ))}
                </div>
              </Card>

              {/* Start Button */}
              <Button
                onClick={startInterview}
                disabled={
                  (!selectedCompany || (selectedCompany === "기타 (직접 입력)" && !customCompany)) || 
                  !selectedPosition || 
                  !selectedInterviewer || 
                  isLoading
                }
                className="w-full h-16 text-lg bg-gradient-to-r from-orange-500 to-red-500 text-white hover:opacity-90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    면접 준비 중...
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5 mr-2" />
                    면접 시작하기
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {/* Interview Phase */}
          {interviewStarted && !interviewEnded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {/* Interview Header */}
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center text-2xl">
                      {interviewerTypes.find(i => i.id === selectedInterviewer)?.emoji}
                    </div>
                    <div>
                      <p className="font-bold">{getCompanyName()} 면접관</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedPosition} · {interviewerTypes.find(i => i.id === selectedInterviewer)?.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTtsEnabled(!ttsEnabled)}
                      className="gap-1"
                    >
                      {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </Button>
                    {isSpeaking && (
                      <div className="flex items-center gap-2 text-orange-500">
                        <Volume2 className="w-4 h-4 animate-pulse" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>진행률</span>
                    <span>{questionCount}/8 질문</span>
                  </div>
                  <Progress value={(questionCount / 8) * 100} className="h-2" />
                </div>
              </Card>

              {/* Messages */}
              <Card className="p-4 h-[350px] overflow-y-auto">
                <div className="space-y-4">
                  <AnimatePresence>
                    {messages.map((msg, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                            msg.role === "user"
                              ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">생각 중...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </Card>

              {/* Input */}
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    placeholder="답변을 입력하세요..."
                    className="flex-1"
                    disabled={isLoading || isRecording}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={isLoading || !inputText.trim() || isRecording}
                    className="bg-gradient-to-r from-blue-500 to-indigo-500"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isLoading}
                    variant={isRecording ? "destructive" : "outline"}
                    className="flex-1 h-12"
                  >
                    {isRecording ? (
                      <>
                        <MicOff className="w-5 h-5 mr-2" />
                        녹음 중지
                      </>
                    ) : (
                      <>
                        <Mic className="w-5 h-5 mr-2" />
                        음성으로 답변하기
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={endInterviewEarly}
                    variant="outline"
                    className="h-12"
                    disabled={isLoading || messages.length < 2}
                  >
                    면접 종료
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Result Phase */}
          {interviewEnded && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              {isEvaluating ? (
                <Card className="p-8 text-center">
                  <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin mb-4" />
                  <h2 className="text-xl font-bold mb-2">면접 결과 분석 중...</h2>
                  <p className="text-muted-foreground">AI가 면접 내용을 종합 평가하고 있습니다</p>
                </Card>
              ) : evaluation ? (
                <>
                  {/* Grade Card */}
                  <Card className="p-6 text-center overflow-hidden relative">
                    <div className={`absolute inset-0 bg-gradient-to-br ${getGradeColor(evaluation.grade)} opacity-10`} />
                    <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
                    <h2 className="text-2xl font-bold mb-2">면접 완료!</h2>
                    <p className="text-muted-foreground mb-6">
                      {getCompanyName()} {selectedPosition} 모의 면접을 완료했습니다
                    </p>
                    
                    {/* Grade Badge */}
                    <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r ${getGradeColor(evaluation.grade)} text-white text-2xl font-bold mb-6`}>
                      <Award className="w-6 h-6" />
                      {evaluation.grade} 등급
                    </div>

                    {/* Overall Score */}
                    <div className={`text-5xl font-bold ${getScoreColor(evaluation.scores.overall)}`}>
                      {evaluation.scores.overall}점
                    </div>
                    <p className="text-muted-foreground mt-2">종합 점수</p>
                  </Card>

                  {/* Detailed Scores */}
                  <Card className="p-6">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" />
                      항목별 점수
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {[
                        { label: "답변 내용", score: evaluation.scores.content, icon: MessageSquare },
                        { label: "커뮤니케이션", score: evaluation.scores.communication, icon: Users },
                        { label: "한국어 능력", score: evaluation.scores.korean, icon: Sparkles },
                        { label: "태도 및 자세", score: evaluation.scores.attitude, icon: Heart },
                        { label: "직무 적합성", score: evaluation.scores.jobFit, icon: Target },
                      ].map((item) => (
                        <div key={item.label} className="text-center p-4 bg-muted/50 rounded-xl">
                          <item.icon className={`w-5 h-5 mx-auto mb-2 ${getScoreColor(item.score)}`} />
                          <p className={`text-2xl font-bold ${getScoreColor(item.score)}`}>{item.score}</p>
                          <p className="text-xs text-muted-foreground">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Feedback */}
                  <Card className="p-6">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      종합 피드백
                    </h3>
                    <p className="text-foreground/80 leading-relaxed">{evaluation.overallFeedback}</p>
                  </Card>

                  {/* Strengths & Improvements */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Card className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
                      <h3 className="font-bold mb-4 flex items-center gap-2 text-green-600 dark:text-green-400">
                        <CheckCircle className="w-5 h-5" />
                        강점
                      </h3>
                      <ul className="space-y-2">
                        {evaluation.strengths.map((strength, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <Sparkles className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>

                    <Card className="p-6 bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-orange-500/30">
                      <h3 className="font-bold mb-4 flex items-center gap-2 text-orange-600 dark:text-orange-400">
                        <AlertCircle className="w-5 h-5" />
                        개선점
                      </h3>
                      <ul className="space-y-2">
                        {evaluation.improvements.map((improvement, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <Zap className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                            <span>{improvement}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  </div>

                  {/* Tips */}
                  <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/30">
                    <h3 className="font-bold mb-4 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <Lightbulb className="w-5 h-5" />
                      다음 면접을 위한 팁
                    </h3>
                    <ul className="space-y-2">
                      {evaluation.tips.map((tip, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-600 shrink-0">
                            {idx + 1}
                          </span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>

                  {/* Restart Button */}
                  <Button
                    onClick={resetInterview}
                    className="w-full h-14 text-lg bg-gradient-to-r from-orange-500 to-red-500"
                  >
                    <RotateCcw className="w-5 h-5 mr-2" />
                    다시 면접하기
                  </Button>
                </>
              ) : (
                <Card className="p-8 text-center">
                  <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
                  <h2 className="text-xl font-bold mb-2">면접 완료!</h2>
                  <Button onClick={resetInterview} className="mt-4">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    다시 시작
                  </Button>
                </Card>
              )}
            </motion.div>
          )}
        </motion.div>
      </main>

      <AppFooter />
    </div>
  );
};

export default InterviewSimulation;
