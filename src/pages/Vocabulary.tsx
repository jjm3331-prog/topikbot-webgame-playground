import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { useNavigate } from "react-router-dom";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  BookOpen,
  Sparkles,
  Loader2,
  RefreshCw,
  Layers,
  Timer,
  Zap,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Trophy,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Volume2,
  Flame
} from "lucide-react";
import confetti from "canvas-confetti";

// Word interface
interface Word {
  id: number;
  korean: string;
  meaning: string;
  example?: string;
  exampleMeaning?: string;
  pronunciation?: string;
}

// TOPIK 급수 레벨
const topikLevels = {
  "1-2": { label: "TOPIK I (1-2급)", sublabel: "Sơ cấp", color: "from-green-500 to-emerald-500" },
  "3-4": { label: "TOPIK II (3-4급)", sublabel: "Trung cấp", color: "from-blue-500 to-cyan-500" },
  "5-6": { label: "TOPIK II (5-6급)", sublabel: "Cao cấp", color: "from-purple-500 to-pink-500" },
};

type TopikLevel = keyof typeof topikLevels;

// Tab types
const tabs = [
  { id: "flashcard", label: "플래시카드", icon: Layers, description: "Thẻ lật từ vựng" },
  { id: "memory", label: "메모리 매칭", icon: Zap, description: "Ghép thẻ" },
  { id: "sprint", label: "60초 스프린트", icon: Timer, description: "Chạy đua 60 giây" },
];

type TabType = "flashcard" | "memory" | "sprint";

// ================== FLASHCARD COMPONENT ==================
interface FlashcardGameProps {
  words: Word[];
  onComplete: (known: number, unknown: number) => void;
  onPlayTTS: (text: string) => void;
}

