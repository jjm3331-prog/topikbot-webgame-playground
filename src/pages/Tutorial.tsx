import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BookOpen, 
  Heart, 
  Coins, 
  Target, 
  Star,
  Dice6,
  Trophy,
  Briefcase,
  Link2,
  MessageSquare,
  Film,
  Music,
  Zap,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Lightbulb,
  Keyboard,
  MousePointer,
  Crown,
  Play
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import MegaMenu from "@/components/MegaMenu";
import AppFooter from "@/components/AppFooter";

const Tutorial = () => {
  const navigate = useNavigate();
  const [expandedGame, setExpandedGame] = useState<string | null>(null);

  const gameGuides = [
    {
      id: "manager",
      icon: Crown,
      title: "LUKATO Manager",
      titleVi: "Quản lý nhóm nhạc",
      color: "from-korean-purple to-korean-pink",
      summary: {
        ko: "연습생을 트레이닝하고 데뷔시키는 매니저 시뮬레이션!",
        vi: "Mô phỏng quản lý - đào tạo thực tập sinh và giúp họ debut!"
      },
      howToStart: {
        ko: "메뉴 → 'LUKATO Manager' 클릭",
        vi: "Menu → Nhấn 'LUKATO Manager'"
      },
      tips: [
        { ko: "한국어로 대화하며 스탯을 올리세요", vi: "Nói chuyện bằng tiếng Hàn để tăng chỉ số" },
        { ko: "멤버들의 컨디션을 관리하세요", vi: "Quản lý tình trạng của các thành viên" },
      ],
    },
    {
      id: "survival",
      icon: Dice6,
      title: "서울에서 생존",
      titleVi: "Sinh tồn tại Seoul",
      color: "from-korean-pink to-korean-orange",
      summary: {
        ko: "AI와 한국어로 대화하며 서울에서 10턴 동안 생존하세요!",
        vi: "Trò chuyện bằng tiếng Hàn với AI và sống sót 10 lượt tại Seoul!"
      },
      howToStart: {
        ko: "메뉴 → 'AI Sinh tồn Seoul' 클릭 → 장소 입력 후 '시작'",
        vi: "Menu → Nhấn 'AI Sinh tồn Seoul' → Nhập địa điểm rồi nhấn 'Bắt đầu'"
      },
      tips: [
        { ko: "짧고 간단한 문장으로 시작하세요", vi: "Bắt đầu bằng những câu ngắn và đơn giản" },
        { ko: "존댓말(요/습니다)을 사용하면 점수가 높아요", vi: "Dùng kính ngữ (요/습니다) sẽ được điểm cao" },
      ],
    },
    {
      id: "dating",
      icon: Heart,
      title: "Love Signal",
      titleVi: "Tín hiệu tình yêu",
      color: "from-pink-500 to-rose-500",
      summary: {
        ko: "매력적인 한국인 캐릭터와 대화하며 호감도 100%를 달성하세요!",
        vi: "Trò chuyện với nhân vật Hàn Quốc hấp dẫn và đạt 100% độ thân mật!"
      },
      howToStart: {
        ko: "메뉴 → 'Hẹn hò Hàn Quốc' 클릭 → 캐릭터 선택",
        vi: "Menu → Nhấn 'Hẹn hò Hàn Quốc' → Chọn nhân vật"
      },
      tips: [
        { ko: "MZ 슬랭(ㅋㅋ, 갓생)을 사용하면 친근해 보여요", vi: "Dùng slang MZ (ㅋㅋ, 갓생) sẽ thân thiện hơn" },
        { ko: "상대방의 MBTI에 맞는 대화를 해보세요", vi: "Thử nói chuyện phù hợp với MBTI của đối phương" },
      ],
    },
    {
      id: "wordchain",
      icon: Link2,
      title: "끝말잇기",
      titleVi: "Nối từ (Word Chain)",
      color: "from-korean-cyan to-korean-blue",
      summary: {
        ko: "AI가 말한 단어의 마지막 글자로 시작하는 새 단어를 말하세요!",
        vi: "Nói từ mới bắt đầu bằng chữ cái cuối của từ AI nói!"
      },
      howToStart: {
        ko: "메뉴 → 'Nối từ tiếng Hàn' 클릭",
        vi: "Menu → Nhấn 'Nối từ tiếng Hàn'"
      },
      tips: [
        { ko: "두음법칙: '녀→여', '률→율' 등 변환 적용됨", vi: "Quy tắc đầu âm: '녀→여', '률→율' được áp dụng" },
        { ko: "15초 안에 답하세요!", vi: "Trả lời trong 15 giây!" },
      ],
    },
    {
      id: "kpop",
      icon: Music,
      title: "K-POP 가사 퀴즈",
      titleVi: "Quiz lời bài hát K-POP",
      color: "from-rose-500 to-red-500",
      summary: {
        ko: "K-POP 노래를 듣고 빈칸에 들어갈 가사를 맞추세요!",
        vi: "Nghe nhạc K-POP và điền lời bài hát còn thiếu!"
      },
      howToStart: {
        ko: "메뉴 → 'K-POP Quiz' 클릭",
        vi: "Menu → Nhấn 'K-POP Quiz'"
      },
      tips: [
        { ko: "자막을 잘 보면서 노래를 들으세요", vi: "Vừa nghe vừa xem phụ đề kỹ" },
        { ko: "빨리 맞추면 보너스 점수!", vi: "Trả lời nhanh được thêm điểm thưởng!" },
      ],
    },
    {
      id: "kdrama",
      icon: Film,
      title: "K-Drama 더빙",
      titleVi: "Lồng tiếng K-Drama",
      color: "from-korean-purple to-pink-500",
      summary: {
        ko: "유명 드라마 대사를 듣고 따라 읽으며 발음 연습!",
        vi: "Nghe lời thoại phim nổi tiếng và đọc theo để luyện phát âm!"
      },
      howToStart: {
        ko: "메뉴 → 'K-Drama Lồng tiếng' 클릭",
        vi: "Menu → Nhấn 'K-Drama Lồng tiếng'"
      },
      tips: [
        { ko: "조용한 곳에서 녹음하세요", vi: "Thu âm ở nơi yên tĩnh" },
        { ko: "천천히 또박또박 읽으면 점수가 높아요", vi: "Đọc chậm và rõ ràng sẽ được điểm cao" },
      ],
    },
    {
      id: "parttime",
      icon: Briefcase,
      title: "알바 체험",
      titleVi: "Làm thêm Hàn Quốc",
      color: "from-korean-green to-korean-teal",
      summary: {
        ko: "한국 편의점, 카페 등에서 알바하며 한국어 실력을 키우세요!",
        vi: "Làm thêm ở cửa hàng tiện lợi, cafe Hàn Quốc và nâng cao tiếng Hàn!"
      },
      howToStart: {
        ko: "메뉴 → 'Làm thêm Hàn Quốc' 클릭",
        vi: "Menu → Nhấn 'Làm thêm Hàn Quốc'"
      },
      tips: [
        { ko: "손님 응대를 자연스럽게 하세요", vi: "Phục vụ khách hàng một cách tự nhiên" },
        { ko: "한국어를 잘하면 더 많이 벌어요", vi: "Nói tiếng Hàn tốt sẽ kiếm được nhiều hơn" },
      ],
    },
  ];

  const toggleGame = (gameId: string) => {
    setExpandedGame(expandedGame === gameId ? null : gameId);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MegaMenu />

      <main className="flex-1 pt-[76px] pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8 sm:mb-12"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-korean-pink to-korean-purple flex items-center justify-center shadow-lg">
              <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-foreground mb-2">
              Hướng dẫn sử dụng Game
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
              Học tiếng Hàn vui vẻ cùng AI! Khám phá các game học ngôn ngữ độc đáo.
            </p>
          </motion.div>

          {/* Quick Start Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <Card className="p-4 sm:p-6 bg-gradient-to-br from-korean-pink/10 to-korean-purple/10 border-korean-pink/30">
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <MousePointer className="w-5 h-5 text-korean-pink" />
                Bắt đầu nhanh
              </h2>
              <div className="grid sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="flex items-start gap-3 p-3 sm:p-4 bg-background/50 rounded-xl">
                  <span className="w-8 h-8 rounded-full bg-korean-pink text-white text-sm font-bold flex items-center justify-center shrink-0">1</span>
                  <div>
                    <p className="font-semibold text-foreground text-sm sm:text-base">Chọn game</p>
                    <p className="text-muted-foreground text-xs sm:text-sm">Chọn game bạn muốn chơi từ menu</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 sm:p-4 bg-background/50 rounded-xl">
                  <span className="w-8 h-8 rounded-full bg-korean-purple text-white text-sm font-bold flex items-center justify-center shrink-0">2</span>
                  <div>
                    <p className="font-semibold text-foreground text-sm sm:text-base">Trò chuyện</p>
                    <p className="text-muted-foreground text-xs sm:text-sm">Nhập tiếng Hàn để tương tác với AI</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 sm:p-4 bg-background/50 rounded-xl">
                  <span className="w-8 h-8 rounded-full bg-korean-orange text-white text-sm font-bold flex items-center justify-center shrink-0">3</span>
                  <div>
                    <p className="font-semibold text-foreground text-sm sm:text-base">Nhận điểm</p>
                    <p className="text-muted-foreground text-xs sm:text-sm">Hoàn thành nhiệm vụ để nhận điểm thưởng</p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Stats Explanation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-8"
          >
            <Card className="p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-korean-yellow" />
                Hiểu thanh trạng thái
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl">
                  <Heart className="w-6 h-6 text-destructive shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground text-sm">HP (Máu)</p>
                    <p className="text-muted-foreground text-xs">Giảm khi mắc lỗi. Về 0 = thua!</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl">
                  <Coins className="w-6 h-6 text-korean-yellow shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground text-sm">Tiền (₩)</p>
                    <p className="text-muted-foreground text-xs">Kiếm tiền khi hoàn thành nhiệm vụ</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl">
                  <Target className="w-6 h-6 text-korean-green shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground text-sm">Nhiệm vụ</p>
                    <p className="text-muted-foreground text-xs">Số nhiệm vụ đã hoàn thành</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl">
                  <Star className="w-6 h-6 text-korean-cyan shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground text-sm">Điểm</p>
                    <p className="text-muted-foreground text-xs">Tổng điểm từ tất cả game</p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Important Tips */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <Card className="p-4 sm:p-6 border-korean-cyan/30 bg-gradient-to-br from-korean-cyan/5 to-korean-blue/5">
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-korean-cyan" />
                Mẹo quan trọng
              </h2>
              <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="flex items-start gap-3 p-3 bg-background/50 rounded-xl">
                  <Keyboard className="w-5 h-5 text-korean-pink shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground text-sm">Trò chuyện bằng tiếng Hàn!</p>
                    <p className="text-muted-foreground text-xs">AI sẽ hiểu và phản hồi phù hợp</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-background/50 rounded-xl">
                  <Star className="w-5 h-5 text-korean-yellow shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground text-sm">Nói càng tự nhiên, điểm càng cao</p>
                    <p className="text-muted-foreground text-xs">Tập trung vào cách diễn đạt tự nhiên</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-background/50 rounded-xl">
                  <Lightbulb className="w-5 h-5 text-korean-green shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground text-sm">Sai cũng không sao!</p>
                    <p className="text-muted-foreground text-xs">Đây là quá trình học, đừng ngại thử</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-background/50 rounded-xl">
                  <BookOpen className="w-5 h-5 text-korean-blue shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground text-sm">Giải thích bằng tiếng Việt</p>
                    <p className="text-muted-foreground text-xs">Mọi hướng dẫn đều có bản dịch</p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Game Guides */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mb-8"
          >
            <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-korean-yellow" />
              Hướng dẫn chi tiết từng game
            </h2>
            <p className="text-muted-foreground text-sm mb-4">
              Chạm vào mỗi game để xem hướng dẫn chi tiết
            </p>

            <div className="space-y-3">
              {gameGuides.map((game, index) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                >
                  <Card className="overflow-hidden">
                    {/* Game Header - Clickable */}
                    <button
                      onClick={() => toggleGame(game.id)}
                      className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-r ${game.color} flex items-center justify-center shrink-0 shadow-md`}>
                          <game.icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                        </div>
                        <div className="text-left">
                          <h3 className="font-bold text-foreground text-sm sm:text-base">{game.title}</h3>
                          <p className="text-muted-foreground text-xs sm:text-sm">{game.titleVi}</p>
                        </div>
                      </div>
                      <motion.div
                        animate={{ rotate: expandedGame === game.id ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      </motion.div>
                    </button>

                    {/* Expanded Content */}
                    <AnimatePresence>
                      {expandedGame === game.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4">
                            {/* Summary */}
                            <div className="p-3 sm:p-4 bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl border-l-4 border-primary">
                              <p className="text-foreground text-sm">{game.summary.ko}</p>
                              <p className="text-muted-foreground text-xs mt-1">{game.summary.vi}</p>
                            </div>

                            {/* How to Start */}
                            <div className="p-3 sm:p-4 bg-korean-pink/10 rounded-xl">
                              <div className="flex items-center gap-2 mb-2">
                                <Play className="w-4 h-4 text-korean-pink" />
                                <span className="text-korean-pink font-bold text-sm">Cách bắt đầu</span>
                              </div>
                              <p className="text-foreground text-sm">{game.howToStart.ko}</p>
                              <p className="text-muted-foreground text-xs">{game.howToStart.vi}</p>
                            </div>

                            {/* Tips */}
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Lightbulb className="w-4 h-4 text-korean-yellow" />
                                <span className="text-korean-yellow font-bold text-sm">Mẹo</span>
                              </div>
                              <div className="grid sm:grid-cols-2 gap-2">
                                {game.tips.map((tip, tipIndex) => (
                                  <div key={tipIndex} className="flex items-start gap-2 p-3 bg-korean-yellow/10 rounded-lg">
                                    <CheckCircle2 className="w-4 h-4 text-korean-yellow shrink-0 mt-0.5" />
                                    <div>
                                      <p className="text-foreground text-xs sm:text-sm">{tip.ko}</p>
                                      <p className="text-muted-foreground text-xs">{tip.vi}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Start Button */}
                            <Button
                              onClick={() => {
                                const routes: Record<string, string> = {
                                  manager: "/manager",
                                  survival: "/chat",
                                  dating: "/dating",
                                  wordchain: "/wordchain",
                                  kpop: "/kpop",
                                  kdrama: "/kdrama",
                                  parttime: "/parttime",
                                };
                                navigate(routes[game.id] || "/");
                              }}
                              className="w-full bg-gradient-to-r from-korean-pink to-korean-purple hover:opacity-90 text-white"
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Chơi ngay!
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              onClick={() => navigate("/dashboard")}
              className="w-full h-14 bg-gradient-to-r from-korean-pink to-korean-purple hover:opacity-90 text-white font-bold text-base sm:text-lg"
            >
              Bắt đầu học ngay!
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
};

export default Tutorial;
