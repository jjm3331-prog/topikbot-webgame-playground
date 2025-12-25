import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Trophy, 
  Flame, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Zap,
  Sparkles,
  Star
} from "lucide-react";
import { toast } from "sonner";

type TopikLevel = "1-2" | "3-4" | "5-6";

// 문장 성분 타입
type BlockType = "subject" | "object" | "verb" | "adverb" | "connector" | "ending";

interface Block {
  id: string;
  text: string;
  type: BlockType;
  col: number;
  row: number;
  isSpecial?: boolean;
}

interface Sentence {
  parts: { text: string; type: BlockType }[];
  meaning_vi: string;
  meaning_ko: string;
}

// 레벨별 문장 데이터
const SENTENCES: Record<TopikLevel, Sentence[]> = {
  "1-2": [
    { parts: [{ text: "저는", type: "subject" }, { text: "밥을", type: "object" }, { text: "먹어요", type: "verb" }], meaning_vi: "Tôi ăn cơm", meaning_ko: "나는 밥을 먹어요" },
    { parts: [{ text: "친구가", type: "subject" }, { text: "학교에", type: "adverb" }, { text: "가요", type: "verb" }], meaning_vi: "Bạn đi học", meaning_ko: "친구가 학교에 가요" },
    { parts: [{ text: "엄마가", type: "subject" }, { text: "요리를", type: "object" }, { text: "해요", type: "verb" }], meaning_vi: "Mẹ nấu ăn", meaning_ko: "엄마가 요리를 해요" },
    { parts: [{ text: "오빠가", type: "subject" }, { text: "책을", type: "object" }, { text: "읽어요", type: "verb" }], meaning_vi: "Anh đọc sách", meaning_ko: "오빠가 책을 읽어요" },
    { parts: [{ text: "언니가", type: "subject" }, { text: "노래를", type: "object" }, { text: "불러요", type: "verb" }], meaning_vi: "Chị hát", meaning_ko: "언니가 노래를 불러요" },
  ],
  "3-4": [
    { parts: [{ text: "학생들이", type: "subject" }, { text: "열심히", type: "adverb" }, { text: "공부해요", type: "verb" }], meaning_vi: "Các học sinh học chăm chỉ", meaning_ko: "학생들이 열심히 공부해요" },
    { parts: [{ text: "회사에서", type: "adverb" }, { text: "일을", type: "object" }, { text: "하고", type: "connector" }, { text: "집에", type: "adverb" }, { text: "가요", type: "verb" }], meaning_vi: "Làm việc ở công ty rồi về nhà", meaning_ko: "회사에서 일하고 집에 가요" },
    { parts: [{ text: "날씨가", type: "subject" }, { text: "좋으면", type: "connector" }, { text: "산책해요", type: "verb" }], meaning_vi: "Nếu thời tiết đẹp thì đi dạo", meaning_ko: "날씨가 좋으면 산책해요" },
  ],
  "5-6": [
    { parts: [{ text: "경제가", type: "subject" }, { text: "어려워서", type: "connector" }, { text: "취업이", type: "subject" }, { text: "힘들어요", type: "verb" }], meaning_vi: "Vì kinh tế khó khăn nên tìm việc vất vả", meaning_ko: "경제가 어려워서 취업이 힘들어요" },
    { parts: [{ text: "환경을", type: "object" }, { text: "보호하기", type: "adverb" }, { text: "위해서", type: "connector" }, { text: "노력해야", type: "verb" }, { text: "합니다", type: "ending" }], meaning_vi: "Phải nỗ lực để bảo vệ môi trường", meaning_ko: "환경을 보호하기 위해서 노력해야 합니다" },
  ],
};

