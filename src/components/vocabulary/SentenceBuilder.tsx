import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { 
  CheckCircle2,
  XCircle,
  RotateCcw,
  Loader2,
  Volume2,
  Globe,
  ArrowRight,
  Sparkles,
  GripVertical,
  Lightbulb,
  Trash2
} from "lucide-react";
import { useVocabulary, VocabWord } from "@/hooks/useVocabulary";

interface SentenceBuilderProps {
  level: number;
  onMistake?: (word: VocabWord) => void;
}

interface SentencePuzzle {
  word: VocabWord;
  sentence: string;
  correctParts: string[]; // 정답 조각들
  allParts: string[]; // 정답 + 교란 조각 (섞인 상태)
  distractors: string[]; // 교란 조각들 (정답에 포함 안됨)
}

// 교란 조각 생성용 한국어 패턴
const DISTRACTOR_PATTERNS = [
  "그리고", "하지만", "그래서", "또한", "게다가",
  "를 위해", "때문에", "것처럼", "만큼", "에서는",
  "했습니다", "되었다", "같이", "처럼", "보다",
  "으로서", "에게", "부터", "까지", "동안"
];

const SentenceBuilder = ({ level, onMistake }: SentenceBuilderProps) => {
  const { getMeaning, getCurrentLanguage, languageLabels } = useVocabulary();
  
  const [puzzles, setPuzzles] = useState<SentencePuzzle[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [orderedParts, setOrderedParts] = useState<string[]>([]);
  const [discardedParts, setDiscardedParts] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);

  const currentPuzzle = puzzles[currentIndex];
  const currentLang = getCurrentLanguage();

  // 교란 조각 생성
  const generateDistractors = useCallback((correctParts: string[], word: string): string[] => {
    const distractors: string[] = [];
    const numDistractors = Math.min(2, Math.ceil(correctParts.length * 0.5));
    
    // 랜덤 교란 조각 선택
    const shuffledPatterns = [...DISTRACTOR_PATTERNS].sort(() => Math.random() - 0.5);
    for (let i = 0; i < numDistractors && i < shuffledPatterns.length; i++) {
      // 정답에 포함되지 않는 것만
      if (!correctParts.some(p => p.includes(shuffledPatterns[i]))) {
        distractors.push(shuffledPatterns[i]);
      }
    }
    
    return distractors;
  }, []);

  // Generate sentence puzzles from vocabulary
  const fetchAndGeneratePuzzles = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('topik_vocabulary')
        .select('*')
        .eq('level', level)
        .not('example_phrase', 'is', null)
        .order('seq_no')
        .limit(50);

      if (error) throw error;

      if (data && data.length > 0) {
        const validWords = (data as VocabWord[]).filter(w => {
          const phrase = w.example_phrase;
          return phrase && phrase.length > 5 && phrase.includes(' ');
        });

        const shuffled = [...validWords].sort(() => Math.random() - 0.5);
        const selectedWords = shuffled.slice(0, 10);

        const generatedPuzzles: SentencePuzzle[] = selectedWords.map(word => {
          const sentence = word.example_phrase || `${word.word}을/를 사용합니다.`;
          const words = sentence.split(/\s+/);
          const parts: string[] = [];
          
          // 1-2 단어씩 조각으로 분리
          let currentPart = '';
          words.forEach((w, i) => {
            currentPart += (currentPart ? ' ' : '') + w;
            if (i === words.length - 1 || (currentPart.split(' ').length >= 2 && Math.random() > 0.4)) {
              parts.push(currentPart);
              currentPart = '';
            }
          });
          if (currentPart) parts.push(currentPart);

          // 교란 조각 생성
          const distractors = generateDistractors(parts, word.word);
          
          // 모든 조각 섞기 (정답 + 교란)
          const allParts = [...parts, ...distractors].sort(() => Math.random() - 0.5);

          return {
            word,
            sentence,
            correctParts: parts,
            allParts,
            distractors
          };
        });

        setPuzzles(generatedPuzzles);
      } else {
        setPuzzles([]);
      }
    } catch (error) {
      console.error('Error fetching vocabulary:', error);
      setPuzzles([]);
    } finally {
      setIsLoading(false);
    }
  }, [level, generateDistractors]);

  useEffect(() => {
    fetchAndGeneratePuzzles();
  }, [fetchAndGeneratePuzzles]);

  // Reset when puzzle changes
  useEffect(() => {
    if (currentPuzzle) {
      setOrderedParts([...currentPuzzle.allParts]);
      setDiscardedParts([]);
      setShowHint(false);
    }
  }, [currentPuzzle]);

  // 조각을 휴지통으로 이동
  const handleDiscardPart = (part: string) => {
    setOrderedParts(prev => prev.filter(p => p !== part));
    setDiscardedParts(prev => [...prev, part]);
  };

  // 휴지통에서 다시 가져오기
  const handleRestorePart = (part: string) => {
    setDiscardedParts(prev => prev.filter(p => p !== part));
    setOrderedParts(prev => [...prev, part]);
  };

  const handleCheck = () => {
    if (!currentPuzzle) return;
    
    // 버려진 조각 체크: 교란 조각만 버려야 함
    const correctlyDiscarded = discardedParts.every(p => currentPuzzle.distractors.includes(p));
    const allDistractorsDiscarded = currentPuzzle.distractors.every(p => discardedParts.includes(p));
    
    // 남은 조각 순서가 정답과 일치하는지
    const remainingCorrect = orderedParts.join(' ') === currentPuzzle.correctParts.join(' ');
    
    const correct = correctlyDiscarded && allDistractorsDiscarded && remainingCorrect;
    
    setIsCorrect(correct);
    setShowResult(true);

    if (correct) {
      const hintPenalty = hintsUsed * 3;
      const bonus = Math.min(streak, 5) * 3;
      const earnedScore = Math.max(5, 15 + bonus - hintPenalty);
      setScore(prev => prev + earnedScore);
      setStreak(prev => prev + 1);
    } else {
      setStreak(0);
      onMistake?.(currentPuzzle.word);
    }
  };

  const handleNext = () => {
    if (currentIndex < puzzles.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowResult(false);
      setIsCorrect(false);
      setHintsUsed(0);
    } else {
      setSessionComplete(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setSessionComplete(false);
    setShowResult(false);
    setIsCorrect(false);
    setHintsUsed(0);
    fetchAndGeneratePuzzles();
  };

  const handleHint = () => {
    setShowHint(true);
    setHintsUsed(prev => prev + 1);
  };

  // Play TTS
  const playTTS = async (text: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text, speed: 0.85 }),
        }
      );
      if (!response.ok) return;
      const blob = await response.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      await audio.play();
    } catch (error) {
      console.error("TTS error:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">문장 퍼즐 생성 중...</p>
      </div>
    );
  }

  if (puzzles.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">이 레벨의 문장 데이터가 없습니다.</p>
        <Button onClick={fetchAndGeneratePuzzles}>다시 시도</Button>
      </div>
    );
  }

  if (sessionComplete) {
    const totalPossible = puzzles.length * 15;
    const percentage = Math.round((score / totalPossible) * 100);

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center mx-auto mb-6">
          <Sparkles className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-2xl font-bold mb-2">문장 완성 완료!</h2>
        <p className="text-4xl font-bold text-primary mb-2">{score}점</p>
        <p className="text-muted-foreground mb-6">
          {puzzles.length}문장 • 정확도 {percentage}%
        </p>
        <Button onClick={handleRestart} size="lg">
          <RotateCcw className="w-4 h-4 mr-2" />
          다시 시작
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress & Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            {currentIndex + 1} / {puzzles.length}
          </span>
          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all"
              style={{ width: `${((currentIndex + 1) / puzzles.length) * 100}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          {streak >= 2 && (
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-orange-500 font-bold text-sm"
            >
              🔥 {streak}연속!
            </motion.span>
          )}
          <span className="text-lg font-bold text-primary">{score}점</span>
        </div>
      </div>

      {/* Word Info - 뜻만 표시 (문장은 숨김) */}
      <div className="text-center bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl p-4 border border-cyan-500/20">
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="text-2xl font-bold">{currentPuzzle.word.word}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => playTTS(currentPuzzle.word.word)}
          >
            <Volume2 className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Globe className="w-4 h-4" />
          <span>{languageLabels[currentLang]}: {getMeaning(currentPuzzle.word)}</span>
        </div>
        
        {/* 힌트 표시 */}
        {showHint && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-2 bg-amber-500/10 rounded-lg border border-amber-500/30"
          >
            <p className="text-sm text-amber-600 dark:text-amber-400">
              💡 첫 단어: <strong>"{currentPuzzle.correctParts[0]}"</strong>
            </p>
          </motion.div>
        )}
      </div>

      {/* Instructions */}
      <div className="text-center text-sm text-muted-foreground">
        <p>드래그하여 올바른 순서로 배열하고, 불필요한 조각은 휴지통으로 버리세요</p>
        <p className="text-xs mt-1 text-amber-500">⚠️ 오답 조각이 섞여 있습니다!</p>
      </div>

      {/* Drag & Drop Reorder Area */}
      <motion.div
        key={currentIndex}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-card border-2 border-cyan-500/30 rounded-2xl p-4 min-h-[120px]"
      >
        <Reorder.Group
          axis="y"
          values={orderedParts}
          onReorder={setOrderedParts}
          className="space-y-2"
        >
          <AnimatePresence mode="popLayout">
            {orderedParts.map((part) => (
              <Reorder.Item
                key={part}
                value={part}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, scale: 0.8 }}
                whileDrag={{ scale: 1.02, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-grab active:cursor-grabbing
                  ${showResult 
                    ? currentPuzzle.distractors.includes(part)
                      ? 'bg-red-100 dark:bg-red-900/30 border-2 border-red-500'
                      : 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500'
                    : 'bg-gradient-to-r from-slate-800/50 to-slate-700/50 border border-cyan-500/30 hover:border-cyan-400'
                  }`}
              >
                <GripVertical className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <span className="flex-1 font-medium text-lg">{part}</span>
                {!showResult && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDiscardPart(part);
                    }}
                    className="text-red-400 hover:text-red-500 hover:bg-red-500/10 h-8 w-8 p-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
                {showResult && currentPuzzle.distractors.includes(part) && (
                  <span className="text-xs text-red-500 font-medium">오답 조각</span>
                )}
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>

        {orderedParts.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            모든 조각이 휴지통에 있습니다
          </div>
        )}
      </motion.div>

      {/* Discarded Parts (Trash) */}
      {!showResult && discardedParts.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Trash2 className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-400 font-medium">버린 조각 (클릭하여 복원)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {discardedParts.map((part) => (
              <motion.button
                key={part}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => handleRestorePart(part)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
              >
                {part}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Result */}
      {showResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-center p-4 rounded-xl ${
            isCorrect 
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
          }`}
        >
          {isCorrect ? (
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="w-6 h-6" />
              <span className="font-bold text-lg">완벽해요! +{Math.max(5, 15 + Math.min(streak - 1, 4) * 3 - hintsUsed * 3)}점</span>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <XCircle className="w-6 h-6" />
                <span className="font-bold text-lg">다시 도전!</span>
              </div>
              <p className="text-sm">
                정답: {currentPuzzle.correctParts.join(' ')}
              </p>
              {discardedParts.some(p => currentPuzzle.correctParts.some(c => c === p)) && (
                <p className="text-xs mt-1">❌ 필요한 조각을 버렸어요</p>
              )}
              {orderedParts.some(p => currentPuzzle.distractors.includes(p)) && (
                <p className="text-xs mt-1">❌ 불필요한 조각이 포함되어 있어요</p>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center gap-3">
        {!showResult ? (
          <>
            {!showHint && (
              <Button 
                variant="outline"
                onClick={handleHint}
                className="border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
              >
                <Lightbulb className="w-4 h-4 mr-1" />
                힌트 (-3점)
              </Button>
            )}
            <Button 
              onClick={handleCheck}
              disabled={orderedParts.length === 0}
              size="lg"
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
            >
              확인하기
            </Button>
          </>
        ) : (
          <Button onClick={handleNext} size="lg">
            다음 문장 <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>

      {/* Listen to correct answer */}
      {showResult && (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => playTTS(currentPuzzle.sentence)}
            className="text-muted-foreground"
          >
            <Volume2 className="w-4 h-4 mr-2" />
            정답 문장 듣기
          </Button>
        </div>
      )}
    </div>
  );
};

export default SentenceBuilder;
