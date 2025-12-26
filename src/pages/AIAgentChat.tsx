import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import CleanHeader from "@/components/CleanHeader";
import CommonFooter from "@/components/CommonFooter";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Send, 
  Loader2, 
  RotateCcw,
  Crown,
  Zap,
  AlertCircle,
  BookOpen,
  GraduationCap,
  HelpCircle,
  CheckCircle,
  ArrowLeft,
  Mic,
  MicOff,
  ImagePlus,
  Sparkles,
  X
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Import icons
import lukasLogo from "@/assets/ai-agent/lukas-logo.jpg";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  cached?: boolean;
  images?: string[];
}

// Agent-specific suggested questions (i18n)
const getAgentQuestions = (t: TFunction) =>
  ({
    topik: (t("aiChat.questions.topik", { returnObjects: true }) as string[]) ?? [],
    ielts: (t("aiChat.questions.ielts", { returnObjects: true }) as string[]) ?? [],
    jlpt: (t("aiChat.questions.jlpt", { returnObjects: true }) as string[]) ?? [],
    hsk: (t("aiChat.questions.hsk", { returnObjects: true }) as string[]) ?? [],
  }) satisfies Record<string, string[]>;

// Agent-specific welcome messages (i18n)
const getAgentWelcome = (t: TFunction) =>
  ({
    topik: {
      title: t("aiChat.welcome.topik.title"),
      subtitle: t("aiChat.welcome.topik.subtitle"),
    },
    ielts: {
      title: t("aiChat.welcome.ielts.title"),
      subtitle: t("aiChat.welcome.ielts.subtitle"),
    },
    jlpt: {
      title: t("aiChat.welcome.jlpt.title"),
      subtitle: t("aiChat.welcome.jlpt.subtitle"),
    },
    hsk: {
      title: t("aiChat.welcome.hsk.title"),
      subtitle: t("aiChat.welcome.hsk.subtitle"),
    },
  }) satisfies Record<string, { title: string; subtitle: string }>;

