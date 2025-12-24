import { useState, useEffect } from "react";
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
  RotateCcw,
  CheckCircle2,
  XCircle,
  Trophy,
  Sparkles,
  ChevronRight,
  Loader2
} from "lucide-react";

interface Question {
  id: number;
  passage: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

// Tab categories with their questions
const tabCategories = {
  grammar: {
    label: "빈칸 문법",
    emoji: "📝",
    questions: [
      {
        id: 1,
        passage: "저는 매일 아침 7시에 일어나서 운동( ) 합니다.",
        question: "빈칸에 들어갈 알맞은 것을 고르세요.",
        options: ["을", "를", "이", "가"],
        answer: 0,
        explanation: "'운동'은 받침이 있으므로 '을'이 맞습니다.",
      },
      {
        id: 2,
        passage: "내일 친구( ) 같이 영화를 볼 거예요.",
        question: "빈칸에 들어갈 알맞은 것을 고르세요.",
        options: ["와", "과", "하고", "랑"],
        answer: 0,
        explanation: "'친구'는 모음으로 끝나므로 '와'가 맞습니다.",
      },
      {
        id: 3,
        passage: "이 음식은 맛( ) 좋고 가격도 싸요.",
        question: "빈칸에 들어갈 알맞은 것을 고르세요.",
        options: ["이", "가", "도", "만"],
        answer: 2,
        explanation: "'맛도 좋고'는 '~도'를 사용하여 추가를 나타냅니다.",
      },
      {
        id: 4,
        passage: "한국어를 배우( ) 한국 문화도 함께 배워요.",
        question: "빈칸에 들어갈 알맞은 것을 고르세요.",
        options: ["면서", "고", "지만", "거나"],
        answer: 0,
        explanation: "'~면서'는 두 동작이 동시에 일어남을 나타냅니다.",
      },
      {
        id: 5,
        passage: "시간이 없( ) 택시를 탔어요.",
        question: "빈칸에 들어갈 알맞은 것을 고르세요.",
        options: ["어서", "으니까", "지만", "고"],
        answer: 0,
        explanation: "'~어서'는 원인과 결과를 연결합니다.",
      },
    ],
  },
  vocabulary: {
    label: "유의어/의미",
    emoji: "📚",
    questions: [
      {
        id: 1,
        passage: "오늘 날씨가 매우 춥습니다.",
        question: "'매우'와 의미가 비슷한 것을 고르세요.",
        options: ["아주", "조금", "별로", "전혀"],
        answer: 0,
        explanation: "'매우'와 '아주'는 모두 '정도가 심함'을 나타냅니다.",
      },
      {
        id: 2,
        passage: "그 식당은 항상 손님이 많습니다.",
        question: "'항상'과 의미가 비슷한 것을 고르세요.",
        options: ["언제나", "가끔", "보통", "절대"],
        answer: 0,
        explanation: "'항상'과 '언제나'는 모두 '늘'이라는 의미입니다.",
      },
      {
        id: 3,
        passage: "이 문제는 정말 어렵습니다.",
        question: "'어렵다'와 반대 의미인 것을 고르세요.",
        options: ["쉽다", "크다", "작다", "길다"],
        answer: 0,
        explanation: "'어렵다'의 반대말은 '쉽다'입니다.",
      },
      {
        id: 4,
        passage: "그는 빠르게 걸었습니다.",
        question: "'빠르게'와 반대 의미인 것을 고르세요.",
        options: ["천천히", "조용히", "크게", "작게"],
        answer: 0,
        explanation: "'빠르게'의 반대말은 '천천히'입니다.",
      },
      {
        id: 5,
        passage: "오늘 기분이 좋습니다.",
        question: "'기분이 좋다'와 비슷한 표현을 고르세요.",
        options: ["행복하다", "슬프다", "화나다", "피곤하다"],
        answer: 0,
        explanation: "'기분이 좋다'는 '행복하다'와 비슷한 의미입니다.",
      },
    ],
  },
  topic: {
    label: "주제파악",
    emoji: "🎯",
    questions: [
      {
        id: 1,
        passage: "서울에는 많은 박물관이 있습니다. 국립중앙박물관에서는 한국의 역사를 배울 수 있습니다. 전쟁기념관에서는 한국 전쟁에 대해 알 수 있습니다.",
        question: "이 글의 주제는 무엇입니까?",
        options: ["서울의 박물관", "한국의 역사", "한국 전쟁", "서울 여행"],
        answer: 0,
        explanation: "글은 서울에 있는 다양한 박물관에 대해 설명하고 있습니다.",
      },
      {
        id: 2,
        passage: "한국에서는 밥을 먹을 때 숟가락과 젓가락을 사용합니다. 국을 먹을 때는 숟가락을 쓰고, 반찬을 먹을 때는 젓가락을 씁니다.",
        question: "이 글의 주제는 무엇입니까?",
        options: ["한국의 식사 예절", "한국 음식 종류", "숟가락 만들기", "반찬 만들기"],
        answer: 0,
        explanation: "글은 한국에서 밥을 먹을 때의 방법에 대해 설명하고 있습니다.",
      },
      {
        id: 3,
        passage: "요즘 많은 사람들이 환경을 위해 텀블러를 사용합니다. 일회용 컵 대신 텀블러를 사용하면 쓰레기를 줄일 수 있습니다.",
        question: "이 글의 주제는 무엇입니까?",
        options: ["환경 보호", "텀블러 구매", "컵 디자인", "쓰레기 분리"],
        answer: 0,
        explanation: "글은 환경을 위한 텀블러 사용에 대해 설명하고 있습니다.",
      },
      {
        id: 4,
        passage: "한국의 사계절은 봄, 여름, 가을, 겨울입니다. 봄에는 꽃이 피고, 여름에는 덥고, 가을에는 단풍이 들고, 겨울에는 눈이 옵니다.",
        question: "이 글의 주제는 무엇입니까?",
        options: ["한국의 계절", "봄 날씨", "겨울 여행", "단풍 구경"],
        answer: 0,
        explanation: "글은 한국의 사계절 특징에 대해 설명하고 있습니다.",
      },
      {
        id: 5,
        passage: "건강을 위해서는 규칙적인 운동이 중요합니다. 매일 30분씩 걷거나 수영을 하면 건강해집니다.",
        question: "이 글의 주제는 무엇입니까?",
        options: ["운동의 중요성", "수영 방법", "걷기 코스", "건강 검진"],
        answer: 0,
        explanation: "글은 건강을 위한 운동의 중요성에 대해 설명하고 있습니다.",
      },
    ],
  },
  content: {
    label: "내용일치",
    emoji: "✅",
    questions: [
      {
        id: 1,
        passage: "김민수 씨는 서울에서 태어났습니다. 지금은 부산에서 일하고 있습니다. 주말에는 서울에 있는 가족을 만나러 갑니다.",
        question: "이 글의 내용과 같은 것을 고르세요.",
        options: ["김민수 씨는 주말에 서울에 갑니다.", "김민수 씨는 부산에서 태어났습니다.", "김민수 씨의 가족은 부산에 있습니다.", "김민수 씨는 서울에서 일합니다."],
        answer: 0,
        explanation: "김민수 씨는 주말에 서울에 있는 가족을 만나러 갑니다.",
      },
      {
        id: 2,
        passage: "이 카페는 오전 10시에 열고 오후 10시에 닫습니다. 월요일은 휴무입니다. 커피와 케이크가 맛있습니다.",
        question: "이 글의 내용과 같은 것을 고르세요.",
        options: ["이 카페는 월요일에 쉽니다.", "이 카페는 아침 9시에 엽니다.", "이 카페는 밤 12시에 닫습니다.", "이 카페는 일요일에 쉽니다."],
        answer: 0,
        explanation: "월요일은 휴무라고 했으므로 월요일에 쉽니다.",
      },
      {
        id: 3,
        passage: "박지영 씨는 대학교에서 한국어를 가르칩니다. 학생들에게 한국 문화도 소개합니다. 수업은 오전에만 있습니다.",
        question: "이 글의 내용과 같은 것을 고르세요.",
        options: ["박지영 씨는 오전에 수업합니다.", "박지영 씨는 고등학교 선생님입니다.", "박지영 씨는 영어를 가르칩니다.", "박지영 씨는 오후에 수업합니다."],
        answer: 0,
        explanation: "수업은 오전에만 있다고 했습니다.",
      },
      {
        id: 4,
        passage: "이 영화관은 금요일과 토요일에 가장 바쁩니다. 평일 오전에는 손님이 적습니다. 팝콘은 무료로 제공됩니다.",
        question: "이 글의 내용과 같은 것을 고르세요.",
        options: ["팝콘을 무료로 받을 수 있습니다.", "일요일이 가장 바쁩니다.", "평일 오후에 손님이 적습니다.", "팝콘을 사야 합니다."],
        answer: 0,
        explanation: "팝콘은 무료로 제공된다고 했습니다.",
      },
      {
        id: 5,
        passage: "서울 지하철은 아침 5시 30분에 운행을 시작합니다. 밤 12시까지 운행합니다. 요금은 거리에 따라 다릅니다.",
        question: "이 글의 내용과 같은 것을 고르세요.",
        options: ["지하철 요금은 거리마다 다릅니다.", "지하철은 아침 6시에 시작합니다.", "지하철 요금은 모두 같습니다.", "지하철은 24시간 운행합니다."],
        answer: 0,
        explanation: "요금은 거리에 따라 다르다고 했습니다.",
      },
    ],
  },
  headline: {
    label: "신문기사제목",
    emoji: "📰",
    questions: [
      {
        id: 1,
        passage: "한국 영화 '기생충'이 미국 아카데미 시상식에서 작품상을 받았습니다. 한국 영화 역사상 처음입니다.",
        question: "이 기사의 제목으로 알맞은 것을 고르세요.",
        options: ["한국 영화, 아카데미 작품상 첫 수상", "한국 영화 제작 증가", "아카데미 시상식 일정 발표", "영화 제작비 상승"],
        answer: 0,
        explanation: "기사는 한국 영화의 아카데미 수상에 대한 내용입니다.",
      },
      {
        id: 2,
        passage: "최근 서울의 아파트 가격이 많이 올랐습니다. 특히 강남 지역의 가격 상승이 눈에 띕니다.",
        question: "이 기사의 제목으로 알맞은 것을 고르세요.",
        options: ["서울 아파트 가격 상승", "강남 신도시 개발", "아파트 건설 시작", "서울 인구 감소"],
        answer: 0,
        explanation: "기사는 서울 아파트 가격 상승에 대한 내용입니다.",
      },
      {
        id: 3,
        passage: "올해 한국을 방문한 외국인 관광객이 1,500만 명을 넘었습니다. 작년보다 20% 증가했습니다.",
        question: "이 기사의 제목으로 알맞은 것을 고르세요.",
        options: ["외국인 관광객 1,500만 명 돌파", "한국 관광지 소개", "외국인 비자 발급 중단", "관광객 감소 우려"],
        answer: 0,
        explanation: "기사는 외국인 관광객 증가에 대한 내용입니다.",
      },
      {
        id: 4,
        passage: "정부가 내년부터 환경 보호를 위해 일회용품 사용을 제한하기로 했습니다. 벌금도 부과됩니다.",
        question: "이 기사의 제목으로 알맞은 것을 고르세요.",
        options: ["내년부터 일회용품 사용 제한", "환경부 장관 임명", "플라스틱 공장 증가", "일회용품 할인 행사"],
        answer: 0,
        explanation: "기사는 일회용품 사용 제한 정책에 대한 내용입니다.",
      },
      {
        id: 5,
        passage: "한국 경제가 올해 3% 성장할 것으로 예상됩니다. 수출 증가가 주요 원인입니다.",
        question: "이 기사의 제목으로 알맞은 것을 고르세요.",
        options: ["올해 경제성장률 3% 전망", "수출 기업 감소", "경제 위기 경고", "정부 예산 삭감"],
        answer: 0,
        explanation: "기사는 경제 성장 전망에 대한 내용입니다.",
      },
    ],
  },
};

type TabKey = keyof typeof tabCategories;

const ReadingA = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("grammar");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [isQuizComplete, setIsQuizComplete] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkAuth();
  }, []);

  const currentCategory = tabCategories[activeTab];
  const currentQuestions = currentCategory.questions;
  const currentQuestion = currentQuestions[currentQuestionIndex];

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setIsQuizComplete(false);
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (showResult) return;
    setSelectedAnswer(answerIndex);
  };

  const handleSubmit = () => {
    if (selectedAnswer === null) {
      toast({
        title: "답을 선택해주세요",
        variant: "destructive",
      });
      return;
    }

    setShowResult(true);
    if (selectedAnswer === currentQuestion.answer) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < currentQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setIsQuizComplete(true);
    }
  };

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setIsQuizComplete(false);
  };

  const optionLabels = ["①", "②", "③", "④"];

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
              대시보드
            </Button>

            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 p-8 mb-8">
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
                    TOPIK 읽기
                  </motion.div>
                  <motion.h1 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-3xl sm:text-4xl font-bold text-white mb-1"
                  >
                    읽기A
                  </motion.h1>
                  <motion.p 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-white/80"
                  >
                    문법 · 어휘 · 주제 · 내용 · 제목
                  </motion.p>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
              {(Object.keys(tabCategories) as TabKey[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all font-medium ${
                    activeTab === tab
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground"
                  }`}
                >
                  <span>{tabCategories[tab].emoji}</span>
                  <span>{tabCategories[tab].label}</span>
                </button>
              ))}
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            {isQuizComplete ? (
              /* Quiz Complete Screen */
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="rounded-3xl bg-gradient-to-b from-card to-card/50 border border-border/50 shadow-2xl p-8 sm:p-12 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto mb-6 shadow-xl"
                >
                  <Trophy className="w-14 h-14 text-white" />
                </motion.div>

                <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                  {currentCategory.label} 완료!
                </h2>
                <p className="text-muted-foreground mb-8 text-lg">
                  총 {currentQuestions.length}문제 중 <span className="text-primary font-bold">{score}문제</span> 정답
                </p>

                <div className="w-full max-w-sm mx-auto mb-8">
                  <div className="flex justify-between text-sm text-muted-foreground mb-3">
                    <span>정답률</span>
                    <span className="font-bold text-foreground text-lg">
                      {Math.round((score / currentQuestions.length) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                    <motion.div
                      className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(score / currentQuestions.length) * 100}%` }}
                      transition={{ duration: 1, delay: 0.3 }}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={handleRestart}
                    variant="outline"
                    size="lg"
                    className="gap-2"
                  >
                    <RotateCcw className="w-5 h-5" />
                    다시 풀기
                  </Button>
                  <Button
                    onClick={() => navigate("/dashboard")}
                    size="lg"
                    className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 text-white"
                  >
                    대시보드로
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            ) : (
              /* Quiz Question Screen */
              <motion.div
                key={`quiz-${activeTab}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {/* Progress */}
                <div className="mb-6 p-4 rounded-2xl bg-card border border-border">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-foreground">
                      {currentCategory.emoji} {currentCategory.label} - 문제 {currentQuestionIndex + 1} / {currentQuestions.length}
                    </span>
                    <span className="text-sm font-bold text-primary">
                      점수: {score}점
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <motion.div
                      className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-2.5 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${((currentQuestionIndex + 1) / currentQuestions.length) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                <div className="rounded-3xl bg-gradient-to-b from-card to-card/50 border border-border/50 shadow-2xl overflow-hidden">
                  {/* Top accent */}
                  <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
                  
                  <div className="p-6 sm:p-8">
                    {/* Passage */}
                    <div className="mb-6 p-5 rounded-2xl bg-muted/50 border border-border">
                      <p className="text-lg leading-relaxed text-foreground whitespace-pre-wrap">
                        {currentQuestion.passage}
                      </p>
                    </div>

                    {/* Question */}
                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-foreground">
                        {currentQuestion.question}
                      </h3>
                    </div>

                    {/* Options */}
                    <div className="space-y-3 mb-8">
                      {currentQuestion.options.map((option, index) => (
                        <motion.button
                          key={index}
                          onClick={() => handleAnswerSelect(index)}
                          whileHover={{ scale: showResult ? 1 : 1.01 }}
                          whileTap={{ scale: showResult ? 1 : 0.99 }}
                          className={`w-full p-4 rounded-2xl border-2 transition-all duration-300 text-left ${
                            showResult
                              ? index === currentQuestion.answer
                                ? "border-green-500 bg-green-500/10"
                                : selectedAnswer === index
                                ? "border-red-500 bg-red-500/10"
                                : "border-border bg-muted/30"
                              : selectedAnswer === index
                              ? "border-primary bg-primary/10"
                              : "border-border bg-muted/30 hover:border-primary/50"
                          }`}
                          disabled={showResult}
                        >
                          <div className="flex items-center gap-4">
                            <span className={`text-xl font-bold ${
                              showResult
                                ? index === currentQuestion.answer
                                  ? "text-green-500"
                                  : selectedAnswer === index
                                  ? "text-red-500"
                                  : "text-muted-foreground"
                                : selectedAnswer === index
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}>
                              {optionLabels[index]}
                            </span>
                            <span className="text-foreground font-medium flex-1">
                              {option}
                            </span>
                            {showResult && index === currentQuestion.answer && (
                              <CheckCircle2 className="w-6 h-6 text-green-500" />
                            )}
                            {showResult && selectedAnswer === index && index !== currentQuestion.answer && (
                              <XCircle className="w-6 h-6 text-red-500" />
                            )}
                          </div>
                        </motion.button>
                      ))}
                    </div>

                    {/* Explanation */}
                    <AnimatePresence>
                      {showResult && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mb-6 p-5 rounded-2xl bg-blue-500/10 border border-blue-500/30"
                        >
                          <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                            💡 해설
                          </p>
                          <p className="text-foreground">
                            {currentQuestion.explanation}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      {!showResult ? (
                        <Button
                          onClick={handleSubmit}
                          disabled={selectedAnswer === null}
                          className="flex-1 h-14 text-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 text-white"
                        >
                          정답 확인
                        </Button>
                      ) : (
                        <Button
                          onClick={handleNext}
                          className="flex-1 h-14 text-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 text-white"
                        >
                          {currentQuestionIndex < currentQuestions.length - 1 ? "다음 문제" : "결과 보기"}
                          <ChevronRight className="w-5 h-5 ml-2" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <AppFooter />
    </div>
  );
};

export default ReadingA;
