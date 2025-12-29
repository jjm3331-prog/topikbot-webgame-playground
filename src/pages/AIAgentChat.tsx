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
  X,
  Copy,
  Check,
  MessageSquare,
  Plus,
  PanelLeftClose,
  PanelLeft,
  Trash2,
  Clock,
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

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Chat history state
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Load chat sessions from localStorage
  useEffect(() => {
    const storageKey = `chat_history_${agentId}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const sessions = parsed.map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt),
          messages: s.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })),
        }));
        setChatSessions(sessions);
      } catch (e) {
        console.error("Failed to load chat history:", e);
      }
    }
  }, [agentId]);

  // Save chat sessions to localStorage
  useEffect(() => {
    if (chatSessions.length > 0) {
      const storageKey = `chat_history_${agentId}`;
      localStorage.setItem(storageKey, JSON.stringify(chatSessions));
    }
  }, [chatSessions, agentId]);

  // Check auth status
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);

      if (user) {
        const { data: sub } = await supabase
          .from("user_subscriptions")
          .select("plan")
          .eq("user_id", user.id)
          .maybeSingle();
        setIsPremium(sub?.plan === "premium" || sub?.plan === "plus");
      }
    };
    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Copy to clipboard
  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(messageId);
      toast({
        title: "복사 완료",
        description: "클립보드에 복사되었습니다.",
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast({
        title: "복사 실패",
        description: "클립보드 접근이 거부되었습니다.",
        variant: "destructive",
      });
    }
  };

  // Create new chat session
  const createNewSession = () => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: "새 대화",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setChatSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setMessages([]);
  };

  // Load existing session
  const loadSession = (session: ChatSession) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
  };

  // Delete session
  const deleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChatSessions(prev => prev.filter(s => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
      setMessages([]);
    }
    
    // Update localStorage
    const storageKey = `chat_history_${agentId}`;
    const remaining = chatSessions.filter(s => s.id !== sessionId);
    if (remaining.length === 0) {
      localStorage.removeItem(storageKey);
    }
  };

  // Update session with new messages
  const updateCurrentSession = (newMessages: Message[]) => {
    if (!currentSessionId) {
      // Create new session if none exists
      const firstUserMessage = newMessages.find(m => m.role === "user");
      const title = firstUserMessage?.content.slice(0, 30) + (firstUserMessage?.content && firstUserMessage.content.length > 30 ? "..." : "") || "새 대화";
      
      const newSession: ChatSession = {
        id: `session-${Date.now()}`,
        title,
        messages: newMessages,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setChatSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
    } else {
      // Update existing session
      setChatSessions(prev => 
        prev.map(s => 
          s.id === currentSessionId 
            ? { ...s, messages: newMessages, updatedAt: new Date() }
            : s
        )
      );
    }
  };

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

    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: t("aiAgent.fileTooLarge"),
          description: t("aiAgent.fileSizeLimit"),
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setSelectedImages((prev) => [...prev, ev.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Toggle voice recording (placeholder for STT)
  const toggleRecording = () => {
    if (!isRecording) {
      toast({
        title: t("aiAgent.featureDeveloping"),
        description: t("aiAgent.voiceComingSoon"),
      });
    }
    setIsRecording(!isRecording);
  };

  const sendMessage = useCallback(
    async (content?: string) => {
      const messageText = content || input.trim();
      if ((!messageText && selectedImages.length === 0) || isLoading) return;

      if (!isAuthenticated) {
        toast({
          title: t("aiAgent.pleaseLogin"),
          description: t("aiAgent.loginToUse"),
          variant: "destructive",
        });
        return;
      }

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: messageText,
        timestamp: new Date(),
        images: selectedImages.length > 0 ? [...selectedImages] : undefined,
      };

      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setInput("");
      setSelectedImages([]);
      setIsLoading(true);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const allMessages = newMessages.map((m) => ({
          role: m.role,
          content: m.content,
          images: m.images,
        }));

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
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
                variant: "destructive",
              });
            } else {
              toast({
                title: t("aiAgent.systemBusy"),
                description: t("aiAgent.tryAgainLater"),
                variant: "destructive",
              });
            }
            setIsLoading(false);
            return;
          }

          throw new Error(errorData.message || "Connection error");
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
            cached: data.cached,
          };
          const finalMessages = [...newMessages, assistantMessage];
          setMessages(finalMessages);
          updateCurrentSession(finalMessages);
          if (data.remaining !== undefined) {
            setRemainingQuestions(data.remaining);
          }
        } else {
          // Stream response
          const reader = response.body?.getReader();
          if (!reader) throw new Error("No reader available");

          const assistantMessageId = `assistant-${Date.now()}`;
          let fullText = "";

          setMessages((prev) => [
            ...prev,
            {
              id: assistantMessageId,
              role: "assistant",
              content: "",
              timestamp: new Date(),
            },
          ]);

          await parseGeminiStream(
            reader,
            (deltaText) => {
              fullText += deltaText;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantMessageId ? { ...m, content: fullText } : m))
              );
            },
            () => {
              // Stream complete - save to session
              setMessages((prev) => {
                const updated = prev.map((m) => 
                  m.id === assistantMessageId ? { ...m, content: fullText } : m
                );
                updateCurrentSession(updated);
                return updated;
              });
            }
          );
        }
      } catch (error) {
        console.error("Send message error:", error);
        toast({
          title: t("common.error"),
          description: error instanceof Error ? error.message : t("aiAgent.cannotSend"),
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, isAuthenticated, messages, toast, selectedImages, agentId, i18n, t, currentSessionId]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Handle paste event for clipboard images
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'));
    
    if (imageItems.length > 0) {
      e.preventDefault(); // Prevent default paste behavior when there are images
      
      imageItems.forEach((item) => {
        const file = item.getAsFile();
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: t("aiAgent.fileTooLarge"),
            description: t("aiAgent.fileSizeLimit"),
            variant: "destructive",
          });
          return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            setSelectedImages((prev) => [...prev, ev.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });

      toast({
        title: "이미지 추가됨",
        description: "클립보드에서 이미지를 붙여넣었습니다.",
      });
    }
  }, [toast, t]);

  const clearChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
  };

  // Format date for sidebar
  const formatSessionDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return "오늘";
    if (days === 1) return "어제";
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  };

  // Pre-compute welcome/questions for empty state
  const welcomeMap = getAgentWelcome(t);
  const questionMap = getAgentQuestions(t);
  const welcome = welcomeMap[(agentId as keyof typeof welcomeMap) || "topik"] || welcomeMap.topik;
  const questions = questionMap[(agentId as keyof typeof questionMap) || "topik"] || questionMap.topik;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CleanHeader />

      <main className="flex-1 flex pt-16">
        {/* Chat History Sidebar */}
        <AnimatePresence mode="wait">
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-r border-border/50 bg-muted/30 flex flex-col h-[calc(100vh-4rem)] overflow-hidden"
            >
              {/* Sidebar Header */}
              <div className="p-4 border-b border-border/50">
                <Button 
                  onClick={createNewSession} 
                  className="w-full gap-2 justify-start"
                  variant="outline"
                >
                  <Plus className="w-4 h-4" />
                  새 대화
                </Button>
              </div>

              {/* Chat List */}
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {chatSessions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>대화 기록이 없습니다</p>
                    </div>
                  ) : (
                    chatSessions.map((session) => (
                      <motion.button
                        key={session.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => loadSession(session)}
                        className={`
                          w-full text-left p-3 rounded-xl transition-all group
                          ${currentSessionId === session.id 
                            ? "bg-primary/10 border border-primary/30" 
                            : "hover:bg-muted/80"
                          }
                        `}
                      >
                        <div className="flex items-start gap-3">
                          <MessageSquare className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {session.title}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              <span>{formatSessionDate(session.updatedAt)}</span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => deleteSession(session.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="border-b border-border/50 bg-background/80 backdrop-blur sticky top-16 z-10">
            <div className="px-4 md:px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="shrink-0"
                >
                  {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
                </Button>
                
                <Button variant="ghost" size="icon" onClick={() => navigate("/ai-chat")} className="shrink-0">
                  <ArrowLeft className="w-5 h-5" />
                </Button>

                <h1 className="text-xl md:text-2xl font-black tracking-tight">{agentId?.toUpperCase()} Agent</h1>
              </div>

              <div className="flex items-center gap-2">
                {/* Question counter for free users */}
                {isAuthenticated && !isPremium && remainingQuestions !== null && (
                  <Badge 
                    variant={remainingQuestions <= 3 ? "destructive" : "secondary"} 
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold"
                  >
                    <Zap className="w-4 h-4" />
                    <span>{remainingQuestions}/10</span>
                  </Badge>
                )}

                {/* Unlimited badge for premium users */}
                {isAuthenticated && isPremium && (
                  <Badge className="flex items-center gap-1.5 px-3 py-1.5 bg-korean-gold/20 text-korean-gold border-korean-gold/30">
                    <Crown className="w-4 h-4" />
                    <span>{t("aiChat.unlimited")}</span>
                  </Badge>
                )}

                {messages.length > 0 && (
                  <Button variant="ghost" size="icon" onClick={clearChat} title={t("aiAgent.clearChat")}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {messages.length === 0 ? (
              /* Empty State */
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-6">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-primary/20 shadow-xl mx-auto">
                    <img src={lukasLogo} alt="LUKATO AI" className="w-full h-full object-cover" />
                  </div>
                </motion.div>

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
              </div>
            ) : (
              /* Messages */
              <ScrollArea ref={scrollAreaRef} className="flex-1 px-4 md:px-8 lg:px-16">
                <div className="max-w-4xl mx-auto py-8 space-y-8">
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

                        <div className={`max-w-[85%] ${message.role === "user" ? "order-first" : ""}`}>
                          {/* User images */}
                          {message.images && message.images.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3 justify-end">
                              {message.images.map((img, idx) => (
                                <img
                                  key={idx}
                                  src={img}
                                  alt="Uploaded"
                                  className="max-w-[250px] max-h-[180px] rounded-xl object-cover"
                                />
                              ))}
                            </div>
                          )}

                          <div
                            className={`rounded-2xl ${
                              message.role === "user"
                                ? "bg-primary text-primary-foreground rounded-br-sm px-5 py-4"
                                : "bg-muted/40 rounded-bl-sm px-6 py-5 border border-border/30"
                            }`}
                          >
                            {message.role === "assistant" ? (
                              <div className="prose-ai">
                                <ReactMarkdown 
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    table: ({ children }) => (
                                      <div className="overflow-x-auto -mx-2 my-4">
                                        <table className="w-full border-collapse text-sm">
                                          {children}
                                        </table>
                                      </div>
                                    ),
                                    thead: ({ children }) => (
                                      <thead className="bg-muted/70 border-b-2 border-border">
                                        {children}
                                      </thead>
                                    ),
                                    tbody: ({ children }) => (
                                      <tbody className="divide-y divide-border/50">
                                        {children}
                                      </tbody>
                                    ),
                                    tr: ({ children }) => (
                                      <tr className="hover:bg-muted/40 transition-colors">
                                        {children}
                                      </tr>
                                    ),
                                    th: ({ children }) => (
                                      <th className="px-4 py-3 text-left font-semibold text-foreground whitespace-nowrap">
                                        {children}
                                      </th>
                                    ),
                                    td: ({ children }) => (
                                      <td className="px-4 py-3 text-foreground">
                                        {children}
                                      </td>
                                    ),
                                    li: ({ children, ...props }) => (
                                      <li className="pl-1" {...props}>{children}</li>
                                    ),
                                    strong: ({ children }) => (
                                      <strong className="font-bold text-foreground">{children}</strong>
                                    ),
                                    p: ({ children }) => (
                                      <p className="my-3 leading-relaxed">{children}</p>
                                    ),
                                  }}
                                >
                                  {message.content}
                                </ReactMarkdown>
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap text-base leading-relaxed">{message.content}</p>
                            )}
                          </div>

                          {/* Copy button & cached indicator for assistant messages */}
                          {message.role === "assistant" && message.content && (
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                onClick={() => copyToClipboard(message.content, message.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                              >
                                {copiedId === message.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-green-500" />
                                    <span className="text-green-500">복사됨</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>복사</span>
                                  </>
                                )}
                              </button>
                              
                              {message.cached && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Zap className="w-3 h-3" />
                                  {t("aiAgent.cachedResponse")}
                                </div>
                              )}
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
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
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
            <div className="border-t border-border/50 bg-background/95 backdrop-blur-sm p-4 md:p-6">
              <div className="max-w-4xl mx-auto">
                {/* Image previews */}
                {selectedImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedImages.map((img, idx) => (
                      <div key={idx} className="relative">
                        <img src={img} alt="Preview" className="w-16 h-16 rounded-xl object-cover border-2 border-primary/20" />
                        <button
                          onClick={() => removeImage(idx)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-lg"
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
                    <Button onClick={() => navigate("/auth")} size="lg" className="gap-2">
                      <Sparkles className="w-4 h-4" />
                      {t("common.login")}
                    </Button>
                  </div>
                ) : remainingQuestions === 0 && !isPremium ? (
                  <div className="text-center py-6">
                    <Crown className="w-10 h-10 text-korean-yellow mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-4">{t("aiAgent.noQuestionsLeft")} 😢</p>
                    <Button
                      onClick={() => navigate("/pricing")}
                      size="lg"
                      className="gap-2 bg-korean-yellow hover:bg-korean-yellow/90 text-black"
                    >
                      <Crown className="w-4 h-4" />
                      {t("aiAgent.upgradePremiumBtn")}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-end gap-2">
                    {/* Image upload button */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      className="shrink-0 h-12 w-12 rounded-2xl border-2 hover:border-primary/50 transition-colors"
                      title={t("aiAgent.uploadImage")}
                    >
                      <ImagePlus className="w-5 h-5" />
                    </Button>

                    {/* Voice input button */}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={toggleRecording}
                      className={`shrink-0 h-12 w-12 rounded-2xl border-2 transition-colors ${isRecording ? "bg-red-500/20 border-red-500" : "hover:border-primary/50"}`}
                      title={t("aiAgent.voiceInput")}
                    >
                      {isRecording ? <MicOff className="w-5 h-5 text-red-500" /> : <Mic className="w-5 h-5" />}
                    </Button>

                    {/* Text input */}
                    <div className="flex-1 relative">
                      <Textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        placeholder={t("aiAgent.placeholder") + " (Ctrl+V로 이미지 붙여넣기 가능)"}
                        disabled={isLoading}
                        className="min-h-[100px] max-h-[300px] resize-none pr-16 rounded-2xl text-base py-4 px-4 border-2 focus:border-primary/50 transition-colors leading-relaxed"
                        rows={3}
                      />
                      <Button
                        size="icon"
                        onClick={() => sendMessage()}
                        disabled={(!input.trim() && selectedImages.length === 0) || isLoading}
                        className="absolute right-3 bottom-3 h-10 w-10 rounded-xl shadow-lg"
                      >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
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
        </div>
      </main>
    </div>
  );
};

export default AIAgentChat;
