import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n/config';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, Sparkles, Trophy, RotateCcw, Loader2, Check, X, Lightbulb, Flame, Zap } from 'lucide-react';
import CleanHeader from '@/components/CleanHeader';
import AppFooter from '@/components/AppFooter';

interface QuizQuestion {
  expression: string;
  meaning: string;
  example: string;
  options: string[];
  correctIndex: number;
  category: 'idiom' | 'slang';
  difficulty: 'easy' | 'medium' | 'hard';
}

type GameMode = 'menu' | 'playing' | 'result';

export default function Manager() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [mode, setMode] = useState<GameMode>('menu');
  const [category, setCategory] = useState<'idiom' | 'slang' | 'mixed'>('mixed');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const currentQuestion = questions[currentIndex];

  const loadQuiz = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('idiom-slang-quiz', {
        body: { 
          category, 
          count: 10, 
          language: i18n.language 
        }
      });
      
      if (error) throw error;
      setQuestions(data.questions || []);
      setCurrentIndex(0);
      setScore(0);
      setStreak(0);
      setMaxStreak(0);
      setSelectedOption(null);
      setIsAnswered(false);
      setShowHint(false);
      setMode('playing');
    } catch (err) {
      console.error('[SlangQuiz] Load error:', err);
      toast.error(t('slangQuiz.loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);
    
    const isCorrect = idx === currentQuestion.correctIndex;
    if (isCorrect) {
      const basePoints = currentQuestion.difficulty === 'easy' ? 10 : currentQuestion.difficulty === 'medium' ? 15 : 20;
      const hintPenalty = showHint ? 0.5 : 1;
      const streakBonus = Math.min(streak, 5);
      const points = Math.floor(basePoints * hintPenalty) + streakBonus;
      setScore(prev => prev + points);
      setStreak(prev => {
        const newStreak = prev + 1;
        setMaxStreak(max => Math.max(max, newStreak));
        return newStreak;
      });
      toast.success(`${t('slangQuiz.correct')} +${points}${t('slangQuiz.points')}`);
    } else {
      setStreak(0);
      toast.error(t('slangQuiz.wrong'));
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setShowHint(false);
    } else {
      setMode('result');
    }
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'easy': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'hard': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getCategoryEmoji = (cat: string) => cat === 'idiom' ? '📚' : '🔥';

  // Menu Screen
  if (mode === 'menu') {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-orange-900 via-amber-900 to-[#0f0f23] flex flex-col">
        <CleanHeader />
        <main className="flex-1 overflow-y-auto p-4">
          <div className="max-w-md mx-auto space-y-6">
            {/* Header */}
            <div className="text-center py-6">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-6xl mb-4">🗣️</motion.div>
              <h1 className="text-2xl font-bold text-white mb-2">{t('slangQuiz.title')}</h1>
              <p className="text-amber-300">{t('slangQuiz.subtitle')}</p>
            </div>

            {/* Category Selection */}
            <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-5 border border-amber-500/30">
              <h2 className="text-white font-bold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                {t('slangQuiz.selectCategory')}
              </h2>
              
              <div className="space-y-3">
                <button
                  onClick={() => setCategory('idiom')}
                  className={`w-full p-4 rounded-xl border transition-all ${category === 'idiom' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/30'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📚</span>
                    <div className="text-left">
                      <div className="font-bold">{t('slangQuiz.idiomCategory')}</div>
                      <div className="text-sm opacity-70">{t('slangQuiz.idiomDesc')}</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setCategory('slang')}
                  className={`w-full p-4 rounded-xl border transition-all ${category === 'slang' ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/30'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🔥</span>
                    <div className="text-left">
                      <div className="font-bold">{t('slangQuiz.slangCategory')}</div>
                      <div className="text-sm opacity-70">{t('slangQuiz.slangDesc')}</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setCategory('mixed')}
                  className={`w-full p-4 rounded-xl border transition-all ${category === 'mixed' ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/30'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🎲</span>
                    <div className="text-left">
                      <div className="font-bold">{t('slangQuiz.mixedCategory')}</div>
                      <div className="text-sm opacity-70">{t('slangQuiz.mixedDesc')}</div>
                    </div>
                  </div>
                </button>
              </div>

              <Button
                onClick={loadQuiz}
                disabled={isLoading}
                className="w-full mt-6 py-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-lg font-bold"
              >
                {isLoading ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />{t('common.loading')}</>
                ) : (
                  <><Zap className="w-5 h-5 mr-2" />{t('slangQuiz.startQuiz')}</>
                )}
              </Button>
            </div>

            {/* Info */}
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <p className="text-gray-400 text-sm">{t('slangQuiz.info')}</p>
            </div>

            <Button
              onClick={() => navigate('/games')}
              variant="outline"
              className="w-full border-gray-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.back')}
            </Button>
          </div>
        </main>
        <AppFooter />
      </div>
    );
  }

  // Result Screen
  if (mode === 'result') {
    const percentage = Math.round((score / (questions.length * 15)) * 100);
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-orange-900 via-amber-900 to-[#0f0f23] flex flex-col">
        <CleanHeader />
        <main className="flex-1 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-black/60 backdrop-blur-xl rounded-3xl p-8 text-center max-w-md w-full border border-amber-500/30">
            <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">{t('slangQuiz.complete')} 🎉</h2>
            
            <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-xl p-6 mb-4">
              <p className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
                {score}{t('slangQuiz.points')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-gray-400 text-sm">{t('slangQuiz.maxStreak')}</p>
                <p className="text-2xl font-bold text-orange-400">🔥 {maxStreak}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-gray-400 text-sm">{t('slangQuiz.accuracy')}</p>
                <p className="text-2xl font-bold text-amber-400">{percentage}%</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={() => navigate('/games')} variant="outline" className="flex-1 border-gray-600">
                <ArrowLeft className="w-4 h-4 mr-2" />{t('common.back')}
              </Button>
              <Button onClick={loadQuiz} className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500">
                <RotateCcw className="w-4 h-4 mr-2" />{t('slangQuiz.playAgain')}
              </Button>
            </div>
          </motion.div>
        </main>
        <AppFooter />
      </div>
    );
  }

  // Loading
  if (isLoading || !currentQuestion) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-orange-900 via-amber-900 to-[#0f0f23] flex flex-col">
        <CleanHeader />
        <div className="flex-1 flex items-center justify-center">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="text-6xl">🗣️</motion.div>
        </div>
        <AppFooter />
      </div>
    );
  }

  // Playing Screen
  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-orange-900 via-amber-900 to-[#0f0f23] flex flex-col">
      <CleanHeader />
      
      {/* Stats Bar */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-amber-500/20 bg-black/40 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🗣️</span>
          <span className="text-white font-bold">{t('slangQuiz.title')}</span>
        </div>
        <div className="flex items-center gap-3">
          {streak > 0 && <span className="text-orange-400 font-bold">🔥 {streak}</span>}
          <div className="flex items-center gap-1">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 font-bold">{score}</span>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-4">
          {/* Progress */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">{currentIndex + 1} / {questions.length}</span>
            <span className={`px-2 py-1 rounded-full text-xs border ${getDifficultyColor(currentQuestion.difficulty)}`}>
              {currentQuestion.difficulty === 'easy' ? t('slangQuiz.easy') : currentQuestion.difficulty === 'medium' ? t('slangQuiz.medium') : t('slangQuiz.hard')}
            </span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-4">
            <motion.div className="h-full bg-gradient-to-r from-amber-500 to-orange-500" animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
          </div>
        </div>

        {/* Question Card */}
        <div className="max-w-lg mx-auto px-4 pb-8">
          <motion.div key={currentIndex} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-black/40 backdrop-blur-xl rounded-3xl overflow-hidden border border-amber-500/30 p-5">
            
            {/* Category Badge */}
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 rounded-full bg-white/10 text-sm">
                {getCategoryEmoji(currentQuestion.category)} {currentQuestion.category === 'idiom' ? t('slangQuiz.idiom') : t('slangQuiz.slang')}
              </span>
            </div>

            {/* Expression */}
            <div className="bg-gradient-to-br from-amber-900/50 to-orange-900/50 rounded-xl p-5 mb-4 text-center">
              <p className="text-2xl font-bold text-white mb-2">"{currentQuestion.expression}"</p>
              <p className="text-amber-300 text-sm">{t('slangQuiz.whatMeans')}</p>
            </div>

            {/* Hint */}
            {showHint && !isAnswered && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-4">
                <div className="flex items-center gap-2 text-yellow-400">
                  <Lightbulb className="w-4 h-4" />
                  <span className="text-sm">💡 {t('slangQuiz.example')}: {currentQuestion.example}</span>
                </div>
              </motion.div>
            )}

            {/* Options */}
            <div className="space-y-2 mb-4">
              {currentQuestion.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={isAnswered}
                  className={`w-full p-4 rounded-xl text-left transition-all ${
                    isAnswered
                      ? idx === currentQuestion.correctIndex
                        ? 'bg-green-500/30 border-2 border-green-500 text-green-400'
                        : idx === selectedOption
                        ? 'bg-red-500/30 border-2 border-red-500 text-red-400'
                        : 'bg-white/5 border border-white/10 text-gray-500'
                      : 'bg-white/10 border border-white/20 text-white hover:bg-white/20 hover:border-amber-500/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isAnswered && idx === currentQuestion.correctIndex && <Check className="w-5 h-5 text-green-400" />}
                    {isAnswered && idx === selectedOption && idx !== currentQuestion.correctIndex && <X className="w-5 h-5 text-red-400" />}
                    <span className="font-medium">{option}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Correct Answer Explanation */}
            {isAnswered && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/5 rounded-xl p-4 mb-4">
                <p className="text-gray-300 text-sm">
                  <span className="text-amber-400 font-bold">{t('slangQuiz.meaning')}:</span> {currentQuestion.meaning}
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  <span className="text-amber-400 font-bold">{t('slangQuiz.example')}:</span> {currentQuestion.example}
                </p>
              </motion.div>
            )}

            {/* Actions */}
            {!isAnswered ? (
              <div className="flex gap-2">
                {!showHint && (
                  <Button onClick={() => setShowHint(true)} variant="outline" className="flex-1 border-yellow-500/50 text-yellow-400">
                    <Lightbulb className="w-4 h-4 mr-2" />{t('slangQuiz.hint')}
                  </Button>
                )}
              </div>
            ) : (
              <Button onClick={handleNext} className="w-full bg-gradient-to-r from-amber-500 to-orange-500">
                {currentIndex < questions.length - 1 ? `${t('slangQuiz.next')} →` : `${t('slangQuiz.viewResult')} 🏆`}
              </Button>
            )}
          </motion.div>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
