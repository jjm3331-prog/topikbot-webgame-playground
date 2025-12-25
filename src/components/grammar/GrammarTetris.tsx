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
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Zap,
  Sparkles,
  Star,
  X,
  ArrowRight,
  Target,
  Hand,
  Lightbulb
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

// 블록 색상
const BLOCK_STYLES: Record<BlockType, { gradient: string; glow: string }> = {
  subject: { gradient: "from-rose-500 to-pink-600", glow: "shadow-[0_0_12px_rgba(244,63,94,0.5)]" },
  object: { gradient: "from-amber-400 to-orange-500", glow: "shadow-[0_0_12px_rgba(251,146,60,0.5)]" },
  verb: { gradient: "from-emerald-400 to-green-500", glow: "shadow-[0_0_12px_rgba(34,197,94,0.5)]" },
  adverb: { gradient: "from-violet-400 to-purple-500", glow: "shadow-[0_0_12px_rgba(168,85,247,0.5)]" },
  connector: { gradient: "from-cyan-400 to-teal-500", glow: "shadow-[0_0_12px_rgba(34,211,238,0.5)]" },
  ending: { gradient: "from-fuchsia-400 to-pink-500", glow: "shadow-[0_0_12px_rgba(232,121,249,0.5)]" },
};

const BLOCK_LABELS: Record<BlockType, { vi: string; ko: string }> = {
  subject: { vi: "Chủ ngữ", ko: "주어" },
  object: { vi: "Tân ngữ", ko: "목적어" },
  verb: { vi: "Động từ", ko: "동사" },
  adverb: { vi: "Trạng từ", ko: "부사" },
  connector: { vi: "Liên kết", ko: "연결어미" },
  ending: { vi: "Kết thúc", ko: "종결어미" },
};

const COLS = 4;
const ROWS = 6;

interface GrammarTetrisProps {
  level: TopikLevel;
}

// 튜토리얼 단계
const TUTORIAL_STEPS = [
  {
    icon: Target,
    title: "목표 / Mục tiêu",
    description: "문장 블록을 올바른 순서로 배치하세요!\nSắp xếp các khối theo đúng thứ tự câu!"
  },
  {
    icon: Hand,
    title: "조작법 / Cách điều khiển",
    description: "← → 버튼으로 이동, ↓로 빠르게, ⚡로 즉시 낙하\nDùng ← → để di chuyển, ↓ để rơi nhanh, ⚡ để rơi ngay"
  },
  {
    icon: Sparkles,
    title: "클리어 / Xóa dòng",
    description: "한 줄에 올바른 어순이 완성되면 클리어!\nKhi một dòng hoàn thành đúng thứ tự sẽ được xóa!"
  },
  {
    icon: Lightbulb,
    title: "팁 / Mẹo",
    description: "상단 힌트를 보고 문장 순서를 기억하세요!\nXem gợi ý ở trên để nhớ thứ tự câu!"
  },
];

