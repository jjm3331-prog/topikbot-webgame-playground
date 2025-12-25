import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Play, 
  Trophy, 
  Flame,
  Zap,
  Link2,
  Sparkles,
  Send,
  Loader2,
  Users,
  Copy,
  Check,
  ArrowLeft,
  Crown,
  Swords,
  Timer,
  RefreshCw
} from "lucide-react";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ChainReactionMultiplayerProps {
  words: { id: number; korean: string; meaning: string }[];
  onBack: () => void;
}

interface Room {
  id: string;
  room_code: string;
  host_id: string;
  host_name: string;
  guest_id: string | null;
  guest_name: string | null;
  connection_mode: string;
  status: string;
  host_score: number;
  guest_score: number;
  host_chain_length: number;
  guest_chain_length: number;
  host_ready: boolean;
  guest_ready: boolean;
  winner_id: string | null;
  started_at: string | null;
  finished_at: string | null;
}

interface ChainWord {
  word: string;
  connectionType: "semantic" | "phonetic" | "start";
}

type GamePhase = "menu" | "creating" | "joining" | "waiting" | "ready" | "playing" | "finished";

export default function ChainReactionMultiplayer({ words, onBack }: ChainReactionMultiplayerProps) {
  const { toast } = useToast();
  const [gamePhase, setGamePhase] = useState<GamePhase>("menu");
  const [room, setRoom] = useState<Room | null>(null);
  const [playerId] = useState(() => crypto.randomUUID());
  const [playerName, setPlayerName] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [connectionMode, setConnectionMode] = useState<"semantic" | "phonetic">("semantic");
  
  // Game state
  const [timeLeft, setTimeLeft] = useState(60);
  const [chain, setChain] = useState<ChainWord[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [score, setScore] = useState(0);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);

  const isHost = room?.host_id === playerId;

  // Generate room code
  const generateRoomCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Calculate exponential score
  const calculateScore = (chainLength: number) => {
    return Math.floor(10 * Math.pow(2, chainLength - 1));
  };

  // Validate word connection
  const validateConnection = async (newWord: string, previousWord: string, mode: "semantic" | "phonetic") => {
    if (mode === "phonetic") {
      const lastChar = previousWord.charAt(previousWord.length - 1);
      const dueum: Record<string, string[]> = {
        "녀": ["여"], "뇨": ["요"], "뉴": ["유"], "니": ["이"],
        "랴": ["야"], "려": ["여"], "례": ["예"], "료": ["요"], 
        "류": ["유"], "리": ["이"], "라": ["나"], "래": ["내"],
        "로": ["노"], "뢰": ["뇌"], "루": ["누"], "르": ["느"],
      };
      const validStarts = [lastChar, ...(dueum[lastChar] || [])];
      const firstChar = newWord.charAt(0);
      return validStarts.includes(firstChar);
    } else {
      try {
        const { data, error } = await supabase.functions.invoke("chain-validate", {
          body: { previousWord, newWord, mode: "semantic" }
        });
        if (error) throw error;
        return data.isValid;
      } catch {
        return true;
      }
    }
  };

  // Create room
  const createRoom = async () => {
    if (!playerName.trim()) {
      toast({ title: "이름을 입력해주세요", variant: "destructive" });
      return;
    }

    setGamePhase("creating");
    const roomCode = generateRoomCode();

    try {
      const { data, error } = await supabase
        .from("chain_reaction_rooms")
        .insert({
          room_code: roomCode,
          host_id: playerId,
          host_name: playerName.trim(),
          connection_mode: connectionMode,
          status: "waiting"
        })
        .select()
        .single();

      if (error) throw error;
      setRoom(data);
      setGamePhase("waiting");
      subscribeToRoom(data.id);
    } catch (err) {
      console.error("Failed to create room:", err);
      toast({ title: "방 생성 실패", variant: "destructive" });
      setGamePhase("menu");
    }
  };

  // Join room
  const joinRoom = async () => {
    if (!playerName.trim() || !roomCodeInput.trim()) {
      toast({ title: "이름과 방 코드를 입력해주세요", variant: "destructive" });
      return;
    }

    setGamePhase("joining");

    try {
      // Find room
      const { data: roomData, error: findError } = await supabase
        .from("chain_reaction_rooms")
        .select()
        .eq("room_code", roomCodeInput.toUpperCase())
        .eq("status", "waiting")
        .single();

      if (findError || !roomData) {
        throw new Error("Room not found");
      }

      // Join room
      const { data, error } = await supabase
        .from("chain_reaction_rooms")
        .update({
          guest_id: playerId,
          guest_name: playerName.trim(),
          status: "ready"
        })
        .eq("id", roomData.id)
        .select()
        .single();

      if (error) throw error;
      setRoom(data);
      setConnectionMode(data.connection_mode as "semantic" | "phonetic");
      setGamePhase("ready");
      subscribeToRoom(data.id);
    } catch (err) {
      console.error("Failed to join room:", err);
      toast({ title: "방 참가 실패. 코드를 확인해주세요.", variant: "destructive" });
      setGamePhase("menu");
    }
  };

  // Subscribe to room updates
  const subscribeToRoom = (roomId: string) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chain_reaction_rooms",
          filter: `id=eq.${roomId}`
        },
        (payload) => {
          const newRoom = payload.new as Room;
          setRoom(newRoom);

          // Handle phase transitions
          if (newRoom.status === "ready" && gamePhase === "waiting") {
            setGamePhase("ready");
          }
          if (newRoom.status === "playing" && gamePhase !== "playing") {
            startGameLocal(newRoom);
          }
          if (newRoom.status === "finished" && gamePhase !== "finished") {
            setGamePhase("finished");
            if (newRoom.winner_id === playerId) {
              confetti({ particleCount: 150, spread: 100 });
            }
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  // Start game (host only)
  const startGame = async () => {
    if (!room || !isHost) return;

    const startWord = words[Math.floor(Math.random() * words.length)];

    try {
      await supabase
        .from("chain_reaction_rooms")
        .update({
          status: "playing",
          started_at: new Date().toISOString()
        })
        .eq("id", room.id);

      startGameLocal(room);
    } catch (err) {
      console.error("Failed to start game:", err);
    }
  };

  // Local game start
  const startGameLocal = (roomData: Room) => {
    setGamePhase("playing");
    setTimeLeft(60);
    setScore(0);
    setChain([]);
    setCurrentInput("");
    setError(null);
    setConnectionMode(roomData.connection_mode as "semantic" | "phonetic");

    // Set start word
    if (words.length > 0) {
      const startWord = words[Math.floor(Math.random() * words.length)];
      setChain([{ word: startWord.korean, connectionType: "start" }]);
    }
  };

  // Handle word submission
  const handleSubmit = async () => {
    if (!currentInput.trim() || isValidating || !room) return;

    const newWord = currentInput.trim();
    setError(null);

    if (chain.some(c => c.word === newWord)) {
      setError("이미 사용한 단어예요!");
      return;
    }

    if (chain.length === 0) {
      setChain([{ word: newWord, connectionType: "start" }]);
      setCurrentInput("");
      return;
    }

    setIsValidating(true);
    const previousWord = chain[chain.length - 1].word;
    const isValid = await validateConnection(newWord, previousWord, connectionMode);
    setIsValidating(false);

    if (isValid) {
      const newChainLength = chain.length + 1;
      const pointsEarned = calculateScore(newChainLength);

      setChain(prev => [...prev, { word: newWord, connectionType: connectionMode }]);
      setScore(prev => prev + pointsEarned);
      setCurrentInput("");

      // Update room with new score
      const updateField = isHost ? "host_score" : "guest_score";
      const chainField = isHost ? "host_chain_length" : "guest_chain_length";
      
      await supabase
        .from("chain_reaction_rooms")
        .update({
          [updateField]: score + pointsEarned,
          [chainField]: newChainLength
        })
        .eq("id", room.id);

      if (newChainLength >= 5) {
        confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
      }
    } else {
      if (connectionMode === "phonetic") {
        const lastChar = previousWord.charAt(previousWord.length - 1);
        setError(`'${lastChar}'로 시작해야 해요!`);
      } else {
        setError("의미적으로 연결되지 않아요!");
      }
    }

    inputRef.current?.focus();
  };

  // Timer effect
  useEffect(() => {
    if (gamePhase !== "playing") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          finishGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gamePhase]);

  // Finish game
  const finishGame = async () => {
    if (!room) return;

    setGamePhase("finished");

    // Determine winner
    const myScore = isHost ? score : score;
    const opponentScore = isHost ? (room.guest_score || 0) : (room.host_score || 0);
    const winnerId = myScore > opponentScore ? playerId : 
                     myScore < opponentScore ? (isHost ? room.guest_id : room.host_id) : null;

    await supabase
      .from("chain_reaction_rooms")
      .update({
        [isHost ? "host_score" : "guest_score"]: score,
        [isHost ? "host_chain_length" : "guest_chain_length"]: chain.length,
        status: "finished",
        finished_at: new Date().toISOString(),
        winner_id: winnerId
      })
      .eq("id", room.id);
  };

  // Copy room code
  const copyRoomCode = () => {
    if (room?.room_code) {
      navigator.clipboard.writeText(room.room_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  // Auto-focus input
  useEffect(() => {
    if (gamePhase === "playing") {
      inputRef.current?.focus();
    }
  }, [gamePhase]);

  // ==================== RENDER ====================

  // Menu
  if (gamePhase === "menu") {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-4 sm:p-6 md:p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>

          <div className="text-6xl mb-4">⚔️</div>
          <h2 className="text-xl sm:text-2xl font-black mb-2 bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
            1:1 실시간 대결
          </h2>
          <p className="text-muted-foreground mb-4 sm:mb-6 text-sm sm:text-base">
            Đối đầu 1:1 thời gian thực / 실시간으로 상대와 경쟁하세요!
          </p>

          {/* Player name input */}
          <div className="mb-4 sm:mb-6">
            <Input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="닉네임 입력... / Nhập tên..."
              className="text-center text-base sm:text-lg"
              maxLength={20}
            />
          </div>

          {/* Connection mode */}
          <div className="flex justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <Button
              variant={connectionMode === "semantic" ? "default" : "outline"}
              onClick={() => setConnectionMode("semantic")}
              size="sm"
              className="text-xs sm:text-sm"
            >
              🔗 의미 연결
            </Button>
            <Button
              variant={connectionMode === "phonetic" ? "default" : "outline"}
              onClick={() => setConnectionMode("phonetic")}
              size="sm"
              className="text-xs sm:text-sm"
            >
              🔤 끝말잇기
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={createRoom}
                className="w-full h-20 sm:h-24 flex-col gap-1 sm:gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90"
                disabled={!playerName.trim()}
              >
                <Crown className="w-6 h-6 sm:w-8 sm:h-8" />
                <span className="text-sm sm:text-lg font-bold">방 만들기</span>
                <span className="text-[10px] sm:text-xs opacity-80">Tạo phòng</span>
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                onClick={() => setGamePhase("joining")}
                className="w-full h-20 sm:h-24 flex-col gap-1 sm:gap-2 border-2"
                disabled={!playerName.trim()}
              >
                <Users className="w-6 h-6 sm:w-8 sm:h-8" />
                <span className="text-sm sm:text-lg font-bold">참가하기</span>
                <span className="text-[10px] sm:text-xs opacity-60">Tham gia</span>
              </Button>
            </motion.div>
          </div>

          <Button variant="ghost" onClick={onBack} className="mt-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            돌아가기
          </Button>
        </Card>
      </motion.div>
    );
  }

  // Joining room (entering code)
  if (gamePhase === "joining") {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-4 sm:p-6 md:p-8 text-center">
          <Users className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-primary" />
          <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">방 참가하기</h2>
          <p className="text-muted-foreground mb-4 sm:mb-6 text-sm sm:text-base">
            친구에게 받은 코드를 입력하세요
          </p>

          <Input
            value={roomCodeInput}
            onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
            placeholder="방 코드 6자리..."
            className="text-center text-xl sm:text-2xl tracking-widest mb-4"
            maxLength={6}
          />

          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => setGamePhase("menu")}>
              취소
            </Button>
            <Button 
              onClick={joinRoom}
              disabled={roomCodeInput.length !== 6}
              className="bg-gradient-to-r from-purple-500 to-pink-500"
            >
              <Users className="w-4 h-4 mr-2" />
              참가하기
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  }

  // Waiting for opponent
  if (gamePhase === "waiting" || gamePhase === "creating") {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-4 sm:p-6 md:p-8 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4"
          >
            <Loader2 className="w-12 h-12 sm:w-16 sm:h-16 text-primary" />
          </motion.div>
          
          <h2 className="text-xl sm:text-2xl font-bold mb-2">상대를 기다리는 중...</h2>
          <p className="text-muted-foreground mb-4 sm:mb-6 text-sm sm:text-base">
            Đang chờ đối thủ... / 친구에게 코드를 공유하세요!
          </p>

          {room && (
            <div className="mb-4 sm:mb-6">
              <div className="text-xs sm:text-sm text-muted-foreground mb-2">방 코드 / Mã phòng</div>
              <div className="flex justify-center items-center gap-2">
                <div className="text-2xl sm:text-4xl font-mono font-bold tracking-widest bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                  {room.room_code}
                </div>
                <Button variant="ghost" size="sm" onClick={copyRoomCode}>
                  {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                </Button>
              </div>
            </div>
          )}

          <div className="bg-muted/50 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-1">
                  <Crown className="w-6 h-6 text-primary" />
                </div>
                <div className="font-medium">{room?.host_name}</div>
                <div className="text-xs text-muted-foreground">호스트</div>
              </div>
              <Swords className="w-6 h-6 text-muted-foreground" />
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-1">
                  <Users className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="font-medium text-muted-foreground">???</div>
                <div className="text-xs text-muted-foreground">대기중</div>
              </div>
            </div>
          </div>

          <Button variant="ghost" onClick={onBack}>
            취소하기
          </Button>
        </Card>
      </motion.div>
    );
  }

  // Ready to start (both players joined)
  if (gamePhase === "ready") {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="p-4 sm:p-6 md:p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-green-500/20 rounded-full blur-3xl animate-pulse" />
          </div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <Swords className="w-20 h-20 mx-auto mb-4 text-primary" />
          </motion.div>

          <h2 className="text-2xl font-bold mb-2">대결 준비 완료!</h2>
          <p className="text-muted-foreground mb-6">
            Sẵn sàng đối đầu! / 모든 플레이어가 참가했습니다
          </p>

          {/* Players */}
          <div className="bg-muted/50 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-1">
                  <Crown className="w-7 h-7 text-purple-500" />
                </div>
                <div className="font-bold">{room?.host_name}</div>
                {isHost && <div className="text-xs text-primary">나</div>}
              </div>
              <div className="text-2xl">⚡</div>
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-pink-500/20 flex items-center justify-center mx-auto mb-1">
                  <Users className="w-7 h-7 text-pink-500" />
                </div>
                <div className="font-bold">{room?.guest_name}</div>
                {!isHost && <div className="text-xs text-primary">나</div>}
              </div>
            </div>
          </div>

          {/* Mode indicator */}
          <div className="mb-6">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
              connectionMode === "semantic" 
                ? "bg-blue-500/20 text-blue-400" 
                : "bg-orange-500/20 text-orange-400"
            }`}>
              {connectionMode === "semantic" ? "🔗 의미 연결 모드" : "🔤 끝말잇기 모드"}
            </div>
          </div>

          {/* Rules reminder */}
          <div className="text-left bg-muted/30 rounded-xl p-4 mb-6 text-sm">
            <div className="font-bold mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              게임 규칙 / Luật chơi
            </div>
            <ul className="space-y-1 text-muted-foreground">
              <li>⏱️ 30초 타임어택</li>
              <li>⛓️ 체인이 길수록 점수 기하급수 증가 (10→20→40→80...)</li>
              <li>🏆 시간 종료 시 높은 점수가 승리!</li>
            </ul>
          </div>

          {isHost ? (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                onClick={startGame}
                size="lg"
                className="gap-2 text-lg px-8 bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90"
              >
                <Play className="w-6 h-6" />
                게임 시작! / Bắt đầu!
              </Button>
            </motion.div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              호스트가 시작하기를 기다리는 중...
            </div>
          )}
        </Card>
      </motion.div>
    );
  }

  // Playing
  if (gamePhase === "playing") {
    const opponentScore = isHost ? (room?.guest_score || 0) : (room?.host_score || 0);
    const opponentChain = isHost ? (room?.guest_chain_length || 0) : (room?.host_chain_length || 0);
    const opponentName = isHost ? room?.guest_name : room?.host_name;

    return (
      <div className="space-y-4">
        {/* Scoreboard */}
        <div className="grid grid-cols-3 gap-2 items-center bg-card rounded-xl p-3 border">
          <div className="text-center">
            <div className="font-bold text-sm truncate">{isHost ? room?.host_name : room?.guest_name}</div>
            <div className="text-2xl font-black text-primary">{score}</div>
            <div className="text-xs text-muted-foreground">{chain.length}체인</div>
          </div>
          <div className="text-center">
            <motion.div
              className={`text-3xl font-black ${timeLeft <= 10 ? "text-red-500" : "text-foreground"}`}
              animate={timeLeft <= 10 ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.5, repeat: timeLeft <= 10 ? Infinity : 0 }}
            >
              {timeLeft}s
            </motion.div>
          </div>
          <div className="text-center">
            <div className="font-bold text-sm truncate text-muted-foreground">{opponentName}</div>
            <div className="text-2xl font-black text-muted-foreground">{opponentScore}</div>
            <div className="text-xs text-muted-foreground">{opponentChain}체인</div>
          </div>
        </div>

        {/* Mode indicator */}
        <div className="flex justify-center">
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            connectionMode === "semantic" 
              ? "bg-blue-500/20 text-blue-400" 
              : "bg-orange-500/20 text-orange-400"
          }`}>
            {connectionMode === "semantic" ? "🔗 의미 연결" : "🔤 끝말잇기"}
          </div>
        </div>

        {/* Chain display */}
        <Card className="p-4 bg-gradient-to-br from-card to-muted/30">
          <div className="min-h-[80px] max-h-[150px] overflow-y-auto">
            <div className="flex flex-wrap gap-2 items-center justify-center">
              {chain.map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="flex items-center gap-1"
                >
                  <div className={`px-3 py-1.5 rounded-lg font-bold text-sm ${
                    idx === 0 
                      ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white" 
                      : item.connectionType === "phonetic"
                        ? "bg-gradient-to-r from-orange-500 to-red-500 text-white"
                        : "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                  }`}>
                    {item.word}
                  </div>
                  {idx < chain.length - 1 && <span className="text-lg">→</span>}
                </motion.div>
              ))}
              <motion.div
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="px-3 py-1.5 rounded-lg border-2 border-dashed border-primary/50 text-primary/50 font-bold text-sm"
              >
                ?
              </motion.div>
            </div>
          </div>
          {chain.length > 0 && (
            <div className="mt-2 text-center text-xs text-muted-foreground">
              다음: +{calculateScore(chain.length + 1)}점
            </div>
          )}
        </Card>

        {/* Input */}
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={currentInput}
            onChange={(e) => {
              setCurrentInput(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder={
              connectionMode === "phonetic" && chain.length > 0
                ? `'${chain[chain.length - 1].word.slice(-1)}'로 시작...`
                : "단어 입력..."
            }
            className="text-lg"
            disabled={isValidating}
          />
          <Button 
            onClick={handleSubmit} 
            disabled={!currentInput.trim() || isValidating}
          >
            {isValidating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-center text-sm"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Finished
  if (gamePhase === "finished" && room) {
    const myScore = score;
    const opponentScore = isHost ? (room.guest_score || 0) : (room.host_score || 0);
    const opponentName = isHost ? room.guest_name : room.host_name;
    const isWinner = room.winner_id === playerId;
    const isDraw = room.winner_id === null;

    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="p-4 sm:p-6 md:p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className={`absolute top-1/4 left-1/4 w-48 h-48 rounded-full blur-3xl animate-pulse ${
              isWinner ? "bg-yellow-500/30" : isDraw ? "bg-blue-500/20" : "bg-muted"
            }`} />
          </div>

          <motion.div
            initial={{ rotate: -180, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            {isWinner ? (
              <Trophy className="w-20 h-20 mx-auto mb-4 text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
            ) : isDraw ? (
              <Swords className="w-20 h-20 mx-auto mb-4 text-blue-500" />
            ) : (
              <div className="text-6xl mb-4">😢</div>
            )}
          </motion.div>

          <h2 className={`text-3xl font-black mb-4 ${
            isWinner 
              ? "bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent"
              : isDraw
                ? "text-blue-500"
                : "text-muted-foreground"
          }`}>
            {isWinner ? "🎉 승리! / Chiến thắng!" : isDraw ? "🤝 무승부! / Hòa!" : "아쉽네요..."}
          </h2>

          {/* Score comparison */}
          <div className="grid grid-cols-3 gap-2 items-center bg-muted/50 rounded-xl p-4 mb-6">
            <div className="text-center">
              <div className="font-bold truncate">{isHost ? room.host_name : room.guest_name}</div>
              <motion.div 
                className="text-3xl font-black text-primary"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                {myScore}
              </motion.div>
              <div className="text-sm text-muted-foreground">{chain.length} 체인</div>
            </div>
            <div className="text-2xl">VS</div>
            <div className="text-center">
              <div className="font-bold truncate text-muted-foreground">{opponentName}</div>
              <motion.div 
                className="text-3xl font-black text-muted-foreground"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                {opponentScore}
              </motion.div>
              <div className="text-sm text-muted-foreground">
                {isHost ? room.guest_chain_length : room.host_chain_length} 체인
              </div>
            </div>
          </div>

          {/* My chain */}
          <div className="mb-6 p-3 bg-muted/30 rounded-xl max-h-32 overflow-y-auto">
            <div className="text-sm font-medium mb-2">내 체인 / Chuỗi của tôi</div>
            <div className="flex flex-wrap gap-1 justify-center">
              {chain.map((item, idx) => (
                <span key={idx} className="flex items-center gap-0.5 text-sm">
                  <span className="px-1.5 py-0.5 bg-primary/20 rounded text-xs">
                    {item.word}
                  </span>
                  {idx < chain.length - 1 && <span className="text-muted-foreground">→</span>}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              나가기
            </Button>
            <Button 
              onClick={() => {
                setGamePhase("menu");
                setRoom(null);
                setChain([]);
                setScore(0);
              }}
              className="bg-gradient-to-r from-purple-500 to-pink-500"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              다시 대결
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  }

  return null;
}
