import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Trophy, 
  Flame,
  Zap,
  Car,
  Sparkles,
  Target,
  Clock,
  Star,
  ChevronRight,
  Award,
  Volume2,
  Loader2
} from "lucide-react";
import confetti from "canvas-confetti";
import { useAutoTranslate } from "@/hooks/useAutoTranslate";

interface Word {
  id: number;
  korean: string;
  meaning: string;
  example?: string;
  exampleMeaning?: string;
  pronunciation?: string;
}

// Auto-translated text component
function TranslatedText({ text, sourceLanguage = "ko" }: { text: string; sourceLanguage?: string }) {
  const { i18n } = useTranslation();
  const uiLang = (i18n.language || "ko").split("-")[0];

  if (uiLang === sourceLanguage || uiLang === "ko") return <>{text}</>;
  if (uiLang === "vi" && sourceLanguage === "vi") return <>{text}</>;

  const { text: translatedText, isTranslating } = useAutoTranslate(text, { sourceLanguage });

  if (isTranslating) return <span className="inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />{text}</span>;
  return <>{translatedText}</>;
}

interface WordRacingProps {
  words: Word[];
  onComplete: (score: number, wordsCompleted: number) => void;
}

interface Letter {
  id: string;
  char: string;
  wordId: number;
  x: number;
  y: number;
  collected: boolean;
  isWrong: boolean;
}

interface TargetWord {
  id: number;
  korean: string;
  meaning: string;
  example?: string;
  exampleMeaning?: string;
  pronunciation?: string;
  letters: string[];
  collectedLetters: string[];
}

interface Mission {
  id: string;
  title: string;
  titleVi: string;
  target: number;
  type: "words" | "combo" | "perfect" | "score";
  reward: number;
}

const TRACK_WIDTH = 320;
const TRACK_HEIGHT = 480;
const CAR_SIZE = 40;
const LETTER_SIZE = 36;
const LANE_COUNT = 5;
const LANE_WIDTH = TRACK_WIDTH / LANE_COUNT;
const GAME_DURATION = 90; // 90 seconds
const WORD_TARGET = 8; // Complete 8 words to win

const MISSIONS: Mission[] = [
  { id: "words5", title: "wordRacing.missions.words5", titleVi: "Hoàn thành 5 từ", target: 5, type: "words", reward: 100 },
  { id: "combo5", title: "wordRacing.missions.combo5", titleVi: "Đạt 5 combo", target: 5, type: "combo", reward: 150 },
  { id: "perfect", title: "wordRacing.missions.perfect", titleVi: "3 từ không sai", target: 3, type: "perfect", reward: 200 },
  { id: "score500", title: "wordRacing.missions.score500", titleVi: "Đạt 500 điểm", target: 500, type: "score", reward: 50 },
];

