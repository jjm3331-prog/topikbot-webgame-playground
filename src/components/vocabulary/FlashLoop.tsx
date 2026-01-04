import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { 
  Play, 
  ChevronRight, 
  CheckCircle2,
  RotateCcw,
  Loader2,
  Zap,
  Eye,
  EyeOff,
  ThumbsUp,
  ThumbsDown,
  Globe
} from "lucide-react";
import { useVocabulary, VocabWord } from "@/hooks/useVocabulary";

interface FlashLoopProps {
  level: number;
  onMistake?: (word: VocabWord) => void;
}

type FlashPhase = 'word' | 'meaning' | 'result';

const FlashLoop = ({ level, onMistake }: FlashLoopProps) => {
  const { t } = useTranslation();
  const { getMeaning, getCurrentLanguage, languageLabels } = useVocabulary();
  
  const [words, setWords] = useState<VocabWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<FlashPhase>('word');
  const [isLoading, setIsLoading] = useState(true);
  const [showMeaning, setShowMeaning] = useState(false);
  const [knownWords, setKnownWords] = useState<Set<string>>(new Set());
  const [unknownWords, setUnknownWords] = useState<Set<string>>(new Set());
  const [sessionComplete, setSessionComplete] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [countdown, setCountdown] = useState(3);
  
  // 세션 내 이미 본 단어 ID 추적 (중복 방지)
  const sessionSeenWords = useRef<Set<string>>(new Set());

  const currentWord = words[currentIndex];
  const currentLang = getCurrentLanguage();

  // Fetch vocabulary from DB with deduplication
  const fetchWords = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('topik_vocabulary')
        .select('*')
        .eq('level', level)
        .order('seq_no')
        .limit(200); // 더 많이 가져와서 중복 제거 후 필터링

      if (error) throw error;

      if (data && data.length > 0) {
        // 세션 내 이미 본 단어 제외
        const unseenWords = data.filter(w => !sessionSeenWords.current.has(w.id));
        
        console.log(`[FlashLoop] Level ${level}: ${unseenWords.length}/${data.length} new words`);
        
        // 충분한 단어가 있으면 미본 단어만 사용
        const wordsToUse = unseenWords.length >= 20 ? unseenWords : data;
        
        // Shuffle words and take 20
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

  // Countdown timer for word phase
  useEffect(() => {
    if (!autoPlay || phase !== 'word' || !currentWord || sessionComplete) return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setPhase('meaning');
      setShowMeaning(true);
    }
  }, [phase, currentWord, autoPlay, sessionComplete, countdown]);


  const handleKnow = () => {
    if (!currentWord) return;
    setKnownWords(prev => new Set([...prev, currentWord.id]));
    moveToNext();
  };

  const handleDontKnow = () => {
    if (!currentWord) return;
    setUnknownWords(prev => new Set([...prev, currentWord.id]));
    onMistake?.(currentWord);
    moveToNext();
  };

  const moveToNext = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setPhase('word');
      setShowMeaning(false);
      setCountdown(3);
    } else {
      setSessionComplete(true);
    }
  };

  const handleShowMeaning = () => {
    setPhase('meaning');
    setShowMeaning(true);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setPhase('word');
    setKnownWords(new Set());
    setUnknownWords(new Set());
    setSessionComplete(false);
    setShowMeaning(false);
    setCountdown(3);
    fetchWords();
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">{t("flashLoop.loading")}</p>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">{t("flashLoop.noData")}</p>
        <Button onClick={fetchWords}>{t("flashLoop.retry")}</Button>
      </div>
    );
  }

  if (sessionComplete) {
    const knownCount = knownWords.size;
    const unknownCount = unknownWords.size;
    const total = words.length;
    const percentage = Math.round((knownCount / total) * 100);

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mx-auto mb-6">
          <Zap className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-2xl font-bold mb-2">{t("flashLoop.complete")} 🎉</h2>
        
        <div className="flex justify-center gap-8 my-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-500">{knownCount}</div>
            <div className="text-sm text-muted-foreground">{t("flashLoop.know")}</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-500">{unknownCount}</div>
            <div className="text-sm text-muted-foreground">{t("flashLoop.dontKnow")}</div>
          </div>
        </div>

        <div className="w-48 h-3 bg-muted rounded-full mx-auto mb-4 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-green-400 to-green-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="text-muted-foreground mb-6">{t("flashLoop.accuracy")} {percentage}%</p>

        <Button onClick={handleRestart} size="lg">
          <RotateCcw className="w-4 h-4 mr-2" />
          {t("flashLoop.restart")}
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress & Language Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            {currentIndex + 1} / {words.length}
          </span>
          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all"
              style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Globe className="w-4 h-4" />
          <span>{languageLabels[currentLang]}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-1 text-green-500">
          <ThumbsUp className="w-4 h-4" />
          <span className="font-medium">{knownWords.size}</span>
        </div>
        <div className="flex items-center gap-1 text-red-500">
          <ThumbsDown className="w-4 h-4" />
          <span className="font-medium">{unknownWords.size}</span>
        </div>
      </div>

      {/* Flash Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, rotateY: -90 }}
          animate={{ opacity: 1, rotateY: 0 }}
          exit={{ opacity: 0, rotateY: 90 }}
          transition={{ duration: 0.3 }}
          className="bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-red-500/10 border-2 border-yellow-500/30 rounded-3xl p-8 text-center min-h-[320px] flex flex-col justify-center relative overflow-hidden"
        >
          {/* Background decoration */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-yellow-400/5 via-transparent to-transparent" />
          
          {/* Countdown indicator */}
          {phase === 'word' && autoPlay && (
            <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">{countdown}</span>
            </div>
          )}

          <div className="relative z-10">
            {/* Korean Word */}
            <motion.h1 
              className="text-5xl md:text-6xl font-bold mb-3"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {currentWord.word}
            </motion.h1>
            
            {/* Part of Speech */}
            <motion.p 
              className="text-muted-foreground mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {currentWord.pos || ''}
            </motion.p>
            

            {/* Meaning (shown when revealed) */}
            <AnimatePresence>
              {showMeaning && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mt-4 p-4 bg-background/50 rounded-xl border border-border"
                >
                  <p className="text-sm text-muted-foreground mb-1">
                    {languageLabels[currentLang]} {t("flashLoop.meaning")}:
                  </p>
                  <p className="text-2xl font-semibold text-primary">
                    {getMeaning(currentWord)}
                  </p>
                  {currentWord.example_phrase && (
                    <p className="text-sm text-muted-foreground mt-3 italic">
                      {t("flashLoop.example")}) {currentWord.example_phrase}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="space-y-3">
        {phase === 'word' && !showMeaning && (
          <div className="flex justify-center">
            <Button 
              variant="outline" 
              onClick={handleShowMeaning}
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              {t("flashLoop.showMeaning")}
            </Button>
          </div>
        )}

        {showMeaning && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 gap-4"
          >
            <Button
              onClick={handleDontKnow}
              variant="outline"
              size="lg"
              className="h-16 text-lg border-red-500/50 hover:bg-red-500/10 hover:border-red-500"
            >
              <ThumbsDown className="w-5 h-5 mr-2 text-red-500" />
              <span>{t("flashLoop.dontKnow")}</span>
            </Button>
            <Button
              onClick={handleKnow}
              size="lg"
              className="h-16 text-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              <ThumbsUp className="w-5 h-5 mr-2" />
              <span>{t("flashLoop.know")}</span>
            </Button>
          </motion.div>
        )}
      </div>

      {/* Auto-play toggle */}
      <div className="flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAutoPlay(!autoPlay)}
          className="text-muted-foreground"
        >
          {autoPlay ? <Play className="w-4 h-4 mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
          {autoPlay ? t("flashLoop.autoOn") : t("flashLoop.manualMode")}
        </Button>
      </div>
    </div>
  );
};

export default FlashLoop;
