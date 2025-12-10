import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Target, Trophy, ArrowRight, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from "framer-motion";
import seoulHero from "@/assets/seoul-hero.jpg";

const Index = () => {
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse tracking for parallax
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothMouseX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const smoothMouseY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  // Parallax transforms
  const bgX = useTransform(smoothMouseX, [-0.5, 0.5], [20, -20]);
  const bgY = useTransform(smoothMouseY, [-0.5, 0.5], [10, -10]);
  const textX = useTransform(smoothMouseX, [-0.5, 0.5], [-10, 10]);
  const textY = useTransform(smoothMouseY, [-0.5, 0.5], [-5, 5]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/game");
      }
    };
    checkAuth();
    
    setTimeout(() => setIsLoaded(true), 100);
  }, [navigate]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  // Floating orbs
  const orbs = [
    { size: 300, x: "10%", y: "20%", color: "primary", delay: 0, blur: 80 },
    { size: 200, x: "80%", y: "30%", color: "secondary", delay: 1, blur: 60 },
    { size: 250, x: "70%", y: "70%", color: "accent", delay: 2, blur: 70 },
    { size: 180, x: "20%", y: "75%", color: "neon-purple", delay: 0.5, blur: 50 },
  ];

  // Grid lines
  const gridLines = Array.from({ length: 12 }, (_, i) => i);

  // Stats
  const stats = [
    { value: "10K+", label: "Active Learners", labelVi: "Người học" },
    { value: "8+", label: "Game Modes", labelVi: "Chế độ game" },
    { value: "AI", label: "Powered Chat", labelVi: "Trợ lý AI" },
  ];

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="min-h-[100dvh] bg-background flex flex-col relative overflow-hidden cursor-default"
    >
      {/* Animated Grid Background */}
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="absolute inset-0" style={{ 
          backgroundImage: `
            linear-gradient(to right, hsl(var(--primary) / 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--primary) / 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }} />
        {/* Animated scan line */}
        <motion.div
          className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"
          initial={{ top: "-10%" }}
          animate={{ top: "110%" }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Hero Background with Parallax */}
      <motion.div 
        className="absolute inset-0 z-[1]"
        style={{ x: bgX, y: bgY }}
      >
        <motion.img
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.4 }}
          transition={{ duration: 2, ease: [0.25, 0.1, 0.25, 1] }}
          src={seoulHero}
          alt="Seoul"
          className="w-full h-full object-cover"
        />
        {/* Multiple gradient overlays for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/60 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-background/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background))_70%)]" />
      </motion.div>

      {/* Floating Orbs with Mouse Interaction */}
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none z-[2]"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            background: `radial-gradient(circle, hsl(var(--${orb.color}) / 0.3) 0%, transparent 70%)`,
            filter: `blur(${orb.blur}px)`,
          }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ 
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.2, 1],
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 8 + i * 2,
            delay: orb.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Floating Particles */}
      <div className="absolute inset-0 z-[3] overflow-hidden pointer-events-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-primary/60 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -200, 0],
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: 6 + Math.random() * 6,
              delay: Math.random() * 5,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
        ))}
      </div>

      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative z-20 px-6 py-5 flex items-center justify-between"
      >
        <motion.div 
          className="flex items-center gap-4"
          whileHover={{ scale: 1.02 }}
        >
          <motion.div 
            className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-primary/40 shadow-lg shadow-primary/30 relative"
            whileHover={{ borderColor: "hsl(var(--primary))" }}
          >
            <img 
              src="/favicon.png" 
              alt="LUKATO" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent" />
          </motion.div>
          <div className="flex flex-col">
            <span className="font-display text-2xl text-foreground tracking-wider font-bold">LUKATO</span>
            <span className="text-[10px] text-primary/80 tracking-widest uppercase">Korean Learning Game</span>
          </div>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button 
            variant="outline" 
            size="sm"
            className="border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground font-bold rounded-full px-6 backdrop-blur-sm"
            onClick={() => navigate("/auth")}
          >
            로그인
          </Button>
        </motion.div>
      </motion.header>

      {/* Main Content */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center px-6 pb-8">
        <div className="w-full max-w-lg mx-auto text-center">
          
          {/* Glitch Title */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ x: textX, y: textY }}
            className="mb-4 relative"
          >
            {/* Glitch layers */}
            <motion.h1 
              className="text-6xl md:text-8xl font-display tracking-tighter leading-none relative"
              animate={{
                textShadow: [
                  "0 0 40px hsl(var(--primary) / 0.5)",
                  "0 0 80px hsl(var(--primary) / 0.8)",
                  "0 0 40px hsl(var(--primary) / 0.5)",
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="block text-foreground">Game</span>
              <span className="block text-gradient-neon text-7xl md:text-9xl relative">
                LUKATO
                {/* Glitch effect overlays */}
                <motion.span
                  className="absolute inset-0 text-secondary opacity-50"
                  style={{ clipPath: "inset(10% 0 60% 0)" }}
                  animate={{ x: [-2, 2, -2], opacity: [0, 0.5, 0] }}
                  transition={{ duration: 0.2, repeat: Infinity, repeatDelay: 3 }}
                >
                  LUKATO
                </motion.span>
                <motion.span
                  className="absolute inset-0 text-accent opacity-50"
                  style={{ clipPath: "inset(50% 0 20% 0)" }}
                  animate={{ x: [2, -2, 2], opacity: [0, 0.5, 0] }}
                  transition={{ duration: 0.15, repeat: Infinity, repeatDelay: 4, delay: 0.1 }}
                >
                  LUKATO
                </motion.span>
              </span>
            </motion.h1>
          </motion.div>

          {/* Tagline with typing effect */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mb-2"
          >
            <p className="text-xl md:text-2xl text-foreground/90 font-body tracking-wide font-medium">
              Your Korean Mentor
            </p>
          </motion.div>

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 1 }}
            className="mb-10"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary">
              <Zap className="w-4 h-4" />
              AI 기반 한국어 학습 RPG
            </span>
          </motion.div>

          {/* Stats Row */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="flex justify-center gap-6 mb-10"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.4 + i * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-display font-bold text-primary mb-1">
                  {stat.value}
                </div>
                <div className="text-xs text-muted-foreground">
                  <div>{stat.label}</div>
                  <div className="text-primary/60">{stat.labelVi}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
          >
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onHoverStart={() => setIsHovering(true)}
              onHoverEnd={() => setIsHovering(false)}
              className="relative"
            >
              <Button 
                size="lg"
                className="w-full sm:w-auto h-16 px-10 text-lg font-bold rounded-2xl bg-gradient-to-r from-primary via-neon-purple to-primary bg-[length:200%_100%] animate-shimmer hover:shadow-[0_0_40px_hsl(var(--primary)/0.5)] transition-all duration-500 relative overflow-hidden group"
                onClick={() => navigate("/auth")}
              >
                {/* Shine effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  initial={{ x: "-100%" }}
                  animate={isHovering ? { x: "100%" } : { x: "-100%" }}
                  transition={{ duration: 0.6 }}
                />
                <Play className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
                <span className="relative z-10">시작하기 / Bắt đầu</span>
                <ArrowRight className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>
          </motion.div>

          {/* Feature Pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.8 }}
            className="flex flex-wrap justify-center gap-3"
          >
            {[
              { icon: <Target className="w-4 h-4" />, text: "AI 대화 연습" },
              { icon: <Trophy className="w-4 h-4" />, text: "8가지 미니게임" },
              { icon: <Sparkles className="w-4 h-4" />, text: "TOPIK 준비" },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 2 + i * 0.1 }}
                whileHover={{ scale: 1.05, y: -2 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border/50 text-sm text-foreground/80 backdrop-blur-sm cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-all"
              >
                <span className="text-primary">{feature.icon}</span>
                {feature.text}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </main>

      {/* Animated Bottom Gradient Line */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-[2px] z-30"
        style={{
          background: "linear-gradient(90deg, transparent, hsl(var(--primary)), hsl(var(--secondary)), hsl(var(--primary)), transparent)",
        }}
        animate={{
          opacity: [0.3, 0.8, 0.3],
        }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      {/* Footer */}
      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2 }}
        className="relative z-20 px-6 py-5 text-center"
      >
        <p className="text-xs text-muted-foreground/60 tracking-wide">
          © 2025 Powered by{" "}
          <motion.span 
            className="text-primary font-semibold"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            LUKATO AI
          </motion.span>
        </p>
      </motion.footer>

      {/* Mouse follower glow */}
      <motion.div
        className="fixed w-[400px] h-[400px] rounded-full pointer-events-none z-[5]"
        style={{
          background: "radial-gradient(circle, hsl(var(--primary) / 0.08) 0%, transparent 60%)",
          left: mousePosition.x - 200,
          top: mousePosition.y - 200,
        }}
        animate={{
          scale: isHovering ? 1.5 : 1,
        }}
        transition={{ type: "spring", stiffness: 150, damping: 15 }}
      />
    </div>
  );
};

export default Index;
