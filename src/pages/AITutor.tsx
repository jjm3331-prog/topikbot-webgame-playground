import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageCircle, Send, Crown, ExternalLink, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MegaMenu } from "@/components/MegaMenu";

const MAX_FREE_QUESTIONS = 5;
const RESET_HOURS = 24;

interface Message {
  role: "user" | "assistant";
  content: string;
}

const AITutor = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [canAsk, setCanAsk] = useState(true);
  const [nextResetTime, setNextResetTime] = useState<Date | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
    await checkQuestionUsage(session.user.id);
    setLoading(false);
  };

  const checkQuestionUsage = async (userId: string) => {
    const { data, error } = await supabase
      .from("ai_question_usage")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error checking usage:", error);
      return;
    }

    if (!data) {
      // First time user - create record
      await supabase.from("ai_question_usage").insert({
        user_id: userId,
        question_count: 0,
        last_reset_at: new Date().toISOString()
      });
      setQuestionCount(0);
      setCanAsk(true);
      return;
    }

    const lastReset = new Date(data.last_reset_at);
    const now = new Date();
    const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);

    if (hoursSinceReset >= RESET_HOURS) {
      // Reset the counter
      await supabase
        .from("ai_question_usage")
        .update({ 
          question_count: 0, 
          last_reset_at: now.toISOString() 
        })
        .eq("user_id", userId);
      setQuestionCount(0);
      setCanAsk(true);
    } else {
      setQuestionCount(data.question_count);
      setCanAsk(data.question_count < MAX_FREE_QUESTIONS);
      
      // Calculate next reset time
      const resetTime = new Date(lastReset.getTime() + RESET_HOURS * 60 * 60 * 1000);
      setNextResetTime(resetTime);
    }
  };

  const formatTimeRemaining = () => {
    if (!nextResetTime) return "";
    const now = new Date();
    const diff = nextResetTime.getTime() - now.getTime();
    if (diff <= 0) return "Sắp được reset";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const handleSubmit = async () => {
    if (!question.trim() || !canAsk || sending) return;

    setSending(true);
    const userMessage = question.trim();
    setQuestion("");
    
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);

    try {
      // Increment question count
      const newCount = questionCount + 1;
      await supabase
        .from("ai_question_usage")
        .update({ question_count: newCount })
        .eq("user_id", user.id);
      
      setQuestionCount(newCount);
      if (newCount >= MAX_FREE_QUESTIONS) {
        setCanAsk(false);
      }

      // Call AI API
      const response = await supabase.functions.invoke("ai-tutor", {
        body: { 
          messages: [...messages, { role: "user", content: userMessage }]
        }
      });

      if (response.error) throw response.error;

      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: response.data.response 
      }]);
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Lỗi",
        description: "Không thể gửi câu hỏi. Vui lòng thử lại.",
        variant: "destructive"
      });
      // Remove the user message if failed
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MegaMenu />
      
      <main className="pt-24 pb-8 px-4 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-heading font-bold text-foreground">
              🤖 Hỏi AI Gia sư
            </h1>
            <p className="text-muted-foreground">
              Đặt câu hỏi về tiếng Hàn, TOPIK, ngữ pháp, từ vựng...
            </p>
          </div>

          {/* Usage Status */}
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  canAsk ? "bg-green-500/20 text-green-500" : "bg-destructive/20 text-destructive"
                }`}>
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {questionCount}/{MAX_FREE_QUESTIONS} câu hỏi hôm nay
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {canAsk 
                      ? `Còn ${MAX_FREE_QUESTIONS - questionCount} câu hỏi miễn phí`
                      : `Reset sau: ${formatTimeRemaining()}`
                    }
                  </p>
                </div>
              </div>
              
              {!canAsk && (
                <Button
                  onClick={() => window.open("https://chat-topikbot.kr", "_blank")}
                  className="btn-primary text-primary-foreground"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  LUKATO AI không giới hạn
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </Card>

          {/* Limit Reached Warning */}
          {!canAsk && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-r from-primary/10 via-korean-purple/10 to-korean-pink/10 border border-primary/20 rounded-2xl p-6"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-foreground mb-2">
                    Đã hết lượt hỏi miễn phí hôm nay!
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Bạn đã sử dụng hết {MAX_FREE_QUESTIONS} câu hỏi miễn phí trong 24 giờ. 
                    Nâng cấp Premium để hỏi AI không giới hạn với công nghệ RAG AI tiên tiến nhất!
                  </p>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => window.open("https://chat-topikbot.kr", "_blank")}
                      className="btn-primary text-primary-foreground"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Truy cập LUKATO AI Engine
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate("/#pricing")}
                    >
                      Xem bảng giá Premium
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Chat Messages */}
          <Card className="p-4 min-h-[400px] max-h-[500px] overflow-y-auto bg-card border-border">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center">
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageCircle className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Chào bạn! 👋</p>
                    <p className="text-muted-foreground text-sm">
                      Hãy đặt câu hỏi về tiếng Hàn, TOPIK, ngữ pháp...
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === "user" 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted text-foreground"
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </motion.div>
                ))}
                {sending && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-muted rounded-2xl px-4 py-3">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </Card>

          {/* Input */}
          <div className="flex gap-3">
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={canAsk ? "Nhập câu hỏi của bạn..." : "Đã hết lượt hỏi miễn phí"}
              disabled={!canAsk || sending}
              className="resize-none min-h-[60px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <Button
              onClick={handleSubmit}
              disabled={!question.trim() || !canAsk || sending}
              className="btn-primary text-primary-foreground h-auto px-6"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default AITutor;