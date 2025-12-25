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

type GameState = "menu" | "stageSelect" | "tutorial" | "playing" | "gameover" | "victory";
type StageType = "particle" | "tense" | "mixed";

// 스테이지 정의
const STAGES: { id: StageType; nameVi: string; nameKo: string; icon: string; desc: string }[] = [
  { id: "particle", nameVi: "Trợ từ", nameKo: "조사", icon: "📝", desc: "을/를, 이/가, 에/에서" },
  { id: "tense", nameVi: "Thì", nameKo: "시제", icon: "⏰", desc: "과거, 현재, 미래" },
  { id: "mixed", nameVi: "Tổng hợp", nameKo: "혼합", icon: "🎯", desc: "Tất cả loại lỗi" },
];

// 스테이지별 설정 - 속도 느리게 조정
const STAGE_CONFIG = {
  "1-2": {
    name: { vi: "Sơ cấp", ko: "초급" },
    monsterSpeed: 8,
    timePerMonster: 8,
    totalQuestions: 5,
  },
  "3-4": {
    name: { vi: "Trung cấp", ko: "중급" },
    monsterSpeed: 10,
    timePerMonster: 6,
    totalQuestions: 5,
  },
  "5-6": {
    name: { vi: "Cao cấp", ko: "고급" },
    monsterSpeed: 12,
    timePerMonster: 5,
    totalQuestions: 5,
  },
};

// 튜토리얼 스텝
const TUTORIAL_STEPS = [
  {
    icon: "👾",
    titleVi: "Quái vật xuất hiện!",
    titleKo: "몬스터 등장!",
    descVi: "Câu có lỗi ngữ pháp sẽ di chuyển về phía tháp.",
    descKo: "문법 오류 문장이 기지로 다가옵니다.",
  },
  {
    icon: "🎯",
    titleVi: "Chọn đáp án đúng",
    titleKo: "정답 선택",
    descVi: "Nhấn đáp án đúng để tiêu diệt trước khi đến tháp!",
    descKo: "정답 터치로 몬스터 격파!",
  },
  {
    icon: "❤️",
    titleVi: "Bảo vệ HP",
    titleKo: "HP 보호",
    descVi: "HP 3개. Sai hoặc quái đến = mất 1 HP!",
    descKo: "HP 3개. 오답/도착 시 HP -1!",
  },
];

