import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Heart,
  Coins,
  Trophy,
  RefreshCw,
  Star,
  Flame,
  Shield,
  Zap,
  Clock,
  Target,
  Skull,
  Crown,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type TopikLevel = "1-2" | "3-4" | "5-6";

interface TowerQuestion {
  id: string;
  wrongSentence: string; // 틀린 문장
  wrongSentenceVi: string; // 베트남어 번역
  errorType: string; // 오류 유형
  options: string[]; // 4지선다
  answer: string; // 정답
  explanationVi: string;
  explanationKo: string;
}

interface Monster {
  id: string;
  question: TowerQuestion;
  position: number; // 0-100 (100이면 기지 도달)
  speed: number; // 초당 이동 거리
  type: "normal" | "slow" | "speed" | "stealth" | "boss";
  hp: number; // 보스용
}

type GameState = "menu" | "playing" | "gameover" | "victory";

// 스테이지별 설정
const STAGE_CONFIG = {
  "1-2": {
    name: { vi: "Sơ cấp", ko: "초급" },
    monsterSpeed: 15, // 기본 속도 (초당 %)
    timePerMonster: 5, // 초
    totalQuestions: 10,
  },
  "3-4": {
    name: { vi: "Trung cấp", ko: "중급" },
    monsterSpeed: 20,
    timePerMonster: 4,
    totalQuestions: 10,
  },
  "5-6": {
    name: { vi: "Cao cấp", ko: "고급" },
    monsterSpeed: 25,
    timePerMonster: 3,
    totalQuestions: 10,
  },
};

