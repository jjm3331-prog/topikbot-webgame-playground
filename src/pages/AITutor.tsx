import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, Crown, ExternalLink, AlertCircle, Loader2, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import CleanHeader from "@/components/CleanHeader";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const MAX_FREE_QUESTIONS = 30;
const RESET_HOURS = 24;
const AI_TUTOR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`;

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
  const [showLimitPopup, setShowLimitPopup] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const chatContainerRef = useRef<HTMLDivElement>(null);

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
      const limitReached = data.question_count >= MAX_FREE_QUESTIONS;
      setCanAsk(!limitReached);
      
      // Show popup if limit was already reached
      if (limitReached) {
        setShowLimitPopup(true);
      }
      
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

  // Auto-scroll to bottom when messages change or streaming content updates
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const handleSubmit = async () => {
    if (!question.trim() || !canAsk || sending) return;

    setSending(true);
    setStreamingContent("");
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
      
      // Check if limit reached after this question
      if (newCount >= MAX_FREE_QUESTIONS) {
        setCanAsk(false);
        // Show popup after the response is received
        setTimeout(() => {
          setShowLimitPopup(true);
        }, 1500);
      }

      // Call AI API with streaming
      const response = await fetch(AI_TUTOR_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userMessage }],
          stream: true
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please try again later.");
        }
        throw new Error("Failed to get response");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Process complete SSE events
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim() || line.startsWith(":")) continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") continue;

          try {
            const data = JSON.parse(jsonStr);
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (text) {
              fullContent += text;
              setStreamingContent(fullContent);
            }
          } catch {
            // Ignore incomplete JSON
          }
        }
      }

      // Add final message
      if (fullContent) {
        setMessages(prev => [...prev, { role: "assistant", content: fullContent }]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: "Xin lỗi, tôi không thể trả lời câu hỏi này. Vui lòng thử lại." }]);
      }
      setStreamingContent("");
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể gửi câu hỏi. Vui lòng thử lại.",
        variant: "destructive"
      });
      // Remove the user message if failed
      setMessages(prev => prev.slice(0, -1));
      setStreamingContent("");
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
      <CleanHeader isLoggedIn={!!user} username={user?.email?.split('@')[0]} />
      
      {/* Limit Reached Popup Dialog */}
      <Dialog open={showLimitPopup} onOpenChange={setShowLimitPopup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <AlertCircle className="w-6 h-6 text-korean-orange" />
              Đã hết lượt hỏi miễn phí!
            </DialogTitle>
            <DialogDescription className="text-left pt-4 space-y-4">
              <p>
                Bạn đã sử dụng hết <span className="font-bold text-primary">{MAX_FREE_QUESTIONS} câu hỏi miễn phí</span> trong 24 giờ.
              </p>
              <p>
                Reset sau: <span className="font-bold text-korean-green">{formatTimeRemaining()}</span>
              </p>
              
              <div className="bg-gradient-to-r from-primary/10 via-korean-purple/10 to-korean-pink/10 rounded-xl p-4 mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-5 h-5 text-korean-yellow" />
                  <span className="font-bold text-foreground">Dành cho Plus / Premium</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Trải nghiệm <span className="font-bold text-primary">LUKATO AI Agent</span> - dịch vụ hỏi đáp AI cao cấp nhất với công nghệ RAG AI tiên tiến, không giới hạn số lượng câu hỏi!
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="w-4 h-4 text-korean-yellow" />
                  <span>Trả lời chính xác hơn • Không giới hạn • Hỗ trợ 24/7</span>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-3 mt-4">
            <Button
              onClick={() => window.open("https://chat-topikbot.kr", "_blank")}
              className="w-full bg-gradient-to-r from-korean-orange to-korean-pink hover:from-korean-orange/90 hover:to-korean-pink/90 text-white font-bold"
            >
              <Crown className="w-4 h-4 mr-2" />
              Truy cập LUKATO AI Agent
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowLimitPopup(false)}
              className="w-full"
            >
              Đóng
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
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
              Đặt câu hỏi về tiếng Hàn, TOPIK, ngữ pháp và từ vựng.
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
                  onClick={() => setShowLimitPopup(true)}
                  className="bg-gradient-to-r from-korean-orange to-korean-pink hover:from-korean-orange/90 hover:to-korean-pink/90 text-white"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">LUKATO AI Agent</span>
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </Card>

          {/* Limit Reached Warning Banner */}
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
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={() => window.open("https://chat-topikbot.kr", "_blank")}
                      className="bg-gradient-to-r from-korean-orange to-korean-pink hover:from-korean-orange/90 hover:to-korean-pink/90 text-white"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Truy cập LUKATO AI Agent
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate("/pricing")}
                    >
                      Xem bảng giá Premium
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Chat Messages */}
          <Card ref={chatContainerRef} className="p-4 min-h-[400px] max-h-[500px] overflow-y-auto bg-card border-border">
            {messages.length === 0 && !streamingContent ? (
              <div className="h-full flex items-center justify-center text-center">
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageCircle className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Chào bạn! 👋</p>
                    <p className="text-muted-foreground text-sm">
                      Hãy đặt câu hỏi về tiếng Hàn, TOPIK hoặc ngữ pháp.
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
                    <div className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                      msg.role === "user" 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted text-foreground"
                    }`}>
                      {msg.role === "user" ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none
                          prose-headings:text-foreground prose-headings:font-bold prose-headings:my-3
                          prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
                          prose-p:text-foreground prose-p:my-2 prose-p:leading-relaxed
                          prose-strong:text-primary prose-strong:font-bold
                          prose-em:text-korean-purple prose-em:italic
                          prose-ul:my-2 prose-ul:pl-4 prose-ol:my-2 prose-ol:pl-4
                          prose-li:text-foreground prose-li:my-1
                          prose-code:bg-background prose-code:text-korean-pink prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono
                          prose-pre:bg-background prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:p-4 prose-pre:overflow-x-auto
                          prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground
                          prose-a:text-primary prose-a:underline hover:prose-a:text-primary/80
                          prose-table:w-full prose-table:border-collapse prose-table:my-4
                          prose-thead:bg-muted/50
                          prose-th:border prose-th:border-border prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-semibold prose-th:text-foreground
                          prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-2 prose-td:text-foreground
                          prose-tr:even:bg-muted/30
                          prose-hr:border-border prose-hr:my-4
                        ">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
                
                {/* Streaming content */}
                {streamingContent && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="max-w-[85%] rounded-2xl px-5 py-4 bg-muted text-foreground">
                      <div className="prose prose-sm dark:prose-invert max-w-none
                        prose-headings:text-foreground prose-headings:font-bold prose-headings:my-3
                        prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
                        prose-p:text-foreground prose-p:my-2 prose-p:leading-relaxed
                        prose-strong:text-primary prose-strong:font-bold
                        prose-em:text-korean-purple prose-em:italic
                        prose-ul:my-2 prose-ul:pl-4 prose-ol:my-2 prose-ol:pl-4
                        prose-li:text-foreground prose-li:my-1
                        prose-code:bg-background prose-code:text-korean-pink prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono
                        prose-pre:bg-background prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:p-4 prose-pre:overflow-x-auto
                        prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground
                        prose-a:text-primary prose-a:underline hover:prose-a:text-primary/80
                        prose-table:w-full prose-table:border-collapse prose-table:my-4
                        prose-thead:bg-muted/50
                        prose-th:border prose-th:border-border prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-semibold prose-th:text-foreground
                        prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-2 prose-td:text-foreground
                        prose-tr:even:bg-muted/30
                        prose-hr:border-border prose-hr:my-4
                      ">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {streamingContent}
                        </ReactMarkdown>
                        <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Loading indicator when sending but no streaming content yet */}
                {sending && !streamingContent && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Đang suy nghĩ</span>
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
              placeholder={canAsk ? "Nhập câu hỏi của bạn" : "Bạn đã hết lượt hỏi miễn phí hôm nay"}
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