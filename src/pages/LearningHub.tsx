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
    title: "Từ vựng",
    subtitle: "어휘 학습",
    description: "Flashcard, trò chơi trí nhớ, và Sprint 60 giây để ghi nhớ từ vựng thú vị!",
    icon: Languages,
    color: "from-violet-500 to-purple-600",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/30",
    path: "/vocabulary",
    isNew: true
  },
  {
    id: "grammar",
    title: "Ngữ pháp",
    subtitle: "문법 학습",
    description: "Ghép câu, sửa lỗi, và Grammar Battle để làm chủ ngữ pháp tiếng Hàn!",
    icon: Notebook,
    color: "from-pink-500 to-rose-600",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/30",
    path: "/grammar",
    isNew: true
  },
  {
    id: "handwriting",
    title: "Luyện viết tay",
    subtitle: "손글씨 연습",
    description: "Tập viết chữ cái và từ vựng tiếng Hàn bằng tay!",
    icon: PenTool,
    color: "from-purple-500 to-indigo-600",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    path: "/handwriting"
  },
  {
    id: "listening",
    title: "Luyện nghe",
    subtitle: "듣기 연습",
    description: "Nâng cao khả năng nghe với bài thi TOPIK thực tế!",
    icon: Headphones,
    color: "from-blue-500 to-cyan-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    path: "/listening"
  },
  {
    id: "reading-a",
    title: "Đọc hiểu A",
    subtitle: "읽기A",
    description: "Nâng cao khả năng đọc cơ bản với hội thoại ngắn và thông báo!",
    icon: BookOpen,
    color: "from-emerald-500 to-teal-600",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    path: "/reading-a"
  },
  {
    id: "reading-b",
    title: "Đọc hiểu B",
    subtitle: "읽기B",
    description: "Đọc nâng cao với bài báo, bài luận và văn bản học thuật!",
    icon: FileText,
    color: "from-orange-500 to-amber-600",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    path: "/reading-b"
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

// Icon color mapping helper
const getIconColor = (color: string) => {
  if (color.includes('violet')) return '#8b5cf6';
  if (color.includes('pink')) return '#ec4899';
  if (color.includes('purple')) return '#a855f7';
  if (color.includes('blue')) return '#3b82f6';
  if (color.includes('emerald')) return '#10b981';
  if (color.includes('orange')) return '#f97316';
  return '#8b5cf6';
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
            
            <div className="flex items-center gap-5 mb-5">
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-korean-purple via-korean-pink to-korean-orange flex items-center justify-center shadow-lg">
                <Sparkles className="w-9 h-9 sm:w-10 sm:h-10 text-white" />
              </div>
              <div>
                <h1 className="text-title font-bold text-foreground">📚 Trung tâm học TOPIK</h1>
                <p className="text-body text-muted-foreground mt-1">Học tập TOPIK toàn diện với AI</p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-3 mt-5">
              <Badge variant="outline" className="gap-2 py-2 px-4 text-card-caption">
                <Target className="w-4 h-4 text-korean-purple" />
                <span>6 bài học</span>
              </Badge>
              <Badge variant="outline" className="gap-2 py-2 px-4 text-card-caption">
                <Sparkles className="w-4 h-4 text-korean-pink" />
                <span>Tương tác với AI</span>
              </Badge>
              <Badge variant="outline" className="gap-2 py-2 px-4 text-card-caption">
                <Zap className="w-4 h-4 text-korean-green" />
                <span>Học có hệ thống</span>
              </Badge>
            </div>
          </motion.div>

          {/* TOPIK Cards Grid - Unified Style like GameHub */}
          <motion.section
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {topikMenus.map((menu) => (
                <motion.div 
                  key={menu.id} 
                  variants={itemVariants}
                >
                  <Card
                    onClick={() => navigate(menu.path)}
                    className={`relative overflow-hidden cursor-pointer group h-full border-2 ${menu.borderColor} hover:shadow-2xl hover:scale-[1.02] transition-all duration-300`}
                  >
                    {/* Gradient overlay on hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${menu.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                    
                    {/* New badge */}
                    {menu.isNew && (
                      <div className="absolute top-4 right-4 z-20">
                        <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-badge px-3 py-1.5 font-semibold">
                          ✨ NEW
                        </Badge>
                      </div>
                    )}

                    <div className="relative z-10 p-6 sm:p-8 flex flex-col items-center text-center h-full">
                      {/* Icon with glow effect */}
                      <div className="relative mb-4">
                        <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl ${menu.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                          <menu.icon 
                            className="w-8 h-8 sm:w-10 sm:h-10" 
                            style={{ color: getIconColor(menu.color) }} 
                          />
                        </div>
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
                          <span className="text-white text-button-lg font-bold">Học ngay</span>
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
            <Card className="p-8 sm:p-10 bg-gradient-to-br from-korean-purple/10 via-korean-pink/10 to-korean-orange/10 border-korean-purple/20">
              <Trophy className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-5 text-korean-orange" />
              <h3 className="text-headline sm:text-2xl font-bold text-foreground mb-3">
                Chinh phục TOPIK ngay hôm nay!
              </h3>
              <p className="text-body text-muted-foreground mb-6">
                Hãy thử thách bản thân để đạt chứng chỉ TOPIK!
              </p>
              <Button 
                onClick={() => navigate("/dashboard")}
                className="bg-gradient-to-r from-korean-purple to-korean-pink hover:opacity-90 text-button-lg py-3 px-6"
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
