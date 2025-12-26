import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
    { name: "삼성전자", nameVi: "Samsung Electronics", type: "Tập đoàn lớn", color: "from-blue-600 to-blue-700", emoji: "🏢" },
    { name: "LG전자", nameVi: "LG Electronics", type: "Tập đoàn lớn", color: "from-red-600 to-red-700", emoji: "🏭" },
    { name: "현대자동차", nameVi: "Hyundai Motor", type: "Tập đoàn lớn", color: "from-slate-600 to-slate-700", emoji: "🚗" },
    { name: "네이버", nameVi: "Naver", type: "Công nghệ", color: "from-green-600 to-green-700", emoji: "🌐" },
    { name: "카카오", nameVi: "Kakao", type: "Công nghệ", color: "from-yellow-500 to-yellow-600", emoji: "💬" },
    { name: "쿠팡", nameVi: "Coupang", type: "Thương mại điện tử", color: "from-amber-600 to-amber-700", emoji: "📦" },
    { name: "SK하이닉스", nameVi: "SK Hynix", type: "Bán dẫn", color: "from-orange-600 to-orange-700", emoji: "💾" },
    { name: "기타", nameVi: "Khác", type: "Tự nhập", color: "from-purple-600 to-purple-700", emoji: "✏️" }
  ];

  const positions = [
    { name: "소프트웨어 개발", nameVi: "Phát triển phần mềm", icon: "💻" },
    { name: "마케팅/홍보", nameVi: "Marketing / PR", icon: "📢" },
    { name: "영업/세일즈", nameVi: "Kinh doanh / Sales", icon: "🤝" },
    { name: "인사/HR", nameVi: "Nhân sự / HR", icon: "👥" },
    { name: "디자인/UX", nameVi: "Thiết kế / UX", icon: "🎨" },
    { name: "재무/회계", nameVi: "Tài chính / Kế toán", icon: "📊" },
    { name: "생산/제조", nameVi: "Sản xuất / Chế tạo", icon: "🏭" },
    { name: "일반 사무", nameVi: "Hành chính văn phòng", icon: "📋" }
  ];

  const interviewerTypes = [
    { 
      id: "friendly", 
      name: "친절한 면접관", 
      nameVi: "Thân thiện",
      description: "Không khí thoải mái, động viên, khuyến khích", 
      emoji: "😊",
      color: "from-green-500 to-emerald-500"
    },
    { 
      id: "strict", 
      name: "엄격한 면접관", 
      nameVi: "Nghiêm khắc",
      description: "Yêu cầu logic, câu trả lời cụ thể", 
      emoji: "🧐",
      color: "from-blue-500 to-indigo-500"
    },
    { 
      id: "pressure", 
      name: "압박 면접관", 
      nameVi: "Áp lực cao",
      description: "Stress test, câu hỏi thách thức", 
      emoji: "😤",
      color: "from-red-500 to-rose-500"
    },
    { 
      id: "technical", 
      name: "기술 면접관", 
      nameVi: "Kỹ thuật",
      description: "Câu hỏi chuyên môn, kỹ năng chuyên sâu", 
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
    if (selectedCompany === "기타") {
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
            voiceId: "onwK4e9ZLuTAKqWW03F9"
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
        title: t('interview.micError'),
        description: t('interview.allowMicAccess'),
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
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(audioBlob);
      const base64Audio = await base64Promise;

      const { data, error } = await supabase.functions.invoke("korean-stt", {
        body: { audio: base64Audio }
      });

      if (error) throw error;

      if (data.text) {
        setInputText(data.text);
        await sendMessageWithText(data.text);
      } else {
        toast({
          title: t('interview.voiceNotRecognized'),
          description: t('interview.tryAgain'),
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Transcription error:", error);
      toast({
        title: t('interview.voiceRecognitionError'),
        description: t('interview.tryAgain'),
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
        title: t('interview.selectAll'),
        description: t('interview.selectAllDesc'),
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
        title: t('interview.errorOccurred'),
        description: t('interview.cannotStartInterview'),
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
        title: t('interview.errorOccurred'),
        description: t('interview.noResponse'),
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

      <main className="flex-1 pt-10 pb-16 px-4 sm:px-6 max-w-4xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/korea-career")}
            className="gap-2 text-card-body text-muted-foreground hover:text-foreground transition-colors -ml-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Korea Career Hub</span>
          </Button>

          {/* Premium Banner */}
          {!isPremium && <PremiumPreviewBanner featureName="Mô phỏng phỏng vấn" />}

          {/* Header */}
          <header className="text-center space-y-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-orange-500/15 to-red-500/15 border border-orange-500/25"
            >
              <Mic className="w-4 h-4 text-orange-500" />
              <span className="text-card-caption font-medium tracking-wide text-foreground/90">
                LUKATO RAG AI · Mô phỏng phỏng vấn
              </span>
            </motion.div>
            
            <h1 className="text-headline font-bold tracking-tight">
              <span className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent">
                Luyện Phỏng Vấn
              </span>
            </h1>
            <p className="text-body text-muted-foreground max-w-lg mx-auto leading-relaxed">
              Thực hành phỏng vấn với các công ty Hàn Quốc hàng đầu
              <span className="block text-card-caption text-muted-foreground/70 mt-1">
                Hỗ trợ giọng nói & văn bản
              </span>
            </p>
          </header>

          {/* Selection Phase */}
          {!interviewStarted && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >
              {/* Company Selection */}
              <Card className="p-4 sm:p-6 md:p-8 border-border/50 bg-card/50 backdrop-blur-sm">
                <h3 className="text-card-title-lg font-bold mb-4 sm:mb-5 flex items-center gap-2 sm:gap-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" />
                  </div>
                  <span className="text-base sm:text-lg">Chọn Công Ty Phỏng Vấn</span>
                </h3>
                <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
                  {companies.map((company) => (
                    <Button
                      key={company.name}
                      variant={selectedCompany === company.name ? "default" : "outline"}
                      onClick={() => setSelectedCompany(company.name)}
                      className={`h-auto py-3 sm:py-4 px-2 sm:px-3 flex-col gap-1 sm:gap-2 transition-all duration-200 min-h-[90px] sm:min-h-[100px] ${
                        selectedCompany === company.name 
                          ? `bg-gradient-to-br ${company.color} text-white border-0 shadow-lg scale-[1.02]`
                          : "hover:border-primary/50 hover:bg-muted/50"
                      }`}
                    >
                      <span className="text-xl sm:text-2xl">{company.emoji}</span>
                      <span className="text-xs sm:text-sm font-semibold text-center leading-tight line-clamp-2">{company.nameVi}</span>
                      <span className="text-[10px] sm:text-xs opacity-70 text-center leading-tight line-clamp-1">{company.type}</span>
                    </Button>
                  ))}
                </div>
                
                {selectedCompany === "기타" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-5"
                  >
                    <Input
                      value={customCompany}
                      onChange={(e) => setCustomCompany(e.target.value)}
                      placeholder="Nhập tên công ty..."
                      className="max-w-sm text-body h-12"
                    />
                  </motion.div>
                )}
              </Card>

              {/* Position Selection */}
              <Card className="p-4 sm:p-6 md:p-8 border-border/50 bg-card/50 backdrop-blur-sm">
                <h3 className="text-card-title-lg font-bold mb-4 sm:mb-5 flex items-center gap-2 sm:gap-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />
                  </div>
                  <span className="text-base sm:text-lg">Chọn Vị Trí Ứng Tuyển</span>
                </h3>
                <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
                  {positions.map((position) => (
                    <Button
                      key={position.name}
                      variant={selectedPosition === position.name ? "default" : "outline"}
                      onClick={() => setSelectedPosition(position.name)}
                      className={`h-auto py-3 sm:py-4 px-2 sm:px-3 flex-col gap-1 sm:gap-2 transition-all duration-200 min-h-[80px] sm:min-h-[90px] ${
                        selectedPosition === position.name 
                          ? "bg-primary text-primary-foreground shadow-lg scale-[1.02]"
                          : "hover:border-primary/50 hover:bg-muted/50"
                      }`}
                    >
                      <span className="text-xl sm:text-2xl">{position.icon}</span>
                      <span className="text-xs sm:text-sm font-semibold text-center leading-tight line-clamp-2">{position.nameVi}</span>
                    </Button>
                  ))}
                </div>
              </Card>

              {/* Interviewer Selection */}
              <Card className="p-4 sm:p-6 md:p-8 border-border/50 bg-card/50 backdrop-blur-sm">
                <h3 className="text-card-title-lg font-bold mb-4 sm:mb-5 flex items-center gap-2 sm:gap-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500" />
                  </div>
                  <span className="text-base sm:text-lg">Chọn Phong Cách Phỏng Vấn</span>
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                  {interviewerTypes.map((interviewer) => (
                    <Button
                      key={interviewer.id}
                      variant="outline"
                      onClick={() => setSelectedInterviewer(interviewer.id)}
                      className={`h-auto p-3 sm:p-4 md:p-5 flex items-start gap-3 sm:gap-4 justify-start text-left transition-all duration-200 ${
                        selectedInterviewer === interviewer.id 
                          ? `ring-2 ring-primary bg-gradient-to-br ${interviewer.color} text-white shadow-lg scale-[1.01]`
                          : "hover:border-primary/50 hover:bg-muted/50"
                      }`}
                    >
                      <span className="text-2xl sm:text-3xl shrink-0">{interviewer.emoji}</span>
                      <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
                        <p className="text-sm sm:text-base font-bold truncate">{interviewer.nameVi}</p>
                        <p className="text-xs sm:text-sm opacity-60">{interviewer.name}</p>
                        <p className={`text-xs sm:text-sm mt-1 leading-relaxed line-clamp-2 ${selectedInterviewer === interviewer.id ? 'opacity-90' : 'text-muted-foreground'}`}>
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
                  (!selectedCompany || (selectedCompany === "기타" && !customCompany)) || 
                  !selectedPosition || 
                  !selectedInterviewer || 
                  isLoading
                }
                className="w-full h-16 text-button-lg bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white hover:opacity-90 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                    Đang chuẩn bị phỏng vấn...
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5 mr-3" />
                    Bắt Đầu Phỏng Vấn
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
              className="space-y-5"
            >
              {/* Interview Header */}
              <Card className="p-5 border-border/50 bg-card/50 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-3xl shadow-lg">
                      {interviewerTypes.find(i => i.id === selectedInterviewer)?.emoji}
                    </div>
                    <div>
                      <p className="text-card-title font-bold">{getCompanyName()}</p>
                      <p className="text-card-caption text-muted-foreground">
                        {positions.find(p => p.name === selectedPosition)?.nameVi} · {interviewerTypes.find(i => i.id === selectedInterviewer)?.nameVi}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTtsEnabled(!ttsEnabled)}
                      className="gap-1.5"
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
                <div className="mt-4">
                  <div className="flex items-center justify-between text-card-caption text-muted-foreground mb-2">
                    <span>Tiến độ phỏng vấn</span>
                    <span className="font-medium">{questionCount}/8 câu hỏi</span>
                  </div>
                  <Progress value={(questionCount / 8) * 100} className="h-2" />
                </div>
              </Card>

              {/* Messages */}
              <Card className="p-5 h-[380px] overflow-y-auto border-border/50 bg-card/50 backdrop-blur-sm">
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
                          className={`max-w-[85%] rounded-2xl px-5 py-3.5 ${
                            msg.role === "user"
                              ? "bg-gradient-to-br from-blue-500 to-indigo-500 text-white"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-body leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-2xl px-5 py-3.5 flex items-center gap-3">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-card-body text-muted-foreground">Đang suy nghĩ...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </Card>

              {/* Input */}
              <div className="space-y-3">
                <div className="flex gap-3">
                  <Input
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    placeholder="Nhập câu trả lời của bạn..."
                    className="flex-1 h-12 text-body"
                    disabled={isLoading || isRecording}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={isLoading || !inputText.trim() || isRecording}
                    className="h-12 px-5 bg-gradient-to-r from-blue-500 to-indigo-500"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex gap-3">
                  <Button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isLoading}
                    variant={isRecording ? "destructive" : "outline"}
                    className="flex-1 h-14 text-button"
                  >
                    {isRecording ? (
                      <>
                        <MicOff className="w-5 h-5 mr-2" />
                        Dừng ghi âm
                      </>
                    ) : (
                      <>
                        <Mic className="w-5 h-5 mr-2" />
                        Trả lời bằng giọng nói
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={endInterviewEarly}
                    variant="outline"
                    className="h-14 px-6 text-button"
                    disabled={isLoading || messages.length < 2}
                  >
                    Kết thúc
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
                <Card className="p-10 text-center border-border/50 bg-card/50 backdrop-blur-sm">
                  <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin mb-5" />
                  <h2 className="text-title font-bold mb-2">Đang phân tích kết quả...</h2>
                  <p className="text-body text-muted-foreground">AI đang đánh giá toàn diện buổi phỏng vấn của bạn</p>
                </Card>
              ) : evaluation ? (
                <>
                  {/* Grade Card */}
                  <Card className="p-8 text-center overflow-hidden relative border-border/50">
                    <div className={`absolute inset-0 bg-gradient-to-br ${getGradeColor(evaluation.grade)} opacity-10`} />
                    <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-5" />
                    <h2 className="text-title font-bold mb-2">Hoàn thành phỏng vấn!</h2>
                    <p className="text-body text-muted-foreground mb-8">
                      Phỏng vấn mô phỏng {getCompanyName()} - {positions.find(p => p.name === selectedPosition)?.nameVi}
                    </p>
                    
                    {/* Grade Badge */}
                    <div className={`inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r ${getGradeColor(evaluation.grade)} text-white text-2xl font-bold mb-8 shadow-lg`}>
                      <Award className="w-7 h-7" />
                      Hạng {evaluation.grade}
                    </div>

                    {/* Overall Score */}
                    <div className={`text-6xl font-bold ${getScoreColor(evaluation.scores.overall)}`}>
                      {evaluation.scores.overall}
                      <span className="text-2xl font-medium opacity-70"> điểm</span>
                    </div>
                    <p className="text-card-body text-muted-foreground mt-2">Điểm tổng hợp</p>
                  </Card>

                  {/* Detailed Scores */}
                  <Card className="p-6 sm:p-8 border-border/50 bg-card/50 backdrop-blur-sm">
                    <h3 className="text-card-title-lg font-bold mb-5 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Target className="w-4 h-4 text-primary" />
                      </div>
                      <span>Điểm theo từng hạng mục</span>
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {[
                        { label: "Nội dung", score: evaluation.scores.content, icon: MessageSquare },
                        { label: "Giao tiếp", score: evaluation.scores.communication, icon: Users },
                        { label: "Tiếng Hàn", score: evaluation.scores.korean, icon: Sparkles },
                        { label: "Thái độ", score: evaluation.scores.attitude, icon: Heart },
                        { label: "Phù hợp vị trí", score: evaluation.scores.jobFit, icon: Target },
                      ].map((item) => (
                        <div key={item.label} className="text-center p-5 bg-muted/50 rounded-xl">
                          <item.icon className={`w-5 h-5 mx-auto mb-3 ${getScoreColor(item.score)}`} />
                          <p className={`text-2xl font-bold ${getScoreColor(item.score)}`}>{item.score}</p>
                          <p className="text-card-caption text-muted-foreground mt-1">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Feedback */}
                  <Card className="p-6 sm:p-8 border-border/50 bg-card/50 backdrop-blur-sm">
                    <h3 className="text-card-title-lg font-bold mb-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-primary" />
                      </div>
                      <span>Nhận xét tổng hợp</span>
                    </h3>
                    <p className="text-body text-foreground/80 leading-relaxed">{evaluation.overallFeedback}</p>
                  </Card>

                  {/* Strengths & Improvements */}
                  <div className="grid sm:grid-cols-2 gap-5">
                    <Card className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
                      <h3 className="text-card-title font-bold mb-4 flex items-center gap-3 text-green-600 dark:text-green-400">
                        <CheckCircle className="w-5 h-5" />
                        Điểm mạnh
                      </h3>
                      <ul className="space-y-3">
                        {evaluation.strengths.map((strength, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-card-body">
                            <Sparkles className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                            <span className="leading-relaxed">{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>

                    <Card className="p-6 bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-orange-500/30">
                      <h3 className="text-card-title font-bold mb-4 flex items-center gap-3 text-orange-600 dark:text-orange-400">
                        <AlertCircle className="w-5 h-5" />
                        Cần cải thiện
                      </h3>
                      <ul className="space-y-3">
                        {evaluation.improvements.map((improvement, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-card-body">
                            <Zap className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                            <span className="leading-relaxed">{improvement}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  </div>

                  {/* Tips */}
                  <Card className="p-6 sm:p-8 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/30">
                    <h3 className="text-card-title-lg font-bold mb-5 flex items-center gap-3 text-blue-600 dark:text-blue-400">
                      <Lightbulb className="w-5 h-5" />
                      Lời khuyên cho buổi phỏng vấn tiếp theo
                    </h3>
                    <ul className="space-y-3">
                      {evaluation.tips.map((tip, idx) => (
                        <li key={idx} className="flex items-start gap-4 text-card-body">
                          <span className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-badge font-bold text-blue-600 shrink-0">
                            {idx + 1}
                          </span>
                          <span className="leading-relaxed">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>

                  {/* Restart Button */}
                  <Button
                    onClick={resetInterview}
                    className="w-full h-16 text-button-lg bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 shadow-lg hover:opacity-90 transition-all"
                  >
                    <RotateCcw className="w-5 h-5 mr-3" />
                    Phỏng vấn lại
                  </Button>
                </>
              ) : (
                <Card className="p-10 text-center border-border/50 bg-card/50 backdrop-blur-sm">
                  <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-5" />
                  <h2 className="text-title font-bold mb-2">Hoàn thành phỏng vấn!</h2>
                  <Button onClick={resetInterview} className="mt-5">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Bắt đầu lại
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