const FlashcardGame = ({ words, onComplete, onPlayTTS }: FlashcardGameProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [unknownCount, setUnknownCount] = useState(0);
  const [exitX, setExitX] = useState(0);
  const [combo, setCombo] = useState(0);

  const currentWord = words[currentIndex];
  const progress = ((currentIndex) / words.length) * 100;

  const handleSwipe = (direction: "left" | "right") => {
    setExitX(direction === "right" ? 300 : -300);
    
    if (direction === "right") {
      setKnownCount(prev => prev + 1);
      setCombo(prev => prev + 1);
      if (combo >= 4) {
        confetti({ particleCount: 30, spread: 60, origin: { y: 0.6 } });
      }
    } else {
      setUnknownCount(prev => prev + 1);
      setCombo(0);
    }

    setTimeout(() => {
      if (currentIndex < words.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setShowMeaning(false);
        setExitX(0);
      } else {
        onComplete(knownCount + (direction === "right" ? 1 : 0), unknownCount + (direction === "left" ? 1 : 0));
      }
    }, 200);
  };

  const handleDragEnd = (event: any, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 100) {
      handleSwipe(info.offset.x > 0 ? "right" : "left");
    }
  };

  if (!currentWord) return null;

  return (
    <div className="relative">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>{currentIndex + 1} / {words.length}</span>
          <div className="flex items-center gap-2">
            {combo >= 3 && (
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1 text-orange-500 font-bold"
              >
                <Flame className="w-4 h-4" />
                {combo} combo!
              </motion.span>
            )}
            <span className="text-green-500">✓ {knownCount}</span>
            <span className="text-red-500">✗ {unknownCount}</span>
          </div>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-primary to-primary/70"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Swipe Instructions */}
      <div className="flex justify-between text-sm text-muted-foreground mb-4 px-4">
        <span className="flex items-center gap-1"><ThumbsDown className="w-4 h-4 text-red-400" /> 모르겠어요</span>
        <span className="flex items-center gap-1">알아요 <ThumbsUp className="w-4 h-4 text-green-400" /></span>
      </div>

      {/* Card */}
      <div className="relative h-[400px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentWord.id}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, x: 0 }}
            exit={{ x: exitX, opacity: 0, rotate: exitX > 0 ? 15 : -15 }}
            whileDrag={{ scale: 1.05, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="absolute w-full max-w-sm cursor-grab active:cursor-grabbing"
          >
            <div 
              className="bg-gradient-to-br from-card to-card/80 border-2 border-border rounded-3xl p-8 shadow-2xl min-h-[320px] flex flex-col items-center justify-center text-center"
              onClick={() => setShowMeaning(!showMeaning)}
            >
              {/* Korean Word */}
              <div className="mb-4">
                <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-2">
                  {currentWord.korean}
                </h2>
                {currentWord.pronunciation && (
                  <p className="text-muted-foreground text-lg">[{currentWord.pronunciation}]</p>
                )}
              </div>

              {/* Meaning (revealed on tap) */}
              <AnimatePresence>
                {showMeaning && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="mt-4 pt-4 border-t border-border w-full"
                  >
                    <p className="text-xl text-primary font-semibold mb-2">{currentWord.meaning}</p>
                    {currentWord.example && (
                      <div className="text-sm text-muted-foreground">
                        <p className="italic">"{currentWord.example}"</p>
                        {currentWord.exampleMeaning && (
                          <p className="text-xs mt-1">({currentWord.exampleMeaning})</p>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tap hint */}
              {!showMeaning && (
                <p className="text-sm text-muted-foreground mt-4 flex items-center gap-1">
                  <Eye className="w-4 h-4" /> Nhấn để xem nghĩa
                </p>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Button Controls */}
      <div className="flex justify-center gap-6 mt-8">
        <Button
          size="lg"
          variant="outline"
          onClick={() => handleSwipe("left")}
          className="rounded-full w-16 h-16 border-red-300 hover:bg-red-50 hover:border-red-400"
        >
          <ThumbsDown className="w-6 h-6 text-red-500" />
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => handleSwipe("right")}
          className="rounded-full w-16 h-16 border-green-300 hover:bg-green-50 hover:border-green-400"
        >
          <ThumbsUp className="w-6 h-6 text-green-500" />
        </Button>
      </div>
    </div>
  );
};

// ================== MEMORY MATCHING COMPONENT ==================
interface MemoryGameProps {
  words: Word[];
  onComplete: (attempts: number, time: number) => void;
}

interface MemoryCard {
  id: string;
  wordId: number;
  content: string;
  type: "korean" | "meaning";
  isFlipped: boolean;
  isMatched: boolean;
}

const MemoryGame = ({ words, onComplete }: MemoryGameProps) => {
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<string[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [startTime] = useState(Date.now());
  const [isChecking, setIsChecking] = useState(false);

  // Initialize cards (use first 6 words for 12 cards)
  useEffect(() => {
    const gameWords = words.slice(0, 6);
    const newCards: MemoryCard[] = [];
    
    gameWords.forEach((word, idx) => {
      newCards.push({
        id: `korean-${idx}`,
        wordId: word.id,
        content: word.korean,
        type: "korean",
        isFlipped: false,
        isMatched: false,
      });
      newCards.push({
        id: `meaning-${idx}`,
        wordId: word.id,
        content: word.meaning,
        type: "meaning",
        isFlipped: false,
        isMatched: false,
      });
    });

    // Shuffle cards
    setCards(newCards.sort(() => Math.random() - 0.5));
  }, [words]);

  const handleCardClick = (cardId: string) => {
    if (isChecking) return;
    
    const card = cards.find(c => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;
    if (flippedCards.length >= 2) return;

    // Flip the card
    setCards(prev => prev.map(c => 
      c.id === cardId ? { ...c, isFlipped: true } : c
    ));

    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);

    // Check for match when 2 cards are flipped
    if (newFlipped.length === 2) {
      setIsChecking(true);
      setAttempts(prev => prev + 1);

      const [firstId, secondId] = newFlipped;
      const firstCard = cards.find(c => c.id === firstId)!;
      const secondCard = cards.find(c => c.id === secondId)!;

      setTimeout(() => {
        if (firstCard.wordId === secondCard.wordId && firstCard.type !== secondCard.type) {
          // Match found!
          setCards(prev => prev.map(c => 
            c.wordId === firstCard.wordId ? { ...c, isMatched: true } : c
          ));
          setMatchedPairs(prev => {
            const newMatched = prev + 1;
            if (newMatched === 6) {
              confetti({ particleCount: 100, spread: 70 });
              onComplete(attempts + 1, Math.floor((Date.now() - startTime) / 1000));
            }
            return newMatched;
          });
        } else {
          // No match - flip back
          setCards(prev => prev.map(c => 
            newFlipped.includes(c.id) ? { ...c, isFlipped: false } : c
          ));
        }
        setFlippedCards([]);
        setIsChecking(false);
      }, 800);
    }
  };

  return (
    <div>
      {/* Stats */}
      <div className="flex justify-between text-sm mb-6">
        <span className="text-muted-foreground">시도: <span className="font-bold text-foreground">{attempts}</span></span>
        <span className="text-muted-foreground">매칭: <span className="font-bold text-primary">{matchedPairs}/6</span></span>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {cards.map((card) => (
          <motion.div
            key={card.id}
            onClick={() => handleCardClick(card.id)}
            whileHover={{ scale: card.isMatched ? 1 : 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`aspect-square rounded-xl cursor-pointer transition-all ${
              card.isMatched 
                ? "bg-green-100 border-2 border-green-400" 
                : "bg-card border-2 border-border hover:border-primary/50"
            }`}
          >
            <div className="w-full h-full flex items-center justify-center p-2">
              {card.isFlipped || card.isMatched ? (
                <motion.span 
                  initial={{ rotateY: -90 }}
                  animate={{ rotateY: 0 }}
                  className={`text-center font-medium ${
                    card.type === "korean" ? "text-lg" : "text-sm"
                  } ${card.isMatched ? "text-green-600" : "text-foreground"}`}
                >
                  {card.content}
                </motion.span>
              ) : (
                <span className="text-3xl">❓</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ================== SPRINT COMPONENT ==================
interface SprintGameProps {
  words: Word[];
  onComplete: (score: number) => void;
}

const SprintGame = ({ words, onComplete }: SprintGameProps) => {
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [streak, setStreak] = useState(0);

  const currentWord = words[currentIndex % words.length];

  // Generate options
  useEffect(() => {
    if (!currentWord) return;
    
    const correctAnswer = currentWord.meaning;
    const otherMeanings = words
      .filter(w => w.id !== currentWord.id)
      .map(w => w.meaning)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    
    const allOptions = [correctAnswer, ...otherMeanings].sort(() => Math.random() - 0.5);
    setOptions(allOptions);
  }, [currentIndex, words, currentWord]);

  // Timer
  useEffect(() => {
    if (!gameStarted || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onComplete(score);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameStarted, timeLeft, score, onComplete]);

  const handleAnswer = (optionIndex: number) => {
    if (showResult) return;
    
    setSelectedAnswer(optionIndex);
    setShowResult(true);

    const isCorrect = options[optionIndex] === currentWord.meaning;
    
    if (isCorrect) {
      const bonusPoints = Math.min(streak, 5);
      setScore(prev => prev + 10 + bonusPoints);
      setStreak(prev => prev + 1);
    } else {
      setStreak(0);
    }

    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    }, 500);
  };

  if (!gameStarted) {
    return (
      <div className="text-center py-12">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center mx-auto mb-6"
        >
          <Timer className="w-12 h-12 text-white" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">60초 스프린트</h2>
        <p className="text-muted-foreground mb-6">60초 안에 최대한 많은 단어를 맞추세요!</p>
        <Button 
          size="lg" 
          onClick={() => setGameStarted(true)}
          className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
        >
          시작하기!
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Timer & Score */}
      <div className="flex justify-between items-center mb-6">
        <div className={`text-3xl font-bold ${timeLeft <= 10 ? "text-red-500 animate-pulse" : "text-foreground"}`}>
          ⏱️ {timeLeft}s
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">{score} 점</div>
          {streak >= 3 && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-sm text-orange-500 flex items-center gap-1"
            >
              <Flame className="w-4 h-4" /> {streak} 연속!
            </motion.div>
          )}
        </div>
      </div>

      {/* Question */}
      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border-2 border-border rounded-2xl p-8 text-center mb-6"
      >
        <h2 className="text-4xl font-bold text-foreground">{currentWord.korean}</h2>
      </motion.div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-3">
        {options.map((option, idx) => {
          const isCorrect = option === currentWord.meaning;
          const isSelected = selectedAnswer === idx;
          
          return (
            <motion.button
              key={idx}
              whileHover={{ scale: showResult ? 1 : 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAnswer(idx)}
              disabled={showResult}
              className={`p-4 rounded-xl text-left font-medium transition-all ${
                showResult
                  ? isCorrect
                    ? "bg-green-100 border-2 border-green-500 text-green-700"
                    : isSelected
                      ? "bg-red-100 border-2 border-red-500 text-red-700"
                      : "bg-muted border-2 border-border text-muted-foreground"
                  : "bg-card border-2 border-border hover:border-primary/50"
              }`}
            >
              {option}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

// ================== MAIN COMPONENT ==================
const Vocabulary = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>("flashcard");
  const [topikLevel, setTopikLevel] = useState<TopikLevel>("1-2");
  const [words, setWords] = useState<Word[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [gameResult, setGameResult] = useState<any>(null);

  // Fetch vocabulary words
  const fetchWords = useCallback(async (level: TopikLevel) => {
    setIsLoading(true);
    setGameComplete(false);
    setGameResult(null);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vocabulary-content`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ count: 12, topikLevel: level }),
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch words');
      
      const data = await response.json();
      
      if (data.success && data.words?.length > 0) {
        setWords(data.words);
        console.log(`✅ Loaded ${data.words.length} words for TOPIK ${level}`);
      } else {
        // Fallback words
        setWords(getFallbackWords(level));
      }
    } catch (error) {
      console.error('Error fetching words:', error);
      setWords(getFallbackWords(level));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fallback words by level
  const getFallbackWords = (level: TopikLevel): Word[] => {
    const fallbacks: Record<TopikLevel, Word[]> = {
      "1-2": [
        { id: 1, korean: "사과", meaning: "Quả táo", example: "사과가 맛있어요.", exampleMeaning: "Táo ngon." },
        { id: 2, korean: "학교", meaning: "Trường học", example: "학교에 가요.", exampleMeaning: "Tôi đi học." },
        { id: 3, korean: "친구", meaning: "Bạn bè", example: "친구를 만나요.", exampleMeaning: "Tôi gặp bạn." },
        { id: 4, korean: "음식", meaning: "Đồ ăn", example: "음식이 맛있어요.", exampleMeaning: "Đồ ăn ngon." },
        { id: 5, korean: "날씨", meaning: "Thời tiết", example: "날씨가 좋아요.", exampleMeaning: "Thời tiết tốt." },
        { id: 6, korean: "시간", meaning: "Thời gian", example: "시간이 없어요.", exampleMeaning: "Không có thời gian." },
        { id: 7, korean: "가족", meaning: "Gia đình", example: "가족이 좋아요.", exampleMeaning: "Gia đình tốt." },
        { id: 8, korean: "일", meaning: "Công việc", example: "일이 많아요.", exampleMeaning: "Nhiều việc." },
        { id: 9, korean: "물", meaning: "Nước", example: "물을 마셔요.", exampleMeaning: "Tôi uống nước." },
        { id: 10, korean: "집", meaning: "Nhà", example: "집에 가요.", exampleMeaning: "Tôi về nhà." },
        { id: 11, korean: "책", meaning: "Sách", example: "책을 읽어요.", exampleMeaning: "Tôi đọc sách." },
        { id: 12, korean: "전화", meaning: "Điện thoại", example: "전화가 와요.", exampleMeaning: "Có điện thoại." },
      ],
      "3-4": [
        { id: 1, korean: "경험", meaning: "Kinh nghiệm", example: "좋은 경험이었어요.", exampleMeaning: "Đó là kinh nghiệm tốt." },
        { id: 2, korean: "문화", meaning: "Văn hóa", example: "한국 문화를 배워요.", exampleMeaning: "Tôi học văn hóa Hàn." },
        { id: 3, korean: "환경", meaning: "Môi trường", example: "환경을 보호해요.", exampleMeaning: "Bảo vệ môi trường." },
        { id: 4, korean: "발전", meaning: "Phát triển", example: "경제가 발전해요.", exampleMeaning: "Kinh tế phát triển." },
        { id: 5, korean: "관계", meaning: "Quan hệ", example: "좋은 관계를 유지해요.", exampleMeaning: "Duy trì quan hệ tốt." },
        { id: 6, korean: "사회", meaning: "Xã hội", example: "사회 문제예요.", exampleMeaning: "Vấn đề xã hội." },
        { id: 7, korean: "교육", meaning: "Giáo dục", example: "교육이 중요해요.", exampleMeaning: "Giáo dục quan trọng." },
        { id: 8, korean: "결과", meaning: "Kết quả", example: "좋은 결과예요.", exampleMeaning: "Kết quả tốt." },
        { id: 9, korean: "정보", meaning: "Thông tin", example: "정보를 찾아요.", exampleMeaning: "Tôi tìm thông tin." },
        { id: 10, korean: "의견", meaning: "Ý kiến", example: "의견을 말해요.", exampleMeaning: "Tôi nói ý kiến." },
        { id: 11, korean: "변화", meaning: "Thay đổi", example: "변화가 필요해요.", exampleMeaning: "Cần thay đổi." },
        { id: 12, korean: "기회", meaning: "Cơ hội", example: "좋은 기회예요.", exampleMeaning: "Cơ hội tốt." },
      ],
      "5-6": [
        { id: 1, korean: "지속가능성", meaning: "Tính bền vững", example: "지속가능성이 중요합니다.", exampleMeaning: "Tính bền vững quan trọng." },
        { id: 2, korean: "패러다임", meaning: "Mô hình", example: "새로운 패러다임이 필요합니다.", exampleMeaning: "Cần mô hình mới." },
        { id: 3, korean: "양극화", meaning: "Phân cực hóa", example: "사회 양극화가 심각합니다.", exampleMeaning: "Phân cực xã hội nghiêm trọng." },
        { id: 4, korean: "본질", meaning: "Bản chất", example: "문제의 본질을 파악하세요.", exampleMeaning: "Nắm bắt bản chất vấn đề." },
        { id: 5, korean: "함의", meaning: "Hàm ý", example: "이 결과의 함의가 큽니다.", exampleMeaning: "Hàm ý của kết quả này lớn." },
        { id: 6, korean: "맥락", meaning: "Ngữ cảnh", example: "맥락을 이해하세요.", exampleMeaning: "Hãy hiểu ngữ cảnh." },
        { id: 7, korean: "논거", meaning: "Luận cứ", example: "논거가 부족합니다.", exampleMeaning: "Thiếu luận cứ." },
        { id: 8, korean: "담론", meaning: "Diễn ngôn", example: "새로운 담론이 필요합니다.", exampleMeaning: "Cần diễn ngôn mới." },
        { id: 9, korean: "인프라", meaning: "Cơ sở hạ tầng", example: "인프라 투자가 필요합니다.", exampleMeaning: "Cần đầu tư cơ sở hạ tầng." },
        { id: 10, korean: "귀결", meaning: "Kết quả, hệ quả", example: "이러한 귀결을 초래했습니다.", exampleMeaning: "Dẫn đến hệ quả như vậy." },
        { id: 11, korean: "타당성", meaning: "Tính hợp lý", example: "타당성을 검토하세요.", exampleMeaning: "Kiểm tra tính hợp lý." },
        { id: 12, korean: "메커니즘", meaning: "Cơ chế", example: "메커니즘을 분석합니다.", exampleMeaning: "Phân tích cơ chế." },
      ],
    };
    return fallbacks[level];
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    fetchWords(topikLevel);
  }, [topikLevel, fetchWords]);

  const handleLevelChange = (level: TopikLevel) => {
    setTopikLevel(level);
    setGameComplete(false);
    setGameResult(null);
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setGameComplete(false);
    setGameResult(null);
  };

  const playTTS = async (text: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/korean-tts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, speed: 0.9 }),
        }
      );
      if (!response.ok) throw new Error("TTS failed");
      const blob = await response.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      await audio.play();
    } catch (error) {
      console.error("TTS error:", error);
    }
  };

  const handleFlashcardComplete = (known: number, unknown: number) => {
    setGameComplete(true);
    setGameResult({ type: "flashcard", known, unknown, total: known + unknown });
    if (known > unknown) {
      confetti({ particleCount: 100, spread: 70 });
    }
  };

  const handleMemoryComplete = (attempts: number, time: number) => {
    setGameComplete(true);
    setGameResult({ type: "memory", attempts, time });
  };

  const handleSprintComplete = (score: number) => {
    setGameComplete(true);
    setGameResult({ type: "sprint", score });
  };

  const handleRestart = () => {
    setGameComplete(false);
    setGameResult(null);
    fetchWords(topikLevel);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CleanHeader />
      
      <main className="flex-1 pb-24">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-6"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="mb-6 hover:bg-primary/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại
            </Button>

            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-8 mb-8">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjIiLz48L2c+PC9zdmc+')] opacity-30" />
              
              <div className="relative z-10 flex items-center gap-6">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-2xl border border-white/30"
                >
                  <BookOpen className="w-10 h-10 text-white" />
                </motion.div>
                <div>
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-medium mb-2"
                  >
                    <Sparkles className="w-3 h-3" />
                    3가지 게임
                  </motion.div>
                  <motion.h1 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-3xl sm:text-4xl font-bold text-white mb-1"
                  >
                    어휘 학습
                  </motion.h1>
                  <motion.p 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-white/80"
                  >
                    Từ vựng TOPIK
                  </motion.p>
                </div>
              </div>
            </div>

            {/* TOPIK Level Selection */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
              {(Object.keys(topikLevels) as TopikLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => handleLevelChange(level)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all font-medium ${
                    topikLevel === level
                      ? `bg-gradient-to-r ${topikLevels[level].color} text-white shadow-lg`
                      : "bg-muted hover:bg-muted/80 text-muted-foreground"
                  }`}
                >
                  <span className="text-sm font-bold">{level}급</span>
                  <span className="text-xs opacity-80">{topikLevels[level].sublabel}</span>
                </button>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as TabType)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "bg-card border border-border hover:bg-muted"
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <div className="text-left">
                    <div className="text-sm font-bold">{tab.label}</div>
                    <div className="text-xs opacity-70">{tab.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Game Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-3xl bg-card border border-border p-6 sm:p-8"
          >
            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">단어를 불러오는 중...</p>
              </div>
            ) : gameComplete ? (
              /* Game Complete Screen */
              <div className="text-center py-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mx-auto mb-6"
                >
                  <Trophy className="w-10 h-10 text-white" />
                </motion.div>
                
                <h2 className="text-2xl font-bold mb-4">완료! 🎉</h2>
                
                {gameResult?.type === "flashcard" && (
                  <div className="mb-6">
                    <p className="text-lg">
                      총 <span className="font-bold">{gameResult.total}</span>개 중{" "}
                      <span className="text-green-500 font-bold">{gameResult.known}</span>개를 알았어요!
                    </p>
                    <p className="text-muted-foreground">
                      정답률: {Math.round((gameResult.known / gameResult.total) * 100)}%
                    </p>
                  </div>
                )}
                
                {gameResult?.type === "memory" && (
                  <div className="mb-6">
                    <p className="text-lg">
                      <span className="font-bold">{gameResult.attempts}</span>번 시도,{" "}
                      <span className="font-bold">{gameResult.time}</span>초 소요
                    </p>
                  </div>
                )}
                
                {gameResult?.type === "sprint" && (
                  <div className="mb-6">
                    <p className="text-3xl font-bold text-primary">{gameResult.score}점</p>
                  </div>
                )}

                <div className="flex justify-center gap-4">
                  <Button onClick={handleRestart} variant="outline">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    다시 하기
                  </Button>
                  <Button onClick={() => fetchWords(topikLevel)}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    새 단어
                  </Button>
                </div>
              </div>
            ) : (
              /* Game Components */
              <>
                {activeTab === "flashcard" && (
                  <FlashcardGame 
                    words={words} 
                    onComplete={handleFlashcardComplete}
                    onPlayTTS={playTTS}
                  />
                )}
                {activeTab === "memory" && (
                  <MemoryGame 
                    words={words} 
                    onComplete={handleMemoryComplete}
                  />
                )}
                {activeTab === "sprint" && (
                  <SprintGame 
                    words={words} 
                    onComplete={handleSprintComplete}
                  />
                )}
              </>
            )}
          </motion.div>
        </div>
      </main>
      
      <AppFooter />
    </div>
  );
};

export default Vocabulary;
