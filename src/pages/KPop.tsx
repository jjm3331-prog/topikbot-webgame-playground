import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import i18n from '@/i18n/config';
import { ArrowLeft, Music, Sparkles, Check, X, Lightbulb, RotateCcw, Trophy, Youtube, Timer, Zap, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";

interface Question {
  id: string;
  artist: string;
  song: string;
  youtubeId: string;
  timestamp: number;
  lyricLine: string;
  answer: string;
  hint: string;
  difficulty: string;
  points: number;
}

interface AIQuiz {
  question: string;
  options: string[];
  correctIndex: number;
  funFact: string;
}

const TIMER_DURATION = 20;

const KPop = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [usedIds, setUsedIds] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [gameComplete, setGameComplete] = useState(false);
  const [timerMode, setTimerMode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoKey, setVideoKey] = useState(0);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [aiQuiz, setAiQuiz] = useState<AIQuiz | null>(null);
  const [aiQuizLoading, setAiQuizLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const currentQuestion = questions[currentIndex];

  // Save score to profile when game complete
  const saveScoreToProfile = async (finalScore: number) => {
    if (scoreSaved || finalScore <= 0) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('points, money')
      .eq('id', session.user.id)
      .single();

    if (profile) {
      const moneyEarned = Math.floor(finalScore * 8);
      
      await supabase
        .from('profiles')
        .update({ 
          points: profile.points + finalScore,
          money: profile.money + moneyEarned
        })
        .eq('id', session.user.id);
      
      setScoreSaved(true);
      toast.success(`💰 +${finalScore}${t('kpop.score')}, ₩${moneyEarned.toLocaleString()}`);
    }
  };

  // Save score when game ends
  useEffect(() => {
    if (gameComplete && !scoreSaved) {
      saveScoreToProfile(score);
    }
  }, [gameComplete, scoreSaved, score]);

  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const loadAllQuestions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('kpop_lyrics')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((q: any) => ({
        id: q.id,
        artist: q.artist,
        song: q.song,
        youtubeId: q.youtube_id,
        timestamp: q.timestamp || 0,
        lyricLine: q.lyric_line,
        answer: q.answer,
        hint: q.hint || '',
        difficulty: q.difficulty,
        points: q.points || 10
      }));
      
      setAllQuestions(mapped);
      setTotalCount(mapped.length);
      if (mapped.length > 0) {
        setQuestions([mapped[0]]);
        setCurrentIndex(0);
      }
    } catch (error) {
      console.error('[KPop] loadAllQuestions failed:', error);
      toast.error(t('kpop.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const [globalIndex, setGlobalIndex] = useState(0);

  const goToMV = (newIndex: number) => {
    if (newIndex < 0 || newIndex >= allQuestions.length) return;
    setGlobalIndex(newIndex);
    setQuestions([allQuestions[newIndex]]);
    setCurrentIndex(0);
    setUserAnswer('');
    setShowHint(false);
    setIsAnswered(false);
    setTimeLeft(TIMER_DURATION);
    setVideoLoaded(false);
    setVideoKey(prev => prev + 1);
    setAiQuiz(null);
    setSelectedOption(null);
    setQuizAnswered(false);
  };

  useEffect(() => { loadAllQuestions(); }, []);

  useEffect(() => {
    if (timerMode && !isAnswered && !isLoading && questions.length > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) { handleTimeUp(); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerMode, isAnswered, isLoading, currentIndex]);

  const handleTimeUp = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsCorrect(false);
    setIsAnswered(true);
    setStreak(0);
    if (currentQuestion) setUsedIds(prev => [...prev, currentQuestion.id]);
    toast.error(`⏰ ${t('kpop.timeout')} ${t('kpop.answer')}: ${currentQuestion?.answer}`);
  }, [currentQuestion]);

  useEffect(() => {
    if (!isLoading && !isAnswered && inputRef.current) inputRef.current.focus();
  }, [isLoading, isAnswered, currentIndex]);

  const handleSubmit = () => {
    if (!userAnswer.trim() || !currentQuestion) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const correct = userAnswer.trim().toLowerCase() === currentQuestion.answer.toLowerCase();
    setIsCorrect(correct);
    setIsAnswered(true);
    setUsedIds(prev => [...prev, currentQuestion.id]);

    if (correct) {
      const timerBonus = timerMode ? Math.floor(timeLeft / 2) : 0;
      const points = Math.floor((currentQuestion.points + timerBonus) * (showHint ? 0.5 : 1));
      setScore(prev => prev + points);
      setStreak(prev => prev + 1);
      toast.success(`${t('kpop.correct')} +${points}${t('kpop.score')} 🎉`);
      // Replay video highlight
      setVideoKey(prev => prev + 1);
    } else {
      setStreak(0);
      toast.error(`${t('kpop.wrong')} ${t('kpop.answer')}: ${currentQuestion.answer}`);
    }
  };

  const handleNextMV = () => {
    if (globalIndex < allQuestions.length - 1) {
      goToMV(globalIndex + 1);
    } else {
      // Loop back to first
      goToMV(0);
    }
  };

  const handlePrevMV = () => {
    if (globalIndex > 0) {
      goToMV(globalIndex - 1);
    } else {
      // Loop to last
      goToMV(allQuestions.length - 1);
    }
  };

  // Load AI Quiz for current artist
  const loadAiQuiz = async () => {
    if (!currentQuestion || aiQuizLoading) return;
    setAiQuizLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('kpop-quiz-ai', {
        body: { artist: currentQuestion.artist, song: currentQuestion.song, language: i18n.language }
      });
      if (error) throw error;
      setAiQuiz(data);
    } catch (err) {
      console.error('[KPop] AI Quiz error:', err);
      toast.error(t('kpop.aiQuizError'));
    } finally {
      setAiQuizLoading(false);
    }
  };

  const handleAiQuizAnswer = (idx: number) => {
    if (quizAnswered || !aiQuiz) return;
    setSelectedOption(idx);
    setQuizAnswered(true);
    if (idx === aiQuiz.correctIndex) {
      setScore(prev => prev + 10);
      toast.success(`${t('kpop.correct')} +10${t('kpop.score')}`);
    } else {
      toast.error(t('kpop.wrong'));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') isAnswered ? handleNextMV() : handleSubmit();
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-purple-900 via-pink-900 to-[#0f0f23] flex flex-col">
        <CleanHeader />
        <div className="flex-1 flex items-center justify-center">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="text-6xl">🎵</motion.div>
        </div>
        <AppFooter />
      </div>
    );
  }

  if (gameComplete) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-purple-900 via-pink-900 to-[#0f0f23] flex flex-col">
        <CleanHeader />
        <div className="flex-1 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-black/60 backdrop-blur-xl rounded-3xl p-8 text-center max-w-md w-full border border-pink-500/30">
            <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">{t('kpop.complete')} 🎉</h2>
            <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-xl p-6 mb-6">
              <p className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">{score}{t('kpop.score')}</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => navigate('/dashboard')} variant="outline" className="flex-1 border-gray-600"><ArrowLeft className="w-4 h-4 mr-2" />{t('kpop.backToDashboard')}</Button>
              <Button onClick={() => { setScore(0); setStreak(0); setScoreSaved(false); setGameComplete(false); goToMV(0); }} className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500"><RotateCcw className="w-4 h-4 mr-2" />{t('kpop.playAgain')}</Button>
            </div>
          </motion.div>
        </div>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-purple-900 via-pink-900 to-[#0f0f23] flex flex-col">
      <CleanHeader />
      
      {/* Stats Bar */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-pink-500/20 bg-black/40 backdrop-blur-xl">
        <div className="flex items-center gap-2"><Music className="w-5 h-5 text-pink-400" /><span className="text-white font-bold">{t('kpop.title')}</span></div>
        <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-yellow-400" /><span className="text-yellow-400 font-bold">{score}</span></div>
      </div>
      
      <main className="flex-1 overflow-y-auto">

      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">{globalIndex + 1} / {totalCount}</span>
          {streak > 0 && <span className="text-orange-400 text-sm">🔥 {streak}</span>}
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-4">
          <motion.div className="h-full bg-gradient-to-r from-pink-500 to-purple-500" animate={{ width: `${((globalIndex + 1) / Math.max(totalCount, 1)) * 100}%` }} />
        </div>

        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setTimerMode(!timerMode)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${timerMode ? 'bg-cyan-500 text-white' : 'bg-white/10 text-gray-300'}`}>
            <Zap className="w-3 h-3" /> {t('kpop.timer')} {timerMode ? 'ON' : 'OFF'}
          </button>
          {timerMode && !isAnswered && (
            <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/50 ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : timeLeft <= 10 ? 'text-yellow-400' : 'text-green-400'}`}>
              <Timer className="w-3 h-3" /><span className="font-bold">{timeLeft}s</span>
            </div>
          )}
        </div>

        {/* Prev/Next MV Navigation */}
        <div className="flex gap-2 mb-4">
          <Button onClick={handlePrevMV} variant="outline" className="flex-1 border-pink-500/50 text-pink-400 hover:bg-pink-500/20">
            ← {t('kpop.prevMV') || 'Prev MV'}
          </Button>
          <Button onClick={handleNextMV} className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500">
            {t('kpop.nextMV') || 'Next MV'} →
          </Button>
        </div>
      </div>

      {currentQuestion && (
        <div className="max-w-lg mx-auto px-4 pb-8">
          <motion.div key={currentQuestion.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-black/40 backdrop-blur-xl rounded-3xl overflow-hidden border border-pink-500/30">
            <div className="relative aspect-video bg-black">
              <iframe
                key={videoKey}
                ref={iframeRef}
                src={`https://www.youtube.com/embed/${currentQuestion.youtubeId}?start=${currentQuestion.timestamp}&autoplay=1&mute=0&rel=0&modestbranding=1${isAnswered && isCorrect ? '&loop=1' : ''}`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onLoad={() => setVideoLoaded(true)}
              />
              {isAnswered && isCorrect && (
                <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} className="absolute top-3 left-3 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                  🎵 {t('kpop.highlightPlaying')}
                </motion.div>
              )}
              <button onClick={() => window.open(`https://youtube.com/watch?v=${currentQuestion.youtubeId}&t=${currentQuestion.timestamp}`, '_blank')} className="absolute bottom-3 right-3 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5">
                <Youtube className="w-4 h-4" /> YouTube
              </button>
            </div>

            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-xl">🎤</div>
                <div><h3 className="text-white font-bold">{currentQuestion.artist}</h3><p className="text-pink-400 text-sm">"{currentQuestion.song}"</p></div>
                <span className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${currentQuestion.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' : currentQuestion.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>{currentQuestion.points}{t('kpop.score')}</span>
              </div>

              <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-xl p-4 mb-4">
                <p className="text-lg text-white text-center font-medium">🎵 {currentQuestion.lyricLine}</p>
              </div>

              {showHint && !isAnswered && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-4">
                  <div className="flex items-center gap-2 text-yellow-400"><Lightbulb className="w-4 h-4" /><span className="text-sm">💡 {currentQuestion.hint}</span></div>
                </div>
              )}

              {isAnswered && (
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`rounded-xl p-4 mb-4 ${isCorrect ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
                  <div className="flex items-center gap-3">
                    {isCorrect ? <Check className="w-6 h-6 text-green-400" /> : <X className="w-6 h-6 text-red-400" />}
                    <div>
                      <p className={`font-bold ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>{isCorrect ? `${t('kpop.correct')} 🎉` : `${t('kpop.wrong')}!`}</p>
                      {!isCorrect && <p className="text-gray-300 text-sm">{t('kpop.answer')}: <span className="text-pink-400 font-bold">{currentQuestion.answer}</span></p>}
                    </div>
                  </div>
                </motion.div>
              )}

              {!isAnswered ? (
                <div className="space-y-3">
                  <Input ref={inputRef} value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} onKeyPress={handleKeyPress} placeholder={t('kpop.blankAnswer')} className="bg-white/10 border-pink-500/30 text-white text-center text-lg py-5" />
                  <div className="flex gap-2">
                    {!showHint && <Button onClick={() => setShowHint(true)} variant="outline" size="sm" className="flex-1 border-yellow-500/50 text-yellow-400"><Lightbulb className="w-4 h-4 mr-1" />{t('kpop.hint')}</Button>}
                    <Button onClick={handleSubmit} disabled={!userAnswer.trim()} className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500">{t('kpop.submit')}</Button>
                  </div>
                </div>
              ) : (
                <Button onClick={handleNextMV} className="w-full bg-gradient-to-r from-cyan-500 to-blue-500">{t('kpop.nextMV') || 'Next MV'} →</Button>
              )}
            </div>
          </motion.div>
        </div>
      )}
      </main>
      <AppFooter />
    </div>
  );
};

export default KPop;