export default function GrammarTetris({ level }: GrammarTetrisProps) {
  const [gameState, setGameState] = useState<"ready" | "tutorial" | "playing" | "paused" | "finished">("ready");
  const [tutorialStep, setTutorialStep] = useState(0);
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
  const [showCombo, setShowCombo] = useState(false);
  
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const dropSpeedRef = useRef(1200); // 느린 속도로 시작
  const boardRef = useRef(board);
  const currentBlockRef = useRef(currentBlock);
  const gameStateRef = useRef(gameState);

  // Refs 업데이트
  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { currentBlockRef.current = currentBlock; }, [currentBlock]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // 튜토리얼 완료 여부 확인
  const hasSeenTutorial = localStorage.getItem("grammar-tetris-tutorial") === "done";

  // 새 문장 시작
  const startNewSentence = useCallback(() => {
    const sentences = SENTENCES[level];
    const sentence = sentences[sentenceIndex % sentences.length];
    setCurrentSentence(sentence);
    
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
    
    const upcoming = blockQueue.slice(1, 3).map((p, i) => ({
      id: `next-${i}`,
      text: p.text,
      type: p.type,
      col: 0,
      row: 0,
    }));
    setNextBlocks(upcoming);
  }, [blockQueue, startNewSentence]);

  // 블록 고정
  const placeBlock = useCallback((block: Block) => {
    if (block.row < 0) {
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
  }, []);

  // 줄 클리어 체크
  const checkLines = useCallback(() => {
    if (!currentSentence) {
      setTimeout(() => spawnNextBlock(), 200);
      return;
    }

    setBoard((prev) => {
      const newBoard = [...prev];
      let cleared = 0;

      for (let row = ROWS - 1; row >= 0; row--) {
        const rowBlocks = newBoard[row].filter((b): b is Block => b !== null);
        
        if (rowBlocks.length >= 2) {
          const rowTexts = rowBlocks.map((b) => b.text);
          const partTexts = currentSentence.parts.map((p) => p.text);

          let partIndex = 0;
          for (const text of rowTexts) {
            if (partTexts[partIndex] === text) partIndex++;
          }

          if (partIndex >= 2) {
            cleared++;
            newBoard[row] = Array(COLS).fill(null);
            
            for (let r = row - 1; r >= 0; r--) {
              newBoard[r + 1] = [...newBoard[r]];
            }
            newBoard[0] = Array(COLS).fill(null);
            
            toast.success("🎉 클리어! / Xóa dòng!", { duration: 1500 });
          }
        }
      }

      if (cleared > 0) {
        const comboBonus = combo * 20;
        const lineBonus = cleared * 100;
        setScore((s) => s + lineBonus + comboBonus);
        setCombo((c) => c + 1);
        setLinesCleared((l) => l + cleared);
        
        if (combo >= 1) {
          setShowCombo(true);
          setTimeout(() => setShowCombo(false), 1500);
        }
      } else {
        setCombo(0);
      }

      return newBoard;
    });

    setTimeout(() => spawnNextBlock(), 200);
  }, [currentSentence, combo, spawnNextBlock]);

  // 블록 이동 (Refs 사용으로 최신 상태 참조)
  const moveBlock = useCallback((direction: "left" | "right" | "down") => {
    const current = currentBlockRef.current;
    const currentBoard = boardRef.current;
    const state = gameStateRef.current;
    
    if (!current || state !== "playing") return;

    let newCol = current.col;
    let newRow = current.row;

    if (direction === "left" && current.col > 0) {
      newCol = current.col - 1;
    } else if (direction === "right" && current.col < COLS - 1) {
      newCol = current.col + 1;
    } else if (direction === "down") {
      newRow = current.row + 1;
    }

    // 충돌 체크
    if (newRow >= ROWS || (newRow >= 0 && currentBoard[newRow]?.[newCol])) {
      if (direction === "down") {
        placeBlock(current);
        setCurrentBlock(null);
        setTimeout(() => checkLines(), 100);
        return;
      }
      return;
    }

    // 좌우 이동 충돌
    if (direction !== "down" && currentBoard[current.row]?.[newCol]) {
      return;
    }

    setCurrentBlock({ ...current, col: newCol, row: newRow });
  }, [placeBlock, checkLines]);

  // 하드 드롭
  const hardDrop = useCallback(() => {
    const current = currentBlockRef.current;
    const currentBoard = boardRef.current;
    const state = gameStateRef.current;
    
    if (!current || state !== "playing") return;

    let dropRow = current.row;
    while (dropRow < ROWS - 1 && !currentBoard[dropRow + 1]?.[current.col]) {
      dropRow++;
    }

    placeBlock({ ...current, row: dropRow });
    setCurrentBlock(null);
    setTimeout(() => checkLines(), 100);
  }, [placeBlock, checkLines]);

  // 키보드 컨트롤 - 전역 핸들러
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStateRef.current !== "playing") return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          moveBlock("left");
          break;
        case "ArrowRight":
          e.preventDefault();
          moveBlock("right");
          break;
        case "ArrowDown":
          e.preventDefault();
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
  }, [moveBlock, hardDrop]);

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
    dropSpeedRef.current = 1200;
    
    if (!hasSeenTutorial) {
      setTutorialStep(0);
      setGameState("tutorial");
    } else {
      startNewSentence();
      setGameState("playing");
    }
  };

  const completeTutorial = () => {
    localStorage.setItem("grammar-tetris-tutorial", "done");
    startNewSentence();
    setGameState("playing");
  };

  // 튜토리얼 화면
  if (gameState === "tutorial") {
    const step = TUTORIAL_STEPS[tutorialStep];
    const StepIcon = step.icon;
    
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-background/95 backdrop-blur-md z-50 flex items-center justify-center p-4"
      >
        <Card className="w-full max-w-sm p-6 text-center">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-muted-foreground">
              {tutorialStep + 1} / {TUTORIAL_STEPS.length}
            </span>
            <Button variant="ghost" size="sm" onClick={completeTutorial}>
              <X className="w-4 h-4 mr-1" />
              건너뛰기
            </Button>
          </div>

          <motion.div
            key={tutorialStep}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center"
          >
            <StepIcon className="w-8 h-8 text-white" />
          </motion.div>

          <h3 className="text-xl font-bold mb-3">{step.title}</h3>
          <p className="text-muted-foreground whitespace-pre-line text-sm mb-6">
            {step.description}
          </p>

          <div className="flex justify-center gap-2 mb-4">
            {TUTORIAL_STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === tutorialStep ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          <Button
            onClick={() => {
              if (tutorialStep < TUTORIAL_STEPS.length - 1) {
                setTutorialStep(tutorialStep + 1);
              } else {
                completeTutorial();
              }
            }}
            className="w-full"
          >
            {tutorialStep < TUTORIAL_STEPS.length - 1 ? (
              <>다음 <ArrowRight className="w-4 h-4 ml-1" /></>
            ) : (
              <>게임 시작 <Play className="w-4 h-4 ml-1" /></>
            )}
          </Button>
        </Card>
      </motion.div>
    );
  }

  // Ready 화면
  if (gameState === "ready") {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4">
        <Card className="p-6 text-center">
          <div className="text-5xl mb-3">🧱</div>
          <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Grammar Tetris
          </h2>
          <p className="text-muted-foreground mb-4 text-sm">
            문법 테트리스 / Xếp hình ngữ pháp
          </p>
          
          {/* 블록 타입 설명 - 2x3 그리드 */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {Object.entries(BLOCK_LABELS).slice(0, 6).map(([type, labels]) => (
              <div
                key={type}
                className={`p-2 rounded-lg bg-gradient-to-r ${BLOCK_STYLES[type as BlockType].gradient} text-white text-xs font-medium`}
              >
                <div>{labels.ko}</div>
                <div className="opacity-70 text-[10px]">{labels.vi}</div>
              </div>
            ))}
          </div>

          <Button onClick={startGame} size="lg" className="w-full gap-2">
            <Play className="w-5 h-5" />
            Bắt đầu / 시작
          </Button>
        </Card>
      </motion.div>
    );
  }

  // Finished 화면
  if (gameState === "finished") {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4">
        <Card className="p-6 text-center">
          <Trophy className="w-16 h-16 mx-auto mb-3 text-yellow-500" />
          <h2 className="text-2xl font-bold mb-2">Game Over!</h2>
          <p className="text-4xl font-black text-primary mb-2">{score}점</p>
          <p className="text-muted-foreground mb-4 flex items-center justify-center gap-2">
            <Star className="w-4 h-4 text-amber-400" />
            {linesCleared} dòng / 줄
          </p>
          <Button onClick={startGame} size="lg" className="w-full gap-2">
            <RotateCcw className="w-5 h-5" />
            Thử lại / 다시 도전
          </Button>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-h-[700px] p-2 gap-2">
      {/* 콤보 표시 */}
      <AnimatePresence>
        {showCombo && combo >= 2 && (
          <motion.div
            initial={{ scale: 0, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0 }}
            className="absolute top-1/3 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-3 rounded-xl">
              <p className="text-2xl font-black text-white flex items-center gap-2">
                <Flame className="w-6 h-6" />
                {combo}x COMBO!
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 상단: 점수 + 일시정지 + NEXT */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-amber-500/20 px-3 py-1.5 rounded-lg">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-amber-400">{score}</span>
          </div>
          {combo > 0 && (
            <div className="flex items-center gap-1.5 bg-orange-500/20 px-3 py-1.5 rounded-lg">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="font-bold text-orange-400">{combo}x</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* NEXT 미리보기 */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">NEXT:</span>
            {nextBlocks.slice(0, 2).map((block, i) => (
              <div
                key={block.id}
                className={`px-2 py-1 rounded text-xs font-bold text-white bg-gradient-to-r ${BLOCK_STYLES[block.type].gradient} ${i === 0 ? "opacity-100" : "opacity-50"}`}
              >
                {block.text}
              </div>
            ))}
          </div>
          
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setGameState(gameState === "paused" ? "playing" : "paused")}
          >
            {gameState === "paused" ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* 현재 문장 힌트 */}
      {currentSentence && (
        <div className="bg-primary/10 rounded-lg px-3 py-2 text-center">
          <div className="text-xs text-muted-foreground">🎯 목표 문장 / Câu mục tiêu</div>
          <div className="font-bold text-sm">
            {currentSentence.meaning_ko}
            <span className="text-muted-foreground ml-2 font-normal">
              ({currentSentence.meaning_vi})
            </span>
          </div>
        </div>
      )}

      {/* 게임 보드 - 전체 너비 사용 */}
      <Card className="flex-1 p-2 bg-slate-900 border-primary/30 overflow-hidden">
        <div
          className="grid gap-1 h-full"
          style={{
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gridTemplateRows: `repeat(${ROWS}, 1fr)`,
          }}
        >
          {board.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const isCurrentBlock =
                currentBlock &&
                currentBlock.row === rowIndex &&
                currentBlock.col === colIndex;

              const block = isCurrentBlock ? currentBlock : cell;

              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`
                    flex items-center justify-center font-bold rounded-lg
                    ${block 
                      ? `bg-gradient-to-br ${BLOCK_STYLES[block.type].gradient} ${BLOCK_STYLES[block.type].glow} text-white` 
                      : "bg-slate-800/50 border border-slate-700/30"
                    }
                    ${block?.isSpecial ? "ring-2 ring-yellow-400/60" : ""}
                  `}
                >
                  {block && (
                    <div className="text-center px-1">
                      <span className="text-sm font-bold drop-shadow-lg block truncate">
                        {block.text}
                      </span>
                      <span className="text-[9px] opacity-70">
                        {BLOCK_LABELS[block.type].ko}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* 모바일 컨트롤 - 하단 고정 */}
      <div className="flex justify-center gap-2 py-2">
        <Button
          variant="outline"
          size="lg"
          onClick={() => moveBlock("left")}
          className="w-14 h-14 p-0 border-primary/30 active:bg-primary/20"
        >
          <ChevronLeft className="w-7 h-7" />
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => moveBlock("down")}
          className="w-14 h-14 p-0 border-primary/30 active:bg-primary/20"
        >
          <ChevronDown className="w-7 h-7" />
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => moveBlock("right")}
          className="w-14 h-14 p-0 border-primary/30 active:bg-primary/20"
        >
          <ChevronRight className="w-7 h-7" />
        </Button>
        <Button
          size="lg"
          onClick={hardDrop}
          className="w-14 h-14 p-0 bg-gradient-to-r from-primary to-accent"
        >
          <Zap className="w-7 h-7" />
        </Button>
      </div>

      {/* 일시정지 오버레이 */}
      <AnimatePresence>
        {gameState === "paused" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/90 backdrop-blur-md flex items-center justify-center z-50"
            onClick={() => setGameState("playing")}
          >
            <Card className="p-8 text-center">
              <Pause className="w-16 h-16 mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-bold mb-2">Tạm dừng / 일시정지</h2>
              <p className="text-muted-foreground">Nhấn để tiếp tục / 터치하여 계속</p>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
