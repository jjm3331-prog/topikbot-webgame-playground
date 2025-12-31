import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Play,
  Trophy,
  Sparkles,
  Loader2,
  Users,
  Check,
  ArrowLeft,
  Crown,
  Timer,
  Zap,
  BookOpen,
  Target,
  X,
} from "lucide-react";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { saveHostedRoom, clearHostedRoom } from "@/components/battle/GuestJoinedNotification";
import { saveGameRecord, type StreakBonus } from "@/lib/gameRecords";

interface SpeedQuizBattleProps {
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
  host_ready: boolean;
  guest_ready: boolean;
  winner_id: string | null;
  started_at: string | null;
  finished_at: string | null;
}

interface QuizQuestion {
  id: string;
  type: "vocabulary" | "grammar" | "expression";
  question: string;
  options: string[];
  correctIndex: number;
  explanation_ko: string;
  difficulty: "easy" | "medium" | "hard";
}

type GamePhase = "menu" | "creating" | "joining" | "waiting" | "ready" | "countdown" | "playing" | "finished";

const QUESTION_TIME_LIMIT = 10;
const TOTAL_QUESTIONS = 10;
const POINTS_PER_CORRECT = 10;
const SPEED_BONUS_THRESHOLD = 5;

export default function SpeedQuizBattle({ onBack, initialRoomCode, initialGuestName }: SpeedQuizBattleProps) {
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [gamePhase, setGamePhase] = useState<GamePhase>("menu");
  const gamePhaseRef = useRef<GamePhase>("menu");
  const [room, setRoom] = useState<Room | null>(null);

  const [playerId, setPlayerId] = useState<string>("");
  const playerIdRef = useRef<string>("");
  const [authReady, setAuthReady] = useState(false);

  const [playerName, setPlayerName] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState(initialRoomCode || "");
  const guestJoinNotifiedRef = useRef(false);
  const autoStartTriggeredRef = useRef(false);

  // Quiz state (synced via DB realtime)
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [usedQuestionIds, setUsedQuestionIds] = useState<string[]>([]);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [opponentAnswered, setOpponentAnswered] = useState(false);

  const [countdown, setCountdown] = useState(3);
  const [streakBonus, setStreakBonus] = useState<StreakBonus | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);
  const questionsChannelRef = useRef<any>(null);
  const answersChannelRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const advanceTriggeredForQuestionRef = useRef<number>(0);
  const myAnswerSubmittedRef = useRef(false);

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

  const playCorrectSound = () => { playBeep(880, 100, "sine"); vibrate(50); };
  const playWrongSound = () => { playBeep(300, 200, "sawtooth"); vibrate([50, 50]); };
  const playCountdownBeep = (num: number) => {
    if (num > 0) { playBeep(600, 100, "square"); vibrate(30); }
    else { playBeep(880, 200, "sawtooth"); vibrate([50, 50, 100]); }
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

  const awardWinnerPoints = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      const { data: profile } = await supabase.from("profiles").select("points").eq("id", session.user.id).maybeSingle();
      const currentPoints = profile?.points || 0;
      await supabase.from("profiles").update({ points: currentPoints + 1000 }).eq("id", session.user.id);
      toast({ title: "🎉 승리 보너스!", description: "+1000 포인트 획득!" });
    } catch (err) {}
  };

  const generateRoomCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 6 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
  };

  useEffect(() => {
    if (!authReady) return;
    if (!initialRoomCode || initialRoomCode.length !== 6) return;
    if (!initialGuestName || !initialGuestName.trim()) return;

    // Guest flow (waiting list join): auto-join without showing room code UI
    if (gamePhase === "menu") {
      setPlayerName(initialGuestName.trim().slice(0, 20));
      setRoomCodeInput(initialRoomCode.toUpperCase());
      setGamePhase("joining");
      setTimeout(() => void joinRoom(initialRoomCode.toUpperCase(), initialGuestName.trim().slice(0, 20)), 0);
    }
  }, [authReady, initialRoomCode, initialGuestName, gamePhase]);

  const roomRef = useRef<Room | null>(null);
  const isHostRef = useRef(false);
  const gamePhaseOnLeaveRef = useRef<GamePhase>("menu");

  useEffect(() => {
    roomRef.current = room;
    isHostRef.current = isHost;
    gamePhaseOnLeaveRef.current = gamePhase;
  }, [room, isHost, gamePhase]);

  useEffect(() => {
    const handleLeave = async () => {
      const currentRoom = roomRef.current;
      const amHost = isHostRef.current;
      const phase = gamePhaseOnLeaveRef.current;
      if (!currentRoom) return;

      if (phase === "playing") {
        try {
          const winnerId = amHost ? currentRoom.guest_id : currentRoom.host_id;
          await supabase
            .from("chain_reaction_rooms")
            .update({ status: "finished", winner_id: winnerId, finished_at: new Date().toISOString() })
            .eq("id", currentRoom.id);
        } catch (err) {}
      }
    };

    const handleBeforeUnload = () => void handleLeave();
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      void handleLeave();
    };
  }, []);

  const createRoom = async () => {
    if (!authReady || !playerIdRef.current) {
      toast({ title: t("battle.loginRequired"), variant: "destructive" });
      return;
    }
    if (!playerName.trim()) {
      toast({ title: "닉네임을 입력해주세요", variant: "destructive" });
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
          connection_mode: "speed_quiz",
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
      saveHostedRoom(data.id, playerIdRef.current);
    } catch (err) {
      toast({ title: "방 생성 실패", variant: "destructive" });
      setGamePhase("menu");
    }
  };

  const joinRoom = async (roomCode?: string, guestName?: string) => {
    if (!authReady || !playerIdRef.current) {
      toast({ title: t("battle.loginRequired"), variant: "destructive" });
      return;
    }

    const name = (guestName ?? playerName).trim();
    const code = (roomCode ?? roomCodeInput).trim().toUpperCase();

    if (!name || code.length !== 6) {
      toast({ title: t("battle.roomNotAvailable"), variant: "destructive" });
      setGamePhase("menu");
      return;
    }

    setGamePhase("joining");

    try {
      const { data: roomData, error: findError } = await supabase
        .from("chain_reaction_rooms")
        .select()
        .eq("room_code", code)
        .eq("connection_mode", "speed_quiz")
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
        .update({ guest_id: playerIdRef.current, guest_name: name, guest_ready: true })
        .eq("id", roomData.id)
        .select()
        .single();

      if (error) throw error;
      setRoom(data as Room);
      setGamePhase("ready");
      subscribeToRoom(data.id);
    } catch (err) {
      toast({ title: "입장 실패", variant: "destructive" });
      setGamePhase("menu");
    }
  };

  // Subscribe to room, questions, and answers
  const subscribeToRoom = (roomId: string) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    if (questionsChannelRef.current) supabase.removeChannel(questionsChannelRef.current);
    if (answersChannelRef.current) supabase.removeChannel(answersChannelRef.current);

    // Room subscription
    const channel = supabase
      .channel(`speed-quiz-room-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chain_reaction_rooms", filter: `id=eq.${roomId}` },
        async (payload) => {
          const newRoom = payload.new as Room;
          setRoom(newRoom);
          const phase = gamePhaseRef.current;
          const me = playerIdRef.current;
          const amHost = newRoom.host_id === me;

          // Update scores
          if (amHost) {
            setMyScore(newRoom.host_score || 0);
            setOpponentScore(newRoom.guest_score || 0);
          } else {
            setMyScore(newRoom.guest_score || 0);
            setOpponentScore(newRoom.host_score || 0);
          }

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

            if (newRoom.status === "waiting" && newRoom.host_ready && newRoom.guest_ready && !autoStartTriggeredRef.current) {
              autoStartTriggeredRef.current = true;
              setTimeout(() => void startGame(newRoom), 200);
            }
          }

          if (newRoom.guest_id && (phase === "waiting" || phase === "creating" || phase === "joining")) {
            setGamePhase("ready");
          }
          if (newRoom.status === "playing" && phase !== "playing" && phase !== "countdown") {
            startCountdown(roomId, newRoom.started_at);
          }
          if (newRoom.status === "finished" && phase !== "finished") {
            if (timerRef.current) clearInterval(timerRef.current);
            setGamePhase("finished");
            const isWinner = newRoom.winner_id === me;
            const myFinalScore = amHost ? (newRoom.host_score || 0) : (newRoom.guest_score || 0);
            const opponentFinalScore = amHost ? (newRoom.guest_score || 0) : (newRoom.host_score || 0);

            const recordResult = await saveGameRecord({
              gameType: "speed_quiz_battle",
              result: isWinner ? "win" : newRoom.winner_id ? "lose" : "draw",
              myScore: myFinalScore,
              opponentScore: opponentFinalScore,
              opponentName: amHost ? newRoom.guest_name || undefined : newRoom.host_name,
              roomId: newRoom.id,
            });

            if (isWinner) {
              playWinSound();
              confetti({ particleCount: 150, spread: 100 });
              awardWinnerPoints();
              if (recordResult.streakBonus) setStreakBonus(recordResult.streakBonus);
            } else if (newRoom.winner_id) {
              playLoseSound();
            }
          }
        }
      )
      .subscribe();
    channelRef.current = channel;

    // Questions subscription (both players receive same questions)
    const qChannel = supabase
      .channel(`speed-quiz-questions-${roomId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "speed_quiz_room_questions", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const row = payload.new as any;
          console.log("[SpeedQuiz] New question received:", row.question_number);
          const q = row.question as QuizQuestion;
          setCurrentQuestion(q);
          setQuestionNumber(row.question_number);
          setUsedQuestionIds(prev => [...prev, q.id]);
          setSelectedAnswer(null);
          setShowResult(false);
          setLastAnswerCorrect(null);
          setOpponentAnswered(false);
          myAnswerSubmittedRef.current = false;
          setTimeLeft(QUESTION_TIME_LIMIT);
          setIsLoading(false);
          startQuestionTimer(roomId, row.question_number);
        }
      )
      .subscribe();
    questionsChannelRef.current = qChannel;

    // Answers subscription (track opponent's answer)
    const aChannel = supabase
      .channel(`speed-quiz-answers-${roomId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "speed_quiz_room_answers", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const ans = payload.new as any;
          const me = playerIdRef.current;
          if (ans.user_id !== me) {
            setOpponentAnswered(true);
          }
        }
      )
      .subscribe();
    answersChannelRef.current = aChannel;
  };

  const startGame = async (roomToStart?: Room) => {
    const me = playerIdRef.current;
    const r = roomToStart ?? roomRef.current;
    if (!r || r.host_id !== me) return;

    try {
      // Schedule a synchronized start time (3s countdown) so host/guest start together.
      const scheduledStartAt = new Date(Date.now() + 3200).toISOString();

      const { error } = await supabase
        .from("chain_reaction_rooms")
        .update({
          status: "playing",
          started_at: scheduledStartAt,
          host_score: 0,
          guest_score: 0,
        })
        .eq("id", r.id);
      if (error) throw error;
      clearHostedRoom();
    } catch (err) {
      console.error("[SpeedQuiz] Failed to start game:", err);
      toast({ title: t("battle.roomNotAvailable"), variant: "destructive" });
    }
  };

  const startCountdown = (roomId: string, startedAt?: string | null) => {
    setGamePhase("countdown");

    const targetMs = startedAt ? new Date(startedAt).getTime() : Date.now() + 3000;
    let lastShown: number | null = null;

    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    const tick = () => {
      const remainingMs = targetMs - Date.now();
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

      if (lastShown !== remainingSec) {
        lastShown = remainingSec;
        setCountdown(remainingSec);
        playCountdownBeep(remainingSec);
      }

      if (remainingSec <= 0) {
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;

        setGamePhase("playing");

        // Host publishes first question
        if (isHostRef.current) {
          publishNextQuestion(roomId, 1);
        } else {
          setIsLoading(true);
        }
      }
    };

    tick();
    countdownTimerRef.current = setInterval(tick, 150);
  };

  // Host generates & publishes question to DB
  const publishNextQuestion = async (roomId: string, qNum: number) => {
    console.log("[SpeedQuiz] Host publishing question:", qNum);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("speed-quiz", {
        body: { action: "generate", usedQuestionIds },
      });
      if (error) throw error;

      const question = data as QuizQuestion;

      // Insert into speed_quiz_room_questions
      const { error: insertError } = await supabase
        .from("speed_quiz_room_questions")
        .insert({
          room_id: roomId,
          question_number: qNum,
          question: question as any,
          started_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("[SpeedQuiz] Failed to publish question:", insertError);
        throw insertError;
      }
    } catch (err) {
      toast({ title: "문제 로딩 실패", variant: "destructive" });
      setIsLoading(false);
    }
  };

  const startQuestionTimer = (roomId: string, qNum: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    let t = QUESTION_TIME_LIMIT;
    setTimeLeft(t);

    timerRef.current = setInterval(() => {
      t--;
      setTimeLeft(t);
      if (t <= 0) {
        clearInterval(timerRef.current!);
        handleTimeOut(roomId, qNum);
      }
    }, 1000);
  };

  const handleTimeOut = async (roomId: string, qNum: number) => {
    if (showResult) return;
    if (!myAnswerSubmittedRef.current) {
      // Submit empty answer
      await submitAnswer(roomId, qNum, null, 0, false);
    }
    setShowResult(true);
    setLastAnswerCorrect(false);
    playWrongSound();

    setTimeout(() => advanceToNextQuestion(roomId, qNum), 2000);
  };

  const handleSelectAnswer = async (index: number) => {
    if (selectedAnswer !== null || showResult || !currentQuestion || !room) return;

    if (timerRef.current) clearInterval(timerRef.current);
    setSelectedAnswer(index);

    const isCorrect = index === currentQuestion.correctIndex;
    setLastAnswerCorrect(isCorrect);

    if (isCorrect) {
      playCorrectSound();
    } else {
      playWrongSound();
    }

    const speedBonus = timeLeft >= SPEED_BONUS_THRESHOLD ? 5 : 0;
    const points = isCorrect ? POINTS_PER_CORRECT + speedBonus : 0;

    await submitAnswer(room.id, questionNumber, index, points, isCorrect);
    setShowResult(true);

    // Wait before advancing
    setTimeout(() => advanceToNextQuestion(room.id, questionNumber), 2000);
  };

  const submitAnswer = async (roomId: string, qNum: number, selectedIndex: number | null, scoreDelta: number, isCorrect: boolean) => {
    if (myAnswerSubmittedRef.current) return;
    myAnswerSubmittedRef.current = true;

    const me = playerIdRef.current;
    try {
      await supabase.from("speed_quiz_room_answers").insert({
        room_id: roomId,
        question_number: qNum,
        user_id: me,
        selected_index: selectedIndex,
        time_left_seconds: timeLeft,
        is_correct: isCorrect,
        score_delta: scoreDelta,
      });

      // Update room score
      const newScore = myScore + scoreDelta;
      setMyScore(newScore);
      const scoreField = isHostRef.current ? "host_score" : "guest_score";
      await supabase.from("chain_reaction_rooms").update({ [scoreField]: newScore }).eq("id", roomId);
    } catch (err) {
      console.error("[SpeedQuiz] Failed to submit answer:", err);
    }
  };

  const advanceToNextQuestion = async (roomId: string, currentQNum: number) => {
    if (advanceTriggeredForQuestionRef.current >= currentQNum) return;
    advanceTriggeredForQuestionRef.current = currentQNum;

    if (currentQNum >= TOTAL_QUESTIONS) {
      // Game over
      await finishGame(roomId);
    } else if (isHostRef.current) {
      // Host publishes next question
      publishNextQuestion(roomId, currentQNum + 1);
    } else {
      // Guest waits for next question
      setIsLoading(true);
    }
  };

  const finishGame = async (roomId: string) => {
    if (!isHostRef.current) return;

    try {
      // Fetch latest scores
      const { data: latestRoom } = await supabase
        .from("chain_reaction_rooms")
        .select()
        .eq("id", roomId)
        .single();

      if (!latestRoom) return;

      const hostScore = latestRoom.host_score || 0;
      const guestScore = latestRoom.guest_score || 0;

      let winnerId: string | null = null;
      if (hostScore > guestScore) {
        winnerId = latestRoom.host_id;
      } else if (guestScore > hostScore) {
        winnerId = latestRoom.guest_id;
      }

      await supabase
        .from("chain_reaction_rooms")
        .update({ status: "finished", winner_id: winnerId, finished_at: new Date().toISOString() })
        .eq("id", roomId);
    } catch (err) {}
  };

  const resetGame = () => {
    setGamePhase("menu");
    setRoom(null);
    setCurrentQuestion(null);
    setQuestionNumber(0);
    setMyScore(0);
    setOpponentScore(0);
    setUsedQuestionIds([]);
    setSelectedAnswer(null);
    setShowResult(false);
    setStreakBonus(null);
    setOpponentAnswered(false);
    guestJoinNotifiedRef.current = false;
    autoStartTriggeredRef.current = false;
    advanceTriggeredForQuestionRef.current = 0;
    myAnswerSubmittedRef.current = false;
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    if (questionsChannelRef.current) supabase.removeChannel(questionsChannelRef.current);
    if (answersChannelRef.current) supabase.removeChannel(answersChannelRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
  };

  useEffect(() => {
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (questionsChannelRef.current) supabase.removeChannel(questionsChannelRef.current);
      if (answersChannelRef.current) supabase.removeChannel(answersChannelRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  // ================== RENDER ==================

  // Menu screen
  if (gamePhase === "menu") {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/30">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
              </div>
              <span className="bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 bg-clip-text text-transparent">
                {t("battle.speedQuiz")}
              </span>
            </h1>
            <p className="text-muted-foreground mt-1">{t("battle.speedQuizKo")}</p>
          </div>
        </div>

        <Card className="p-6 sm:p-8 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-cyan-500/5 border-teal-500/20">
          <h2 className="text-xl sm:text-2xl font-bold mb-6 flex items-center gap-3">
            <span className="text-2xl sm:text-3xl">⚡</span>
            <span>{t("battle.howToPlay")}</span>
          </h2>

          <div className="mb-6 p-5 rounded-xl bg-background/80 border border-teal-500/20">
            <p className="text-base sm:text-lg leading-relaxed">{t("battle.speedQuizGame.overview")}</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <div className="flex items-center gap-3 mb-2">
                <BookOpen className="w-6 h-6 text-emerald-400" />
                <span className="font-bold text-lg text-emerald-400">{t("battle.speedQuizGame.quizTypesTitle")}</span>
              </div>
              <p className="text-muted-foreground">{t("battle.speedQuizGame.quizTypesDesc")}</p>
            </div>

            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
              <div className="flex items-center gap-3 mb-2">
                <Timer className="w-6 h-6 text-blue-400" />
                <span className="font-bold text-lg text-blue-400">{t("battle.speedQuizGame.timeLimit")}</span>
              </div>
              <p className="text-muted-foreground">{t("battle.speedQuizGame.timeLimitDesc")}</p>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-center gap-3 mb-2">
                <Target className="w-6 h-6 text-amber-400" />
                <span className="font-bold text-lg text-amber-400">{t("battle.speedQuizGame.scoringTitle")}</span>
              </div>
              <p className="text-muted-foreground">{t("battle.speedQuizGame.scoringDesc")}</p>
            </div>

            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30">
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="w-6 h-6 text-rose-400" />
                <span className="font-bold text-lg text-rose-400">{t("battle.speedQuizGame.rewardTitle")}</span>
              </div>
              <p className="text-muted-foreground">{t("battle.speedQuizGame.rewardDesc")}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 sm:p-8">
          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">{t("battle.speedQuizGame.yourNameLabel")}</label>
              <Input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder={t("battle.speedQuizGame.yourNamePlaceholder")}
                className="text-lg h-12"
                maxLength={20}
              />
            </div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={createRoom}
                className="w-full h-16 text-lg font-bold gap-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:opacity-90 text-primary-foreground shadow-lg shadow-teal-500/30"
                disabled={!playerName.trim()}
              >
                <Zap className="w-6 h-6" />
                {t("battle.speedQuizGame.createRoom")}
              </Button>
            </motion.div>

            <p className="text-sm text-muted-foreground text-center">
              {t("battle.waitingDesc")}
            </p>
          </div>
        </Card>
      </motion.div>
    );
  }

  // Joining screen (auto-join from waiting list)
  if (gamePhase === "joining") {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto">
        <Card className="p-6 sm:p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary-foreground animate-spin" />
          </div>
          <h2 className="text-2xl font-bold mb-2">{t("battle.loadingRoom")}</h2>
          <p className="text-muted-foreground mb-6">{t("battle.gameStartingSoon")}</p>

          <Button variant="outline" onClick={resetGame}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("battle.cancel")}
          </Button>
        </Card>
      </motion.div>
    );
  }

  // Waiting/Creating screen
  if (gamePhase === "creating" || gamePhase === "waiting") {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto">
        <Card className="p-6 sm:p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary-foreground animate-spin" />
          </div>
          <h2 className="text-2xl font-bold mb-2">{t("battle.waitingForOpponent")}</h2>
          <p className="text-muted-foreground mb-6">{t("battle.waitingDesc")}</p>

          <Button variant="outline" onClick={resetGame}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("battle.cancel")}
          </Button>
        </Card>
      </motion.div>
    );
  }

  // Ready screen
  if (gamePhase === "ready") {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto">
        <Card className="p-6 sm:p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <Check className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-4">{t("battle.opponentJoined")}</h2>

          <div className="flex justify-center items-center gap-4 mb-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-2">
                <Crown className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="font-medium">{room?.host_name}</p>
              <p className="text-xs text-muted-foreground">Host</p>
            </div>
            <div className="text-2xl">⚔️</div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-2">
                <Users className="w-6 h-6 text-cyan-400" />
              </div>
              <p className="font-medium">{room?.guest_name}</p>
              <p className="text-xs text-muted-foreground">Guest</p>
            </div>
          </div>

          <p className="text-muted-foreground">{t("battle.gameStartingSoon")}</p>
        </Card>
      </motion.div>
    );
  }

  // Countdown screen
  if (gamePhase === "countdown") {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-background/95 flex items-center justify-center z-50">
        <motion.div
          key={countdown}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.5, opacity: 0 }}
          className="text-center"
        >
          {countdown > 0 ? (
            <div className="text-9xl font-black bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 bg-clip-text text-transparent">
              {countdown}
            </div>
          ) : (
            <div className="text-6xl font-black bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 bg-clip-text text-transparent">
              START!
            </div>
          )}
        </motion.div>
      </motion.div>
    );
  }

  // Playing screen
  if (gamePhase === "playing") {
    const handleForfeit = async () => {
      if (!room) return;
      try {
        const winnerId = isHost ? room.guest_id : room.host_id;
        await supabase
          .from("chain_reaction_rooms")
          .update({ status: "finished", winner_id: winnerId, finished_at: new Date().toISOString() })
          .eq("id", room.id);
      } catch (err) {
        console.error("[SpeedQuiz] Forfeit failed:", err);
      }
    };

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-4">
        {/* Header with scores */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleForfeit} className="text-red-400 hover:text-red-500 hover:bg-red-500/10" title="게임 포기">
              <X className="w-5 h-5" />
            </Button>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">{isHost ? "나" : room?.host_name}</p>
              <p className="text-2xl font-bold text-emerald-400">{isHost ? myScore : opponentScore}</p>
              {isHost && opponentAnswered && <span className="text-xs text-cyan-400">✓</span>}
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">Q{questionNumber}/{TOTAL_QUESTIONS}</p>
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-muted-foreground" />
              <span className={`text-xl font-bold ${timeLeft <= 3 ? "text-red-500 animate-pulse" : ""}`}>
                {timeLeft}s
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">{isHost ? room?.guest_name : "나"}</p>
              <p className="text-2xl font-bold text-cyan-400">{isHost ? opponentScore : myScore}</p>
              {!isHost && opponentAnswered && <span className="text-xs text-emerald-400">✓</span>}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <Progress value={(timeLeft / QUESTION_TIME_LIMIT) * 100} className="h-2" />

        {/* Question card */}
        <Card className="p-6 sm:p-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : currentQuestion ? (
            <div className="space-y-6">
              {/* Question type badge */}
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  currentQuestion.type === "vocabulary" ? "bg-emerald-500/20 text-emerald-400" :
                  currentQuestion.type === "grammar" ? "bg-blue-500/20 text-blue-400" :
                  "bg-purple-500/20 text-purple-400"
                }`}>
                  {currentQuestion.type === "vocabulary" ? "어휘" : currentQuestion.type === "grammar" ? "문법" : "표현"}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  currentQuestion.difficulty === "easy" ? "bg-green-500/20 text-green-400" :
                  currentQuestion.difficulty === "medium" ? "bg-amber-500/20 text-amber-400" :
                  "bg-red-500/20 text-red-400"
                }`}>
                  {currentQuestion.difficulty === "easy" ? "쉬움" : currentQuestion.difficulty === "medium" ? "보통" : "어려움"}
                </span>
              </div>

              {/* Question text */}
              <p className="text-xl sm:text-2xl font-bold leading-relaxed">{currentQuestion.question}</p>

              {/* Options */}
              <div className="grid gap-3">
                {currentQuestion.options.map((option, index) => {
                  const isCorrect = index === currentQuestion.correctIndex;
                  const isSelected = selectedAnswer === index;

                  let optionClass = "p-4 rounded-xl border-2 text-left transition-all cursor-pointer ";

                  if (showResult) {
                    if (isCorrect) {
                      optionClass += "bg-emerald-500/20 border-emerald-500 text-emerald-300";
                    } else if (isSelected && !isCorrect) {
                      optionClass += "bg-red-500/20 border-red-500 text-red-300";
                    } else {
                      optionClass += "opacity-50 border-muted";
                    }
                  } else {
                    optionClass += "hover:bg-muted hover:border-primary/50 border-muted";
                  }

                  return (
                    <motion.button
                      key={index}
                      whileHover={!showResult ? { scale: 1.02 } : {}}
                      whileTap={!showResult ? { scale: 0.98 } : {}}
                      onClick={() => handleSelectAnswer(index)}
                      disabled={showResult}
                      className={optionClass}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </span>
                        <span className="text-lg">{option}</span>
                        {showResult && isCorrect && <Check className="w-5 h-5 ml-auto text-emerald-400" />}
                        {showResult && isSelected && !isCorrect && <X className="w-5 h-5 ml-auto text-red-400" />}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Result feedback */}
              <AnimatePresence>
                {showResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl ${lastAnswerCorrect ? "bg-emerald-500/20 border border-emerald-500/30" : "bg-red-500/20 border border-red-500/30"}`}
                  >
                    <p className="font-bold mb-1">{lastAnswerCorrect ? "✅ 정답!" : "❌ 오답"}</p>
                    <p className="text-sm text-muted-foreground">
                      {currentQuestion.explanation_ko}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : null}
        </Card>
      </motion.div>
    );
  }

  // Finished screen
  if (gamePhase === "finished") {
    const isWinner = room?.winner_id === playerId;
    const isDraw = !room?.winner_id;
    const myFinalScore = isHost ? (room?.host_score || 0) : (room?.guest_score || 0);
    const oppFinalScore = isHost ? (room?.guest_score || 0) : (room?.host_score || 0);

    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto">
        <Card className="p-6 sm:p-8 text-center">
          <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${
            isDraw ? "bg-gray-500/20" : isWinner ? "bg-gradient-to-br from-amber-400 to-yellow-500" : "bg-gray-500/20"
          }`}>
            {isDraw ? (
              <span className="text-4xl">🤝</span>
            ) : isWinner ? (
              <Trophy className="w-10 h-10 text-amber-900" />
            ) : (
              <span className="text-4xl">😢</span>
            )}
          </div>

          <h2 className="text-3xl font-black mb-2">
            {isDraw ? "무승부!" : isWinner ? "🎉 승리!" : "다음엔 이기자!"}
          </h2>

          <div className="flex justify-center items-center gap-6 my-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">{isHost ? "나" : room?.host_name}</p>
              <p className="text-4xl font-black text-emerald-400">{isHost ? myFinalScore : oppFinalScore}</p>
            </div>
            <div className="text-2xl">vs</div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">{isHost ? room?.guest_name : "나"}</p>
              <p className="text-4xl font-black text-cyan-400">{isHost ? oppFinalScore : myFinalScore}</p>
            </div>
          </div>

          {streakBonus && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30"
            >
              <p className="font-bold text-amber-400">🔥 {streakBonus.streakCount}연승 보너스!</p>
              <p className="text-sm text-muted-foreground">+{streakBonus.bonusPoints} 추가 포인트</p>
            </motion.div>
          )}

          <div className="flex gap-3">
            <Button onClick={resetGame} variant="outline" className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("battle.backToMenu")}
            </Button>
            <Button
              onClick={() => {
                resetGame();
                setTimeout(() => createRoom(), 100);
              }}
              className="flex-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"
            >
              <Play className="w-4 h-4 mr-2" />
              {t("battle.playAgain")}
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  }

  return null;
}