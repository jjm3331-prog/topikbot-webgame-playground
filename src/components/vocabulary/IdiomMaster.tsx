import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { 
  BookOpen, 
  Loader2, 
  RotateCw, 
  Lightbulb, 
  MessageCircle,
  CheckCircle2,
  Volume2
} from "lucide-react";

interface Idiom {
  id: string;
  idiom: string;
  literal_meaning: string;
  actual_meaning: string;
  actual_meaning_vi?: string;
  situation_example?: string;
  similar_expressions?: string[];
  level: number;
}

interface IdiomMasterProps {
  level: number;
  onMistake?: (idiom: Idiom) => void;
}

const IdiomMaster = ({ level, onMistake }: IdiomMasterProps) => {
  const { t, i18n } = useTranslation();
  const [idioms, setIdioms] = useState<Idiom[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showSituation, setShowSituation] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);

  const currentIdiom = idioms[currentIndex];

  // Fetch idioms from DB
  useEffect(() => {
    const fetchIdioms = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('topik_idioms')
          .select('*')
          .eq('level', level)
          .limit(10);

        if (error) throw error;

        if (data && data.length > 0) {
          // Shuffle idioms
          const shuffled = [...data].sort(() => Math.random() - 0.5);
          setIdioms(shuffled);
        } else {
          // Fallback data
          setIdioms(getFallbackIdioms(level));
        }
      } catch (error) {
        console.error('Error fetching idioms:', error);
        setIdioms(getFallbackIdioms(level));
      } finally {
        setIsLoading(false);
      }
    };

    fetchIdioms();
  }, [level]);

  const getFallbackIdioms = (level: number): Idiom[] => {
    const fallbacks: Record<number, Idiom[]> = {
      1: [
        { id: '1', idiom: '눈이 높다', literal_meaning: '눈이 높은 위치에 있다', actual_meaning: '기준이나 안목이 높다', actual_meaning_vi: 'Có tiêu chuẩn cao', situation_example: '그 사람은 눈이 높아서 아무나 사귀지 않아요.', level: 1 },
        { id: '2', idiom: '손이 크다', literal_meaning: '손의 크기가 크다', actual_meaning: '씀씀이가 크다, 후하다', actual_meaning_vi: 'Hào phóng', situation_example: '우리 할머니는 손이 커서 항상 음식을 많이 만드세요.', level: 1 },
      ],
      2: [
        { id: '1', idiom: '발이 넓다', literal_meaning: '발이 넓은 모양이다', actual_meaning: '아는 사람이 많다, 인맥이 넓다', actual_meaning_vi: 'Quen biết rộng', situation_example: '그 분은 발이 넓어서 어디를 가나 아는 사람이 있어요.', level: 2 },
        { id: '2', idiom: '귀가 얇다', literal_meaning: '귀가 얇은 형태이다', actual_meaning: '남의 말을 쉽게 믿다', actual_meaning_vi: 'Dễ tin người', situation_example: '동생은 귀가 얇아서 광고만 보면 다 사고 싶어해요.', level: 2 },
      ],
      3: [
        { id: '1', idiom: '입이 무겁다', literal_meaning: '입이 무거운 상태이다', actual_meaning: '비밀을 잘 지킨다', actual_meaning_vi: 'Kín miệng, giữ bí mật tốt', situation_example: '비밀 이야기는 민수에게 해도 돼요. 입이 무거우니까.', level: 3 },
        { id: '2', idiom: '배가 아프다', literal_meaning: '배에 통증이 있다', actual_meaning: '남이 잘되는 것이 시샘이 나다', actual_meaning_vi: 'Ghen tị', situation_example: '친구가 상을 받으니까 솔직히 좀 배가 아팠어요.', level: 3 },
      ],
      4: [
        { id: '1', idiom: '눈코 뜰 새 없다', literal_meaning: '눈과 코를 뜰 시간이 없다', actual_meaning: '매우 바쁘다', actual_meaning_vi: 'Bận rộn không ngơi tay', situation_example: '시험 기간에는 눈코 뜰 새 없이 바빠요.', level: 4 },
        { id: '2', idiom: '발등에 불이 떨어지다', literal_meaning: '발등에 불이 떨어진 상황', actual_meaning: '일이 급박하게 다가오다', actual_meaning_vi: 'Nước đến chân mới nhảy', situation_example: '마감이 내일인데 이제야 발등에 불이 떨어졌어요.', level: 4 },
      ],
      5: [
        { id: '1', idiom: '우물 안 개구리', literal_meaning: '우물 안에 있는 개구리', actual_meaning: '세상을 모르고 자기만 아는 사람', actual_meaning_vi: 'Ếch ngồi đáy giếng', situation_example: '해외여행을 다녀오니 전에는 우물 안 개구리였다는 걸 알았어요.', level: 5 },
        { id: '2', idiom: '빛 좋은 개살구', literal_meaning: '보기에는 좋은 개살구', actual_meaning: '겉만 번지르르하고 실속이 없다', actual_meaning_vi: 'Có vẻ ngoài đẹp nhưng không có giá trị', situation_example: '그 가게는 인테리어는 좋은데 음식은 빛 좋은 개살구예요.', level: 5 },
      ],
      6: [
        { id: '1', idiom: '하늘의 별 따기', literal_meaning: '하늘에 있는 별을 따는 것', actual_meaning: '매우 어렵거나 불가능한 일', actual_meaning_vi: 'Việc khó như hái sao trên trời', situation_example: '서울에서 집을 사는 건 정말 하늘의 별 따기예요.', level: 6 },
        { id: '2', idiom: '사면초가', literal_meaning: '사방에서 초나라 노래가 들린다', actual_meaning: '사방에서 적에게 둘러싸인 어려운 상황', actual_meaning_vi: 'Tứ bề thọ địch', situation_example: '회사 상황이 사면초가라 정말 힘들어요.', level: 6 },
      ],
    };
    return fallbacks[level] || fallbacks[1];
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

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    if (!isFlipped) {
      playTTS(currentIdiom.idiom);
    }
  };

  const handleAnswer = (correct: boolean) => {
    if (answered) return;
    setAnswered(true);

    if (correct) {
      setScore(prev => prev + 10);
    } else {
      // Record mistake
      onMistake?.(currentIdiom);
    }

    setTimeout(() => {
      handleNext();
    }, 1000);
  };

  const handleNext = () => {
    if (currentIndex < idioms.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
      setShowSituation(false);
      setAnswered(false);
    } else {
      // Game complete
      setGameStarted(false);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowSituation(false);
    setScore(0);
    setAnswered(false);
    setGameStarted(true);
    // Shuffle idioms
    setIdioms(prev => [...prev].sort(() => Math.random() - 0.5));
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">{t("idiom.loading", "관용표현 로딩 중...")}</p>
      </div>
    );
  }

  if (!gameStarted) {
    return (
      <div className="text-center py-12">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-6"
        >
          <Lightbulb className="w-12 h-12 text-white" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">{t("idiom.title", "관용표현 마스터")}</h2>
        <p className="text-muted-foreground mb-2">{t("idiom.subtitle", "직역 ↔ 실제 의미를 맞춰보세요!")}</p>
        <p className="text-sm text-primary mb-6">{t("idiom.levelExpressions", "TOPIK {{level}}급 표현", { level })}</p>
        
        {score > 0 && (
          <div className="mb-4 p-4 bg-muted rounded-xl">
            <p className="text-lg">{t("idiom.previousScore", "이전 점수")}: <span className="font-bold text-primary">{score}{t("idiom.scoreUnit", "점")}</span></p>
          </div>
        )}
        
        <Button 
          size="lg" 
          onClick={() => setGameStarted(true)}
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
        >
          {score > 0 ? t("idiom.restart", "다시 시작") : t("idiom.start", "시작하기")}
        </Button>
      </div>
    );
  }

  if (!currentIdiom) return null;

  return (
    <div>
      {/* Progress & Score */}
      <div className="flex justify-between items-center mb-6">
        <div className="text-sm text-muted-foreground">
          {currentIndex + 1} / {idioms.length}
        </div>
        <div className="text-lg font-bold text-primary">{score}{t("idiom.scoreUnit", "점")}</div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-muted rounded-full mb-6 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + 1) / idioms.length) * 100}%` }}
        />
      </div>

      {/* Idiom Card */}
      <div className="perspective-1000 mb-6">
        <motion.div
          className="relative w-full min-h-[200px] cursor-pointer"
          onClick={handleFlip}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6 }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Front - 관용표현 */}
          <div 
            className={`absolute inset-0 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-2xl p-6 flex flex-col items-center justify-center backface-hidden ${isFlipped ? 'invisible' : ''}`}
          >
            <p className="text-3xl font-bold text-foreground mb-4">{currentIdiom.idiom}</p>
            <p className="text-muted-foreground text-sm">{t("idiom.tapToFlip", "탭하여 뒤집기")}</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-4"
              onClick={(e) => {
                e.stopPropagation();
                playTTS(currentIdiom.idiom);
              }}
            >
              <Volume2 className="w-5 h-5" />
            </Button>
          </div>

          {/* Back - 직역 의미 */}
          <div 
            className={`absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-2xl p-6 flex flex-col items-center justify-center backface-hidden rotate-y-180 ${!isFlipped ? 'invisible' : ''}`}
            style={{ transform: 'rotateY(180deg)' }}
          >
            <p className="text-sm text-muted-foreground mb-2">{t("idiom.literal", "직역")}</p>
            <p className="text-xl font-medium text-foreground mb-4">{currentIdiom.literal_meaning}</p>
            <p className="text-sm text-muted-foreground mb-2">{t("idiom.actualMeaning", "실제 의미")}</p>
            <p className="text-xl font-bold text-primary">
              {i18n.language === 'vi' && currentIdiom.actual_meaning_vi 
                ? currentIdiom.actual_meaning_vi 
                : currentIdiom.actual_meaning}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Situation Example */}
      <AnimatePresence>
        {showSituation && currentIdiom.situation_example && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-muted/50 rounded-xl p-4 mb-6"
          >
            <div className="flex items-start gap-3">
              <MessageCircle className="w-5 h-5 text-primary shrink-0 mt-1" />
              <div>
                <p className="text-sm font-medium mb-1">{t("idiom.situationExample", "상황 예시")}</p>
                <p className="text-foreground">{currentIdiom.situation_example}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Similar Expressions */}
      {currentIdiom.similar_expressions && currentIdiom.similar_expressions.length > 0 && isFlipped && (
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-2">{t("idiom.similarExpressions", "비슷한 표현")}</p>
          <div className="flex flex-wrap gap-2">
            {currentIdiom.similar_expressions.map((expr, idx) => (
              <span 
                key={idx}
                className="px-3 py-1 bg-muted rounded-full text-sm"
              >
                {expr}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3">
        {!showSituation && currentIdiom.situation_example && (
          <Button
            variant="outline"
            onClick={() => setShowSituation(true)}
            className="w-full"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            {t("idiom.showExample", "상황 예시 보기")}
          </Button>
        )}

        {isFlipped && (
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => handleAnswer(false)}
              disabled={answered}
              className={`flex-1 ${answered ? 'opacity-50' : 'hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-950/30'}`}
            >
              {t("idiom.confused", "헷갈려요 😅")}
            </Button>
            <Button
              onClick={() => handleAnswer(true)}
              disabled={answered}
              className={`flex-1 ${answered ? 'opacity-50' : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'}`}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {t("idiom.gotIt", "알겠어요!")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default IdiomMaster;
