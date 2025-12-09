import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Play, Sparkles, BookOpen, Trophy, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/game");
      }
    };
    checkAuth();
  }, [navigate]);

  const features = [
    {
      icon: "🎮",
      title: "AI 서바이벌",
      titleVi: "Sinh tồn AI",
      description: "서울에서 생존하기",
    },
    {
      icon: "💕",
      title: "연애 시뮬",
      titleVi: "Hẹn hò",
      description: "한국어로 썸 타기",
    },
    {
      icon: "🎤",
      title: "K-POP & Drama",
      titleVi: "K-POP & Drama",
      description: "노래와 대사 연습",
    },
  ];

  const stats = [
    { value: "8+", label: "게임 모드", labelVi: "Chế độ game" },
    { value: "AI", label: "실시간 평가", labelVi: "Đánh giá AI" },
    { value: "∞", label: "무한 콘텐츠", labelVi: "Nội dung vô hạn" },
  ];

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Header */}
      <header className="px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <img 
            src="/favicon.png" 
            alt="LUKATO" 
            className="w-8 h-8 rounded-lg"
          />
          <span className="font-display text-lg text-foreground">K-Life</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          className="text-muted-foreground text-sm"
          onClick={() => navigate("/auth")}
        >
          로그인
        </Button>
      </header>

      {/* Hero Section */}
      <main className="flex-1 px-4 pb-6 flex flex-col">
        {/* Hero Badge */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center mb-4"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">AI Korean RPG</span>
          </div>
        </motion.div>

        {/* Hero Title */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-6"
        >
          <h1 className="text-3xl md:text-4xl font-display mb-2">
            <span className="text-gradient-neon">매일 30분,</span>
          </h1>
          <p className="text-2xl md:text-3xl font-display text-foreground mb-3">
            게임으로 한국어 마스터!
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
            재미있는 게임을 통해 한국어를 배우세요.
            <br />
            <span className="text-muted-foreground/70">
              Học tiếng Hàn qua game thú vị!
            </span>
          </p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex gap-3 justify-center mb-8"
        >
          <Button 
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 gap-2"
            onClick={() => navigate("/auth")}
          >
            <Play className="w-4 h-4" />
            시작하기
          </Button>
          <Button 
            variant="outline"
            size="lg"
            className="border-border text-foreground hover:bg-muted px-6 gap-2"
            onClick={() => navigate("/tutorial")}
          >
            <BookOpen className="w-4 h-4" />
            가이드
          </Button>
        </motion.div>

        {/* Stats Row */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center gap-6 mb-8"
        >
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-xl font-display text-primary">{stat.value}</div>
              <div className="text-[10px] text-muted-foreground">{stat.label}</div>
              <div className="text-[9px] text-muted-foreground/60">{stat.labelVi}</div>
            </div>
          ))}
        </motion.div>

        {/* Features Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-display text-foreground">주요 게임</h2>
            <span className="text-xs text-muted-foreground">더보기 →</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="group glass-card p-4 flex items-center gap-4 cursor-pointer hover:border-primary/40 transition-all"
                onClick={() => navigate("/auth")}
              >
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-2xl shrink-0">
                  {feature.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-bold text-foreground text-sm">{feature.title}</h3>
                    <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-medium">
                      AI
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                  <p className="text-[10px] text-muted-foreground/60">{feature.titleVi}</p>
                </div>
                <div className="text-primary text-sm">▶</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-auto pt-6"
        >
          <div className="glass-card p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-accent" />
              <span className="text-sm font-bold text-foreground">랭킹 도전!</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              게임을 플레이하고 랭킹에 도전하세요
              <br />
              <span className="text-muted-foreground/60">Chơi game và thử thách xếp hạng</span>
            </p>
            <Button 
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold gap-2"
              onClick={() => navigate("/auth")}
            >
              <Zap className="w-4 h-4" />
              무료로 시작하기
            </Button>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="px-4 py-3 text-center shrink-0">
        <p className="text-[10px] text-muted-foreground/50">
          © 2025 LUKATO AI · K-Life 서울 생존기
        </p>
      </footer>
    </div>
  );
};

export default Index;
