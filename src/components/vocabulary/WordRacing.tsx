import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Trophy, 
  Flame,
  Zap,
  Car,
  Sparkles
} from "lucide-react";
import confetti from "canvas-confetti";

interface Word {
  id: number;
  korean: string;
  meaning: string;
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
  letters: string[];
  collectedLetters: string[];
}

const TRACK_WIDTH = 320;
const TRACK_HEIGHT = 480;
const CAR_SIZE = 40;
const LETTER_SIZE = 36;
const LANE_COUNT = 5;
const LANE_WIDTH = TRACK_WIDTH / LANE_COUNT;

export default function WordRacing({ words, onComplete }: WordRacingProps) {
  const [gameState, setGameState] = useState<"ready" | "playing" | "paused" | "finished">("ready");
  const [carX, setCarX] = useState(TRACK_WIDTH / 2 - CAR_SIZE / 2);
  const [carLane, setCarLane] = useState(2);
  const [speed, setSpeed] = useState(2);
  const [baseSpeed, setBaseSpeed] = useState(2);
  const [selectedSpeed, setSelectedSpeed] = useState<"slow" | "normal" | "fast">("normal");
  const [boosting, setBoosting] = useState(false);
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [targetWord, setTargetWord] = useState<TargetWord | null>(null);
  const [wordsCompleted, setWordsCompleted] = useState(0);
  const [combo, setCombo] = useState(0);
  const [showBoostEffect, setShowBoostEffect] = useState(false);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string }[]>([]);
  const [wrongPenalty, setWrongPenalty] = useState(false);
  
  const gameLoopRef = useRef<number | null>(null);
  const lastSpawnRef = useRef(0);
  const wordIndexRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Speed settings
  const speedSettings = {
    slow: { base: 1.5, label: "느림 / Chậm", color: "from-green-500 to-emerald-500" },
    normal: { base: 2.5, label: "보통 / Bình thường", color: "from-blue-500 to-cyan-500" },
    fast: { base: 4, label: "빠름 / Nhanh", color: "from-orange-500 to-red-500" },
  };
  

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

  // Spawn letters on track
  const spawnLetters = useCallback(() => {
    if (!targetWord) return;

    const now = Date.now();
    if (now - lastSpawnRef.current < 1500) return;
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

    // Spawn some wrong letters
    const wrongChars = ["가", "나", "다", "라", "마", "바", "사", "아", "자", "차", "카", "타", "파", "하"];
    const numWrong = Math.floor(Math.random() * 2) + 1;
    
    for (let i = 0; i < numWrong; i++) {
      const lane = Math.floor(Math.random() * LANE_COUNT);
      const randomChar = wrongChars[Math.floor(Math.random() * wrongChars.length)];
      
      // Don't spawn wrong letter if it's same as needed letter
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
  }, [targetWord]);

  // Check collision between car and letter
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
      setCombo(prev => prev + 1);
      createParticles(letter.x, TRACK_HEIGHT - 80, "bg-green-500");
      
      // Check if word is complete
      if (newCollected.length === targetWord.letters.length) {
        // Word completed! Boost!
        setBoosting(true);
        setShowBoostEffect(true);
        setSpeed(baseSpeed * 2);
        setWordsCompleted(prev => prev + 1);
        setScore(prev => prev + 100 * (combo + 1));
        
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        createParticles(TRACK_WIDTH / 2, TRACK_HEIGHT / 2, "bg-yellow-500", 20);
        
        setTimeout(() => {
          setBoosting(false);
          setShowBoostEffect(false);
          setSpeed(baseSpeed);
          setTargetWord(getNextWord());
        }, 2000);
      }
    } else {
      // Wrong letter - penalty
      setWrongPenalty(true);
      setSpeed(Math.max(1, baseSpeed - 1));
      setCombo(0);
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
      // Update distance
      setDistance(prev => {
        const newDist = prev + speed;
        if (newDist >= 5000) {
          setGameState("finished");
          return prev;
        }
        return newDist;
      });

      // Move letters down
      setLetters(prev => {
        const updated = prev
          .map(letter => ({ ...letter, y: letter.y + speed * 2 }))
          .filter(letter => letter.y < TRACK_HEIGHT + 50);
        
        // Check collisions
        updated.forEach(letter => {
          if (!letter.collected && checkCollision(letter.x, letter.y)) {
            letter.collected = true;
            collectLetter(letter);
          }
        });
        
        return updated.filter(l => !l.collected);
      });

      // Spawn new letters
      spawnLetters();

      // Increase difficulty over time
      if (distance > 0 && distance % 1000 < speed) {
        setBaseSpeed(prev => Math.min(prev + 0.5, 8));
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, speed, checkCollision, collectLetter, spawnLetters, distance]);

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
    if (gameState !== "playing") return;
    setCarLane(lane);
    setCarX(lane * LANE_WIDTH + (LANE_WIDTH - CAR_SIZE) / 2);
  }, [gameState]);

  const startGame = () => {
    const initialSpeed = speedSettings[selectedSpeed].base;
    setGameState("playing");
    setScore(0);
    setDistance(0);
    setSpeed(initialSpeed);
    setBaseSpeed(initialSpeed);
    setWordsCompleted(0);
    setCombo(0);
    setLetters([]);
    setCarLane(2);
    setCarX(2 * LANE_WIDTH + (LANE_WIDTH - CAR_SIZE) / 2);
    wordIndexRef.current = 0;
    setTargetWord(getNextWord());
  };

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
        
        <Card className="p-4 sm:p-8 text-center backdrop-blur-sm bg-background/80 border-primary/30">
          <motion.div
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="text-5xl sm:text-7xl mb-3 sm:mb-4">🏎️</div>
            <h2 className="text-2xl sm:text-3xl font-black mb-1 sm:mb-2 bg-gradient-to-r from-blue-500 via-cyan-500 to-green-500 bg-clip-text text-transparent">
              Word Racing
            </h2>
            <p className="text-muted-foreground mb-4 sm:mb-6 text-sm sm:text-lg">
              단어 레이싱 / Đua xe từ vựng
            </p>
          </motion.div>
          
          <div className="text-left bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl p-3 sm:p-5 mb-4 sm:mb-6 border border-border/50">
            <p className="font-bold mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-lg">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              Cách chơi / 게임 방법
            </p>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-base text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="bg-primary/20 px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-mono">1-5</span>
                Di chuyển xe / 차량 이동
              </li>
              <li className="flex items-center gap-2">
                <span className="bg-green-500/20 px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs text-green-600">✓</span>
                Thu thập đúng chữ = +điểm
              </li>
              <li className="flex items-center gap-2">
                <span className="bg-red-500/20 px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs text-red-600">✗</span>
                Chữ sai = giảm tốc
              </li>
              <li className="mt-2 sm:mt-3 text-foreground font-medium flex items-center gap-2">
                <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />
                Hoàn thành từ = BOOST! 🚀
              </li>
            </ul>
          </div>

          {/* Speed selector */}
          <div className="mb-4 sm:mb-6">
            <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">🏎️ Tốc độ / 속도</p>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {(Object.keys(speedSettings) as Array<keyof typeof speedSettings>).map((key) => (
                <Button
                  key={key}
                  variant={selectedSpeed === key ? "default" : "outline"}
                  onClick={() => setSelectedSpeed(key)}
                  size="sm"
                  className={`text-[10px] sm:text-sm px-2 sm:px-4 py-2 h-auto ${
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

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button onClick={startGame} size="lg" className={`gap-2 text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 w-full sm:w-auto bg-gradient-to-r ${speedSettings[selectedSpeed].color} hover:opacity-90`}>
              <Play className="w-5 h-5 sm:w-6 sm:h-6" />
              Bắt đầu / 시작
            </Button>
          </motion.div>
        </Card>
      </motion.div>
    );
  }

  // Finished screen
  if (gameState === "finished") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md mx-auto"
      >
        <Card className="p-4 sm:p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/4 left-1/4 w-24 sm:w-32 h-24 sm:h-32 bg-yellow-500/20 rounded-full blur-2xl animate-pulse" />
          </div>
          
          <motion.div
            initial={{ rotate: -180, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <Trophy className="w-14 h-14 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
          </motion.div>
          <h2 className="text-2xl sm:text-3xl font-black mb-3 sm:mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            레이스 완료!
          </h2>
          <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
            <motion.p 
              className="text-4xl sm:text-5xl font-black text-primary"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
            >
              {score}점
            </motion.p>
            <div className="flex justify-center gap-4 text-sm sm:text-base text-muted-foreground">
              <div className="flex items-center gap-1">
                <Car className="w-4 h-4 text-blue-400" />
                <span>{wordsCompleted} từ / 단어</span>
              </div>
            </div>
          </div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button onClick={() => { onComplete(score, wordsCompleted); }} size="lg" className="gap-2 text-base sm:text-lg px-6 sm:px-8 w-full sm:w-auto">
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
              완료 / Hoàn thành
            </Button>
          </motion.div>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 sm:gap-4 w-full max-w-md mx-auto px-2 sm:px-0">
      {/* Stats */}
      <div className="w-full max-w-[320px] flex justify-between items-center mb-1 sm:mb-2">
        <div className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-amber-500/30">
          <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
          <span className="font-bold text-lg sm:text-xl text-amber-400">{score}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {combo >= 3 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1 bg-gradient-to-r from-orange-500/20 to-red-500/20 px-2 sm:px-3 py-1 sm:py-2 rounded-lg sm:rounded-xl border border-orange-500/30"
            >
              <Flame className="w-3 h-3 sm:w-4 sm:h-4 text-orange-400" />
              <span className="font-bold text-sm sm:text-base text-orange-400">{combo}x</span>
            </motion.div>
          )}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => setGameState(gameState === "paused" ? "playing" : "paused")}
          className="border-primary/30 w-8 h-8 sm:w-10 sm:h-10"
        >
          {gameState === "paused" ? <Play className="w-3 h-3 sm:w-4 sm:h-4" /> : <Pause className="w-3 h-3 sm:w-4 sm:h-4" />}
        </Button>
      </div>

      {/* Target Word */}
      {targetWord && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[320px]"
        >
          <Card className={`p-2.5 sm:p-4 text-center transition-all ${boosting ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/50' : 'bg-card'}`}>
            <p className="text-[10px] sm:text-sm text-muted-foreground mb-1">목표 단어 / Từ mục tiêu</p>
            <div className="flex justify-center gap-0.5 sm:gap-1 text-lg sm:text-2xl font-bold">
              {targetWord.letters.map((letter, idx) => (
                <motion.span
                  key={idx}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center rounded-md sm:rounded-lg text-sm sm:text-base ${
                    idx < targetWord.collectedLetters.length
                      ? "bg-green-500 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {idx < targetWord.collectedLetters.length ? letter : "?"}
                </motion.span>
              ))}
            </div>
            <p className="text-[10px] sm:text-sm text-muted-foreground mt-1 sm:mt-2 line-clamp-1">{targetWord.meaning}</p>
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
              key={i}
              className="absolute top-0 bottom-0 w-1 bg-yellow-500/30"
              style={{ left: (i + 1) * LANE_WIDTH - 2 }}
              animate={{ backgroundPositionY: [0, 40] }}
              transition={{ duration: 0.5 / speed, repeat: Infinity, ease: "linear" }}
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
              key={p.id}
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
          {/* Car body */}
          <div className={`w-full h-full rounded-lg ${boosting ? 'bg-gradient-to-b from-yellow-400 to-orange-500' : 'bg-gradient-to-b from-blue-500 to-blue-700'} shadow-lg relative`}>
            {/* Windshield */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-6 h-4 bg-cyan-300/50 rounded-sm" />
            {/* Wheels */}
            <div className="absolute -left-1 top-1 w-2 h-4 bg-slate-900 rounded-full" />
            <div className="absolute -right-1 top-1 w-2 h-4 bg-slate-900 rounded-full" />
            <div className="absolute -left-1 bottom-1 w-2 h-4 bg-slate-900 rounded-full" />
            <div className="absolute -right-1 bottom-1 w-2 h-4 bg-slate-900 rounded-full" />
          </div>
          
          {/* Boost flames */}
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

        {/* Boost effect overlay */}
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
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl font-black text-yellow-400"
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: [0, 1.2, 1], rotate: [0, 5, 0] }}
              >
                🚀 BOOST!
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Speed lines when boosting */}
        {boosting && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 10 }).map((_, i) => (
              <motion.div
                key={`speed-${i}`}
                className="absolute w-0.5 h-20 bg-white/30"
                style={{ left: Math.random() * TRACK_WIDTH }}
                animate={{ y: [-100, TRACK_HEIGHT + 100] }}
                transition={{
                  duration: 0.3,
                  repeat: Infinity,
                  delay: i * 0.05,
                }}
              />
            ))}
          </div>
        )}

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-slate-700">
          <motion.div
            className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
            style={{ width: `${(distance / 5000) * 100}%` }}
          />
        </div>
      </div>

      {/* Lane Touch Controls */}
      <div className="flex gap-1 w-full max-w-[320px] mt-1 sm:mt-2">
        {Array.from({ length: LANE_COUNT }).map((_, lane) => (
          <motion.button
            key={lane}
            whileTap={{ scale: 0.9, backgroundColor: "hsl(var(--primary))" }}
            onClick={() => handleTouchMove(lane)}
            className={`flex-1 py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base transition-all active:scale-95 ${
              carLane === lane
                ? "bg-primary text-primary-foreground shadow-lg scale-105"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            {lane + 1}
          </motion.button>
        ))}
      </div>

      {/* Pause Overlay */}
      <AnimatePresence>
        {gameState === "paused" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center z-50"
            onClick={() => setGameState("playing")}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <Card className="p-10 text-center">
                <Pause className="w-20 h-20 mx-auto mb-4 text-primary" />
                <h2 className="text-3xl font-black mb-2">Tạm dừng</h2>
                <p className="text-xl text-muted-foreground">일시정지</p>
                <p className="text-muted-foreground mt-4">Nhấn để tiếp tục / 터치하여 계속</p>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
