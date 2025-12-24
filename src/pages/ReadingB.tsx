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
  FileText,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Trophy,
  Sparkles,
  ChevronRight,
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
  arrangement: {
    label: "문장배열",
    emoji: "🔢",
    questions: [
      {
        id: 1,
        passage: "(가) 그래서 우산을 가져갔습니다.\n(나) 아침에 일어났습니다.\n(다) 밖에 비가 오고 있었습니다.\n(라) 회사에 갈 준비를 했습니다.",
        question: "순서대로 배열하세요.",
        options: ["(나)-(라)-(다)-(가)", "(나)-(다)-(가)-(라)", "(다)-(나)-(라)-(가)", "(라)-(나)-(다)-(가)"],
        answer: 0,
        explanation: "아침에 일어나서(나) → 준비하다가(라) → 비가 오는 것을 보고(다) → 우산을 가져감(가)",
      },
      {
        id: 2,
        passage: "(가) 맛있게 먹었습니다.\n(나) 식당에 도착했습니다.\n(다) 친구와 약속을 했습니다.\n(라) 비빔밥을 주문했습니다.",
        question: "순서대로 배열하세요.",
        options: ["(다)-(나)-(라)-(가)", "(나)-(다)-(가)-(라)", "(다)-(가)-(나)-(라)", "(라)-(다)-(나)-(가)"],
        answer: 0,
        explanation: "약속(다) → 도착(나) → 주문(라) → 먹음(가)",
      },
      {
        id: 3,
        passage: "(가) 그래서 커피를 마셨습니다.\n(나) 오늘 아침 일찍 일어났습니다.\n(다) 피곤해서 졸렸습니다.\n(라) 학교에 가서 수업을 들었습니다.",
        question: "순서대로 배열하세요.",
        options: ["(나)-(라)-(다)-(가)", "(나)-(다)-(가)-(라)", "(다)-(나)-(라)-(가)", "(라)-(나)-(다)-(가)"],
        answer: 0,
        explanation: "일찍 일어남(나) → 수업(라) → 졸림(다) → 커피(가)",
      },
      {
        id: 4,
        passage: "(가) 그래서 병원에 갔습니다.\n(나) 약을 먹고 쉬었습니다.\n(다) 어제부터 머리가 아팠습니다.\n(라) 의사에게 진찰을 받았습니다.",
        question: "순서대로 배열하세요.",
        options: ["(다)-(가)-(라)-(나)", "(가)-(다)-(나)-(라)", "(나)-(다)-(가)-(라)", "(라)-(가)-(다)-(나)"],
        answer: 0,
        explanation: "머리 아픔(다) → 병원(가) → 진찰(라) → 약 먹음(나)",
      },
      {
        id: 5,
        passage: "(가) 선물을 사러 백화점에 갔습니다.\n(나) 다음 주가 어머니 생신입니다.\n(다) 예쁜 가방을 골랐습니다.\n(라) 포장을 해서 집에 가져왔습니다.",
        question: "순서대로 배열하세요.",
        options: ["(나)-(가)-(다)-(라)", "(가)-(나)-(다)-(라)", "(다)-(나)-(가)-(라)", "(라)-(가)-(나)-(다)"],
        answer: 0,
        explanation: "생신(나) → 백화점(가) → 가방 선택(다) → 포장(라)",
      },
    ],
  },
  inference: {
    label: "빈칸추론",
    emoji: "🧠",
    questions: [
      {
        id: 1,
        passage: "한국에서는 설날에 떡국을 먹습니다. 떡국을 먹으면 한 살을 더 먹는다고 합니다. 그래서 아이들은 설날이 되면 ( ).",
        question: "빈칸에 들어갈 알맞은 것을 고르세요.",
        options: ["떡국을 먹고 싶어합니다", "떡국을 싫어합니다", "학교에 갑니다", "친구를 만납니다"],
        answer: 0,
        explanation: "아이들은 나이를 먹고 싶어하므로 떡국을 먹고 싶어합니다.",
      },
      {
        id: 2,
        passage: "요즘 사람들은 건강을 위해 운동을 많이 합니다. 특히 아침에 공원에서 달리기를 하는 사람이 많습니다. 왜냐하면 ( ).",
        question: "빈칸에 들어갈 알맞은 것을 고르세요.",
        options: ["아침 공기가 상쾌하기 때문입니다", "공원이 멀기 때문입니다", "운동을 싫어하기 때문입니다", "밤에 일하기 때문입니다"],
        answer: 0,
        explanation: "아침 운동을 하는 이유는 상쾌한 공기 때문입니다.",
      },
      {
        id: 3,
        passage: "최근 온라인 쇼핑이 인기입니다. 집에서 편하게 물건을 주문할 수 있습니다. 하지만 직접 보지 않고 사기 때문에 ( ).",
        question: "빈칸에 들어갈 알맞은 것을 고르세요.",
        options: ["실패할 수도 있습니다", "항상 성공합니다", "가격이 비쌉니다", "배송이 빠릅니다"],
        answer: 0,
        explanation: "직접 보지 않고 사면 예상과 다를 수 있습니다.",
      },
      {
        id: 4,
        passage: "한국어를 배우는 외국인이 많아졌습니다. 한국 드라마와 K-POP이 인기이기 때문입니다. 이들은 한국 문화를 더 잘 이해하기 위해 ( ).",
        question: "빈칸에 들어갈 알맞은 것을 고르세요.",
        options: ["한국어 공부를 합니다", "영어를 배웁니다", "일본에 갑니다", "음악을 듣지 않습니다"],
        answer: 0,
        explanation: "한국 문화 이해를 위해 한국어를 공부합니다.",
      },
      {
        id: 5,
        passage: "환경 보호가 중요해지면서 많은 회사들이 변화하고 있습니다. 플라스틱 대신 종이를 사용하고 있습니다. 이런 노력은 ( ).",
        question: "빈칸에 들어갈 알맞은 것을 고르세요.",
        options: ["지구를 지키는 데 도움이 됩니다", "돈을 낭비합니다", "환경을 오염시킵니다", "플라스틱을 늘립니다"],
        answer: 0,
        explanation: "환경 보호 노력은 지구를 보호하는 데 도움이 됩니다.",
      },
    ],
  },
  paired: {
    label: "연계문제",
    emoji: "🔗",
    questions: [
      {
        id: 1,
        passage: "다음은 도서관 이용 안내입니다.\n\n📚 서울시립도서관\n• 운영시간: 평일 09:00-21:00, 주말 10:00-18:00\n• 휴관일: 매주 월요일, 공휴일\n• 대출: 1인 5권, 2주간\n• 반납 연체 시 연체일수만큼 대출 불가",
        question: "이 도서관에 대한 설명으로 맞는 것은?",
        options: ["월요일에는 이용할 수 없습니다", "주말에 더 오래 운영합니다", "책을 10권까지 빌릴 수 있습니다", "책을 1달간 빌릴 수 있습니다"],
        answer: 0,
        explanation: "휴관일이 매주 월요일이라고 명시되어 있습니다.",
      },
      {
        id: 2,
        passage: "다음은 수영장 이용 규칙입니다.\n\n🏊 한강수영장\n• 수영모 착용 필수\n• 음식물 반입 금지\n• 샤워 후 입수\n• 이용시간: 50분 수영 / 10분 휴식",
        question: "이 수영장을 이용하려면?",
        options: ["수영모를 써야 합니다", "음식을 먹을 수 있습니다", "샤워하지 않아도 됩니다", "1시간 동안 계속 수영합니다"],
        answer: 0,
        explanation: "수영모 착용이 필수라고 명시되어 있습니다.",
      },
      {
        id: 3,
        passage: "다음은 전시회 안내문입니다.\n\n🎨 한국 현대미술전\n• 장소: 국립현대미술관\n• 기간: 2024.1.15 - 3.15\n• 입장료: 성인 5,000원, 학생 3,000원\n• 매주 수요일 무료 입장",
        question: "이 전시회에 대한 설명으로 맞는 것은?",
        options: ["수요일에 무료로 볼 수 있습니다", "입장료가 모두 같습니다", "1년 동안 합니다", "토요일에 무료입니다"],
        answer: 0,
        explanation: "매주 수요일 무료 입장이라고 명시되어 있습니다.",
      },
      {
        id: 4,
        passage: "다음은 식당 메뉴판입니다.\n\n🍜 한식당 '맛나'\n• 비빔밥 8,000원\n• 된장찌개 7,000원\n• 불고기 15,000원\n• 공기밥 추가 1,000원\n※ 런치세트(11:00-14:00) 모든 메뉴 1,000원 할인",
        question: "이 식당에 대한 설명으로 맞는 것은?",
        options: ["점심시간에 할인을 받을 수 있습니다", "저녁에 할인됩니다", "비빔밥이 가장 비쌉니다", "밥을 무료로 추가합니다"],
        answer: 0,
        explanation: "런치세트(11:00-14:00)에 모든 메뉴 1,000원 할인입니다.",
      },
      {
        id: 5,
        passage: "다음은 영화관 상영 시간표입니다.\n\n🎬 CGV 강남\n'한국의 봄' (드라마, 120분)\n• 10:30 / 13:00 / 15:30 / 18:00 / 20:30\n※ 조조할인(첫 회) 2,000원 할인\n※ 화요일 전 회차 50% 할인",
        question: "이 영화관에 대한 설명으로 맞는 것은?",
        options: ["화요일에 반값으로 볼 수 있습니다", "영화가 2시간 30분입니다", "저녁에만 상영합니다", "모든 요일 조조할인입니다"],
        answer: 0,
        explanation: "화요일 전 회차 50% 할인이라고 명시되어 있습니다.",
      },
    ],
  },
  comprehensive: {
    label: "종합 독해",
    emoji: "📖",
    questions: [
      {
        id: 1,
        passage: "한국의 전통 음식 중 하나인 김치는 발효 식품입니다. 배추나 무에 고춧가루, 마늘, 젓갈 등을 넣어 만듭니다. 김치는 비타민과 유산균이 풍부해서 건강에 좋습니다. 한국 사람들은 거의 매끼 김치를 먹습니다. 최근에는 외국에서도 김치를 먹는 사람이 많아졌습니다.",
        question: "이 글을 읽고 알 수 있는 것은?",
        options: ["김치는 건강에 좋은 음식입니다", "한국 사람은 김치를 싫어합니다", "김치에 설탕이 많이 들어갑니다", "외국 사람은 김치를 먹지 않습니다"],
        answer: 0,
        explanation: "글에서 김치가 비타민과 유산균이 풍부해 건강에 좋다고 설명했습니다.",
      },
      {
        id: 2,
        passage: "서울은 한국의 수도이고 인구가 가장 많은 도시입니다. 서울에는 경복궁, 남산타워, 한강 등 관광지가 많습니다. 대중교통이 발달해서 지하철과 버스로 어디든 갈 수 있습니다. 서울은 전통과 현대가 함께 있는 도시입니다.",
        question: "서울에 대한 설명으로 맞는 것은?",
        options: ["대중교통이 편리합니다", "인구가 가장 적습니다", "관광지가 없습니다", "전통만 있는 도시입니다"],
        answer: 0,
        explanation: "글에서 대중교통이 발달해 어디든 갈 수 있다고 설명했습니다.",
      },
      {
        id: 3,
        passage: "한국에서는 설날과 추석이 가장 큰 명절입니다. 설날에는 떡국을 먹고 세배를 합니다. 추석에는 송편을 만들고 성묘를 합니다. 명절에는 가족들이 모여 함께 시간을 보냅니다. 요즘은 해외여행을 가는 사람도 많아졌습니다.",
        question: "한국의 명절에 대한 설명으로 맞는 것은?",
        options: ["가족이 함께 모입니다", "혼자 보내는 날입니다", "설날에 송편을 먹습니다", "추석에 세배를 합니다"],
        answer: 0,
        explanation: "명절에는 가족들이 모여 함께 시간을 보낸다고 설명했습니다.",
      },
      {
        id: 4,
        passage: "한국어를 배우는 외국인이 매년 증가하고 있습니다. K-POP과 한국 드라마가 세계적으로 인기를 얻으면서 한국 문화에 대한 관심도 높아졌습니다. 많은 사람들이 자막 없이 드라마를 보고 싶어서 한국어를 공부합니다. 한국어 시험인 TOPIK 응시자도 급증했습니다.",
        question: "이 글의 주요 내용은?",
        options: ["한국어 학습자가 증가하는 이유", "K-POP 가수 소개", "한국 드라마 추천", "TOPIK 시험 일정"],
        answer: 0,
        explanation: "글은 한국어 학습자 증가와 그 이유에 대해 설명하고 있습니다.",
      },
      {
        id: 5,
        passage: "최근 재택근무를 하는 회사가 늘어나고 있습니다. 코로나19 이후 많은 회사들이 재택근무 시스템을 도입했습니다. 재택근무를 하면 출퇴근 시간을 절약할 수 있습니다. 하지만 업무와 휴식의 구분이 어렵다는 단점도 있습니다. 앞으로 재택근무와 출근을 함께 하는 하이브리드 근무가 늘어날 것입니다.",
        question: "재택근무에 대한 설명으로 맞지 않는 것은?",
        options: ["단점이 전혀 없습니다", "출퇴근 시간을 줄일 수 있습니다", "코로나19 이후 많아졌습니다", "하이브리드 근무가 늘어날 것입니다"],
        answer: 0,
        explanation: "글에서 업무와 휴식의 구분이 어렵다는 단점도 있다고 설명했습니다.",
      },
    ],
  },
};

