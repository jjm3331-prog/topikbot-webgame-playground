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
            
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-korean-purple via-korean-pink to-korean-orange flex items-center justify-center shadow-lg">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">📚 Trung tâm học TOPIK</h1>
                <p className="text-muted-foreground">Học tập TOPIK toàn diện với AI</p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-3 mt-4">
              <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
                <Target className="w-4 h-4 text-korean-purple" />
                <span>6 bài học</span>
              </Badge>
              <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
                <Sparkles className="w-4 h-4 text-korean-pink" />
                <span>Tương tác với AI</span>
              </Badge>
              <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
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
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {topikMenus.map((menu) => (
                <motion.div 
                  key={menu.id} 
                  variants={itemVariants}
                >
                  <Card
                    onClick={() => navigate(menu.path)}
                    className={`relative overflow-hidden cursor-pointer group h-full border ${menu.borderColor} hover:shadow-xl hover:scale-[1.03] transition-all duration-300`}
                  >
                    {/* Gradient overlay on hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${menu.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                    
                    {/* New badge */}
                    {menu.isNew && (
                      <div className="absolute top-2 right-2 z-20">
                        <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[9px] px-1.5 py-0.5">
                          ✨ NEW
                        </Badge>
                      </div>
                    )}

                    <div className="relative z-10 p-5 flex flex-col items-center text-center h-full">
                      {/* Icon with glow effect */}
                      <div className="relative mb-3">
                        <div className={`w-14 h-14 rounded-xl ${menu.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                          <menu.icon 
                            className="w-7 h-7" 
                            style={{ color: getIconColor(menu.color) }} 
                          />
                        </div>
                        <div className={`absolute inset-0 blur-xl opacity-0 group-hover:opacity-50 transition-opacity bg-gradient-to-br ${menu.color}`} />
                      </div>
                      
                      {/* Title */}
                      <h3 className="font-bold text-foreground text-base mb-0.5">{menu.title}</h3>
                      <p className="text-[11px] text-muted-foreground mb-2">{menu.subtitle}</p>

                      {/* Description - hidden on mobile for cleaner look */}
                      <p className="text-[10px] text-muted-foreground/80 line-clamp-2 hidden sm:block flex-1">
                        {menu.description}
                      </p>
                      
                      {/* Play button indicator */}
                      <div className="mt-3 w-full">
                        <div className={`flex items-center justify-center gap-1 py-1.5 rounded-full bg-gradient-to-r ${menu.color} opacity-0 group-hover:opacity-100 transition-all duration-300`}>
                          <span className="text-white text-[10px] font-semibold">Học ngay</span>
                          <ChevronRight className="w-3 h-3 text-white" />
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