// 블록 색상 - 그라데이션과 글로우 효과
const BLOCK_STYLES: Record<BlockType, { gradient: string; glow: string; ring: string }> = {
  subject: { 
    gradient: "from-rose-500 via-pink-500 to-rose-600", 
    glow: "shadow-[0_0_20px_rgba(244,63,94,0.6)]",
    ring: "ring-rose-400/50"
  },
  object: { 
    gradient: "from-amber-400 via-orange-500 to-amber-600", 
    glow: "shadow-[0_0_20px_rgba(251,146,60,0.6)]",
    ring: "ring-amber-400/50"
  },
  verb: { 
    gradient: "from-emerald-400 via-green-500 to-emerald-600", 
    glow: "shadow-[0_0_20px_rgba(34,197,94,0.6)]",
    ring: "ring-emerald-400/50"
  },
  adverb: { 
    gradient: "from-violet-400 via-purple-500 to-violet-600", 
    glow: "shadow-[0_0_20px_rgba(168,85,247,0.6)]",
    ring: "ring-violet-400/50"
  },
  connector: { 
    gradient: "from-cyan-400 via-teal-500 to-cyan-600", 
    glow: "shadow-[0_0_25px_rgba(34,211,238,0.7)]",
    ring: "ring-cyan-400/50"
  },
  ending: { 
    gradient: "from-fuchsia-400 via-pink-500 to-fuchsia-600", 
    glow: "shadow-[0_0_25px_rgba(232,121,249,0.7)]",
    ring: "ring-fuchsia-400/50"
  },
};

const BLOCK_LABELS: Record<BlockType, { vi: string; ko: string }> = {
  subject: { vi: "Chủ ngữ", ko: "주어" },
  object: { vi: "Tân ngữ", ko: "목적어" },
  verb: { vi: "Động từ", ko: "동사" },
  adverb: { vi: "Trạng từ", ko: "부사" },
  connector: { vi: "Liên kết", ko: "연결어미" },
  ending: { vi: "Kết thúc", ko: "종결어미" },
};

const COLS = 5;
const ROWS = 7;

interface GrammarTetrisProps {
  level: TopikLevel;
}

// 파티클 컴포넌트
const Particles = ({ x, y, color }: { x: number; y: number; color: string }) => {
  return (
    <>
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className={`absolute w-2 h-2 rounded-full ${color}`}
          initial={{ 
            x, 
            y, 
            scale: 1, 
            opacity: 1 
          }}
          animate={{ 
            x: x + (Math.random() - 0.5) * 150,
            y: y + (Math.random() - 0.5) * 150,
            scale: 0,
            opacity: 0
          }}
          transition={{ 
            duration: 0.8, 
            ease: "easeOut" 
          }}
        />
      ))}
    </>
  );
};

