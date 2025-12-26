import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import StickyCTA from "@/components/StickyCTA";
import {
  ArrowRight,
  BookOpen,
  Headphones,
  PenTool,
  Gamepad2,
  MessageCircle,
  Heart,
  Music,
  Film,
  Briefcase,
  ChevronDown,
  Star,
  Zap,
  Users,
  Check,
  Mic,
  Brain,
  Shield,
  Crown,
  Target,
  Rocket,
  Lock,
  Trophy,
  Cpu,
  Flame,
  Swords,
} from "lucide-react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";

// University partner logos - Vietnam
import hanuLogo from "@/assets/universities/hanu.png";
import dainamLogo from "@/assets/universities/dainam.png";
import thanglongLogo from "@/assets/universities/thanglong.png";
import phenikaaLogo from "@/assets/universities/phenikaa.png";
import netcLogo from "@/assets/universities/netc.png";
import ptitLogo from "@/assets/universities/ptit.png";
// University partner logos - Korea & China
import yonseiLogo from "@/assets/universities/yonsei.png";
import chsuLogo from "@/assets/universities/chsu.png";
import doowonLogo from "@/assets/universities/doowon.jpg";
import knutLogo from "@/assets/universities/knut.png";
import pekingLogo from "@/assets/universities/peking.png";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";

const partnerUniversities = [
  { name: "Yonsei", logo: yonseiLogo },
  { name: "Peking", logo: pekingLogo },
  { name: "CHSU", logo: chsuLogo },
  { name: "Doowon", logo: doowonLogo },
  { name: "KNUT", logo: knutLogo },
  { name: "HANU", logo: hanuLogo },
  { name: "Đại Nam", logo: dainamLogo },
  { name: "Thăng Long", logo: thanglongLogo },
  { name: "Phenikaa", logo: phenikaaLogo },
  { name: "NETC", logo: netcLogo },
  { name: "PTIT", logo: ptitLogo },
];

// Key differentiators - will be translated via t()
const getKeyDifferentiators = (t: (key: string) => string) => [
  {
    icon: Crown,
    title: t("landing.why.item1Title"),
    desc: t("landing.why.item1Desc"),
    color: "from-korean-red to-korean-orange",
  },
  {
    icon: Cpu,
    title: t("landing.why.item2Title"),
    desc: t("landing.why.item2Desc"),
    color: "from-korean-blue to-korean-cyan",
  },
  {
    icon: Headphones,
    title: t("landing.why.item3Title"),
    desc: t("landing.why.item3Desc"),
    color: "from-korean-purple to-korean-pink",
  },
  {
    icon: Briefcase,
    title: t("landing.why.item4Title"),
    desc: t("landing.why.item4Desc"),
    color: "from-korean-teal to-korean-green",
  },
];

// Core features - will be translated via t()
const getCoreFeatures = (t: (key: string) => string) => [
  { icon: Headphones, title: t("landing.features.listen"), stat: "500+", color: "from-korean-blue to-korean-cyan" },
  { icon: BookOpen, title: t("landing.features.read"), stat: "1,000+", color: "from-korean-teal to-korean-green" },
  { icon: PenTool, title: t("landing.features.write"), stat: "AI 24/7", color: "from-korean-purple to-korean-indigo" },
  { icon: Mic, title: t("landing.features.speak"), stat: "99%", color: "from-korean-pink to-korean-red" },
];

// Game modes - will be translated via t()
const getGameModes = (t: (key: string) => string) => [
  { icon: MessageCircle, name: t("landing.games.survival"), color: "from-korean-red to-korean-orange", badge: "Hot" },
  { icon: Heart, name: t("landing.games.dating"), color: "from-korean-pink to-korean-red", badge: t("landing.games.badgeNew") },
  { icon: Gamepad2, name: t("landing.games.wordChain"), color: "from-korean-blue to-korean-purple", badge: null },
  { icon: Music, name: t("landing.games.kpopQuiz"), color: "from-korean-purple to-korean-pink", badge: "⭐" },
  { icon: Film, name: t("landing.games.dubbing"), color: "from-korean-orange to-korean-yellow", badge: null },
  { icon: Briefcase, name: t("landing.games.partTime"), color: "from-korean-teal to-korean-green", badge: null },
];

