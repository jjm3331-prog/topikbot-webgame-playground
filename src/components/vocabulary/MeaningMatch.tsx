import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { 
  CheckCircle2,
  XCircle,
  RotateCcw,
  Loader2,
  Shuffle,
  Globe,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { useVocabulary, VocabWord } from "@/hooks/useVocabulary";

interface MeaningMatchProps {
  level: number;
  onMistake?: (word: VocabWord) => void;
}

interface MatchPair {
  word: VocabWord;
  meaning: string;
}

const MeaningMatch = ({ level, onMistake }: MeaningMatchProps) => {
  const { t } = useTranslation();
  const { getMeaning, getCurrentLanguage, languageLabels } = useVocabulary();
  const [words, setWords] = useState<VocabWord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [round, setRound] = useState(0);
  const [selectedWord, setSelectedWord] = useState<VocabWord | null>(null);
  const [selectedMeaning, setSelectedMeaning] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [wrongPairs, setWrongPairs] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  
  // Current round words (5 at a time)
  const [currentWords, setCurrentWords] = useState<VocabWord[]>([]);
  const [shuffledMeanings, setShuffledMeanings] = useState<MatchPair[]>([]);
  
  // 세션 내 이미 본 단어 ID 추적 (중복 방지)
  const sessionSeenWords = useRef<Set<string>>(new Set());

  const currentLang = getCurrentLanguage();
  const totalRounds = Math.ceil(words.length / 5);

  // Fetch vocabulary from DB with deduplication
  const fetchWords = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('topik_vocabulary')
        .select('*')
        .eq('level', level)
        .order('seq_no')
        .limit(100); // 더 많이 가져와서 중복 제거 후 필터링

      if (error) throw error;

      if (data && data.length > 0) {
        // 세션 내 이미 본 단어 제외
        const unseenWords = data.filter(w => !sessionSeenWords.current.has(w.id));
        
        console.log(`[MeaningMatch] Level ${level}: ${unseenWords.length}/${data.length} new words`);
        
        // 충분한 단어가 있으면 미본 단어만 사용
        const wordsToUse = unseenWords.length >= 20 ? unseenWords : data;
        
        const shuffled = [...wordsToUse].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, 20) as VocabWord[];
        
        // 선택된 단어들을 세션 기록에 추가
        selected.forEach(w => sessionSeenWords.current.add(w.id));
        
        setWords(selected);
      } else {
        setWords([]);
      }
    } catch (error) {
      console.error('Error fetching vocabulary:', error);
      setWords([]);
    } finally {
      setIsLoading(false);
    }
  }, [level]);

  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  // Setup current round
  useEffect(() => {
    if (words.length === 0) return;
    
    const startIdx = round * 5;
    const endIdx = Math.min(startIdx + 5, words.length);
    const roundWords = words.slice(startIdx, endIdx);
    
    if (roundWords.length === 0) {
      setSessionComplete(true);
      return;
    }

    setCurrentWords(roundWords);
    
    // Create shuffled meanings
    const pairs: MatchPair[] = roundWords.map(word => ({
      word,
      meaning: getMeaning(word)
    }));
    setShuffledMeanings(pairs.sort(() => Math.random() - 0.5));
    
    // Reset states
    setMatchedPairs(new Set());
    setWrongPairs(new Set());
    setSelectedWord(null);
    setSelectedMeaning(null);
  }, [round, words, getMeaning]);

  const handleWordClick = (word: VocabWord) => {
    if (matchedPairs.has(word.id)) return;
    setSelectedWord(word);
    
    if (selectedMeaning) {
      checkMatch(word, selectedMeaning);
    }
  };

  const handleMeaningClick = (meaning: string, wordId: string) => {
    if (matchedPairs.has(wordId)) return;
    setSelectedMeaning(meaning);
    
    if (selectedWord) {
      checkMatch(selectedWord, meaning);
    }
  };

  const checkMatch = (word: VocabWord, meaning: string) => {
    const correctMeaning = getMeaning(word);
    const isMatch = meaning === correctMeaning;
    
    setIsCorrect(isMatch);
    setShowResult(true);

    if (isMatch) {
      setMatchedPairs(prev => new Set([...prev, word.id]));
      setScore(prev => prev + 10 + Math.min(streak, 5) * 2);
      setStreak(prev => prev + 1);
    } else {
      setWrongPairs(prev => new Set([...prev, word.id]));
      setStreak(0);
      onMistake?.(word);
    }

    setTimeout(() => {
      setShowResult(false);
      setSelectedWord(null);
      setSelectedMeaning(null);
      setWrongPairs(new Set());
      
      // Check if round complete
      if (isMatch && matchedPairs.size + 1 >= currentWords.length) {
        if (round + 1 >= totalRounds) {
          setSessionComplete(true);
        } else {
          setRound(prev => prev + 1);
        }
      }
    }, isMatch ? 800 : 1200);
  };

  const handleRestart = () => {
    setRound(0);
    setScore(0);
    setStreak(0);
    setSessionComplete(false);
    fetchWords();
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">{t("meaningMatch.loading")}</p>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">{t("meaningMatch.noData")}</p>
        <Button onClick={fetchWords}>{t("meaningMatch.retry")}</Button>
      </div>
    );
  }

  if (sessionComplete) {
    const totalPossible = words.length * 10;
    const percentage = Math.round((score / totalPossible) * 100);

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center mx-auto mb-6">
          <Shuffle className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-2xl font-bold mb-2">{t("meaningMatch.complete")} 🎯</h2>
        <p className="text-4xl font-bold text-primary mb-2">{score}{t("meaningMatch.points")}</p>
        <p className="text-muted-foreground mb-6">
          {words.length}{t("meaningMatch.pairs")} • {t("meaningMatch.accuracy")} {percentage}%
        </p>
        <Button onClick={handleRestart} size="lg">
          <RotateCcw className="w-4 h-4 mr-2" />
          {t("meaningMatch.restart")}
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
            {t("meaningMatch.round")} {round + 1} / {totalRounds}
          </span>
          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-pink-400 to-rose-500 transition-all"
              style={{ width: `${((round + 1) / totalRounds) * 100}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          {streak >= 3 && (
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-orange-500 font-bold text-sm"
            >
              🔥 {streak}{t("meaningMatch.streak")}
            </motion.span>
          )}
          <span className="text-lg font-bold text-primary">{score}{t("meaningMatch.points")}</span>
        </div>
      </div>

      {/* Language indicator */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <span className="font-medium">{t("meaningMatch.koreanWord")}</span>
        <ArrowRight className="w-4 h-4" />
        <Globe className="w-4 h-4" />
        <span className="font-medium">{languageLabels[currentLang]}</span>
      </div>

      {/* Matching Area */}
      <div className="grid grid-cols-2 gap-4 md:gap-6">
        {/* Korean Words (Left) */}
        <div className="space-y-3">
          <p className="text-xs text-center text-muted-foreground mb-2">{t("meaningMatch.koreanWord")}</p>
          {currentWords.map((word, idx) => {
            const isMatched = matchedPairs.has(word.id);
            const isWrong = wrongPairs.has(word.id);
            const isSelected = selectedWord?.id === word.id;
            
            return (
              <motion.button
                key={word.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => handleWordClick(word)}
                disabled={isMatched}
                className={`w-full p-4 rounded-xl text-lg font-bold transition-all ${
                  isMatched
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-2 border-green-500'
                    : isWrong
                      ? 'bg-red-100 dark:bg-red-900/30 border-2 border-red-500 animate-shake'
                      : isSelected
                        ? 'bg-primary text-primary-foreground border-2 border-primary shadow-lg scale-105'
                        : 'bg-card border-2 border-border hover:border-primary/50 hover:shadow-md'
                }`}
              >
                {isMatched && <CheckCircle2 className="w-4 h-4 inline mr-2" />}
                {isWrong && <XCircle className="w-4 h-4 inline mr-2" />}
                {word.word}
              </motion.button>
            );
          })}
        </div>

        {/* Meanings (Right) */}
        <div className="space-y-3">
          <p className="text-xs text-center text-muted-foreground mb-2">{languageLabels[currentLang]} {t("meaningMatch.meaning")}</p>
          {shuffledMeanings.map((pair, idx) => {
            const isMatched = matchedPairs.has(pair.word.id);
            const isSelected = selectedMeaning === pair.meaning && !isMatched;
            
            return (
              <motion.button
                key={`${pair.word.id}-meaning`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => handleMeaningClick(pair.meaning, pair.word.id)}
                disabled={isMatched}
                className={`w-full p-4 rounded-xl text-base font-medium transition-all text-left ${
                  isMatched
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-2 border-green-500'
                    : isSelected
                      ? 'bg-pink-500 text-white border-2 border-pink-500 shadow-lg scale-105'
                      : 'bg-card border-2 border-border hover:border-pink-500/50 hover:shadow-md'
                }`}
              >
                {isMatched && <CheckCircle2 className="w-4 h-4 inline mr-2" />}
                {pair.meaning}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Result Feedback */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`text-center py-4 rounded-xl ${
              isCorrect 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
            }`}
          >
            <p className="font-bold text-lg">
              {isCorrect ? (
                <>
                  <Sparkles className="w-5 h-5 inline mr-2" />
                  {t("meaningMatch.correct")} +{10 + Math.min(streak - 1, 4) * 2}{t("meaningMatch.points")}
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 inline mr-2" />
                  {t("meaningMatch.wrong")}
                </>
              )}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions */}
      <p className="text-center text-sm text-muted-foreground">
        {t("meaningMatch.instruction", { lang: languageLabels[currentLang] })}
      </p>
    </div>
  );
};

export default MeaningMatch;