// Fallback 문제들 - 스테이지별
const STAGE_QUESTIONS: Record<StageType, TowerQuestion[]> = {
  particle: [
    {
      id: "p1",
      wrongSentence: "사과가 먹어요",
      wrongSentenceVi: "Quả táo ăn (sai trợ từ)",
      errorType: "조사 오류",
      options: ["사과를", "사과는", "사과에", "사과로"],
      answer: "사과를",
      explanationVi: "Táo là tân ngữ (được ăn), nên dùng trợ từ tân ngữ '-를'",
      explanationKo: "사과는 목적어이므로 목적격 조사 '-를'을 사용해야 합니다",
    },
    {
      id: "p2",
      wrongSentence: "저는 물이 마셔요",
      wrongSentenceVi: "Tôi nước uống (sai trợ từ)",
      errorType: "조사 오류",
      options: ["물을", "물에", "물은", "물도"],
      answer: "물을",
      explanationVi: "Nước là tân ngữ, cần dùng '-을' (vì có 받침)",
      explanationKo: "물은 목적어이고 받침이 있으므로 '-을'을 사용합니다",
    },
    {
      id: "p3",
      wrongSentence: "친구가 집을 왔어요",
      wrongSentenceVi: "Bạn đã đến nhà (sai trợ từ)",
      errorType: "조사 오류",
      options: ["집에", "집을", "집이", "집는"],
      answer: "집에",
      explanationVi: "Địa điểm đến dùng '-에', không phải '-을'",
      explanationKo: "이동의 목적지에는 '-에'를 사용합니다",
    },
    {
      id: "p4",
      wrongSentence: "저는 한국어가 공부해요",
      wrongSentenceVi: "Tôi tiếng Hàn học (sai trợ từ)",
      errorType: "조사 오류",
      options: ["한국어를", "한국어는", "한국어에", "한국어도"],
      answer: "한국어를",
      explanationVi: "Tiếng Hàn là tân ngữ của động từ học, dùng '-를'",
      explanationKo: "한국어는 '공부하다'의 목적어이므로 '-를'을 사용합니다",
    },
    {
      id: "p5",
      wrongSentence: "저는 커피는 좋아해요",
      wrongSentenceVi: "Tôi thì cà phê thì thích (trùng trợ từ)",
      errorType: "조사 오류",
      options: ["커피를", "커피가", "커피에", "커피도"],
      answer: "커피를",
      explanationVi: "Cà phê là tân ngữ, dùng '-를'. '는' đã dùng cho '저'",
      explanationKo: "'저는'에서 이미 '-는'을 사용했으므로 목적어는 '-를'",
    },
  ],
  tense: [
    {
      id: "t1",
      wrongSentence: "나는 어제 학교에 갑니다",
      wrongSentenceVi: "Tôi đi đến trường hôm qua (sai thì)",
      errorType: "시제 오류",
      options: ["갔습니다", "갈 겁니다", "가고 있습니다", "간다"],
      answer: "갔습니다",
      explanationVi: "Vì có '어제' (hôm qua) nên phải dùng thì quá khứ '-았/었습니다'",
      explanationKo: "'어제'가 있으므로 과거 시제 '-았/었습니다'를 사용해야 합니다",
    },
    {
      id: "t2",
      wrongSentence: "내일 비가 왔어요",
      wrongSentenceVi: "Ngày mai trời mưa đã (sai thì)",
      errorType: "시제 오류",
      options: ["올 거예요", "왔어요", "오세요", "오고 있어요"],
      answer: "올 거예요",
      explanationVi: "'Ngày mai' là tương lai, dùng '-ㄹ 거예요'",
      explanationKo: "'내일'은 미래이므로 '-ㄹ 거예요'를 사용합니다",
    },
    {
      id: "t3",
      wrongSentence: "지금 밥을 먹었어요",
      wrongSentenceVi: "Bây giờ đã ăn cơm (sai thì)",
      errorType: "시제 오류",
      options: ["먹어요", "먹었어요", "먹을 거예요", "먹겠어요"],
      answer: "먹어요",
      explanationVi: "'Bây giờ' là hiện tại, dùng '-어요'",
      explanationKo: "'지금'은 현재이므로 현재 시제 '-어요'를 사용합니다",
    },
    {
      id: "t4",
      wrongSentence: "작년에 한국에 갈 거예요",
      wrongSentenceVi: "Năm ngoái sẽ đi Hàn (sai thì)",
      errorType: "시제 오류",
      options: ["갔어요", "갈 거예요", "가요", "가겠어요"],
      answer: "갔어요",
      explanationVi: "'Năm ngoái' là quá khứ, dùng '-았/었어요'",
      explanationKo: "'작년'은 과거이므로 '-았/었어요'를 사용합니다",
    },
    {
      id: "t5",
      wrongSentence: "다음 주에 친구를 만났어요",
      wrongSentenceVi: "Tuần sau đã gặp bạn (sai thì)",
      errorType: "시제 오류",
      options: ["만날 거예요", "만났어요", "만나요", "만나겠어요"],
      answer: "만날 거예요",
      explanationVi: "'Tuần sau' là tương lai, dùng '-ㄹ 거예요'",
      explanationKo: "'다음 주'는 미래이므로 '-ㄹ 거예요'를 사용합니다",
    },
  ],
  mixed: [
    {
      id: "m1",
      wrongSentence: "어제 친구가 집을 왔어요",
      wrongSentenceVi: "Hôm qua bạn đến nhà (sai trợ từ)",
      errorType: "조사 오류",
      options: ["집에", "집을", "집이", "집는"],
      answer: "집에",
      explanationVi: "Địa điểm đến dùng '-에'",
      explanationKo: "이동의 목적지에는 '-에'를 사용합니다",
    },
    {
      id: "m2",
      wrongSentence: "내일 영화가 봤어요",
      wrongSentenceVi: "Ngày mai đã xem phim (sai thì + trợ từ)",
      errorType: "시제 + 조사",
      options: ["영화를 볼 거예요", "영화가 봤어요", "영화를 봤어요", "영화에 볼 거예요"],
      answer: "영화를 볼 거예요",
      explanationVi: "Phim là tân ngữ (-를) + ngày mai là tương lai (-ㄹ 거예요)",
      explanationKo: "영화는 목적어(-를) + 내일은 미래(-ㄹ 거예요)입니다",
    },
    {
      id: "m3",
      wrongSentence: "지금 학교를 갑니다",
      wrongSentenceVi: "Bây giờ đến trường (sai trợ từ)",
      errorType: "조사 오류",
      options: ["학교에", "학교를", "학교가", "학교는"],
      answer: "학교에",
      explanationVi: "Điểm đến dùng '-에' không phải '-를'",
      explanationKo: "이동의 목적지는 '-에'를 사용합니다",
    },
    {
      id: "m4",
      wrongSentence: "작년에 한국에서 살 거예요",
      wrongSentenceVi: "Năm ngoái sẽ sống ở Hàn (sai thì)",
      errorType: "시제 오류",
      options: ["살았어요", "살 거예요", "살아요", "삽니다"],
      answer: "살았어요",
      explanationVi: "'Năm ngoái' là quá khứ",
      explanationKo: "'작년'은 과거이므로 '-았어요'를 사용합니다",
    },
    {
      id: "m5",
      wrongSentence: "매일 아침이 커피가 마셔요",
      wrongSentenceVi: "Mỗi sáng cà phê uống (sai trợ từ)",
      errorType: "조사 오류",
      options: ["아침에 커피를", "아침이 커피가", "아침을 커피에", "아침에 커피에"],
      answer: "아침에 커피를",
      explanationVi: "Thời gian dùng '-에', tân ngữ dùng '-를'",
      explanationKo: "시간은 '-에', 목적어는 '-를'을 사용합니다",
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
  const [currentStage, setCurrentStage] = useState<StageType>("particle");
  const [tutorialStep, setTutorialStep] = useState(0);
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
  const [stageStars, setStageStars] = useState<Record<StageType, number>>({ particle: 0, tense: 0, mixed: 0 });
  
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const config = STAGE_CONFIG[level];

  // 스테이지 클리어 기록 로드
  useEffect(() => {
    const saved = localStorage.getItem(`tower_stage_stars_${level}`);
    if (saved) {
      setStageStars(JSON.parse(saved));
    }
  }, [level]);

  // 스테이지 클리어 저장
  const saveStageStars = (stage: StageType, starCount: number) => {
    const updated = { ...stageStars, [stage]: Math.max(stageStars[stage], starCount) };
    setStageStars(updated);
    localStorage.setItem(`tower_stage_stars_${level}`, JSON.stringify(updated));
  };

  // 튜토리얼 완료 여부 확인
  const hasSeenTutorial = () => {
    return localStorage.getItem("tower_defense_tutorial_done") === "true";
  };

  const markTutorialDone = () => {
    localStorage.setItem("tower_defense_tutorial_done", "true");
  };

  // 스테이지 선택
  const handleStageSelect = (stage: StageType) => {
    setCurrentStage(stage);
    if (hasSeenTutorial()) {
      startGame(stage);
    } else {
      setTutorialStep(0);
      setGameState("tutorial");
    }
  };

  // 튜토리얼 다음
  const handleTutorialNext = () => {
    if (tutorialStep < TUTORIAL_STEPS.length - 1) {
      setTutorialStep((prev) => prev + 1);
    } else {
      markTutorialDone();
      startGame(currentStage);
    }
  };

  // 튜토리얼 스킵
  const handleTutorialSkip = () => {
    markTutorialDone();
    startGame(currentStage);
  };

  // 게임 시작
  const startGame = (stage: StageType) => {
    setCurrentStage(stage);
    setQuestions([...STAGE_QUESTIONS[stage]]);
    setGameState("playing");
    setHp(3);
    setGold(0);
    setCombo(0);
    setQuestionIndex(0);
    setNoDamage(true);
    setSelectedAnswer(null);
    setShowResult(false);
    setTimeout(() => spawnMonster(0), 100);
  };

  // 몬스터 생성
  const spawnMonster = (index: number) => {
    const qs = questions.length > 0 ? questions : STAGE_QUESTIONS[currentStage];
    if (index >= qs.length) {
      // 승리!
      const starCount = noDamage ? 3 : hp >= 2 ? 2 : 1;
      setStars(starCount);
      saveStageStars(currentStage, starCount);
      setGameState("victory");
      return;
    }

    const q = qs[index];
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

  // Menu - Stage Selection
  if (gameState === "menu") {
    return (
      <Card className="p-4">
        <div className="text-center mb-4">
          <Shield className="w-12 h-12 mx-auto mb-2 text-primary" />
          <h2 className="text-lg font-bold">Bảo vệ tháp / 타워 디펜스</h2>
          <p className="text-muted-foreground text-xs">
            {config.name.vi} ({config.name.ko}) - Chọn stage / 스테이지 선택
          </p>
        </div>

        {/* Stage Selection */}
        <div className="space-y-2">
          {STAGES.map((stage, idx) => {
            const isLocked = idx > 0 && stageStars[STAGES[idx - 1].id] === 0;
            const starCount = stageStars[stage.id];
            
            return (
              <motion.div key={stage.id} whileTap={{ scale: isLocked ? 1 : 0.98 }}>
                <Button
                  variant={isLocked ? "ghost" : "outline"}
                  className={`w-full h-auto py-3 justify-between ${isLocked ? "opacity-50" : ""}`}
                  onClick={() => !isLocked && handleStageSelect(stage.id)}
                  disabled={isLocked}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{stage.icon}</span>
                    <div className="text-left">
                      <div className="font-bold text-sm">
                        Stage {idx + 1}: {stage.nameVi}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {stage.nameKo} - {stage.desc}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3].map((i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i <= starCount ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                </Button>
              </motion.div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-3">
          🔓 Hoàn thành stage trước để mở khóa stage tiếp theo
        </p>
      </Card>
    );
  }

  // Tutorial
  if (gameState === "tutorial") {
    const step = TUTORIAL_STEPS[tutorialStep];
    return (
      <Card className="p-6 text-center">
        <motion.div
          key={tutorialStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-4"
        >
          <div className="text-5xl mb-2">{step.icon}</div>
          <div>
            <h3 className="text-lg font-bold">{step.titleVi}</h3>
            <p className="text-sm text-muted-foreground">{step.titleKo}</p>
          </div>
          <div className="text-sm">
            <p>{step.descVi}</p>
            <p className="text-muted-foreground text-xs mt-1">{step.descKo}</p>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 my-4">
            {TUTORIAL_STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i === tutorialStep ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleTutorialSkip} className="flex-1">
              Bỏ qua / 건너뛰기
            </Button>
            <Button onClick={handleTutorialNext} className="flex-1">
              {tutorialStep < TUTORIAL_STEPS.length - 1 ? "Tiếp / 다음" : "Bắt đầu! / 시작!"}
            </Button>
          </div>
        </motion.div>
      </Card>
    );
  }

  // Game Over
  if (gameState === "gameover") {
    const currentStageName = STAGES.find(s => s.id === currentStage);
    return (
      <Card className="p-6 text-center">
        <Skull className="w-14 h-14 mx-auto mb-3 text-red-500" />
        <h2 className="text-xl font-bold mb-1 text-red-500">Game Over!</h2>
        <p className="text-muted-foreground text-sm mb-4">
          Stage: {currentStageName?.icon} {currentStageName?.nameVi}
        </p>
        <div className="flex justify-center gap-3 mb-4">
          <Badge variant="outline" className="px-3 py-1">
            <Coins className="w-4 h-4 mr-1" />
            {gold}G
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            <Target className="w-4 h-4 mr-1" />
            {questionIndex}/{questions.length || 5}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setGameState("menu")} className="flex-1">
            Chọn stage
          </Button>
          <Button onClick={() => startGame(currentStage)} className="flex-1 gap-1">
            <RefreshCw className="w-4 h-4" />
            Thử lại
          </Button>
        </div>
      </Card>
    );
  }

  // Victory
  if (gameState === "victory") {
    const currentStageName = STAGES.find(s => s.id === currentStage);
    const currentStageIdx = STAGES.findIndex(s => s.id === currentStage);
    const nextStage = currentStageIdx < STAGES.length - 1 ? STAGES[currentStageIdx + 1] : null;

    return (
      <Card className="p-6 text-center">
        <Trophy className="w-14 h-14 mx-auto mb-2 text-yellow-500" />
        <h2 className="text-xl font-bold mb-1">Chiến thắng! / 승리!</h2>
        <p className="text-muted-foreground text-sm mb-2">
          Stage: {currentStageName?.icon} {currentStageName?.nameVi}
        </p>
        
        {/* Stars */}
        <div className="flex justify-center gap-1 mb-3">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: i * 0.15 }}
            >
              <Star
                className={`w-8 h-8 ${
                  i <= stars ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"
                }`}
              />
            </motion.div>
          ))}
        </div>

        <div className="flex justify-center gap-3 mb-3">
          <Badge variant="outline" className="px-3 py-1">
            <Coins className="w-4 h-4 mr-1" />
            {gold}G
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            <Heart className="w-4 h-4 mr-1 text-red-500" />
            {hp}/3 HP
          </Badge>
        </div>

        {noDamage && (
          <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white mb-3">
            <Sparkles className="w-4 h-4 mr-1" />
            Perfect!
          </Badge>
        )}

        <div className="flex flex-col gap-2">
          {nextStage && (
            <Button onClick={() => startGame(nextStage.id)} className="w-full gap-2">
              <Target className="w-4 h-4" />
              {nextStage.icon} Stage tiếp: {nextStage.nameVi}
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setGameState("menu")} className="flex-1">
              Chọn stage
            </Button>
            <Button variant="ghost" onClick={() => startGame(currentStage)} className="flex-1 gap-1">
              <RefreshCw className="w-4 h-4" />
              Chơi lại
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Playing State
  const monster = currentMonster;
  if (!monster) return null;

  return (
    <div className="space-y-3">
      {/* Header Stats - Compact */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {[...Array(3)].map((_, i) => (
            <Heart
              key={i}
              className={`w-5 h-5 ${
                i < hp ? "text-red-500 fill-red-500" : "text-muted-foreground"
              }`}
            />
          ))}
          <span className="text-xs text-muted-foreground ml-1">HP</span>
        </div>
        <div className="flex items-center gap-2">
          {combo > 0 && (
            <Badge className="bg-orange-500 text-xs px-2 py-0.5">
              <Flame className="w-3 h-3 mr-1" />
              {combo}x
            </Badge>
          )}
          <Badge variant="outline" className="text-xs px-2 py-0.5">
            <Coins className="w-3 h-3 mr-1" />
            {gold}G
          </Badge>
          <Badge variant="secondary" className="text-xs px-2 py-0.5">
            {questionIndex + 1}/{questions.length}
          </Badge>
        </div>
      </div>

      {/* Monster Track - Compact */}
      <div className="relative h-12 bg-muted/30 rounded-lg overflow-hidden">
        {/* Base/Castle */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-2xl">
          🏰
        </div>

        {/* Monster */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 text-3xl"
          style={{ left: `${Math.min(monster.position, 80)}%` }}
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

      {/* Question Card - Compact */}
      <Card className="p-3">
        <div className="text-center mb-3">
          <Badge variant="secondary" className="text-xs mb-1">
            {monster.question.errorType}
          </Badge>
          <div className="text-base font-bold text-destructive leading-tight">
            "{monster.question.wrongSentence}"
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {monster.question.wrongSentenceVi}
          </div>
        </div>

        {/* Answer Options - Always Visible */}
        <div className="grid grid-cols-2 gap-2">
          {monster.question.options.map((option, index) => (
            <motion.div key={index} whileTap={{ scale: 0.95 }}>
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
                className={`w-full h-12 text-base font-medium ${
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

        {/* Result Feedback - Compact */}
        <AnimatePresence>
          {showResult && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={`mt-3 p-3 rounded-lg text-sm ${
                isCorrect ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"
              }`}
            >
              <div className="flex items-center gap-2 mb-1 font-bold">
                {isCorrect ? (
                  <>
                    <Sparkles className="w-4 h-4 text-green-500" />
                    <span className="text-green-500">Đúng! / 정답!</span>
                  </>
                ) : (
                  <>
                    <Skull className="w-4 h-4 text-red-500" />
                    <span className="text-red-500">Sai! / 틀림!</span>
                  </>
                )}
              </div>
              <p className="text-xs">
                <strong>Đáp án:</strong> {monster.question.answer}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                💡 {monster.question.explanationVi}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}
