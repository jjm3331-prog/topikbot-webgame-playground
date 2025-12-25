import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Play, 
  RotateCcw, 
  Trophy, 
  Flame,
  Zap,
  Link2,
  Sparkles,
  Send,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Users,
  Swords
} from "lucide-react";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import ChainReactionMultiplayer from "./ChainReactionMultiplayer";

interface Word {
  id: number;
  korean: string;
  meaning: string;
}

interface WordChainReactionProps {
  words: Word[];
  onComplete: (score: number, chainLength: number) => void;
}

interface ChainWord {
  word: string;
  meaning?: string;
  connectionType: "semantic" | "phonetic" | "start";
}

export default function WordChainReaction({ words, onComplete }: WordChainReactionProps) {
  const [gameState, setGameState] = useState<"ready" | "playing" | "finished" | "multiplayer">("ready");
  const [timeLeft, setTimeLeft] = useState(60);
  const [chain, setChain] = useState<ChainWord[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [score, setScore] = useState(0);
  const [isValidating, setIsValidating] = useState(false);
  const [connectionMode, setConnectionMode] = useState<"semantic" | "phonetic">("semantic");
  const [error, setError] = useState<string | null>(null);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number }[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // Create particle effect
  const createParticles = useCallback((count: number = 8) => {
    const newParticles = Array.from({ length: count }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 300,
      y: Math.random() * 100,
    }));
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 800);
  }, []);

  // Calculate exponential score
  const calculateScore = (chainLength: number) => {
    return Math.floor(10 * Math.pow(2, chainLength - 1));
  };

  // Validate word connection
  const validateConnection = async (newWord: string, previousWord: string, mode: "semantic" | "phonetic") => {
    if (mode === "phonetic") {
      // 끝말잇기 규칙: 이전 단어의 마지막 글자로 시작
      const lastChar = previousWord.charAt(previousWord.length - 1);
      
      // 두음법칙 처리
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
      // 의미적 연결: AI로 검증
      try {
        const { data, error } = await supabase.functions.invoke("chain-validate", {
          body: { previousWord, newWord, mode: "semantic" }
        });
        
        if (error) throw error;
        return data.isValid;
      } catch (err) {
        console.error("Validation error:", err);
        // Fallback: allow it but show warning
        return true;
      }
    }
  };

  // Handle word submission
  const handleSubmit = async () => {
    if (!currentInput.trim() || isValidating) return;
    
    const newWord = currentInput.trim();
    setError(null);
    
    // Check if word already in chain
    if (chain.some(c => c.word === newWord)) {
      setError("이미 사용한 단어예요! / Từ đã dùng rồi!");
      return;
    }
    
    // If first word, just add it
    if (chain.length === 0) {
      setChain([{ word: newWord, connectionType: "start" }]);
      setCurrentInput("");
      createParticles(5);
      return;
    }
    
    // Validate connection
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
      createParticles(Math.min(newChainLength * 3, 20));
      
      // Big chain bonus effects
      if (newChainLength >= 5) {
        confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
      }
      if (newChainLength >= 10) {
        confetti({ particleCount: 80, spread: 100 });
      }
    } else {
      if (connectionMode === "phonetic") {
        const lastChar = previousWord.charAt(previousWord.length - 1);
        setError(`'${lastChar}'로 시작해야 해요! / Phải bắt đầu bằng '${lastChar}'!`);
      } else {
        setError("의미적으로 연결되지 않아요! / Không liên kết về nghĩa!");
      }
    }
    
    inputRef.current?.focus();
  };

  // Timer effect
  useEffect(() => {
    if (gameState !== "playing") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameState("finished");
          if (chain.length >= 5) {
            confetti({ particleCount: 100, spread: 70 });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, chain.length]);

  // Auto-focus input when playing
  useEffect(() => {
    if (gameState === "playing") {
      inputRef.current?.focus();
    }
  }, [gameState]);

  const startGame = () => {
    setGameState("playing");
    setTimeLeft(60);
    setChain([]);
    setScore(0);
    setCurrentInput("");
    setError(null);
    
    // Start with a random word from vocabulary
    if (words.length > 0) {
      const startWord = words[Math.floor(Math.random() * words.length)];
      setChain([{ word: startWord.korean, meaning: startWord.meaning, connectionType: "start" }]);
    }
  };

  // Multiplayer mode - must be after all hooks
  if (gameState === "multiplayer") {
    return (
      <ChainReactionMultiplayer 
        words={words} 
        onBack={() => setGameState("ready")} 
      />
    );
  }

  // Ready screen
  if (gameState === "ready") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative"
      >
        <div className="absolute inset-0 -z-10 overflow-hidden rounded-2xl">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-red-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>
        
        <Card className="p-8 text-center backdrop-blur-sm bg-background/80 border-primary/30">
          <motion.div
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="text-7xl mb-4">⛓️💥</div>
            <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent">
              Word Chain Reaction
            </h2>
            <p className="text-muted-foreground mb-6 text-lg">
              단어 체인 리액션 / Chuỗi phản ứng từ vựng
            </p>
          </motion.div>
          
          <div className="text-left bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl p-5 mb-6 border border-border/50">
            <p className="font-bold mb-3 flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-primary" />
              Cách chơi / 게임 방법
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="bg-orange-500/20 px-2 py-0.5 rounded text-xs text-orange-600">30초</span>
                Thời gian giới hạn / 제한 시간
              </li>
              <li className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-blue-500" />
                Kết nối từ theo nghĩa hoặc âm / 의미 또는 끝말잇기
              </li>
              <li className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                Chuỗi càng dài = điểm tăng theo cấp số nhân!
              </li>
              <li className="mt-3 text-foreground font-medium">
                📈 체인 길이별 점수: 10 → 20 → 40 → 80 → 160...
              </li>
            </ul>
          </div>

          {/* Connection mode selector */}
          <div className="flex justify-center gap-4 mb-6">
            <Button
              variant={connectionMode === "semantic" ? "default" : "outline"}
              onClick={() => setConnectionMode("semantic")}
              className="gap-2"
            >
              <Link2 className="w-4 h-4" />
              의미 연결 / Nghĩa
            </Button>
            <Button
              variant={connectionMode === "phonetic" ? "default" : "outline"}
              onClick={() => setConnectionMode("phonetic")}
              className="gap-2"
            >
              <ToggleRight className="w-4 h-4" />
              끝말잇기
            </Button>
          </div>

          {/* Game mode buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button onClick={startGame} size="lg" className="gap-2 text-lg px-8 py-6 bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90 w-full">
                <Play className="w-6 h-6" />
                혼자하기 / Solo
              </Button>
            </motion.div>
            
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                onClick={() => setGameState("multiplayer")} 
                size="lg" 
                variant="outline"
                className="gap-2 text-lg px-8 py-6 border-2 border-purple-500/50 hover:bg-purple-500/10 w-full"
              >
                <Swords className="w-6 h-6 text-purple-500" />
                <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent font-bold">
                  1:1 대결
                </span>
              </Button>
            </motion.div>
          </div>
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
      >
        <Card className="p-4 sm:p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-yellow-500/20 rounded-full blur-2xl animate-pulse" />
          </div>
          
          <motion.div
            initial={{ rotate: -180, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <Trophy className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
          </motion.div>
          <h2 className="text-2xl sm:text-3xl font-black mb-3 sm:mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            체인 완료!
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
                <Link2 className="w-4 h-4 text-orange-400" />
                <span>{chain.length} 체인 / chuỗi</span>
              </div>
            </div>
            
            {/* Show chain */}
            <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-muted/50 rounded-xl max-h-32 sm:max-h-40 overflow-y-auto">
              <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center">
                {chain.map((item, idx) => (
                  <span key={idx} className="flex items-center gap-0.5 sm:gap-1">
                    <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-primary/20 rounded-lg text-xs sm:text-sm font-medium">
                      {item.word}
                    </span>
                    {idx < chain.length - 1 && (
                      <span className="text-muted-foreground text-xs sm:text-base">→</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button 
                onClick={startGame} 
                size="lg" 
                className="gap-2 text-base sm:text-lg px-6 sm:px-8 w-full sm:w-auto bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90"
              >
                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                다시하기 / Chơi lại
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button 
                onClick={() => onComplete(score, chain.length)} 
                size="lg" 
                variant="outline"
                className="gap-2 text-base sm:text-lg px-6 sm:px-8 w-full sm:w-auto"
              >
                완료 / Hoàn thành
              </Button>
            </motion.div>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4 relative">
      {/* Particles */}
      <AnimatePresence>
        {particles.map(p => (
          <motion.div
            key={p.id}
            className="absolute w-3 h-3 rounded-full bg-orange-500"
            initial={{ x: p.x, y: p.y, scale: 1, opacity: 1 }}
            animate={{ 
              y: p.y - 100,
              scale: 0,
              opacity: 0
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          />
        ))}
      </AnimatePresence>

      {/* Timer & Score */}
      <div className="flex justify-between items-center">
        <motion.div 
          className={`text-4xl font-black ${timeLeft <= 10 ? "text-red-500 animate-pulse" : "text-foreground"}`}
          animate={timeLeft <= 10 ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 0.5, repeat: timeLeft <= 10 ? Infinity : 0 }}
        >
          ⏱️ {timeLeft}s
        </motion.div>
        
        <div className="text-right">
          <motion.div 
            className="text-3xl font-black text-primary"
            animate={{ scale: score > 0 ? [1, 1.1, 1] : 1 }}
            transition={{ duration: 0.2 }}
          >
            {score}점
          </motion.div>
          <div className="text-sm text-muted-foreground flex items-center gap-1 justify-end">
            <Link2 className="w-4 h-4" />
            {chain.length} 체인
          </div>
        </div>
      </div>

      {/* Current mode indicator */}
      <div className="flex justify-center">
        <div className={`px-4 py-2 rounded-full text-sm font-medium ${
          connectionMode === "semantic" 
            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" 
            : "bg-orange-500/20 text-orange-400 border border-orange-500/30"
        }`}>
          {connectionMode === "semantic" ? "🔗 의미 연결 모드" : "🔤 끝말잇기 모드"}
        </div>
      </div>

      {/* Chain display */}
      <Card className="p-4 bg-gradient-to-br from-card to-muted/30">
        <div className="min-h-[100px] max-h-[200px] overflow-y-auto">
          <div className="flex flex-wrap gap-2 items-center justify-center">
            {chain.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                className="flex items-center gap-1"
              >
                <div className={`px-3 py-2 rounded-xl font-bold ${
                  idx === 0 
                    ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white" 
                    : item.connectionType === "phonetic"
                      ? "bg-gradient-to-r from-orange-500 to-red-500 text-white"
                      : "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                }`}>
                  {item.word}
                </div>
                {idx < chain.length - 1 && (
                  <motion.span 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xl"
                  >
                    →
                  </motion.span>
                )}
              </motion.div>
            ))}
            
            {/* Next position indicator */}
            <motion.div
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="px-3 py-2 rounded-xl border-2 border-dashed border-primary/50 text-primary/50 font-bold"
            >
              ?
            </motion.div>
          </div>
        </div>
        
        {/* Chain length score preview */}
        {chain.length > 0 && (
          <div className="mt-3 text-center text-sm text-muted-foreground">
            다음 단어: +{calculateScore(chain.length + 1)}점
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
              ? `'${chain[chain.length - 1].word.slice(-1)}'로 시작하는 단어...`
              : "연결할 단어를 입력하세요..."
          }
          className="text-lg py-6"
          disabled={isValidating}
        />
        <Button 
          onClick={handleSubmit} 
          size="lg" 
          disabled={!currentInput.trim() || isValidating}
          className="px-6"
        >
          {isValidating ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-center text-sm"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mode switch during game */}
      <div className="flex justify-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConnectionMode("semantic")}
          className={connectionMode === "semantic" ? "bg-blue-500/20" : ""}
        >
          의미 연결
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConnectionMode("phonetic")}
          className={connectionMode === "phonetic" ? "bg-orange-500/20" : ""}
        >
          끝말잇기
        </Button>
      </div>
    </div>
  );
}
