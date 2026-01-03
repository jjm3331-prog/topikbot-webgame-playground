import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import i18n from '@/i18n/config';
import { ArrowLeft, Music, Sparkles, RotateCcw, Trophy, Youtube, RefreshCw, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";

interface MV {
  id: string;
  artist: string;
  song: string;
  youtubeId: string;
}

interface AIQuiz {
  question: string;
  options: string[];
  correctIndex: number;
  funFact: string;
}

const KPop = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [mvList, setMvList] = useState<MV[]>([]);
  const [globalIndex, setGlobalIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [videoKey, setVideoKey] = useState(0);
  
  // AI Quiz state
  const [aiQuiz, setAiQuiz] = useState<AIQuiz | null>(null);
  const [aiQuizLoading, setAiQuizLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizAnswered, setQuizAnswered] = useState(false);

  const currentMV = mvList[globalIndex];

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

  useEffect(() => {
    if (gameComplete && !scoreSaved) {
      saveScoreToProfile(score);
    }
  }, [gameComplete, scoreSaved, score]);

  const loadMVList = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('kpop_lyrics')
        .select('id, artist, song, youtube_id')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((q: any) => ({
        id: q.id,
        artist: q.artist,
        song: q.song,
        youtubeId: q.youtube_id,
      }));
      
      setMvList(mapped);
    } catch (error) {
      console.error('[KPop] loadMVList failed:', error);
      toast.error(t('kpop.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const goToMV = useCallback((newIndex: number) => {
    if (newIndex < 0 || newIndex >= mvList.length) return;
    setGlobalIndex(newIndex);
    setVideoKey(prev => prev + 1);
    setAiQuiz(null);
    setSelectedOption(null);
    setQuizAnswered(false);
  }, [mvList.length]);

  useEffect(() => { loadMVList(); }, []);

  // Auto-load AI quiz when MV changes
  useEffect(() => {
    if (currentMV && !aiQuiz && !aiQuizLoading) {
      loadAiQuiz();
    }
  }, [globalIndex, currentMV]);

  const loadAiQuiz = async () => {
    if (!currentMV || aiQuizLoading) return;
    setAiQuizLoading(true);
    setAiQuiz(null);
    setSelectedOption(null);
    setQuizAnswered(false);
    
    try {
      const { data, error } = await supabase.functions.invoke('kpop-quiz-ai', {
        body: { artist: currentMV.artist, song: currentMV.song, language: i18n.language }
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
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

  const handleNextMV = () => {
    if (globalIndex < mvList.length - 1) {
      goToMV(globalIndex + 1);
    } else {
      goToMV(0);
    }
  };

  const handlePrevMV = () => {
    if (globalIndex > 0) {
      goToMV(globalIndex - 1);
    } else {
      goToMV(mvList.length - 1);
    }
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
              <Button onClick={() => { setScore(0); setScoreSaved(false); setGameComplete(false); goToMV(0); }} className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500"><RotateCcw className="w-4 h-4 mr-2" />{t('kpop.playAgain')}</Button>
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
            <span className="text-gray-400 text-sm">{globalIndex + 1} / {mvList.length}</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-4">
            <motion.div className="h-full bg-gradient-to-r from-pink-500 to-purple-500" animate={{ width: `${((globalIndex + 1) / Math.max(mvList.length, 1)) * 100}%` }} />
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

        {currentMV && (
          <div className="max-w-lg mx-auto px-4 pb-8">
            <motion.div key={currentMV.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-black/40 backdrop-blur-xl rounded-3xl overflow-hidden border border-pink-500/30">
              <div className="relative aspect-video bg-black">
                <iframe
                  key={videoKey}
                  src={`https://www.youtube.com/embed/${currentMV.youtubeId}?autoplay=1&mute=0&rel=0&modestbranding=1`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                <button onClick={() => window.open(`https://youtube.com/watch?v=${currentMV.youtubeId}`, '_blank')} className="absolute bottom-3 right-3 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5">
                  <Youtube className="w-4 h-4" /> YouTube
                </button>
              </div>

              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-xl">🎤</div>
                  <div>
                    <h3 className="text-white font-bold">{currentMV.artist}</h3>
                    <p className="text-pink-400 text-sm">"{currentMV.song}"</p>
                  </div>
                </div>

                {/* AI Quiz Section */}
                <div className="mt-4">
                  {aiQuizLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="text-3xl">✨</motion.div>
                      <span className="ml-3 text-gray-300">{t('kpop.loadingQuiz') || 'Loading Quiz...'}</span>
                    </div>
                  ) : aiQuiz ? (
                    <div className="space-y-4">
                      <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-xl p-4">
                        <p className="text-white font-medium text-center">✨ {aiQuiz.question}</p>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-2">
                        {aiQuiz.options.map((option, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleAiQuizAnswer(idx)}
                            disabled={quizAnswered}
                            className={`p-3 rounded-xl text-left transition-all ${
                              quizAnswered
                                ? idx === aiQuiz.correctIndex
                                  ? 'bg-green-500/30 border-2 border-green-500 text-green-300'
                                  : idx === selectedOption
                                    ? 'bg-red-500/30 border-2 border-red-500 text-red-300'
                                    : 'bg-white/10 text-gray-400'
                                : 'bg-white/10 hover:bg-white/20 text-white border border-transparent hover:border-pink-500/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold">
                                {String.fromCharCode(65 + idx)}
                              </span>
                              <span className="flex-1">{option}</span>
                              {quizAnswered && idx === aiQuiz.correctIndex && <Check className="w-5 h-5 text-green-400" />}
                              {quizAnswered && idx === selectedOption && idx !== aiQuiz.correctIndex && <X className="w-5 h-5 text-red-400" />}
                            </div>
                          </button>
                        ))}
                      </div>

                      {quizAnswered && aiQuiz.funFact && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4"
                        >
                          <p className="text-yellow-300 text-sm">💡 {aiQuiz.funFact}</p>
                        </motion.div>
                      )}

                      {quizAnswered && (
                        <Button onClick={handleNextMV} className="w-full bg-gradient-to-r from-cyan-500 to-blue-500">
                          {t('kpop.nextMV') || 'Next MV'} →
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-6 gap-3">
                      <p className="text-gray-400">{t('kpop.quizNotLoaded') || 'Quiz not loaded'}</p>
                      <Button onClick={loadAiQuiz} variant="outline" className="border-pink-500/50 text-pink-400">
                        <RefreshCw className="w-4 h-4 mr-2" /> {t('kpop.retryQuiz') || 'Retry'}
                      </Button>
                    </div>
                  )}
                </div>
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
