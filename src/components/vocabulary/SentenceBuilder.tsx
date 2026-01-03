import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { 
  CheckCircle2,
  XCircle,
  RotateCcw,
  Loader2,
  Globe,
  ArrowRight,
  Sparkles,
  GripVertical,
  Lightbulb,
  Trash2,
  Timer,
  Zap
} from "lucide-react";
import { useVocabulary, VocabWord } from "@/hooks/useVocabulary";

interface SentenceBuilderProps {
  level: number;
  onMistake?: (word: VocabWord) => void;
}

interface SentencePuzzle {
  word: VocabWord;
  sentence: string;
  correctParts: string[];
  allParts: string[];
  distractors: string[];
}

// 타이머 설정 (초)
const TIME_LIMIT = 30;
const TIME_BONUS_THRESHOLD = 15; // 15초 이내 보너스
const TIME_BONUS_PERFECT = 8; // 8초 이내 퍼펙트 보너스

const SentenceBuilder = ({ level, onMistake }: SentenceBuilderProps) => {
  const { t } = useTranslation();
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
  
  // 타이머 관련 상태
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeBonus, setTimeBonus] = useState(0);

  const currentPuzzle = puzzles[currentIndex];
  const currentLang = getCurrentLanguage();

  // AI 교란 조각 생성
  const generateAIDistractors = useCallback(async (
    word: VocabWord, 
    correctParts: string[]
  ): Promise<string[]> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sentence-distractors`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            word: word.word,
            pos: word.pos,
            sentence: word.example_phrase,
            correctParts,
            count: 2
          }),
        }
      );

      if (!response.ok) {
        console.error("Failed to generate AI distractors");
        return getFallbackDistractors(word.pos);
      }

      const data = await response.json();
      return data.distractors || getFallbackDistractors(word.pos);
    } catch (error) {
      console.error("AI distractor error:", error);
      return getFallbackDistractors(word.pos);
    }
  }, []);

  // 폴백 교란 조각
  const getFallbackDistractors = (pos: string | null): string[] => {
    const patterns: Record<string, string[]> = {
      '동사': ["그리고 나서", "하지만"],
      '명사': ["것처럼", "으로서"],
      '형용사': ["더욱", "매우"],
      '부사': ["또한", "게다가"],
    };
    return patterns[pos || ''] || ["그리고", "때문에"];
  };

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

        // 퍼즐 생성 (AI 교란 조각 포함)
        const generatedPuzzles: SentencePuzzle[] = await Promise.all(
          selectedWords.map(async (word) => {
            const sentence = word.example_phrase || `${word.word}을/를 사용합니다.`;
            const words = sentence.split(/\s+/);
            const parts: string[] = [];
            
            let currentPart = '';
            words.forEach((w, i) => {
              currentPart += (currentPart ? ' ' : '') + w;
              if (i === words.length - 1 || (currentPart.split(' ').length >= 2 && Math.random() > 0.4)) {
                parts.push(currentPart);
                currentPart = '';
              }
            });
            if (currentPart) parts.push(currentPart);

            // AI 교란 조각 생성
            const distractors = await generateAIDistractors(word, parts);
            
            const allParts = [...parts, ...distractors].sort(() => Math.random() - 0.5);

            return {
              word,
              sentence,
              correctParts: parts,
              allParts,
              distractors
            };
          })
        );

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
  }, [level, generateAIDistractors]);

  useEffect(() => {
    fetchAndGeneratePuzzles();
  }, [fetchAndGeneratePuzzles]);

  // Reset when puzzle changes
  useEffect(() => {
    if (currentPuzzle) {
      setOrderedParts([...currentPuzzle.allParts]);
      setDiscardedParts([]);
      setShowHint(false);
      setTimeLeft(TIME_LIMIT);
      setIsTimerRunning(true);
      setTimeBonus(0);
    }
  }, [currentPuzzle]);

  // 타이머 로직
  useEffect(() => {
    if (!isTimerRunning || showResult || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          // 시간 초과 시 자동 채점
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTimerRunning, showResult, timeLeft]);

  // 시간 초과 처리
  const handleTimeUp = () => {
    if (!currentPuzzle || showResult) return;
    
    setIsCorrect(false);
    setShowResult(true);
    setStreak(0);
    onMistake?.(currentPuzzle.word);
  };

  // 시간 보너스 계산
  const calculateTimeBonus = (elapsedTime: number): number => {
    const remainingTime = TIME_LIMIT - elapsedTime;
    
    if (remainingTime >= TIME_LIMIT - TIME_BONUS_PERFECT) {
      return 10; // 퍼펙트 보너스 (8초 이내)
    } else if (remainingTime >= TIME_LIMIT - TIME_BONUS_THRESHOLD) {
      return 5; // 빠른 보너스 (15초 이내)
    }
    return 0;
  };

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
    
    setIsTimerRunning(false);
    
    const correctlyDiscarded = discardedParts.every(p => currentPuzzle.distractors.includes(p));
    const allDistractorsDiscarded = currentPuzzle.distractors.every(p => discardedParts.includes(p));
    const remainingCorrect = orderedParts.join(' ') === currentPuzzle.correctParts.join(' ');
    
    const correct = correctlyDiscarded && allDistractorsDiscarded && remainingCorrect;
    
    setIsCorrect(correct);
    setShowResult(true);

    if (correct) {
      const elapsedTime = TIME_LIMIT - timeLeft;
      const timeBonusPoints = calculateTimeBonus(elapsedTime);
      setTimeBonus(timeBonusPoints);
      
      const hintPenalty = hintsUsed * 3;
      const streakBonus = Math.min(streak, 5) * 3;
      const earnedScore = Math.max(5, 15 + streakBonus + timeBonusPoints - hintPenalty);
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
    setTimeLeft(TIME_LIMIT);
    fetchAndGeneratePuzzles();
  };

  const handleHint = () => {
    setShowHint(true);
    setHintsUsed(prev => prev + 1);
  };


  // 타이머 색상 계산
  const getTimerColor = () => {
    if (timeLeft > 20) return "text-green-500";
    if (timeLeft > 10) return "text-yellow-500";
    return "text-red-500 animate-pulse";
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">{t("sentenceBuilder.aiLoading")}</p>
      </div>
    );
  }

  if (puzzles.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">{t("sentenceBuilder.noData")}</p>
        <Button onClick={fetchAndGeneratePuzzles}>{t("sentenceBuilder.retry")}</Button>
      </div>
    );
  }

  if (sessionComplete) {
    const totalPossible = puzzles.length * 25;
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
        <h2 className="text-2xl font-bold mb-2">{t("sentenceBuilder.complete")}</h2>
        <p className="text-4xl font-bold text-primary mb-2">{score}{t("sentenceBuilder.points")}</p>
        <p className="text-muted-foreground mb-6">
          {puzzles.length}{t("sentenceBuilder.sentences")} • {t("sentenceBuilder.accuracy")} {percentage}%
        </p>
        <Button onClick={handleRestart} size="lg">
          <RotateCcw className="w-4 h-4 mr-2" />
          {t("sentenceBuilder.restart")}
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress & Stats & Timer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            {currentIndex + 1} / {puzzles.length}
          </span>
          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all"
              style={{ width: `${((currentIndex + 1) / puzzles.length) * 100}%` }}
            />
          </div>
        </div>
        
        {/* 타이머 */}
        <div className="flex items-center gap-4">
          <motion.div 
            className={`flex items-center gap-1.5 font-mono text-lg font-bold ${getTimerColor()}`}
            animate={timeLeft <= 10 ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: timeLeft <= 10 ? Infinity : 0, duration: 0.5 }}
          >
            <Timer className="w-5 h-5" />
            <span>{timeLeft}s</span>
          </motion.div>
          
          {streak >= 2 && (
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-orange-500 font-bold text-sm"
            >
              🔥 {streak}연속!
            </motion.span>
          )}
          <span className="text-lg font-bold text-primary">{score}{t("sentenceBuilder.points")}</span>
        </div>
      </div>

      {/* 시간 보너스 안내 */}
      {!showResult && timeLeft > TIME_LIMIT - TIME_BONUS_PERFECT && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-500 text-sm font-medium">
            <Zap className="w-4 h-4" />
            {timeLeft > TIME_LIMIT - TIME_BONUS_PERFECT ? t("sentenceBuilder.perfectBonus") : t("sentenceBuilder.fastBonus")}
          </span>
        </motion.div>
      )}

      {/* Word Info */}
      <div className="text-center bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl p-4 border border-cyan-500/20">
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="text-2xl font-bold">{currentPuzzle.word.word}</span>
          {currentPuzzle.word.pos && (
            <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-xs">
              {currentPuzzle.word.pos}
            </span>
          )}
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Globe className="w-4 h-4" />
          <span>{languageLabels[currentLang]}: {getMeaning(currentPuzzle.word)}</span>
        </div>
        
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
        <p>{t("sentenceBuilder.instruction")}</p>
        <p className="text-xs mt-1 text-amber-500">⚠️ {t("sentenceBuilder.aiWarning")}</p>
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
                  <span className="text-xs text-red-500 font-medium">{t("sentenceBuilder.aiWrong")}</span>
                )}
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>

        {orderedParts.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {t("sentenceBuilder.allInTrash")}
          </div>
        )}
      </motion.div>

      {/* Discarded Parts (Trash) */}
      {!showResult && discardedParts.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Trash2 className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-400 font-medium">{t("sentenceBuilder.trashLabel")}</span>
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
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle2 className="w-6 h-6" />
                <span className="font-bold text-lg">{t("sentenceBuilder.perfect")}</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm">
                <span>{t("sentenceBuilder.basePoints")}</span>
                {timeBonus > 0 && (
                  <span className="text-amber-500 font-bold">
                    ⚡ {t("sentenceBuilder.timeBonus")} +{timeBonus}{t("sentenceBuilder.points")}
                  </span>
                )}
                {streak > 1 && (
                  <span className="text-orange-500">{t("sentenceBuilder.streakBonus")} +{Math.min(streak - 1, 4) * 3}{t("sentenceBuilder.points")}</span>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <XCircle className="w-6 h-6" />
                <span className="font-bold text-lg">
                  {timeLeft === 0 ? t("sentenceBuilder.timeUp") : t("sentenceBuilder.tryAgain")}
                </span>
              </div>
              <p className="text-sm">
                {t("sentenceBuilder.correctAnswer")}: {currentPuzzle.correctParts.join(' ')}
              </p>
              {discardedParts.some(p => currentPuzzle.correctParts.some(c => c === p)) && (
                <p className="text-xs mt-1">❌ {t("sentenceBuilder.discardedNeeded")}</p>
              )}
              {orderedParts.some(p => currentPuzzle.distractors.includes(p)) && (
                <p className="text-xs mt-1">❌ {t("sentenceBuilder.hasDistractor")}</p>
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
                {t("sentenceBuilder.hint")}
              </Button>
            )}
            <Button 
              onClick={handleCheck}
              disabled={orderedParts.length === 0}
              size="lg"
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
            >
              {t("sentenceBuilder.check")}
            </Button>
          </>
        ) : (
          <Button onClick={handleNext} size="lg">
            {t("sentenceBuilder.next")} <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default SentenceBuilder;
