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
            
            <div className="flex items-center gap-5 mb-5">
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-korean-orange via-korean-pink to-korean-purple flex items-center justify-center shadow-lg">
                <Gamepad2 className="w-9 h-9 sm:w-10 sm:h-10 text-white" />
              </div>
              <div>
                <h1 className="text-title font-bold text-foreground">🎮 Game học tiếng Hàn</h1>
                <p className="text-body text-muted-foreground mt-1">Học vui vẻ qua các trò chơi tương tác</p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-3 mt-5">
              <Badge variant="outline" className="gap-2 py-2 px-4 text-card-caption">
                <Gamepad2 className="w-4 h-4 text-korean-orange" />
                <span>7 trò chơi</span>
              </Badge>
              <Badge variant="outline" className="gap-2 py-2 px-4 text-card-caption">
                <Sparkles className="w-4 h-4 text-korean-pink" />
                <span>Tương tác với AI</span>
              </Badge>
              <Badge variant="outline" className="gap-2 py-2 px-4 text-card-caption">
                <Zap className="w-4 h-4 text-korean-green" />
                <span>Học mà chơi</span>
              </Badge>
            </div>
          </motion.div>

          {/* Game Cards Grid - Unified Style */}
          <motion.section
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
              {gameMenus.map((menu, index) => (
                <motion.div 
                  key={menu.id} 
                  variants={itemVariants}
                  className={index < 4 ? "col-span-1" : "col-span-1"}
                >
                  <Card
                    onClick={() => navigate(menu.path)}
                    className={`relative overflow-hidden cursor-pointer group h-full border-2 ${menu.borderColor} hover:shadow-2xl hover:scale-[1.02] transition-all duration-300`}
                  >
                    {/* Gradient overlay on hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${menu.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                    
                    {/* Hot badge */}
                    {menu.isHot && (
                      <div className="absolute top-4 right-4 z-20">
                        <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-badge px-3 py-1.5 font-semibold">
                          🔥 HOT
                        </Badge>
                      </div>
                    )}

                    <div className="relative z-10 p-6 sm:p-8 flex flex-col items-center text-center h-full">
                      {/* Emoji with glow effect */}
                      <div className="relative mb-4">
                        <span className="text-5xl sm:text-6xl group-hover:scale-125 transition-transform duration-300 block">{menu.emoji}</span>
                        <div className={`absolute inset-0 blur-xl opacity-0 group-hover:opacity-50 transition-opacity bg-gradient-to-br ${menu.color}`} />
                      </div>
                      
                      {/* Title */}
                      <h3 className="font-bold text-foreground text-card-title-lg sm:text-2xl mb-1.5">{menu.title}</h3>
                      <p className="text-card-caption sm:text-base text-muted-foreground mb-3">{menu.subtitle}</p>

                      {/* Description */}
                      <p className="text-card-body sm:text-lg text-muted-foreground/90 leading-relaxed flex-1">
                        {menu.description}
                      </p>
                      
                      {/* Play button indicator */}
                      <div className="mt-6 w-full">
                        <div className={`flex items-center justify-center gap-2 py-3 sm:py-3.5 rounded-xl bg-gradient-to-r ${menu.color} opacity-0 group-hover:opacity-100 transition-all duration-300`}>
                          <span className="text-white text-button-lg font-bold">Chơi ngay</span>
                          <ChevronRight className="w-5 h-5 text-white" />
                        </div>
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
            <Card className="p-8 sm:p-10 bg-gradient-to-br from-korean-orange/10 via-korean-pink/10 to-korean-purple/10 border-korean-orange/20">
              <Trophy className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-5 text-korean-orange" />
              <h3 className="text-headline sm:text-2xl font-bold text-foreground mb-3">
                Học tiếng Hàn thật vui!
              </h3>
              <p className="text-body text-muted-foreground mb-6">
                Chơi game mỗi ngày để nâng cao kỹ năng tiếng Hàn của bạn!
              </p>
              <Button 
                onClick={() => navigate("/dashboard")}
                className="bg-gradient-to-r from-korean-orange to-korean-pink hover:opacity-90 text-button-lg py-3 px-6"
              >
                <Star className="w-5 h-5 mr-2" />
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