import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  PenTool, 
  Headphones, 
  BookOpen, 
  FileText,
  Languages,
  Notebook,
  Gamepad2,
  Crown,
  Heart,
  MessageSquare,
  Music,
  Clapperboard,
  Briefcase,
  Sparkles,
  ChevronRight,
  Star,
  Trophy,
  Target,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";

// TOPIK 학습 메뉴
const topikMenus = [
  {
    id: "vocabulary",
    title: "어휘 학습",
    titleVi: "Từ vựng",
    description: "플래시카드, 메모리 게임, 60초 스프린트로 재미있게 단어 암기!",
    descVi: "Flashcard, trò chơi trí nhớ, và Sprint 60 giây để ghi nhớ từ vựng thú vị!",
    icon: Languages,
    color: "from-violet-500 to-purple-600",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/30",
    features: ["스와이프 플래시카드", "카드 매칭 게임", "60초 스프린트"],
    path: "/vocabulary",
    isNew: true
  },
  {
    id: "grammar",
    title: "문법 학습",
    titleVi: "Ngữ pháp",
    description: "문장 조립, 오류 수정, 문법 배틀로 한국어 문법 완벽 마스터!",
    descVi: "Ghép câu, sửa lỗi, và Grammar Battle để làm chủ ngữ pháp tiếng Hàn!",
    icon: Notebook,
    color: "from-pink-500 to-rose-600",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/30",
    features: ["문장 조립 퍼즐", "틀린 문장 고치기", "문법 배틀"],
    path: "/grammar",
    isNew: true
  },
  {
    id: "handwriting",
    title: "손글씨 연습",
    titleVi: "Luyện viết tay",
    description: "한글 자모와 단어를 직접 따라 쓰며 필기 연습!",
    descVi: "Tập viết chữ cái và từ vựng tiếng Hàn bằng tay!",
    icon: PenTool,
    color: "from-purple-500 to-indigo-600",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    features: ["자모 따라쓰기", "단어 연습", "AI 첨삭"],
    path: "/handwriting"
  },
  {
    id: "listening",
    title: "듣기 연습",
    titleVi: "Luyện nghe",
    description: "실전 TOPIK 듣기 문제로 청해력 향상!",
    descVi: "Nâng cao khả năng nghe với bài thi TOPIK thực tế!",
    icon: Headphones,
    color: "from-blue-500 to-cyan-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    features: ["대화 듣기", "강의 듣기", "TTS 음성"],
    path: "/listening"
  },
  {
    id: "reading-a",
    title: "읽기A",
    titleVi: "Đọc hiểu A",
    description: "짧은 대화와 안내문으로 기초 독해력 향상!",
    descVi: "Nâng cao khả năng đọc cơ bản với hội thoại ngắn và thông báo!",
    icon: BookOpen,
    color: "from-emerald-500 to-teal-600",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    features: ["대화 읽기", "안내문 읽기", "이메일 읽기"],
    path: "/reading-a"
  },
  {
    id: "reading-b",
    title: "읽기B",
    titleVi: "Đọc hiểu B",
    description: "신문기사, 논설문 등 고급 지문으로 심화 독해!",
    descVi: "Đọc nâng cao với bài báo, bài luận và văn bản học thuật!",
    icon: FileText,
    color: "from-orange-500 to-amber-600",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    features: ["신문기사", "논설문", "학술 자료"],
    path: "/reading-b"
  }
];

