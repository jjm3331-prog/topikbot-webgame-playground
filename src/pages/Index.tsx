import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageSquare, Map, Award, ChevronDown, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import seoulHero from "@/assets/seoul-hero.jpg";

const Index = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/game");
      }
    };
    checkAuth();
    
    // Trigger animations after mount
    setTimeout(() => setIsVisible(true), 100);
  }, [navigate]);

  const features = [
    {
      icon: <MessageSquare className="w-5 h-5" />,
      title: "AI 기반 대화",
      titleVi: "(Hội thoại AI)",
      color: "text-secondary",
      bgColor: "bg-secondary/20",
    },
    {
      icon: <Map className="w-5 h-5" />,
      title: "실생활 시나리오",
      titleVi: "(Tình huống thực tế)",
      color: "text-accent",
      bgColor: "bg-accent/20",
    },
    {
      icon: <Award className="w-5 h-5" />,
      title: "TOPIK 준비",
      titleVi: "(Chuẩn bị TOPIK)",
      color: "text-primary",
      bgColor: "bg-primary/20",
    },
  ];

  // Floating particles
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    duration: Math.random() * 20 + 10,
    delay: Math.random() * 5,
  }));

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <motion.img
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          src={seoulHero}
          alt="Seoul Cityscape"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      </div>

      {/* Animated Particles */}
      <div className="absolute inset-0 z-[1] overflow-hidden pointer-events-none">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full bg-primary/30"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: particle.size,
              height: particle.size,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] z-[1]" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[100px] z-[1]" />

      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="relative z-10 px-5 py-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-primary/30 shadow-lg shadow-primary/20">
            <img 
              src="/favicon.png" 
              alt="LUKATO" 
              className="w-full h-full object-cover"
            />
          </div>
          <span className="font-display text-xl text-foreground tracking-wide">LUKATO</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          className="text-foreground/80 hover:text-foreground text-sm font-medium"
          onClick={() => navigate("/auth")}
        >
          로그인
        </Button>
      </motion.header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 pb-8">
        <div className="w-full max-w-md mx-auto text-center">
          {/* Hero Title */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mb-2"
          >
            <h1 className="text-5xl md:text-6xl font-display tracking-tight">
              <span className="text-foreground">Game </span>
              <span className="text-gradient-neon animate-neon-flicker">LUKATO</span>
            </h1>
          </motion.div>

          {/* Subtitle */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mb-1"
          >
            <p className="text-lg md:text-xl text-foreground/90 font-body tracking-wide">
              Your Korean Mentor
            </p>
          </motion.div>

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="mb-8"
          >
            <span className="text-sm text-muted-foreground">
              AI 기반 한국어 학습 RPG
            </span>
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="mb-12"
          >
            <Button 
              size="lg"
              className="w-full max-w-xs h-14 text-lg font-bold rounded-2xl bg-gradient-to-r from-primary via-neon-purple to-primary bg-[length:200%_100%] animate-shimmer hover:shadow-neon transition-all duration-300"
              onClick={() => navigate("/auth")}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              시작하기 / Bắt đầu
            </Button>
          </motion.div>

          {/* Features Card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.1 }}
            className="glass-card p-6 rounded-3xl border border-border/50 backdrop-blur-xl"
          >
            <p className="text-sm text-foreground/90 leading-relaxed mb-4">
              몰입형 한국어 학습 여정을 시작하세요.
              <br />
              AI 기반 대화를 통해 실생활 시나리오를
              <br />
              연습하고, 어휘를 쌓고, 서울 일상생활을
              <br />
              경험하면서 TOPIK 자격증을 준비하세요.
            </p>
            <p className="text-xs text-primary/80 italic leading-relaxed mb-6">
              Bắt đầu hành trình học tiếng Hàn đầy
              <br />
              đam mê. Luyện tập các tình huống thực
              <br />
              tế thông qua hội thoại AI, xây dựng từ
              <br />
              vựng và chuẩn bị chứng chỉ TOPIK.
            </p>

            {/* Feature Items */}
            <div className="space-y-3">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 1.3 + index * 0.15 }}
                  className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 border border-border/30 hover:border-primary/30 transition-all cursor-pointer group"
                  onClick={() => navigate("/auth")}
                >
                  <div className={`w-10 h-10 rounded-xl ${feature.bgColor} flex items-center justify-center ${feature.color} group-hover:scale-110 transition-transform`}>
                    {feature.icon}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-sm">{feature.title}</span>
                    <span className="text-muted-foreground text-xs">{feature.titleVi}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 0.5 }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="flex flex-col items-center gap-1 text-muted-foreground/50"
          >
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </motion.div>
      </main>

      {/* Footer */}
      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="relative z-10 px-5 py-4 text-center"
      >
        <p className="text-xs text-muted-foreground/60">
          © 2025 Powered by <span className="text-primary">LUKATO AI</span>
        </p>
      </motion.footer>
    </div>
  );
};

export default Index;
