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
  RotateCcw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface WordEntry {
  word: string;
  meaning?: string;
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [words]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [gameOver]);

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
      } else if (data.game_over && data.winner === "user") {
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
          isUser: false 
        }]);
        setLastChar(getLastChar(data.ai_word));
        setScore(prev => prev + 10);
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
    setWords([]);
    setInputWord("");
    setGameOver(false);
    setWinner(null);
    setLastChar(null);
    setScore(0);
    inputRef.current?.focus();
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
          <span className="text-white font-medium">끝말잇기</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-yellow-400">
            <Sparkles className="w-4 h-4" />
            <span className="font-bold">{score}</span>
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

      {/* Game Info */}
      <div className="p-4">
        <div className="glass-card p-4 rounded-xl text-center">
          <p className="text-white/60 text-sm mb-1">다음 글자</p>
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
            <span className="text-2xl text-white/40">아무 단어나 시작하세요!</span>
          )}
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
                  <p className="text-white/60 text-sm mt-1 italic">{entry.meaning}</p>
                )}
                <p className="text-white/40 text-xs mt-1">
                  {entry.isUser ? "나" : "AI"}
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
                  <p className="text-white text-xl mb-6">점수: {score}</p>
                </>
              ) : (
                <>
                  <Skull className="w-20 h-20 text-red-400 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold text-red-400 mb-2">패배!</h2>
                  <p className="text-white/60 mb-1">Thất bại!</p>
                  <p className="text-white text-xl mb-6">점수: {score}</p>
                </>
              )}
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={resetGame}
                  className="bg-cyan-600 hover:bg-cyan-700"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  다시하기
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/game")}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  메인으로
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
            placeholder={lastChar ? `"${lastChar}"로 시작하는 단어...` : "첫 단어를 입력하세요..."}
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