// Comparison with competitors - will be translated via t()
const getComparisonFeatures = (t: (key: string) => string) => [
  { feature: t("landing.comparison.feature1"), lukato: true, others: false },
  { feature: t("landing.comparison.feature2"), lukato: true, others: false },
  { feature: t("landing.comparison.feature3"), lukato: true, others: false },
  { feature: t("landing.comparison.feature4"), lukato: true, others: false },
  { feature: t("landing.comparison.feature5"), lukato: true, others: false },
  { feature: t("landing.comparison.feature6"), lukato: true, others: false },
  { feature: t("landing.comparison.feature7"), lukato: true, others: false },
];

// Counter animation component
const AnimatedCounter = ({ target, suffix = "", duration = 2 }: { target: number | string; suffix?: string; duration?: number }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!isInView) return;

    const numericTarget = typeof target === "string" ? parseFloat(target.replace(/[^0-9.]/g, "")) : target;
    if (isNaN(numericTarget)) return;

    const startTime = Date.now();
    const endTime = startTime + duration * 1000;

    const updateCount = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / (duration * 1000), 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(easeOut * numericTarget);
      setCount(current);

      if (now < endTime) {
        requestAnimationFrame(updateCount);
      } else {
        setCount(numericTarget);
      }
    };

    requestAnimationFrame(updateCount);
  }, [isInView, target, duration]);

  if (typeof target === "string" && target.includes("#")) {
    return <span ref={ref}>{target}</span>;
  }

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
};

