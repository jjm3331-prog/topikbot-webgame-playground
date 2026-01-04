import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Send,
  Loader2,
  Crown,
  Zap,
  AlertCircle,
  ArrowLeft,
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
  RotateCcw,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

const getAgentTitle = (agentId: string) => {
  switch (agentId?.toLowerCase()) {
    case "ielts": return "IELTS Agent";
    case "jlpt": return "JLPT Agent";
    case "hsk": return "HSK Agent";
    case "topik":
    default: return "TOPIK Agent";
  }
};

const getAgentPlaceholder = (t: TFunction, agentId: string) => {
  switch (agentId?.toLowerCase()) {
    case "ielts": return "Ask about IELTS...";
    case "jlpt": return "JLPTについて質問してください...";
    case "hsk": return "关于HSK的问题...";
    case "topik":
    default: return t("aiAgent.placeholder") || "무엇이든 물어보세요...";
  }
};

const normalizeAssistantMarkdown = (content: string) => {
  // Some models output HTML tags like <br> inside markdown (especially tables).
  // We convert a small safe subset to plain markdown-friendly text.
  return (content || "")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/&nbsp;/gi, " ");
};

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
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
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
      const { data: { user } } = await supabase.auth.getUser();
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
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

  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast({ title: t("aiAgent.copyFailed"), variant: "destructive" });
    }
  };

  const createNewSession = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setSidebarOpen(false);
  };

  const loadSession = (session: ChatSession) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    setSidebarOpen(false);
  };

  const deleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChatSessions(prev => prev.filter(s => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
      setMessages([]);
    }
    const storageKey = `chat_history_${agentId}`;
    const remaining = chatSessions.filter(s => s.id !== sessionId);
    if (remaining.length === 0) {
      localStorage.removeItem(storageKey);
    }
  };

  const updateCurrentSession = (newMessages: Message[]) => {
    if (!currentSessionId) {
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
      setChatSessions(prev => 
        prev.map(s => 
          s.id === currentSessionId 
            ? { ...s, messages: newMessages, updatedAt: new Date() }
            : s
        )
      );
    }
  };

  const parseOpenAIStream = async (
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

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            onDone();
            return;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) onDelta(content);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error("Stream parsing error:", error);
    }

    onDone();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: t("aiAgent.fileTooLarge"), variant: "destructive" });
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

  const sendMessage = useCallback(
    async (content?: string) => {
      const messageText = content || input.trim();
      if ((!messageText && selectedImages.length === 0) || isLoading) return;

      if (!isAuthenticated) {
        toast({ title: t("aiAgent.pleaseLogin"), variant: "destructive" });
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
        const { data: { session } } = await supabase.auth.getSession();

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

        if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 429) {
            if (errorData.error === "daily_limit_exceeded") {
              setRemainingQuestions(0);
            }
            toast({ title: t("aiAgent.systemBusy"), variant: "destructive" });
            setIsLoading(false);
            return;
          }
          throw new Error(errorData.message || "Connection error");
        }

        const remaining = response.headers.get("X-Remaining-Questions");
        if (remaining) setRemainingQuestions(parseInt(remaining));

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
          if (data.remaining !== undefined) setRemainingQuestions(data.remaining);
        } else {
          const reader = response.body?.getReader();
          if (!reader) throw new Error("No reader available");

          const assistantMessageId = `assistant-${Date.now()}`;
          let fullText = "";

          setMessages((prev) => [
            ...prev,
            { id: assistantMessageId, role: "assistant", content: "", timestamp: new Date() },
          ]);

          await parseOpenAIStream(
            reader,
            (deltaText) => {
              fullText += deltaText;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantMessageId ? { ...m, content: fullText } : m))
              );
            },
            () => {
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
        toast({ title: t("common.error"), variant: "destructive" });
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

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'));
    
    if (imageItems.length > 0) {
      e.preventDefault();
      
      imageItems.forEach((item) => {
        const file = item.getAsFile();
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
          toast({ title: t("aiAgent.fileTooLarge"), variant: "destructive" });
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

      toast({ title: t("aiAgent.imageAdded") });
    }
  }, [toast]);

  const clearChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
  };

  const formatSessionDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return "오늘";
    if (days === 1) return "어제";
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  };

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Sidebar Toggle Button (Mobile) */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 md:hidden h-10 w-10 rounded-xl bg-background/80 backdrop-blur border border-border/50 shadow-lg"
      >
        {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
      </Button>

      {/* Sidebar Overlay (Mobile) */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed md:relative z-50 md:z-auto w-[280px] h-full border-r border-border/50 bg-muted/50 flex flex-col"
          >
            {/* Sidebar Header */}
            <div className="p-3 border-b border-border/50">
              <Button 
                onClick={createNewSession} 
                className="w-full gap-2 justify-start h-11 rounded-xl"
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
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>대화 기록이 없습니다</p>
                  </div>
                ) : (
                  chatSessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => loadSession(session)}
                      className={`
                        w-full text-left p-3 rounded-xl transition-all group
                        ${currentSessionId === session.id 
                          ? "bg-primary/10 border border-primary/20" 
                          : "hover:bg-muted"
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <MessageSquare className="w-4 h-4 shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{session.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatSessionDate(session.updatedAt)}
                          </p>
                        </div>
                        <button
                          onClick={(e) => deleteSession(session.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Back to Agent List */}
            <div className="p-3 border-t border-border/50">
              <Button 
                variant="ghost" 
                onClick={() => navigate("/ai-chat")}
                className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
                에이전트 목록
              </Button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b border-border/50 flex items-center justify-between px-4 bg-background/80 backdrop-blur shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden md:flex h-9 w-9 rounded-xl"
            >
              {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
            </Button>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg overflow-hidden">
                <img src={lukasLogo} alt="Agent" className="w-full h-full object-cover" />
              </div>
              <h1 className="font-bold text-lg">{getAgentTitle(agentId || "topik")}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && !isPremium && remainingQuestions !== null && (
              <Badge 
                variant={remainingQuestions <= 3 ? "destructive" : "secondary"} 
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold"
              >
                <Zap className="w-3.5 h-3.5" />
                {remainingQuestions}/10
              </Badge>
            )}

            {isAuthenticated && isPremium && (
              <Badge className="flex items-center gap-1 px-2.5 py-1 bg-korean-gold/20 text-korean-gold border-korean-gold/30 text-xs">
                <Crown className="w-3.5 h-3.5" />
                무제한
              </Badge>
            )}

            {messages.length > 0 && (
              <Button variant="ghost" size="icon" onClick={clearChat} className="h-9 w-9 rounded-xl">
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {messages.length === 0 ? (
            /* Empty State - Clean & Minimal */
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }}
                className="text-center max-w-md"
              >
                <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-xl mx-auto mb-6 ring-2 ring-primary/20">
                  <img src={lukasLogo} alt="LUKATO AI" className="w-full h-full object-cover" />
                </div>
                <h2 className="text-xl font-bold mb-2">{getAgentTitle(agentId || "topik")}</h2>
                <p className="text-muted-foreground text-sm">
                  무엇이든 물어보세요. 이미지도 분석할 수 있어요.
                </p>
              </motion.div>
            </div>
          ) : (
            /* Messages */
            <ScrollArea ref={scrollAreaRef} className="flex-1">
              <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
                <AnimatePresence mode="popLayout">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
                    >
                      {message.role === "assistant" && (
                        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 ring-1 ring-border/50">
                          <img src={lukasLogo} alt="AI" className="w-full h-full object-cover" />
                        </div>
                      )}

                      <div className={`max-w-[80%] ${message.role === "user" ? "items-end" : ""}`}>
                        {message.images && message.images.length > 0 && (
                          <div className={`flex flex-wrap gap-2 mb-2 ${message.role === "user" ? "justify-end" : ""}`}>
                            {message.images.map((img, idx) => (
                              <img
                                key={idx}
                                src={img}
                                alt="Uploaded"
                                className="max-w-[200px] max-h-[150px] rounded-xl object-cover ring-1 ring-border/50"
                              />
                            ))}
                          </div>
                        )}

                        <div
                          className={`rounded-2xl ${
                            message.role === "user"
                              ? "bg-primary text-primary-foreground px-4 py-3"
                              : "bg-muted/50 px-4 py-3"
                          }`}
                        >
                        {message.role === "assistant" ? (
                            <div className="ai-response-content text-sm leading-[1.8] text-foreground">
                              <ReactMarkdown 
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  // Headers - 더 명확한 구분
                                  h1: ({ children }) => (
                                    <h1 className="text-xl font-bold mt-6 mb-3 text-foreground border-b border-border/30 pb-2">{children}</h1>
                                  ),
                                  h2: ({ children }) => (
                                    <h2 className="text-lg font-bold mt-5 mb-2.5 text-foreground">{children}</h2>
                                  ),
                                  h3: ({ children }) => (
                                    <h3 className="text-base font-semibold mt-4 mb-2 text-foreground">{children}</h3>
                                  ),
                                  h4: ({ children }) => (
                                    <h4 className="text-sm font-semibold mt-3 mb-1.5 text-foreground">{children}</h4>
                                  ),
                                  // 문단 - 넉넉한 간격
                                  p: ({ children }) => (
                                    <p className="my-3 leading-[1.8] text-foreground">{children}</p>
                                  ),
                                  // 리스트 - 읽기 쉬운 스타일
                                  ul: ({ children }) => (
                                    <ul className="my-3 ml-4 space-y-2 list-disc marker:text-primary/70">{children}</ul>
                                  ),
                                  ol: ({ children }) => (
                                    <ol className="my-3 ml-4 space-y-2 list-decimal marker:text-primary/70 marker:font-semibold">{children}</ol>
                                  ),
                                  li: ({ children }) => (
                                    <li className="text-foreground pl-1 leading-[1.7]">{children}</li>
                                  ),
                                  // 강조 - Bold는 색상으로 구분
                                  strong: ({ children }) => (
                                    <strong className="font-bold text-primary">{children}</strong>
                                  ),
                                  em: ({ children }) => (
                                    <em className="italic text-muted-foreground">{children}</em>
                                  ),
                                  // 코드블록
                                  code: ({ className, children }) => {
                                    const isInline = !className;
                                    return isInline ? (
                                      <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono text-primary">{children}</code>
                                    ) : (
                                      <code className="block my-3 p-3 rounded-lg bg-muted/70 text-sm font-mono overflow-x-auto">{children}</code>
                                    );
                                  },
                                  pre: ({ children }) => (
                                    <pre className="my-3 p-4 rounded-xl bg-muted/50 overflow-x-auto border border-border/30">{children}</pre>
                                  ),
                                  // 인용
                                  blockquote: ({ children }) => (
                                    <blockquote className="my-4 pl-4 border-l-3 border-primary/50 text-muted-foreground italic">{children}</blockquote>
                                  ),
                                  // 구분선
                                  hr: () => (
                                    <hr className="my-5 border-border/50" />
                                  ),
                                  // 링크
                                  a: ({ href, children }) => (
                                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors">{children}</a>
                                  ),
                                  // 테이블 - 깔끔한 스타일
                                  table: ({ children }) => (
                                    <div className="overflow-x-auto my-4 rounded-lg border border-border/50">
                                      <table className="w-full border-collapse text-sm">{children}</table>
                                    </div>
                                  ),
                                  thead: ({ children }) => (
                                    <thead className="bg-muted/70">{children}</thead>
                                  ),
                                  tbody: ({ children }) => (
                                    <tbody className="divide-y divide-border/30">{children}</tbody>
                                  ),
                                  tr: ({ children }) => (
                                    <tr className="hover:bg-muted/30 transition-colors">{children}</tr>
                                  ),
                                  th: ({ children }) => (
                                    <th className="px-4 py-2.5 text-left font-semibold text-foreground whitespace-nowrap border-b border-border/50">{children}</th>
                                  ),
                                  td: ({ children }) => (
                                    <td className="px-4 py-2.5 text-foreground whitespace-pre-line">{children}</td>
                                  ),
                                }}
                              >
                                {normalizeAssistantMarkdown(message.content)}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                          )}
                        </div>

                        {message.role === "assistant" && message.content && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <button
                              onClick={() => copyToClipboard(message.content, message.id)}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-muted-foreground hover:bg-muted transition-all"
                            >
                              {copiedId === message.id ? (
                                <Check className="w-3 h-3 text-green-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>{copiedId === message.id ? "복사됨" : "복사"}</span>
                            </button>
                            {message.cached && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Zap className="w-3 h-3" />캐시
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 ring-1 ring-border/50">
                      <img src={lukasLogo} alt="AI" className="w-full h-full object-cover" />
                    </div>
                    <div className="bg-muted/50 rounded-2xl px-4 py-3">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  </motion.div>
                )}
              </div>
            </ScrollArea>
          )}

          {/* Input Area */}
          <div className="border-t border-border/50 bg-background p-4 shrink-0">
            <div className="max-w-3xl mx-auto">
              {selectedImages.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedImages.map((img, idx) => (
                    <div key={idx} className="relative">
                      <img src={img} alt="Preview" className="w-14 h-14 rounded-xl object-cover ring-1 ring-border/50" />
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!isAuthenticated ? (
                <div className="text-center py-6">
                  <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">{t("ai.loginRequired", "로그인이 필요합니다")}</p>
                  <Button onClick={() => navigate("/auth")} className="gap-2">
                    <Sparkles className="w-4 h-4" />
                    {t("ai.login", "로그인")}
                  </Button>
                </div>
              ) : remainingQuestions === 0 && !isPremium ? (
                <div className="text-center py-6">
                  <Crown className="w-8 h-8 text-korean-gold mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">{t("ai.dailyLimitReached", "오늘 무료 질문을 모두 사용했습니다")}</p>
                  <Button onClick={() => navigate("/pricing")} className="gap-2 bg-korean-gold hover:bg-korean-gold/90 text-black">
                    <Crown className="w-4 h-4" />
                    {t("ai.upgradePremium", "프리미엄 업그레이드")}
                  </Button>
                </div>
              ) : (
                <div className="flex items-end gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    className="shrink-0 h-10 w-10 rounded-xl hover:bg-muted"
                  >
                    <ImagePlus className="w-5 h-5" />
                  </Button>

                  <div className="flex-1 relative">
                    <Textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onPaste={handlePaste}
                      placeholder={getAgentPlaceholder(t, agentId || "topik")}
                      disabled={isLoading}
                      className="min-h-[48px] max-h-[200px] resize-none pr-12 rounded-xl text-sm py-3 px-4 border-border/50 focus:border-primary/50 transition-colors"
                      rows={1}
                    />
                    <Button
                      size="icon"
                      onClick={() => sendMessage()}
                      disabled={(!input.trim() && selectedImages.length === 0) || isLoading}
                      className="absolute right-2 bottom-2 h-8 w-8 rounded-lg"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-center text-muted-foreground mt-2">
                Enter로 전송 • Shift+Enter로 줄바꿈 • Ctrl+V로 이미지 붙여넣기
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAgentChat;
