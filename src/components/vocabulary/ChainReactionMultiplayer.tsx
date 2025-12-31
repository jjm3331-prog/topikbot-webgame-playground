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
import RoomCodeCollapsible from "@/components/battle/RoomCodeCollapsible";
import { saveHostedRoom, clearHostedRoom } from "@/components/battle/GuestJoinedNotification";
import { saveGameRecord } from "@/lib/gameRecords";

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
  const guestJoinNotifiedRef = useRef(false);
  const autoStartTriggeredRef = useRef(false);

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

  // Validate word connection AND word existence via edge function
  const validateConnection = async (newWord: string, previousWord: string): Promise<{ valid: boolean; reason?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke("chain-validate", {
        body: { previousWord, newWord, mode: "phonetic" }
      });

      if (error) {
        console.error("chain-validate error:", error);
        // Fallback to local validation on error
        const lastChar = previousWord.charAt(previousWord.length - 1);
        const dueum: Record<string, string[]> = {
          녀: ["여"], 뇨: ["요"], 뉴: ["유"], 니: ["이"],
          랴: ["야"], 려: ["여"], 례: ["예"], 료: ["요"],
          류: ["유"], 리: ["이"], 라: ["나"], 래: ["내"],
          로: ["노"], 뢰: ["뇌"], 루: ["누"], 르: ["느"],
        };
        const validStarts = [lastChar, ...(dueum[lastChar] || [])];
        const firstChar = newWord.charAt(0);
        return { valid: validStarts.includes(firstChar) };
      }

      return { 
        valid: data?.isValid === true, 
        reason: data?.reason 
      };
    } catch (err) {
      console.error("validateConnection error:", err);
      // Fallback to local phonetic check
      const lastChar = previousWord.charAt(previousWord.length - 1);
      const firstChar = newWord.charAt(0);
      return { valid: lastChar === firstChar };
    }
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
          
          // Find room with phonetic connection mode only
          const { data: roomData, error: findError } = await supabase
            .from("chain_reaction_rooms")
            .select()
            .eq("room_code", code)
            .eq("connection_mode", "phonetic")
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
            .update({ guest_id: playerId, guest_name: autoNickname, guest_ready: true })
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

  // Host/Guest가 실제로 "페이지를 떠날 때"만 처리 (state 변경 cleanup에서 방 삭제되는 버그 방지)
  const roomRef = useRef<Room | null>(null);
  const isHostRef = useRef(false);
  const gamePhaseOnLeaveRef = useRef<GamePhase>("menu");

  useEffect(() => {
    roomRef.current = room;
    isHostRef.current = isHost;
    gamePhaseOnLeaveRef.current = gamePhase;
  }, [room, isHost, gamePhase]);

  useEffect(() => {
    const handleLeave = async (reason: "beforeunload" | "unmount") => {
      const currentRoom = roomRef.current;
      const amHost = isHostRef.current;
      const phase = gamePhaseOnLeaveRef.current;

      if (!currentRoom) return;

      // 대기실: 호스트가 떠나면 방 삭제
      if (amHost && (phase === "waiting" || phase === "ready")) {
        try {
          await supabase.from("chain_reaction_rooms").delete().eq("id", currentRoom.id);
          clearHostedRoom();
          console.log(`[ChainRT] Host left waiting room (${reason}) - room deleted:`, currentRoom.id);
        } catch (err) {
          console.error("Failed to delete room on leave:", err);
        }
      }
      // 게임 중: 떠난 사람 패배 처리
      else if (phase === "playing") {
        try {
          const winnerId = amHost ? currentRoom.guest_id : currentRoom.host_id;
          await supabase
            .from("chain_reaction_rooms")
            .update({
              status: "finished",
              winner_id: winnerId,
              finished_at: new Date().toISOString(),
            })
            .eq("id", currentRoom.id);
          console.log(`[ChainRT] Player left during game (${reason}) - opponent wins:`, winnerId);
        } catch (err) {
          console.error("Failed to set winner on leave:", err);
        }
      }
    };

    const handleBeforeUnload = () => {
      // beforeunload에서는 await 불가 → fire-and-forget
      void handleLeave("beforeunload");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      void handleLeave("unmount");
    };
  }, []);

  // 호스트가 게스트 강퇴
  const kickGuest = async () => {
    if (!room || !isHost || !room.guest_id) return;
    try {
      await supabase.from("chain_reaction_rooms").update({
        guest_id: null,
        guest_name: null,
        guest_ready: false,
        host_ready: false,
      }).eq("id", room.id);
      toast({ title: "게스트를 강퇴했습니다" });
    } catch (err) {
      console.error("Failed to kick guest:", err);
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
          connection_mode: "phonetic",
          status: "waiting",
          host_ready: true,
        })
        .select()
        .single();

      if (error) throw error;
      setRoom(data as Room);
      setConnectionMode("phonetic");
      setGamePhase("waiting");
      subscribeToRoom(data.id);
      // Save to localStorage for guest-joined notification
      saveHostedRoom(data.id, playerId);
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
        .update({ guest_id: playerId, guest_name: playerName.trim(), guest_ready: true })
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

          // Host: guest joined → notify + auto-ready + auto-start
          if (isHost && newRoom.guest_id) {
            if (!guestJoinNotifiedRef.current) {
              guestJoinNotifiedRef.current = true;
              playBeep(784, 120, "sine");
              vibrate([80, 40, 120]);
              toast({
                title: "상대가 참가했습니다",
                description: newRoom.guest_name ? `${newRoom.guest_name}님이 들어왔습니다.` : undefined,
                duration: 6000,
              });
            }

            // Make sure both are ready so "참가 → 즉시 시작"이 되게 함
            if (newRoom.status === "waiting" && (!newRoom.host_ready || !newRoom.guest_ready)) {
              void supabase
                .from("chain_reaction_rooms")
                .update({
                  host_ready: true,
                  guest_ready: newRoom.guest_id ? true : false,
                })
                .eq("id", newRoom.id);
            }

            // Auto-start once when conditions are met
            if (
              newRoom.status === "waiting" &&
              newRoom.host_ready &&
              newRoom.guest_ready &&
              !autoStartTriggeredRef.current
            ) {
              autoStartTriggeredRef.current = true;
              setTimeout(() => void startGame(), 150);
            }
          }

          if (newRoom.guest_id && (phase === "waiting" || phase === "creating" || phase === "joining")) {
            setGamePhase("ready");
          }

          if (newRoom.status === "playing" && phase !== "playing" && phase !== "countdown") {
            startCountdown(newRoom);
          }

          if (newRoom.status === "finished" && phase !== "finished") {
            setGamePhase("finished");
            const isWinner = newRoom.winner_id === playerId;
            const myScore = isHost ? (newRoom.host_score || 0) : (newRoom.guest_score || 0);
            const opponentScore = isHost ? (newRoom.guest_score || 0) : (newRoom.host_score || 0);
            
            // Save game record
            saveGameRecord({
              gameType: "chain_reaction",
              result: isWinner ? "win" : "lose",
              myScore,
              opponentScore,
              opponentName: isHost ? newRoom.guest_name || undefined : newRoom.host_name,
              roomId: newRoom.id,
            });
            
            if (isWinner) {
              playWinSound();
              confetti({ particleCount: 150, spread: 100 });
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

      // Clear hosted room from localStorage since game is starting
      clearHostedRoom();
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

    // Validate connection AND word existence
    if (chain.length > 0) {
      setIsValidating(true);
      const previousWord = chain[chain.length - 1].word;
      const result = await validateConnection(newWord, previousWord);
      setIsValidating(false);

      if (!result.valid) {
        // Use the reason from validation or fallback message
        const message = result.reason || `유효하지 않은 단어예요!`;
        await handleViolation(message);
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

    // Use hardcoded custom domain for production
    const url = `https://game.topikbot.kr/#/battle?game=word-chain&room=${room.room_code}`;

    navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: "🔗 Đã sao chép link!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareRoom = async () => {
    if (!room?.room_code) return;

    const url = `https://game.topikbot.kr/#/battle?game=word-chain&room=${room.room_code}`;
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

  // Creating loader
  if (gamePhase === "creating") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 rounded-full border-4 border-muted border-t-yellow-500 mb-4"
        />
        <p className="text-muted-foreground text-lg">Đang tạo phòng...</p>
      </div>
    );
  }

  // Premium Waiting/Ready Screen (통합 디자인 - 의미연결과 동일)
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
          onCopy={copyRoomUrl}
          onShare={shareRoom}
          gradientFrom="from-yellow-400"
          gradientTo="to-orange-500"
          bgGlow1="bg-yellow-500/10"
          bgGlow2="bg-orange-500/10"
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
              {isHost && <p className="text-xs text-primary mt-1">Tôi</p>}
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
              {room.guest_id ? (
                <>
                  <p className={`text-sm font-medium ${room.guest_ready ? "text-green-500" : "text-muted-foreground"}`}>
                    {room.guest_ready ? "✅ Sẵn sàng" : "⏳ Chờ..."}
                  </p>
                  {!isHost && <p className="text-xs text-primary mt-1">Tôi</p>}
                  {isHost && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={kickGuest}
                      className="mt-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    >
                      강퇴
                    </Button>
                  )}
                </>
              ) : null}
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
                    : "bg-gradient-to-r from-yellow-400 to-orange-500"
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
              <motion.div whileHover={{ scale: bothReady ? 1.02 : 1 }} whileTap={{ scale: bothReady ? 0.98 : 1 }}>
                <Button
                  onClick={startGame}
                  size="lg"
                  disabled={!bothReady}
                  className={`w-full h-14 text-lg font-bold gap-2 ${
                    bothReady
                      ? "bg-gradient-to-r from-green-400 to-emerald-500 hover:opacity-90 shadow-xl shadow-green-500/30"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  }`}
                >
                  <Play className="w-5 h-5" />
                  {bothReady ? "Bắt đầu!" : "Cả hai cần sẵn sàng"}
                </Button>
              </motion.div>
            )}

            {!isHost && bothReady && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang chờ chủ phòng bắt đầu...
              </div>
            )}
          </div>
        )}

        {/* Cancel Button */}
        <Button variant="ghost" onClick={onBack} className="w-full">
          Hủy bỏ
        </Button>
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
                  className="text-9xl font-black bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent"
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

  // Premium Playing Screen
  if (gamePhase === "playing") {
    const opponentName = isHost ? room?.guest_name : room?.host_name;

    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header with Timer */}
        <div className="flex items-center justify-between p-4 bg-card rounded-2xl border border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold">Nối từ 1:1</p>
              <p className="text-xs text-muted-foreground">끝말잇기</p>
            </div>
          </div>
          
          <motion.div
            animate={turnTimeLeft <= 5 && isMyTurn ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.5, repeat: turnTimeLeft <= 5 && isMyTurn ? Infinity : 0 }}
            className={`px-5 py-2.5 rounded-xl font-mono font-black text-2xl ${
              turnTimeLeft <= 5 
                ? "bg-red-500 text-white animate-pulse" 
                : isMyTurn 
                  ? "bg-green-500/20 text-green-500 border border-green-500/50" 
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {turnTimeLeft}s
          </motion.div>
        </div>

        {/* Turn Indicator */}
        <motion.div
          animate={isMyTurn ? { scale: [1, 1.01, 1] } : {}}
          transition={{ duration: 1, repeat: isMyTurn ? Infinity : 0 }}
          className={`text-center py-4 rounded-2xl font-bold text-xl ${
            isMyTurn 
              ? "bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border border-green-500/50" 
              : "bg-muted/50 text-muted-foreground"
          }`}
        >
          {isMyTurn ? "🎯 Lượt của bạn! Hãy nhập từ!" : `⏳ Lượt của ${opponentName}...`}
        </motion.div>

        {/* Players Warnings */}
        <div className="grid grid-cols-3 gap-3 items-center bg-card rounded-2xl p-4 border border-border/50">
          <div className="text-center">
            <p className="font-bold text-sm mb-2">{isHost ? room?.host_name : room?.guest_name}</p>
            <div className="flex items-center justify-center gap-1.5">
              {Array.from({ length: MAX_WARNINGS + 1 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-5 h-5 rounded-full transition-all ${
                    i < myWarnings ? "bg-red-500 shadow-lg shadow-red-500/30" : "bg-muted"
                  }`}
                />
              ))}
            </div>
            {myWarnings > 0 && (
              <p className="text-xs text-red-400 mt-1.5 font-medium">Cảnh báo {myWarnings}</p>
            )}
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">VS</p>
          </div>

          <div className="text-center">
            <p className="font-bold text-sm mb-2 text-muted-foreground">{opponentName}</p>
            <div className="flex items-center justify-center gap-1.5">
              {Array.from({ length: MAX_WARNINGS + 1 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-5 h-5 rounded-full transition-all ${
                    i < opponentWarnings ? "bg-red-500 shadow-lg shadow-red-500/30" : "bg-muted"
                  }`}
                />
              ))}
            </div>
            {opponentWarnings > 0 && (
              <p className="text-xs text-red-400 mt-1.5 font-medium">Cảnh báo {opponentWarnings}</p>
            )}
          </div>
        </div>

        {/* Word Chain Display */}
        <Card className="p-5 bg-gradient-to-br from-card to-muted/30 border-border/50">
          <div className="min-h-[100px] max-h-[180px] overflow-y-auto">
            <div className="flex flex-wrap gap-2 items-center justify-center">
              {chain.map((item, idx) => (
                <motion.div key={idx} initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
                  <div
                    className={`px-4 py-2 rounded-xl font-bold text-base shadow-lg ${
                      item.connectionType === "start"
                        ? "bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-green-500/20"
                        : item.player_id === playerId
                          ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-orange-500/20"
                          : "bg-gradient-to-r from-blue-400 to-cyan-500 text-white shadow-blue-500/20"
                    }`}
                  >
                    {item.word}
                  </div>
                  {idx < chain.length - 1 && <span className="text-xl text-muted-foreground">→</span>}
                </motion.div>
              ))}
              {chain.length > 0 && (
                <motion.div
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="px-4 py-2 rounded-xl border-2 border-dashed border-primary/50 text-primary/50 font-bold"
                >
                  ?
                </motion.div>
              )}
            </div>
          </div>
          {chain.length > 0 && (
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Tiếp theo: bắt đầu bằng '<span className="text-primary font-bold text-lg">{chain[chain.length - 1].word.slice(-1)}</span>'
              </p>
            </div>
          )}
        </Card>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              className="text-center text-red-400 font-bold text-lg py-3 px-4 bg-red-500/10 rounded-xl border border-red-500/30"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Area */}
        <div className="flex gap-3">
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
            className={`text-xl h-14 rounded-xl ${!isMyTurn ? "opacity-50" : ""}`}
            disabled={isValidating || !isMyTurn}
          />
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button 
              onClick={handleSubmit} 
              disabled={!currentInput.trim() || isValidating || !isMyTurn} 
              className="h-14 w-14 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500"
            >
              {isValidating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  // Premium Finished Screen
  if (gamePhase === "finished") {
    const isWinner = room?.winner_id === playerId;
    const opponentName = isHost ? room?.guest_name : room?.host_name;

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
            {/* Trophy/Flame Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200 }}
              className={`w-28 h-28 mx-auto mb-6 rounded-3xl flex items-center justify-center shadow-2xl ${
                isWinner 
                  ? "bg-gradient-to-br from-yellow-400 to-orange-500 shadow-orange-500/30" 
                  : "bg-muted"
              }`}
            >
              {isWinner 
                ? <Trophy className="w-14 h-14 text-white" /> 
                : <Flame className="w-14 h-14 text-muted-foreground" />
              }
            </motion.div>

            <h2 className={`text-4xl font-black mb-3 ${isWinner ? "text-yellow-500" : "text-muted-foreground"}`}>
              {isWinner ? "🎉 Chiến thắng!" : "😢 Thua cuộc"}
            </h2>

            <p className="text-lg text-muted-foreground mb-6">
              {isWinner ? `Bạn đã thắng ${opponentName}!` : `Bạn đã thua ${opponentName}...`}
            </p>

            {isWinner && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="mb-6 inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 rounded-2xl"
              >
                <Trophy className="w-6 h-6 text-yellow-500" />
                <span className="text-2xl font-black text-yellow-500">+1,000 điểm!</span>
              </motion.div>
            )}

            <div className="bg-muted/30 rounded-2xl p-5 mb-8 border border-border/50">
              <p className="text-sm text-muted-foreground mb-2">Tổng số từ đã nối</p>
              <p className="text-5xl font-black text-primary">{chain.length} từ</p>
            </div>

            <div className="flex gap-4 justify-center">
              <Button onClick={onBack} variant="outline" size="lg" className="h-14 px-6 gap-2 text-lg">
                <ArrowLeft className="w-5 h-5" />
                Thoát
              </Button>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={() => {
                    setGamePhase("menu");
                    setRoom(null);
                    setChain([]);
                    setMoves([]);
                    setError(null);
                  }}
                  size="lg"
                  className="h-14 px-6 gap-2 text-lg bg-gradient-to-r from-yellow-400 to-orange-500"
                >
                  <RefreshCw className="w-5 h-5" />
                  Chơi lại
                </Button>
              </motion.div>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  return null;
}
