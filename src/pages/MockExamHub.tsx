import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { 
  BookOpen, 
  Headphones, 
  PenTool,
  Mic,
  Clock,
  Target,
  Trophy,
  Brain,
  Zap,
  ChevronRight,
  Play,
  BarChart3,
  BookMarked,
  Sparkles,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  FileText,
  Volume2,
  ArrowRight,
  Star,
  Crown,
  Flame
} from "lucide-react";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";
import { PremiumPreviewBanner } from "@/components/PremiumPreviewBanner";

// 3D 틸트 카드 컴포넌트
const TiltCard = ({ 
  children, 
  className,
  glowColor = "primary"
}: { 
  children: React.ReactNode; 
  className?: string;
  glowColor?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);
  
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateY,
        rotateX,
        transformStyle: "preserve-3d",
      }}
      className={cn("relative", className)}
    >
      <div 
        style={{ transform: "translateZ(75px)", transformStyle: "preserve-3d" }}
        className="relative"
      >
        {children}
      </div>
    </motion.div>
  );
};

// 파티클 배경
const FloatingParticles = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(50)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-primary/30"
          initial={{
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
            y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
            scale: Math.random() * 0.5 + 0.5,
          }}
          animate={{
            y: [null, Math.random() * -500],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: Math.random() * 10 + 10,
            repeat: Infinity,
            ease: "linear",
            delay: Math.random() * 5,
          }}
        />
      ))}
    </div>
  );
};

// 글로우 오브
const GlowOrb = ({ className, color }: { className?: string; color: string }) => (
  <div 
    className={cn(
      "absolute rounded-full blur-3xl opacity-20 animate-pulse",
      className
    )}
    style={{ background: color }}
  />
);

