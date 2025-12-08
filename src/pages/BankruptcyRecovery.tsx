import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Coins,
  Timer,
  Zap,
  Trophy,
  Target,
  RefreshCw,
  Flame
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type GameState = 'ready' | 'playing' | 'finished';
type Difficulty = 'easy' | 'medium' | 'hard';

interface Word {
  korean: string;
  vietnamese: string;
  points: number;
}

const WORDS: Record<Difficulty, Word[]> = {
  easy: [
    { korean: "안녕", vietnamese: "Xin chào", points: 50 },
    { korean: "감사", vietnamese: "Cảm ơn", points: 50 },
    { korean: "사랑", vietnamese: "Tình yêu", points: 50 },
    { korean: "친구", vietnamese: "Bạn bè", points: 50 },
    { korean: "학교", vietnamese: "Trường học", points: 50 },
    { korean: "음식", vietnamese: "Đồ ăn", points: 50 },
    { korean: "물", vietnamese: "Nước", points: 40 },
    { korean: "집", vietnamese: "Nhà", points: 40 },
    { korean: "책", vietnamese: "Sách", points: 40 },
    { korean: "돈", vietnamese: "Tiền", points: 40 },
    { korean: "밥", vietnamese: "Cơm", points: 40 },
    { korean: "차", vietnamese: "Xe/Trà", points: 40 },
    { korean: "문", vietnamese: "Cửa", points: 40 },
    { korean: "손", vietnamese: "Tay", points: 40 },
    { korean: "눈", vietnamese: "Mắt/Tuyết", points: 40 },
  ],
  medium: [
    { korean: "컴퓨터", vietnamese: "Máy tính", points: 80 },
    { korean: "핸드폰", vietnamese: "Điện thoại", points: 80 },
    { korean: "아르바이트", vietnamese: "Làm thêm", points: 100 },
    { korean: "편의점", vietnamese: "Cửa hàng tiện lợi", points: 90 },
    { korean: "지하철", vietnamese: "Tàu điện ngầm", points: 80 },
    { korean: "도서관", vietnamese: "Thư viện", points: 80 },
    { korean: "병원", vietnamese: "Bệnh viện", points: 70 },
    { korean: "공항", vietnamese: "Sân bay", points: 70 },
    { korean: "식당", vietnamese: "Nhà hàng", points: 70 },
    { korean: "화장실", vietnamese: "Nhà vệ sinh", points: 80 },
    { korean: "대학교", vietnamese: "Đại học", points: 80 },
    { korean: "운동화", vietnamese: "Giày thể thao", points: 80 },
    { korean: "냉장고", vietnamese: "Tủ lạnh", points: 80 },
    { korean: "세탁기", vietnamese: "Máy giặt", points: 80 },
    { korean: "에어컨", vietnamese: "Điều hòa", points: 80 },
  ],
  hard: [
    { korean: "무궁화꽃이피었습니다", vietnamese: "Hoa Mugungwha đã nở", points: 200 },
    { korean: "국민건강보험", vietnamese: "Bảo hiểm y tế quốc gia", points: 180 },
    { korean: "청계천", vietnamese: "Suối Cheonggyecheon", points: 120 },
    { korean: "경복궁", vietnamese: "Cung điện Gyeongbokgung", points: 120 },
    { korean: "인스타그램", vietnamese: "Instagram", points: 130 },
    { korean: "유튜브채널", vietnamese: "Kênh YouTube", points: 140 },
    { korean: "스마트폰충전기", vietnamese: "Sạc điện thoại", points: 160 },
    { korean: "신용카드결제", vietnamese: "Thanh toán thẻ tín dụng", points: 180 },
    { korean: "외국인등록증", vietnamese: "Thẻ đăng ký người nước ngoài", points: 200 },
    { korean: "한국어능력시험", vietnamese: "Kỳ thi năng lực tiếng Hàn", points: 200 },
    { korean: "편의점삼각김밥", vietnamese: "Cơm nắm tam giác tiệm tiện lợi", points: 180 },
    { korean: "지하철환승역", vietnamese: "Ga chuyển tàu", points: 160 },
    { korean: "배달음식주문", vietnamese: "Đặt đồ ăn giao hàng", points: 160 },
    { korean: "카카오톡메시지", vietnamese: "Tin nhắn KakaoTalk", points: 170 },
    { korean: "네이버검색", vietnamese: "Tìm kiếm Naver", points: 140 },
  ]
};

const GAME_DURATION = 60; // 60 seconds

