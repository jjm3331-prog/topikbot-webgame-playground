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
  Link as LinkIcon,
  CircleDot
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
const BLOCK_COLORS: Record<BlockType, string> = {
  subject: "bg-blue-500",
  object: "bg-green-500",
  verb: "bg-red-500",
  adverb: "bg-yellow-500",
  connector: "bg-purple-500",
  ending: "bg-pink-500",
};

const BLOCK_LABELS: Record<BlockType, { vi: string; ko: string }> = {
  subject: { vi: "Chủ ngữ", ko: "주어" },
  object: { vi: "Tân ngữ", ko: "목적어" },
  verb: { vi: "Động từ", ko: "동사" },
  adverb: { vi: "Trạng từ", ko: "부사" },
  connector: { vi: "Liên kết", ko: "연결어미" },
  ending: { vi: "Kết thúc", ko: "종결어미" },
};

const COLS = 6;
const ROWS = 8;

interface GrammarTetrisProps {
  level: TopikLevel;
}

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
  
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const dropSpeedRef = useRef(1000);

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
      col: Math.floor(COLS / 2) - 1,
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

    // 줄 체크
    setTimeout(() => checkLines(), 100);
  }, []);

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
        const comboBonus = combo * 10;
        const lineBonus = cleared * 100;
        const total = lineBonus + comboBonus;
        
        setScore((s) => s + total);
        setCombo((c) => c + 1);
        setLinesCleared((l) => l + cleared);
        
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
  }, [currentSentence, combo, spawnNextBlock]);

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
      <Card className="p-8 text-center">
        <div className="text-6xl mb-4">🧱</div>
        <h2 className="text-2xl font-bold mb-2">Grammar Tetris</h2>
        <p className="text-muted-foreground mb-4">
          문법 테트리스 / Xếp hình ngữ pháp
        </p>
        <div className="text-left bg-muted/50 rounded-lg p-4 mb-6 text-sm">
          <p className="font-semibold mb-2">🎮 Cách chơi / 게임 방법:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>← → : Di chuyển / 이동</li>
            <li>↓ : Rơi nhanh / 빠르게</li>
            <li>Space : Rơi ngay / 즉시 낙하</li>
            <li>✅ Xếp đúng thứ tự ngữ pháp để xóa dòng!</li>
            <li>✅ 올바른 어순으로 배치하면 줄 클리어!</li>
          </ul>
        </div>
        
        {/* 블록 타입 설명 */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {Object.entries(BLOCK_LABELS).map(([type, labels]) => (
            <Badge
              key={type}
              className={`${BLOCK_COLORS[type as BlockType]} text-white`}
            >
              {labels.vi} / {labels.ko}
            </Badge>
          ))}
        </div>

        <Button onClick={startGame} size="lg" className="gap-2">
          <Play className="w-5 h-5" />
          Bắt đầu / 시작
        </Button>
      </Card>
    );
  }

  // Finished 화면
  if (gameState === "finished") {
    return (
      <Card className="p-8 text-center">
        <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
        <h2 className="text-2xl font-bold mb-2">Game Over!</h2>
        <div className="space-y-2 mb-6">
          <p className="text-4xl font-bold text-primary">{score}점</p>
          <p className="text-muted-foreground">
            {linesCleared} dòng đã xóa / {linesCleared} 줄 클리어
          </p>
        </div>
        <Button onClick={startGame} size="lg" className="gap-2">
          <RotateCcw className="w-5 h-5" />
          Thử lại / 다시 도전
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Trophy className="w-4 h-4 mr-2" />
            {score}점
          </Badge>
          {combo > 0 && (
            <Badge className="bg-orange-500 text-lg px-4 py-2">
              <Flame className="w-4 h-4 mr-2" />
              {combo}x
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setGameState(gameState === "paused" ? "playing" : "paused")}
          >
            {gameState === "paused" ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* 현재 문장 힌트 */}
      {currentSentence && (
        <Card className="p-3 bg-primary/5 border-primary/20">
          <div className="text-sm font-medium text-center">
            🎯 목표 문장 / Câu mục tiêu:
          </div>
          <div className="text-center mt-1">
            <span className="font-bold">{currentSentence.meaning_ko}</span>
            <span className="text-muted-foreground ml-2 text-sm">
              ({currentSentence.meaning_vi})
            </span>
          </div>
        </Card>
      )}

      <div className="flex gap-4">
        {/* 게임 보드 */}
        <Card className="flex-1 p-2 bg-slate-900">
          <div
            className="grid gap-0.5"
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
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={`
                      aspect-square flex items-center justify-center text-xs font-bold rounded-sm
                      ${block ? BLOCK_COLORS[block.type] + " text-white" : "bg-slate-800"}
                      ${block?.isSpecial ? "ring-2 ring-yellow-400" : ""}
                    `}
                  >
                    {block && (
                      <span className="truncate px-0.5 text-[10px] sm:text-xs">
                        {block.text}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* 사이드 패널 */}
        <div className="w-24 space-y-4">
          {/* Next 블록 */}
          <Card className="p-2">
            <div className="text-xs text-center mb-2 text-muted-foreground">NEXT</div>
            <div className="space-y-1">
              {nextBlocks.map((block, i) => (
                <div
                  key={block.id}
                  className={`
                    p-1 rounded text-center text-[10px] font-medium text-white
                    ${BLOCK_COLORS[block.type]}
                    ${i === 0 ? "opacity-100" : "opacity-60"}
                  `}
                >
                  {block.text}
                </div>
              ))}
            </div>
          </Card>

          {/* 클리어 카운트 */}
          <Card className="p-2 text-center">
            <div className="text-xs text-muted-foreground">LINES</div>
            <div className="text-2xl font-bold">{linesCleared}</div>
          </Card>
        </div>
      </div>

      {/* 모바일 컨트롤 */}
      <div className="flex justify-center gap-4 mt-4">
        <Button
          variant="outline"
          size="lg"
          onClick={() => moveBlock("left")}
          className="w-16 h-16"
        >
          <ChevronLeft className="w-8 h-8" />
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => moveBlock("down")}
          className="w-16 h-16"
        >
          <ChevronDown className="w-8 h-8" />
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => moveBlock("right")}
          className="w-16 h-16"
        >
          <ChevronRight className="w-8 h-8" />
        </Button>
        <Button
          variant="default"
          size="lg"
          onClick={hardDrop}
          className="w-16 h-16"
        >
          <Zap className="w-8 h-8" />
        </Button>
      </div>

      {/* 일시정지 오버레이 */}
      <AnimatePresence>
        {gameState === "paused" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setGameState("playing")}
          >
            <Card className="p-8 text-center">
              <Pause className="w-16 h-16 mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-bold mb-2">Tạm dừng / 일시정지</h2>
              <p className="text-muted-foreground mb-4">Nhấn để tiếp tục / 터치하여 계속</p>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
