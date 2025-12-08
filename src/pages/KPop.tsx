import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Music, Sparkles, Check, X, Lightbulb, RotateCcw, Trophy, Youtube, Timer, Zap } from 'lucide-react';
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

const TIMER_DURATION = 20; // seconds per question

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
  const [videoError, setVideoError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentQuestion = questions[currentIndex];

  const loadQuestions = async (selectedDifficulty?: string | null) => {
    setIsLoading(true);
    setVideoError(false);
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
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to load questions');
      
      const data = await response.json();
      setQuestions(data.questions || []);
      setCurrentIndex(0);
      setUserAnswer('');
      setShowHint(false);
      setIsAnswered(false);
      setGameComplete(false);
      setTimeLeft(TIMER_DURATION);
    } catch (error) {
      console.error('Load error:', error);
      toast.error('문제 로딩 실패 / Lỗi tải câu hỏi');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  // Timer logic
  useEffect(() => {
    if (timerMode && !isAnswered && !isLoading && questions.length > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Time's up!
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timerMode, isAnswered, isLoading, currentIndex]);

  const handleTimeUp = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsCorrect(false);
    setIsAnswered(true);
    setStreak(0);
    if (currentQuestion) {
      setUsedIds(prev => [...prev, currentQuestion.id]);
    }
    toast.error(`⏰ 시간 초과! 정답: ${currentQuestion?.answer}`);
  }, [currentQuestion]);

  useEffect(() => {
    if (!isLoading && !isAnswered && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading, isAnswered, currentIndex]);

  const handleSubmit = () => {
    if (!userAnswer.trim() || !currentQuestion) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const normalizedAnswer = userAnswer.trim().toLowerCase().replace(/\s+/g, ' ');
    const normalizedCorrect = currentQuestion.answer.toLowerCase().replace(/\s+/g, ' ');
    const correct = normalizedAnswer === normalizedCorrect;

    setIsCorrect(correct);
    setIsAnswered(true);
    setUsedIds(prev => [...prev, currentQuestion.id]);

    if (correct) {
      // Bonus points for timer mode based on time left
      const timerBonus = timerMode ? Math.floor(timeLeft / 2) : 0;
      const hintPenalty = showHint ? 0.5 : 1;
      const points = Math.floor((currentQuestion.points + timerBonus) * hintPenalty);
      
      setScore(prev => prev + points);
      setStreak(prev => prev + 1);
      toast.success(`정답! +${points}점 ${timerMode && timeLeft > 10 ? '⚡ 스피드 보너스!' : '🎉'}`);
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
      setVideoError(false);
    } else {
      setGameComplete(true);
    }
  };

  const handleNewGame = () => {
    setScore(0);
    setStreak(0);
    setTimeLeft(TIMER_DURATION);
    loadQuestions(difficulty);
  };

  const handleDifficultyChange = (newDifficulty: string | null) => {
    setDifficulty(newDifficulty);
    setScore(0);
    setStreak(0);
    setUsedIds([]);
    setTimeLeft(TIMER_DURATION);
    loadQuestions(newDifficulty);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isAnswered) {
      handleSubmit();
    } else if (e.key === 'Enter' && isAnswered) {
      handleNext();
    }
  };

  const openYouTube = () => {
    if (currentQuestion?.youtubeId) {
      const url = `https://www.youtube.com/watch?v=${currentQuestion.youtubeId}${currentQuestion.timestamp ? `&t=${currentQuestion.timestamp}` : ''}`;
      window.open(url, '_blank');
    }
  };

  const getTimerColor = () => {
    if (timeLeft > 10) return 'text-green-400';
    if (timeLeft > 5) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 via-pink-900 to-black flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="text-6xl"
        >
          🎵
        </motion.div>
      </div>
    );
  }

  if (gameComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 via-pink-900 to-black flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="bg-black/60 backdrop-blur-xl rounded-3xl p-8 text-center max-w-md w-full border border-pink-500/30"
        >
          <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-white mb-2">게임 완료! 🎉</h2>
          <p className="text-gray-300 mb-6">Hoàn thành trò chơi!</p>
          
          <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-xl p-6 mb-6">
            <p className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
              {score}점
            </p>
            <p className="text-gray-400 mt-2">최고 연속 정답: {streak}회</p>
            {timerMode && <p className="text-cyan-400 text-sm mt-1">⚡ 타이머 모드 클리어!</p>}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => navigate('/game')}
              variant="outline"
              className="flex-1 border-gray-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              돌아가기
            </Button>
            <Button
              onClick={handleNewGame}
              className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              다시하기
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-pink-900 to-black">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-pink-500/20">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate('/game')} className="text-white p-2">
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-pink-400" />
            <span className="text-white font-bold">K-POP MV 퀴즈</span>
          </div>

          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 font-bold">{score}</span>
          </div>
        </div>
      </div>

      {/* Progress & Stats */}
      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">
            {currentIndex + 1} / {questions.length}
          </span>
          {streak > 0 && (
            <span className="text-orange-400 text-sm">
              🔥 {streak} 연속 정답
            </span>
          )}
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-pink-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>

        {/* Timer Mode Toggle */}
        <div className="flex items-center justify-between mt-4 mb-2">
          <button
            onClick={() => setTimerMode(!timerMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              timerMode 
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white' 
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            <Zap className={`w-4 h-4 ${timerMode ? 'animate-pulse' : ''}`} />
            타이머 모드 {timerMode ? 'ON' : 'OFF'}
          </button>
          
          {timerMode && !isAnswered && (
            <motion.div 
              className={`flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 ${getTimerColor()}`}
              animate={timeLeft <= 5 ? { scale: [1, 1.1, 1] } : {}}
              transition={{ repeat: Infinity, duration: 0.5 }}
            >
              <Timer className="w-4 h-4" />
              <span className="font-bold text-lg tabular-nums">{timeLeft}s</span>
            </motion.div>
          )}
        </div>

        {/* Timer Progress Bar */}
        {timerMode && !isAnswered && (
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mb-4">
            <motion.div
              className={`h-full ${timeLeft > 10 ? 'bg-green-500' : timeLeft > 5 ? 'bg-yellow-500' : 'bg-red-500'}`}
              initial={{ width: '100%' }}
              animate={{ width: `${(timeLeft / TIMER_DURATION) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}

        {/* Difficulty Selector */}
        <div className="flex gap-2">
          {[null, '쉬움', '보통', '어려움'].map((d) => (
            <button
              key={d || 'all'}
              onClick={() => handleDifficultyChange(d)}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                difficulty === d
                  ? d === null ? 'bg-purple-500 text-white'
                    : d === '쉬움' ? 'bg-green-500 text-white'
                    : d === '보통' ? 'bg-yellow-500 text-black'
                    : 'bg-red-500 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {d || '전체'}
            </button>
          ))}
        </div>
      </div>

      {/* Question Card */}
      {currentQuestion && (
        <div className="max-w-lg mx-auto px-4 pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-black/40 backdrop-blur-xl rounded-3xl overflow-hidden border border-pink-500/30"
            >
              {/* YouTube Video Embed */}
              <div className="relative aspect-video bg-black">
                {!videoError ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${currentQuestion.youtubeId}?start=${currentQuestion.timestamp || 0}&rel=0&modestbranding=1&autoplay=1&mute=0`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    onError={() => setVideoError(true)}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                    <Youtube className="w-12 h-12 mb-2 opacity-50" />
                    <p className="text-sm">영상을 불러올 수 없습니다</p>
                  </div>
                )}
                
                {/* Open in YouTube button */}
                <button
                  onClick={openYouTube}
                  className="absolute bottom-3 right-3 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all shadow-lg"
                >
                  <Youtube className="w-4 h-4" />
                  YouTube
                </button>
              </div>

              <div className="p-5">
                {/* Artist & Song */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-xl">
                    🎤
                  </div>
                  <div>
                    <h3 className="text-white font-bold">{currentQuestion.artist}</h3>
                    <p className="text-pink-400 text-sm">"{currentQuestion.song}"</p>
                  </div>
                  <span className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${
                    currentQuestion.difficulty === '쉬움' ? 'bg-green-500/20 text-green-400'
                      : currentQuestion.difficulty === '보통' ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {currentQuestion.points}점
                  </span>
                </div>

                {/* Lyric Line */}
                <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-xl p-4 mb-4">
                  <p className="text-lg text-white text-center font-medium">
                    🎵 {currentQuestion.lyricLine}
                  </p>
                </div>

                {/* Hint */}
                {showHint && !isAnswered && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-4"
                  >
                    <div className="flex items-center gap-2 text-yellow-400">
                      <Lightbulb className="w-4 h-4" />
                      <span className="text-sm">💡 {currentQuestion.hint}</span>
                    </div>
                  </motion.div>
                )}

                {/* Answer Result */}
                {isAnswered && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`rounded-xl p-4 mb-4 ${
                      isCorrect 
                        ? 'bg-green-500/20 border border-green-500/30' 
                        : 'bg-red-500/20 border border-red-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isCorrect ? (
                        <Check className="w-6 h-6 text-green-400" />
                      ) : (
                        <X className="w-6 h-6 text-red-400" />
                      )}
                      <div>
                        <p className={`font-bold ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                          {isCorrect ? '정답! 🎉' : timeLeft === 0 ? '⏰ 시간 초과!' : '오답!'}
                        </p>
                        {!isCorrect && (
                          <p className="text-gray-300 text-sm">
                            정답: <span className="text-pink-400 font-bold">{currentQuestion.answer}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Input */}
                {!isAnswered ? (
                  <div className="space-y-3">
                    <Input
                      ref={inputRef}
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="빈칸에 들어갈 단어..."
                      className="bg-white/10 border-pink-500/30 text-white text-center text-lg py-5"
                    />
                    
                    <div className="flex gap-2">
                      {!showHint && (
                        <Button
                          onClick={() => setShowHint(true)}
                          variant="outline"
                          size="sm"
                          className="flex-1 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                        >
                          <Lightbulb className="w-4 h-4 mr-1" />
                          힌트
                        </Button>
                      )}
                      <Button
                        onClick={handleSubmit}
                        disabled={!userAnswer.trim()}
                        className={`flex-1 ${showHint ? '' : ''} bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600`}
                      >
                        제출
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={handleNext}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                  >
                    {currentIndex < questions.length - 1 ? '다음 문제 →' : '결과 보기 🏆'}
                  </Button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default KPop;
