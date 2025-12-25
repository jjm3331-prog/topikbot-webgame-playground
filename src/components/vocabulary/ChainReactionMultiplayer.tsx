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
  RefreshCw,
  Share2,
  AlertTriangle,
} from "lucide-react";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ChainReactionMultiplayerProps {
  words: { id: number; korean: string; meaning: string }[];
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
  // Turn-based fields
  current_turn_player_id: string | null;
  turn_start_at: string | null;
  host_warnings: number;
  guest_warnings: number;
}

interface ChainWord {
  word: string;
  connectionType: "semantic" | "phonetic" | "start";
  player_id?: string;
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

const TURN_TIME_LIMIT = 12; // seconds per turn
const MAX_WARNINGS = 1; // 1 warning allowed, 2nd violation = lose

export default function ChainReactionMultiplayer({ words, onBack, initialRoomCode }: ChainReactionMultiplayerProps) {
  const { toast } = useToast();
  const [gamePhase, setGamePhase] = useState<GamePhase>("menu");
  const gamePhaseRef = useRef<GamePhase>("menu");
  const [room, setRoom] = useState<Room | null>(null);
  const [playerId] = useState(() => crypto.randomUUID());
  const [playerName, setPlayerName] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState(initialRoomCode || "");
  const [copied, setCopied] = useState(false);
  const [connectionMode, setConnectionMode] = useState<"semantic" | "phonetic">("phonetic");

  // Realtime moves
  const [moves, setMoves] = useState<MoveRow[]>([]);
  const moveIdsRef = useRef<Set<string>>(new Set());
  const movesChannelRef = useRef<any>(null);

  // Realtime debug
  const [roomSubStatus, setRoomSubStatus] = useState<string>("DISCONNECTED");
  const [movesSubStatus, setMovesSubStatus] = useState<string>("DISCONNECTED");
  const [lastMoveAt, setLastMoveAt] = useState<string | null>(null);

  // Turn-based state
  const [turnTimeLeft, setTurnTimeLeft] = useState(TURN_TIME_LIMIT);
  const turnTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Game state
  const [chain, setChain] = useState<ChainWord[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3);

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
    } catch (e) {
      console.log("Audio not supported");
    }
  };

  const vibrate = (pattern: number | number[] = 100) => {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  const playReadyFeedback = () => {
    playBeep(880, 100, "sine");
    vibrate(50);
  };

  const playCountdownBeep = (num: number) => {
    if (num > 0) {
      playBeep(600, 100, "square");
      vibrate(30);
    } else {
      playBeep(880, 200, "sawtooth");
      vibrate([50, 50, 100]);
    }
  };

  const playWarnBeep = () => {
    playBeep(300, 300, "square");
    vibrate([100, 50, 100]);
  };

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

      // Get current points
      const { data: profile, error: fetchError } = await supabase
        .from("profiles")
        .select("points")
        .eq("id", session.user.id)
        .maybeSingle();

      if (fetchError) {
        console.error("Failed to fetch profile:", fetchError);
        return;
      }

      const currentPoints = profile?.points || 0;
      const newPoints = currentPoints + 1000;

      // Update points
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ points: newPoints })
        .eq("id", session.user.id);

      if (updateError) {
        console.error("Failed to update points:", updateError);
        return;
      }

      toast({
        title: "🎉 +1,000 điểm!",
        description: "Bạn đã nhận được 1,000 điểm thưởng chiến thắng!",
      });
    } catch (err) {
      console.error("Error awarding points:", err);
    }
  };

  // Random nickname
  const generateRandomNickname = () => {
    const adjectives = ["빠른", "용감한", "똑똒한", "귀여운", "멋진", "신나는", "활발한", "재미있는"];
    const nouns = ["호랑이", "토끼", "용", "펭귄", "고양이", "강아지", "여우", "곰"];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 100);
    return `${adj}${noun}${num}`;
  };

  // Room code generator
  const generateRoomCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Validate word connection (phonetic only for turn-based)
  const validateConnection = async (newWord: string, previousWord: string) => {
    const lastChar = previousWord.charAt(previousWord.length - 1);
    const dueum: Record<string, string[]> = {
      녀: ["여"],
      뇨: ["요"],
      뉴: ["유"],
      니: ["이"],
      랴: ["야"],
      려: ["여"],
      례: ["예"],
      료: ["요"],
      류: ["유"],
      리: ["이"],
      라: ["나"],
      래: ["내"],
      로: ["노"],
      뢰: ["뇌"],
      루: ["누"],
      르: ["느"],
    };
    const validStarts = [lastChar, ...(dueum[lastChar] || [])];
    const firstChar = newWord.charAt(0);
    return validStarts.includes(firstChar);
  };

  // URL auto-join
  useEffect(() => {
    if (initialRoomCode && initialRoomCode.length === 6 && gamePhase === "menu") {
      const autoNickname = generateRandomNickname();
      setPlayerName(autoNickname);
      setRoomCodeInput(initialRoomCode.toUpperCase());

      const autoJoin = async () => {
        try {
          const code = initialRoomCode.toUpperCase();
          const { data: roomData, error: findError } = await supabase
            .from("chain_reaction_rooms")
            .select()
            .eq("room_code", code)
            .maybeSingle();

          if (findError) throw findError;
          if (!roomData) {
            toast({ title: "방을 찾을 수 없습니다", variant: "destructive" });
            setGamePhase("menu");
            return;
          }
          if (roomData.status === "playing" || roomData.status === "finished") {
            toast({ title: "이미 진행 중이거나 종료된 방입니다", variant: "destructive" });
            setGamePhase("menu");
            return;
          }
          if (roomData.guest_id) {
            toast({ title: "이미 다른 사람이 참가했습니다", variant: "destructive" });
            setGamePhase("menu");
            return;
          }

          const { data, error } = await supabase
            .from("chain_reaction_rooms")
            .update({ guest_id: playerId, guest_name: autoNickname })
            .eq("id", roomData.id)
            .select()
            .single();

          if (error) throw error;
          setRoom(data as Room);
          setConnectionMode((data.connection_mode as "semantic" | "phonetic") || "phonetic");
          setGamePhase("ready");
          subscribeToRoom(data.id);
          toast({ title: `${autoNickname}(으)로 참가 완료!` });
        } catch (err) {
          console.error("Auto join failed:", err);
          toast({ title: "자동 참가 실패", variant: "destructive" });
          setGamePhase("menu");
        }
      };

      setGamePhase("joining");
      void autoJoin();
    }
  }, [initialRoomCode]);

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
          connection_mode: "phonetic",
          status: "waiting",
        })
        .select()
        .single();

      if (error) throw error;
      setRoom(data as Room);
      setConnectionMode("phonetic");
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
      const code = roomCodeInput.toUpperCase();
      const { data: roomData, error: findError } = await supabase
        .from("chain_reaction_rooms")
        .select()
        .eq("room_code", code)
        .maybeSingle();

      if (findError) throw findError;
      if (!roomData) {
        toast({ title: "방을 찾을 수 없습니다", variant: "destructive" });
        setGamePhase("menu");
        return;
      }
      if (roomData.status === "playing" || roomData.status === "finished") {
        toast({ title: "이미 진행 중이거나 종료된 방입니다", variant: "destructive" });
        setGamePhase("menu");
        return;
      }
      if (roomData.guest_id) {
        toast({ title: "이미 다른 사람이 참가했습니다", variant: "destructive" });
        setGamePhase("menu");
        return;
      }

      const { data, error } = await supabase
        .from("chain_reaction_rooms")
        .update({ guest_id: playerId, guest_name: playerName.trim() })
        .eq("id", roomData.id)
        .select()
        .single();

      if (error) throw error;
      setRoom(data as Room);
      setConnectionMode((data.connection_mode as "semantic" | "phonetic") || "phonetic");
      setGamePhase("ready");
      subscribeToRoom(data.id);
    } catch (err) {
      console.error("Failed to join room:", err);
      toast({ title: "방 참가 실패", variant: "destructive" });
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
          event: "*",
          schema: "public",
          table: "chain_reaction_rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          console.log("[ChainRT] room update:", payload);
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
              // Award 1000 points for winning
              awardWinnerPoints();
            } else {
              playLoseSound();
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("[ChainRT] subscribe status:", status, "roomId:", roomId);
        setRoomSubStatus(String(status));
      });

    channelRef.current = channel;
  };

  // Toggle ready
  const toggleReady = async () => {
    if (!room) return;
    const field = isHost ? "host_ready" : "guest_ready";
    const currentValue = isHost ? room.host_ready : room.guest_ready;

    try {
      await supabase.from("chain_reaction_rooms").update({ [field]: !currentValue }).eq("id", room.id);
      if (!currentValue) playReadyFeedback();
    } catch (err) {
      console.error("Failed to toggle ready:", err);
    }
  };

  // Start game (host only)
  const startGame = async () => {
    if (!room || !isHost) return;
    if (!room.host_ready || !room.guest_ready) {
      toast({ title: "양쪽 모두 준비해야 시작할 수 있습니다", variant: "destructive" });
      return;
    }

    // Pick random start word
    const startWord = words.length > 0 ? words[Math.floor(Math.random() * words.length)].korean : "사과";

    try {
      // Insert start move
      await (supabase as any)
        .from("chain_reaction_moves")
        .insert({
          room_id: room.id,
          player_id: "SYSTEM",
          player_name: "시작",
          word: startWord,
          connection_mode: "phonetic",
          chain_length: 0,
          score_delta: 0,
        });

      // Host goes first
      await supabase
        .from("chain_reaction_rooms")
        .update({
          status: "playing",
          started_at: new Date().toISOString(),
          current_turn_player_id: room.host_id,
          turn_start_at: new Date().toISOString(),
        })
        .eq("id", room.id);

      startCountdown(room);
    } catch (err) {
      console.error("Failed to start game:", err);
    }
  };

  // Countdown
  const startCountdown = (roomData: Room) => {
    setGamePhase("countdown");
    setCountdown(3);

    let count = 3;
    playCountdownBeep(count);

    const countdownInterval = setInterval(() => {
      count--;
      setCountdown(count);
      playCountdownBeep(count);

      if (count <= 0) {
        clearInterval(countdownInterval);
        setTimeout(() => {
          startGameLocal(roomData);
        }, 500);
      }
    }, 1000);
  };

  // Local game start
  const startGameLocal = (roomData: Room) => {
    setGamePhase("playing");
    setTurnTimeLeft(TURN_TIME_LIMIT);
    setChain([]);
    setMoves([]);
    moveIdsRef.current = new Set();
    setCurrentInput("");
    setError(null);
    setConnectionMode("phonetic");
  };

  // Turn timer
  useEffect(() => {
    if (gamePhase !== "playing" || !room) {
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
      return;
    }

    // Reset turn timer when turn changes
    setTurnTimeLeft(TURN_TIME_LIMIT);

    turnTimerRef.current = setInterval(() => {
      setTurnTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up for current player
          handleTimeUp();
          return TURN_TIME_LIMIT;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
    };
  }, [gamePhase, room?.current_turn_player_id]);

  // Handle time up
  const handleTimeUp = async () => {
    if (!room || !isMyTurn) return;

    const warningField = isHost ? "host_warnings" : "guest_warnings";
    const currentWarnings = isHost ? (room.host_warnings || 0) : (room.guest_warnings || 0);

    if (currentWarnings >= MAX_WARNINGS) {
      // Lose the game
      const winnerId = isHost ? room.guest_id : room.host_id;
      await supabase
        .from("chain_reaction_rooms")
        .update({
          status: "finished",
          finished_at: new Date().toISOString(),
          winner_id: winnerId,
        })
        .eq("id", room.id);

      toast({ title: "⏰ 시간 초과! 패배했습니다", variant: "destructive" });
    } else {
      // Give warning and pass turn
      playWarnBeep();
      toast({ title: "⚠️ 경고! 시간 초과로 경고 1회 부여", variant: "destructive" });

      const nextTurnPlayer = isHost ? room.guest_id : room.host_id;

      await supabase
        .from("chain_reaction_rooms")
        .update({
          [warningField]: currentWarnings + 1,
          current_turn_player_id: nextTurnPlayer,
          turn_start_at: new Date().toISOString(),
        })
        .eq("id", room.id);
    }
  };

  // Handle word submission
  const handleSubmit = async () => {
    if (!currentInput.trim() || isValidating || !room || !isMyTurn) return;

    const newWord = currentInput.trim();
    setError(null);

    // Check duplicate
    if (chain.some((c) => c.word === newWord)) {
      // Duplicate = violation
      await handleViolation("이미 사용한 단어예요!");
      return;
    }

    // Validate connection
    if (chain.length > 0) {
      setIsValidating(true);
      const previousWord = chain[chain.length - 1].word;
      const isValid = await validateConnection(newWord, previousWord);
      setIsValidating(false);

      if (!isValid) {
        const lastChar = previousWord.charAt(previousWord.length - 1);
        await handleViolation(`'${lastChar}'로 시작해야 해요!`);
        return;
      }
    }

    // Valid word - insert move and pass turn
    const newChainLength = chain.length + 1;
    const nextTurnPlayer = isHost ? room.guest_id : room.host_id;

    try {
      // Insert move
      await (supabase as any)
        .from("chain_reaction_moves")
        .insert({
          room_id: room.id,
          player_id: playerId,
          player_name: playerName || (isHost ? room.host_name : room.guest_name || "Player"),
          word: newWord,
          connection_mode: "phonetic",
          chain_length: newChainLength,
          score_delta: 0,
        });

      // Update room: pass turn
      await supabase
        .from("chain_reaction_rooms")
        .update({
          current_turn_player_id: nextTurnPlayer,
          turn_start_at: new Date().toISOString(),
        })
        .eq("id", room.id);

      setCurrentInput("");
      setTurnTimeLeft(TURN_TIME_LIMIT);
    } catch (err) {
      console.error("Failed to submit word:", err);
      toast({ title: "단어 전송 실패", variant: "destructive" });
    }

    inputRef.current?.focus();
  };

  // Handle rule violation
  const handleViolation = async (message: string) => {
    if (!room) return;

    const warningField = isHost ? "host_warnings" : "guest_warnings";
    const currentWarnings = isHost ? (room.host_warnings || 0) : (room.guest_warnings || 0);

    if (currentWarnings >= MAX_WARNINGS) {
      // Lose
      const winnerId = isHost ? room.guest_id : room.host_id;
      await supabase
        .from("chain_reaction_rooms")
        .update({
          status: "finished",
          finished_at: new Date().toISOString(),
          winner_id: winnerId,
        })
        .eq("id", room.id);

      toast({ title: `❌ ${message} 패배!`, variant: "destructive" });
    } else {
      // Warning
      playWarnBeep();
      setError(`⚠️ ${message} 경고 1회!`);

      const nextTurnPlayer = isHost ? room.guest_id : room.host_id;

      await supabase
        .from("chain_reaction_rooms")
        .update({
          [warningField]: currentWarnings + 1,
          current_turn_player_id: nextTurnPlayer,
          turn_start_at: new Date().toISOString(),
        })
        .eq("id", room.id);

      setCurrentInput("");
    }
  };

  // Moves realtime sync
  useEffect(() => {
    const roomId = room?.id;
    if (!roomId || gamePhase !== "playing") return;

    let cancelled = false;

    const loadAndSubscribe = async () => {
      console.log("[ChainMoves] init for room:", roomId);

      const { data, error } = await (supabase as any)
        .from("chain_reaction_moves")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (error) {
        console.error("[ChainMoves] load error:", error);
        return;
      }

      const rows = (data || []) as MoveRow[];
      moveIdsRef.current = new Set(rows.map((r) => r.id));
      setMoves(rows);

      // Build chain from moves
      setChain(
        rows.map((r) => ({
          word: r.word,
          connectionType: r.player_id === "SYSTEM" ? "start" : "phonetic",
          player_id: r.player_id,
        }))
      );

      if (movesChannelRef.current) {
        supabase.removeChannel(movesChannelRef.current);
      }

      const ch = supabase
        .channel(`moves-${roomId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chain_reaction_moves",
            filter: `room_id=eq.${roomId}`,
          },
          (payload) => {
            console.log("[ChainMoves] insert:", payload);
            const row = payload.new as MoveRow;
            if (!row?.id) return;
            if (moveIdsRef.current.has(row.id)) return;

            moveIdsRef.current.add(row.id);
            setLastMoveAt(new Date().toISOString());
            setMoves((prev) => [...prev, row]);
            setChain((prev) => [
              ...prev,
              {
                word: row.word,
                connectionType: row.player_id === "SYSTEM" ? "start" : "phonetic",
                player_id: row.player_id,
              },
            ]);
          }
        )
        .subscribe((status) => {
          console.log("[ChainMoves] subscribe status:", status);
          setMovesSubStatus(String(status));
        });

      movesChannelRef.current = ch;
    };

    void loadAndSubscribe();

    return () => {
      cancelled = true;
      if (movesChannelRef.current) {
        supabase.removeChannel(movesChannelRef.current);
        movesChannelRef.current = null;
      }
    };
  }, [room?.id, gamePhase]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (movesChannelRef.current) supabase.removeChannel(movesChannelRef.current);
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
    };
  }, []);

  // Auto-focus
  useEffect(() => {
    if (gamePhase === "playing" && isMyTurn) {
      inputRef.current?.focus();
    }
  }, [gamePhase, isMyTurn]);

  // Copy URL
  const copyRoomUrl = () => {
    if (!room?.room_code) return;

    // Use current origin so the link works in preview + production.
    // Hash route is required in our deployment.
    const url = `${window.location.origin}/#/battle?game=word-chain&room=${room.room_code}`;

    navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: "🔗 Đã sao chép link!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareRoom = async () => {
    if (!room?.room_code) return;

    const url = `${window.location.origin}/#/battle?game=word-chain&room=${room.room_code}`;
    const shareData = {
      title: "Nối từ 1:1",
      text: `🎮 Chơi nối từ với mình nhé! Mã phòng: ${room.room_code}`,
      url,
    };

    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
      } catch {
        copyRoomUrl();
      }
    } else {
      copyRoomUrl();
    }
  };

  // ==================== RENDER ====================

  // Menu
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
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                <Link2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                Nối từ 1:1
              </span>
            </h1>
            <p className="text-muted-foreground mt-1">끝말잇기 대결</p>
          </div>
        </div>

        {/* Game Rules Card */}
        <Card className="p-6 sm:p-8 bg-gradient-to-br from-yellow-500/5 to-orange-500/5 border-yellow-500/20">
          <h2 className="text-xl sm:text-2xl font-bold mb-6 flex items-center gap-3">
            <span className="text-2xl sm:text-3xl">📋</span>
            <span>Cách chơi</span>
            <span className="text-muted-foreground font-normal">/ 게임 방법</span>
          </h2>

          {/* Game Overview */}
          <div className="mb-6 p-5 rounded-xl bg-background/80 border border-yellow-500/20">
            <p className="text-base sm:text-lg leading-relaxed">
              Nối từ theo <span className="text-yellow-500 font-bold">âm tiết cuối</span> của từ trước đó.
              <br />
              <span className="text-muted-foreground">
                Ví dụ: <span className="text-foreground">"사랑"</span> → <span className="text-foreground">"랑데부"</span> → <span className="text-foreground">"부자"</span>
              </span>
            </p>
          </div>

          {/* Rules Grid */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
              <div className="flex items-center gap-3 mb-2">
                <Timer className="w-6 h-6 text-blue-400" />
                <span className="font-bold text-lg text-blue-400">12 giây mỗi lượt</span>
              </div>
              <p className="text-muted-foreground">
                Hết giờ mà chưa nhập = cảnh báo!
              </p>
            </div>

            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="w-6 h-6 text-red-400" />
                <span className="font-bold text-lg text-red-400">2 cảnh báo = Thua</span>
              </div>
              <p className="text-muted-foreground">
                Từ sai hoặc hết giờ đều tính cảnh báo.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
              <div className="flex items-center gap-3 mb-2">
                <Zap className="w-6 h-6 text-green-400" />
                <span className="font-bold text-lg text-green-400">Luật đueum 두음법칙</span>
              </div>
              <p className="text-muted-foreground">
                녀→여, 뇨→요, 뉴→유, 니→이, 랴→야...
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
                  className="w-full h-16 text-lg font-bold gap-3 bg-gradient-to-r from-yellow-400 to-orange-500 hover:opacity-90 text-white"
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

  // Joining
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
                className="flex-1 h-12 bg-gradient-to-r from-yellow-400 to-orange-500"
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

  // Waiting / Creating
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

          <h2 className="text-xl sm:text-2xl font-bold mb-2">Đang chờ đối thủ...</h2>
          <p className="text-muted-foreground mb-4 sm:mb-6 text-sm sm:text-base">Chia sẻ link cho bạn bè nhé!</p>

          {room && (
            <div className="mb-4 sm:mb-6">
              <div className="text-xs sm:text-sm text-muted-foreground mb-2">Mã phòng</div>
              <div className="text-2xl sm:text-4xl font-mono font-bold tracking-widest bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent mb-3">
                {room.room_code}
              </div>

              <div className="flex justify-center gap-2 mb-4">
                <Button onClick={shareRoom} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90">
                  <Share2 className="w-4 h-4 mr-2" />
                  Chia sẻ link
                </Button>
                <Button variant="outline" onClick={copyRoomUrl}>
                  {copied ? <Check className="w-4 h-4 mr-2 text-green-500" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? "Đã copy!" : "Copy"}
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
                <div className="text-xs text-muted-foreground">Chủ phòng</div>
              </div>
              <Swords className="w-6 h-6 text-muted-foreground" />
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-1">
                  <Users className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="font-medium text-muted-foreground">???</div>
                <div className="text-xs text-muted-foreground">Đang chờ</div>
              </div>
            </div>
          </div>

          <Button variant="ghost" onClick={onBack}>
            Hủy bỏ
          </Button>
        </Card>
      </motion.div>
    );
  }

  // Ready
  if (gamePhase === "ready") {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="p-4 sm:p-6 md:p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-green-500/20 rounded-full blur-3xl animate-pulse" />
          </div>

          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
            <Swords className="w-20 h-20 mx-auto mb-4 text-primary" />
          </motion.div>

          <h2 className="text-2xl font-bold mb-2">Chuẩn bị đấu!</h2>
          <p className="text-muted-foreground mb-4">Lần lượt nối từ • 12 giây/lượt • 1 cảnh báo</p>

          <div className="bg-muted/50 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-1 transition-all ${
                    room?.host_ready ? "bg-green-500/30 ring-2 ring-green-500" : "bg-purple-500/20"
                  }`}
                >
                  {room?.host_ready ? <Check className="w-7 h-7 text-green-500" /> : <Crown className="w-7 h-7 text-purple-500" />}
                </div>
                <div className="font-bold">{room?.host_name}</div>
                <div className={`text-xs ${room?.host_ready ? "text-green-500 font-medium" : "text-muted-foreground"}`}>
                  {room?.host_ready ? "Sẵn sàng ✓" : "Đang chờ..."}
                </div>
                {isHost && <div className="text-xs text-primary mt-0.5">Tôi</div>}
              </div>

              <div className="text-2xl">⚡</div>

              <div className="text-center">
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-1 transition-all ${
                    room?.guest_ready ? "bg-green-500/30 ring-2 ring-green-500" : "bg-pink-500/20"
                  }`}
                >
                  {room?.guest_ready ? <Check className="w-7 h-7 text-green-500" /> : <Users className="w-7 h-7 text-pink-500" />}
                </div>
                <div className="font-bold">{room?.guest_name}</div>
                <div className={`text-xs ${room?.guest_ready ? "text-green-500 font-medium" : "text-muted-foreground"}`}>
                  {room?.guest_ready ? "Sẵn sàng ✓" : "Đang chờ..."}
                </div>
                {!isHost && <div className="text-xs text-primary mt-0.5">Tôi</div>}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={toggleReady}
                size="lg"
                className={`w-full gap-2 text-lg ${
                  (isHost && room?.host_ready) || (!isHost && room?.guest_ready)
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-gradient-to-r from-purple-500 to-pink-500"
                }`}
              >
                {(isHost && room?.host_ready) || (!isHost && room?.guest_ready) ? (
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
              <motion.div whileHover={{ scale: room?.host_ready && room?.guest_ready ? 1.02 : 1 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={startGame}
                  size="lg"
                  disabled={!room?.host_ready || !room?.guest_ready}
                  className={`w-full gap-2 text-lg ${
                    room?.host_ready && room?.guest_ready
                      ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  }`}
                >
                  <Play className="w-6 h-6" />
                  {room?.host_ready && room?.guest_ready ? "Bắt đầu!" : "Cả hai cần sẵn sàng"}
                </Button>
              </motion.div>
            )}

            {!isHost && room?.host_ready && room?.guest_ready && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang chờ chủ phòng bắt đầu...
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    );
  }

  // Countdown
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
              <div className="relative">
                <motion.div
                  className="text-9xl font-black bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 bg-clip-text text-transparent"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.5 }}
                >
                  {countdown}
                </motion.div>
              </div>
            ) : (
              <motion.div initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} className="relative">
                <div className="text-6xl sm:text-8xl font-black bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
                  BẮT ĐẦU! 🎮
                </div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    );
  }

  // Playing
  if (gamePhase === "playing") {
    const opponentName = isHost ? room?.guest_name : room?.host_name;

      return (
        <div className="space-y-4">
          {/* Turn indicator */}
          <div
            className={`text-center py-3 rounded-xl font-bold text-lg ${
              isMyTurn ? "bg-green-500/20 text-green-400 border border-green-500/50" : "bg-muted text-muted-foreground"
            }`}
          >
            {isMyTurn ? "🎯 Lượt của bạn! Hãy nhập từ!" : `⏳ Lượt của ${opponentName}...`}
          </div>

        {/* Timer & Warnings */}
        <div className="grid grid-cols-3 gap-2 items-center bg-card rounded-xl p-3 border">
          <div className="text-center">
            <div className="font-bold text-sm">{isHost ? room?.host_name : room?.guest_name}</div>
            <div className="flex items-center justify-center gap-1 mt-1">
              {Array.from({ length: MAX_WARNINGS + 1 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full ${i < myWarnings ? "bg-red-500" : "bg-muted"}`}
                  title={i < myWarnings ? "Cảnh báo" : ""}
                />
              ))}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{myWarnings > 0 && <span className="text-red-400">Cảnh báo {myWarnings}</span>}</div>
          </div>

          <div className="text-center">
            <motion.div
              className={`text-4xl font-black ${turnTimeLeft <= 5 ? "text-red-500" : isMyTurn ? "text-green-400" : "text-muted-foreground"}`}
              animate={turnTimeLeft <= 5 && isMyTurn ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.5, repeat: turnTimeLeft <= 5 && isMyTurn ? Infinity : 0 }}
            >
              {turnTimeLeft}s
            </motion.div>
            <div className="text-xs text-muted-foreground">Giới hạn</div>
          </div>

          <div className="text-center">
            <div className="font-bold text-sm text-muted-foreground">{opponentName}</div>
            <div className="flex items-center justify-center gap-1 mt-1">
              {Array.from({ length: MAX_WARNINGS + 1 }).map((_, i) => (
                <div key={i} className={`w-4 h-4 rounded-full ${i < opponentWarnings ? "bg-red-500" : "bg-muted"}`} />
              ))}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {opponentWarnings > 0 && <span className="text-red-400">Cảnh báo {opponentWarnings}</span>}
            </div>
          </div>
        </div>

        {/* Chain display */}
        <Card className="p-4 bg-gradient-to-br from-card to-muted/30">
          <div className="min-h-[80px] max-h-[150px] overflow-y-auto">
            <div className="flex flex-wrap gap-2 items-center justify-center">
              {chain.map((item, idx) => (
                <motion.div key={idx} initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1">
                  <div
                    className={`px-3 py-1.5 rounded-lg font-bold text-sm ${
                      item.connectionType === "start"
                        ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                        : item.player_id === playerId
                          ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                          : "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                    }`}
                  >
                    {item.word}
                  </div>
                  {idx < chain.length - 1 && <span className="text-lg">→</span>}
                </motion.div>
              ))}
              {chain.length > 0 && (
                <motion.div
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="px-3 py-1.5 rounded-lg border-2 border-dashed border-primary/50 text-primary/50 font-bold text-sm"
                >
                  ?
                </motion.div>
              )}
            </div>
          </div>
          {chain.length > 0 && (
            <div className="mt-2 text-center text-xs text-muted-foreground">
              Tiếp theo: bắt đầu bằng '{chain[chain.length - 1].word.slice(-1)}'
            </div>
          )}
        </Card>

        {/* Error message */}
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center text-red-400 font-medium">
            {error}
          </motion.div>
        )}

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
              !isMyTurn
                ? "Lượt của đối thủ..."
                : chain.length > 0
                  ? `Bắt đầu bằng '${chain[chain.length - 1].word.slice(-1)}'...`
                  : "Nhập từ..."
            }
            className={`text-lg ${!isMyTurn ? "opacity-50" : ""}`}
            disabled={isValidating || !isMyTurn}
          />
          <Button onClick={handleSubmit} disabled={!currentInput.trim() || isValidating || !isMyTurn} size="icon" className="h-12 w-12">
            {isValidating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </div>
      </div>
    );
  }

  // Finished
  if (gamePhase === "finished") {
    const isWinner = room?.winner_id === playerId;
    const opponentName = isHost ? room?.guest_name : room?.host_name;

    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="p-6 sm:p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl ${
                isWinner ? "bg-yellow-500/30" : "bg-gray-500/20"
              }`}
            />
          </div>

          <motion.div initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200 }}>
            {isWinner ? <Trophy className="w-24 h-24 mx-auto mb-4 text-yellow-500" /> : <Flame className="w-24 h-24 mx-auto mb-4 text-gray-400" />}
          </motion.div>

          <h2 className={`text-3xl font-black mb-2 ${isWinner ? "text-yellow-500" : "text-gray-400"}`}>{isWinner ? "🎉 Chiến thắng!" : "😢 Thua cuộc"}</h2>

          <p className="text-muted-foreground mb-4">{isWinner ? `Bạn đã thắng ${opponentName}!` : `Bạn đã thua ${opponentName}...`}</p>

          {isWinner && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="mb-4 inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/20 border border-yellow-500/50 rounded-full"
            >
              <Trophy className="w-5 h-5 text-yellow-500" />
              <span className="text-lg font-black text-yellow-500">+1,000 điểm!</span>
            </motion.div>
          )}

          <div className="bg-muted/50 rounded-xl p-4 mb-6">
            <div className="text-sm text-muted-foreground mb-2">Tổng số từ đã nối</div>
            <div className="text-4xl font-black text-primary">{chain.length} từ</div>
          </div>

          <div className="flex gap-3 justify-center">
            <Button onClick={onBack} variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Thoát
            </Button>
            <Button
              onClick={() => {
                setGamePhase("menu");
                setRoom(null);
                setChain([]);
                setMoves([]);
                setError(null);
              }}
              className="gap-2 bg-gradient-to-r from-purple-500 to-pink-500"
            >
              <RefreshCw className="w-4 h-4" />
              Chơi lại
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  }

  return null;
}