const Landing = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isLoaded, setIsLoaded] = useState(false);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.98]);

  // Get translated data
  const keyDifferentiators = getKeyDifferentiators(t);
  const coreFeatures = getCoreFeatures(t);
  const gameModes = getGameModes(t);
  const comparisonFeatures = getComparisonFeatures(t);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
    setTimeout(() => setIsLoaded(true), 100);
  }, [navigate]);

  return (
    <div className="min-h-[100dvh] bg-background relative overflow-x-hidden flex flex-col">
      <CleanHeader />

      {/* ========== HERO SECTION ========== */}
      <motion.section
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="min-h-[90dvh] md:min-h-[100dvh] flex flex-col items-center justify-center px-4 sm:px-6 pt-20 pb-12 relative overflow-hidden"
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="blob-primary w-[600px] h-[600px] -top-40 -right-32" />
          <div className="blob-secondary w-[400px] h-[400px] -bottom-32 -left-32" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : -20 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center justify-center gap-2 mb-4 sm:mb-6"
          >
            <div className="badge-premium text-xs sm:text-sm">
              <Crown className="w-3 h-3 sm:w-4 sm:h-4 text-korean-yellow" />
              <span>{t("landing.hero.badge")}</span>
            </div>
          </motion.div>

          {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 30 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="font-heading font-black text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-tight tracking-tight mb-4"
            >
              <span className="text-foreground">{t("landing.hero.headline1")}</span>
              <br />
              <span className="text-gradient-primary">{t("landing.hero.headline2")}</span>
            </motion.h1>

          {/* Sub-headline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="text-muted-foreground text-xs sm:text-sm md:text-base max-w-xl mx-auto mb-6 px-2"
            >
              {t("landing.hero.sub1")}
              <br />
              <span className="text-primary font-semibold">{t("landing.hero.sub2a")}</span> +{" "}
              <span className="text-primary font-semibold">{t("landing.hero.sub2b")}</span>
            </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8"
          >
            <Button
              onClick={() => navigate("/auth")}
              size="lg"
              className="group w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-10 btn-primary text-primary-foreground text-base sm:text-lg font-bold rounded-xl sm:rounded-2xl"
            >
              <Rocket className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              {t("landing.hero.cta")}
              <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 0.7 : 0 }}
          transition={{ delay: 1 }}
          onClick={() => document.getElementById("universities")?.scrollIntoView({ behavior: "smooth" })}
          className="absolute bottom-4 left-1/2 -translate-x-1/2"
        >
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          </motion.div>
        </motion.button>
      </motion.section>


      <section id="universities" className="py-10 sm:py-16 px-4 sm:px-6 bg-muted/30 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-6 sm:mb-8"
          >
             <p className="text-xs sm:text-sm text-muted-foreground mb-2">{t("landing.universities.partner")}</p>
             <h2 className="font-heading font-bold text-xl sm:text-2xl md:text-3xl text-foreground mb-2">
               <span className="text-gradient-primary">{t("landing.universities.titleHighlight")}</span> {t("landing.universities.titleRest")}
             </h2>
             <p className="text-sm text-muted-foreground">
               {t("landing.universities.desc")}
             </p>
          </motion.div>
          
          {/* Horizontal sliding carousel */}
          <div className="relative">
            <motion.div
              animate={{ x: [0, -1400, 0] }}
              transition={{ 
                duration: 25, 
                repeat: Infinity, 
                ease: "linear"
              }}
              className="flex gap-4 sm:gap-6"
            >
              {/* Duplicate for seamless loop */}
              {[...partnerUniversities, ...partnerUniversities].map((uni, i) => (
                <motion.div
                  key={`${uni.name}-${i}`}
                  whileHover={{ scale: 1.1, y: -4 }}
                  className="group flex flex-col items-center flex-shrink-0"
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-white rounded-xl p-2 shadow-md group-hover:shadow-xl transition-all duration-300 flex items-center justify-center border border-border/20 group-hover:border-primary/40">
                    <img src={uni.logo} alt={uni.name} className="w-full h-full object-contain" />
                  </div>
                  <span className="mt-2 text-[10px] sm:text-xs text-muted-foreground group-hover:text-foreground text-center">
                    {uni.name}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ========== STATS SECTION WITH ANIMATED COUNTERS ========== */}
      <section className="py-10 sm:py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0 }}
              className="floating-card p-3 sm:p-6 text-center group"
            >
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              >
                <Users className="w-5 h-5 sm:w-8 sm:h-8 mx-auto mb-1.5 sm:mb-3 text-primary group-hover:scale-110 transition-transform" />
              </motion.div>
              <div className="font-black text-lg sm:text-2xl md:text-3xl text-gradient-primary mb-0.5 sm:mb-1">
                <AnimatedCounter target={50000} suffix="+" duration={2.5} />
              </div>
              <div className="text-muted-foreground text-[10px] sm:text-xs">{t("landing.stats.students")}</div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="floating-card p-3 sm:p-6 text-center group"
            >
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
              >
                <Cpu className="w-5 h-5 sm:w-8 sm:h-8 mx-auto mb-1.5 sm:mb-3 text-korean-purple group-hover:scale-110 transition-transform" />
              </motion.div>
              <div className="font-black text-lg sm:text-2xl md:text-3xl text-gradient-secondary mb-0.5 sm:mb-1">
                <AnimatedCounter target={99.7} suffix="%" duration={2} />
              </div>
              <div className="text-muted-foreground text-[10px] sm:text-xs">{t("landing.stats.aiAccuracy")}</div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="floating-card p-3 sm:p-6 text-center group"
            >
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
              >
                <Trophy className="w-5 h-5 sm:w-8 sm:h-8 mx-auto mb-1.5 sm:mb-3 text-korean-yellow group-hover:scale-110 transition-transform" />
              </motion.div>
              <div className="font-black text-lg sm:text-2xl md:text-3xl text-korean-yellow mb-0.5 sm:mb-1">
                #1
              </div>
              <div className="text-muted-foreground text-[10px] sm:text-xs">{t("landing.stats.topikApp")}</div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="floating-card p-3 sm:p-6 text-center group"
            >
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 200, delay: 0.5 }}
              >
                <Zap className="w-5 h-5 sm:w-8 sm:h-8 mx-auto mb-1.5 sm:mb-3 text-korean-green group-hover:scale-110 transition-transform" />
              </motion.div>
              <div className="font-black text-lg sm:text-2xl md:text-3xl text-korean-green mb-0.5 sm:mb-1">
                24/7
              </div>
              <div className="text-muted-foreground text-[10px] sm:text-xs">{t("landing.stats.aiSupport")}</div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ========== WHY DIFFERENT - COMPACT ========== */}
      <section id="why-different" className="py-10 sm:py-16 px-4 sm:px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8 sm:mb-10"
          >
            <h2 className="font-heading font-bold text-2xl sm:text-3xl md:text-4xl text-foreground">
              {t("landing.why.title")}
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {keyDifferentiators.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -4 }}
                className="premium-card p-4 sm:p-5 text-center group cursor-pointer"
              >
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                  <item.icon className="w-6 h-6 sm:w-7 sm:h-7 text-primary-foreground" />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-foreground mb-1">{item.title}</h3>
                <p className="text-muted-foreground text-xs sm:text-sm leading-snug whitespace-pre-line">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== COMPARISON - COMPACT ========== */}
      <section className="py-10 sm:py-16 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center font-heading font-bold text-xl sm:text-2xl text-foreground mb-6"
          >
            LUKATO vs <span className="text-muted-foreground">{t("landing.comparison.others")}</span>
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="premium-card overflow-hidden"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-3 sm:px-4 text-foreground">{t("landing.comparison.feature")}</th>
                  <th className="py-3 px-2 text-primary text-center">
                    <Crown className="w-4 h-4 mx-auto text-korean-yellow" />
                  </th>
                  <th className="py-3 px-2 text-muted-foreground text-center text-xs">{t("landing.comparison.others")}</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((row) => (
                  <tr key={row.feature} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 px-3 sm:px-4 text-foreground text-xs sm:text-sm">{row.feature}</td>
                    <td className="py-2.5 px-2 text-center">
                      <Check className="w-4 h-4 mx-auto text-korean-green" />
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <Lock className="w-3 h-3 mx-auto text-muted-foreground" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>

      {/* ========== CHALLENGE SECTION - 도발적 자신감 ========== */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 relative overflow-hidden">
        {/* Aggressive background */}
        <div className="absolute inset-0 bg-gradient-to-br from-korean-red/5 via-background to-korean-orange/5" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-korean-red via-korean-orange to-korean-yellow" />
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-korean-yellow via-korean-orange to-korean-red" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative z-10 max-w-4xl mx-auto text-center"
        >
          {/* Competitor vs LUKATO Visual */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative flex items-center justify-center gap-3 sm:gap-6 mb-8"
          >
            {/* Blurred competitors - left side */}
            <div className="flex items-center gap-2 sm:gap-3">
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={`left-${i}`}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="relative"
                >
                  <div 
                    className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl bg-muted/60 backdrop-blur-sm border border-border/30 flex items-center justify-center opacity-40 grayscale"
                    style={{ filter: `blur(${(4 - i) * 0.5}px)` }}
                  >
                    <span className="text-lg sm:text-xl opacity-50">
                      {i === 1 ? '📚' : i === 2 ? '🎧' : '📝'}
                    </span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-muted-foreground/30 flex items-center justify-center">
                    <span className="text-[8px] sm:text-[10px]">?</span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* LUKATO - center, glowing */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              whileInView={{ scale: 1, rotate: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
              className="relative z-10"
            >
              {/* Glow effect */}
              <div className="absolute inset-0 w-16 h-16 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-korean-red to-korean-orange blur-xl opacity-60 animate-pulse" />
              
              {/* Main logo container */}
              <div className="relative w-16 h-16 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-korean-red via-korean-orange to-korean-yellow flex items-center justify-center shadow-2xl border-2 border-white/20">
                <div className="text-center">
                  <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-white mx-auto mb-0.5" />
                  <span className="text-[10px] sm:text-xs font-black text-white tracking-tight">LUKATO</span>
                </div>
              </div>
              
              {/* Crown on top */}
              <motion.div
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-2 sm:-top-3 left-1/2 -translate-x-1/2"
              >
                <span className="text-lg sm:text-xl">👑</span>
              </motion.div>
            </motion.div>

            {/* Blurred competitors - right side */}
            <div className="flex items-center gap-2 sm:gap-3">
              {[3, 2, 1].map((i) => (
                <motion.div
                  key={`right-${i}`}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="relative"
                >
                  <div 
                    className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl bg-muted/60 backdrop-blur-sm border border-border/30 flex items-center justify-center opacity-40 grayscale"
                    style={{ filter: `blur(${(4 - i) * 0.5}px)` }}
                  >
                    <span className="text-lg sm:text-xl opacity-50">
                      {i === 1 ? '🎓' : i === 2 ? '💬' : '🏫'}
                    </span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-muted-foreground/30 flex items-center justify-center">
                    <span className="text-[8px] sm:text-[10px]">?</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Main challenge headline */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-heading font-black text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-foreground mb-4 leading-tight"
          >
            {t("landing.challenge.headline1")}
            <br />
            <span className="text-gradient-primary">{t("landing.challenge.headline2")}</span>
          </motion.h2>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-sm sm:text-base md:text-lg mb-8 max-w-xl mx-auto leading-relaxed"
          >
            {t("landing.challenge.subtitle")}
            <br className="hidden sm:block" />
            <span className="text-foreground font-semibold">{t("landing.challenge.line1")}</span>
            <br className="hidden sm:block" />
            <span className="text-foreground font-semibold">{t("landing.challenge.line2")}</span>
          </motion.p>

          {/* Challenge points */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8"
          >
            <div className="p-4 rounded-xl bg-card/80 border border-korean-red/20 backdrop-blur-sm">
              <div className="text-2xl mb-2">🎯</div>
              <p className="text-xs sm:text-sm text-foreground font-medium">{t("landing.challenge.point1Title")}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{t("landing.challenge.point1Desc")}</p>
            </div>
            <div className="p-4 rounded-xl bg-card/80 border border-korean-orange/20 backdrop-blur-sm">
              <div className="text-2xl mb-2">🤖</div>
              <p className="text-xs sm:text-sm text-foreground font-medium">{t("landing.challenge.point2Title")}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{t("landing.challenge.point2Desc")}</p>
            </div>
            <div className="p-4 rounded-xl bg-card/80 border border-korean-yellow/20 backdrop-blur-sm">
              <div className="text-2xl mb-2">🎮</div>
              <p className="text-xs sm:text-sm text-foreground font-medium">{t("landing.challenge.point3Title")}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{t("landing.challenge.point3Desc")}</p>
            </div>
          </motion.div>

          {/* Final challenge statement */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-korean-red/10 via-korean-orange/10 to-korean-yellow/10 border border-korean-orange/30"
          >
            <Swords className="w-4 h-4 sm:w-5 sm:h-5 text-korean-orange" />
            <span className="text-sm sm:text-base font-bold text-foreground">
              {t("landing.challenge.final")}
            </span>
          </motion.div>
        </motion.div>
      </section>

      {/* ========== HEADHUNTING PROMO BANNER - PREMIUM DESIGN ========== */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 relative overflow-hidden">
        {/* Premium background decorations */}
        <div className="absolute inset-0 bg-gradient-to-br from-korean-yellow/5 via-background to-korean-blue/5" />
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-korean-yellow via-korean-orange to-korean-blue" />
        <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r from-korean-blue via-korean-purple to-korean-yellow" />
        
        <div className="max-w-4xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl shadow-2xl"
          >
            {/* Premium Gold/Blue gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-korean-yellow via-korean-orange to-korean-blue" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.25),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(0,0,0,0.1),transparent_50%)]" />
            
            {/* Animated sparkles */}
            <div className="absolute top-4 right-4 sm:top-8 sm:right-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="text-2xl sm:text-3xl"
              >
                ✨
              </motion.div>
            </div>
            <div className="absolute bottom-4 left-4 sm:bottom-8 sm:left-8">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-xl sm:text-2xl"
              >
                🌟
              </motion.div>
            </div>
            
            <div className="relative z-10 p-6 sm:p-10 lg:p-12 flex flex-col lg:flex-row items-center gap-6 lg:gap-10">
              {/* Premium Icon */}
              <div className="flex-shrink-0">
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="relative"
                >
                  {/* Glow effect */}
                  <div className="absolute inset-0 w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white/40 blur-xl" />
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-white to-white/80 flex items-center justify-center shadow-2xl border-2 border-white/50">
                    <div className="text-center">
                      <Briefcase className="w-10 h-10 sm:w-12 sm:h-12 text-korean-blue mx-auto mb-1" />
                      <span className="text-[10px] sm:text-xs font-black text-korean-blue tracking-tight">CAREER</span>
                    </div>
                  </div>
                  {/* Crown on top */}
                  <motion.div
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -top-3 left-1/2 -translate-x-1/2"
                  >
                    <span className="text-2xl">👑</span>
                  </motion.div>
                </motion.div>
              </div>
              
              {/* Content */}
              <div className="flex-1 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/30 backdrop-blur-sm text-white text-xs sm:text-sm font-bold mb-4 border border-white/40">
                  <Crown className="w-4 h-4 text-korean-yellow" />
                  <span>{t("landing.headhunting.badge")}</span>
                </div>
                <h3 className="font-heading font-black text-2xl sm:text-3xl lg:text-4xl text-white mb-3 leading-tight">
                  {t("landing.headhunting.title1")}
                  <br />
                  <span className="text-korean-yellow drop-shadow-lg">{t("landing.headhunting.title2")}</span>
                </h3>
                <p className="text-white/90 text-sm sm:text-base lg:text-lg mb-5 leading-relaxed">
                  {t("landing.headhunting.desc1")} <strong className="text-white">{t("landing.headhunting.free")}</strong>.
                  <br className="hidden sm:block" />
                  {t("landing.headhunting.desc2")}
                </p>
                <div className="flex flex-wrap justify-center lg:justify-start gap-2 text-xs sm:text-sm text-white mb-5">
                  <span className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full">
                    <Check className="w-3.5 h-3.5 text-korean-green" /> 
                    <span className="font-semibold">{t("landing.headhunting.tag1")}</span>
                  </span>
                  <span className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full">
                    <Check className="w-3.5 h-3.5 text-korean-green" /> 
                    <span className="font-semibold">{t("landing.headhunting.tag2")}</span>
                  </span>
                  <span className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full">
                    <Check className="w-3.5 h-3.5 text-korean-green" /> 
                    <span className="font-semibold">{t("landing.headhunting.tag3")}</span>
                  </span>
                </div>
              </div>
              
              {/* Premium CTA */}
              <div className="flex-shrink-0 w-full lg:w-auto">
                <Button
                  onClick={() => navigate("/headhunting")}
                  size="lg"
                  className="w-full lg:w-auto h-12 sm:h-14 px-6 sm:px-8 bg-white hover:bg-white/95 text-korean-blue font-black text-sm sm:text-base rounded-xl group shadow-2xl border-2 border-white/50 hover:scale-105 transition-all duration-300"
                >
                  <Rocket className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  {t("landing.headhunting.cta")}
                  <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <p className="text-white/80 text-[10px] sm:text-xs text-center mt-1.5 font-medium">
                  {t("landing.headhunting.ctaSub")}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ========== FEATURES - COMPACT ========== */}
      <section id="features" className="py-10 sm:py-16 px-4 sm:px-6 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-6 sm:mb-8"
          >
            <span className="badge-secondary text-xs mb-3">
              <Brain className="w-3 h-3" />
              LUKATO AI
            </span>
            <h2 className="font-heading font-bold text-2xl sm:text-3xl text-foreground">
              {t("landing.features.title")} <span className="text-gradient-secondary">{t("landing.features.skills")}</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {coreFeatures.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -4 }}
                className="premium-card p-4 text-center group"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-bold text-sm text-foreground">{feature.title}</h3>
                <p className="text-lg font-black text-gradient-primary">{feature.stat}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== GAMES - COMPACT ========== */}
      <section id="games" className="py-10 sm:py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-6 sm:mb-8"
          >
            <span className="badge-premium text-xs mb-3">
              <Gamepad2 className="w-3 h-3" />
              K-Culture
            </span>
            <h2 className="font-heading font-bold text-2xl sm:text-3xl text-foreground">
              K-POP · K-Drama · <span className="text-gradient-primary">{t("landing.games.korean")}</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {gameModes.map((game, i) => (
              <motion.div
                key={game.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -4, scale: 1.02 }}
                className="premium-card p-3 sm:p-4 text-center group cursor-pointer relative"
              >
                {game.badge && (
                  <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full">
                    {game.badge}
                  </div>
                )}
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${game.color} flex items-center justify-center mx-auto mb-2 shadow-md group-hover:scale-110 transition-transform`}>
                  <game.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
                </div>
                <h3 className="font-bold text-xs sm:text-sm text-foreground">{game.name}</h3>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== TESTIMONIAL - HORIZONTAL SLIDING ========== */}
      <TestimonialsSection t={t} />

      {/* ========== PRICING - COMPACT ========== */}
      <section id="pricing" className="py-10 sm:py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-6 sm:mb-8"
          >
            <h2 className="font-heading font-bold text-2xl sm:text-3xl text-foreground mb-2">
              {t("landing.pricing.title1")} <span className="text-gradient-secondary">{t("landing.pricing.title2")}</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 gap-4 sm:gap-6 max-w-xl mx-auto items-stretch">
            {/* Free */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="premium-card p-4 sm:p-6 text-center flex flex-col justify-between min-h-[180px] sm:min-h-[200px]"
            >
              <div>
                <h3 className="font-bold text-base sm:text-lg text-foreground">{t("landing.pricing.free")}</h3>
                <div className="text-2xl sm:text-3xl font-black text-foreground my-2">$0</div>
                <p className="text-muted-foreground text-xs sm:text-sm mb-4">{t("landing.pricing.forever")}</p>
              </div>
              <Button variant="outline" size="sm" className="w-full text-sm rounded-lg" onClick={() => navigate("/auth")}>
                {t("landing.pricing.start")}
              </Button>
            </motion.div>

            {/* Premium */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="premium-card p-4 sm:p-6 text-center border-2 border-primary/50 relative overflow-visible flex flex-col justify-between min-h-[180px] sm:min-h-[200px]"
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full whitespace-nowrap z-10">
                HOT
              </div>
              <div className="pt-2">
                <h3 className="font-bold text-base sm:text-lg text-foreground">Premium</h3>
                <div className="text-2xl sm:text-3xl font-black text-gradient-primary my-2">$9.99</div>
                <p className="text-muted-foreground text-xs sm:text-sm mb-4">/{t("landing.pricing.month")}</p>
              </div>
              <Button size="sm" className="w-full text-sm rounded-lg btn-primary text-primary-foreground" onClick={() => navigate("/pricing")}>
                {t("landing.pricing.upgrade")}
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ========== FINAL CTA ========== */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 bg-muted/30">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-xl mx-auto text-center"
        >
          <h2 className="font-heading font-bold text-2xl sm:text-3xl md:text-4xl text-foreground mb-4">
            <span className="text-gradient-primary">{t("landing.finalCta.title1")}</span> {t("landing.finalCta.title2")}!
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base mb-6">
            {t("landing.finalCta.desc")} <span className="text-foreground font-semibold">{t("landing.finalCta.noRival")}</span>
          </p>
          <Button
            onClick={() => navigate("/auth")}
            size="lg"
            className="group h-12 sm:h-14 px-8 sm:px-10 btn-primary text-primary-foreground text-base sm:text-lg font-bold rounded-xl sm:rounded-2xl"
          >
            <Rocket className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            {t("landing.finalCta.cta")}
            <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </motion.div>
      </section>

      <AppFooter />
      
      {/* Sticky CTA for Mobile */}
      <StickyCTA />
    </div>
  );
};

export default Landing;