// 게임 학습 메뉴
const gameMenus = [
  {
    id: "manager",
    title: "LUKATO Manager",
    titleVi: "Quản lý K-POP",
    description: "K-POP 아이돌 매니저가 되어 그룹을 성공시켜라!",
    descVi: "Trở thành quản lý idol K-POP và đưa nhóm đến thành công!",
    icon: Crown,
    color: "from-amber-400 to-orange-500",
    emoji: "👑",
    features: ["스토리 모드", "STT 대화", "육성 시뮬레이션"],
    path: "/manager",
    isHot: true
  },
  {
    id: "chat",
    title: "AI 생존 게임",
    titleVi: "AI Sinh tồn Seoul",
    description: "서울에서 생존하라! AI와 대화하며 한국어 실력 UP!",
    descVi: "Sinh tồn tại Seoul! Nâng cao tiếng Hàn qua trò chuyện với AI!",
    icon: Gamepad2,
    color: "from-red-500 to-pink-600",
    emoji: "🎮",
    features: ["서바이벌 모드", "AI 대화", "상황별 회화"],
    path: "/chat"
  },
  {
    id: "dating",
    title: "한국 데이트",
    titleVi: "Hẹn hò Hàn Quốc",
    description: "가상의 한국인과 데이트하며 연애 표현 배우기!",
    descVi: "Hẹn hò với người Hàn ảo và học các biểu đạt tình cảm!",
    icon: Heart,
    color: "from-pink-500 to-rose-600",
    emoji: "💕",
    features: ["캐릭터 선택", "호감도 시스템", "엔딩 분기"],
    path: "/dating"
  },
  {
    id: "wordchain",
    title: "끝말잇기",
    titleVi: "Nối từ tiếng Hàn",
    description: "AI와 끝말잇기 대결! 어휘력 테스트!",
    descVi: "Đấu nối từ với AI! Kiểm tra vốn từ vựng của bạn!",
    icon: MessageSquare,
    color: "from-green-500 to-emerald-600",
    emoji: "🔗",
    features: ["AI 대결", "제한시간", "난이도 선택"],
    path: "/wordchain"
  },
  {
    id: "kpop",
    title: "K-POP 퀴즈",
    titleVi: "K-POP Quiz",
    description: "K-POP 가사 퀴즈로 재미있게 한국어 학습!",
    descVi: "Học tiếng Hàn thú vị qua quiz ca từ K-POP!",
    icon: Music,
    color: "from-violet-500 to-purple-600",
    emoji: "🎵",
    features: ["가사 맞추기", "아티스트 퀴즈", "빈칸 채우기"],
    path: "/kpop"
  },
  {
    id: "kdrama",
    title: "K-Drama 더빙",
    titleVi: "K-Drama Lồng tiếng",
    description: "유명 드라마 장면을 직접 더빙하며 발음 연습!",
    descVi: "Luyện phát âm bằng cách lồng tiếng cảnh phim nổi tiếng!",
    icon: Clapperboard,
    color: "from-cyan-500 to-blue-600",
    emoji: "🎬",
    features: ["명장면 더빙", "발음 평가", "감정 연기"],
    path: "/kdrama"
  },
  {
    id: "parttime",
    title: "한국 아르바이트",
    titleVi: "Làm thêm tại Hàn",
    description: "다양한 아르바이트 상황에서 실전 회화 연습!",
    descVi: "Luyện hội thoại thực tế trong các tình huống làm thêm!",
    icon: Briefcase,
    color: "from-slate-500 to-gray-600",
    emoji: "💼",
    features: ["편의점", "카페", "음식점"],
    path: "/parttime"
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function LearningHub() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CleanHeader />
      
      <main className="flex-1 pt-6 pb-12 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto w-full">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="mb-4 -ml-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại
            </Button>
            
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-korean-purple via-korean-pink to-korean-orange flex items-center justify-center shadow-lg">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">TOPIK 학습 허브</h1>
                <p className="text-muted-foreground">Trung tâm học tập TOPIK toàn diện</p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-3 mt-4">
              <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
                <Target className="w-4 h-4 text-korean-purple" />
                <span>6 bài học TOPIK</span>
              </Badge>
              <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
                <Gamepad2 className="w-4 h-4 text-korean-orange" />
                <span>7 trò chơi học tập</span>
              </Badge>
              <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
                <Zap className="w-4 h-4 text-korean-green" />
                <span>Học với AI</span>
              </Badge>
            </div>
          </motion.div>

          {/* TOPIK 학습 섹션 */}
          <motion.section
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mb-12"
          >
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-korean-purple to-korean-pink flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl font-bold text-foreground">📚 Học TOPIK</h2>
              <span className="text-sm text-muted-foreground ml-2">Học có hệ thống</span>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topikMenus.map((menu) => (
                <motion.div key={menu.id} variants={itemVariants}>
                  <Card
                    onClick={() => navigate(menu.path)}
                    className={`relative overflow-hidden cursor-pointer group p-5 border ${menu.borderColor} hover:shadow-lg hover:scale-[1.02] transition-all duration-300`}
                  >
                    {/* Gradient overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${menu.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                    
                    {/* New badge */}
                    {menu.isNew && (
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[10px] px-2">
                          NEW
                        </Badge>
                      </div>
                    )}

                    <div className="relative z-10">
                      {/* Icon & Title */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-12 h-12 rounded-xl ${menu.bgColor} flex items-center justify-center`}>
                          <menu.icon className={`w-6 h-6 bg-gradient-to-br ${menu.color} bg-clip-text text-transparent`} style={{ stroke: 'url(#grad)' }} />
                          <menu.icon className={`w-6 h-6`} style={{ color: menu.color.includes('violet') ? '#8b5cf6' : menu.color.includes('pink') ? '#ec4899' : menu.color.includes('purple') ? '#a855f7' : menu.color.includes('blue') ? '#3b82f6' : menu.color.includes('emerald') ? '#10b981' : '#f97316' }} />
                        </div>
                        <div>
                          <h3 className="font-bold text-foreground">{menu.title}</h3>
                          <p className="text-xs text-muted-foreground">{menu.titleVi}</p>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{menu.description}</p>

                      {/* Features */}
                      <div className="flex flex-wrap gap-1.5">
                        {menu.features.map((feature, idx) => (
                          <span 
                            key={idx}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>

                      {/* Arrow */}
                      <div className="absolute bottom-5 right-5">
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* 게임 학습 섹션 */}
          <motion.section
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-korean-orange to-korean-pink flex items-center justify-center">
                <Gamepad2 className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl font-bold text-foreground">🎮 Học qua Game</h2>
              <span className="text-sm text-muted-foreground ml-2">Học vui vẻ và hiệu quả</span>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {gameMenus.map((menu) => (
                <motion.div key={menu.id} variants={itemVariants}>
                  <Card
                    onClick={() => navigate(menu.path)}
                    className="relative overflow-hidden cursor-pointer group p-4 border border-border hover:border-primary/30 hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
                  >
                    {/* Hot badge */}
                    {menu.isHot && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-[10px] px-2">
                          🔥 HOT
                        </Badge>
                      </div>
                    )}

                    <div className="relative z-10">
                      {/* Emoji & Title */}
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-3xl group-hover:scale-110 transition-transform">{menu.emoji}</span>
                        <div>
                          <h3 className="font-bold text-foreground text-sm">{menu.title}</h3>
                          <p className="text-[10px] text-muted-foreground">{menu.titleVi}</p>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{menu.descVi}</p>

                      {/* Features */}
                      <div className="flex flex-wrap gap-1">
                        {menu.features.slice(0, 2).map((feature, idx) => (
                          <span 
                            key={idx}
                            className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-12 text-center"
          >
            <Card className="p-6 bg-gradient-to-br from-korean-purple/10 via-korean-pink/10 to-korean-orange/10 border-korean-purple/20">
              <Trophy className="w-12 h-12 mx-auto mb-4 text-korean-orange" />
              <h3 className="text-xl font-bold text-foreground mb-2">
                Chinh phục TOPIK ngay hôm nay!
              </h3>
              <p className="text-muted-foreground mb-4">
                Hãy thử thách bản thân để đạt chứng chỉ TOPIK!
              </p>
              <Button 
                onClick={() => navigate("/dashboard")}
                className="bg-gradient-to-r from-korean-purple to-korean-pink hover:opacity-90"
              >
                <Star className="w-4 h-4 mr-2" />
                Quay lại Dashboard
              </Button>
            </Card>
          </motion.div>
        </div>
      </main>
      
      <AppFooter />
    </div>
  );
}
