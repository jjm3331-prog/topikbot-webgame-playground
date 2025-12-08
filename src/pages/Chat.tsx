import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Pause, Heart, Send, Lightbulb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Message {
  role: "user" | "assistant";
  content: string;
  content_vi?: string;
}

interface GameState {
  hp: number;
  money: number;
  turn: number;
  maxTurns: number;
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [gameState, setGameState] = useState<GameState>({
    hp: 100,
    money: 10000,
    turn: 0,
    maxTurns: 10,
  });
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const customLocation = location.state?.location;

  useEffect(() => {
    // Check auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }

      // Fetch current profile stats
      supabase
        .from("profiles")
        .select("hp, money")
        .eq("id", session.user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setGameState((prev) => ({
              ...prev,
              hp: data.hp,
              money: data.money,
            }));
          }
        });
    });
  }, [navigate]);

  useEffect(() => {
    // Start game automatically
    if (!gameStarted) {
      startGame();
    }
  }, [gameStarted]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startGame = async () => {
    setGameStarted(true);
    setLoading(true);

    try {
      const response = await supabase.functions.invoke("chat-survival", {
        body: {
          messages: [],
          location: customLocation,
          currentTurn: 1,
        },
      });

      if (response.error) throw response.error;

      const data = response.data;
      
      setMessages([
        {
          role: "assistant",
          content: data.message_ko,
          content_vi: data.message_vi,
        },
      ]);
      
      setGameState((prev) => ({
        ...prev,
        turn: 1,
        hp: Math.max(0, Math.min(100, prev.hp + (data.hp_change || 0))),
        money: Math.max(0, prev.money + (data.money_change || 0)),
      }));
    } catch (error: any) {
      console.error("Start game error:", error);
      toast({
        title: "오류 (Lỗi)",
        description: error.message || "게임을 시작할 수 없습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setLoading(true);

    // Add user message
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: userMessage },
    ];
    setMessages(newMessages);

    try {
      const nextTurn = gameState.turn + 1;

      const response = await supabase.functions.invoke("chat-survival", {
        body: {
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          location: customLocation,
          currentTurn: nextTurn,
        },
      });

      if (response.error) throw response.error;

      const data = response.data;

      // Add AI response
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message_ko,
          content_vi: data.message_vi,
        },
      ]);

      // Update game state
      const newHp = Math.max(0, Math.min(100, gameState.hp + (data.hp_change || 0)));
      const newMoney = Math.max(0, gameState.money + (data.money_change || 0));

      setGameState((prev) => ({
        ...prev,
        turn: nextTurn,
        hp: newHp,
        money: newMoney,
      }));

      // Check game over conditions
      if (data.game_over || newHp <= 0) {
        toast({
          title: "게임 오버! (Game Over!)",
          description: "HP가 0이 되었습니다. (HP đã về 0.)",
          variant: "destructive",
        });
        // Update profile in database
        await updateProfile(newHp, newMoney);
        setTimeout(() => navigate("/game"), 2000);
      } else if (data.mission_complete || nextTurn >= gameState.maxTurns) {
        toast({
          title: "🎉 미션 성공! (Mission Complete!)",
          description: "10턴 생존에 성공했습니다! (Bạn đã sống sót 10 lượt!)",
        });
        await updateProfile(newHp, newMoney, true);
        setTimeout(() => navigate("/game"), 2000);
      }
    } catch (error: any) {
      console.error("Send message error:", error);
      toast({
        title: "오류 (Lỗi)",
        description: error.message || "메시지 전송 실패",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (hp: number, money: number, missionComplete = false) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const updates: any = { hp, money };
    if (missionComplete) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("missions_completed, points")
        .eq("id", session.user.id)
        .single();

      if (profile) {
        updates.missions_completed = profile.missions_completed + 1;
        updates.points = profile.points + 1000;
      }
    }

    await supabase
      .from("profiles")
      .update(updates)
      .eq("id", session.user.id);
  };

  const handleExit = () => {
    setShowExitDialog(true);
  };

  const confirmExit = async () => {
    // Save current state before exiting
    await updateProfile(gameState.hp, gameState.money);
    navigate("/game");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button onClick={handleExit} className="text-white/70 hover:text-white">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button onClick={handleExit} className="text-white/70 hover:text-white">
            <Pause className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-4 text-white">
          <div className="flex items-center gap-1">
            <Heart className="w-5 h-5 text-red-500" />
            <span className="font-bold">{gameState.hp}</span>
          </div>
          <span className="text-white/50">
            {gameState.turn}/{gameState.maxTurns}
          </span>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-4 ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-white"
              }`}
            >
              {message.role === "assistant" && (
                <p className="text-xs text-neon-cyan font-bold mb-2">LUKATO</p>
              )}
              <p className="leading-relaxed">{message.content}</p>
              {message.content_vi && (
                <p className="text-sm text-yellow-300 italic mt-2">
                  {message.content_vi}
                </p>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-neon-cyan rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-neon-cyan rounded-full animate-pulse delay-100" />
                <div className="w-2 h-2 bg-neon-cyan rounded-full animate-pulse delay-200" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/20 shrink-0"
            onClick={() => toast({ title: "힌트 (Gợi ý)", description: "자연스럽게 대화해보세요!" })}
          >
            <Lightbulb className="w-5 h-5" />
          </Button>
          <Input
            placeholder="한국어로 입력하세요..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
            disabled={loading}
          />
          <Button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-orange-500 hover:bg-orange-600 shrink-0"
          >
            <Send className="w-5 h-5" />
            <span className="ml-2">전송</span>
          </Button>
        </div>
        <p className="text-center text-white/30 text-xs mt-3">
          2025 Powered by LUKATO AI
        </p>
      </div>

      {/* Exit Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
            </div>
            <AlertDialogTitle className="text-center text-xl">
              정말 나가시겠습니까? (Bạn có chắc muốn thoát?)
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              현재 진행 상황이 저장되지 않습니다. (Tiến trình hiện tại sẽ không được lưu.)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-3 sm:justify-center">
            <AlertDialogCancel className="flex-1">
              계속 하기 (Tiếp tục)
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmExit}
              className="flex-1 bg-red-500 hover:bg-red-600"
            >
              나가기 (Thoát)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Chat;
