import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Music, Sparkles, Check, X, Lightbulb, RotateCcw, Trophy, Youtube, Timer, Zap, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

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

const TIMER_DURATION = 20;

const KPop = () => {
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
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const currentQuestion = questions[currentIndex];

  const loadQuestions = async (selectedDifficulty?: string | null) => {
    setIsLoading(true);
    setVideoLoaded(false);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kpop-lyrics`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            difficulty: selectedDifficulty,
            excludeIds: usedIds,
            validate: true,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to load');
      const data = await response.json();
      setQuestions(data.questions || []);
      setCurrentIndex(0);
      setUserAnswer('');
      setShowHint(false);
      setIsAnswered(false);
      setGameComplete(false);
      setTimeLeft(TIMER_DURATION);
      setVideoKey(prev => prev + 1);
    } catch (error) {
      toast.error('로딩 실패');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadQuestions(); }, []);

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
    toast.error(`⏰ 시간 초과! 정답: ${currentQuestion?.answer}`);
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
      toast.success(`정답! +${points}점 🎉`);
      // Replay video highlight
      setVideoKey(prev => prev + 1);
    } else {
      setStreak(0);
      toast.error(`오답! 정답: ${currentQuestion.answer}`);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setUserAnswer('');
      setShowHint(false);
      setIsAnswered(false);
      setTimeLeft(TIMER_DURATION);
      setVideoLoaded(false);
      setVideoKey(prev => prev + 1);
    } else {
      setGameComplete(true);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') isAnswered ? handleNext() : handleSubmit();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 via-pink-900 to-black flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="text-6xl">🎵</motion.div>
      </div>
    );
  }

  if (gameComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 via-pink-900 to-black flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-black/60 backdrop-blur-xl rounded-3xl p-8 text-center max-w-md w-full border border-pink-500/30">
          <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-white mb-2">게임 완료! 🎉</h2>
          <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-xl p-6 mb-6">
            <p className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">{score}점</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => navigate('/game')} variant="outline" className="flex-1 border-gray-600"><ArrowLeft className="w-4 h-4 mr-2" />돌아가기</Button>
            <Button onClick={() => { setScore(0); setStreak(0); loadQuestions(difficulty); }} className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500"><RotateCcw className="w-4 h-4 mr-2" />다시하기</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-pink-900 to-black">
      <div className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-pink-500/20">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate('/game')} className="text-white p-2"><ArrowLeft className="w-6 h-6" /></button>
          <div className="flex items-center gap-2"><Music className="w-5 h-5 text-pink-400" /><span className="text-white font-bold">K-POP MV 퀴즈</span></div>
          <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-yellow-400" /><span className="text-yellow-400 font-bold">{score}</span></div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">{currentIndex + 1} / {questions.length}</span>
          {streak > 0 && <span className="text-orange-400 text-sm">🔥 {streak}</span>}
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-4">
          <motion.div className="h-full bg-gradient-to-r from-pink-500 to-purple-500" animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
        </div>

        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setTimerMode(!timerMode)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${timerMode ? 'bg-cyan-500 text-white' : 'bg-white/10 text-gray-300'}`}>
            <Zap className="w-3 h-3" /> 타이머 {timerMode ? 'ON' : 'OFF'}
          </button>
          {timerMode && !isAnswered && (
            <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/50 ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : timeLeft <= 10 ? 'text-yellow-400' : 'text-green-400'}`}>
              <Timer className="w-3 h-3" /><span className="font-bold">{timeLeft}s</span>
            </div>
          )}
        </div>

        <div className="flex gap-1.5 mb-4">
          {[null, '쉬움', '보통', '어려움'].map((d) => (
            <button key={d || 'all'} onClick={() => { setDifficulty(d); setScore(0); setStreak(0); setUsedIds([]); loadQuestions(d); }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${difficulty === d ? (d === '쉬움' ? 'bg-green-500 text-white' : d === '보통' ? 'bg-yellow-500 text-black' : d === '어려움' ? 'bg-red-500 text-white' : 'bg-purple-500 text-white') : 'bg-white/10 text-gray-300'}`}>
              {d || '전체'}
            </button>
          ))}
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
                  🎵 정답 하이라이트 재생중!
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
                <span className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${currentQuestion.difficulty === '쉬움' ? 'bg-green-500/20 text-green-400' : currentQuestion.difficulty === '보통' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>{currentQuestion.points}점</span>
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
                      <p className={`font-bold ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>{isCorrect ? '정답! 🎉' : '오답!'}</p>
                      {!isCorrect && <p className="text-gray-300 text-sm">정답: <span className="text-pink-400 font-bold">{currentQuestion.answer}</span></p>}
                    </div>
                  </div>
                </motion.div>
              )}

              {!isAnswered ? (
                <div className="space-y-3">
                  <Input ref={inputRef} value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} onKeyPress={handleKeyPress} placeholder="빈칸 정답 입력..." className="bg-white/10 border-pink-500/30 text-white text-center text-lg py-5" />
                  <div className="flex gap-2">
                    {!showHint && <Button onClick={() => setShowHint(true)} variant="outline" size="sm" className="flex-1 border-yellow-500/50 text-yellow-400"><Lightbulb className="w-4 h-4 mr-1" />힌트</Button>}
                    <Button onClick={handleSubmit} disabled={!userAnswer.trim()} className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500">제출</Button>
                  </div>
                </div>
              ) : (
                <Button onClick={handleNext} className="w-full bg-gradient-to-r from-cyan-500 to-blue-500">{currentIndex < questions.length - 1 ? '다음 문제 →' : '결과 보기 🏆'}</Button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default KPop;
