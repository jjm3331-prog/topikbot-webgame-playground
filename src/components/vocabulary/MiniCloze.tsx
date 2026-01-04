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
  Lightbulb,
  ChevronRight,
  Globe,
  Volume2
} from "lucide-react";
import { useVocabulary, VocabWord } from "@/hooks/useVocabulary";

interface ClozeQuestion {
  id: string;
  sentence: string;
  blank_word: string;
  wrong_answer: string;
  hint?: string;
  level: number;
}

interface MiniClozeProps {
  level: number;
  onMistake?: (question: ClozeQuestion | VocabWord) => void;
}

const MiniCloze = ({ level, onMistake }: MiniClozeProps) => {
  const { t } = useTranslation();
  const { getMeaning, getCurrentLanguage, languageLabels } = useVocabulary();
  const [questions, setQuestions] = useState<ClozeQuestion[]>([]);
  const [vocabQuestions, setVocabQuestions] = useState<VocabWord[]>([]);
  const [useVocabMode, setUseVocabMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  
  // 세션 내 이미 본 문제 ID 추적 (중복 방지)
  const sessionSeenQuestions = useRef<Set<string>>(new Set());

  const currentQuestion = useVocabMode ? vocabQuestions[currentIndex] : questions[currentIndex];
  const currentLang = getCurrentLanguage();

  // Fetch cloze questions from DB, fallback to vocab-based, with deduplication
  const fetchQuestions = useCallback(async () => {
    setIsLoading(true);
    try {
      // First try cloze_questions table
      const { data: clozeData, error: clozeError } = await supabase
        .from('cloze_questions')
        .select('*')
        .eq('level', level)
        .limit(50); // 더 많이 가져와서 중복 제거

      if (!clozeError && clozeData && clozeData.length > 0) {
        // 세션 내 이미 본 문제 제외
        const unseenQuestions = clozeData.filter(q => !sessionSeenQuestions.current.has(q.id));
        console.log(`[MiniCloze] Level ${level}: ${unseenQuestions.length}/${clozeData.length} new cloze questions`);
        
        const questionsToUse = unseenQuestions.length >= 10 ? unseenQuestions : clozeData;
        const shuffled = [...questionsToUse].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, 10);
        
        // 선택된 문제들을 세션 기록에 추가
        selected.forEach(q => sessionSeenQuestions.current.add(q.id));
        
        setQuestions(selected);
        setUseVocabMode(false);
      } else {
        // Fallback: Generate from vocabulary
        const { data: vocabData, error: vocabError } = await supabase
          .from('topik_vocabulary')
          .select('*')
          .eq('level', level)
          .not('example_phrase', 'is', null)
          .order('seq_no')
          .limit(100); // 더 많이 가져와서 중복 제거

        if (!vocabError && vocabData && vocabData.length > 0) {
          // 세션 내 이미 본 어휘 제외
          const unseenVocab = vocabData.filter(v => !sessionSeenQuestions.current.has(v.id));
          console.log(`[MiniCloze] Level ${level}: ${unseenVocab.length}/${vocabData.length} new vocab`);
          
          const vocabToUse = unseenVocab.length >= 10 ? unseenVocab : vocabData;
          const shuffled = [...vocabToUse].sort(() => Math.random() - 0.5);
          const selected = shuffled.slice(0, 10) as VocabWord[];
          
          // 선택된 어휘들을 세션 기록에 추가
          selected.forEach(v => sessionSeenQuestions.current.add(v.id));
          
          setVocabQuestions(selected);
          setUseVocabMode(true);
        } else {
          setQuestions([]);
          setVocabQuestions([]);
        }
      }
    } catch (error) {
      console.error('Error fetching cloze questions:', error);
      setQuestions([]);
      setVocabQuestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [level]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Generate options when question changes
  useEffect(() => {
    if (!currentQuestion) return;
    
    if (useVocabMode) {
      const vocab = currentQuestion as VocabWord;
      // Get other words for wrong answers
      const otherWords = vocabQuestions
        .filter(w => w.id !== vocab.id)
        .slice(0, 3)
        .map(w => w.word);
      
      const allOptions = [vocab.word, ...otherWords];
      setOptions(allOptions.sort(() => Math.random() - 0.5));
    } else {
      const q = currentQuestion as ClozeQuestion;
      setOptions([q.blank_word, q.wrong_answer].sort(() => Math.random() - 0.5));
    }
  }, [currentQuestion, useVocabMode, vocabQuestions]);

  const handleSelect = (answer: string) => {
    if (showResult) return;
    
    setSelectedAnswer(answer);
    setShowResult(true);
    
    const correctAnswer = useVocabMode 
      ? (currentQuestion as VocabWord).word 
      : (currentQuestion as ClozeQuestion).blank_word;
    
    const isCorrect = answer === correctAnswer;
    
    if (isCorrect) {
      const bonus = Math.min(streak, 5) * 2;
      setScore(prev => prev + 10 + bonus);
      setStreak(prev => prev + 1);
    } else {
      setStreak(0);
      onMistake?.(currentQuestion);
    }
  };

  const handleNext = () => {
    const totalQuestions = useVocabMode ? vocabQuestions.length : questions.length;
    
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setShowHint(false);
    } else {
      setSessionComplete(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setSessionComplete(false);
    setSelectedAnswer(null);
    setShowResult(false);
    setShowHint(false);
    fetchQuestions();
  };

  // Render sentence with blank - 정답은 showResult 후에만 표시
  const renderSentence = () => {
    if (!currentQuestion) return null;
    
    if (useVocabMode) {
      const vocab = currentQuestion as VocabWord;
      const phrase = vocab.example_phrase || `_____ 을/를 사용합니다.`;
      // 문장에서 정답 단어를 찾아서 빈칸으로 대체
      const parts = phrase.includes(vocab.word) 
        ? phrase.split(vocab.word) 
        : phrase.split('_____');
      
      return (
        <p className="text-xl md:text-2xl font-medium leading-relaxed">
          {parts[0]}
          <span className="inline-block min-w-[80px] border-b-4 border-primary mx-2 text-center">
            {showResult ? (
              <span className={selectedAnswer === vocab.word ? 'text-green-500' : 'text-red-500'}>
                {vocab.word}
              </span>
            ) : (
              <span className="text-muted-foreground">?</span>
            )}
          </span>
          {parts[1] || ''}
        </p>
      );
    } else {
      const q = currentQuestion as ClozeQuestion;
      // sentence에 _____ 가 포함되어 있으면 그대로 사용, 아니면 blank_word를 빈칸으로 대체
      let parts: string[];
      if (q.sentence.includes('_____')) {
        parts = q.sentence.split('_____');
      } else if (q.sentence.includes(q.blank_word)) {
        parts = q.sentence.split(q.blank_word);
      } else {
        parts = [q.sentence, ''];
      }
      
      return (
        <p className="text-xl md:text-2xl font-medium leading-relaxed">
          {parts[0]}
          <span className="inline-block min-w-[80px] border-b-4 border-primary mx-2 text-center">
            {showResult ? (
              <span className={selectedAnswer === q.blank_word ? 'text-green-500' : 'text-red-500'}>
                {q.blank_word}
              </span>
            ) : (
              <span className="text-muted-foreground">?</span>
            )}
          </span>
          {parts[1] || ''}
        </p>
      );
    }
  };

  const totalQuestions = useVocabMode ? vocabQuestions.length : questions.length;

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">{t("miniCloze.loading")}</p>
      </div>
    );
  }

  if (totalQuestions === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">
          {t("miniCloze.noData")}
        </p>
        <Button onClick={fetchQuestions}>{t("miniCloze.retry")}</Button>
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
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-2xl font-bold mb-2">{t("miniCloze.complete")} 🎯</h2>
        <p className="text-3xl font-bold text-primary mb-2">{score}{t("miniCloze.points")}</p>
        <p className="text-muted-foreground mb-6">
          {totalQuestions}{t("miniCloze.questions")} {t("miniCloze.accuracy")}: {Math.round((score / (totalQuestions * 10)) * 100)}%
        </p>
        <Button onClick={handleRestart} size="lg">
          <RotateCcw className="w-4 h-4 mr-2" />
          {t("miniCloze.restart")}
        </Button>
      </motion.div>
    );
  }

  // Get hint for vocab mode - 정답을 직접 보여주지 않고 힌트만 제공
  const getHint = () => {
    if (useVocabMode) {
      const vocab = currentQuestion as VocabWord;
      const word = vocab.word;
      // 첫 글자 + ○ 형태로 힌트 제공 (예: "가○○" for "가지다")
      if (word.length <= 1) return word[0] + '...';
      const firstChar = word[0];
      const circles = '○'.repeat(word.length - 1);
      return `${firstChar}${circles} (${word.length}글자)`;
    }
    const q = currentQuestion as ClozeQuestion;
    // cloze_questions의 hint도 정답이면 첫글자 힌트로 변환
    if (q.hint === q.blank_word) {
      const word = q.blank_word;
      if (word.length <= 1) return word[0] + '...';
      return `${word[0]}${'○'.repeat(word.length - 1)} (${word.length}글자)`;
    }
    return q.hint || `${q.blank_word[0]}${'○'.repeat(q.blank_word.length - 1)} (${q.blank_word.length}글자)`;
  };

  return (
    <div className="space-y-6">
      {/* Progress & Score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            {currentIndex + 1} / {totalQuestions}
          </span>
          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
              style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          {streak >= 3 && (
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-orange-500 font-bold"
            >
              🔥 {streak} {t("miniCloze.streak")}
            </motion.span>
          )}
          <span className="text-lg font-bold text-primary">{score}{t("miniCloze.points")}</span>
        </div>
      </div>

      {/* Language indicator */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Globe className="w-4 h-4" />
        <span>{t("miniCloze.hint")}: {languageLabels[currentLang]}</span>
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-2 border-purple-500/20 rounded-3xl p-6 md:p-8"
        >
          {/* Sentence with blank */}
          <div className="text-center mb-8">
            {renderSentence()}
          </div>

          {/* Hint Button */}
          {!showResult && (
            <div className="text-center mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHint(!showHint)}
                className="text-muted-foreground"
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                {languageLabels[currentLang]} {t("miniCloze.showHint")}
              </Button>
              <AnimatePresence>
                {showHint && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 p-3 bg-background/50 rounded-lg border border-border"
                  >
                    <p className="text-sm text-primary font-medium">
                      💡 {getHint()}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Options */}
          <div className="grid grid-cols-2 gap-4">
            {options.map((option, idx) => {
              const correctAnswer = useVocabMode 
                ? (currentQuestion as VocabWord).word 
                : (currentQuestion as ClozeQuestion).blank_word;
              const isCorrect = option === correctAnswer;
              const isSelected = selectedAnswer === option;
              
              return (
                <motion.button
                  key={idx}
                  whileHover={{ scale: showResult ? 1 : 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleSelect(option)}
                  disabled={showResult}
                  className={`p-4 md:p-6 rounded-2xl text-lg font-medium transition-all flex items-center justify-center gap-2 ${
                    showResult
                      ? isCorrect
                        ? "bg-green-100 dark:bg-green-900/30 border-2 border-green-500 text-green-700 dark:text-green-400"
                        : isSelected
                          ? "bg-red-100 dark:bg-red-900/30 border-2 border-red-500 text-red-700 dark:text-red-400"
                          : "bg-muted border-2 border-border text-muted-foreground"
                      : "bg-card border-2 border-border hover:border-purple-500/50 hover:bg-purple-500/5"
                  }`}
                >
                  {showResult && isCorrect && <CheckCircle2 className="w-5 h-5" />}
                  {showResult && isSelected && !isCorrect && <XCircle className="w-5 h-5" />}
                  {option}
                </motion.button>
              );
            })}
          </div>

          {/* Result Feedback */}
          {showResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 text-center"
            >
              {(() => {
                const correctAnswer = useVocabMode 
                  ? (currentQuestion as VocabWord).word 
                  : (currentQuestion as ClozeQuestion).blank_word;
                return selectedAnswer === correctAnswer ? (
                  <p className="text-green-500 font-bold text-lg">{t("miniCloze.correct")} ✨</p>
                ) : (
                  <p className="text-red-500 font-bold text-lg">
                    {t("miniCloze.wrong")} "{correctAnswer}"
                  </p>
                );
              })()}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Next Button */}
      {showResult && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center"
        >
          <Button onClick={handleNext} size="lg">
            {t("miniCloze.nextQuestion")} <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default MiniCloze;
