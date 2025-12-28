import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { 
  CheckCircle2,
  XCircle,
  RotateCcw,
  Loader2,
  Volume2,
  Globe,
  Shuffle,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { useVocabulary, VocabWord } from "@/hooks/useVocabulary";

interface SentenceBuilderProps {
  level: number;
  onMistake?: (word: VocabWord) => void;
}

interface SentencePuzzle {
  word: VocabWord;
  sentence: string;
  shuffledParts: string[];
  correctOrder: string[];
}

const SentenceBuilder = ({ level, onMistake }: SentenceBuilderProps) => {
  const { getMeaning, getCurrentLanguage, languageLabels } = useVocabulary();
  
  const [puzzles, setPuzzles] = useState<SentencePuzzle[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [availableParts, setAvailableParts] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);

  const currentPuzzle = puzzles[currentIndex];
  const currentLang = getCurrentLanguage();

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
        // Filter words with usable phrases
        const validWords = (data as VocabWord[]).filter(w => {
          const phrase = w.example_phrase;
          return phrase && phrase.length > 5 && phrase.includes(' ');
        });

        // Shuffle and create puzzles
        const shuffled = [...validWords].sort(() => Math.random() - 0.5);
        const selectedWords = shuffled.slice(0, 10);

        const generatedPuzzles: SentencePuzzle[] = selectedWords.map(word => {
          const sentence = word.example_phrase || `${word.word}을/를 사용합니다.`;
          // Split into meaningful parts (2-4 words each)
          const words = sentence.split(/\s+/);
          const parts: string[] = [];
          
          let currentPart = '';
          words.forEach((w, i) => {
            currentPart += (currentPart ? ' ' : '') + w;
            // Create part every 1-2 words or at end
            if (i === words.length - 1 || (currentPart.split(' ').length >= 2 && Math.random() > 0.5)) {
              parts.push(currentPart);
              currentPart = '';
            }
          });
          if (currentPart) parts.push(currentPart);

          return {
            word,
            sentence,
            correctOrder: parts,
            shuffledParts: [...parts].sort(() => Math.random() - 0.5)
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
  }, [level]);

  useEffect(() => {
    fetchAndGeneratePuzzles();
  }, [fetchAndGeneratePuzzles]);

  // Reset available parts when puzzle changes
  useEffect(() => {
    if (currentPuzzle) {
      setAvailableParts([...currentPuzzle.shuffledParts]);
      setSelectedParts([]);
    }
  }, [currentPuzzle]);

  const handleSelectPart = (part: string, index: number) => {
    setSelectedParts(prev => [...prev, part]);
    setAvailableParts(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemovePart = (index: number) => {
    const part = selectedParts[index];
    setAvailableParts(prev => [...prev, part]);
    setSelectedParts(prev => prev.filter((_, i) => i !== index));
  };

  const handleCheck = () => {
    if (!currentPuzzle) return;
    
    const builtSentence = selectedParts.join(' ');
    const correctSentence = currentPuzzle.correctOrder.join(' ');
    const correct = builtSentence === correctSentence;
    
    setIsCorrect(correct);
    setShowResult(true);

    if (correct) {
      const bonus = Math.min(streak, 5) * 3;
      setScore(prev => prev + 15 + bonus);
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
    fetchAndGeneratePuzzles();
  };

  const handleShuffle = () => {
    if (currentPuzzle) {
      const allParts = [...selectedParts, ...availableParts];
      const shuffled = allParts.sort(() => Math.random() - 0.5);
      setAvailableParts(shuffled);
      setSelectedParts([]);
    }
  };

  // Play TTS
  const playTTS = async (text: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/korean-tts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, speed: 0.9 }),
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
        <h2 className="text-2xl font-bold mb-2">문장 완성 완료! 🏆</h2>
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

      {/* Word Info */}
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
      </div>

      {/* Sentence Building Area */}
      <motion.div
        key={currentIndex}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-card border-2 border-dashed border-cyan-500/30 rounded-2xl p-6 min-h-[100px]"
      >
        <p className="text-xs text-muted-foreground mb-3 text-center">
          조각을 클릭하여 문장을 완성하세요
        </p>
        <div className="flex flex-wrap gap-2 justify-center min-h-[48px]">
          {selectedParts.length === 0 ? (
            <span className="text-muted-foreground italic">여기에 문장이 만들어집니다...</span>
          ) : (
            selectedParts.map((part, idx) => (
              <motion.button
                key={`selected-${idx}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={() => !showResult && handleRemovePart(idx)}
                disabled={showResult}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  showResult
                    ? isCorrect
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-2 border-green-500'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-2 border-red-500'
                    : 'bg-cyan-500 text-white hover:bg-cyan-600'
                }`}
              >
                {part}
              </motion.button>
            ))
          )}
        </div>
      </motion.div>

      {/* Available Parts */}
      {!showResult && (
        <div className="bg-muted/50 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground">사용 가능한 조각</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShuffle}
              className="h-8"
            >
              <Shuffle className="w-4 h-4 mr-1" />
              섞기
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {availableParts.map((part, idx) => (
              <motion.button
                key={`available-${idx}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSelectPart(part, idx)}
                className="px-4 py-2 rounded-lg font-medium bg-card border-2 border-border hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all"
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
              <span className="font-bold text-lg">완벽해요! +{15 + Math.min(streak - 1, 4) * 3}점</span>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <XCircle className="w-6 h-6" />
                <span className="font-bold text-lg">다시 도전!</span>
              </div>
              <p className="text-sm">
                정답: {currentPuzzle.correctOrder.join(' ')}
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center gap-3">
        {!showResult ? (
          <Button 
            onClick={handleCheck}
            disabled={selectedParts.length !== currentPuzzle.shuffledParts.length}
            size="lg"
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
          >
            확인하기
          </Button>
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
