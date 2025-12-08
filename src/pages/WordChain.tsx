import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ChevronLeft, 
  Link2, 
  Send, 
  Trophy,
  Skull,
  Sparkles,
  RotateCcw,
  Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface WordEntry {
  word: string;
  meaning?: string;
  explanation?: string;
  isUser: boolean;
  isInvalid?: boolean;
}

const WordChain = () => {
  const [words, setWords] = useState<WordEntry[]>([]);
  const [inputWord, setInputWord] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<"user" | "ai" | null>(null);
  const [lastChar, setLastChar] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [gameStarted, setGameStarted] = useState(false);
  const [scoreSaved, setScoreSaved] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Save score to profile when game over
  const saveScoreToProfile = async (finalScore: number, won: boolean) => {
    if (scoreSaved || finalScore <= 0) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('points, money')
      .eq('id', session.user.id)
      .single();

    if (profile) {
      const bonusPoints = won ? 100 : 0;
      const moneyEarned = Math.floor(finalScore * 5);
      
      await supabase
        .from('profiles')
        .update({ 
          points: profile.points + finalScore + bonusPoints,
          money: profile.money + moneyEarned
        })
        .eq('id', session.user.id);
      
      setScoreSaved(true);
      toast({
        title: `💰 보상 획득!`,
        description: `+${finalScore + bonusPoints}점, ₩${moneyEarned.toLocaleString()}`,
      });
    }
  };

  // Save score when game ends
  useEffect(() => {
    if (gameOver && !scoreSaved) {
      saveScoreToProfile(score, winner === "user");
    }
  }, [gameOver, scoreSaved, score, winner]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [words]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [gameOver]);

  // Timer effect
  useEffect(() => {
    if (gameStarted && !gameOver && !isLoading) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Time's up!
            clearInterval(timerRef.current!);
            setGameOver(true);
            setWinner("ai");
            toast({
              title: "시간 초과! ⏰",
              description: "15초 안에 단어를 입력하지 못했습니다!",
              variant: "destructive",
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [gameStarted, gameOver, isLoading, words]);

  // Reset timer when it's user's turn (after AI responds)
  useEffect(() => {
    if (gameStarted && !gameOver && !isLoading && words.length > 0) {
      setTimeLeft(15);
    }
  }, [words.length, isLoading]);

  const getLastChar = (word: string): string => {
    const last = word.charAt(word.length - 1);
    // 두음법칙 적용
    const dueum: { [key: string]: string } = {
      '렬': '열', '률': '율', '례': '예', '리': '이',
      '라': '나', '로': '노', '루': '누', '르': '느',
      '녀': '여', '뇨': '요', '뉴': '유', '니': '이'
    };
    return dueum[last] || last;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputWord.trim() || isLoading || gameOver) return;

    // Start game on first word
    if (!gameStarted) {
      setGameStarted(true);
    }

    const word = inputWord.trim();
    setInputWord("");
    setIsLoading(true);

    // Add user's word to the list
    setWords(prev => [...prev, { word, isUser: true }]);

    try {
      const usedWords = words.map(w => w.word);
      
      const { data, error } = await supabase.functions.invoke("word-chain", {
        body: { 
          userWord: word, 
          usedWords,
          lastChar 
        },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "오류",
          description: data.error,
          variant: "destructive",
        });
        // Remove the user's word if there was an error
        setWords(prev => prev.slice(0, -1));
        setIsLoading(false);
        return;
      }

      if (!data.valid) {
        // User's word was invalid
        setWords(prev => 
          prev.map((w, i) => 
            i === prev.length - 1 ? { ...w, isInvalid: true } : w
          )
        );
        setGameOver(true);
        setWinner("ai");
        toast({
          title: "패배! 💀",
          description: data.reason_ko,
          variant: "destructive",
        });
      } else {
        // Update user's word with explanation
        if (data.user_word_explanation) {
          setWords(prev => 
            prev.map((w, i) => 
              i === prev.length - 1 
                ? { ...w, explanation: data.user_word_explanation } 
                : w
            )
          );
        }
        
        if (data.game_over && data.winner === "user") {
          // AI couldn't find a word
          setGameOver(true);
          setWinner("user");
          setScore(prev => prev + 100);
          toast({
            title: "승리! 🎉",
            description: "AI가 단어를 찾지 못했습니다!",
          });
        } else if (data.ai_word) {
          // Valid game continues
          setWords(prev => [...prev, { 
            word: data.ai_word, 
            meaning: data.ai_word_meaning,
            explanation: data.ai_word_explanation,
            isUser: false 
          }]);
          setLastChar(getLastChar(data.ai_word));
          setScore(prev => prev + 10);
        }
      }
    } catch (error) {
      console.error("Word chain error:", error);
      toast({
        title: "오류가 발생했습니다",
        description: "다시 시도해주세요",
        variant: "destructive",
      });
      setWords(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const resetGame = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setWords([]);
    setInputWord("");
    setGameOver(false);
    setWinner(null);
    setLastChar(null);
    setScore(0);
    setTimeLeft(15);
    setGameStarted(false);
    setScoreSaved(false);
    inputRef.current?.focus();
  };

  const handleFirstWord = () => {
    if (!gameStarted) {
      setGameStarted(true);
      setTimeLeft(15);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-900 via-blue-900 to-gray-900 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/game")} className="text-white/70 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <Link2 className="w-5 h-5 text-cyan-400" />
          <span className="text-white font-medium">끝말잇기 / Nối từ</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-yellow-400">
            <Sparkles className="w-4 h-4" />
            <span className="font-bold">{score}점</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetGame}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Game Info with Timer */}
      <div className="p-4">
        <div className="glass-card p-4 rounded-xl">
          <div className="flex items-center justify-between">
            {/* Timer */}
            <div className="flex items-center gap-2">
              <Clock className={`w-5 h-5 ${timeLeft <= 5 ? "text-red-400 animate-pulse" : "text-white/60"}`} />
              <span className={`text-2xl font-bold ${
                timeLeft <= 5 ? "text-red-400" : timeLeft <= 10 ? "text-yellow-400" : "text-green-400"
              }`}>
                {timeLeft}초
              </span>
            </div>

            {/* Next Character */}
            <div className="text-center flex-1">
              <p className="text-white/60 text-sm mb-1">다음 글자 / Ký tự tiếp</p>
              {lastChar ? (
                <motion.span 
                  key={lastChar}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-4xl font-bold text-cyan-400"
                >
                  {lastChar}
                </motion.span>
              ) : (
                <span className="text-lg text-white/40">아무 단어나! / Bất kỳ từ nào!</span>
              )}
            </div>

            {/* Timer Bar */}
            <div className="w-20">
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <motion.div 
                  className={`h-full ${
                    timeLeft <= 5 ? "bg-red-500" : timeLeft <= 10 ? "bg-yellow-500" : "bg-green-500"
                  }`}
                  initial={{ width: "100%" }}
                  animate={{ width: `${(timeLeft / 15) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Word Chain Display */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        <AnimatePresence>
          {words.map((entry, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: entry.isUser ? 50 : -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className={`flex ${entry.isUser ? "justify-end" : "justify-start"}`}
            >
              <div 
                className={`max-w-[80%] p-4 rounded-2xl ${
                  entry.isUser 
                    ? entry.isInvalid 
                      ? "bg-red-500/30 border border-red-500" 
                      : "bg-cyan-500/30 border border-cyan-500/50"
                    : "bg-purple-500/30 border border-purple-500/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-bold ${
                    entry.isInvalid ? "text-red-400" : "text-white"
                  }`}>
                    {entry.word}
                  </span>
                  {entry.isInvalid && <Skull className="w-5 h-5 text-red-400" />}
                </div>
                {entry.meaning && (
                  <p className="text-yellow-300/90 text-sm mt-2 font-medium">{entry.meaning}</p>
                )}
                {entry.explanation && (
                  <p className="text-white/70 text-sm mt-1 leading-relaxed">{entry.explanation}</p>
                )}
                <p className="text-white/40 text-xs mt-2">
                  {entry.isUser ? "나 / Tôi" : "AI"}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-purple-500/30 border border-purple-500/50 p-4 rounded-2xl">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Game Over Overlay */}
      <AnimatePresence>
        {gameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className="text-center p-8"
            >
              {winner === "user" ? (
                <>
                  <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold text-yellow-400 mb-2">승리!</h2>
                  <p className="text-white/60 mb-1">Chiến thắng!</p>
                  <p className="text-white text-xl mb-6">점수 / Điểm: {score}</p>
                </>
              ) : (
                <>
                  <Skull className="w-20 h-20 text-red-400 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold text-red-400 mb-2">패배!</h2>
                  <p className="text-white/60 mb-1">Thất bại!</p>
                  <p className="text-white text-xl mb-6">점수 / Điểm: {score}</p>
                </>
              )}
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={resetGame}
                  className="bg-cyan-600 hover:bg-cyan-700"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  다시하기 / Chơi lại
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/game")}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  메인으로 / Menu
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="p-4 border-t border-white/10 bg-gray-900/50">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputWord}
            onChange={(e) => setInputWord(e.target.value)}
            placeholder={lastChar ? `"${lastChar}"로 시작하는 단어... / Từ bắt đầu bằng "${lastChar}"...` : "첫 단어를 입력하세요... / Nhập từ đầu tiên..."}
            disabled={isLoading || gameOver}
            className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/40"
          />
          <Button
            type="submit"
            disabled={!inputWord.trim() || isLoading || gameOver}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
        <p className="text-white/40 text-xs text-center mt-2">
          한국어 명사만 사용 가능 • Chỉ dùng danh từ tiếng Hàn
        </p>
      </div>
    </div>
  );
};

export default WordChain;