const BankruptcyRecovery = () => {
  const [gameState, setGameState] = useState<GameState>('ready');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [userInput, setUserInput] = useState("");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [wordsCompleted, setWordsCompleted] = useState(0);
  const [showCorrect, setShowCorrect] = useState(false);
  const [showWrong, setShowWrong] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const getRandomWord = useCallback(() => {
    const words = WORDS[difficulty];
    const randomIndex = Math.floor(Math.random() * words.length);
    return words[randomIndex];
  }, [difficulty]);

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setWordsCompleted(0);
    setTimeLeft(GAME_DURATION);
    setCurrentWord(getRandomWord());
    setUserInput("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUserInput(value);

    if (currentWord && value === currentWord.korean) {
      // Correct answer
      const streakBonus = Math.floor(streak * 10);
      const earnedPoints = currentWord.points + streakBonus;
      
      setScore(prev => prev + earnedPoints);
      setStreak(prev => prev + 1);
      setMaxStreak(prev => Math.max(prev, streak + 1));
      setWordsCompleted(prev => prev + 1);
      setShowCorrect(true);
      
      setTimeout(() => {
        setShowCorrect(false);
        setCurrentWord(getRandomWord());
        setUserInput("");
      }, 200);
    }
  };

  const handleSkip = () => {
    setStreak(0);
    setShowWrong(true);
    setTimeout(() => {
      setShowWrong(false);
      setCurrentWord(getRandomWord());
      setUserInput("");
    }, 200);
  };

  useEffect(() => {
    if (gameState !== 'playing') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameState('finished');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  const saveScore = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('money')
      .eq('id', session.user.id)
      .single();

    if (profile) {
      await supabase
        .from('profiles')
        .update({ money: profile.money + score })
        .eq('id', session.user.id);
      
      toast({
        title: `₩${score.toLocaleString()} 획득!`,
        description: `Đã kiếm được ₩${score.toLocaleString()}!`,
      });
    }
  };

  const handleFinish = async () => {
    await saveScore();
    navigate('/game');
  };

  const getTimeColor = () => {
    if (timeLeft > 30) return 'text-green-400';
    if (timeLeft > 10) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 via-emerald-800 to-gray-900">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/game")} className="text-white/70 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-white font-medium">파산 복구 / Phục hồi phá sản</span>
        </div>
        {gameState === 'playing' && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-yellow-400">
              <Coins className="w-5 h-5" />
              <span className="font-bold">₩{score.toLocaleString()}</span>
            </div>
            <div className={`flex items-center gap-2 ${getTimeColor()}`}>
              <Timer className="w-5 h-5" />
              <span className="font-bold">{timeLeft}s</span>
            </div>
          </div>
        )}
      </header>

      <div className="p-4 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {/* Ready State */}
          {gameState === 'ready' && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <Zap className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
                </motion.div>
                <h1 className="text-3xl font-bold text-white mb-2">파산 복구</h1>
                <p className="text-white/60">Phục hồi phá sản</p>
                <p className="text-white/80 mt-4">60초 안에 한국어 단어를 빠르게 타이핑하세요!</p>
                <p className="text-white/60">Gõ nhanh các từ tiếng Hàn trong 60 giây!</p>
              </div>

              {/* Difficulty Selection */}
              <div className="glass-card p-6 rounded-xl">
                <h2 className="text-white font-bold mb-4 text-center">난이도 선택 / Chọn độ khó</h2>
                <div className="grid grid-cols-3 gap-3">
                  {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => (
                    <button
                      key={diff}
                      onClick={() => setDifficulty(diff)}
                      className={`p-4 rounded-xl transition-all ${
                        difficulty === diff
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      <p className="font-bold">
                        {diff === 'easy' && '쉬움'}
                        {diff === 'medium' && '보통'}
                        {diff === 'hard' && '어려움'}
                      </p>
                      <p className="text-xs opacity-70">
                        {diff === 'easy' && '40-50원'}
                        {diff === 'medium' && '70-100원'}
                        {diff === 'hard' && '120-200원'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* How to Play */}
              <div className="glass-card p-4 rounded-xl">
                <h3 className="text-white font-bold mb-3">🎮 게임 방법 / Cách chơi</h3>
                <ul className="space-y-2 text-sm text-white/80">
                  <li>⌨️ 화면에 나오는 한국어 단어를 타이핑하세요</li>
                  <li>⚡ 연속으로 맞추면 콤보 보너스!</li>
                  <li>⏭️ 모르면 스킵 버튼으로 다음 단어로</li>
                  <li>💰 60초 후 번 돈이 계정에 추가됩니다</li>
                </ul>
              </div>

              <Button
                onClick={startGame}
                className="w-full h-16 text-xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                <Zap className="w-6 h-6 mr-2" />
                게임 시작! / Bắt đầu!
              </Button>
            </motion.div>
          )}

          {/* Playing State */}
          {gameState === 'playing' && currentWord && (
            <motion.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Streak & Progress */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className={`w-5 h-5 ${streak > 0 ? 'text-orange-400' : 'text-white/30'}`} />
                  <span className={`font-bold ${streak > 0 ? 'text-orange-400' : 'text-white/50'}`}>
                    {streak}x 콤보
                  </span>
                </div>
                <div className="flex items-center gap-2 text-white/70">
                  <Target className="w-5 h-5" />
                  <span>{wordsCompleted} 단어</span>
                </div>
              </div>

              {/* Time Progress Bar */}
              <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${
                    timeLeft > 30 ? 'bg-green-500' : timeLeft > 10 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${(timeLeft / GAME_DURATION) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Word Display */}
              <motion.div
                key={currentWord.korean}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`glass-card p-8 rounded-xl text-center ${
                  showCorrect ? 'bg-green-500/30 border-green-400' : 
                  showWrong ? 'bg-red-500/30 border-red-400' : ''
                }`}
              >
                <p className="text-white/60 text-sm mb-2">다음 단어를 타이핑하세요:</p>
                <motion.p
                  animate={showCorrect ? { scale: [1, 1.2, 1] } : {}}
                  className="text-4xl md:text-5xl font-bold text-white mb-4"
                >
                  {currentWord.korean}
                </motion.p>
                <p className="text-white/60">{currentWord.vietnamese}</p>
                <p className="text-yellow-400 text-sm mt-2">+{currentWord.points}원 {streak > 0 && `(+${streak * 10} 보너스)`}</p>
              </motion.div>

              {/* Input */}
              <div className="space-y-3">
                <Input
                  ref={inputRef}
                  value={userInput}
                  onChange={handleInputChange}
                  placeholder="여기에 타이핑..."
                  className="h-16 text-2xl text-center bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                />
                <Button
                  onClick={handleSkip}
                  variant="outline"
                  className="w-full border-white/20 text-white hover:bg-white/10"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  스킵 (콤보 리셋) / Bỏ qua
                </Button>
              </div>

              {/* Current Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="glass-card p-3 rounded-xl text-center">
                  <p className="text-white/60 text-xs">현재 수입</p>
                  <p className="text-yellow-400 font-bold">₩{score}</p>
                </div>
                <div className="glass-card p-3 rounded-xl text-center">
                  <p className="text-white/60 text-xs">최대 콤보</p>
                  <p className="text-orange-400 font-bold">{maxStreak}x</p>
                </div>
                <div className="glass-card p-3 rounded-xl text-center">
                  <p className="text-white/60 text-xs">완료 단어</p>
                  <p className="text-green-400 font-bold">{wordsCompleted}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Finished State */}
          {gameState === 'finished' && (
            <motion.div
              key="finished"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="space-y-6"
            >
              <div className="glass-card p-8 rounded-xl text-center">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", delay: 0.2 }}
                >
                  <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
                </motion.div>
                <h1 className="text-3xl font-bold text-white mb-2">타임 아웃!</h1>
                <p className="text-white/60 mb-6">Hết giờ!</p>

                <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-6 mb-6">
                  <p className="text-white/70 mb-2">총 수입 / Tổng thu nhập</p>
                  <div className="flex items-center justify-center gap-2 text-yellow-400">
                    <Coins className="w-8 h-8" />
                    <span className="text-4xl font-bold">₩{score.toLocaleString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="glass-card p-4 rounded-xl">
                    <p className="text-white/60">완료 단어</p>
                    <p className="text-2xl font-bold text-green-400">{wordsCompleted}개</p>
                  </div>
                  <div className="glass-card p-4 rounded-xl">
                    <p className="text-white/60">최대 콤보</p>
                    <p className="text-2xl font-bold text-orange-400">{maxStreak}x</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={startGame}
                  className="h-14 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  다시 하기
                </Button>
                <Button
                  onClick={handleFinish}
                  className="h-14 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                >
                  <Coins className="w-5 h-5 mr-2" />
                  저장 & 나가기
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BankruptcyRecovery;