export default function GrammarTetris({ level }: GrammarTetrisProps) {
  const [gameState, setGameState] = useState<"ready" | "playing" | "paused" | "finished">("ready");
  const [board, setBoard] = useState<(Block | null)[][]>(
    Array.from({ length: ROWS }, () => Array(COLS).fill(null))
  );
  const [currentBlock, setCurrentBlock] = useState<Block | null>(null);
  const [nextBlocks, setNextBlocks] = useState<Block[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [linesCleared, setLinesCleared] = useState(0);
  const [currentSentence, setCurrentSentence] = useState<Sentence | null>(null);
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [blockQueue, setBlockQueue] = useState<{ text: string; type: BlockType }[]>([]);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string }[]>([]);
  const [showCombo, setShowCombo] = useState(false);
  
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const dropSpeedRef = useRef(1000);

  // 파티클 생성
  const createParticles = useCallback((x: number, y: number, color: string) => {
    const id = Date.now();
    setParticles(prev => [...prev, { id, x, y, color }]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== id));
    }, 1000);
  }, []);

  // 새 문장 시작
  const startNewSentence = useCallback(() => {
    const sentences = SENTENCES[level];
    const sentence = sentences[sentenceIndex % sentences.length];
    setCurrentSentence(sentence);
    
    // 블록 큐 생성 (랜덤 순서)
    const shuffled = [...sentence.parts].sort(() => Math.random() - 0.5);
    setBlockQueue(shuffled);
    setSentenceIndex((prev) => prev + 1);
  }, [level, sentenceIndex]);

  // 다음 블록 생성
  const spawnNextBlock = useCallback(() => {
    if (blockQueue.length === 0) {
      startNewSentence();
      return;
    }

    const nextPart = blockQueue[0];
    const newBlock: Block = {
      id: crypto.randomUUID(),
      text: nextPart.text,
      type: nextPart.type,
      col: Math.floor(COLS / 2),
      row: 0,
      isSpecial: nextPart.type === "connector" || nextPart.type === "ending",
    };

    setBlockQueue((prev) => prev.slice(1));
    setCurrentBlock(newBlock);
    
    // Next preview 업데이트
    const upcoming = blockQueue.slice(1, 4).map((p, i) => ({
      id: `next-${i}`,
      text: p.text,
      type: p.type,
      col: 0,
      row: 0,
    }));
    setNextBlocks(upcoming);
  }, [blockQueue, startNewSentence]);

  // 블록 이동
  const moveBlock = useCallback((direction: "left" | "right" | "down") => {
    if (!currentBlock || gameState !== "playing") return;

    setCurrentBlock((prev) => {
      if (!prev) return null;
      
      let newCol = prev.col;
      let newRow = prev.row;

      if (direction === "left" && prev.col > 0) {
        newCol = prev.col - 1;
      } else if (direction === "right" && prev.col < COLS - 1) {
        newCol = prev.col + 1;
      } else if (direction === "down") {
        newRow = prev.row + 1;
      }

      // 충돌 체크
      if (newRow >= ROWS || (newRow >= 0 && board[newRow]?.[newCol])) {
        if (direction === "down") {
          // 블록 고정
          placeBlock(prev);
          return null;
        }
        return prev;
      }

      return { ...prev, col: newCol, row: newRow };
    });
  }, [currentBlock, gameState, board]);

  // 블록 고정
  const placeBlock = useCallback((block: Block) => {
    if (block.row < 0) {
      // 게임 오버
      setGameState("finished");
      return;
    }

    setBoard((prev) => {
      const newBoard = prev.map((row) => [...row]);
      if (block.row >= 0 && block.row < ROWS && block.col >= 0 && block.col < COLS) {
        newBoard[block.row][block.col] = block;
      }
      return newBoard;
    });

    // 파티클 효과
    createParticles(150 + block.col * 60, 50 + block.row * 60, "bg-white");

    // 줄 체크
    setTimeout(() => checkLines(), 100);
  }, [createParticles]);

  // 줄 클리어 체크
  const checkLines = useCallback(() => {
    if (!currentSentence) return;

    setBoard((prev) => {
      const newBoard = [...prev];
      let cleared = 0;

      // 각 행 체크
      for (let row = ROWS - 1; row >= 0; row--) {
        const rowBlocks = newBoard[row].filter((b): b is Block => b !== null);
        
        if (rowBlocks.length >= 3) {
          // 어순 검증
          const rowText = rowBlocks.map((b) => b.text).join(" ");
          const correctText = currentSentence.parts.map((p) => p.text).join(" ");
          
          // 부분 매칭 체크 (연속된 올바른 순서)
          const isPartialMatch = checkPartialMatch(rowBlocks, currentSentence.parts);
          
          if (isPartialMatch) {
            // 줄 클리어!
            cleared++;
            newBoard[row] = Array(COLS).fill(null);
            
            // 파티클 효과 추가
            for (let i = 0; i < 5; i++) {
              createParticles(150 + i * 60, 50 + row * 60, "bg-primary");
            }
            
            // 위의 블록들 내리기
            for (let r = row - 1; r >= 0; r--) {
              newBoard[r + 1] = [...newBoard[r]];
            }
            newBoard[0] = Array(COLS).fill(null);
            
            toast.success(
              `🎉 줄 클리어! / Xóa dòng!\n${rowText}`,
              { duration: 2000 }
            );
          }
        }
      }

      if (cleared > 0) {
        const comboBonus = combo * 20;
        const lineBonus = cleared * 100;
        const total = lineBonus + comboBonus;
        
        setScore((s) => s + total);
        setCombo((c) => c + 1);
        setLinesCleared((l) => l + cleared);
        
        if (combo >= 1) {
          setShowCombo(true);
          setTimeout(() => setShowCombo(false), 1500);
        }
        
        if (cleared >= 2) {
          toast.success(`🔥 멀티 클리어! +${total}점`, { duration: 1500 });
        }
      } else {
        setCombo(0);
      }

      return newBoard;
    });

    // 다음 블록
    setTimeout(() => spawnNextBlock(), 200);
  }, [currentSentence, combo, spawnNextBlock, createParticles]);

  // 부분 매칭 체크
  const checkPartialMatch = (rowBlocks: Block[], parts: { text: string; type: BlockType }[]) => {
    const rowTexts = rowBlocks.map((b) => b.text);
    const partTexts = parts.map((p) => p.text);

    // 연속된 올바른 순서인지 체크
    let partIndex = 0;
    for (const text of rowTexts) {
      if (partTexts[partIndex] === text) {
        partIndex++;
      }
    }

    return partIndex >= 2; // 최소 2개 이상 연속 매칭
  };

  // 하드 드롭
  const hardDrop = useCallback(() => {
    if (!currentBlock || gameState !== "playing") return;

    let dropRow = currentBlock.row;
    while (dropRow < ROWS - 1 && !board[dropRow + 1]?.[currentBlock.col]) {
      dropRow++;
    }

    const droppedBlock = { ...currentBlock, row: dropRow };
    placeBlock(droppedBlock);
    setCurrentBlock(null);
  }, [currentBlock, gameState, board, placeBlock]);

  // 키보드 컨트롤
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== "playing") return;

      switch (e.key) {
        case "ArrowLeft":
          moveBlock("left");
          break;
        case "ArrowRight":
          moveBlock("right");
          break;
        case "ArrowDown":
          moveBlock("down");
          break;
        case " ":
          e.preventDefault();
          hardDrop();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [moveBlock, hardDrop, gameState]);

  // 게임 루프
  useEffect(() => {
    if (gameState !== "playing") {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }

    gameLoopRef.current = setInterval(() => {
      moveBlock("down");
    }, dropSpeedRef.current);

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameState, moveBlock]);

  // 블록이 없으면 새 블록 생성
  useEffect(() => {
    if (gameState === "playing" && !currentBlock && blockQueue.length >= 0) {
      spawnNextBlock();
    }
  }, [gameState, currentBlock, spawnNextBlock, blockQueue.length]);

  // 게임 시작
  const startGame = () => {
    setBoard(Array.from({ length: ROWS }, () => Array(COLS).fill(null)));
    setScore(0);
    setCombo(0);
    setLinesCleared(0);
    setSentenceIndex(0);
    setCurrentBlock(null);
    setNextBlocks([]);
    setBlockQueue([]);
    dropSpeedRef.current = 1000;
    
    startNewSentence();
    setGameState("playing");
  };

  // Ready 화면
  if (gameState === "ready") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative"
      >
        {/* 배경 효과 */}
        <div className="absolute inset-0 -z-10 overflow-hidden rounded-2xl">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-accent/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>
        
        <Card className="p-8 text-center backdrop-blur-sm bg-background/80 border-primary/30">
          <motion.div
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="text-7xl mb-4 drop-shadow-2xl">🧱</div>
            <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Grammar Tetris
            </h2>
            <p className="text-muted-foreground mb-6 text-lg">
              문법 테트리스 / Xếp hình ngữ pháp
            </p>
          </motion.div>
          
          <div className="text-left bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl p-5 mb-6 border border-border/50">
            <p className="font-bold mb-3 flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-primary" />
              Cách chơi / 게임 방법
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="bg-primary/20 px-2 py-0.5 rounded text-xs font-mono">← →</span>
                Di chuyển / 이동
              </li>
              <li className="flex items-center gap-2">
                <span className="bg-primary/20 px-2 py-0.5 rounded text-xs font-mono">↓</span>
                Rơi nhanh / 빠르게
              </li>
              <li className="flex items-center gap-2">
                <span className="bg-primary/20 px-2 py-0.5 rounded text-xs font-mono">Space</span>
                Rơi ngay / 즉시 낙하
              </li>
              <li className="mt-3 text-foreground font-medium">
                ✨ Xếp đúng thứ tự ngữ pháp để xóa dòng!
              </li>
              <li className="text-foreground font-medium">
                ✨ 올바른 어순으로 배치하면 줄 클리어!
              </li>
            </ul>
          </div>
          
          {/* 블록 타입 설명 */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {Object.entries(BLOCK_LABELS).map(([type, labels]) => (
              <motion.div
                key={type}
                whileHover={{ scale: 1.05 }}
                className={`
                  p-2 rounded-lg bg-gradient-to-r ${BLOCK_STYLES[type as BlockType].gradient}
                  ${BLOCK_STYLES[type as BlockType].glow}
                  text-white text-xs font-medium text-center
                `}
              >
                <div>{labels.ko}</div>
                <div className="opacity-80 text-[10px]">{labels.vi}</div>
              </motion.div>
            ))}
          </div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button onClick={startGame} size="lg" className="gap-2 text-lg px-8 py-6 bg-gradient-to-r from-primary to-accent hover:opacity-90">
              <Play className="w-6 h-6" />
              Bắt đầu / 시작
            </Button>
          </motion.div>
        </Card>
      </motion.div>
    );
  }

  // Finished 화면
  if (gameState === "finished") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <Card className="p-8 text-center relative overflow-hidden">
          {/* 배경 효과 */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-yellow-500/20 rounded-full blur-2xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-primary/20 rounded-full blur-2xl animate-pulse delay-500" />
          </div>
          
          <motion.div
            initial={{ rotate: -180, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <Trophy className="w-20 h-20 mx-auto mb-4 text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
          </motion.div>
          <h2 className="text-3xl font-black mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            Game Over!
          </h2>
          <div className="space-y-3 mb-6">
            <motion.p 
              className="text-5xl font-black text-primary"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
            >
              {score}점
            </motion.p>
            <div className="flex justify-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-amber-400" />
                <span>{linesCleared} dòng / 줄</span>
              </div>
            </div>
          </div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button onClick={startGame} size="lg" className="gap-2 text-lg px-8">
              <RotateCcw className="w-5 h-5" />
              Thử lại / 다시 도전
            </Button>
          </motion.div>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4 relative">
      {/* 파티클 */}
      <AnimatePresence>
        {particles.map(p => (
          <Particles key={p.id} x={p.x} y={p.y} color={p.color} />
        ))}
      </AnimatePresence>

      {/* 콤보 표시 */}
      <AnimatePresence>
        {showCombo && combo >= 2 && (
          <motion.div
            initial={{ scale: 0, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0, y: -50 }}
            className="absolute top-1/3 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="bg-gradient-to-r from-orange-500 to-red-500 px-8 py-4 rounded-2xl shadow-[0_0_30px_rgba(249,115,22,0.6)]">
              <p className="text-3xl font-black text-white flex items-center gap-2">
                <Flame className="w-8 h-8" />
                {combo}x COMBO!
                <Flame className="w-8 h-8" />
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div 
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-4 py-2 rounded-xl border border-amber-500/30"
            animate={{ scale: score > 0 ? [1, 1.1, 1] : 1 }}
            transition={{ duration: 0.3 }}
          >
            <Trophy className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-xl text-amber-400">{score}</span>
          </motion.div>
          
          <AnimatePresence>
            {combo > 0 && (
              <motion.div
                initial={{ scale: 0, x: -20 }}
                animate={{ scale: 1, x: 0 }}
                exit={{ scale: 0 }}
                className="flex items-center gap-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 px-4 py-2 rounded-xl border border-orange-500/30"
              >
                <Flame className="w-5 h-5 text-orange-400" />
                <span className="font-bold text-lg text-orange-400">{combo}x</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <Button
          variant="outline"
          size="icon"
          onClick={() => setGameState(gameState === "paused" ? "playing" : "paused")}
          className="border-primary/30"
        >
          {gameState === "paused" ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        </Button>
      </div>

      {/* 현재 문장 힌트 */}
      {currentSentence && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30 backdrop-blur-sm">
            <div className="text-sm font-medium text-center text-muted-foreground mb-1">
              🎯 목표 문장 / Câu mục tiêu
            </div>
            <div className="text-center">
              <span className="font-bold text-lg">{currentSentence.meaning_ko}</span>
              <span className="text-muted-foreground ml-2">
                ({currentSentence.meaning_vi})
              </span>
            </div>
          </Card>
        </motion.div>
      )}

      <div className="flex gap-4">
        {/* 게임 보드 */}
        <Card className="flex-1 p-3 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-primary/30 shadow-[0_0_30px_rgba(var(--primary),0.1)] overflow-hidden">
          {/* 그리드 라인 배경 */}
          <div className="absolute inset-0 opacity-10">
            {Array.from({ length: ROWS }).map((_, i) => (
              <div key={`row-${i}`} className="absolute w-full h-px bg-primary" style={{ top: `${(i + 1) * (100 / ROWS)}%` }} />
            ))}
            {Array.from({ length: COLS }).map((_, i) => (
              <div key={`col-${i}`} className="absolute h-full w-px bg-primary" style={{ left: `${(i + 1) * (100 / COLS)}%` }} />
            ))}
          </div>
          
          <div
            className="grid gap-1 relative"
            style={{
              gridTemplateColumns: `repeat(${COLS}, 1fr)`,
              gridTemplateRows: `repeat(${ROWS}, 1fr)`,
            }}
          >
            {board.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                // 현재 떨어지는 블록 렌더링
                const isCurrentBlock =
                  currentBlock &&
                  currentBlock.row === rowIndex &&
                  currentBlock.col === colIndex;

                const block = isCurrentBlock ? currentBlock : cell;

                return (
                  <motion.div
                    key={`${rowIndex}-${colIndex}`}
                    initial={isCurrentBlock ? { scale: 0, rotate: -180 } : false}
                    animate={isCurrentBlock ? { scale: 1, rotate: 0 } : {}}
                    className={`
                      aspect-square flex items-center justify-center font-bold rounded-lg
                      min-h-[48px] sm:min-h-[56px]
                      ${block 
                        ? `bg-gradient-to-br ${BLOCK_STYLES[block.type].gradient} ${BLOCK_STYLES[block.type].glow} text-white ring-2 ${BLOCK_STYLES[block.type].ring}` 
                        : "bg-slate-800/50 border border-slate-700/30"
                      }
                      ${block?.isSpecial ? "ring-4 ring-yellow-400/60 animate-pulse" : ""}
                      transition-all duration-200
                    `}
                  >
                    {block && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center px-1"
                      >
                        <span className="text-sm sm:text-base font-bold drop-shadow-lg truncate block">
                          {block.text}
                        </span>
                        <span className="text-[8px] sm:text-[10px] opacity-70">
                          {BLOCK_LABELS[block.type].ko}
                        </span>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
        </Card>

        {/* 사이드 패널 */}
        <div className="w-28 space-y-4">
          {/* Next 블록 */}
          <Card className="p-3 bg-gradient-to-b from-slate-900 to-slate-950 border-primary/30">
            <div className="text-xs text-center mb-2 text-primary font-bold tracking-wider">NEXT</div>
            <div className="space-y-2">
              {nextBlocks.map((block, i) => (
                <motion.div
                  key={block.id}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: i === 0 ? 1 : 0.6 }}
                  className={`
                    p-2 rounded-lg text-center text-sm font-bold text-white
                    bg-gradient-to-r ${BLOCK_STYLES[block.type].gradient}
                    ${i === 0 ? BLOCK_STYLES[block.type].glow : ""}
                  `}
                >
                  {block.text}
                </motion.div>
              ))}
            </div>
          </Card>

          {/* 클리어 카운트 */}
          <Card className="p-3 text-center bg-gradient-to-b from-slate-900 to-slate-950 border-primary/30">
            <div className="text-xs text-primary font-bold tracking-wider">LINES</div>
            <motion.div 
              className="text-3xl font-black text-white"
              animate={{ scale: linesCleared > 0 ? [1, 1.2, 1] : 1 }}
            >
              {linesCleared}
            </motion.div>
          </Card>
        </div>
      </div>

      {/* 모바일 컨트롤 */}
      <div className="flex justify-center gap-3 mt-4">
        <motion.div whileTap={{ scale: 0.9 }}>
          <Button
            variant="outline"
            size="lg"
            onClick={() => moveBlock("left")}
            className="w-16 h-16 text-2xl border-primary/30 bg-background/80 hover:bg-primary/20"
          >
            <ChevronLeft className="w-8 h-8" />
          </Button>
        </motion.div>
        <motion.div whileTap={{ scale: 0.9 }}>
          <Button
            variant="outline"
            size="lg"
            onClick={() => moveBlock("down")}
            className="w-16 h-16 text-2xl border-primary/30 bg-background/80 hover:bg-primary/20"
          >
            <ChevronDown className="w-8 h-8" />
          </Button>
        </motion.div>
        <motion.div whileTap={{ scale: 0.9 }}>
          <Button
            variant="outline"
            size="lg"
            onClick={() => moveBlock("right")}
            className="w-16 h-16 text-2xl border-primary/30 bg-background/80 hover:bg-primary/20"
          >
            <ChevronRight className="w-8 h-8" />
          </Button>
        </motion.div>
        <motion.div whileTap={{ scale: 0.9 }}>
          <Button
            size="lg"
            onClick={hardDrop}
            className="w-16 h-16 bg-gradient-to-r from-primary to-accent hover:opacity-90"
          >
            <Zap className="w-8 h-8" />
          </Button>
        </motion.div>
      </div>

      {/* 일시정지 오버레이 */}
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
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
            >
              <Card className="p-10 text-center bg-gradient-to-b from-background to-muted border-primary/30">
                <Pause className="w-20 h-20 mx-auto mb-4 text-primary drop-shadow-[0_0_15px_hsl(var(--primary))]" />
                <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Tạm dừng
                </h2>
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
