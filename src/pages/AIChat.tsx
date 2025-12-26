import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CleanHeader from "@/components/CleanHeader";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Loader2, 
  RotateCcw,
  Crown,
  Zap,
  AlertCircle,
  CheckCircle,
  BookOpen,
  GraduationCap,
  HelpCircle
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  cached?: boolean;
}

const SUGGESTED_QUESTIONS = [
  "TOPIK II 쓰기 51번 문제 푸는 팁이 있나요?",
  "'-아/어서'와 '-니까'의 차이점을 알려주세요",
  "듣기 문제에서 숫자 들을 때 팁이 있나요?",
  "TOPIK I 급수별 합격 점수가 어떻게 되나요?",
];

const AIChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [remainingQuestions, setRemainingQuestions] = useState<number | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Check auth status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      
      if (user) {
        const { data: sub } = await supabase
          .from('user_subscriptions')
          .select('plan')
          .eq('user_id', user.id)
          .maybeSingle();
        setIsPremium(sub?.plan === 'premium' || sub?.plan === 'plus');
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Parse Gemini SSE stream
  const parseGeminiStream = async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onDelta: (text: string) => void,
    onDone: () => void
  ) => {
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            
            try {
              const parsed = JSON.parse(jsonStr);
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) onDelta(text);
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error("Stream parsing error:", error);
    }
    
    onDone();
  };

  const sendMessage = useCallback(async (content?: string) => {
    const messageText = content || input.trim();
    if (!messageText || isLoading) return;

    if (!isAuthenticated) {
      toast({
        title: "Vui lòng đăng nhập",
        description: "Đăng nhập để sử dụng LUKATO AI Agent",
        variant: "destructive"
      });
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const allMessages = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages: allMessages, stream: true })
        }
      );

      // Handle error responses
      if (!response.ok) {
        const errorData = await response.json();
        
        if (response.status === 429) {
          if (errorData.error === "daily_limit_exceeded") {
            setRemainingQuestions(0);
            toast({
              title: "Hết lượt hỏi miễn phí",
              description: "Nâng cấp Premium để hỏi không giới hạn!",
              variant: "destructive"
            });
          } else {
            toast({
              title: "Hệ thống bận",
              description: "Vui lòng thử lại sau ít phút",
              variant: "destructive"
            });
          }
          setIsLoading(false);
          return;
        }
        
        throw new Error(errorData.message || "Lỗi kết nối");
      }

      // Check for remaining questions header
      const remaining = response.headers.get("X-Remaining-Questions");
      if (remaining) {
        setRemainingQuestions(parseInt(remaining));
      }

      // Check if it's a cached response (JSON) or stream
      const contentType = response.headers.get("Content-Type");
      
      if (contentType?.includes("application/json")) {
        const data = await response.json();
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
          cached: data.cached
        };
        setMessages(prev => [...prev, assistantMessage]);
        if (data.remaining !== undefined) {
          setRemainingQuestions(data.remaining);
        }
      } else {
        // Stream response
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader available");

        const assistantMessageId = `assistant-${Date.now()}`;
        let fullText = "";

        setMessages(prev => [...prev, {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          timestamp: new Date()
        }]);

        await parseGeminiStream(
          reader,
          (deltaText) => {
            fullText += deltaText;
            setMessages(prev => prev.map(m => 
              m.id === assistantMessageId ? { ...m, content: fullText } : m
            ));
          },
          () => {
            // Stream complete
          }
        );
      }
    } catch (error) {
      console.error("Send message error:", error);
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Không thể gửi tin nhắn",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, isAuthenticated, messages, toast]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CleanHeader />
      
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 pt-20 pb-4">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            LUKATO AI Agent
            <Badge variant="secondary" className="text-xs bg-korean-green/20 text-korean-green border-0">
              RAG
            </Badge>
          </div>
          
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            무엇이든 물어보세요
          </h1>
          <p className="text-muted-foreground text-sm">
            TOPIK 학습에 관한 모든 질문에 AI가 정확하게 답변해드립니다
          </p>

          {/* Usage indicator */}
          {isAuthenticated && !isPremium && remainingQuestions !== null && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm">
              <Zap className="w-4 h-4 text-korean-yellow" />
              <span>오늘 남은 질문: <strong>{remainingQuestions}</strong>/30</span>
            </div>
          )}
          
          {isPremium && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-korean-yellow/10 text-korean-yellow text-sm">
              <Crown className="w-4 h-4" />
              <span>Premium 무제한</span>
            </div>
          )}
        </motion.div>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col overflow-hidden border-border/50 bg-card/50 backdrop-blur">
          {messages.length === 0 ? (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-korean-blue to-korean-green flex items-center justify-center mb-6">
                <Bot className="w-8 h-8 text-white" />
              </div>
              
              <h2 className="text-lg font-semibold mb-2">LUKATO AI Agent</h2>
              <p className="text-muted-foreground text-sm mb-8 max-w-md">
                TOPIK 문법, 어휘, 시험 전략 등 무엇이든 물어보세요. RAG 기반으로 정확한 답변을 제공합니다.
              </p>

              {/* Suggested Questions */}
              <div className="w-full max-w-lg space-y-2">
                <p className="text-xs text-muted-foreground mb-3">추천 질문</p>
                <div className="grid gap-2">
                  {SUGGESTED_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      disabled={isLoading || !isAuthenticated}
                      className="text-left px-4 py-3 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/50 hover:border-primary/30 transition-all text-sm group disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                          {i === 0 && <BookOpen className="w-4 h-4 text-primary" />}
                          {i === 1 && <GraduationCap className="w-4 h-4 text-primary" />}
                          {i === 2 && <HelpCircle className="w-4 h-4 text-primary" />}
                          {i === 3 && <CheckCircle className="w-4 h-4 text-primary" />}
                        </div>
                        <span>{q}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Messages */
            <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {message.role === "assistant" && (
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-korean-blue to-korean-green flex items-center justify-center shrink-0">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                      )}
                      
                      <div className={`max-w-[80%] ${message.role === "user" ? "order-first" : ""}`}>
                        <div className={`rounded-2xl px-4 py-3 ${
                          message.role === "user" 
                            ? "bg-primary text-primary-foreground rounded-br-md" 
                            : "bg-muted/50 rounded-bl-md"
                        }`}>
                          {message.role === "assistant" ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {message.content || "..."}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          )}
                        </div>
                        
                        {message.cached && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <Zap className="w-3 h-3" />
                            캐시된 응답
                          </div>
                        )}
                      </div>
                      
                      {message.role === "user" && (
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-korean-blue to-korean-green flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    </div>
                    <div className="bg-muted/50 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>생각 중...</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </ScrollArea>
          )}

          {/* Input Area */}
          <div className="p-4 border-t border-border/50">
            {!isAuthenticated ? (
              <div className="text-center py-4">
                <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-3">로그인 후 이용 가능합니다</p>
                <Button onClick={() => window.location.href = "/auth"} className="gap-2">
                  로그인하기
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                {messages.length > 0 && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={clearChat}
                    className="shrink-0"
                    title="대화 초기화"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                )}
                
                <div className="flex-1 relative">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="질문을 입력하세요..."
                    disabled={isLoading || (remainingQuestions === 0 && !isPremium)}
                    className="min-h-[44px] max-h-32 resize-none pr-12 rounded-xl"
                    rows={1}
                  />
                  <Button
                    size="icon"
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || isLoading || (remainingQuestions === 0 && !isPremium)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {remainingQuestions === 0 && !isPremium && isAuthenticated && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 p-3 rounded-xl bg-korean-yellow/10 border border-korean-yellow/20"
              >
                <div className="flex items-center gap-3">
                  <Crown className="w-5 h-5 text-korean-yellow shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">오늘 무료 질문이 모두 소진되었습니다</p>
                    <p className="text-xs text-muted-foreground">Premium 구독으로 무제한 질문하세요</p>
                  </div>
                  <Button size="sm" className="bg-korean-yellow hover:bg-korean-yellow/90 text-foreground">
                    업그레이드
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
};

export default AIChat;
