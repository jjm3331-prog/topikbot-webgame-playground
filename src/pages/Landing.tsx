import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { 
  ArrowRight, 
  Sparkles, 
  BookOpen, 
  Headphones, 
  PenTool, 
  Trophy,
  Gamepad2,
  MessageCircle,
  Heart,
  Music,
  Film,
  Briefcase,
  ChevronDown,
  Star,
  Zap,
  Target,
  Users,
  Check
} from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";

// Feature data for TOPIK learning
const topikFeatures = [
  {
    icon: Headphones,
    title: "듣기 마스터",
    titleVi: "Luyện Nghe",
    desc: "실전 TOPIK 듣기 문제와 함께 청해력 향상",
    color: "from-korean-blue to-korean-teal",
  },
  {
    icon: BookOpen,
    title: "읽기 정복",
    titleVi: "Luyện Đọc",
    desc: "체계적인 독해 훈련으로 읽기 실력 강화",
    color: "from-korean-green to-secondary",
  },
  {
    icon: PenTool,
    title: "쓰기 완성",
    titleVi: "Luyện Viết",
    desc: "AI 첨삭으로 완벽한 쓰기 실력 달성",
    color: "from-korean-purple to-korean-pink",
  },
  {
    icon: Trophy,
    title: "급수 달성",
    titleVi: "Đạt Cấp Độ",
    desc: "TOPIK I (1-2급) / TOPIK II (3-6급) 목표 달성",
    color: "from-accent to-korean-orange",
  },
];

// Game modes
const gameModes = [
  { icon: MessageCircle, name: "AI 채팅", color: "bg-korean-teal" },
  { icon: Heart, name: "러브 시그널", color: "bg-korean-pink" },
  { icon: Gamepad2, name: "끝말잇기", color: "bg-korean-blue" },
  { icon: Music, name: "K-POP 퀴즈", color: "bg-korean-purple" },
  { icon: Film, name: "드라마 더빙", color: "bg-korean-orange" },
  { icon: Briefcase, name: "알바 시뮬", color: "bg-secondary" },
];

// Stats
const stats = [
  { value: "50,000+", label: "학습자", icon: Users },
  { value: "98%", label: "만족도", icon: Star },
  { value: "6급", label: "최고 달성", icon: Trophy },
  { value: "10분", label: "하루 학습", icon: Zap },
];

