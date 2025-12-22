import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Pause, Heart, Send, Lightbulb, TrendingUp, TrendingDown, Coins, Zap } from "lucide-react";
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
  turnResult?: "success" | "warning" | "fail";
  hpChange?: number;
  moneyChange?: number;
}

interface GameState {
  hp: number;
  money: number;
  turn: number;
  maxTurns: number;
}

interface FeedbackPopup {
  show: boolean;
  type: "success" | "warning" | "fail";
  hpChange: number;
  moneyChange: number;
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
  const [feedback, setFeedback] = useState<FeedbackPopup>({
    show: false,
    type: "success",
    hpChange: 0,
    moneyChange: 0,
  });
  const [shakeScreen, setShakeScreen] = useState(false);
  const [pulseHP, setPulseHP] = useState(false);
  const [pulseMoney, setPulseMoney] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const customLocation = location.state?.location;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }

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
    if (!gameStarted) {
      startGame();
    }
  }, [gameStarted]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const showFeedbackEffect = (type: "success" | "warning" | "fail", hpChange: number, moneyChange: number) => {
    setFeedback({ show: true, type, hpChange, moneyChange });
    
    if (type === "fail") {
      setShakeScreen(true);
      setTimeout(() => setShakeScreen(false), 500);
    }
    
    if (hpChange !== 0) {
      setPulseHP(true);
      setTimeout(() => setPulseHP(false), 1000);
    }
    
    if (moneyChange !== 0) {
      setPulseMoney(true);
      setTimeout(() => setPulseMoney(false), 1000);
    }

    setTimeout(() => {
      setFeedback((prev) => ({ ...prev, show: false }));
    }, 2000);
  };

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
          turnResult: data.turn_result,
        },
      ]);
      
      setGameState((prev) => ({
        ...prev,
        turn: 1,
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
      const hpChange = data.hp_change || 0;
      const moneyChange = data.money_change || 0;
      const turnResult = data.turn_result || "success";

      // Show feedback effect
      showFeedbackEffect(turnResult, hpChange, moneyChange);

      // Add AI response with metadata
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message_ko,
          content_vi: data.message_vi,
          turnResult,
          hpChange,
          moneyChange,
        },
      ]);

      // Update game state
      const newHp = Math.max(0, Math.min(100, gameState.hp + hpChange));
      const newMoney = Math.max(0, gameState.money + moneyChange);

      setGameState((prev) => ({
        ...prev,
        turn: nextTurn,
        hp: newHp,
        money: newMoney,
      }));

      // Check game over conditions
      if (data.game_over || newHp <= 0) {
        toast({
          title: "💀 게임 오버! (Game Over!)",
          description: "HP가 0이 되었습니다. (HP đã về 0.)",
          variant: "destructive",
        });
        await updateProfile(newHp, newMoney);
        setTimeout(() => navigate("/dashboard"), 3000);
      } else if (data.mission_complete || nextTurn >= gameState.maxTurns) {
        toast({
          title: "🎉 미션 성공! (Mission Complete!)",
          description: "10턴 생존에 성공했습니다! (Bạn đã sống sót 10 lượt!)",
        });
        await updateProfile(newHp, newMoney, true);
        setTimeout(() => navigate("/dashboard"), 3000);
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
    await updateProfile(gameState.hp, gameState.money);
    navigate("/dashboard");
  };

  const getResultColor = (result?: string) => {
    switch (result) {
      case "success": return "border-l-green-500";
      case "warning": return "border-l-yellow-500";
      case "fail": return "border-l-red-500";
      default: return "border-l-transparent";
    }
  };

  const getResultBg = (result?: string) => {
    switch (result) {
      case "success": return "bg-green-500/10";
      case "warning": return "bg-yellow-500/10";
      case "fail": return "bg-red-500/10";
      default: return "bg-gray-800";
    }
  };

  return (
    <div className={`min-h-[100dvh] bg-gradient-to-b from-[#1a1a2e] to-[#0f0f23] flex flex-col ${shakeScreen ? "animate-shake" : ""}`}>
      {/* Feedback Popup */}
      {feedback.show && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce`}>
          <div className={`px-6 py-4 rounded-2xl shadow-2xl ${
            feedback.type === "success" ? "bg-green-500" :
            feedback.type === "warning" ? "bg-yellow-500" :
            "bg-red-500"
          } text-white font-bold text-lg flex items-center gap-4`}>
            {feedback.type === "success" && <Zap className="w-6 h-6" />}
            {feedback.type === "warning" && <TrendingDown className="w-6 h-6" />}
            {feedback.type === "fail" && <TrendingDown className="w-6 h-6" />}
            <div className="flex flex-col">
              <span className="text-xl">
                {feedback.type === "success" ? "좋아요! 👍" : 
                 feedback.type === "warning" ? "주의! ⚠️" : "실패! 💔"}
              </span>
              <div className="flex gap-4 text-sm">
                {feedback.hpChange !== 0 && (
                  <span className={feedback.hpChange > 0 ? "text-green-200" : "text-red-200"}>
                    HP {feedback.hpChange > 0 ? "+" : ""}{feedback.hpChange}
                  </span>
                )}
                {feedback.moneyChange !== 0 && (
                  <span className={feedback.moneyChange > 0 ? "text-green-200" : "text-red-200"}>
                    ₩{feedback.moneyChange > 0 ? "+" : ""}{feedback.moneyChange.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-white/10 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button onClick={handleExit} className="text-white/70 hover:text-white transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button onClick={handleExit} className="text-white/70 hover:text-white transition-colors">
            <Pause className="w-5 h-5" />
          </button>
        </div>

        {/* Game Stats */}
        <div className="flex items-center gap-6">
          {/* HP Bar */}
          <div className={`flex items-center gap-2 ${pulseHP ? "animate-pulse scale-110" : ""} transition-transform`}>
            <Heart className={`w-5 h-5 ${gameState.hp <= 30 ? "text-red-500 animate-pulse" : "text-red-400"}`} />
            <div className="w-20 h-3 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  gameState.hp > 60 ? "bg-green-500" :
                  gameState.hp > 30 ? "bg-yellow-500" :
                  "bg-red-500"
                }`}
                style={{ width: `${gameState.hp}%` }}
              />
            </div>
            <span className="text-white font-bold text-sm">{gameState.hp}</span>
          </div>

          {/* Money */}
          <div className={`flex items-center gap-1 ${pulseMoney ? "animate-pulse scale-110" : ""} transition-transform`}>
            <Coins className="w-5 h-5 text-yellow-500" />
            <span className="text-yellow-400 font-bold">₩{gameState.money.toLocaleString()}</span>
          </div>

          {/* Turn Counter */}
          <div className="flex items-center gap-2 bg-purple-500/20 px-3 py-1 rounded-full">
            <span className="text-purple-300 font-bold text-sm">
              턴 {gameState.turn}/{gameState.maxTurns}
            </span>
          </div>
        </div>
      </header>

      {/* Turn Progress Bar */}
      <div className="h-1 bg-gray-800">
        <div 
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
          style={{ width: `${(gameState.turn / gameState.maxTurns) * 100}%` }}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-4 border-l-4 ${
                message.role === "user"
                  ? "bg-blue-600 text-white border-l-blue-400"
                  : `${getResultBg(message.turnResult)} ${getResultColor(message.turnResult)} text-white`
              }`}
            >
              {message.role === "assistant" && (
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-neon-cyan font-bold">LUKATO</p>
                  {message.turnResult && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      message.turnResult === "success" ? "bg-green-500/30 text-green-300" :
                      message.turnResult === "warning" ? "bg-yellow-500/30 text-yellow-300" :
                      "bg-red-500/30 text-red-300"
                    }`}>
                      {message.turnResult === "success" ? "✓ 성공" :
                       message.turnResult === "warning" ? "⚠ 주의" :
                       "✗ 실패"}
                    </span>
                  )}
                </div>
              )}
              <p className="leading-relaxed">{message.content}</p>
              {message.content_vi && (
                <p className="text-sm text-yellow-300 italic mt-2 border-t border-white/10 pt-2">
                  {message.content_vi}
                </p>
              )}
              {/* Show stat changes */}
              {message.role === "assistant" && (message.hpChange !== 0 || message.moneyChange !== 0) && (
                <div className="flex gap-3 mt-3 pt-2 border-t border-white/10">
                  {message.hpChange !== undefined && message.hpChange !== 0 && (
                    <span className={`flex items-center gap-1 text-sm font-bold ${
                      message.hpChange > 0 ? "text-green-400" : "text-red-400"
                    }`}>
                      {message.hpChange > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      HP {message.hpChange > 0 ? "+" : ""}{message.hpChange}
                    </span>
                  )}
                  {message.moneyChange !== undefined && message.moneyChange !== 0 && (
                    <span className={`flex items-center gap-1 text-sm font-bold ${
                      message.moneyChange > 0 ? "text-green-400" : "text-red-400"
                    }`}>
                      {message.moneyChange > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      ₩{message.moneyChange > 0 ? "+" : ""}{message.moneyChange.toLocaleString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-neon-cyan rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-neon-cyan rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-neon-cyan rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10 bg-gray-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/20 shrink-0"
            onClick={() => toast({ title: "💡 힌트 (Gợi ý)", description: "자연스럽게 한국어로 대화해보세요! 적절한 응답은 보상을, 이상한 응답은 패널티를 받습니다." })}
          >
            <Lightbulb className="w-5 h-5" />
          </Button>
          <Input
            placeholder="한국어로 입력하세요..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-12"
            disabled={loading}
          />
          <Button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shrink-0 h-12 px-6"
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
        <AlertDialogContent className="bg-white border-0 shadow-xl">
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-3xl">⚠️</span>
              </div>
            </div>
            <AlertDialogTitle className="text-center text-xl text-gray-900 font-bold">
              정말 나가시겠습니까? (Bạn có chắc muốn thoát?)
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-gray-600">
              현재 진행 상황이 저장되지 않습니다. (Tiến trình hiện tại sẽ không được lưu.)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-3 sm:justify-center mt-4">
            <AlertDialogCancel className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100">
              계속 하기 (Tiếp tục)
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmExit}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white"
            >
              대시보드로 / Về Dashboard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default Chat;