const AIAgentChat = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [remainingQuestions, setRemainingQuestions] = useState<number | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: t("aiAgent.fileTooLarge"),
          description: t("aiAgent.fileSizeLimit"),
          variant: "destructive"
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setSelectedImages(prev => [...prev, ev.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Toggle voice recording (placeholder for STT)
  const toggleRecording = () => {
    if (!isRecording) {
      toast({
        title: t("aiAgent.featureDeveloping"),
        description: t("aiAgent.voiceComingSoon")
      });
    }
    setIsRecording(!isRecording);
  };

  const sendMessage = useCallback(async (content?: string) => {
    const messageText = content || input.trim();
    if ((!messageText && selectedImages.length === 0) || isLoading) return;

    if (!isAuthenticated) {
      toast({
        title: t("aiAgent.pleaseLogin"),
        description: t("aiAgent.loginToUse"),
        variant: "destructive"
      });
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageText,
      timestamp: new Date(),
      images: selectedImages.length > 0 ? [...selectedImages] : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setSelectedImages([]);
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const allMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
        images: m.images,
      }));

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages,
          stream: true,
          agentId,
          language: i18n.resolvedLanguage || i18n.language,
        }),
      });

      // Handle error responses
      if (!response.ok) {
        const errorData = await response.json();
        
        if (response.status === 429) {
          if (errorData.error === "daily_limit_exceeded") {
            setRemainingQuestions(0);
            toast({
              title: t("aiAgent.outOfQuestions"),
              description: t("aiAgent.upgradePremium"),
              variant: "destructive"
            });
          } else {
            toast({
              title: t("aiAgent.systemBusy"),
              description: t("aiAgent.tryAgainLater"),
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
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("aiAgent.cannotSend"),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, isAuthenticated, messages, toast, selectedImages, agentId]);

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
      
      <main className="flex-1 flex flex-col pt-16">
        {/* Chat Header - Simple without logo */}
        <div className="border-b border-border/50 bg-background/80 backdrop-blur sticky top-16 z-10">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/ai-chat")}
                className="shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              
              <div className="text-center flex-1">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight">
                  {agentId?.toUpperCase()} Agent
                </h1>
              </div>

              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearChat}
                  title={t("aiAgent.clearChat")}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Chat Area - Full Width */}
        <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full">
          {messages.length === 0 ? (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mb-6"
              >
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-primary/20 shadow-xl mx-auto">
                  <img src={lukasLogo} alt="LUKATO AI" className="w-full h-full object-cover" />
                </div>
              </motion.div>
              const welcomeMap = getAgentWelcome(t);
              const questionMap = getAgentQuestions(t);
              const welcome = (welcomeMap[agentId || "topik"] || welcomeMap.topik);
              const questions = (questionMap[agentId || "topik"] || questionMap.topik);

              return (
                <>
                  <h2 className="text-2xl font-bold mb-2">{welcome.title}</h2>
                  <p className="text-muted-foreground mb-8 max-w-md">{welcome.subtitle}</p>

                  {/* Suggested Questions */}
                  <div className="w-full max-w-2xl">
                    <p className="text-sm text-muted-foreground mb-4">💡 {t("aiAgent.suggestedQuestions")}</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {questions.map((text, i) => {
                        const Icon = [BookOpen, GraduationCap, HelpCircle, CheckCircle][i % 4];
                        return (
                          <motion.button
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            onClick={() => sendMessage(text)}
                            disabled={isLoading || !isAuthenticated}
                            className="text-left px-4 py-4 rounded-xl border border-border bg-card hover:bg-muted/50 hover:border-primary/30 transition-all text-sm group disabled:opacity-50"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                                <Icon className="w-4 h-4 text-primary" />
                              </div>
                              <span className="leading-relaxed">{text}</span>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </>
              );
          ) : (
            /* Messages */
            <ScrollArea ref={scrollAreaRef} className="flex-1 px-4">
              <div className="max-w-4xl mx-auto py-6 space-y-6">
                <AnimatePresence mode="popLayout">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`flex gap-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {message.role === "assistant" && (
                        <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-primary/20 shrink-0">
                          <img src={lukasLogo} alt="LUKATO AI" className="w-full h-full object-cover" />
                        </div>
                      )}
                      
                      <div className={`max-w-[85%] md:max-w-[75%] ${message.role === "user" ? "order-first" : ""}`}>
                        {/* User images */}
                        {message.images && message.images.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2 justify-end">
                            {message.images.map((img, idx) => (
                              <img 
                                key={idx} 
                                src={img} 
                                alt="Uploaded" 
                                className="max-w-[200px] max-h-[150px] rounded-lg object-cover"
                              />
                            ))}
                          </div>
                        )}
                        
                        <div className={`rounded-2xl px-5 py-4 ${
                          message.role === "user" 
                            ? "bg-primary text-primary-foreground rounded-br-sm" 
                            : "bg-muted/60 rounded-bl-sm"
                        }`}>
                          {message.role === "assistant" ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-primary prose-pre:bg-background/50 prose-table:text-sm">
                              <ReactMarkdown 
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  table: ({ ...props }) => (
                                    <div className="overflow-x-auto my-4">
                                      <table className="min-w-full border-collapse border border-border rounded-lg" {...props} />
                                    </div>
                                  ),
                                  th: ({ ...props }) => (
                                    <th className="border border-border bg-muted px-3 py-2 text-left font-semibold" {...props} />
                                  ),
                                  td: ({ ...props }) => (
                                    <td className="border border-border px-3 py-2" {...props} />
                                  ),
                                  code: ({ className, children, ...props }) => {
                                    const match = /language-(\w+)/.exec(className || '');
                                    const isInline = !match;
                                    return isInline ? (
                                      <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                                        {children}
                                      </code>
                                    ) : (
                                      <code className={className} {...props}>
                                        {children}
                                      </code>
                                    );
                                  },
                                  pre: ({ ...props }) => (
                                    <pre className="bg-background/80 border border-border rounded-lg p-4 overflow-x-auto" {...props} />
                                  ),
                                }}
                              >
                                {message.content || "..."}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                          )}
                        </div>
                        
                        {message.cached && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <Zap className="w-3 h-3" />
                            {t("aiAgent.cachedResponse")} ⚡
                          </div>
                        )}
                      </div>
                      
                      {message.role === "user" && (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-korean-blue to-korean-green flex items-center justify-center shrink-0">
                          <GraduationCap className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Loading indicator */}
                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-primary/20">
                      <img src={lukasLogo} alt="LUKATO AI" className="w-full h-full object-cover" />
                    </div>
                    <div className="bg-muted/60 rounded-2xl rounded-bl-sm px-5 py-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{t("aiAgent.thinking")} 🤔</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </ScrollArea>
          )}

          {/* Input Area */}
          <div className="border-t border-border/50 bg-background/80 backdrop-blur p-4">
            <div className="max-w-4xl mx-auto">
              {/* Image previews */}
              {selectedImages.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedImages.map((img, idx) => (
                    <div key={idx} className="relative">
                      <img 
                        src={img} 
                        alt="Preview" 
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!isAuthenticated ? (
                <div className="text-center py-6">
                  <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">{t("aiAgent.loginPrompt")} 🔐</p>
                  <Button onClick={() => navigate("/auth")} className="gap-2">
                    <Sparkles className="w-4 h-4" />
                    {t("common.login")}
                  </Button>
                </div>
              ) : remainingQuestions === 0 && !isPremium ? (
                <div className="text-center py-6">
                  <Crown className="w-10 h-10 text-korean-yellow mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">{t("aiAgent.noQuestionsLeft")} 😢</p>
                  <Button onClick={() => navigate("/pricing")} className="gap-2 bg-korean-yellow hover:bg-korean-yellow/90 text-black">
                    <Crown className="w-4 h-4" />
                    {t("aiAgent.upgradePremiumBtn")}
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2 items-end">
                  {/* Image upload */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    className="shrink-0 h-11 w-11"
                    title={t("aiAgent.uploadImage")}
                  >
                    <ImagePlus className="w-5 h-5" />
                  </Button>

                  <Button
                    variant={isRecording ? "destructive" : "outline"}
                    size="icon"
                    onClick={toggleRecording}
                    className="shrink-0 h-11 w-11"
                    title={t("aiAgent.voiceInput")}
                  >
                    {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </Button>
                  <div className="flex-1 relative">
                    <Textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={t("aiAgent.placeholder")}
                      disabled={isLoading}
                      className="min-h-[44px] max-h-40 resize-none pr-14 rounded-xl text-base"
                      rows={1}
                    />
                    <Button
                      size="icon"
                      onClick={() => sendMessage()}
                      disabled={(!input.trim() && selectedImages.length === 0) || isLoading}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-lg"
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

              {isAuthenticated && (
                <p className="text-xs text-center text-muted-foreground mt-3">
                  {t("aiAgent.hint")} 📝
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      <CommonFooter />
    </div>
  );
};

export default AIAgentChat;