const Landing = () => {
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/game");
      }
    });
    setTimeout(() => setIsLoaded(true), 100);
  }, [navigate]);

  return (
    <div className="min-h-[100dvh] bg-background korean-pattern relative overflow-x-hidden">
      {/* Fixed Header */}
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="fixed top-0 left-0 right-0 z-50 px-6 py-4"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-2"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-korean-orange flex items-center justify-center shadow-glow-primary">
              <span className="text-white font-bold text-lg font-heading">토</span>
            </div>
            <span className="font-heading font-bold text-xl text-foreground">TOPIK</span>
          </motion.div>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors font-medium link-underline">기능</a>
            <a href="#games" className="text-muted-foreground hover:text-foreground transition-colors font-medium link-underline">게임</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors font-medium link-underline">가격</a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button 
              variant="ghost" 
              onClick={() => navigate("/auth")}
              className="hidden sm:flex"
            >
              로그인
            </Button>
            <Button 
              onClick={() => navigate("/auth")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground btn-glow-primary rounded-xl font-semibold"
            >
              시작하기
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <motion.section 
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="min-h-[100dvh] flex flex-col items-center justify-center px-6 pt-24 pb-16 relative"
      >
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Gradient blobs */}
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, 0]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-primary/20 via-korean-orange/15 to-transparent rounded-full blur-3xl" 
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.15, 1],
              rotate: [0, -5, 0]
            }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-secondary/20 via-korean-teal/15 to-transparent rounded-full blur-3xl" 
          />
          <motion.div 
            animate={{ y: [0, -30, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-gradient-to-r from-korean-purple/10 to-korean-pink/10 rounded-full blur-3xl" 
          />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : -20 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-card/80 backdrop-blur-md rounded-full border border-border/50 shadow-soft mb-8"
          >
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-foreground">
              🇻🇳 베트남 최초 한국어 학습 게임 플랫폼
            </span>
          </motion.div>

          {/* Main headline */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 30 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mb-8"
          >
            <h1 className="font-heading font-bold text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[1.1] tracking-tight mb-6">
              <span className="text-foreground block">TikTok 대신</span>
              <span className="text-gradient-sunrise block py-2">TOPIK!</span>
            </h1>
            <p className="text-muted-foreground text-lg sm:text-xl md:text-2xl max-w-2xl mx-auto leading-relaxed font-medium">
              매일 <span className="text-primary font-bold">10분</span>, 게임하듯 즐기며
              <br className="hidden sm:block" />
              한국어 실력이 쑥쑥 자랍니다
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          >
            <Button
              onClick={() => navigate("/auth")}
              size="lg"
              className="group w-full sm:w-auto h-14 px-8 bg-gradient-to-r from-primary to-korean-orange hover:from-primary/90 hover:to-korean-orange/90 text-white text-lg font-bold rounded-2xl shadow-glow-primary transition-all duration-300"
            >
              무료로 시작하기
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/tutorial")}
              className="w-full sm:w-auto h-14 px-8 border-2 border-border hover:border-primary/50 text-foreground text-lg font-semibold rounded-2xl transition-all duration-300"
            >
              사용법 보기
            </Button>
          </motion.div>

          {/* Game mode pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="flex flex-wrap items-center justify-center gap-3"
          >
            {gameModes.map((mode, i) => (
              <motion.div
                key={mode.name}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9 + i * 0.1 }}
                whileHover={{ scale: 1.05, y: -2 }}
                className="flex items-center gap-2 px-4 py-2 bg-card/60 backdrop-blur-sm rounded-full border border-border/50 shadow-soft cursor-pointer"
              >
                <mode.icon className={`w-4 h-4 text-foreground`} />
                <span className="text-sm font-medium text-foreground">{mode.name}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ delay: 1.5 }}
          onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="text-xs font-medium">더 알아보기</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </motion.button>
      </motion.section>

      {/* Stats Section */}
      <section className="py-16 px-6 relative">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-6 text-center"
              >
                <stat.icon className="w-8 h-8 mx-auto mb-3 text-primary" />
                <div className="text-3xl sm:text-4xl font-bold text-foreground mb-1">{stat.value}</div>
                <div className="text-muted-foreground font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 relative">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-2 bg-secondary/10 text-secondary font-semibold text-sm rounded-full mb-4">
              TOPIK 완벽 대비
            </span>
            <h2 className="font-heading font-bold text-4xl sm:text-5xl text-foreground mb-4">
              체계적인 <span className="text-gradient-ocean">학습 시스템</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              듣기, 읽기, 쓰기 모든 영역을 게임처럼 재미있게 마스터하세요
            </p>
          </motion.div>

          {/* Feature cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {topikFeatures.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -8 }}
                className="glass-card p-6 group cursor-pointer"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-heading font-bold text-xl text-foreground mb-1">{feature.title}</h3>
                <p className="text-primary text-sm font-medium mb-3">{feature.titleVi}</p>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Games Section */}
      <section id="games" className="py-24 px-6 bg-gradient-to-b from-transparent via-muted/30 to-transparent relative">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-2 bg-korean-purple/10 text-korean-purple font-semibold text-sm rounded-full mb-4">
              8가지 게임 모드
            </span>
            <h2 className="font-heading font-bold text-4xl sm:text-5xl text-foreground mb-4">
              재미있게 <span className="text-gradient-hanbok">배우는 한국어</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              지루한 교과서는 그만! 게임하듯 즐기며 한국어가 늡니다
            </p>
          </motion.div>

          {/* Game preview cards - simplified */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: MessageCircle, title: "AI 채팅 서바이벌", desc: "AI와 10턴 대화하며 위기 탈출", color: "from-korean-teal to-korean-blue" },
              { icon: Heart, title: "서울 러브 시그널", desc: "한국인 이성과 로맨틱 대화", color: "from-korean-pink to-korean-red" },
              { icon: Gamepad2, title: "끝말잇기", desc: "AI와 한국어 끝말잇기 대결", color: "from-korean-blue to-korean-purple" },
              { icon: Music, title: "K-POP 가사 퀴즈", desc: "좋아하는 K-POP으로 학습", color: "from-korean-purple to-korean-pink" },
              { icon: Film, title: "K-Drama 더빙", desc: "드라마 명대사 따라하기", color: "from-korean-orange to-accent" },
              { icon: Briefcase, title: "알바 시뮬레이터", desc: "한국 알바 현장 체험", color: "from-secondary to-korean-teal" },
            ].map((game, i) => (
              <motion.div
                key={game.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -6, scale: 1.02 }}
                className="glass-card p-6 cursor-pointer group"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${game.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                  <game.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-heading font-bold text-lg text-foreground mb-2">{game.title}</h3>
                <p className="text-muted-foreground text-sm">{game.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 relative">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-2 bg-accent/10 text-accent font-semibold text-sm rounded-full mb-4">
              심플한 가격
            </span>
            <h2 className="font-heading font-bold text-4xl sm:text-5xl text-foreground mb-4">
              <span className="text-gradient-sunrise">무료</span>로 시작하세요
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              기본 기능은 영원히 무료! 더 많은 기능이 필요할 때만 업그레이드
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Free Plan */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="glass-card p-8"
            >
              <div className="text-center mb-6">
                <h3 className="font-heading font-bold text-2xl text-foreground mb-2">무료</h3>
                <div className="text-4xl font-bold text-foreground mb-1">₫0</div>
                <p className="text-muted-foreground text-sm">영원히 무료</p>
              </div>
              <ul className="space-y-3 mb-8">
                {["하루 5개 AI 퀴즈", "기본 게임 모드", "랭킹 시스템", "출석 체크"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-foreground">
                    <Check className="w-5 h-5 text-secondary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Button 
                variant="outline" 
                className="w-full h-12 rounded-xl font-semibold"
                onClick={() => navigate("/auth")}
              >
                무료로 시작
              </Button>
            </motion.div>

            {/* Premium Plan */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="glass-card p-8 border-2 border-primary/50 relative overflow-hidden"
            >
              <div className="absolute top-4 right-4 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                추천
              </div>
              <div className="text-center mb-6">
                <h3 className="font-heading font-bold text-2xl text-foreground mb-2">프리미엄</h3>
                <div className="text-4xl font-bold text-foreground mb-1">₫99,000</div>
                <p className="text-muted-foreground text-sm">/월</p>
              </div>
              <ul className="space-y-3 mb-8">
                {["무제한 AI 퀴즈", "AI 쓰기 첨삭", "오답 노트", "학습 리포트", "모든 게임 모드", "광고 제거"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-foreground">
                    <Check className="w-5 h-5 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Button 
                className="w-full h-12 rounded-xl font-semibold bg-gradient-to-r from-primary to-korean-orange hover:opacity-90 btn-glow-primary"
                onClick={() => navigate("/auth")}
              >
                프리미엄 시작
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="font-heading font-bold text-4xl sm:text-5xl text-foreground mb-6">
            지금 바로 <span className="text-gradient-sunrise">시작</span>하세요
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
            매일 10분, 게임하듯 즐기다 보면 어느새 TOPIK 6급!
          </p>
          <Button
            onClick={() => navigate("/auth")}
            size="lg"
            className="group h-14 px-10 bg-gradient-to-r from-primary to-korean-orange hover:opacity-90 text-white text-lg font-bold rounded-2xl shadow-glow-primary"
          >
            무료로 시작하기
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border/50">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-korean-orange flex items-center justify-center">
              <span className="text-white font-bold text-sm">토</span>
            </div>
            <span className="font-heading font-bold text-foreground">TOPIK 슈퍼앱</span>
          </div>
          <p className="text-muted-foreground text-sm">
            © 2025 LUKATO. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-muted-foreground hover:text-foreground text-sm">이용약관</a>
            <a href="#" className="text-muted-foreground hover:text-foreground text-sm">개인정보</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
