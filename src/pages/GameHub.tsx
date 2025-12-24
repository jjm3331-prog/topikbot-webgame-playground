import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
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
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";

// 게임 학습 메뉴
const gameMenus = [
  {
    id: "chat",
    title: "AI Sinh tồn",
    subtitle: "Seoul",
    description: "Sinh tồn tại Seoul! Nâng cao tiếng Hàn qua trò chuyện với AI!",
    emoji: "🎮",
    color: "from-red-500 to-pink-600",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    path: "/chat"
  },
  {
    id: "dating",
    title: "Hẹn hò",
    subtitle: "Korean Dating",
    description: "Hẹn hò với người Hàn ảo và học các biểu đạt tình cảm!",
    emoji: "💕",
    color: "from-pink-500 to-rose-600",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/30",
    path: "/dating"
  },
  {
    id: "manager",
    title: "Manager",
    subtitle: "K-POP Idol",
    description: "Trở thành quản lý idol K-POP và đưa nhóm đến thành công!",
    emoji: "👑",
    color: "from-amber-400 to-orange-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    path: "/manager",
    isHot: true
  },
  {
    id: "kpop",
    title: "K-POP Quiz",
    subtitle: "Music",
    description: "Học tiếng Hàn thú vị qua quiz ca từ K-POP!",
    emoji: "🎵",
    color: "from-violet-500 to-purple-600",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/30",
    path: "/kpop"
  },
  {
    id: "kdrama",
    title: "K-Drama",
    subtitle: "Lồng tiếng",
    description: "Luyện phát âm bằng cách lồng tiếng cảnh phim nổi tiếng!",
    emoji: "🎬",
    color: "from-cyan-500 to-blue-600",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/30",
    path: "/kdrama"
  },
  {
    id: "wordchain",
    title: "Nối từ",
    subtitle: "끝말잇기",
    description: "Đấu nối từ với AI! Kiểm tra vốn từ vựng của bạn!",
    emoji: "🔗",
    color: "from-green-500 to-emerald-600",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    path: "/wordchain"
  },
  {
    id: "parttime",
    title: "Làm thêm",
    subtitle: "Part-time Job",
    description: "Luyện hội thoại thực tế trong các tình huống làm thêm!",
    emoji: "💼",
    color: "from-slate-500 to-gray-600",
    bgColor: "bg-slate-500/10",
    borderColor: "border-slate-500/30",
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

export default function GameHub() {
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
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-korean-orange via-korean-pink to-korean-purple flex items-center justify-center shadow-lg">
                <Gamepad2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">🎮 Game học tiếng Hàn</h1>
                <p className="text-muted-foreground">Học vui vẻ qua các trò chơi tương tác</p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-3 mt-4">
              <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
                <Gamepad2 className="w-4 h-4 text-korean-orange" />
                <span>7 trò chơi</span>
              </Badge>
              <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
                <Sparkles className="w-4 h-4 text-korean-pink" />
                <span>Tương tác với AI</span>
              </Badge>
              <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
                <Zap className="w-4 h-4 text-korean-green" />
                <span>Học mà chơi</span>
              </Badge>
            </div>
          </motion.div>

          {/* Game Cards Grid */}
          <motion.section
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Top 4 games - larger cards */}
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              {gameMenus.slice(0, 4).map((menu) => (
                <motion.div key={menu.id} variants={itemVariants}>
                  <Card
                    onClick={() => navigate(menu.path)}
                    className={`relative overflow-hidden cursor-pointer group p-6 border ${menu.borderColor} hover:shadow-lg hover:scale-[1.02] transition-all duration-300`}
                  >
                    {/* Hot badge */}
                    {menu.isHot && (
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-[10px] px-2">
                          🔥 HOT
                        </Badge>
                      </div>
                    )}

                    <div className="relative z-10 flex flex-col items-center text-center">
                      {/* Emoji */}
                      <span className="text-5xl mb-4 group-hover:scale-110 transition-transform">{menu.emoji}</span>
                      
                      {/* Title */}
                      <h3 className="font-bold text-foreground text-lg mb-1">{menu.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{menu.subtitle}</p>

                      {/* Description */}
                      <p className="text-xs text-muted-foreground line-clamp-2">{menu.description}</p>
                    </div>

                    {/* Arrow */}
                    <div className="absolute bottom-4 right-4">
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Bottom 3 games - smaller cards */}
            <div className="grid grid-cols-3 gap-4">
              {gameMenus.slice(4).map((menu) => (
                <motion.div key={menu.id} variants={itemVariants}>
                  <Card
                    onClick={() => navigate(menu.path)}
                    className={`relative overflow-hidden cursor-pointer group p-4 border ${menu.borderColor} hover:shadow-lg hover:scale-[1.02] transition-all duration-300`}
                  >
                    <div className="relative z-10 flex flex-col items-center text-center">
                      {/* Emoji */}
                      <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">{menu.emoji}</span>
                      
                      {/* Title */}
                      <h3 className="font-bold text-foreground text-sm">{menu.title}</h3>
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
            <Card className="p-6 bg-gradient-to-br from-korean-orange/10 via-korean-pink/10 to-korean-purple/10 border-korean-orange/20">
              <Trophy className="w-12 h-12 mx-auto mb-4 text-korean-orange" />
              <h3 className="text-xl font-bold text-foreground mb-2">
                Học tiếng Hàn thật vui!
              </h3>
              <p className="text-muted-foreground mb-4">
                Chơi game mỗi ngày để nâng cao kỹ năng tiếng Hàn của bạn!
              </p>
              <Button 
                onClick={() => navigate("/dashboard")}
                className="bg-gradient-to-r from-korean-orange to-korean-pink hover:opacity-90"
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