const MockExamHub = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isPremium, loading } = useSubscription();
  const [selectedExam, setSelectedExam] = useState<string>("topik1");
  const [selectedMode, setSelectedMode] = useState<string>("full");
  const [showModeDialog, setShowModeDialog] = useState(false);
  const [hoveredExam, setHoveredExam] = useState<string | null>(null);
  const [hoveredMode, setHoveredMode] = useState<string | null>(null);

  const examTypes = [
    {
      id: "topik1",
      titleKey: "mockExam.examTypes.topik1.title",
      subtitleKey: "mockExam.examTypes.topik1.subtitle",
      descriptionKey: "mockExam.examTypes.topik1.description",
      gradient: "from-emerald-400 via-teal-500 to-cyan-600",
      glowColor: "#10b981",
      icon: GraduationCap,
      sections: [
        { nameKey: "mockExam.sections.listening", questions: 30, time: 40, icon: Headphones },
        { nameKey: "mockExam.sections.reading", questions: 40, time: 60, icon: BookOpen }
      ],
      totalTime: 100,
      totalQuestions: 70,
      level: "1-2급"
    },
    {
      id: "topik2",
      titleKey: "mockExam.examTypes.topik2.title",
      subtitleKey: "mockExam.examTypes.topik2.subtitle",
      descriptionKey: "mockExam.examTypes.topik2.description",
      gradient: "from-violet-400 via-purple-500 to-indigo-600",
      glowColor: "#8b5cf6",
      icon: Trophy,
      sections: [
        { nameKey: "mockExam.sections.listening", questions: 50, time: 60, icon: Headphones },
        { nameKey: "mockExam.sections.reading", questions: 50, time: 70, icon: BookOpen },
        { nameKey: "mockExam.sections.writing", questions: 4, time: 50, icon: PenTool }
      ],
      totalTime: 180,
      totalQuestions: 104,
      level: "3-6급"
    },
    {
      id: "eps",
      titleKey: "mockExam.examTypes.eps.title",
      subtitleKey: "mockExam.examTypes.eps.subtitle",
      descriptionKey: "mockExam.examTypes.eps.description",
      gradient: "from-orange-400 via-red-500 to-rose-600",
      glowColor: "#f97316",
      icon: Target,
      sections: [
        { nameKey: "mockExam.sections.listening", questions: 25, time: 25, icon: Headphones },
        { nameKey: "mockExam.sections.reading", questions: 25, time: 25, icon: BookOpen }
      ],
      totalTime: 50,
      totalQuestions: 50,
      level: "고용허가제"
    }
  ];

  const learningModes = [
    {
      id: "full",
      titleKey: "mockExam.modes.full.title",
      descriptionKey: "mockExam.modes.full.description",
      icon: Clock,
      gradient: "from-rose-500 via-pink-500 to-fuchsia-500",
      glowColor: "#f43f5e",
      featureKeys: ["mockExam.modes.full.features.timeLimit", "mockExam.modes.full.features.allQuestions", "mockExam.modes.full.features.realExam"]
    },
    {
      id: "section",
      titleKey: "mockExam.modes.section.title",
      descriptionKey: "mockExam.modes.section.description",
      icon: Target,
      gradient: "from-blue-500 via-cyan-500 to-teal-500",
      glowColor: "#3b82f6",
      featureKeys: ["mockExam.modes.section.features.selectSection", "mockExam.modes.section.features.noTimeLimit", "mockExam.modes.section.features.instantExplanation"]
    },
    {
      id: "part",
      titleKey: "mockExam.modes.part.title",
      descriptionKey: "mockExam.modes.part.description",
      icon: Zap,
      gradient: "from-amber-500 via-orange-500 to-red-500",
      glowColor: "#f59e0b",
      featureKeys: ["mockExam.modes.part.features.typePractice", "mockExam.modes.part.features.repeatLearning", "mockExam.modes.part.features.weaknessImprovement"]
    },
    {
      id: "weakness",
      titleKey: "mockExam.modes.weakness.title",
      descriptionKey: "mockExam.modes.weakness.description",
      icon: Brain,
      gradient: "from-purple-500 via-violet-500 to-indigo-500",
      glowColor: "#a855f7",
      featureKeys: ["mockExam.modes.weakness.features.aiAnalysis", "mockExam.modes.weakness.features.customRecommend", "mockExam.modes.weakness.features.efficientLearning"]
    }
  ];

  const features = [
    {
      icon: Sparkles,
      titleKey: "mockExam.features.aiGeneration.title",
      descriptionKey: "mockExam.features.aiGeneration.description",
      gradient: "from-violet-500 to-purple-600"
    },
    {
      icon: Volume2,
      titleKey: "mockExam.features.multiLanguage.title",
      descriptionKey: "mockExam.features.multiLanguage.description",
      gradient: "from-cyan-500 to-blue-600"
    },
    {
      icon: BarChart3,
      titleKey: "mockExam.features.detailedAnalysis.title",
      descriptionKey: "mockExam.features.detailedAnalysis.description",
      gradient: "from-emerald-500 to-teal-600"
    },
    {
      icon: BookMarked,
      titleKey: "mockExam.features.smartMistakeNote.title",
      descriptionKey: "mockExam.features.smartMistakeNote.description",
      gradient: "from-amber-500 to-orange-600"
    }
  ];

  const tutorialSteps = [
    { step: 1, titleKey: "mockExam.tutorial.step1.title", descriptionKey: "mockExam.tutorial.step1.description" },
    { step: 2, titleKey: "mockExam.tutorial.step2.title", descriptionKey: "mockExam.tutorial.step2.description" },
    { step: 3, titleKey: "mockExam.tutorial.step3.title", descriptionKey: "mockExam.tutorial.step3.description" },
    { step: 4, titleKey: "mockExam.tutorial.step4.title", descriptionKey: "mockExam.tutorial.step4.description" },
    { step: 5, titleKey: "mockExam.tutorial.step5.title", descriptionKey: "mockExam.tutorial.step5.description" }
  ];

  const selectedExamData = examTypes.find(e => e.id === selectedExam);

  const handleStartExam = () => {
    if (!isPremium) {
      navigate("/pricing");
      return;
    }
    
    if (selectedMode === 'section') {
      setShowModeDialog(true);
    } else {
      navigate(`/mock-exam/${selectedExam}?mode=${selectedMode}`);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* 배경 효과 */}
      <div className="fixed inset-0 pointer-events-none">
        <GlowOrb className="w-[800px] h-[800px] -top-40 -left-40" color="rgba(139, 92, 246, 0.15)" />
        <GlowOrb className="w-[600px] h-[600px] top-1/2 -right-20" color="rgba(236, 72, 153, 0.1)" />
        <GlowOrb className="w-[500px] h-[500px] bottom-0 left-1/3" color="rgba(34, 211, 238, 0.1)" />
        <FloatingParticles />
        {/* 그리드 패턴 */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      <CleanHeader />
      
      <main className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        {/* Premium Preview Banner */}
        {!loading && !isPremium && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <PremiumPreviewBanner featureName={t('mockExam.featureName')} />
          </motion.div>
        )}

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16 pt-8"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Badge className="mb-6 px-6 py-2 text-sm font-medium bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 border border-primary/30 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
              {t('mockExam.badge')}
            </Badge>
          </motion.div>
          
          <motion.h1 
            className="text-5xl md:text-7xl font-black mb-6 tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
              {t('mockExam.title')}
            </span>
          </motion.h1>
          
          <motion.p 
            className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {t('mockExam.subtitle')}
          </motion.p>

          {/* 통계 카운터 */}
          <motion.div 
            className="flex justify-center gap-12 mt-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {[
              { value: "10,000+", label: "문제 보유" },
              { value: "AI", label: "실시간 분석" },
              { value: "7개국", label: "언어 지원" }
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Exam Type Selection */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-20"
        >
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">{t('mockExam.selectExamType')}</h2>
            <p className="text-muted-foreground">목표에 맞는 시험을 선택하세요</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8" style={{ perspective: "1000px" }}>
            {examTypes.map((exam, index) => (
              <TiltCard key={exam.id}>
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  whileHover={{ scale: 1.02 }}
                  onHoverStart={() => setHoveredExam(exam.id)}
                  onHoverEnd={() => setHoveredExam(null)}
                  onClick={() => setSelectedExam(exam.id)}
                  className={cn(
                    "relative cursor-pointer rounded-3xl overflow-hidden transition-all duration-500",
                    "bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl",
                    "border border-white/10 hover:border-white/20",
                    selectedExam === exam.id && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}
                >
                  {/* 글로우 효과 */}
                  <div 
                    className={cn(
                      "absolute inset-0 opacity-0 transition-opacity duration-500",
                      hoveredExam === exam.id && "opacity-100"
                    )}
                    style={{
                      background: `radial-gradient(circle at 50% 0%, ${exam.glowColor}40, transparent 70%)`
                    }}
                  />

                  {/* 헤더 */}
                  <div className={cn(
                    "relative p-6 bg-gradient-to-br",
                    exam.gradient
                  )}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                        <exam.icon className="w-8 h-8 text-white" />
                      </div>
                      {selectedExam === exam.id && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="p-2 bg-white/30 backdrop-blur-sm rounded-full"
                        >
                          <CheckCircle2 className="w-5 h-5 text-white" />
                        </motion.div>
                      )}
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-1">{t(exam.titleKey)}</h3>
                    <p className="text-white/80 text-sm">{t(exam.subtitleKey)}</p>
                    <Badge className="mt-3 bg-white/20 text-white border-0 backdrop-blur-sm">
                      {exam.level}
                    </Badge>
                  </div>

                  {/* 바디 */}
                  <div className="p-6">
                    <p className="text-muted-foreground text-sm mb-6">{t(exam.descriptionKey)}</p>
                    
                    <div className="space-y-3">
                      {exam.sections.map((section) => (
                        <motion.div 
                          key={section.nameKey} 
                          className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                          whileHover={{ x: 5 }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <section.icon className="w-4 h-4 text-primary" />
                            </div>
                            <span className="font-medium">{t(section.nameKey)}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {section.questions}문항 / {section.time}분
                          </span>
                        </motion.div>
                      ))}
                    </div>

                    <div className="mt-6 pt-4 border-t border-border/50 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="font-bold">{exam.totalQuestions}문항</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="font-bold">{exam.totalTime}분</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </TiltCard>
            ))}
          </div>
        </motion.section>

        {/* Learning Modes */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-20"
        >
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">{t('mockExam.selectMode')}</h2>
            <p className="text-muted-foreground">학습 스타일에 맞는 모드를 선택하세요</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {learningModes.map((mode, index) => (
              <motion.div
                key={mode.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                whileHover={{ y: -8 }}
                onHoverStart={() => setHoveredMode(mode.id)}
                onHoverEnd={() => setHoveredMode(null)}
                onClick={() => setSelectedMode(mode.id)}
                className={cn(
                  "relative cursor-pointer p-6 rounded-2xl overflow-hidden transition-all duration-300",
                  "bg-card/50 backdrop-blur-sm border border-white/10 hover:border-white/20",
                  selectedMode === mode.id && "ring-2 ring-primary"
                )}
              >
                {/* 호버 글로우 */}
                <motion.div 
                  className="absolute inset-0 opacity-0"
                  animate={{ opacity: hoveredMode === mode.id ? 0.1 : 0 }}
                  style={{ background: `linear-gradient(135deg, ${mode.glowColor}, transparent)` }}
                />

                <div className={cn(
                  "relative w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-gradient-to-br",
                  mode.gradient
                )}>
                  <mode.icon className="w-7 h-7 text-white" />
                </div>

                <h3 className="font-bold text-lg mb-2">{t(mode.titleKey)}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t(mode.descriptionKey)}</p>

                <div className="flex flex-wrap gap-2">
                  {mode.featureKeys.map((featureKey) => (
                    <Badge 
                      key={featureKey} 
                      variant="secondary" 
                      className="text-xs bg-muted/80 hover:bg-muted transition-colors"
                    >
                      {t(featureKey)}
                    </Badge>
                  ))}
                </div>

                {selectedMode === mode.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-4 right-4"
                  >
                    <div className="p-1.5 bg-primary rounded-full">
                      <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
          className="text-center mb-20"
        >
          <motion.button
            onClick={handleStartExam}
            className={cn(
              "relative group px-12 py-5 rounded-full font-bold text-lg text-white overflow-hidden",
              "bg-gradient-to-r from-primary via-purple-500 to-pink-500",
              "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30",
              "transition-all duration-300"
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* 애니메이션 배경 */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-primary"
              animate={{ x: ["0%", "100%", "0%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              style={{ width: "200%" }}
            />
            
            <span className="relative flex items-center gap-3">
              <Play className="w-5 h-5" />
              {isPremium 
                ? `${t(selectedExamData?.titleKey || '')} ${t('mockExam.startButton')}`
                : t('mockExam.upgradeToPremium')
              }
              <motion.span
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ArrowRight className="w-5 h-5" />
              </motion.span>
            </span>
          </motion.button>
        </motion.div>

        {/* Features */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mb-20"
        >
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">{t('mockExam.coreFeatures')}</h2>
            <p className="text-muted-foreground">차원이 다른 학습 경험</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="group relative p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300"
              >
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-gradient-to-br",
                  feature.gradient,
                  "group-hover:scale-110 transition-transform duration-300"
                )}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-2">{t(feature.titleKey)}</h3>
                <p className="text-sm text-muted-foreground">{t(feature.descriptionKey)}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Tutorial Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mb-20"
        >
          <div className="relative p-8 md:p-12 rounded-3xl overflow-hidden bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5 border border-primary/20 backdrop-blur-sm">
            {/* 배경 장식 */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-full blur-3xl" />
            
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{t('mockExam.userGuide.title')}</h2>
                  <p className="text-muted-foreground text-sm">{t('mockExam.userGuide.description')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                {tutorialSteps.map((step, index) => (
                  <motion.div 
                    key={step.step}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="relative text-center"
                  >
                    <motion.div 
                      className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary/25"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                    >
                      {step.step}
                    </motion.div>
                    <h4 className="font-semibold mb-2">{t(step.titleKey)}</h4>
                    <p className="text-xs text-muted-foreground">{t(step.descriptionKey)}</p>
                    
                    {index < tutorialSteps.length - 1 && (
                      <div className="hidden md:block absolute top-6 left-[60%] w-[80%] h-px bg-gradient-to-r from-primary/50 to-transparent" />
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* Important Notice */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mb-12"
        >
          <div className="p-6 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5 backdrop-blur-sm">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-amber-500/20 rounded-xl">
                <AlertCircle className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h3 className="font-bold mb-3 text-amber-600 dark:text-amber-400">{t('mockExam.notice.title')}</h3>
                <ul className="text-sm text-muted-foreground space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <li key={i} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                      <span>{t(`mockExam.notice.item${i}`)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="flex flex-wrap justify-center gap-4"
        >
          {[
            { icon: PenTool, label: t('mockExam.quickLinks.writing'), path: '/writing-correction' },
            { icon: Mic, label: t('mockExam.quickLinks.speaking'), path: '/roleplay-speaking' },
            { icon: TrendingUp, label: t('mockExam.quickLinks.ranking'), path: '/ranking' }
          ].map((link, i) => (
            <motion.button
              key={link.path}
              onClick={() => navigate(link.path)}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-card/50 backdrop-blur-sm border border-white/10 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
            >
              <link.icon className="w-4 h-4" />
              <span>{link.label}</span>
            </motion.button>
          ))}
        </motion.div>

        {/* Section Selection Dialog */}
        <Dialog open={showModeDialog} onOpenChange={setShowModeDialog}>
          <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-white/10">
            <DialogHeader>
              <DialogTitle className="text-xl">{t('mockExam.dialog.title')}</DialogTitle>
              <DialogDescription>{t('mockExam.dialog.description')}</DialogDescription>
            </DialogHeader>
            <div className={cn(
              "grid gap-4 py-4",
              selectedExam === 'topik2' ? "grid-cols-3" : "grid-cols-2"
            )}>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setShowModeDialog(false);
                  navigate(`/mock-exam/${selectedExam}?mode=section&section=listening`);
                }}
                className="h-28 flex flex-col items-center justify-center gap-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 hover:border-blue-500/40 transition-all"
              >
                <Headphones className="w-8 h-8 text-blue-500" />
                <span className="font-medium">{t('mockExam.dialog.listening')}</span>
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setShowModeDialog(false);
                  navigate(`/mock-exam/${selectedExam}?mode=section&section=reading`);
                }}
                className="h-28 flex flex-col items-center justify-center gap-3 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 hover:border-emerald-500/40 transition-all"
              >
                <BookOpen className="w-8 h-8 text-emerald-500" />
                <span className="font-medium">{t('mockExam.dialog.reading')}</span>
              </motion.button>
              {selectedExam === 'topik2' && (
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setShowModeDialog(false);
                    navigate('/writing-correction');
                  }}
                  className="h-28 flex flex-col items-center justify-center gap-3 rounded-xl bg-gradient-to-br from-purple-500/10 to-violet-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-all"
                >
                  <PenTool className="w-8 h-8 text-purple-500" />
                  <span className="font-medium">{t('mockExam.dialog.writing')}</span>
                </motion.button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>

      <AppFooter />
    </div>
  );
};

export default MockExamHub;
