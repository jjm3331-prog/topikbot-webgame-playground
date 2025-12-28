import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { 
  Play, 
  Volume2, 
  ChevronRight, 
  CheckCircle2,
  RotateCcw,
  Loader2,
  Zap,
  Eye,
  EyeOff
} from "lucide-react";

interface VocabWord {
  id: string;
  word: string;
  pos: string;
  level: number;
  example_phrase: string;
  meaning_vi?: string;
  meaning_en?: string;
  example_sentence?: string;
  example_sentence_vi?: string;
}

interface FlashLoopProps {
  level: number;
  onMistake?: (word: VocabWord) => void;
}

type FlashPhase = 'word' | 'meaning' | 'example' | 'test';

const FlashLoop = ({ level, onMistake }: FlashLoopProps) => {
  const { t, i18n } = useTranslation();
  const [words, setWords] = useState<VocabWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<FlashPhase>('word');
  const [isLoading, setIsLoading] = useState(true);
  const [showMeaning, setShowMeaning] = useState(false);
  const [testAnswer, setTestAnswer] = useState('');
  const [testResult, setTestResult] = useState<'correct' | 'wrong' | null>(null);
  const [score, setScore] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [sessionComplete, setSessionComplete] = useState(false);

  const currentWord = words[currentIndex];

  // Fetch vocabulary from DB
  const fetchWords = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('topik_vocabulary')
        .select('*')
        .eq('level', level)
        .not('meaning_vi', 'is', null)
        .order('seq_no')
        .limit(20);

      if (error) throw error;

      if (data && data.length > 0) {
        // Shuffle words
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        setWords(shuffled.slice(0, 10));
      } else {
        // Fallback to generated content if no pre-stored data
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

  // Auto-advance timer for word phase (3 seconds)
  useEffect(() => {
    if (!autoPlay || phase !== 'word' || !currentWord || sessionComplete) return;

    const timer = setTimeout(() => {
      setPhase('meaning');
    }, 3000);

    return () => clearTimeout(timer);
  }, [phase, currentWord, autoPlay, sessionComplete]);

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

  // Get meaning based on current language
  const getMeaning = (word: VocabWord) => {
    const lang = i18n.language;
    switch (lang) {
      case 'vi': return word.meaning_vi || word.meaning_en || '뜻 없음';
      case 'en': return word.meaning_en || word.meaning_vi || 'No meaning';
      default: return word.meaning_vi || word.meaning_en || '뜻 없음';
    }
  };

  const handleNextPhase = () => {
    switch (phase) {
      case 'word':
        setPhase('meaning');
        break;
      case 'meaning':
        setPhase('example');
        break;
      case 'example':
        setPhase('test');
        break;
      case 'test':
        handleNext();
        break;
    }
  };

  const handleNext = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setPhase('word');
      setShowMeaning(false);
      setTestAnswer('');
      setTestResult(null);
    } else {
      setSessionComplete(true);
    }
  };

  const handleTestSubmit = () => {
    if (!currentWord) return;

    const normalizedAnswer = testAnswer.trim().toLowerCase();
    const correctAnswer = getMeaning(currentWord).toLowerCase();
    
    // Simple matching - could be improved with fuzzy matching
    const isCorrect = correctAnswer.includes(normalizedAnswer) || 
                      normalizedAnswer.includes(correctAnswer.split(',')[0].trim());

    if (isCorrect) {
      setTestResult('correct');
      setScore(prev => prev + 10);
    } else {
      setTestResult('wrong');
      onMistake?.(currentWord);
    }

    setTimeout(() => {
      handleNext();
    }, 1500);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setPhase('word');
    setScore(0);
    setSessionComplete(false);
    setTestAnswer('');
    setTestResult(null);
    fetchWords();
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">단어 로딩 중...</p>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">이 레벨의 어휘 데이터가 없습니다.</p>
        <Button onClick={fetchWords}>다시 시도</Button>
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-2xl font-bold mb-2">세션 완료! 🎉</h2>
        <p className="text-3xl font-bold text-primary mb-6">{score}점</p>
        <p className="text-muted-foreground mb-6">
          {words.length}개 단어를 학습했습니다
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
      {/* Progress & Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            {currentIndex + 1} / {words.length}
          </span>
          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all"
              style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-primary">{score}점</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAutoPlay(!autoPlay)}
          >
            {autoPlay ? <Play className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Flash Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentIndex}-${phase}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 rounded-3xl p-8 text-center min-h-[300px] flex flex-col justify-center"
        >
          {phase === 'word' && (
            <>
              <motion.h1 
                className="text-5xl font-bold mb-4"
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
              >
                {currentWord.word}
              </motion.h1>
              <p className="text-muted-foreground mb-4">{currentWord.pos}</p>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => playTTS(currentWord.word)}
              >
                <Volume2 className="w-5 h-5" />
              </Button>
              <p className="text-xs text-muted-foreground mt-4">3초 후 자동 진행...</p>
            </>
          )}

          {phase === 'meaning' && (
            <>
              <h2 className="text-3xl font-bold mb-2">{currentWord.word}</h2>
              <div className="relative">
                <button
                  onClick={() => setShowMeaning(!showMeaning)}
                  className="flex items-center gap-2 mx-auto text-lg text-muted-foreground hover:text-foreground transition"
                >
                  {showMeaning ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  {showMeaning ? '숨기기' : '뜻 보기'}
                </button>
                <AnimatePresence>
                  {showMeaning && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-2xl font-medium text-primary mt-4"
                    >
                      {getMeaning(currentWord)}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}

          {phase === 'example' && (
            <>
              <h2 className="text-2xl font-bold mb-4">{currentWord.word}</h2>
              <p className="text-lg text-muted-foreground mb-2">예시:</p>
              <p className="text-xl font-medium mb-2">
                {currentWord.example_sentence || currentWord.example_phrase}
              </p>
              {currentWord.example_sentence_vi && showMeaning && (
                <p className="text-muted-foreground">
                  {currentWord.example_sentence_vi}
                </p>
              )}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => playTTS(currentWord.example_sentence || currentWord.example_phrase)}
                className="mt-4"
              >
                <Volume2 className="w-5 h-5 mr-2" />
                발음 듣기
              </Button>
            </>
          )}

          {phase === 'test' && (
            <>
              <h2 className="text-3xl font-bold mb-6">{currentWord.word}</h2>
              <p className="text-muted-foreground mb-4">이 단어의 뜻을 입력하세요:</p>
              
              {testResult === null ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={testAnswer}
                    onChange={(e) => setTestAnswer(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTestSubmit()}
                    placeholder="뜻 입력..."
                    className="w-full max-w-xs mx-auto px-4 py-3 rounded-xl bg-background border-2 border-border focus:border-primary outline-none text-center text-lg"
                    autoFocus
                  />
                  <div className="flex gap-2 justify-center">
                    <Button onClick={handleTestSubmit} disabled={!testAnswer.trim()}>
                      확인
                    </Button>
                    <Button variant="ghost" onClick={handleNext}>
                      건너뛰기
                    </Button>
                  </div>
                </div>
              ) : (
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className={`text-2xl font-bold ${
                    testResult === 'correct' ? 'text-green-500' : 'text-red-500'
                  }`}
                >
                  {testResult === 'correct' ? '정답! ✅' : `오답 ❌ 정답: ${getMeaning(currentWord)}`}
                </motion.div>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Phase Navigation */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {['word', 'meaning', 'example', 'test'].map((p, i) => (
            <div
              key={p}
              className={`w-3 h-3 rounded-full transition-colors ${
                phase === p ? 'bg-primary' : 
                ['word', 'meaning', 'example', 'test'].indexOf(phase) > i ? 'bg-primary/50' : 'bg-muted'
              }`}
            />
          ))}
        </div>
        <Button onClick={handleNextPhase}>
          다음 <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};

export default FlashLoop;
