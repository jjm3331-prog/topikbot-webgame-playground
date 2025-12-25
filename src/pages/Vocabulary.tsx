import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Timer,
  RotateCcw,
  Trophy,
  Flame,
  Car,
  Link2
} from "lucide-react";
import confetti from "canvas-confetti";
import WordRacing from "@/components/vocabulary/WordRacing";
import WordChainReaction from "@/components/vocabulary/WordChainReaction";

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
  { id: "racing", label: "단어 레이싱", icon: Car, description: "Đua xe từ vựng" },
  { id: "chain", label: "체인 리액션", icon: Link2, description: "Chuỗi phản ứng" },
  { id: "sprint", label: "60초 스프린트", icon: Timer, description: "Chạy đua 60 giây" },
];

type TabType = "racing" | "chain" | "sprint";



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
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <div className={`text-2xl sm:text-3xl font-bold ${timeLeft <= 10 ? "text-red-500 animate-pulse" : "text-foreground"}`}>
          ⏱️ {timeLeft}s
        </div>
        <div className="text-right">
          <div className="text-xl sm:text-2xl font-bold text-primary">{score} 점</div>
          {streak >= 3 && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-xs sm:text-sm text-orange-500 flex items-center gap-1"
            >
              <Flame className="w-3 h-3 sm:w-4 sm:h-4" /> {streak} 연속!
            </motion.div>
          )}
        </div>
      </div>

      {/* Question */}
      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border-2 border-border rounded-2xl p-4 sm:p-6 md:p-8 text-center mb-4 sm:mb-6"
      >
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">{currentWord.korean}</h2>
      </motion.div>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
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
              className={`p-3 sm:p-4 rounded-xl text-left font-medium text-sm sm:text-base transition-all ${
                showResult
                  ? isCorrect
                    ? "bg-green-100 dark:bg-green-900/30 border-2 border-green-500 text-green-700 dark:text-green-400"
                    : isSelected
                      ? "bg-red-100 dark:bg-red-900/30 border-2 border-red-500 text-red-700 dark:text-red-400"
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
  const [activeTab, setActiveTab] = useState<TabType>("racing");
  const [topikLevel, setTopikLevel] = useState<TopikLevel>("1-2");
  const [words, setWords] = useState<Word[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [gameResult, setGameResult] = useState<any>(null);
  
  // 이전에 학습한 단어들을 추적 (세션 동안 유지)
  const [learnedWords, setLearnedWords] = useState<Record<TopikLevel, string[]>>({
    "1-2": [],
    "3-4": [],
    "5-6": [],
  });
  const [sessionId] = useState(() => crypto.randomUUID());

  // Ref to track learned words without causing re-renders
  const learnedWordsRef = useRef(learnedWords);
  useEffect(() => {
    learnedWordsRef.current = learnedWords;
  }, [learnedWords]);

  // Fetch vocabulary words
  const fetchWords = useCallback(async (level: TopikLevel, forceNew = false) => {
    setIsLoading(true);
    setGameComplete(false);
    setGameResult(null);

    const excludeWords = learnedWordsRef.current[level] || [];

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vocabulary-content`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            count: 12,
            topikLevel: level,
            sessionId,
            excludeWords,
            forceNew: forceNew || excludeWords.length > 0,
          }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const t = await response.text().catch(() => "");
        throw new Error(`Failed to fetch words (${response.status}) ${t}`);
      }

      const data = await response.json();

      if (data.success && data.words?.length > 0) {
        setWords(data.words);
        // 새로 받은 단어들을 학습 기록에 추가
        const newKoreanWords = data.words.map((w: Word) => w.korean);
        setLearnedWords((prev) => ({
          ...prev,
          [level]: [...prev[level], ...newKoreanWords],
        }));
        console.log(
          `✅ Loaded ${data.words.length} NEW words for TOPIK ${level} (excluded ${excludeWords.length})`
        );
      } else {
        setWords(getFallbackWords(level));
      }
    } catch (error) {
      const isAbort = error instanceof DOMException && error.name === "AbortError";
      console.error("Error fetching words:", error);
      toast({
        title: "단어 로딩 실패",
        description: isAbort ? "네트워크가 느려서 시간이 초과됐어요." : "잠시 후 다시 시도해주세요.",
        variant: "destructive",
      });
      setWords(getFallbackWords(level));
    } finally {
      window.clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }, [sessionId, toast]);

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
  }, [topikLevel]);

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

  const handleRacingComplete = (score: number, wordsCompleted: number) => {
    setGameComplete(true);
    setGameResult({ type: "racing", score, wordsCompleted });
    if (wordsCompleted >= 3) {
      confetti({ particleCount: 100, spread: 70 });
    }
  };

  const handleChainComplete = (score: number, chainLength: number) => {
    setGameComplete(true);
    setGameResult({ type: "chain", score, chainLength });
    if (chainLength >= 5) {
      confetti({ particleCount: 100, spread: 70 });
    }
  };

  const handleSprintComplete = (score: number) => {
    setGameComplete(true);
    setGameResult({ type: "sprint", score });
  };

  const handleRestart = () => {
    setGameComplete(false);
    setGameResult(null);
    // 다시 하기는 현재 단어 유지 (새 단어 로드 안함)
  };
  
  const handleNewWords = () => {
    setGameComplete(false);
    setGameResult(null);
    fetchWords(topikLevel, true); // forceNew = true로 항상 새 단어 생성
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
            <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-4 sm:p-6 md:p-8 mb-6 sm:mb-8">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjIiLz48L2c+PC9zdmc+')] opacity-30" />
              
              <div className="relative z-10 flex items-center gap-4 sm:gap-6">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-2xl border border-white/30 shrink-0"
                >
                  <BookOpen className="w-7 h-7 sm:w-10 sm:h-10 text-white" />
                </motion.div>
                <div className="min-w-0">
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="inline-flex items-center gap-2 px-2 sm:px-3 py-1 rounded-full bg-white/20 text-white text-[10px] sm:text-xs font-medium mb-2"
                  >
                    <Sparkles className="w-3 h-3" />
                    3가지 게임
                  </motion.div>
                  <motion.h1 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1"
                  >
                    어휘 학습
                  </motion.h1>
                  <motion.p 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-white/80 text-sm sm:text-base"
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
            className="rounded-2xl sm:rounded-3xl bg-card border border-border p-4 sm:p-6 md:p-8"
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
                
                {gameResult?.type === "racing" && (
                  <div className="mb-6">
                    <p className="text-3xl font-bold text-primary mb-2">{gameResult.score}점</p>
                    <p className="text-muted-foreground">
                      {gameResult.wordsCompleted}개 단어 완성 / {gameResult.wordsCompleted} từ hoàn thành
                    </p>
                  </div>
                )}
                
                {gameResult?.type === "chain" && (
                  <div className="mb-6">
                    <p className="text-3xl font-bold text-primary mb-2">{gameResult.score}점</p>
                    <p className="text-muted-foreground">
                      {gameResult.chainLength} 체인 / chuỗi
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
                  <Button onClick={handleNewWords}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    새 단어
                  </Button>
                </div>
              </div>
            ) : (
              /* Game Components */
              <>
                {activeTab === "racing" && (
                  <WordRacing 
                    words={words} 
                    onComplete={handleRacingComplete}
                  />
                )}
                {activeTab === "chain" && (
                  <WordChainReaction 
                    words={words} 
                    onComplete={handleChainComplete}
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
