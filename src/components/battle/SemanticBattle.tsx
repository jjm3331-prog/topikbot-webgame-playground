import { useState, useEffect, useCallback, useRef } from "react";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Play,
  Trophy,
  Sparkles,
  Send,
  Loader2,
  Users,
  Check,
  ArrowLeft,
  Crown,
  Timer,
  AlertTriangle,
  Search,
  Swords,
  Zap,
  Wand2,
} from "lucide-react";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
// RoomCodeCollapsible removed - using waiting list only
import { saveHostedRoom, clearHostedRoom } from "@/components/battle/GuestJoinedNotification";
import { saveGameRecord, type StreakBonus } from "@/lib/gameRecords";

interface SemanticBattleProps {
  onBack: () => void;
  initialRoomCode?: string;
  initialGuestName?: string;
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

const TURN_TIME_LIMIT = 20;
const MAX_WARNINGS = 1;
const PASS_SCORE = 70;

export default function SemanticBattle({ onBack, initialRoomCode, initialGuestName }: SemanticBattleProps) {
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [gamePhase, setGamePhase] = useState<GamePhase>("menu");
  const gamePhaseRef = useRef<GamePhase>("menu");
  const [room, setRoom] = useState<Room | null>(null);

  // Use authenticated user id for stable multiplayer identity (prevents turn/host mismatch on refresh)
  const [playerId, setPlayerId] = useState<string>("");
  const playerIdRef = useRef<string>("");
  const [authReady, setAuthReady] = useState(false);

  const [playerName, setPlayerName] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState(initialRoomCode || "");
  const [copied, setCopied] = useState(false);
  const guestJoinNotifiedRef = useRef(false);
  const autoStartTriggeredRef = useRef(false);

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
  const [streakBonus, setStreakBonus] = useState<StreakBonus | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    gamePhaseRef.current = gamePhase;
  }, [gamePhase]);

  useEffect(() => {
    playerIdRef.current = playerId;
  }, [playerId]);

  useEffect(() => {
    const initAuthIdentity = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const uid = session?.user?.id;
        if (uid) {
          setPlayerId(uid);
          playerIdRef.current = uid;
        }
      } finally {
        setAuthReady(true);
      }
    };

    void initAuthIdentity();
  }, []);

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
      toast({
        title: t("battle.semanticGame.winToastTitle"),
        description: t("battle.semanticGame.winToastDesc"),
      });
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

  // Prefill invite room code and allow user to set nickname before joining
  useEffect(() => {
    if (!authReady) return;
    if (!initialRoomCode || initialRoomCode.length !== 6) return;

    // If user came from waiting room list/invite, prefill name and code but DON'T auto-join.
    if (gamePhase === "menu") {
      if (initialGuestName && initialGuestName.trim()) {
        setPlayerName(initialGuestName.trim().slice(0, 20));
      }
      setRoomCodeInput(initialRoomCode.toUpperCase());
      setGamePhase("joining");
    }
  }, [authReady, initialRoomCode, initialGuestName, gamePhase]);

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

      // 대기/준비 화면에서 다른 페이지로 이동해도 방은 유지 (유저 요구사항)
      // 방 정리는 WaitingRoomsList의 시간 기반 정리(예: 24시간)로 처리
      if (amHost && (phase === "waiting" || phase === "ready")) {
        console.log(`[SemanticBattle] Host left waiting/ready (${reason}) - keep room:`, currentRoom.id);
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
          console.log(`[SemanticBattle] Player left during game (${reason}) - opponent wins:`, winnerId);
        } catch (err) {
          console.error("Failed to set winner on leave:", err);
        }
      }
    };

    const handleBeforeUnload = () => {
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
      toast({ title: t("battle.guestKicked") });
    } catch (err) {
      console.error("Failed to kick guest:", err);
    }
  };

  const createRoom = async () => {
    if (!authReady || !playerIdRef.current) {
      toast({ title: t("battle.loginRequired"), variant: "destructive" });
      return;
    }
    if (!playerName.trim()) {
      toast({ title: t("battle.semanticGame.enterName"), variant: "destructive" });
      return;
    }

    setGamePhase("creating");
    const roomCode = generateRoomCode();

    try {
      const { data, error } = await supabase
        .from("chain_reaction_rooms")
        .insert({
          room_code: roomCode,
          host_id: playerIdRef.current,
          host_name: playerName.trim(),
          connection_mode: "semantic",
          status: "waiting",
          host_ready: true,
          guest_ready: false,
          host_score: 0,
          guest_score: 0,
          host_warnings: 0,
          guest_warnings: 0,
        })
        .select()
        .single();

      if (error) throw error;
      setRoom(data as Room);
      setGamePhase("waiting");
      subscribeToRoom(data.id);
      // Save to localStorage for guest-joined notification
      saveHostedRoom(data.id, playerIdRef.current);
    } catch (err) {
      toast({ title: t("battle.semanticGame.createFailed"), variant: "destructive" });
      setGamePhase("menu");
    }
  };

  const joinRoom = async () => {
    if (!authReady || !playerIdRef.current) {
      toast({ title: t("battle.loginRequired"), variant: "destructive" });
      return;
    }
    if (!playerName.trim() || !roomCodeInput.trim()) {
      toast({ title: t("battle.semanticGame.enterNameAndCode"), variant: "destructive" });
      return;
    }

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
      if (!roomData) {
        toast({ title: t("battle.roomNotExists"), variant: "destructive" });
        setGamePhase("menu");
        return;
      }
      if (roomData.status === "playing" || roomData.status === "finished") {
        toast({ title: t("battle.roomStartedOrFinished"), variant: "destructive" });
        setGamePhase("menu");
        return;
      }
      if (roomData.guest_id) {
        toast({ title: t("battle.roomFull"), variant: "destructive" });
        setGamePhase("menu");
        return;
      }

      const { data, error } = await supabase
        .from("chain_reaction_rooms")
        .update({ guest_id: playerIdRef.current, guest_name: playerName.trim(), guest_ready: true })
        .eq("id", roomData.id)
        .select()
        .single();

      if (error) throw error;
      setRoom(data as Room);
      setGamePhase("ready");
      subscribeToRoom(data.id);
    } catch (err) {
      toast({ title: t("battle.semanticGame.joinFailed"), variant: "destructive" });
      setGamePhase("menu");
    }
  };

  const subscribeToRoom = (roomId: string) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const channel = supabase
      .channel(`semantic-room-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chain_reaction_rooms", filter: `id=eq.${roomId}` },
        async (payload) => {
          const newRoom = payload.new as Room;
          setRoom(newRoom);
          const phase = gamePhaseRef.current;
          const me = playerIdRef.current;
          const amHost = newRoom.host_id === me;

          // Host: guest joined → notify + auto-ready + auto-start
          if (amHost && newRoom.guest_id) {
            if (!guestJoinNotifiedRef.current) {
              guestJoinNotifiedRef.current = true;
              playBeep(784, 120, "sine");
              vibrate([80, 40, 120]);
              toast({
                title: t("battle.guestJoinedTitle"),
                description: newRoom.guest_name ? t("battle.guestJoinedDesc", { name: newRoom.guest_name }) : undefined,
                duration: 6000,
              });
            }

            if (newRoom.status === "waiting" && (!newRoom.host_ready || !newRoom.guest_ready)) {
              void supabase
                .from("chain_reaction_rooms")
                .update({
                  host_ready: true,
                  guest_ready: !!newRoom.guest_id,
                })
                .eq("id", newRoom.id);
            }

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
            const isWinner = newRoom.winner_id === me;
            const myScore = amHost ? (newRoom.host_score || 0) : (newRoom.guest_score || 0);
            const opponentScore = amHost ? (newRoom.guest_score || 0) : (newRoom.host_score || 0);

            // Save game record
            const recordResult = await saveGameRecord({
              gameType: "semantic_battle",
              result: isWinner ? "win" : "lose",
              myScore,
              opponentScore,
              opponentName: amHost ? newRoom.guest_name || undefined : newRoom.host_name,
              roomId: newRoom.id,
            });

            if (isWinner) {
              playWinSound();
              confetti({ particleCount: 150, spread: 100 });
              awardWinnerPoints();
              
              // Show streak bonus if applicable
              if (recordResult.streakBonus) {
                setStreakBonus(recordResult.streakBonus);
              }
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
    const amHost = room.host_id === playerId;
    const field = amHost ? "host_ready" : "guest_ready";
    const currentValue = amHost ? room.host_ready : room.guest_ready;
    try {
      await supabase.from("chain_reaction_rooms").update({ [field]: !currentValue }).eq("id", room.id);
      if (!currentValue) playReadyFeedback();
    } catch (err) {}
  };

  const startGame = async () => {
    const me = playerIdRef.current;
    if (!room || room.host_id !== me || !room.host_ready || !room.guest_ready) return;

    const startWords = ["행복", "사랑", "음악", "여행", "학교", "친구", "음식", "영화"];
    const startWord = startWords[Math.floor(Math.random() * startWords.length)];

    try {
      await supabase.from("chain_reaction_moves").insert({
        room_id: room.id,
        // Use host id for the seed word to satisfy RLS (still displayed as system via player_name)
        player_id: room.host_id,
        player_name: t("battle.semanticGame.system"),
        word: startWord,
        connection_mode: "semantic",
        chain_length: 1,
        score_delta: 0,
      });

      await supabase
        .from("chain_reaction_rooms")
        .update({
          status: "playing",
          started_at: new Date().toISOString(),
          current_turn_player_id: room.host_id,
          turn_start_at: new Date().toISOString(),
          host_warnings: 0,
          guest_warnings: 0,
        })
        .eq("id", room.id);

      // Clear hosted room from localStorage since game is starting
      clearHostedRoom();
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

  // Turn timer (sync using turn_start_at so both clients see the same countdown)
  const timeoutHandledForTurnRef = useRef<string | null>(null);

  useEffect(() => {
    if (gamePhase !== "playing" || !room) return;

    if (turnTimerRef.current) clearInterval(turnTimerRef.current);

    // Reset per-turn guard when a new turn starts
    timeoutHandledForTurnRef.current = room.turn_start_at || null;

    const tick = () => {
      const turnStart = room.turn_start_at ? new Date(room.turn_start_at).getTime() : Date.now();
      const elapsedSec = Math.floor((Date.now() - turnStart) / 1000);
      const remaining = Math.max(0, TURN_TIME_LIMIT - elapsedSec);

      setTurnTimeLeft(remaining);

      const me = playerIdRef.current;
      const myTurn = room.current_turn_player_id === me;

      if (remaining <= 0 && myTurn && timeoutHandledForTurnRef.current === room.turn_start_at) {
        // Ensure we only process timeout once per turn
        timeoutHandledForTurnRef.current = `handled:${room.turn_start_at}`;
        void handleTimeOut();
      }
    };

    tick();
    turnTimerRef.current = setInterval(tick, 500);

    return () => {
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
    };
  }, [gamePhase, room?.current_turn_player_id, room?.turn_start_at, room?.id]);

  const handleTimeOut = async () => {
    if (!room || !isMyTurn) return;

    const warningField = isHost ? "host_warnings" : "guest_warnings";
    const currentWarnings = (isHost ? room.host_warnings : room.guest_warnings) || 0;
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
      toast({
        title: t("battle.semanticGame.warningToastTitle", { current: newWarnings, max: MAX_WARNINGS + 1 }),
        description: t("battle.semanticGame.timeoutDesc"),
      });
      const nextTurn = isHost ? room.guest_id : room.host_id;
      await supabase.from("chain_reaction_rooms").update({
        [warningField]: newWarnings,
        current_turn_player_id: nextTurn,
        turn_start_at: new Date().toISOString(),
      }).eq("id", room.id);
    }
  };

  const wordSchema = z
    .string()
    .trim()
    .min(1)
    .max(20)
    .refine((v) => !/\s{2,}/.test(v), "invalid");

  const ensureLastWord = useCallback(async (): Promise<string | null> => {
    if (lastWord) return lastWord;

    try {
      const { data, error } = await supabase
        .from("chain_reaction_moves")
        .select("*")
        .eq("room_id", roomRef.current?.id || "")
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      const latest = data?.[0] as MoveRow | undefined;
      if (!latest?.word) return null;

      // hydrate local state so UI becomes consistent
      if (!moveIdsRef.current.has(latest.id)) {
        moveIdsRef.current.add(latest.id);
        setMoves((prev) => (prev.length ? prev : [latest]));
        setUsedWords((prev) => (prev.length ? prev : [latest.word]));
      }

      return latest.word;
    } catch (e) {
      console.error("[SemanticBattle] ensureLastWord failed", e);
      return null;
    }
  }, [lastWord]);

  const handleSubmitWord = async () => {
    if (!room || !isMyTurn || !currentInput.trim() || isValidating) return;

    const parsed = wordSchema.safeParse(currentInput);
    if (!parsed.success) {
      toast({ title: t("battle.semanticGame.validatingError"), variant: "destructive" });
      return;
    }

    const word = parsed.data;

    // lastWord can be temporarily missing due to realtime timing; ensure it before validating.
    const prev = await ensureLastWord();
    if (!prev) {
      toast({ title: t("battle.semanticGame.waitOpponent"), description: t("battle.semanticGame.currentWord") });
      return;
    }

    console.log("[SemanticBattle] submit", { roomId: room.id, prev, word, isMyTurn });

    setIsValidating(true);
    setLastValidation(null);

    try {
      const { data, error } = await supabase.functions.invoke("semantic-validate", {
        body: { previousWord: prev, newWord: word, usedWords },
      });

      if (error) throw error;

      const result = data as any;
      setLastValidation({ score: result?.score ?? 0, reason_ko: result?.reason_ko ?? "", reason_vi: result?.reason_vi ?? "" });

      if (result.valid) {
        // Success - insert move and switch turn
        const { data: insertedMove, error: insertErr } = await supabase
          .from("chain_reaction_moves")
          .insert({
            room_id: room.id,
            player_id: playerIdRef.current,
            player_name: playerName,
            word: word,
            connection_mode: "semantic",
            chain_length: (moves?.length || 0) + 1,
            score_delta: result.score,
          })
          .select("*")
          .single();

        if (insertErr) throw insertErr;

        if (insertedMove && !moveIdsRef.current.has(insertedMove.id)) {
          moveIdsRef.current.add(insertedMove.id);
          setMoves((prevMoves) => [...prevMoves, insertedMove as MoveRow]);
          setUsedWords((prevWords) => [...prevWords, (insertedMove as MoveRow).word]);
        }

        const scoreField = isHost ? "host_score" : "guest_score";
        const currentScore = (isHost ? room.host_score : room.guest_score) || 0;
        const nextTurn = isHost ? room.guest_id : room.host_id;

        await supabase
          .from("chain_reaction_rooms")
          .update({
            [scoreField]: currentScore + result.score,
            current_turn_player_id: nextTurn,
            turn_start_at: new Date().toISOString(),
          })
          .eq("id", room.id);

        setCurrentInput("");
        playBeep(660, 100);
      } else {
        // Failed - give warning
        const warningField = isHost ? "host_warnings" : "guest_warnings";
        const currentWarnings = (isHost ? room.host_warnings : room.guest_warnings) || 0;
        const newWarnings = currentWarnings + 1;

        playWarnBeep();

        if (newWarnings > MAX_WARNINGS) {
          const winnerId = isHost ? room.guest_id : room.host_id;
          await supabase
            .from("chain_reaction_rooms")
            .update({
              status: "finished",
              winner_id: winnerId,
              finished_at: new Date().toISOString(),
            })
            .eq("id", room.id);
        } else {
          const msg = i18n.language === "vi" ? result.reason_vi : result.reason_ko;
          toast({
            title: t("battle.semanticGame.warningToastTitle", { current: newWarnings, max: MAX_WARNINGS + 1 }),
            description: msg,
          });
          const nextTurn = isHost ? room.guest_id : room.host_id;
          await supabase
            .from("chain_reaction_rooms")
            .update({
              [warningField]: newWarnings,
              current_turn_player_id: nextTurn,
              turn_start_at: new Date().toISOString(),
            })
            .eq("id", room.id);
        }
        setCurrentInput("");
      }
    } catch (err) {
      console.error("[SemanticBattle] submit failed", err);
      toast({ title: t("battle.semanticGame.validatingError"), variant: "destructive" });
    } finally {
      setIsValidating(false);
    }
  };

  // Invite link functions removed - using waiting list only

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
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <Search className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
              </div>
              <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 bg-clip-text text-transparent">
                {t("battle.semantic")}
              </span>
            </h1>
            <p className="text-muted-foreground mt-1">{t("battle.semanticKo")}</p>
          </div>
        </div>

        {/* Game Rules Card */}
        <Card className="p-6 sm:p-8 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-rose-500/5 border-amber-500/20">
          <h2 className="text-xl sm:text-2xl font-bold mb-6 flex items-center gap-3">
            <span className="text-2xl sm:text-3xl">🔮</span>
            <span>{t("battle.howToPlay")}</span>
            <span className="text-muted-foreground font-normal">/ {t("battle.rules")}</span>
          </h2>

          {/* Game Overview */}
          <div className="mb-6 p-5 rounded-xl bg-background/80 border border-amber-500/20">
            <p className="text-base sm:text-lg leading-relaxed">
              {t("battle.semanticGame.overview")}
              <br />
              <span className="text-muted-foreground">{t("battle.semanticGame.overviewExample")}</span>
            </p>
          </div>

          {/* Rules Grid */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-center gap-3 mb-2">
                  <Wand2 className="w-6 h-6 text-amber-400" />
                  <span className="font-bold text-lg text-amber-400">{t("battle.semanticGame.aiScoringTitle")}</span>
                </div>
                <p className="text-muted-foreground">{t("battle.semanticGame.aiScoringDesc")}</p>
              </div>

              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                <div className="flex items-center gap-3 mb-2">
                  <Timer className="w-6 h-6 text-blue-400" />
                  <span className="font-bold text-lg text-blue-400">{t("battle.secondsPerTurn")}</span>
                </div>
                <p className="text-muted-foreground">{t("battle.semanticGame.timerDesc")}</p>
              </div>

              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                  <span className="font-bold text-lg text-red-400">{t("battle.warnings")}</span>
                </div>
                <p className="text-muted-foreground">{t("battle.semanticGame.warningsDesc")}</p>
              </div>

              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30">
                <div className="flex items-center gap-3 mb-2">
                  <Sparkles className="w-6 h-6 text-rose-400" />
                  <span className="font-bold text-lg text-rose-400">{t("battle.semanticGame.rewardTitle")}</span>
                </div>
                <p className="text-muted-foreground">{t("battle.semanticGame.rewardDesc")}</p>
              </div>
            </div>

          {/* Examples */}
          <div className="mt-6 p-4 rounded-xl bg-background/50 border border-muted">
            <p className="font-semibold mb-3 flex items-center gap-2">
              <span className="text-xl">🔍</span>
              {t("battle.semanticGame.relatedExamplesTitle")}
            </p>
            <div className="flex flex-wrap gap-3">
              <span className="px-4 py-2 bg-amber-500/20 rounded-lg text-amber-300 font-medium">커피 → 카페 ✨</span>
              <span className="px-4 py-2 bg-orange-500/20 rounded-lg text-orange-300 font-medium">겨울 → 눈 ❄️</span>
              <span className="px-4 py-2 bg-rose-500/20 rounded-lg text-rose-300 font-medium">음악 → 노래 🎵</span>
              <span className="px-4 py-2 bg-violet-500/20 rounded-lg text-violet-300 font-medium">병원 → 의사 🏥</span>
            </div>
          </div>
        </Card>

        {/* Action Section */}
        <Card className="p-6 sm:p-8">
            <div className="space-y-5">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">{t("battle.semanticGame.yourNameLabel")}</label>
                <Input
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder={t("battle.semanticGame.yourNamePlaceholder")}
                  className="text-lg h-12"
                  maxLength={20}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={createRoom}
                    className="w-full h-16 text-lg font-bold gap-3 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:opacity-90 text-primary-foreground shadow-lg shadow-orange-500/30"
                    disabled={!playerName.trim()}
                  >
                    <Search className="w-6 h-6" />
                    {t("battle.semanticGame.createRoom")}
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
                    {t("battle.semanticGame.join")}
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
            <h2 className="text-xl font-bold">{t("battle.semanticGame.joinRoomTitle")}</h2>
          </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">{t("battle.semanticGame.yourNameLabel")}</label>
                <Input
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder={t("battle.semanticGame.yourNamePlaceholder")}
                  className="text-lg h-12"
                  maxLength={20}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">{t("battle.semanticGame.roomCodeLabel")}</label>
                <Input
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  placeholder={t("battle.semanticGame.roomCodePlaceholder")}
                  className="text-center text-2xl tracking-widest h-14 font-mono"
                  maxLength={6}
                />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setGamePhase("menu")} className="flex-1 h-12">
                  {t("battle.semanticGame.cancel")}
                </Button>
                <Button
                  onClick={joinRoom}
                  disabled={roomCodeInput.length !== 6 || !playerName.trim()}
                  className="flex-1 h-12 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500"
                >
                  <Users className="w-5 h-5 mr-2" />
                  {t("battle.semanticGame.join")}
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
        <p className="text-muted-foreground text-lg">{t("battle.semanticGame.creatingRoom")}</p>
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
          <h2 className="text-xl font-bold">{t("battle.semanticGame.waitingRoom")}</h2>
        </div>

        {/* Waiting for opponent - simplified UI */}
        {!room.guest_id && (
          <Card className="p-6 bg-gradient-to-br from-amber-500/10 to-rose-500/10 border-amber-500/20">
            <div className="flex items-center justify-center gap-3 mb-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 rounded-full border-2 border-muted border-t-amber-500"
              />
              <p className="text-lg font-semibold">{t("battle.waitingForOpponent")}</p>
            </div>
            <p className="text-sm text-muted-foreground text-center">{t("battle.waitingDesc")}</p>
          </Card>
        )}

        {/* Players Status */}
          <Card className="p-5 bg-gradient-to-br from-card to-muted/30 border-border/50">
            <p className="text-xs text-muted-foreground mb-4 uppercase tracking-wider text-center">{t("battle.semanticGame.players")}</p>
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
                {room.host_ready ? t("battle.semanticGame.ready") : t("battle.semanticGame.waiting")}
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
              <p className="font-bold text-lg">{room.guest_name || t("battle.semanticGame.waiting")}</p>
              {room.guest_id && (
                <p className={`text-sm font-medium ${room.guest_ready ? "text-green-500" : "text-muted-foreground"}`}>
                  {room.guest_ready ? t("battle.semanticGame.ready") : t("battle.semanticGame.waiting")}
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
                    {t("battle.semanticGame.readyDone")}
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    {t("battle.semanticGame.readyToggle")}
                  </>
                )}
              </Button>
            </motion.div>
            
            {isHost && room.guest_id && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={kickGuest}
                className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
              >
                {t("battle.kickGuest")}
              </Button>
            )}
            
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
                  {bothReady ? t("battle.semanticGame.start") : t("battle.semanticGame.bothReadyNeeded")}
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
                  {t("battle.semanticGame.countdownStart")} 🧠
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Search className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold">{t("battle.semantic")}</p>
              <p className="text-xs text-muted-foreground">{t("battle.semanticKo")}</p>
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
            <p className="text-3xl font-black">{room.host_score} <span className="text-sm font-normal text-muted-foreground">{t("battle.semanticGame.pointsUnit")}</span></p>
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
            <p className="text-3xl font-black">{room.guest_score} <span className="text-sm font-normal text-muted-foreground">{t("battle.semanticGame.pointsUnit")}</span></p>
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
            {moves.map((move) => (
              <motion.span
                key={move.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`px-4 py-2 rounded-xl text-sm font-bold shadow-lg ${
                  move.player_id === "system" || move.player_name === "시스템"
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
              <p className="font-bold text-lg mb-1">{t("battle.semanticGame.scoreLabel")}: {lastValidation.score}/100 {lastValidation.score >= PASS_SCORE ? "✅" : "❌"}</p>
              <p>{i18n.language === "ko" ? lastValidation.reason_ko : lastValidation.reason_vi}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <div className="flex gap-3">
          <Input
            ref={inputRef}
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleSubmitWord();
              }
            }}
            placeholder={
              isMyTurn
                ? lastWord
                  ? t("battle.semanticGame.inputPlaceholder")
                  : t("battle.semanticGame.currentWord")
                : t("battle.semanticGame.waitTurn")
            }
            disabled={!isMyTurn || isValidating || !lastWord}
            className="flex-1 h-14 text-xl rounded-xl"
          />
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={() => void handleSubmitWord()}
              disabled={!isMyTurn || !currentInput.trim() || isValidating || !lastWord}
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
            {t("battle.semanticGame.waitOpponent")}
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
              {isWinner ? t("battle.semanticGame.victory") : t("battle.semanticGame.defeat")}
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              {isWinner ? t("battle.semanticGame.victoryDesc") : t("battle.semanticGame.defeatDesc", { name: winnerName })}
            </p>

            {/* Streak Bonus */}
            {isWinner && streakBonus && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mb-6 inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/50 rounded-2xl"
              >
                <Zap className="w-6 h-6 text-red-500" />
                <span className="text-xl font-black text-red-500">
                  🔥 {streakBonus.streakCount}{t("battle.streakWins")} +{streakBonus.bonusPoints.toLocaleString()}{t("battle.points")}
                </span>
                {streakBonus.isNewRecord && (
                  <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                    {t("battle.newRecord")}
                  </span>
                )}
              </motion.div>
            )}

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
                {t("common.back")}
              </Button>
            </motion.div>
          </div>
        </Card>
      </motion.div>
    );
  }

  return null;
}
