import { useState, useRef, useEffect } from "react";
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
  Volume2,
  MessageSquare,
  RotateCcw,
  Trophy,
  Target,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { PremiumPreviewBanner } from "@/components/PremiumPreviewBanner";
import { useSubscription } from "@/hooks/useSubscription";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface InterviewScore {
  overall: number;
  content: number;
  communication: number;
  korean: number;
}

const InterviewSimulation = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isPremium } = useSubscription();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewEnded, setInterviewEnded] = useState(false);
  const [score, setScore] = useState<InterviewScore | null>(null);

  const companies = [
    { name: "삼성전자", type: "대기업", color: "from-blue-500 to-blue-600" },
    { name: "LG전자", type: "대기업", color: "from-red-500 to-red-600" },
    { name: "네이버", type: "IT", color: "from-green-500 to-green-600" },
    { name: "카카오", type: "IT", color: "from-yellow-500 to-yellow-600" },
    { name: "현대자동차", type: "대기업", color: "from-slate-500 to-slate-600" },
    { name: "스타트업", type: "스타트업", color: "from-purple-500 to-purple-600" }
  ];

  const positions = [
    "소프트웨어 개발자",
    "마케팅",
    "영업",
    "인사/HR",
    "디자인",
    "일반 사무직"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startInterview = async () => {
    if (!selectedCompany || !selectedPosition) {
      toast({
        title: "선택이 필요합니다",
        description: "기업과 직무를 선택해주세요.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setInterviewStarted(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("interview-simulation", {
        body: { 
          action: "start",
          company: selectedCompany,
          position: selectedPosition
        }
      });
      
      if (error) throw error;
      
      setMessages([{ role: "assistant", content: data.message }]);
      
      // TTS for first message
      await speakText(data.message);
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

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;
    
    const userMessage = inputText.trim();
    setInputText("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("interview-simulation", {
        body: { 
          action: "respond",
          company: selectedCompany,
          position: selectedPosition,
          messages: [...messages, { role: "user", content: userMessage }],
          userMessage
        }
      });
      
      if (error) throw error;
      
      if (data.ended) {
        setInterviewEnded(true);
        setScore(data.score);
      }
      
      setMessages(prev => [...prev, { role: "assistant", content: data.message }]);
      
      // TTS
      await speakText(data.message);
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

  const speakText = async (text: string) => {
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
            text: text.slice(0, 500), // Limit for TTS
            voiceId: "onwK4e9ZLuTAKqWW03F9" // Daniel - Korean male voice
          })
        }
      );
      
      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.onended = () => setIsSpeaking(false);
        await audio.play();
      }
    } catch (error) {
      console.error("TTS error:", error);
    } finally {
      setIsSpeaking(false);
    }
  };

  const resetInterview = () => {
    setSelectedCompany(null);
    setSelectedPosition(null);
    setMessages([]);
    setInterviewStarted(false);
    setInterviewEnded(false);
    setScore(null);
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
              <span className="text-sm font-medium">AI 면접관</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-bold">
              <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                면접 시뮬레이션
              </span>
            </h1>
            <p className="text-muted-foreground text-sm">
              실제 한국 기업 면접과 똑같이 연습하세요
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
                  <Building2 className="w-5 h-5 text-primary" />
                  면접 기업 선택
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                      <span className="font-medium">{company.name}</span>
                      <span className="text-xs opacity-70">{company.type}</span>
                    </Button>
                  ))}
                </div>
              </Card>

              {/* Position Selection */}
              <Card className="p-6">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  지원 직무 선택
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {positions.map((position) => (
                    <Button
                      key={position}
                      variant={selectedPosition === position ? "default" : "outline"}
                      onClick={() => setSelectedPosition(position)}
                      className="h-auto py-3"
                    >
                      {position}
                    </Button>
                  ))}
                </div>
              </Card>

              {/* Start Button */}
              <Button
                onClick={startInterview}
                disabled={!selectedCompany || !selectedPosition || isLoading}
                className="w-full h-14 text-lg bg-gradient-to-r from-orange-500 to-red-500 text-white hover:opacity-90"
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
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">{selectedCompany} 면접관</p>
                      <p className="text-xs text-muted-foreground">{selectedPosition} 직무 면접</p>
                    </div>
                  </div>
                  {isSpeaking && (
                    <div className="flex items-center gap-2 text-orange-500">
                      <Volume2 className="w-4 h-4 animate-pulse" />
                      <span className="text-xs">말하는 중...</span>
                    </div>
                  )}
                </div>
              </Card>

              {/* Messages */}
              <Card className="p-4 h-[400px] overflow-y-auto">
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
                          className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
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
                      <div className="bg-muted rounded-2xl px-4 py-3">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </Card>

              {/* Input */}
              <div className="flex gap-2">
                <Input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="답변을 입력하세요..."
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button
                  onClick={sendMessage}
                  disabled={isLoading || !inputText.trim()}
                  className="bg-gradient-to-r from-orange-500 to-red-500"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Result Phase */}
          {interviewEnded && score && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <Card className="p-6 text-center">
                <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
                <h2 className="text-2xl font-bold mb-2">면접 완료!</h2>
                <p className="text-muted-foreground mb-6">
                  {selectedCompany} {selectedPosition} 모의 면접을 완료했습니다
                </p>

                {/* Scores */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-xl">
                    <p className="text-3xl font-bold text-yellow-500">{score.overall}</p>
                    <p className="text-sm text-muted-foreground">종합 점수</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-xl">
                    <p className="text-3xl font-bold">{score.content}</p>
                    <p className="text-sm text-muted-foreground">답변 내용</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-xl">
                    <p className="text-3xl font-bold">{score.communication}</p>
                    <p className="text-sm text-muted-foreground">커뮤니케이션</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-xl">
                    <p className="text-3xl font-bold">{score.korean}</p>
                    <p className="text-sm text-muted-foreground">한국어 능력</p>
                  </div>
                </div>

                <Button
                  onClick={resetInterview}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  다시 면접하기
                </Button>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </main>

      <AppFooter />
    </div>
  );
};

export default InterviewSimulation;
