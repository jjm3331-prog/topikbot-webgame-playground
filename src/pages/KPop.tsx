import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Music, Sparkles, Check, X, Lightbulb, RotateCcw, Trophy, Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface Question {
  id: string;
  artist: string;
  song: string;
  lyrics: string;
  answer: string;
  hint: string;
  fullLyrics: string;
  vietnamese: string;
  difficulty: string;
  points: number;
}

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
  const [difficulty, setDifficulty] = useState<string>('보통');
  const [gameComplete, setGameComplete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentQuestion = questions[currentIndex];

  const loadQuestions = async (selectedDifficulty?: string) => {
    setIsLoading(true);
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
            difficulty: selectedDifficulty || difficulty,
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

  useEffect(() => {
    if (!isLoading && !isAnswered && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading, isAnswered, currentIndex]);

  const handleSubmit = () => {
    if (!userAnswer.trim() || !currentQuestion) return;

    const normalizedAnswer = userAnswer.trim().toLowerCase();
    const normalizedCorrect = currentQuestion.answer.toLowerCase();
    const correct = normalizedAnswer === normalizedCorrect;

    setIsCorrect(correct);
    setIsAnswered(true);
    setUsedIds(prev => [...prev, currentQuestion.id]);

    if (correct) {
      const points = showHint ? Math.floor(currentQuestion.points / 2) : currentQuestion.points;
      setScore(prev => prev + points);
      setStreak(prev => prev + 1);
      toast.success(`정답! +${points}점 🎉`);
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
    } else {
      setGameComplete(true);
    }
  };

  const handleNewGame = () => {
    setScore(0);
    setStreak(0);
    loadQuestions();
  };

  const handleDifficultyChange = (newDifficulty: string) => {
    setDifficulty(newDifficulty);
    setScore(0);
    setStreak(0);
    setUsedIds([]);
    loadQuestions(newDifficulty);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isAnswered) {
      handleSubmit();
    } else if (e.key === 'Enter' && isAnswered) {
      handleNext();
    }
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
            <span className="text-white font-bold">K-POP 가사 퀴즈</span>
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

        {/* Difficulty Selector */}
        <div className="flex gap-2 mt-4">
          {['쉬움', '보통', '어려움'].map((d) => (
            <button
              key={d}
              onClick={() => handleDifficultyChange(d)}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                difficulty === d
                  ? d === '쉬움' ? 'bg-green-500 text-white'
                    : d === '보통' ? 'bg-yellow-500 text-black'
                    : 'bg-red-500 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {d}
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
              className="bg-black/40 backdrop-blur-xl rounded-3xl p-6 border border-pink-500/30"
            >
              {/* Artist & Song */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-2xl">
                  🎤
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">{currentQuestion.artist}</h3>
                  <p className="text-pink-400">"{currentQuestion.song}"</p>
                </div>
                <span className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${
                  currentQuestion.difficulty === '쉬움' ? 'bg-green-500/20 text-green-400'
                    : currentQuestion.difficulty === '보통' ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {currentQuestion.difficulty}
                </span>
              </div>

              {/* Lyrics */}
              <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-2xl p-6 mb-6">
                <p className="text-2xl text-white text-center font-medium leading-relaxed">
                  {isAnswered ? currentQuestion.fullLyrics : currentQuestion.lyrics}
                </p>
                {isAnswered && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-gray-400 text-center mt-4 text-sm italic"
                  >
                    {currentQuestion.vietnamese}
                  </motion.p>
                )}
              </div>

              {/* Hint */}
              {showHint && !isAnswered && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4"
                >
                  <div className="flex items-center gap-2 text-yellow-400">
                    <Lightbulb className="w-4 h-4" />
                    <span className="text-sm">힌트: {currentQuestion.hint}</span>
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
                        {isCorrect ? '정답! 🎉' : '오답!'}
                      </p>
                      {!isCorrect && (
                        <p className="text-gray-300 text-sm">
                          정답: <span className="text-pink-400 font-bold">{currentQuestion.answer}</span>
                        </p>
                      )}
                    </div>
                    {isCorrect && (
                      <span className="ml-auto text-green-400 font-bold">
                        +{showHint ? Math.floor(currentQuestion.points / 2) : currentQuestion.points}점
                      </span>
                    )}
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
                    placeholder="빈칸에 들어갈 단어를 입력하세요..."
                    className="bg-white/10 border-pink-500/30 text-white text-center text-lg py-6"
                  />
                  
                  <div className="flex gap-2">
                    {!showHint && (
                      <Button
                        onClick={() => setShowHint(true)}
                        variant="outline"
                        className="flex-1 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                      >
                        <Lightbulb className="w-4 h-4 mr-2" />
                        힌트 (-50%)
                      </Button>
                    )}
                    <Button
                      onClick={handleSubmit}
                      disabled={!userAnswer.trim()}
                      className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                    >
                      제출하기
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={handleNext}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                >
                  {currentIndex < questions.length - 1 ? '다음 문제' : '결과 보기'}
                </Button>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default KPop;