type TabKey = keyof typeof tabCategories;

const ReadingB = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("arrangement");
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
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-600 via-amber-600 to-yellow-600 p-8 mb-8">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjIiLz48L2c+PC9zdmc+')] opacity-30" />
              
              <div className="relative z-10 flex items-center gap-6">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-2xl border border-white/30"
                >
                  <FileText className="w-10 h-10 text-white" />
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
                    읽기B
                  </motion.h1>
                  <motion.p 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-white/80"
                  >
                    배열 · 추론 · 연계 · 종합
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
                  className="w-28 h-28 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center mx-auto mb-6 shadow-xl"
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
                      className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 h-full rounded-full"
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
                    className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-90 text-white"
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
                      className="bg-gradient-to-r from-orange-500 to-yellow-500 h-2.5 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${((currentQuestionIndex + 1) / currentQuestions.length) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                <div className="rounded-3xl bg-gradient-to-b from-card to-card/50 border border-border/50 shadow-2xl overflow-hidden">
                  {/* Top accent */}
                  <div className="h-1.5 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500" />
                  
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
                          className="flex-1 h-14 text-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-90 text-white"
                        >
                          정답 확인
                        </Button>
                      ) : (
                        <Button
                          onClick={handleNext}
                          className="flex-1 h-14 text-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-90 text-white"
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

export default ReadingB;
