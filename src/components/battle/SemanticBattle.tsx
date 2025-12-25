import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Play,
  Trophy,
  Lightbulb,
  Send,
  Loader2,
  Users,
  Copy,
  Check,
  ArrowLeft,
  Crown,
  Swords,
  Timer,
  Share2,
  AlertTriangle,
  Brain,
  Zap,
} from "lucide-react";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import RoomCodeCollapsible from "@/components/battle/RoomCodeCollapsible";

interface SemanticBattleProps {
  onBack: () => void;
  initialRoomCode?: string;
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
  current_turn_player_id: string | null;
  turn_start_at: string | null;
  host_warnings: number;
  guest_warnings: number;
}

interface MoveRow {
  id: string;
  room_id: string;
  player_id: string;
  player_name: string;
  word: string;
  connection_mode: string;
  chain_length: number;
  score_delta: number;
  created_at: string;
}

type GamePhase = "menu" | "creating" | "joining" | "waiting" | "ready" | "countdown" | "playing" | "finished";

const TURN_TIME_LIMIT = 12;
const MAX_WARNINGS = 1;
const PASS_SCORE = 70;

export default function SemanticBattle({ onBack, initialRoomCode }: SemanticBattleProps) {
  const { toast } = useToast();
  const [gamePhase, setGamePhase] = useState<GamePhase>("menu");
  const gamePhaseRef = useRef<GamePhase>("menu");
  const [room, setRoom] = useState<Room | null>(null);
  const [playerId] = useState(() => crypto.randomUUID());
  const [playerName, setPlayerName] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState(initialRoomCode || "");
  const [copied, setCopied] = useState(false);

  const [moves, setMoves] = useState<MoveRow[]>([]);
  const moveIdsRef = useRef<Set<string>>(new Set());
  const movesChannelRef = useRef<any>(null);

  const [turnTimeLeft, setTurnTimeLeft] = useState(TURN_TIME_LIMIT);
  const turnTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [currentInput, setCurrentInput] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [lastValidation, setLastValidation] = useState<{score: number; reason_ko: string; reason_vi: string} | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [usedWords, setUsedWords] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    gamePhaseRef.current = gamePhase;
  }, [gamePhase]);

  const isHost = room?.host_id === playerId;
  const isMyTurn = room?.current_turn_player_id === playerId;
  const myWarnings = isHost ? (room?.host_warnings || 0) : (room?.guest_warnings || 0);
  const opponentWarnings = isHost ? (room?.guest_warnings || 0) : (room?.host_warnings || 0);

  // Get last word from moves
  const lastWord = moves.length > 0 ? moves[moves.length - 1].word : null;

  // Audio helpers
  const playBeep = (frequency: number = 440, duration: number = 150, type: OscillatorType = "sine") => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration / 1000);
    } catch (e) {}
  };

  const vibrate = (pattern: number | number[] = 100) => {
    if (navigator.vibrate) navigator.vibrate(pattern);
  };

  const playReadyFeedback = () => { playBeep(880, 100, "sine"); vibrate(50); };
  const playCountdownBeep = (num: number) => {
    if (num > 0) { playBeep(600, 100, "square"); vibrate(30); }
    else { playBeep(880, 200, "sawtooth"); vibrate([50, 50, 100]); }
  };
  const playWarnBeep = () => { playBeep(300, 300, "square"); vibrate([100, 50, 100]); };
  const playWinSound = () => {
    playBeep(523, 150, "sine");
    setTimeout(() => playBeep(659, 150, "sine"), 150);
    setTimeout(() => playBeep(784, 300, "sine"), 300);
  };
  const playLoseSound = () => {
    playBeep(300, 200, "sawtooth");
    setTimeout(() => playBeep(250, 300, "sawtooth"), 200);
  };

  // Award 1000 points for winning
  const awardWinnerPoints = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      const { data: profile } = await supabase.from("profiles").select("points").eq("id", session.user.id).maybeSingle();
      const currentPoints = profile?.points || 0;
      await supabase.from("profiles").update({ points: currentPoints + 1000 }).eq("id", session.user.id);
      toast({ title: "🎉 +1,000 điểm!", description: "Bạn đã nhận được 1,000 điểm thưởng chiến thắng!" });
    } catch (err) {}
  };

  const generateRandomNickname = () => {
    const adjectives = ["빠른", "용감한", "똑똑한", "귀여운", "멋진", "신나는", "활발한", "재미있는"];
    const nouns = ["호랑이", "토끼", "용", "펭귄", "고양이", "강아지", "여우", "곰"];
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${Math.floor(Math.random() * 100)}`;
  };

  const generateRoomCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 6 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
  };

  // URL auto-join
  useEffect(() => {
    if (initialRoomCode && initialRoomCode.length === 6 && gamePhase === "menu") {
      const autoNickname = generateRandomNickname();
      setPlayerName(autoNickname);
      setRoomCodeInput(initialRoomCode.toUpperCase());
      setGamePhase("joining");

      const autoJoin = async () => {
        try {
          const code = initialRoomCode.toUpperCase();
          const { data: roomData, error: findError } = await supabase
            .from("chain_reaction_rooms")
            .select()
            .eq("room_code", code)
            .eq("connection_mode", "semantic")
            .maybeSingle();

          if (findError) throw findError;
          if (!roomData) { toast({ title: "Không tìm thấy phòng", variant: "destructive" }); setGamePhase("menu"); return; }
          if (roomData.status === "playing" || roomData.status === "finished") { toast({ title: "Phòng đã bắt đầu hoặc kết thúc", variant: "destructive" }); setGamePhase("menu"); return; }
          if (roomData.guest_id) { toast({ title: "Phòng đã đầy", variant: "destructive" }); setGamePhase("menu"); return; }

          const { data, error } = await supabase
            .from("chain_reaction_rooms")
            .update({ guest_id: playerId, guest_name: autoNickname })
            .eq("id", roomData.id)
            .select()
            .single();

          if (error) throw error;
          setRoom(data as Room);
          setGamePhase("ready");
          subscribeToRoom(data.id);
          toast({ title: `Đã tham gia với tên ${autoNickname}!` });
        } catch (err) {
          toast({ title: "Tham gia thất bại", variant: "destructive" });
          setGamePhase("menu");
        }
      };
      void autoJoin();
    }
  }, [initialRoomCode]);

  const createRoom = async () => {
    if (!playerName.trim()) { toast({ title: "Vui lòng nhập tên", variant: "destructive" }); return; }
    setGamePhase("creating");
    const roomCode = generateRoomCode();

    try {
      const { data, error } = await supabase
        .from("chain_reaction_rooms")
        .insert({
          room_code: roomCode,
          host_id: playerId,
          host_name: playerName.trim(),
          connection_mode: "semantic",
          status: "waiting",
        })
        .select()
        .single();

      if (error) throw error;
      setRoom(data as Room);
      setGamePhase("waiting");
      subscribeToRoom(data.id);
    } catch (err) {
      toast({ title: "Tạo phòng thất bại", variant: "destructive" });
      setGamePhase("menu");
    }
  };

  const joinRoom = async () => {
    if (!playerName.trim() || !roomCodeInput.trim()) { toast({ title: "Vui lòng nhập tên và mã phòng", variant: "destructive" }); return; }
    setGamePhase("joining");

    try {
      const code = roomCodeInput.toUpperCase();
      const { data: roomData, error: findError } = await supabase
        .from("chain_reaction_rooms")
        .select()
        .eq("room_code", code)
        .eq("connection_mode", "semantic")
        .maybeSingle();

      if (findError) throw findError;
      if (!roomData) { toast({ title: "Không tìm thấy phòng", variant: "destructive" }); setGamePhase("menu"); return; }
      if (roomData.status === "playing" || roomData.status === "finished") { toast({ title: "Phòng đã bắt đầu hoặc kết thúc", variant: "destructive" }); setGamePhase("menu"); return; }
      if (roomData.guest_id) { toast({ title: "Phòng đã đầy", variant: "destructive" }); setGamePhase("menu"); return; }

      const { data, error } = await supabase
        .from("chain_reaction_rooms")
        .update({ guest_id: playerId, guest_name: playerName.trim() })
        .eq("id", roomData.id)
        .select()
        .single();

      if (error) throw error;
      setRoom(data as Room);
      setGamePhase("ready");
      subscribeToRoom(data.id);
    } catch (err) {
      toast({ title: "Tham gia thất bại", variant: "destructive" });
      setGamePhase("menu");
    }
  };

  const subscribeToRoom = (roomId: string) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const channel = supabase
      .channel(`semantic-room-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chain_reaction_rooms", filter: `id=eq.${roomId}` },
        (payload) => {
          const newRoom = payload.new as Room;
          setRoom(newRoom);
          const phase = gamePhaseRef.current;

          if (newRoom.guest_id && (phase === "waiting" || phase === "creating" || phase === "joining")) {
            setGamePhase("ready");
          }
          if (newRoom.status === "playing" && phase !== "playing" && phase !== "countdown") {
            startCountdown(newRoom);
          }
          if (newRoom.status === "finished" && phase !== "finished") {
            setGamePhase("finished");
            if (newRoom.winner_id === playerId) {
              playWinSound();
              confetti({ particleCount: 150, spread: 100 });
              awardWinnerPoints();
            } else {
              playLoseSound();
            }
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  const subscribeToMoves = (roomId: string) => {
    if (movesChannelRef.current) supabase.removeChannel(movesChannelRef.current);

    const channel = supabase
      .channel(`semantic-moves-${roomId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chain_reaction_moves", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const newMove = payload.new as MoveRow;
          if (!moveIdsRef.current.has(newMove.id)) {
            moveIdsRef.current.add(newMove.id);
            setMoves((prev) => [...prev, newMove]);
            setUsedWords((prev) => [...prev, newMove.word]);
          }
        }
      )
      .subscribe();

    movesChannelRef.current = channel;
  };

  const toggleReady = async () => {
    if (!room) return;
    const field = isHost ? "host_ready" : "guest_ready";
    const currentValue = isHost ? room.host_ready : room.guest_ready;
    try {
      await supabase.from("chain_reaction_rooms").update({ [field]: !currentValue }).eq("id", room.id);
      if (!currentValue) playReadyFeedback();
    } catch (err) {}
  };

  const startGame = async () => {
    if (!room || !isHost || !room.host_ready || !room.guest_ready) return;

    const startWords = ["행복", "사랑", "음악", "여행", "학교", "친구", "음식", "영화"];
    const startWord = startWords[Math.floor(Math.random() * startWords.length)];

    try {
      await supabase.from("chain_reaction_moves").insert({
        room_id: room.id,
        player_id: "system",
        player_name: "시스템",
        word: startWord,
        connection_mode: "semantic",
        chain_length: 1,
        score_delta: 0,
      });

      await supabase.from("chain_reaction_rooms").update({
        status: "playing",
        started_at: new Date().toISOString(),
        current_turn_player_id: room.host_id,
        turn_start_at: new Date().toISOString(),
        host_warnings: 0,
        guest_warnings: 0,
      }).eq("id", room.id);
    } catch (err) {}
  };

  const startCountdown = async (r: Room) => {
    setGamePhase("countdown");
    subscribeToMoves(r.id);

    const { data: existingMoves } = await supabase
      .from("chain_reaction_moves")
      .select("*")
      .eq("room_id", r.id)
      .order("created_at", { ascending: true });

    if (existingMoves) {
      setMoves(existingMoves);
      setUsedWords(existingMoves.map((m) => m.word));
      existingMoves.forEach((m) => moveIdsRef.current.add(m.id));
    }

    let count = 3;
    setCountdown(count);
    playCountdownBeep(count);
    const interval = setInterval(() => {
      count--;
      setCountdown(count);
      playCountdownBeep(count);
      if (count <= 0) {
        clearInterval(interval);
        setGamePhase("playing");
        setTurnTimeLeft(TURN_TIME_LIMIT);
      }
    }, 1000);
  };

  // Turn timer
  useEffect(() => {
    if (gamePhase !== "playing" || !room) return;

    if (turnTimerRef.current) clearInterval(turnTimerRef.current);

    setTurnTimeLeft(TURN_TIME_LIMIT);
    turnTimerRef.current = setInterval(() => {
      setTurnTimeLeft((prev) => {
        if (prev <= 1) {
          if (isMyTurn) handleTimeOut();
          return TURN_TIME_LIMIT;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (turnTimerRef.current) clearInterval(turnTimerRef.current); };
  }, [gamePhase, room?.current_turn_player_id]);

  const handleTimeOut = async () => {
    if (!room || !isMyTurn) return;

    const warningField = isHost ? "host_warnings" : "guest_warnings";
    const currentWarnings = isHost ? room.host_warnings : room.guest_warnings;
    const newWarnings = currentWarnings + 1;

    playWarnBeep();

    if (newWarnings > MAX_WARNINGS) {
      const winnerId = isHost ? room.guest_id : room.host_id;
      await supabase.from("chain_reaction_rooms").update({
        status: "finished",
        winner_id: winnerId,
        finished_at: new Date().toISOString(),
      }).eq("id", room.id);
    } else {
      toast({ title: `⚠️ Cảnh báo ${newWarnings}/${MAX_WARNINGS + 1}`, description: "Hết thời gian!" });
      const nextTurn = isHost ? room.guest_id : room.host_id;
      await supabase.from("chain_reaction_rooms").update({
        [warningField]: newWarnings,
        current_turn_player_id: nextTurn,
        turn_start_at: new Date().toISOString(),
      }).eq("id", room.id);
    }
  };

  const handleSubmitWord = async () => {
    if (!room || !isMyTurn || !currentInput.trim() || isValidating || !lastWord) return;

    const word = currentInput.trim();
    setIsValidating(true);
    setLastValidation(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/semantic-validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ previousWord: lastWord, newWord: word, usedWords }),
      });

      const result = await response.json();
      setLastValidation({ score: result.score, reason_ko: result.reason_ko, reason_vi: result.reason_vi });

      if (result.valid) {
        // Success - insert move and switch turn
        await supabase.from("chain_reaction_moves").insert({
          room_id: room.id,
          player_id: playerId,
          player_name: playerName,
          word: word,
          connection_mode: "semantic",
          chain_length: moves.length + 1,
          score_delta: result.score,
        });

        const scoreField = isHost ? "host_score" : "guest_score";
        const currentScore = isHost ? room.host_score : room.guest_score;
        const nextTurn = isHost ? room.guest_id : room.host_id;

        await supabase.from("chain_reaction_rooms").update({
          [scoreField]: currentScore + result.score,
          current_turn_player_id: nextTurn,
          turn_start_at: new Date().toISOString(),
        }).eq("id", room.id);

        setCurrentInput("");
        playBeep(660, 100);
      } else {
        // Failed - give warning
        const warningField = isHost ? "host_warnings" : "guest_warnings";
        const currentWarnings = isHost ? room.host_warnings : room.guest_warnings;
        const newWarnings = currentWarnings + 1;

        playWarnBeep();

        if (newWarnings > MAX_WARNINGS) {
          const winnerId = isHost ? room.guest_id : room.host_id;
          await supabase.from("chain_reaction_rooms").update({
            status: "finished",
            winner_id: winnerId,
            finished_at: new Date().toISOString(),
          }).eq("id", room.id);
        } else {
          toast({ title: `⚠️ Cảnh báo ${newWarnings}/${MAX_WARNINGS + 1}`, description: result.reason_vi });
          const nextTurn = isHost ? room.guest_id : room.host_id;
          await supabase.from("chain_reaction_rooms").update({
            [warningField]: newWarnings,
            current_turn_player_id: nextTurn,
            turn_start_at: new Date().toISOString(),
          }).eq("id", room.id);
        }
        setCurrentInput("");
      }
    } catch (err) {
      toast({ title: "Lỗi xác thực", variant: "destructive" });
    } finally {
      setIsValidating(false);
    }
  };

  const copyRoomLink = () => {
    if (!room) return;
    const link = `${window.location.origin}/#/battle?game=semantic&room=${room.room_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "🔗 Đã sao chép link!" });
  };

  const shareRoom = async () => {
    if (!room) return;
    const link = `${window.location.origin}/#/battle?game=semantic&room=${room.room_code}`;
    const shareData = {
      title: "🧠 Đấu Nghĩa 1:1",
      text: `Chơi đấu nghĩa với mình nhé! Mã phòng: ${room.room_code}`,
      url: link,
    };
    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {}
    } else {
      copyRoomLink();
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (movesChannelRef.current) supabase.removeChannel(movesChannelRef.current);
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
    };
  }, []);

  // RENDER
  if (gamePhase === "menu") {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto space-y-6"
      >
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                Đấu Nghĩa 1:1
              </span>
            </h1>
            <p className="text-muted-foreground mt-1">의미 연결 대결</p>
          </div>
        </div>

        {/* Game Rules Card */}
        <Card className="p-6 sm:p-8 bg-gradient-to-br from-purple-500/5 to-pink-500/5 border-purple-500/20">
          <h2 className="text-xl sm:text-2xl font-bold mb-6 flex items-center gap-3">
            <span className="text-2xl sm:text-3xl">📋</span>
            <span>Cách chơi</span>
            <span className="text-muted-foreground font-normal">/ 게임 방법</span>
          </h2>

          {/* Game Overview */}
          <div className="mb-6 p-5 rounded-xl bg-background/80 border border-purple-500/20">
            <p className="text-base sm:text-lg leading-relaxed">
              Nối từ theo <span className="text-purple-400 font-bold">ý nghĩa liên quan</span>, không phải âm tiết cuối.
              <br />
              <span className="text-muted-foreground">
                Ví dụ: <span className="text-foreground">"바다"</span> → <span className="text-foreground">"파도"</span> (biển → sóng), 
                <span className="text-foreground"> "학교"</span> → <span className="text-foreground">"선생님"</span> (trường → giáo viên)
              </span>
            </p>
          </div>

          {/* Rules Grid */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
              <div className="flex items-center gap-3 mb-2">
                <Lightbulb className="w-6 h-6 text-green-400" />
                <span className="font-bold text-lg text-green-400">AI chấm điểm</span>
              </div>
              <p className="text-muted-foreground">
                ≥70 điểm = PASS, dưới 70 = cảnh báo.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
              <div className="flex items-center gap-3 mb-2">
                <Timer className="w-6 h-6 text-blue-400" />
                <span className="font-bold text-lg text-blue-400">12 giây mỗi lượt</span>
              </div>
              <p className="text-muted-foreground">
                Hết giờ = nhận cảnh báo ngay!
              </p>
            </div>

            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="w-6 h-6 text-red-400" />
                <span className="font-bold text-lg text-red-400">2 cảnh báo = Thua</span>
              </div>
              <p className="text-muted-foreground">
                Từ sai, hết giờ, hoặc từ đã dùng.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
              <div className="flex items-center gap-3 mb-2">
                <Trophy className="w-6 h-6 text-yellow-400" />
                <span className="font-bold text-lg text-yellow-400">+1,000 điểm</span>
              </div>
              <p className="text-muted-foreground">
                Chiến thắng để nhận điểm thưởng!
              </p>
            </div>
          </div>

          {/* Examples */}
          <div className="mt-6 p-4 rounded-xl bg-background/50 border border-muted">
            <p className="font-semibold mb-3 flex items-center gap-2">
              <span className="text-xl">💡</span>
              Ví dụ từ liên quan
            </p>
            <div className="flex flex-wrap gap-3">
              <span className="px-4 py-2 bg-purple-500/20 rounded-lg text-purple-300 font-medium">커피 → 카페</span>
              <span className="px-4 py-2 bg-pink-500/20 rounded-lg text-pink-300 font-medium">겨울 → 눈</span>
              <span className="px-4 py-2 bg-blue-500/20 rounded-lg text-blue-300 font-medium">음악 → 노래</span>
              <span className="px-4 py-2 bg-green-500/20 rounded-lg text-green-300 font-medium">병원 → 의사</span>
            </div>
          </div>
        </Card>

        {/* Action Section */}
        <Card className="p-6 sm:p-8">
          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Tên của bạn / 닉네임
              </label>
              <Input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Nhập tên..."
                className="text-lg h-12"
                maxLength={20}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={createRoom}
                  className="w-full h-16 text-lg font-bold gap-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white"
                  disabled={!playerName.trim()}
                >
                  <Crown className="w-6 h-6" />
                  Tạo phòng
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outline"
                  onClick={() => setGamePhase("joining")}
                  className="w-full h-16 text-lg font-bold gap-3 border-2"
                  disabled={!playerName.trim()}
                >
                  <Users className="w-6 h-6" />
                  Tham gia
                </Button>
              </motion.div>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  if (gamePhase === "joining") {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto"
      >
        <Card className="p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => setGamePhase("menu")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-bold">Tham gia phòng</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Mã phòng / 방 코드
              </label>
              <Input
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                placeholder="6 ký tự..."
                className="text-center text-2xl tracking-widest h-14 font-mono"
                maxLength={6}
              />
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setGamePhase("menu")}
                className="flex-1 h-12"
              >
                Hủy
              </Button>
              <Button
                onClick={joinRoom}
                disabled={roomCodeInput.length !== 6 || !playerName.trim()}
                className="flex-1 h-12 bg-gradient-to-r from-purple-500 to-pink-500"
              >
                <Users className="w-5 h-5 mr-2" />
                Tham gia
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  if (gamePhase === "creating") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 rounded-full border-4 border-muted border-t-purple-500 mb-4"
        />
        <p className="text-muted-foreground text-lg">Đang tạo phòng...</p>
      </div>
    );
  }

  // Premium Waiting/Ready Screen
  if ((gamePhase === "waiting" || gamePhase === "ready") && room) {
    const bothReady = room.host_ready && room.guest_ready;

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg mx-auto space-y-6"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
          <h2 className="text-xl font-bold">Phòng chờ</h2>
        </div>

        {/* Room Code Card - Collapsible for manual entry fallback */}
        <RoomCodeCollapsible 
          roomCode={room.room_code}
          copied={copied}
          onCopy={copyRoomLink}
          onShare={shareRoom}
          gradientFrom="from-purple-400"
          gradientTo="to-pink-400"
          bgGlow1="bg-purple-500/10"
          bgGlow2="bg-pink-500/10"
        />

        {/* Players Status */}
        <Card className="p-5 bg-gradient-to-br from-card to-muted/30 border-border/50">
          <p className="text-xs text-muted-foreground mb-4 uppercase tracking-wider text-center">Người chơi</p>
          <div className="grid grid-cols-2 gap-4">
            <motion.div 
              animate={room.host_ready ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 1, repeat: room.host_ready ? Infinity : 0, repeatDelay: 1 }}
              className={`p-4 rounded-2xl text-center transition-all ${
                room.host_ready 
                  ? "bg-gradient-to-br from-green-500/20 to-emerald-500/10 border-2 border-green-500 shadow-lg shadow-green-500/10" 
                  : "bg-muted/30 border border-border/50"
              }`}
            >
              <div className={`w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center ${
                room.host_ready ? "bg-gradient-to-br from-green-400 to-emerald-500" : "bg-gradient-to-br from-yellow-400 to-orange-500"
              }`}>
                {room.host_ready ? <Check className="w-6 h-6 text-white" /> : <Crown className="w-6 h-6 text-white" />}
              </div>
              <p className="font-bold text-lg">{room.host_name}</p>
              <p className={`text-sm font-medium ${room.host_ready ? "text-green-500" : "text-muted-foreground"}`}>
                {room.host_ready ? "✅ Sẵn sàng" : "⏳ Chờ..."}
              </p>
            </motion.div>
            
            <motion.div 
              animate={room.guest_ready ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 1, repeat: room.guest_ready ? Infinity : 0, repeatDelay: 1 }}
              className={`p-4 rounded-2xl text-center transition-all ${
                room.guest_id 
                  ? room.guest_ready 
                    ? "bg-gradient-to-br from-green-500/20 to-emerald-500/10 border-2 border-green-500 shadow-lg shadow-green-500/10" 
                    : "bg-muted/30 border border-border/50"
                  : "bg-muted/20 border-2 border-dashed border-muted-foreground/30"
              }`}
            >
              <div className={`w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center ${
                room.guest_id 
                  ? room.guest_ready ? "bg-gradient-to-br from-green-400 to-emerald-500" : "bg-gradient-to-br from-blue-400 to-cyan-500"
                  : "bg-muted/50"
              }`}>
                {room.guest_id 
                  ? room.guest_ready ? <Check className="w-6 h-6 text-white" /> : <Users className="w-6 h-6 text-white" />
                  : <Users className="w-6 h-6 text-muted-foreground/50" />
                }
              </div>
              <p className="font-bold text-lg">{room.guest_name || "Đang chờ..."}</p>
              {room.guest_id && (
                <p className={`text-sm font-medium ${room.guest_ready ? "text-green-500" : "text-muted-foreground"}`}>
                  {room.guest_ready ? "✅ Sẵn sàng" : "⏳ Chờ..."}
                </p>
              )}
            </motion.div>
          </div>
        </Card>

        {/* Action Buttons */}
        {room.guest_id && (
          <div className="space-y-3">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button 
                onClick={toggleReady} 
                size="lg"
                className={`w-full h-14 text-lg font-bold gap-2 ${
                  (isHost ? room.host_ready : room.guest_ready)
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-gradient-to-r from-purple-500 to-pink-500"
                }`}
              >
                {(isHost ? room.host_ready : room.guest_ready) ? (
                  <>
                    <Check className="w-5 h-5" />
                    Đã sẵn sàng!
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Sẵn sàng
                  </>
                )}
              </Button>
            </motion.div>
            
            {isHost && (
              <motion.div whileHover={{ scale: bothReady ? 1.02 : 1 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  onClick={startGame} 
                  disabled={!bothReady} 
                  size="lg"
                  className={`w-full h-14 text-lg font-bold gap-2 ${
                    bothReady 
                      ? "bg-gradient-to-r from-green-400 to-emerald-500 shadow-xl shadow-green-500/30" 
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Swords className="w-5 h-5" />
                  {bothReady ? "Bắt đầu!" : "Cả hai cần sẵn sàng"}
                </Button>
              </motion.div>
            )}
          </div>
        )}
      </motion.div>
    );
  }

  // Premium Countdown Screen
  if (gamePhase === "countdown") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={countdown}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="text-center"
          >
            {countdown > 0 ? (
              <motion.div
                className="text-9xl font-black bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 bg-clip-text text-transparent"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5 }}
              >
                {countdown}
              </motion.div>
            ) : (
              <motion.div 
                initial={{ scale: 0, rotate: -10 }} 
                animate={{ scale: 1, rotate: 0 }} 
              >
                <div className="text-6xl sm:text-8xl font-black bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
                  BẮT ĐẦU! 🧠
                </div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    );
  }

  // Premium Playing Screen
  if (gamePhase === "playing" && room) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header with Timer */}
        <div className="flex items-center justify-between p-4 bg-card rounded-2xl border border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold">Đấu Nghĩa 1:1</p>
              <p className="text-xs text-muted-foreground">의미 연결</p>
            </div>
          </div>
          
          <motion.div
            animate={turnTimeLeft <= 5 && isMyTurn ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.5, repeat: turnTimeLeft <= 5 && isMyTurn ? Infinity : 0 }}
            className={`px-5 py-2.5 rounded-xl font-mono font-black text-2xl flex items-center gap-2 ${
              turnTimeLeft <= 3 
                ? "bg-red-500 text-white animate-pulse" 
                : isMyTurn 
                  ? "bg-green-500/20 text-green-500 border border-green-500/50" 
                  : "bg-muted text-muted-foreground"
            }`}
          >
            <Timer className="w-5 h-5" />
            {turnTimeLeft}s
          </motion.div>
        </div>

        {/* Scores */}
        <div className="grid grid-cols-2 gap-4">
          <Card className={`p-4 transition-all ${isHost ? "ring-2 ring-purple-500" : ""} ${room.current_turn_player_id === room.host_id ? "bg-gradient-to-br from-purple-500/10 to-pink-500/5" : ""}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                <Crown className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold truncate">{room.host_name}</span>
            </div>
            <p className="text-3xl font-black">{room.host_score} <span className="text-sm font-normal text-muted-foreground">điểm</span></p>
            {room.host_warnings > 0 && (
              <div className="flex gap-1 mt-2">
                {Array.from({ length: room.host_warnings }).map((_, i) => (
                  <AlertTriangle key={i} className="w-4 h-4 text-yellow-500" />
                ))}
              </div>
            )}
          </Card>
          
          <Card className={`p-4 transition-all ${!isHost ? "ring-2 ring-purple-500" : ""} ${room.current_turn_player_id === room.guest_id ? "bg-gradient-to-br from-purple-500/10 to-pink-500/5" : ""}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold truncate">{room.guest_name}</span>
            </div>
            <p className="text-3xl font-black">{room.guest_score} <span className="text-sm font-normal text-muted-foreground">điểm</span></p>
            {room.guest_warnings > 0 && (
              <div className="flex gap-1 mt-2">
                {Array.from({ length: room.guest_warnings }).map((_, i) => (
                  <AlertTriangle key={i} className="w-4 h-4 text-yellow-500" />
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Word chain */}
        <Card className="p-5 max-h-48 overflow-y-auto bg-gradient-to-br from-card to-muted/30 border-border/50">
          <div className="flex flex-wrap gap-2">
            {moves.map((move, idx) => (
              <motion.span
                key={move.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`px-4 py-2 rounded-xl text-sm font-bold shadow-lg ${
                  move.player_id === "system" 
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-purple-500/20" 
                    : move.player_id === playerId 
                      ? "bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-green-500/20" 
                      : "bg-gradient-to-r from-blue-400 to-cyan-500 text-white shadow-blue-500/20"
                }`}
              >
                {move.word}
                {move.score_delta > 0 && <span className="text-xs ml-1.5 opacity-80">+{move.score_delta}</span>}
              </motion.span>
            ))}
          </div>
        </Card>

        {/* Current word */}
        {lastWord && (
          <div className="text-center py-5 bg-gradient-to-br from-card to-muted/30 rounded-2xl border border-border/50">
            <p className="text-sm text-muted-foreground mb-2">Từ hiện tại / 현재 단어</p>
            <p className="text-5xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">{lastWord}</p>
          </div>
        )}

        {/* Validation feedback */}
        <AnimatePresence>
          {lastValidation && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-2xl text-sm border ${
                lastValidation.score >= PASS_SCORE 
                  ? "bg-green-500/10 text-green-400 border-green-500/30" 
                  : "bg-red-500/10 text-red-400 border-red-500/30"
              }`}
            >
              <p className="font-bold text-lg mb-1">Điểm: {lastValidation.score}/100 {lastValidation.score >= PASS_SCORE ? "✅" : "❌"}</p>
              <p>{lastValidation.reason_vi}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <div className="flex gap-3">
          <Input
            ref={inputRef}
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmitWord()}
            placeholder={isMyTurn ? "Nhập từ liên quan về ý nghĩa..." : "Đợi lượt của bạn..."}
            disabled={!isMyTurn || isValidating}
            className="flex-1 h-14 text-xl rounded-xl"
          />
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button 
              onClick={handleSubmitWord} 
              disabled={!isMyTurn || !currentInput.trim() || isValidating} 
              className="h-14 w-14 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500"
            >
              {isValidating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
            </Button>
          </motion.div>
        </div>

        {!isMyTurn && (
          <motion.p 
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-center text-sm text-muted-foreground py-2"
          >
            Đợi đối thủ... / 상대방 차례입니다
          </motion.p>
        )}
      </div>
    );
  }

  // Premium Finished Screen
  if (gamePhase === "finished" && room) {
    const isWinner = room.winner_id === playerId;
    const winnerName = room.winner_id === room.host_id ? room.host_name : room.guest_name;

    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg mx-auto"
      >
        <Card className="relative overflow-hidden bg-gradient-to-br from-card via-card to-muted/30 border-border/50">
          {/* Background Effect */}
          <div className="absolute inset-0 -z-10">
            <div
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl ${
                isWinner ? "bg-yellow-500/30" : "bg-gray-500/20"
              }`}
            />
          </div>

          <div className="p-8 sm:p-10 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring" }}
              className={`w-28 h-28 mx-auto mb-6 rounded-3xl flex items-center justify-center shadow-2xl ${
                isWinner 
                  ? "bg-gradient-to-br from-yellow-400 to-orange-500 shadow-orange-500/30" 
                  : "bg-muted"
              }`}
            >
              {isWinner 
                ? <Trophy className="w-14 h-14 text-white" /> 
                : <Swords className="w-14 h-14 text-muted-foreground" />
              }
            </motion.div>

            <h2 className={`text-4xl font-black mb-3 ${isWinner ? "text-yellow-500" : "text-muted-foreground"}`}>
              {isWinner ? "🎉 Chiến thắng!" : "😢 Thua cuộc"}
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              {isWinner ? "Bạn đã thắng +1,000 điểm!" : `${winnerName} đã thắng!`}
            </p>

            <Card className="p-5 max-w-sm mx-auto mb-8 bg-muted/30 border-border/50">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{room.host_name}</p>
                  <p className="text-3xl font-black">{room.host_score}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{room.guest_name}</p>
                  <p className="text-3xl font-black">{room.guest_score}</p>
                </div>
              </div>
            </Card>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button onClick={onBack} size="lg" className="h-14 px-8 gap-2 text-lg bg-gradient-to-r from-purple-500 to-pink-500">
                <ArrowLeft className="w-5 h-5" />
                Quay lại
              </Button>
            </motion.div>
          </div>
        </Card>
      </motion.div>
    );
  }

  if (gamePhase === "playing" && room) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            <span className="font-bold">Đấu Nghĩa</span>
          </div>
          <div className={`px-3 py-1 rounded-full font-mono font-bold ${turnTimeLeft <= 3 ? "bg-red-500 text-white animate-pulse" : "bg-muted"}`}>
            <Timer className="w-4 h-4 inline mr-1" />
            {turnTimeLeft}s
          </div>
        </div>

        {/* Scores */}
        <div className="grid grid-cols-2 gap-3">
          <Card className={`p-3 ${isHost ? "ring-2 ring-purple-500" : ""} ${room.current_turn_player_id === room.host_id ? "bg-purple-500/10" : ""}`}>
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-4 h-4 text-yellow-500" />
              <span className="font-bold text-sm truncate">{room.host_name}</span>
            </div>
            <p className="text-2xl font-bold">{room.host_score}</p>
            {room.host_warnings > 0 && (
              <div className="flex gap-1 mt-1">
                {Array.from({ length: room.host_warnings }).map((_, i) => (
                  <AlertTriangle key={i} className="w-3 h-3 text-yellow-500" />
                ))}
              </div>
            )}
          </Card>
          <Card className={`p-3 ${!isHost ? "ring-2 ring-purple-500" : ""} ${room.current_turn_player_id === room.guest_id ? "bg-purple-500/10" : ""}`}>
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="font-bold text-sm truncate">{room.guest_name}</span>
            </div>
            <p className="text-2xl font-bold">{room.guest_score}</p>
            {room.guest_warnings > 0 && (
              <div className="flex gap-1 mt-1">
                {Array.from({ length: room.guest_warnings }).map((_, i) => (
                  <AlertTriangle key={i} className="w-3 h-3 text-yellow-500" />
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Word chain */}
        <Card className="p-4 max-h-40 overflow-y-auto">
          <div className="flex flex-wrap gap-2">
            {moves.map((move, idx) => (
              <motion.span
                key={move.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  move.player_id === "system" ? "bg-purple-500/20 text-purple-400" :
                  move.player_id === playerId ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"
                }`}
              >
                {move.word}
                {move.score_delta > 0 && <span className="text-xs ml-1 opacity-70">({move.score_delta})</span>}
              </motion.span>
            ))}
          </div>
        </Card>

        {/* Current word */}
        {lastWord && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-1">Từ hiện tại / 현재 단어</p>
            <p className="text-4xl font-bold text-purple-500">{lastWord}</p>
          </div>
        )}

        {/* Validation feedback */}
        {lastValidation && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-3 rounded-lg text-sm ${lastValidation.score >= PASS_SCORE ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
          >
            <p className="font-bold">Điểm: {lastValidation.score}/100 {lastValidation.score >= PASS_SCORE ? "✅" : "❌"}</p>
            <p>{lastValidation.reason_vi}</p>
          </motion.div>
        )}

        {/* Input */}
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmitWord()}
            placeholder={isMyTurn ? "Nhập từ liên quan..." : "Đợi lượt của bạn..."}
            disabled={!isMyTurn || isValidating}
            className="flex-1"
          />
          <Button onClick={handleSubmitWord} disabled={!isMyTurn || !currentInput.trim() || isValidating} className="gap-2">
            {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>

        {!isMyTurn && (
          <p className="text-center text-sm text-muted-foreground animate-pulse">
            Đợi đối thủ... / 상대방 차례입니다
          </p>
        )}
      </div>
    );
  }

  if (gamePhase === "finished" && room) {
    const isWinner = room.winner_id === playerId;
    const winnerName = room.winner_id === room.host_id ? room.host_name : room.guest_name;

    return (
      <div className="text-center py-12 space-y-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
          {isWinner ? (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mx-auto">
              <Trophy className="w-12 h-12 text-white" />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Swords className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
        </motion.div>

        <div>
          <h2 className="text-3xl font-bold mb-2">
            {isWinner ? "🎉 Chiến thắng!" : "😢 Thua cuộc"}
          </h2>
          <p className="text-muted-foreground">
            {isWinner ? "Bạn đã thắng +1,000 điểm!" : `${winnerName} đã thắng!`}
          </p>
        </div>

        <Card className="p-4 max-w-sm mx-auto">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">{room.host_name}</p>
              <p className="text-2xl font-bold">{room.host_score}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{room.guest_name}</p>
              <p className="text-2xl font-bold">{room.guest_score}</p>
            </div>
          </div>
        </Card>

        <Button onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </Button>
      </div>
    );
  }

  return null;
}
