import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowLeft, 
  PenTool, 
  Headphones, 
  Sparkles,
  ChevronRight,
  BookOpen,
  Trophy,
  Zap
} from "lucide-react";

interface LessonMenuItemProps {
  icon: React.ElementType;
  title: string;
  titleKo: string;
  description: string;
  gradient: string;
  shadowColor: string;
  badge?: string;
  onClick: () => void;
  index: number;
}

const LessonMenuItem = ({ 
  icon: Icon, 
  title, 
  titleKo, 
  description, 
  gradient, 
  shadowColor,
  badge,
  onClick,
  index 
}: LessonMenuItemProps) => {
  return (
    <motion.button
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.15, ease: [0.4, 0, 0.2, 1] }}
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-3xl bg-card border border-border/50 p-6 sm:p-8 text-left transition-all duration-500 hover:border-transparent"
      style={{
        boxShadow: `0 4px 20px -5px ${shadowColor}20`,
      }}
      whileHover={{ 
        y: -8, 
        scale: 1.02,
        boxShadow: `0 20px 40px -10px ${shadowColor}40`,
      }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Background gradient on hover */}
      <div 
        className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} 
      />
      
      {/* Decorative elements */}
      <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-gradient-to-br from-primary/10 to-transparent blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-gradient-to-tr from-secondary/10 to-transparent blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

      <div className="relative z-10 flex items-start gap-5">
        {/* Icon */}
        <div className={`relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-500`}>
          <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          
          {/* Sparkle effect */}
          <motion.div
            className="absolute -top-1 -right-1 text-yellow-400"
            animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-4 h-4" />
          </motion.div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-bold text-xl sm:text-2xl text-foreground group-hover:text-primary transition-colors duration-300">
              {titleKo}
            </h3>
            {badge && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-korean-yellow to-korean-orange text-white">
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-sm sm:text-base text-muted-foreground/80 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Arrow */}
        <div className="shrink-0 self-center">
          <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-300">
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
          </div>
        </div>
      </div>

      {/* Bottom stats (optional) */}
      <div className="relative z-10 mt-6 pt-4 border-t border-border/50 flex items-center gap-6">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <BookOpen className="w-4 h-4" />
          <span>3개 탭</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Trophy className="w-4 h-4" />
          <span>퀴즈 포함</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Zap className="w-4 h-4" />
          <span>AI 지원</span>
        </div>
      </div>
    </motion.button>
  );
};

const LessonMenu = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkAuth();
  }, []);

  const lessonMenuItems = [
    {
      icon: PenTool,
      title: "Handwriting Practice",
      titleKo: "손글씨 연습",
      description: "자음·모음 기초부터 단어, 문장까지 손글씨로 직접 써보며 한글을 익히세요. AI가 맞춤법 퀴즈도 생성해드려요.",
      gradient: "from-korean-purple to-korean-pink",
      shadowColor: "#a855f7",
      badge: "추천",
    },
    {
      icon: Headphones,
      title: "Listening Practice",
      titleKo: "듣기 연습",
      description: "실제 TOPIK 듣기 시험처럼 4지선다 문제를 풀어보세요. AI TTS로 2명의 화자가 대화하는 문제도 준비되어 있어요.",
      gradient: "from-korean-blue to-korean-cyan",
      shadowColor: "#3b82f6",
      badge: "NEW",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CleanHeader />
      
      <main className="flex-1 pb-24">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="py-6 sm:py-10"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="mb-6 hover:bg-muted/50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              돌아가기
            </Button>

            <div className="text-center mb-10 sm:mb-14">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4"
              >
                <Sparkles className="w-4 h-4" />
                <span>AI 기반 한국어 학습</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="font-heading font-black text-3xl sm:text-4xl md:text-5xl text-foreground mb-4"
              >
                <span className="text-gradient-primary">레슨</span> 선택
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto"
              >
                원하는 학습 영역을 선택하세요. 
                <br className="hidden sm:block" />
                AI가 맞춤형 콘텐츠를 제공합니다.
              </motion.p>
            </div>
          </motion.div>

          {/* Menu Items */}
          <div className="space-y-6">
            {lessonMenuItems.map((item, index) => (
              <LessonMenuItem
                key={item.title}
                {...item}
                index={index}
                onClick={() => {
                  if (item.titleKo === "손글씨 연습") {
                    navigate("/handwriting");
                  } else if (item.titleKo === "듣기 연습") {
                    navigate("/listening");
                  }
                }}
              />
            ))}
          </div>

          {/* Coming Soon Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-12 text-center"
          >
            <p className="text-muted-foreground text-sm">
              🚀 더 많은 레슨이 곧 추가됩니다!
            </p>
          </motion.div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
};

export default LessonMenu;