export default function WordRacing({ words, onComplete }: WordRacingProps) {
  const [gameState, setGameState] = useState<"ready" | "tutorial" | "playing" | "paused" | "finished">("ready");
  const [tutorialStep, setTutorialStep] = useState(0);
  const [carX, setCarX] = useState(TRACK_WIDTH / 2 - CAR_SIZE / 2);
  const [carLane, setCarLane] = useState(2);
  const [speed, setSpeed] = useState(2);
  const [baseSpeed, setBaseSpeed] = useState(2);
  const [selectedSpeed, setSelectedSpeed] = useState<"slow" | "normal" | "fast">("normal");
  const [boosting, setBoosting] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [targetWord, setTargetWord] = useState<TargetWord | null>(null);
  const [wordsCompleted, setWordsCompleted] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [perfectStreak, setPerfectStreak] = useState(0);
  const [showBoostEffect, setShowBoostEffect] = useState(false);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string }[]>([]);
  const [wrongPenalty, setWrongPenalty] = useState(false);
  const [completedMissions, setCompletedMissions] = useState<string[]>([]);
  const [showMissionComplete, setShowMissionComplete] = useState<Mission | null>(null);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(() => {
    return localStorage.getItem("wordRacingTutorialSeen") === "true";
  });
  
  const gameLoopRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpawnRef = useRef(0);
  const wordIndexRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrongCountRef = useRef(0);

  const { t } = useTranslation();
  
  // Speed settings with difficulty curve
  const speedSettings = {
    slow: { base: 1.5, spawnInterval: 2000, label: t("wordRacing.speed.slow", "느림 / Chậm"), color: "from-green-500 to-emerald-500" },
    normal: { base: 2.5, spawnInterval: 1500, label: t("wordRacing.speed.normal", "보통 / Bình thường"), color: "from-blue-500 to-cyan-500" },
    fast: { base: 4, spawnInterval: 1000, label: t("wordRacing.speed.fast", "빠름 / Nhanh"), color: "from-orange-500 to-red-500" },
  };

  // Tutorial steps
  const tutorialSteps = [
    {
      title: "🏎️ Bước 1: Di chuyển",
      titleKo: "1단계: 이동",
      description: "Nhấn các nút 1-5 bên dưới để di chuyển xe qua các làn đường",
      descriptionKo: "아래 1-5 버튼을 눌러 차량을 이동하세요",
      highlight: "controls"
    },
    {
      title: "✅ Bước 2: Thu thập chữ",
      titleKo: "2단계: 글자 수집",
      description: "Thu thập các chữ cái MÀU XANH theo đúng thứ tự để hoàn thành từ",
      descriptionKo: "초록색 글자를 순서대로 수집하여 단어를 완성하세요",
      highlight: "letters"
    },
    {
      title: "⚠️ Bước 3: Tránh chữ sai",
      titleKo: "3단계: 오답 피하기",
      description: "Tránh các chữ MÀU ĐỎ! Đụng phải sẽ bị giảm tốc và mất combo",
      descriptionKo: "빨간 글자를 피하세요! 부딪히면 속도가 느려집니다",
      highlight: "wrong"
    },
    {
      title: "🚀 Bước 4: BOOST!",
      titleKo: "4단계: 부스트!",
      description: "Hoàn thành từ = BOOST tốc độ + điểm thưởng lớn!",
      descriptionKo: "단어 완성 = 부스트 + 대량 보너스 점수!",
      highlight: "boost"
    }
  ];

  // Check missions
  const checkMissions = useCallback(() => {
    MISSIONS.forEach(mission => {
      if (completedMissions.includes(mission.id)) return;
      
      let achieved = false;
      switch (mission.type) {
        case "words":
          achieved = wordsCompleted >= mission.target;
          break;
        case "combo":
          achieved = maxCombo >= mission.target;
          break;
        case "perfect":
          achieved = perfectStreak >= mission.target;
          break;
        case "score":
          achieved = score >= mission.target;
          break;
      }
      
      if (achieved) {
        setCompletedMissions(prev => [...prev, mission.id]);
        setScore(prev => prev + mission.reward);
        setShowMissionComplete(mission);
        setTimeout(() => setShowMissionComplete(null), 2000);
      }
    });
  }, [wordsCompleted, maxCombo, perfectStreak, score, completedMissions]);

  useEffect(() => {
    if (gameState === "playing") {
      checkMissions();
    }
  }, [wordsCompleted, maxCombo, perfectStreak, score, gameState, checkMissions]);

  // Get next target word
  const getNextWord = useCallback(() => {
    const word = words[wordIndexRef.current % words.length];
    wordIndexRef.current++;
    return {
      ...word,
      letters: word.korean.split(""),
      collectedLetters: [],
    };
  }, [words]);

  // Dynamic spawn interval based on progress
  const getSpawnInterval = useCallback(() => {
    const baseInterval = speedSettings[selectedSpeed].spawnInterval;
    const progressFactor = Math.max(0.5, 1 - (wordsCompleted * 0.05)); // Gets faster as you complete more words
    return baseInterval * progressFactor;
  }, [selectedSpeed, wordsCompleted]);

  // Spawn letters on track
  const spawnLetters = useCallback(() => {
    if (!targetWord) return;

    const now = Date.now();
    if (now - lastSpawnRef.current < getSpawnInterval()) return;
    lastSpawnRef.current = now;

    const newLetters: Letter[] = [];
    
    // Spawn correct letters
    const neededLetter = targetWord.letters[targetWord.collectedLetters.length];
    if (neededLetter) {
      const lane = Math.floor(Math.random() * LANE_COUNT);
      newLetters.push({
        id: `correct-${Date.now()}`,
        char: neededLetter,
        wordId: targetWord.id,
        x: lane * LANE_WIDTH + (LANE_WIDTH - LETTER_SIZE) / 2,
        y: -LETTER_SIZE,
        collected: false,
        isWrong: false,
      });
    }

    // Spawn wrong letters - more as game progresses
    const wrongChars = ["가", "나", "다", "라", "마", "바", "사", "아", "자", "차", "카", "타", "파", "하"];
    const numWrong = Math.min(3, 1 + Math.floor(wordsCompleted / 3)); // Increase difficulty
    
    for (let i = 0; i < numWrong; i++) {
      const lane = Math.floor(Math.random() * LANE_COUNT);
      const randomChar = wrongChars[Math.floor(Math.random() * wrongChars.length)];
      
      if (randomChar !== neededLetter) {
        newLetters.push({
          id: `wrong-${Date.now()}-${i}`,
          char: randomChar,
          wordId: -1,
          x: lane * LANE_WIDTH + (LANE_WIDTH - LETTER_SIZE) / 2,
          y: -LETTER_SIZE - (i * 60),
          collected: false,
          isWrong: true,
        });
      }
    }

    setLetters(prev => [...prev, ...newLetters]);
  }, [targetWord, getSpawnInterval, wordsCompleted]);

  // Check collision
  const checkCollision = useCallback((letterX: number, letterY: number) => {
    const carCenterX = carX + CAR_SIZE / 2;
    const carCenterY = TRACK_HEIGHT - 80;
    const letterCenterX = letterX + LETTER_SIZE / 2;
    const letterCenterY = letterY + LETTER_SIZE / 2;
    
    const distance = Math.sqrt(
      Math.pow(carCenterX - letterCenterX, 2) + 
      Math.pow(carCenterY - letterCenterY, 2)
    );
    
    return distance < (CAR_SIZE + LETTER_SIZE) / 2;
  }, [carX]);

  // Create particle effect
  const createParticles = useCallback((x: number, y: number, color: string, count = 8) => {
    const newParticles = Array.from({ length: count }, (_, i) => ({
      id: Date.now() + i,
      x: x + Math.random() * 40 - 20,
      y: y + Math.random() * 40 - 20,
      color,
    }));
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 600);
  }, []);

  // Handle letter collection
  const collectLetter = useCallback((letter: Letter) => {
    if (!targetWord) return;

    const neededLetter = targetWord.letters[targetWord.collectedLetters.length];
    
    if (letter.char === neededLetter && !letter.isWrong) {
      // Correct letter!
      const newCollected = [...targetWord.collectedLetters, letter.char];
      setTargetWord(prev => prev ? { ...prev, collectedLetters: newCollected } : null);
      setScore(prev => prev + 10 * (combo + 1));
      setCombo(prev => {
        const newCombo = prev + 1;
        setMaxCombo(max => Math.max(max, newCombo));
        return newCombo;
      });
      createParticles(letter.x, TRACK_HEIGHT - 80, "bg-green-500");
      
      // Check if word is complete
      if (newCollected.length === targetWord.letters.length) {
        setBoosting(true);
        setShowBoostEffect(true);
        setSpeed(baseSpeed * 2);
        setWordsCompleted(prev => prev + 1);
        setPerfectStreak(prev => prev + 1);
        setScore(prev => prev + 100 * (combo + 1));
        
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        createParticles(TRACK_WIDTH / 2, TRACK_HEIGHT / 2, "bg-yellow-500", 20);
        
        setTimeout(() => {
          setBoosting(false);
          setShowBoostEffect(false);
          // Increase base speed slightly with each word
          const newBaseSpeed = Math.min(baseSpeed + 0.2, 8);
          setBaseSpeed(newBaseSpeed);
          setSpeed(newBaseSpeed);
          setTargetWord(getNextWord());
        }, 2000);
      }
    } else {
      // Wrong letter - penalty
      setWrongPenalty(true);
      setSpeed(Math.max(1, baseSpeed - 1));
      setCombo(0);
      setPerfectStreak(0);
      wrongCountRef.current++;
      createParticles(letter.x, TRACK_HEIGHT - 80, "bg-red-500");
      
      setTimeout(() => {
        setWrongPenalty(false);
        setSpeed(baseSpeed);
      }, 1000);
    }
  }, [targetWord, combo, baseSpeed, createParticles, getNextWord]);

  // Game loop
  useEffect(() => {
    if (gameState !== "playing") {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }

    const gameLoop = () => {
      // Move letters down
      setLetters(prev => {
        const updated = prev
          .map(letter => ({ ...letter, y: letter.y + speed * 2 }))
          .filter(letter => letter.y < TRACK_HEIGHT + 50);
        
        updated.forEach(letter => {
          if (!letter.collected && checkCollision(letter.x, letter.y)) {
            letter.collected = true;
            collectLetter(letter);
          }
        });
        
        return updated.filter(l => !l.collected);
      });

      spawnLetters();
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, speed, checkCollision, collectLetter, spawnLetters]);

  // Timer
  useEffect(() => {
    if (gameState !== "playing") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1 || wordsCompleted >= WORD_TARGET) {
          setGameState("finished");
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, wordsCompleted]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== "playing") return;

      if (e.key === "ArrowLeft") {
        setCarLane(prev => {
          const newLane = Math.max(0, prev - 1);
          setCarX(newLane * LANE_WIDTH + (LANE_WIDTH - CAR_SIZE) / 2);
          return newLane;
        });
      } else if (e.key === "ArrowRight") {
        setCarLane(prev => {
          const newLane = Math.min(LANE_COUNT - 1, prev + 1);
          setCarX(newLane * LANE_WIDTH + (LANE_WIDTH - CAR_SIZE) / 2);
          return newLane;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState]);

  // Touch controls
  const handleTouchMove = useCallback((lane: number) => {
    if (gameState !== "playing" && gameState !== "tutorial") return;
    setCarLane(lane);
    setCarX(lane * LANE_WIDTH + (LANE_WIDTH - CAR_SIZE) / 2);
  }, [gameState]);

  const startGame = (skipTutorial = false) => {
    if (!skipTutorial && !hasSeenTutorial) {
      setGameState("tutorial");
      setTutorialStep(0);
      return;
    }
    
    const initialSpeed = speedSettings[selectedSpeed].base;
    setGameState("playing");
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setSpeed(initialSpeed);
    setBaseSpeed(initialSpeed);
    setWordsCompleted(0);
    setCombo(0);
    setMaxCombo(0);
    setPerfectStreak(0);
    setLetters([]);
    setCarLane(2);
    setCarX(2 * LANE_WIDTH + (LANE_WIDTH - CAR_SIZE) / 2);
    setCompletedMissions([]);
    wordIndexRef.current = 0;
    wrongCountRef.current = 0;
    setTargetWord(getNextWord());
  };

  const finishTutorial = () => {
    localStorage.setItem("wordRacingTutorialSeen", "true");
    setHasSeenTutorial(true);
    startGame(true);
  };

  // Calculate grade
  const getGrade = () => {
    if (wordsCompleted >= 8 && wrongCountRef.current === 0) return { grade: "S", color: "text-yellow-400" };
    if (wordsCompleted >= 7) return { grade: "A", color: "text-green-400" };
    if (wordsCompleted >= 5) return { grade: "B", color: "text-blue-400" };
    if (wordsCompleted >= 3) return { grade: "C", color: "text-orange-400" };
    return { grade: "D", color: "text-red-400" };
  };

  // Tutorial screen
  if (gameState === "tutorial") {
    const step = tutorialSteps[tutorialStep];
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-md mx-auto"
      >
        <Card className="p-4 sm:p-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-500/10 to-purple-500/10" />
          
          <div className="mb-4">
            <div className="flex justify-center gap-1 mb-4">
              {tutorialSteps.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === tutorialStep ? "bg-primary w-6" : idx < tutorialStep ? "bg-primary/50" : "bg-muted"
                  }`}
                />
              ))}
            </div>
            
            <h2 className="text-xl sm:text-2xl font-bold mb-1">{step.title}</h2>
            <p className="text-sm text-muted-foreground mb-4">{step.titleKo}</p>
          </div>

          <div className="bg-muted/50 rounded-xl p-4 mb-6 min-h-[120px] flex items-center justify-center">
            {step.highlight === "controls" && (
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <motion.div
                    key={n}
                    animate={{ scale: n === 3 ? [1, 1.2, 1] : 1 }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
                      n === 3 ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20"
                    }`}
                  >
                    {n}
                  </motion.div>
                ))}
              </div>
            )}
            {step.highlight === "letters" && (
              <div className="flex gap-4">
                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-xl shadow-lg"
                >
                  한
                </motion.div>
                <motion.div
                  animate={{ y: [5, 15, 5] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                  className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-xl shadow-lg"
                >
                  국
                </motion.div>
              </div>
            )}
            {step.highlight === "wrong" && (
              <motion.div
                animate={{ x: [-10, 10, -10], rotate: [-5, 5, -5] }}
                transition={{ duration: 0.3, repeat: Infinity }}
                className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white font-bold text-xl shadow-lg"
              >
                ❌
              </motion.div>
            )}
            {step.highlight === "boost" && (
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="text-4xl"
              >
                🚀
              </motion.div>
            )}
          </div>

          <p className="text-sm sm:text-base mb-2">{step.description}</p>
          <p className="text-xs sm:text-sm text-muted-foreground mb-6">{step.descriptionKo}</p>

          <div className="flex gap-2 justify-center">
            {tutorialStep > 0 && (
              <Button variant="outline" onClick={() => setTutorialStep(prev => prev - 1)}>
                {t("wordRacing.tutorial.prev", "이전")}
              </Button>
            )}
            {tutorialStep < tutorialSteps.length - 1 ? (
              <Button onClick={() => setTutorialStep(prev => prev + 1)} className="gap-2">
                {t("wordRacing.tutorial.next", "다음")} <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={finishTutorial} className="gap-2 bg-gradient-to-r from-green-500 to-emerald-500">
                <Play className="w-4 h-4" /> {t("wordRacing.tutorial.startGame", "게임 시작!")}
              </Button>
            )}
          </div>
          
          <Button variant="ghost" size="sm" onClick={finishTutorial} className="mt-4 text-muted-foreground">
            {t("wordRacing.tutorial.skip", "튜토리얼 건너뛰기")}
          </Button>
        </Card>
      </motion.div>
    );
  }

  // Ready screen
  if (gameState === "ready") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-md mx-auto"
      >
        <div className="absolute inset-0 -z-10 overflow-hidden rounded-2xl">
          <div className="absolute top-0 left-1/4 w-32 sm:w-64 h-32 sm:h-64 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-32 sm:w-64 h-32 sm:h-64 bg-green-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>
        
        <Card className="p-4 sm:p-6 text-center backdrop-blur-sm bg-background/80 border-primary/30">
          <motion.div
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="text-5xl sm:text-6xl mb-3">🏎️</div>
            <h2 className="text-2xl sm:text-3xl font-black mb-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-green-500 bg-clip-text text-transparent">
              {t("wordRacing.title", "Word Racing")}
            </h2>
            <p className="text-muted-foreground mb-4 text-sm">
              {t("wordRacing.subtitle", "단어 레이싱 / Đua xe từ vựng")}
            </p>
          </motion.div>
          
          {/* Game info */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-muted/50 rounded-lg p-2 sm:p-3">
              <div className="flex items-center justify-center gap-1 text-amber-400 mb-1">
                <Target className="w-4 h-4" />
                <span className="font-bold">{WORD_TARGET}</span>
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{t("wordRacing.wordTarget", "단어 목표")}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2 sm:p-3">
              <div className="flex items-center justify-center gap-1 text-blue-400 mb-1">
                <Clock className="w-4 h-4" />
                <span className="font-bold">{GAME_DURATION}{t("wordRacing.seconds", "초")}</span>
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{t("wordRacing.timeLimit", "제한 시간")}</p>
            </div>
          </div>

          {/* Missions preview */}
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl p-3 mb-4 border border-purple-500/20">
            <p className="font-bold text-sm mb-2 flex items-center gap-1 justify-center">
              <Star className="w-4 h-4 text-yellow-400" />
              {t("wordRacing.missions.title", "미션")}
            </p>
            <div className="grid grid-cols-2 gap-1.5 text-[10px] sm:text-xs">
              {MISSIONS.slice(0, 4).map(mission => (
                <div key={mission.id} className="bg-background/50 rounded px-2 py-1 flex items-center gap-1">
                  <Award className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                  <span className="truncate">{mission.titleVi}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Speed selector */}
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2">🏎️ {t("wordRacing.speedLabel", "속도")}</p>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(speedSettings) as Array<keyof typeof speedSettings>).map((key) => (
                <Button
                  key={key}
                  variant={selectedSpeed === key ? "default" : "outline"}
                  onClick={() => setSelectedSpeed(key)}
                  size="sm"
                  className={`text-[10px] sm:text-xs px-2 py-2 h-auto ${
                    selectedSpeed === key 
                      ? `bg-gradient-to-r ${speedSettings[key].color} border-0` 
                      : ""
                  }`}
                >
                  {speedSettings[key].label}
                </Button>
              ))}
            </div>
          </div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button 
              onClick={() => startGame()} 
              size="lg" 
              className={`gap-2 text-base w-full bg-gradient-to-r ${speedSettings[selectedSpeed].color} hover:opacity-90`}
            >
              <Play className="w-5 h-5" />
              {hasSeenTutorial ? t("wordRacing.start", "시작") : t("wordRacing.startGame", "시작하기")}
            </Button>
          </motion.div>
          
          {hasSeenTutorial && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { setHasSeenTutorial(false); setGameState("tutorial"); setTutorialStep(0); }}
              className="mt-2 text-xs text-muted-foreground"
            >
              {t("wordRacing.tutorial.showAgain", "튜토리얼 다시 보기")}
            </Button>
          )}
        </Card>
      </motion.div>
    );
  }

  // Finished screen
  if (gameState === "finished") {
    const { grade, color } = getGrade();
    const missionsCompleted = completedMissions.length;
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md mx-auto"
      >
        <Card className="p-4 sm:p-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-yellow-500/20 rounded-full blur-2xl animate-pulse" />
          </div>
          
          {/* Grade */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="mb-4"
          >
            <div className={`text-6xl sm:text-7xl font-black ${color}`}>
              {grade}
            </div>
          </motion.div>
          
          <h2 className="text-xl sm:text-2xl font-black mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            {t("wordRacing.complete", "레이스 완료!")}
          </h2>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-muted/50 rounded-lg p-2">
              <Trophy className="w-5 h-5 mx-auto mb-1 text-amber-400" />
              <div className="font-bold text-lg">{score}</div>
              <div className="text-[10px] text-muted-foreground">{t("wordRacing.score", "점수")}</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-2">
              <Car className="w-5 h-5 mx-auto mb-1 text-blue-400" />
              <div className="font-bold text-lg">{wordsCompleted}/{WORD_TARGET}</div>
              <div className="text-[10px] text-muted-foreground">{t("wordRacing.words", "단어")}</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-2">
              <Flame className="w-5 h-5 mx-auto mb-1 text-orange-400" />
              <div className="font-bold text-lg">{maxCombo}x</div>
              <div className="text-[10px] text-muted-foreground">{t("wordRacing.maxCombo", "최대 콤보")}</div>
            </div>
          </div>

          {/* Missions completed */}
          {missionsCompleted > 0 && (
            <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg p-3 mb-4 border border-yellow-500/30">
              <p className="font-bold text-sm flex items-center gap-1 justify-center mb-2">
                <Star className="w-4 h-4 text-yellow-400" />
                {t("wordRacing.missionsCompleted", "미션 완료")}: {missionsCompleted}/{MISSIONS.length}
              </p>
              <div className="flex flex-wrap gap-1 justify-center">
                {completedMissions.map(id => {
                  const mission = MISSIONS.find(m => m.id === id);
                  return mission ? (
                    <span key={id} className="text-[10px] bg-yellow-500/20 px-2 py-0.5 rounded">
                      ✓ {mission.titleVi}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button 
              onClick={() => startGame(true)} 
              className="gap-2 bg-gradient-to-r from-blue-500 to-cyan-500"
            >
              <RotateCcw className="w-4 h-4" />
              {t("wordRacing.playAgain", "다시하기")}
            </Button>
            <Button 
              variant="outline"
              onClick={() => onComplete(score, wordsCompleted)}
            >
              {t("wordRacing.finish", "완료")}
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-md mx-auto px-2">
      {/* Top Stats Bar */}
      <div className="w-full max-w-[320px] flex justify-between items-center">
        {/* Score */}
        <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-2.5 py-1.5 rounded-lg border border-amber-500/30">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-lg text-amber-400">{score}</span>
        </div>
        
        {/* Timer */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${
          timeLeft <= 10 ? "bg-red-500/20 border-red-500/30" : "bg-muted/50 border-border"
        }`}>
          <Clock className={`w-4 h-4 ${timeLeft <= 10 ? "text-red-400 animate-pulse" : "text-muted-foreground"}`} />
          <span className={`font-bold text-lg ${timeLeft <= 10 ? "text-red-400" : ""}`}>{timeLeft}s</span>
        </div>

        {/* Combo */}
        {combo >= 2 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-1 bg-gradient-to-r from-orange-500/20 to-red-500/20 px-2 py-1.5 rounded-lg border border-orange-500/30"
          >
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="font-bold text-orange-400">{combo}x</span>
          </motion.div>
        )}

        <Button
          variant="outline"
          size="icon"
          onClick={() => setGameState(gameState === "paused" ? "playing" : "paused")}
          className="w-8 h-8"
        >
          {gameState === "paused" ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
        </Button>
      </div>

      {/* Progress to target */}
      <div className="w-full max-w-[320px]">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">진행 / Tiến độ</span>
          <span className="font-bold text-primary">{wordsCompleted}/{WORD_TARGET} 단어</span>
        </div>
        <Progress value={(wordsCompleted / WORD_TARGET) * 100} className="h-2" />
      </div>

      {/* Target Word */}
      {targetWord && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[320px]"
        >
          <Card className={`p-2.5 text-center transition-all ${boosting ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/50' : 'bg-card'}`}>
            <p className="text-[10px] text-muted-foreground mb-1">목표 단어 / Từ mục tiêu</p>
            <div className="flex justify-center gap-0.5 text-lg font-bold">
              {targetWord.letters.map((letter, idx) => (
                <motion.span
                  key={idx}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`w-7 h-7 flex items-center justify-center rounded-md text-sm ${
                    idx < targetWord.collectedLetters.length
                      ? "bg-green-500 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {idx < targetWord.collectedLetters.length ? letter : "?"}
                </motion.span>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">
              <TranslatedText text={targetWord.meaning} sourceLanguage="vi" />
            </p>
            
            {/* Show example when boosting (word completed) */}
            <AnimatePresence>
              {boosting && targetWord.example && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 pt-2 border-t border-border/50"
                >
                  {targetWord.pronunciation && (
                    <p className="text-[10px] text-primary mb-1 flex items-center justify-center gap-1">
                      <Volume2 className="w-3 h-3" />
                      [{targetWord.pronunciation}]
                    </p>
                  )}
                  <p className="text-[10px] text-foreground font-medium">{targetWord.example}</p>
                  {targetWord.exampleMeaning && (
                    <p className="text-[10px] text-muted-foreground">
                      <TranslatedText text={targetWord.exampleMeaning} sourceLanguage="vi" />
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>
      )}

      {/* Racing Track */}
      <div 
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl border-4 border-slate-700 bg-gradient-to-b from-slate-800 to-slate-900"
        style={{ width: TRACK_WIDTH, height: TRACK_HEIGHT }}
      >
        {/* Track lines */}
        <div className="absolute inset-0">
          {Array.from({ length: LANE_COUNT - 1 }).map((_, i) => (
            <motion.div
              key={`lane-${i}`}
              className="absolute top-0 bottom-0 w-1 bg-yellow-500/30"
              style={{ left: (i + 1) * LANE_WIDTH - 2 }}
            />
          ))}
          
          {/* Moving road lines */}
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={`road-${i}`}
              className="absolute left-1/2 -translate-x-1/2 w-2 h-12 bg-white/20 rounded-full"
              animate={{
                y: [i * 70 - 50, i * 70 + TRACK_HEIGHT],
              }}
              transition={{
                duration: 2 / speed,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          ))}
        </div>

        {/* Particles */}
        <AnimatePresence>
          {particles.map(p => (
            <motion.div
              key={`particle-${p.id}`}
              className={`absolute w-3 h-3 rounded-full ${p.color}`}
              initial={{ x: p.x, y: p.y, scale: 1, opacity: 1 }}
              animate={{ 
                x: p.x + (Math.random() - 0.5) * 60,
                y: p.y - 50,
                scale: 0,
                opacity: 0
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            />
          ))}
        </AnimatePresence>

        {/* Letters */}
        <AnimatePresence>
          {letters.map(letter => (
            <motion.div
              key={letter.id}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              className={`absolute flex items-center justify-center rounded-xl font-bold text-lg ${
                letter.isWrong
                  ? "bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                  : "bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-[0_0_15px_rgba(34,197,94,0.5)]"
              }`}
              style={{
                left: letter.x,
                top: letter.y,
                width: LETTER_SIZE,
                height: LETTER_SIZE,
              }}
            >
              {letter.char}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Car */}
        <motion.div
          className={`absolute transition-all duration-100 ${wrongPenalty ? 'opacity-50' : ''}`}
          style={{
            left: carX,
            bottom: 40,
            width: CAR_SIZE,
            height: CAR_SIZE * 1.2,
          }}
          animate={{
            x: boosting ? [0, -2, 2, -2, 0] : 0,
          }}
          transition={{
            duration: 0.1,
            repeat: boosting ? Infinity : 0,
          }}
        >
          <div className={`w-full h-full rounded-lg ${boosting ? 'bg-gradient-to-b from-yellow-400 to-orange-500' : 'bg-gradient-to-b from-blue-500 to-blue-700'} shadow-lg relative`}>
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-6 h-4 bg-cyan-300/50 rounded-sm" />
            <div className="absolute -left-1 top-1 w-2 h-4 bg-slate-900 rounded-full" />
            <div className="absolute -right-1 top-1 w-2 h-4 bg-slate-900 rounded-full" />
            <div className="absolute -left-1 bottom-1 w-2 h-4 bg-slate-900 rounded-full" />
            <div className="absolute -right-1 bottom-1 w-2 h-4 bg-slate-900 rounded-full" />
          </div>
          
          {boosting && (
            <motion.div
              className="absolute -bottom-4 left-1/2 -translate-x-1/2"
              animate={{ scaleY: [1, 1.5, 1], opacity: [1, 0.8, 1] }}
              transition={{ duration: 0.1, repeat: Infinity }}
            >
              <div className="w-6 h-8 bg-gradient-to-t from-yellow-500 via-orange-500 to-transparent rounded-b-full" />
            </motion.div>
          )}
        </motion.div>

        {/* Boost effect */}
        <AnimatePresence>
          {showBoostEffect && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/30 to-transparent" />
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl font-black text-yellow-400"
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
              >
                🚀 BOOST!
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Speed lines */}
        {boosting && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 10 }).map((_, i) => (
              <motion.div
                key={`speed-line-${i}`}
                className="absolute w-0.5 h-20 bg-white/30"
                style={{ left: Math.random() * TRACK_WIDTH }}
                animate={{ y: [-100, TRACK_HEIGHT + 100] }}
                transition={{ duration: 0.3, repeat: Infinity, delay: i * 0.05 }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lane Controls */}
      <div className="flex gap-1 w-full max-w-[320px]">
        {Array.from({ length: LANE_COUNT }).map((_, lane) => (
          <motion.button
            key={`control-${lane}`}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleTouchMove(lane)}
            className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${
              carLane === lane
                ? "bg-primary text-primary-foreground shadow-lg scale-105"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            {lane + 1}
          </motion.button>
        ))}
      </div>

      {/* Mission complete popup */}
      <AnimatePresence>
        {showMissionComplete && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.8 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
              <Star className="w-5 h-5" />
              <div>
                <p className="font-bold text-sm">미션 완료!</p>
                <p className="text-xs">{showMissionComplete.titleVi} (+{showMissionComplete.reward}점)</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pause overlay */}
      <AnimatePresence>
        {gameState === "paused" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center z-50"
            onClick={() => setGameState("playing")}
          >
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Card className="p-8 text-center">
                <Pause className="w-16 h-16 mx-auto mb-4 text-primary" />
                <h2 className="text-2xl font-black mb-2">Tạm dừng / 일시정지</h2>
                <p className="text-muted-foreground">Nhấn để tiếp tục / 터치하여 계속</p>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