// Fallback 문제들
const FALLBACK_QUESTIONS: Record<TopikLevel, TowerQuestion[]> = {
  "1-2": [
    {
      id: "1",
      wrongSentence: "나는 어제 학교에 갑니다",
      wrongSentenceVi: "Tôi đi đến trường hôm qua (sai thì)",
      errorType: "시제 오류",
      options: ["갔습니다", "갈 겁니다", "가고 있습니다", "간다"],
      answer: "갔습니다",
      explanationVi: "Vì có '어제' (hôm qua) nên phải dùng thì quá khứ '-았/었습니다'",
      explanationKo: "'어제'가 있으므로 과거 시제 '-았/었습니다'를 사용해야 합니다",
    },
    {
      id: "2",
      wrongSentence: "사과가 먹어요",
      wrongSentenceVi: "Quả táo ăn (sai trợ từ)",
      errorType: "조사 오류",
      options: ["사과를", "사과는", "사과에", "사과로"],
      answer: "사과를",
      explanationVi: "Táo là tân ngữ (được ăn), nên dùng trợ từ tân ngữ '-를'",
      explanationKo: "사과는 목적어이므로 목적격 조사 '-를'을 사용해야 합니다",
    },
    {
      id: "3",
      wrongSentence: "저는 물이 마셔요",
      wrongSentenceVi: "Tôi nước uống (sai trợ từ)",
      errorType: "조사 오류",
      options: ["물을", "물에", "물은", "물도"],
      answer: "물을",
      explanationVi: "Nước là tân ngữ, cần dùng '-을' (vì có 받침)",
      explanationKo: "물은 목적어이고 받침이 있으므로 '-을'을 사용합니다",
    },
    {
      id: "4",
      wrongSentence: "친구가 집을 왔어요",
      wrongSentenceVi: "Bạn đã đến nhà (sai trợ từ)",
      errorType: "조사 오류",
      options: ["집에", "집을", "집이", "집는"],
      answer: "집에",
      explanationVi: "Địa điểm đến dùng '-에', không phải '-을'",
      explanationKo: "이동의 목적지에는 '-에'를 사용합니다",
    },
    {
      id: "5",
      wrongSentence: "저는 한국어가 공부해요",
      wrongSentenceVi: "Tôi tiếng Hàn học (sai trợ từ)",
      errorType: "조사 오류",
      options: ["한국어를", "한국어는", "한국어에", "한국어도"],
      answer: "한국어를",
      explanationVi: "Tiếng Hàn là tân ngữ của động từ học, dùng '-를'",
      explanationKo: "한국어는 '공부하다'의 목적어이므로 '-를'을 사용합니다",
    },
    {
      id: "6",
      wrongSentence: "내일 비가 왔어요",
      wrongSentenceVi: "Ngày mai trời mưa đã (sai thì)",
      errorType: "시제 오류",
      options: ["올 거예요", "왔어요", "오세요", "오고 있어요"],
      answer: "올 거예요",
      explanationVi: "'Ngày mai' là tương lai, dùng '-ㄹ 거예요'",
      explanationKo: "'내일'은 미래이므로 '-ㄹ 거예요'를 사용합니다",
    },
    {
      id: "7",
      wrongSentence: "저는 커피는 좋아해요",
      wrongSentenceVi: "Tôi thì cà phê thì thích (trùng trợ từ)",
      errorType: "조사 오류",
      options: ["커피를", "커피가", "커피에", "커피도"],
      answer: "커피를",
      explanationVi: "Cà phê là tân ngữ, dùng '-를'. '는' đã dùng cho '저'",
      explanationKo: "'저는'에서 이미 '-는'을 사용했으므로 목적어는 '-를'",
    },
    {
      id: "8",
      wrongSentence: "학교에서 도서관을 갔어요",
      wrongSentenceVi: "Từ trường đã đi thư viện (sai trợ từ)",
      errorType: "조사 오류",
      options: ["도서관에", "도서관을", "도서관이", "도서관은"],
      answer: "도서관에",
      explanationVi: "Điểm đến khi di chuyển dùng '-에'",
      explanationKo: "이동의 목적지에는 '-에'를 사용합니다",
    },
    {
      id: "9",
      wrongSentence: "지금 밥을 먹었어요",
      wrongSentenceVi: "Bây giờ đã ăn cơm (sai thì)",
      errorType: "시제 오류",
      options: ["먹어요", "먹었어요", "먹을 거예요", "먹겠어요"],
      answer: "먹어요",
      explanationVi: "'Bây giờ' là hiện tại, dùng '-어요'",
      explanationKo: "'지금'은 현재이므로 현재 시제 '-어요'를 사용합니다",
    },
    {
      id: "10",
      wrongSentence: "동생이 케이크가 만들었어요",
      wrongSentenceVi: "Em đã làm bánh (sai trợ từ)",
      errorType: "조사 오류",
      options: ["케이크를", "케이크가", "케이크에", "케이크는"],
      answer: "케이크를",
      explanationVi: "Bánh là tân ngữ (được làm), dùng '-를'",
      explanationKo: "케이크는 만들다의 목적어이므로 '-를'을 사용합니다",
    },
  ],
  "3-4": [
    {
      id: "1",
      wrongSentence: "비가 오지만 우산이 없어서 집에 있어요",
      wrongSentenceVi: "Trời mưa nhưng vì không có ô nên ở nhà (sai logic)",
      errorType: "연결어미 오류",
      options: ["오니까", "오지만", "오면", "오고"],
      answer: "오니까",
      explanationVi: "Vì trời mưa → nên ở nhà. Dùng '-니까' (lý do)",
      explanationKo: "비가 오는 것이 이유이므로 '-니까'를 사용합니다",
    },
    {
      id: "2",
      wrongSentence: "선생님, 제가 도와드릴게요 (학생이 선생님에게)",
      wrongSentenceVi: "Thầy ơi, em sẽ giúp thầy (học sinh nói với thầy)",
      errorType: "높임법 오류",
      options: ["도와드릴까요?", "도와줄게요", "도와드릴게요", "도와요"],
      answer: "도와드릴까요?",
      explanationVi: "Với người trên, nên hỏi ý kiến '-ㄹ까요?' thay vì tự quyết",
      explanationKo: "윗사람에게는 의향을 묻는 '-ㄹ까요?'가 더 적절합니다",
    },
    {
      id: "3",
      wrongSentence: "시간이 있어서 영화를 못 봤어요",
      wrongSentenceVi: "Vì có thời gian nên không xem được phim (sai logic)",
      errorType: "연결어미 오류",
      options: ["없어서", "있어서", "있으니까", "있지만"],
      answer: "없어서",
      explanationVi: "'Không xem được' → vì 'không có' thời gian mới hợp lý",
      explanationKo: "'못 봤다'의 이유는 시간이 '없어서'입니다",
    },
    {
      id: "4",
      wrongSentence: "배가 부르면 더 먹어요",
      wrongSentenceVi: "Nếu no thì ăn thêm (sai logic)",
      errorType: "연결어미 오류",
      options: ["고프면", "부르면", "불러서", "부르니까"],
      answer: "고프면",
      explanationVi: "Logic đúng: nếu đói → ăn thêm",
      explanationKo: "배가 '고프면' 더 먹는 것이 논리적입니다",
    },
    {
      id: "5",
      wrongSentence: "할머니께 전화를 했어요",
      wrongSentenceVi: "Đã gọi điện cho bà (thiếu kính ngữ)",
      errorType: "높임법 오류",
      options: ["드렸어요", "했어요", "줬어요", "받았어요"],
      answer: "드렸어요",
      explanationVi: "Với người lớn tuổi, dùng '드리다' thay vì '하다'",
      explanationKo: "어른께는 '전화(를) 드리다'가 적절합니다",
    },
    {
      id: "6",
      wrongSentence: "피곤하지만 쉬고 싶어요",
      wrongSentenceVi: "Mệt nhưng muốn nghỉ (sai logic)",
      errorType: "연결어미 오류",
      options: ["피곤해서", "피곤하지만", "피곤하면", "피곤하고"],
      answer: "피곤해서",
      explanationVi: "Mệt (lý do) → muốn nghỉ. Dùng '-아서'",
      explanationKo: "피곤한 것이 이유이므로 '-아서'가 맞습니다",
    },
    {
      id: "7",
      wrongSentence: "부장님, 커피 마셔요",
      wrongSentenceVi: "Sếp ơi, uống cà phê đi (thiếu kính ngữ)",
      errorType: "높임법 오류",
      options: ["드세요", "마셔요", "마시겠어요", "마실래요"],
      answer: "드세요",
      explanationVi: "Mời người trên uống → '드세요' (kính ngữ của 마시다)",
      explanationKo: "윗사람에게는 '드시다'의 명령형 '드세요'를 씁니다",
    },
    {
      id: "8",
      wrongSentence: "날씨가 좋으니까 집에 있을 거예요",
      wrongSentenceVi: "Vì thời tiết đẹp nên sẽ ở nhà (sai logic)",
      errorType: "연결어미 오류",
      options: ["나쁘니까", "좋으니까", "좋아서", "좋지만"],
      answer: "나쁘니까",
      explanationVi: "Ở nhà thường vì thời tiết xấu, không phải đẹp",
      explanationKo: "날씨가 '나쁘니까' 집에 있는 것이 자연스럽습니다",
    },
    {
      id: "9",
      wrongSentence: "아버지, 이거 먹어",
      wrongSentenceVi: "Bố ơi, ăn cái này đi (thiếu kính ngữ)",
      errorType: "높임법 오류",
      options: ["드세요", "먹어", "먹어요", "먹을래요"],
      answer: "드세요",
      explanationVi: "Với bố (người trên), dùng kính ngữ '드세요'",
      explanationKo: "아버지께는 높임말 '드세요'를 사용합니다",
    },
    {
      id: "10",
      wrongSentence: "돈이 많아서 아르바이트를 해요",
      wrongSentenceVi: "Vì có nhiều tiền nên làm thêm (sai logic)",
      errorType: "연결어미 오류",
      options: ["없어서", "많아서", "있으니까", "많으면"],
      answer: "없어서",
      explanationVi: "Làm thêm vì thiếu tiền mới hợp lý",
      explanationKo: "돈이 '없어서' 아르바이트를 하는 것이 맞습니다",
    },
  ],
  "5-6": [
    {
      id: "1",
      wrongSentence: "그가 온다고 말했다더라",
      wrongSentenceVi: "Nghe nói anh ấy nói là sẽ đến (sai gián tiếp)",
      errorType: "간접화법 오류",
      options: ["온다더라", "온다고 했다", "올 거라더라", "왔다더라"],
      answer: "온다더라",
      explanationVi: "'-다더라' đã bao gồm ý 'nghe nói', không cần thêm '말했다'",
      explanationKo: "'-다더라'에 이미 전달의 의미가 있어 '말했다'가 불필요합니다",
    },
    {
      id: "2",
      wrongSentence: "그 책을 읽으면 감동적이에요",
      wrongSentenceVi: "Nếu đọc cuốn sách đó thì cảm động (sai biểu hiện)",
      errorType: "뉘앙스 오류",
      options: ["읽어 보면", "읽으면", "읽어서", "읽고"],
      answer: "읽어 보면",
      explanationVi: "'-어 보다' thể hiện việc thử nghiệm, đánh giá sau khi thử",
      explanationKo: "경험 후 평가를 나타낼 때는 '-어 보면'이 적절합니다",
    },
    {
      id: "3",
      wrongSentence: "비가 오는 바람에 소풍을 갈 수 있었어요",
      wrongSentenceVi: "Vì mưa nên đã có thể đi picnic (sai logic)",
      errorType: "뉘앙스 오류",
      options: ["갈 수 없었어요", "갈 수 있었어요", "가게 됐어요", "갔어요"],
      answer: "갈 수 없었어요",
      explanationVi: "'-는 바람에' dùng cho kết quả tiêu cực, không phải tích cực",
      explanationKo: "'-는 바람에'는 부정적인 결과에 사용합니다",
    },
    {
      id: "4",
      wrongSentence: "선배님이 저한테 가라고 하셨어요",
      wrongSentenceVi: "Anh chị đã bảo tôi đi (sai kính ngữ)",
      errorType: "간접화법 + 높임 오류",
      options: ["가라고 하셨어요", "가시라고 했어요", "가시래요", "가자고 하셨어요"],
      answer: "가라고 하셨어요",
      explanationVi: "Đây là câu đúng. Người nói nhường mình thấp hơn.",
      explanationKo: "이 문장은 올바릅니다. 화자가 자신을 낮추고 있습니다",
    },
    {
      id: "5",
      wrongSentence: "그 영화를 보고 나서야 감독이 누군지 알았어요",
      wrongSentenceVi: "Sau khi xem phim mới biết đạo diễn là ai",
      errorType: "정상 문장",
      options: ["보고 나서야", "보기 전에", "보면서", "보려고"],
      answer: "보고 나서야",
      explanationVi: "Đúng rồi! '-고 나서야' = chỉ sau khi... mới...",
      explanationKo: "'-고 나서야'는 '~한 후에야 비로소'의 의미입니다",
    },
    {
      id: "6",
      wrongSentence: "아무리 바빠서 건강을 챙겨야 해요",
      wrongSentenceVi: "Dù bận đến đâu cũng phải chăm sóc sức khỏe",
      errorType: "연결어미 오류",
      options: ["바빠도", "바빠서", "바쁘면", "바쁘니까"],
      answer: "바빠도",
      explanationVi: "'아무리' đi với '-아/어도' (dù... cũng)",
      explanationKo: "'아무리'는 양보의 '-아/어도'와 함께 씁니다",
    },
    {
      id: "7",
      wrongSentence: "그녀가 예쁘기는 예쁘지만 성격이 안 좋다",
      wrongSentenceVi: "Cô ấy đẹp thì có đẹp nhưng tính cách không tốt",
      errorType: "정상 문장",
      options: ["예쁘기는 예쁘지만", "예뻐서", "예쁘니까", "예쁘면"],
      answer: "예쁘기는 예쁘지만",
      explanationVi: "Đúng! '-기는 -지만' thể hiện sự thừa nhận nhưng có điều kiện",
      explanationKo: "'-기는 -지만'은 인정하면서 반박할 때 씁니다",
    },
    {
      id: "8",
      wrongSentence: "시험에 떨어질까 봐 열심히 공부 안 했어요",
      wrongSentenceVi: "Sợ trượt kỳ thi nên không học chăm",
      errorType: "뉘앙스 오류",
      options: ["공부했어요", "공부 안 했어요", "공부할 거예요", "공부하고 있어요"],
      answer: "공부했어요",
      explanationVi: "Sợ trượt → học chăm mới hợp lý",
      explanationKo: "시험에 떨어질까 봐 걱정되면 열심히 '공부합니다'",
    },
    {
      id: "9",
      wrongSentence: "일이 많은 김에 쉬세요",
      wrongSentenceVi: "Nhân tiện có nhiều việc thì nghỉ đi",
      errorType: "뉘앙스 오류",
      options: ["없는 김에", "많은 김에", "있으니까", "많아서"],
      answer: "없는 김에",
      explanationVi: "'-는 김에' = nhân tiện. Nghỉ khi không có việc mới hợp lý",
      explanationKo: "'일이 없는 김에 쉬다'가 자연스럽습니다",
    },
    {
      id: "10",
      wrongSentence: "그가 성공할 리가 있어요",
      wrongSentenceVi: "Anh ấy có lý do thành công",
      errorType: "뉘앙스 오류",
      options: ["성공할 리가 없어요", "성공할 리가 있어요", "성공하겠어요", "성공했어요"],
      answer: "성공할 리가 없어요",
      explanationVi: "'-ㄹ 리가 없다' = không có lý do, không thể nào",
      explanationKo: "'-ㄹ 리가 없다'는 불가능하다는 의미입니다",
    },
  ],
};

