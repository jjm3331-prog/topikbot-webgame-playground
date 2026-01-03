import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n/config";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RotateCcw, Trophy, Youtube, Sparkles, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";

interface DramaScene {
  id: string;
  drama: string;
  dramaEn: string;
  youtubeId: string;
  timestamp: number;
  character: string;
  korean: string;
  vietnamese: string;
  context: string;
  difficulty: string;
  audioTip: string;
  genre: string;
}

interface AIQuiz {
  question: string;
  options: string[];
  correctIndex: number;
  funFact: string;
}

const KDrama = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [allScenes, setAllScenes] = useState<DramaScene[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [globalIndex, setGlobalIndex] = useState(0);
  const [currentScene, setCurrentScene] = useState<DramaScene | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [videoKey, setVideoKey] = useState(0);
  
  // AI Quiz states
  const [aiQuiz, setAiQuiz] = useState<AIQuiz | null>(null);
  const [aiQuizLoading, setAiQuizLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizAnswered, setQuizAnswered] = useState(false);

  // Save score to profile
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
      const moneyEarned = Math.floor(finalScore * 5);
      
      await supabase
        .from('profiles')
        .update({ 
          points: profile.points + finalScore,
          money: profile.money + moneyEarned
        })
        .eq('id', session.user.id);
      
      setScoreSaved(true);
      toast.success(`💰 +${finalScore}${t('kdrama.score')}, ₩${moneyEarned.toLocaleString()}`);
    }
  };

  useEffect(() => {
    if (gameComplete && !scoreSaved) {
      saveScoreToProfile(score);
    }
  }, [gameComplete, scoreSaved, score]);

  // Load all scenes
  const loadAllScenes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/drama-lines`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ count: 100 }),
        }
      );

      if (!response.ok) throw new Error('Failed to load');
      const data = await response.json();
      
      if (data.scenes && data.scenes.length > 0) {
        setAllScenes(data.scenes);
        setTotalCount(data.scenes.length);
        setCurrentScene(data.scenes[0]);
        setGlobalIndex(0);
      }
    } catch (error) {
      console.error('Load error:', error);
      toast.error(t('kdrama.loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadAllScenes(); }, []);

  // Navigation
  const goToScene = (newIndex: number) => {
    if (newIndex < 0 || newIndex >= allScenes.length) return;
    setGlobalIndex(newIndex);
    setCurrentScene(allScenes[newIndex]);
    setVideoKey(prev => prev + 1);
    setAiQuiz(null);
    setSelectedOption(null);
    setQuizAnswered(false);
  };

  const handleNextDrama = () => {
    if (globalIndex < allScenes.length - 1) {
      goToScene(globalIndex + 1);
    } else {
      goToScene(0); // Loop back
    }
  };

  const handlePrevDrama = () => {
    if (globalIndex > 0) {
      goToScene(globalIndex - 1);
    } else {
      goToScene(allScenes.length - 1); // Loop to last
    }
  };

  // Load AI Quiz
  const loadAiQuiz = async () => {
    if (!currentScene || aiQuizLoading) return;
    setAiQuizLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('kdrama-quiz-ai', {
        body: { 
          drama: currentScene.drama, 
          dramaEn: currentScene.dramaEn,
          character: currentScene.character,
          language: i18n.language 
        }
      });
      if (error) throw error;
      setAiQuiz(data);
    } catch (err) {
      console.error('[KDrama] AI Quiz error:', err);
      toast.error(t('kdrama.aiQuizError'));
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
      toast.success(`${t('kdrama.correct')} +10${t('kdrama.score')}`);
    } else {
      toast.error(t('kdrama.wrong'));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-slate-900 via-purple-900 to-[#0f0f23] flex flex-col">
        <CleanHeader />
        <div className="flex-1 flex items-center justify-center">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="text-6xl">🎬</motion.div>
        </div>
        <AppFooter />
      </div>
    );
  }

  if (gameComplete) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-slate-900 via-purple-900 to-[#0f0f23] flex flex-col">
        <CleanHeader />
        <div className="flex-1 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-black/60 backdrop-blur-xl rounded-3xl p-8 text-center max-w-md w-full border border-purple-500/30">
            <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">{t('kdrama.complete')} 🎬</h2>
            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-6 mb-6">
              <p className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">{score}{t('kdrama.score')}</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => navigate('/dashboard')} variant="outline" className="flex-1 border-gray-600">
                <ArrowLeft className="w-4 h-4 mr-2" />{t('kdrama.backToDashboard')}
              </Button>
              <Button onClick={() => { setScore(0); setScoreSaved(false); setGameComplete(false); goToScene(0); }} className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500">
                <RotateCcw className="w-4 h-4 mr-2" />{t('kdrama.restart')}
              </Button>
            </div>
          </motion.div>
        </div>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-900 via-purple-900 to-[#0f0f23] flex flex-col">
      <CleanHeader />
      
      {/* Stats Bar */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-purple-500/20 bg-black/40 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎬</span>
          <span className="text-white font-bold">{t('kdrama.title')}</span>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-yellow-400" />
          <span className="text-yellow-400 font-bold">{score}</span>
        </div>
      </div>
      
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-4">
          {/* Progress */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">{globalIndex + 1} / {totalCount}</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-4">
            <motion.div className="h-full bg-gradient-to-r from-purple-500 to-pink-500" animate={{ width: `${((globalIndex + 1) / Math.max(totalCount, 1)) * 100}%` }} />
          </div>

          {/* Prev/Next Navigation */}
          <div className="flex gap-2 mb-4">
            <Button onClick={handlePrevDrama} variant="outline" className="flex-1 border-purple-500/50 text-purple-400 hover:bg-purple-500/20">
              ← {t('kdrama.prevDrama')}
            </Button>
            <Button onClick={handleNextDrama} className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500">
              {t('kdrama.nextDrama')} →
            </Button>
          </div>
        </div>

        {/* Main Content */}
        {currentScene && (
          <div className="max-w-lg mx-auto px-4 pb-8">
            <motion.div key={currentScene.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-black/40 backdrop-blur-xl rounded-3xl overflow-hidden border border-purple-500/30">
              {/* YouTube Player */}
              <div className="relative aspect-video bg-black">
                <iframe
                  key={videoKey}
                  src={`https://www.youtube.com/embed/${currentScene.youtubeId}?start=${currentScene.timestamp}&autoplay=1&mute=0&rel=0&modestbranding=1`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                <button onClick={() => window.open(`https://youtube.com/watch?v=${currentScene.youtubeId}&t=${currentScene.timestamp}`, '_blank')} className="absolute bottom-3 right-3 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5">
                  <Youtube className="w-4 h-4" /> YouTube
                </button>
              </div>

              {/* Content */}
              <div className="p-5">
                {/* Drama Info */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-xl">🎭</div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold">{currentScene.drama}</h3>
                    <p className="text-purple-400 text-sm">{currentScene.character} · {currentScene.dramaEn}</p>
                  </div>
                </div>

                {/* Dialogue */}
                <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-xl p-4 mb-4">
                  <p className="text-lg text-white font-medium mb-2">{currentScene.korean}</p>
                  <p className="text-gray-400 text-sm">{currentScene.vietnamese}</p>
                </div>

                {/* Context */}
                <div className="bg-white/5 rounded-xl p-3 mb-4">
                  <p className="text-gray-400 text-sm">📍 {currentScene.context}</p>
                </div>

                {/* AI Quiz Button */}
                {!aiQuiz && !aiQuizLoading && (
                  <Button onClick={loadAiQuiz} className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 mb-4">
                    <Sparkles className="w-4 h-4 mr-2" />
                    {t('kdrama.generateQuiz')}
                  </Button>
                )}

                {/* AI Quiz Loading */}
                {aiQuizLoading && (
                  <div className="flex items-center justify-center py-4 mb-4">
                    <Loader2 className="w-6 h-6 animate-spin text-cyan-400 mr-2" />
                    <span className="text-gray-400">{t('kdrama.aiQuizLoading')}</span>
                  </div>
                )}

                {/* AI Quiz */}
                <AnimatePresence>
                  {aiQuiz && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
                      <div className="bg-gradient-to-br from-cyan-900/30 to-blue-900/30 rounded-xl p-4 border border-cyan-500/30">
                        <h4 className="text-cyan-400 font-bold mb-3 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" /> {t('kdrama.aiQuizTitle')}
                        </h4>
                        <p className="text-white mb-4">{aiQuiz.question}</p>
                        
                        <div className="space-y-2">
                          {aiQuiz.options.map((option, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleAiQuizAnswer(idx)}
                              disabled={quizAnswered}
                              className={`w-full p-3 rounded-lg text-left text-sm transition-all ${
                                quizAnswered
                                  ? idx === aiQuiz.correctIndex
                                    ? 'bg-green-500/30 border border-green-500 text-green-400'
                                    : idx === selectedOption
                                    ? 'bg-red-500/30 border border-red-500 text-red-400'
                                    : 'bg-white/5 text-gray-500'
                                  : 'bg-white/10 hover:bg-white/20 text-white'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {quizAnswered && idx === aiQuiz.correctIndex && <Check className="w-4 h-4 text-green-400" />}
                                {quizAnswered && idx === selectedOption && idx !== aiQuiz.correctIndex && <X className="w-4 h-4 text-red-400" />}
                                <span>{option}</span>
                              </div>
                            </button>
                          ))}
                        </div>

                        {quizAnswered && aiQuiz.funFact && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                            <p className="text-yellow-400 text-sm">💡 {t('kdrama.funFact')}: {aiQuiz.funFact}</p>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Next Drama Button */}
                <Button onClick={handleNextDrama} className="w-full bg-gradient-to-r from-purple-500 to-pink-500">
                  {t('kdrama.nextDrama')} →
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </main>
      <AppFooter />
    </div>
  );
};

export default KDrama;