// 몬스터 이모지
const MONSTER_EMOJI: Record<Monster["type"], string> = {
  normal: "👾",
  slow: "🐌",
  speed: "🐇",
  stealth: "👻",
  boss: "👑",
};

export default function TowerDefenseGame({ level }: { level: TopikLevel }) {
  const [gameState, setGameState] = useState<GameState>("menu");
  const [hp, setHp] = useState(3);
  const [gold, setGold] = useState(0);
  const [combo, setCombo] = useState(0);
  const [currentMonster, setCurrentMonster] = useState<Monster | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<TowerQuestion[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [stars, setStars] = useState(0);
  const [noDamage, setNoDamage] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const config = STAGE_CONFIG[level];

  // Fetch questions from API or use fallback
  const fetchQuestions = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("grammar-content", {
        body: { level, type: "tower-defense", count: 10 },
      });

      if (error) throw error;

      if (data?.questions?.length > 0) {
        // Transform API response
        const transformed: TowerQuestion[] = data.questions.map((q: any, idx: number) => ({
          id: q.id || String(idx),
          wrongSentence: q.wrongSentence || q.question_ko || "",
          wrongSentenceVi: q.wrongSentenceVi || q.question_vi || "",
          errorType: q.errorType || "문법 오류",
          options: q.options || [],
          answer: q.answer || "",
          explanationVi: q.explanation_vi || q.explanationVi || "",
          explanationKo: q.explanation_ko || q.explanationKo || "",
        }));
        setQuestions(transformed);
      } else {
        throw new Error("No questions returned");
      }
    } catch (error) {
      console.error("Error fetching tower defense questions:", error);
      // Use fallback
      setQuestions([...FALLBACK_QUESTIONS[level]]);
    } finally {
      setIsLoading(false);
    }
  }, [level]);

  useEffect(() => {
    fetchQuestions();
  }, [level]);

  // 게임 시작
  const startGame = () => {
    setGameState("playing");
    setHp(3);
    setGold(0);
    setCombo(0);
    setQuestionIndex(0);
    setNoDamage(true);
    setSelectedAnswer(null);
    setShowResult(false);
    spawnMonster(0);
  };

  // 몬스터 생성
  const spawnMonster = (index: number) => {
    if (index >= questions.length) {
      // 승리!
      calculateStars();
      setGameState("victory");
      return;
    }

    const q = questions[index];
    const monster: Monster = {
      id: `monster-${index}`,
      question: q,
      position: 0,
      speed: config.monsterSpeed,
      type: "normal",
      hp: 1,
    };
    setCurrentMonster(monster);
    setSelectedAnswer(null);
    setShowResult(false);
    lastTimeRef.current = performance.now();
    startMonsterMovement();
  };

  // 몬스터 이동 애니메이션
  const startMonsterMovement = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const animate = (time: number) => {
      const delta = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      setCurrentMonster((prev) => {
        if (!prev || showResult) return prev;

        const newPosition = prev.position + prev.speed * delta;

        if (newPosition >= 100) {
          // 기지 도달 - 데미지!
          handleMonsterReachBase();
          return null;
        }

        return { ...prev, position: newPosition };
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  // 기지 도달 시
  const handleMonsterReachBase = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    setNoDamage(false);
    setCombo(0);

    setHp((prev) => {
      const newHp = prev - 1;
      if (newHp <= 0) {
        setGameState("gameover");
        return 0;
      }
      // 다음 몬스터
      setTimeout(() => {
        setQuestionIndex((idx) => {
          spawnMonster(idx + 1);
          return idx + 1;
        });
      }, 500);
      return newHp;
    });

    toast.error("💥 Mất 1 HP! / HP -1!");
  };

  // 정답 선택
  const handleAnswer = (option: string) => {
    if (showResult || !currentMonster) return;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    setSelectedAnswer(option);
    setShowResult(true);

    const correct = option === currentMonster.question.answer;
    setIsCorrect(correct);

    if (correct) {
      // 정답!
      const comboBonus = Math.min(combo, 10) * 2;
      setGold((prev) => prev + 10 + comboBonus);
      setCombo((prev) => prev + 1);
      toast.success(`💰 +${10 + comboBonus}G! ${combo > 0 ? `(${combo + 1} Combo!)` : ""}`);
    } else {
      // 오답 - 데미지
      setNoDamage(false);
      setCombo(0);
      setHp((prev) => {
        const newHp = prev - 1;
        if (newHp <= 0) {
          setTimeout(() => setGameState("gameover"), 1500);
        }
        return newHp;
      });
      toast.error("💔 Sai rồi! HP -1 / 틀렸습니다! HP -1");
    }

    // 1.5초 후 다음 문제
    setTimeout(() => {
      if (hp > 1 || correct) {
        setQuestionIndex((idx) => {
          spawnMonster(idx + 1);
          return idx + 1;
        });
      }
    }, 1500);
  };

  // 별 계산
  const calculateStars = () => {
    if (noDamage) {
      setStars(3);
    } else if (hp >= 2) {
      setStars(2);
    } else {
      setStars(1);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // ============ RENDER ============

  // Loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Menu
  if (gameState === "menu") {
    return (
      <Card className="p-8 text-center">
        <Shield className="w-16 h-16 mx-auto mb-4 text-primary" />
        <h2 className="text-2xl font-bold mb-2">Bảo vệ tháp / 타워 디펜스</h2>
        <p className="text-muted-foreground mb-2">
          {config.name.vi} ({config.name.ko})
        </p>
        <div className="text-sm text-muted-foreground mb-6 space-y-1">
          <p>🎯 Câu sai sẽ tiến về tháp / 틀린 문장이 기지로 다가옵니다</p>
          <p>✅ Chọn đáp án đúng để tiêu diệt / 올바른 답을 골라 격파하세요</p>
          <p>❤️ HP: 3 | 💰 Mỗi đáp án đúng: +10G</p>
        </div>
        <Button onClick={startGame} size="lg" className="gap-2">
          <Target className="w-5 h-5" />
          Bắt đầu / 시작하기
        </Button>
      </Card>
    );
  }

  // Game Over
  if (gameState === "gameover") {
    return (
      <Card className="p-8 text-center">
        <Skull className="w-16 h-16 mx-auto mb-4 text-red-500" />
        <h2 className="text-2xl font-bold mb-2 text-red-500">Game Over!</h2>
        <p className="text-muted-foreground mb-2">Tháp đã bị phá hủy / 기지가 파괴되었습니다</p>
        <div className="flex justify-center gap-4 mb-6">
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Coins className="w-4 h-4 mr-2" />
            {gold}G
          </Badge>
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Target className="w-4 h-4 mr-2" />
            {questionIndex}/{questions.length}
          </Badge>
        </div>
        <Button onClick={startGame} size="lg" className="gap-2">
          <RefreshCw className="w-5 h-5" />
          Thử lại / 다시 도전
        </Button>
      </Card>
    );
  }

  // Victory
  if (gameState === "victory") {
    return (
      <Card className="p-8 text-center">
        <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
        <h2 className="text-2xl font-bold mb-2">Chiến thắng! / 승리!</h2>
        
        {/* Stars */}
        <div className="flex justify-center gap-2 mb-4">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: i * 0.2 }}
            >
              <Star
                className={`w-10 h-10 ${
                  i <= stars ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"
                }`}
              />
            </motion.div>
          ))}
        </div>

        <div className="flex justify-center gap-4 mb-6">
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Coins className="w-4 h-4 mr-2" />
            {gold}G
          </Badge>
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Heart className="w-4 h-4 mr-2 text-red-500" />
            {hp}/3 HP
          </Badge>
        </div>

        {noDamage && (
          <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white mb-4">
            <Sparkles className="w-4 h-4 mr-2" />
            Perfect! Không mất HP / 노데미지 클리어!
          </Badge>
        )}

        <Button onClick={startGame} size="lg" className="gap-2">
          <RefreshCw className="w-5 h-5" />
          Chơi lại / 다시 플레이
        </Button>
      </Card>
    );
  }

  // Playing State
  const monster = currentMonster;
  if (!monster) return null;

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {[...Array(3)].map((_, i) => (
            <Heart
              key={i}
              className={`w-6 h-6 ${
                i < hp ? "text-red-500 fill-red-500" : "text-muted-foreground"
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-3">
          {combo > 0 && (
            <Badge className="bg-orange-500">
              <Flame className="w-4 h-4 mr-1" />
              {combo}x
            </Badge>
          )}
          <Badge variant="outline">
            <Coins className="w-4 h-4 mr-1" />
            {gold}G
          </Badge>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Wave {questionIndex + 1}/{questions.length}</span>
        <Progress value={((questionIndex + 1) / questions.length) * 100} className="flex-1 h-2" />
      </div>

      {/* Game Area */}
      <Card className="p-4 relative overflow-hidden min-h-[300px]">
        {/* Monster Sentence */}
        <div className="text-center mb-4">
          <Badge variant="secondary" className="mb-2">
            {monster.question.errorType}
          </Badge>
          <div className="text-lg font-bold text-destructive">
            "{monster.question.wrongSentence}"
          </div>
          <div className="text-sm text-muted-foreground">
            {monster.question.wrongSentenceVi}
          </div>
        </div>

        {/* Monster Track */}
        <div className="relative h-20 bg-muted/30 rounded-lg mb-4 overflow-hidden">
          {/* Base/Castle */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-3xl">
            🏰
          </div>

          {/* Monster */}
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 text-4xl"
            style={{ left: `${Math.min(monster.position, 85)}%` }}
            animate={showResult && isCorrect ? { scale: [1, 1.5, 0], opacity: [1, 1, 0] } : {}}
          >
            {MONSTER_EMOJI[monster.type]}
          </motion.div>

          {/* Progress indicator */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
            <div
              className="h-full bg-red-500 transition-all duration-100"
              style={{ width: `${monster.position}%` }}
            />
          </div>
        </div>

        {/* Answer Options */}
        <div className="grid grid-cols-2 gap-3">
          {monster.question.options.map((option, index) => (
            <motion.div key={index} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant={
                  showResult
                    ? option === monster.question.answer
                      ? "default"
                      : selectedAnswer === option
                      ? "destructive"
                      : "outline"
                    : "outline"
                }
                className={`w-full h-14 text-lg ${
                  showResult && option === monster.question.answer
                    ? "bg-green-500 hover:bg-green-600 text-white"
                    : ""
                }`}
                onClick={() => handleAnswer(option)}
                disabled={showResult}
              >
                {option}
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Result Feedback */}
        <AnimatePresence>
          {showResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mt-4 p-4 rounded-lg ${
                isCorrect ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"
              }`}
            >
              <div className="flex items-center gap-2 mb-2 font-bold">
                {isCorrect ? (
                  <>
                    <Sparkles className="w-5 h-5 text-green-500" />
                    <span className="text-green-500">Đúng! / 정답!</span>
                  </>
                ) : (
                  <>
                    <Skull className="w-5 h-5 text-red-500" />
                    <span className="text-red-500">Sai rồi! / 틀렸습니다!</span>
                  </>
                )}
              </div>
              <div className="text-sm space-y-1">
                <p>
                  <strong>Đáp án / 정답:</strong> {monster.question.answer}
                </p>
                <p className="text-muted-foreground">
                  💡 {monster.question.explanationVi}
                </p>
                <p className="text-muted-foreground text-xs">
                  {monster.question.explanationKo}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}
