import { useState, useRef, useEffect } from "react";
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
  Flame,
  Loader2,
  X,
} from "lucide-react";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";
import { PremiumPreviewBanner } from "@/components/PremiumPreviewBanner";
import { supabase } from "@/integrations/supabase/client";
import { mapExamTypeToDb } from "@/lib/mockExamDb";
import { analyzeUserWeakness, type WeaknessAnalysis, getWeaknessReasonText } from "@/lib/weaknessAnalyzer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

// 파티클 배경 (경량화)
const FloatingParticles = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-primary/20"
          initial={{
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
            y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
            scale: Math.random() * 0.5 + 0.5,
          }}
          animate={{
            y: [null, Math.random() * -300],
            opacity: [0, 0.8, 0],
          }}
          transition={{
            duration: Math.random() * 8 + 8,
            repeat: Infinity,
            ease: "linear",
            delay: Math.random() * 3,
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
      "absolute rounded-full blur-3xl opacity-15 animate-pulse",
      className
    )}
    style={{ background: color }}
  />
);

const MockExamHub = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isPremium, loading } = useSubscription();

  // 모달 관련 상태
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [selectedExamForStart, setSelectedExamForStart] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<string>("full");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("intermediate");

  // 기존 다이얼로그 상태
  const [showModeDialog, setShowModeDialog] = useState(false);
  const [showPartDialog, setShowPartDialog] = useState(false);
  const [showWeaknessDialog, setShowWeaknessDialog] = useState(false);

  // 약점 분석 상태
  const [weaknessAnalysis, setWeaknessAnalysis] = useState<WeaknessAnalysis | null>(null);
  const [loadingWeakness, setLoadingWeakness] = useState(false);

  // 섹션/파트 가용성 (DB 기반)
  const [availableSectionCounts, setAvailableSectionCounts] = useState<Record<string, number>>({});

  // 파트 목록
  const [availableParts, setAvailableParts] = useState<{ partNumber: number; section: string; count: number }[]>([]);

  const examTypes = [
    {
      id: "topik1",
      titleKey: "mockExam.examTypes.topik1.title",
      subtitleKey: "mockExam.examTypes.topik1.subtitle",
      descriptionKey: "mockExam.examTypes.topik1.description",
      gradient: "from-emerald-400 via-teal-500 to-cyan-600",
      bgGradient: "from-emerald-500/10 via-teal-500/5 to-transparent",
      glowColor: "#10b981",
      icon: GraduationCap,
      emoji: "📗",
      sections: [
        { nameKey: "mockExam.sections.listening", questions: 30, time: 40, icon: Headphones },
        { nameKey: "mockExam.sections.reading", questions: 40, time: 60, icon: BookOpen }
      ],
      totalTime: 100,
      totalQuestions: 70,
      level: "1-2급",
      popular: true
    },
    {
      id: "topik2",
      titleKey: "mockExam.examTypes.topik2.title",
      subtitleKey: "mockExam.examTypes.topik2.subtitle",
      descriptionKey: "mockExam.examTypes.topik2.description",
      gradient: "from-violet-400 via-purple-500 to-indigo-600",
      bgGradient: "from-violet-500/10 via-purple-500/5 to-transparent",
      glowColor: "#8b5cf6",
      icon: Trophy,
      emoji: "📘",
      sections: [
        { nameKey: "mockExam.sections.listening", questions: 50, time: 60, icon: Headphones },
        { nameKey: "mockExam.sections.reading", questions: 50, time: 70, icon: BookOpen },
        { nameKey: "mockExam.sections.writing", questions: 4, time: 50, icon: PenTool }
      ],
      totalTime: 180,
      totalQuestions: 104,
      level: "3-6급",
      popular: false
    },
    {
      id: "eps",
      titleKey: "mockExam.examTypes.eps.title",
      subtitleKey: "mockExam.examTypes.eps.subtitle",
      descriptionKey: "mockExam.examTypes.eps.description",
      gradient: "from-orange-400 via-red-500 to-rose-600",
      bgGradient: "from-orange-500/10 via-red-500/5 to-transparent",
      glowColor: "#f97316",
      icon: Target,
      emoji: "📙",
      sections: [
        { nameKey: "mockExam.sections.listening", questions: 25, time: 25, icon: Headphones },
        { nameKey: "mockExam.sections.reading", questions: 25, time: 25, icon: BookOpen }
      ],
      totalTime: 50,
      totalQuestions: 50,
      level: t("mockExam.examTypes.eps.level", "고용허가제"),
      popular: false,
      comingSoon: true
    }
  ];

  const learningModes = [
    {
      id: "full",
      titleKey: "mockExam.modes.full.title",
      shortTitle: t("mockExam.modes.full.shortTitle", "실전 모의고사"),
      descriptionKey: "mockExam.modes.full.description",
      icon: Clock,
      gradient: "from-rose-500 to-pink-600",
      glowColor: "#f43f5e"
    },
    {
      id: "section",
      titleKey: "mockExam.modes.section.title",
      shortTitle: t("mockExam.modes.section.shortTitle", "영역별 연습"),
      descriptionKey: "mockExam.modes.section.description",
      icon: Target,
      gradient: "from-blue-500 to-cyan-600",
      glowColor: "#3b82f6"
    },
    {
      id: "weakness",
      titleKey: "mockExam.modes.weakness.title",
      shortTitle: t("mockExam.modes.weakness.shortTitle", "약점 집중"),
      descriptionKey: "mockExam.modes.weakness.description",
      icon: Brain,
      gradient: "from-purple-500 to-violet-600",
      glowColor: "#a855f7"
    }
  ];

  const difficultyOptions = [
    {
      id: "beginner",
      label: t("mockExam.difficulty.beginner.label", "하"),
      fullLabel: t("mockExam.difficulty.beginner.fullLabel", "Easy"),
      description: t("mockExam.difficulty.beginner.description", "기초 문법과 일상 어휘"),
      gradient: "from-green-400 to-emerald-500",
      icon: "🌱"
    },
    {
      id: "intermediate", 
      label: t("mockExam.difficulty.intermediate.label", "중"),
      fullLabel: t("mockExam.difficulty.intermediate.fullLabel", "Normal"),
      description: t("mockExam.difficulty.intermediate.description", "실전 수준의 중급 문제"),
      gradient: "from-blue-400 to-cyan-500",
      icon: "⚡",
      recommended: true
    },
    {
      id: "advanced",
      label: t("mockExam.difficulty.advanced.label", "상"),
      fullLabel: t("mockExam.difficulty.advanced.fullLabel", "Hard"),
      description: t("mockExam.difficulty.advanced.description", "고급 어휘와 복잡한 문법"),
      gradient: "from-purple-400 to-pink-500",
      icon: "🔥"
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

  const selectedExamData = examTypes.find(e => e.id === selectedExamForStart);

  // 카드 클릭 시 모달 오픈
  const handleExamCardClick = (examId: string) => {
    if (!isPremium) {
      navigate("/pricing");
      return;
    }
    setSelectedExamForStart(examId);
    setSelectedMode("full");
    setSelectedDifficulty("intermediate");
    setShowStartDialog(true);
  };

  // 섹션별 문제 개수 로드 (DB에 없으면 버튼 비활성화)
  const loadAvailableSections = async (examId: string) => {
    const dbExamType = mapExamTypeToDb(examId);
    const { data, error } = await supabase
      .from('mock_question_bank')
      .select('section')
      .eq('exam_type', dbExamType)
      .eq('is_active', true);

    if (error) {
      console.error('[MockExamHub] loadAvailableSections error', error);
      setAvailableSectionCounts({});
      return;
    }

    const counts: Record<string, number> = {};
    (data || []).forEach((row: any) => {
      const sec = String(row.section ?? '').toLowerCase();
      if (!sec) return;
      counts[sec] = (counts[sec] || 0) + 1;
    });

    setAvailableSectionCounts(counts);
  };

  // 파트별 문제 개수 로드
  const loadAvailableParts = async (examId: string) => {
    const dbExamType = mapExamTypeToDb(examId);
    const { data, error } = await supabase
      .from('mock_question_bank')
      .select('part_number, section')
      .eq('exam_type', dbExamType)
      .eq('is_active', true);

    if (error) {
      console.error('[MockExamHub] loadAvailableParts error', error);
      setAvailableParts([]);
      return;
    }

    const allowedSections = new Set(['listening', 'reading', 'writing']);

    if (data) {
      const partCounts = new Map<string, { partNumber: number; section: string; count: number }>();
      data
        .filter((q: any) => {
          const sec = String(q.section ?? '').toLowerCase();
          const pn = Number(q.part_number);
          return allowedSections.has(sec) && Number.isFinite(pn) && pn > 0;
        })
        .forEach((q: any) => {
          const sec = String(q.section).toLowerCase();
          const pn = Number(q.part_number);
          const key = `${sec}-${pn}`;
          const existing = partCounts.get(key);
          if (existing) {
            existing.count++;
          } else {
            partCounts.set(key, { partNumber: pn, section: sec, count: 1 });
          }
        });

      setAvailableParts(
        Array.from(partCounts.values()).sort((a, b) => {
          if (a.section !== b.section) return a.section.localeCompare(b.section);
          return a.partNumber - b.partNumber;
        })
      );
    }
  };

  // 약점 분석 로드
  const loadWeaknessAnalysis = async (examId: string) => {
    setLoadingWeakness(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoadingWeakness(false);
        return;
      }
      
      const dbExamType = mapExamTypeToDb(examId);
      const analysis = await analyzeUserWeakness(user.id, dbExamType, 20);
      setWeaknessAnalysis(analysis);
    } catch (error) {
      console.error('Failed to load weakness analysis:', error);
    }
    setLoadingWeakness(false);
  };

  // 시험 시작
  const handleStartExam = async () => {
    if (!selectedExamForStart) return;

    setShowStartDialog(false);

    if (selectedMode === 'section') {
      await loadAvailableSections(selectedExamForStart);
      setShowModeDialog(true);
    } else if (selectedMode === 'part') {
      await loadAvailableParts(selectedExamForStart);
      setShowPartDialog(true);
    } else if (selectedMode === 'weakness') {
      loadWeaknessAnalysis(selectedExamForStart);
      setShowWeaknessDialog(true);
    } else {
      navigate(`/mock-exam/${selectedExamForStart}?mode=${selectedMode}&difficulty=${selectedDifficulty}`);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* 배경 효과 */}
      <div className="fixed inset-0 pointer-events-none">
        <GlowOrb className="w-[600px] h-[600px] -top-40 -left-40" color="rgba(139, 92, 246, 0.12)" />
        <GlowOrb className="w-[400px] h-[400px] top-1/3 -right-20" color="rgba(236, 72, 153, 0.08)" />
        <FloatingParticles />
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      <CleanHeader />
      
      <main className="relative z-10 container mx-auto px-4 py-6 max-w-6xl">
        {/* Premium Preview Banner */}
        {!loading && !isPremium && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <PremiumPreviewBanner featureName={t('mockExam.featureName')} />
          </motion.div>
        )}

        {/* Hero Section - 컴팩트 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-10 pt-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Badge className="mb-4 px-4 py-1.5 text-xs font-medium bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 border border-primary/30 backdrop-blur-sm">
              <Sparkles className="w-3 h-3 mr-1.5 animate-pulse" />
              {t('mockExam.badge')}
            </Badge>
          </motion.div>
          
          <motion.h1 
            className="text-4xl md:text-5xl font-black mb-3 tracking-tight"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
              {t('mockExam.title')}
            </span>
          </motion.h1>
          
          <motion.p 
            className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {t('mockExam.subtitle')}
          </motion.p>

          {/* 통계 - 한 줄로 컴팩트 */}
          <motion.div 
            className="flex justify-center gap-8 mt-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {[
              { value: "10,000+", label: t("mockExam.stats.questions", "문제 보유") },
              { value: "AI", label: t("mockExam.stats.analysis", "실시간 분석") },
              { value: t("mockExam.stats.languagesValue", "7개국"), label: t("mockExam.stats.languages", "언어 지원") }
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-lg md:text-xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Exam Type Cards - 컴팩트 그리드 with CTA */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
        >
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">{t('mockExam.selectExamType')}</h2>
            <p className="text-sm text-muted-foreground">시험 유형을 선택하고 바로 시작하세요</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {examTypes.map((exam, index) => (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                whileHover={{ y: -4, scale: 1.01 }}
                className="group relative"
              >
                <div className={cn(
                  "relative overflow-hidden rounded-2xl border border-white/10 bg-card/60 backdrop-blur-xl transition-all duration-300",
                  "hover:border-white/20 hover:shadow-xl hover:shadow-primary/5"
                )}>
                  {/* Popular badge */}
                  {exam.popular && (
                    <div className="absolute top-3 right-3 z-10">
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-[10px] px-2 py-0.5">
                        <Star className="w-2.5 h-2.5 mr-1" />
                        인기
                      </Badge>
                    </div>
                  )}

                  {/* 헤더 - 컴팩트 */}
                  <div className={cn(
                    "relative p-4 bg-gradient-to-br",
                    exam.gradient
                  )}>
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{exam.emoji}</div>
                      <div>
                        <h3 className="text-lg font-bold text-white">{t(exam.titleKey)}</h3>
                        <p className="text-white/80 text-xs">{t(exam.subtitleKey)}</p>
                      </div>
                    </div>
                    <Badge className="mt-2 bg-white/20 text-white border-0 backdrop-blur-sm text-xs">
                      {exam.level}
                    </Badge>
                  </div>

                  {/* 바디 - 컴팩트 */}
                  <div className="p-4">
                    {/* 섹션 정보 - 가로 배치 */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {exam.sections.map((section) => (
                        <div 
                          key={section.nameKey} 
                          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50 text-xs"
                        >
                          <section.icon className="w-3 h-3 text-primary" />
                          <span className="text-foreground/80">{t(section.nameKey)}</span>
                          <span className="text-foreground/50">{section.questions}문항</span>
                        </div>
                      ))}
                    </div>

                    {/* 요약 정보 */}
                    <div className="flex justify-between items-center mb-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-foreground/50" />
                        <span className="font-semibold">{exam.totalQuestions}문항</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-foreground/50" />
                        <span className="font-semibold">{exam.totalTime}분</span>
                      </div>
                    </div>

                    {/* CTA 버튼 */}
                    {exam.comingSoon ? (
                      <div className="w-full py-3 rounded-xl font-bold text-white/60 text-sm bg-gradient-to-r from-gray-500 to-gray-600 cursor-not-allowed text-center flex items-center justify-center gap-2">
                        <Clock className="w-4 h-4" />
                        {t('mockExam.comingSoon')}
                      </div>
                    ) : (
                      <motion.button
                        onClick={() => handleExamCardClick(exam.id)}
                        className={cn(
                          "w-full py-3 rounded-xl font-bold text-white text-sm",
                          "bg-gradient-to-r shadow-lg transition-all duration-300",
                          exam.gradient,
                          "hover:shadow-xl hover:brightness-110"
                        )}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <span className="flex items-center justify-center gap-2">
                          <Play className="w-4 h-4" />
                          {t('mockExam.startExam')}
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Features - 컴팩트 4열 */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-12"
        >
          <div className="text-center mb-6">
            <h2 className="text-xl md:text-2xl font-bold mb-1">{t('mockExam.coreFeatures')}</h2>
            <p className="text-xs text-muted-foreground">차원이 다른 학습 경험</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="group p-4 rounded-xl bg-card/40 backdrop-blur-sm border border-white/5 hover:border-white/10 transition-all duration-300"
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-gradient-to-br",
                  feature.gradient,
                  "group-hover:scale-105 transition-transform duration-300"
                )}>
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-sm mb-1">{t(feature.titleKey)}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">{t(feature.descriptionKey)}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Important Notice - 컴팩트 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-8"
        >
          <div className="p-4 rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-orange-500/5 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-amber-500/20 rounded-lg flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-2 text-amber-600 dark:text-amber-400">{t('mockExam.notice.title')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                  {[1, 2, 3, 4].map((i) => (
                    <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                      {t(`mockExam.notice.item${i}`)}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Quick Links - 컴팩트 */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex flex-wrap justify-center gap-3"
        >
          {[
            { icon: PenTool, label: t('mockExam.quickLinks.writing'), path: '/writing-correction' },
            { icon: Mic, label: t('mockExam.quickLinks.speaking'), path: '/roleplay-speaking' },
            { icon: TrendingUp, label: t('mockExam.quickLinks.ranking'), path: '/ranking' }
          ].map((link, i) => (
            <motion.button
              key={link.path}
              onClick={() => navigate(link.path)}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm bg-card/40 backdrop-blur-sm border border-white/10 hover:border-primary/30 hover:bg-primary/5 transition-all duration-300"
            >
              <link.icon className="w-3.5 h-3.5" />
              <span>{link.label}</span>
            </motion.button>
          ))}
        </motion.div>

        {/* ========== START EXAM DIALOG (모드 + 난이도 선택) ========== */}
        <Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
          <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-white/10 p-0 overflow-hidden">
            {selectedExamData && (
              <>
                {/* 헤더 */}
                <div className={cn(
                  "p-5 bg-gradient-to-br text-white",
                  selectedExamData.gradient
                )}>
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{selectedExamData.emoji}</div>
                    <div>
                      <DialogTitle className="text-xl text-white">{t(selectedExamData.titleKey)}</DialogTitle>
                      <p className="text-white/80 text-sm">{t(selectedExamData.subtitleKey)}</p>
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-5">
                  {/* 학습 모드 선택 */}
                  <div>
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      학습 모드
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {learningModes.map((mode) => (
                        <motion.button
                          key={mode.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedMode(mode.id)}
                          className={cn(
                            "p-3 rounded-xl border transition-all duration-200 text-left",
                            selectedMode === mode.id
                              ? "border-primary bg-primary/10 ring-1 ring-primary"
                              : "border-white/10 bg-card/50 hover:border-white/20"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center mb-2 bg-gradient-to-br",
                            mode.gradient
                          )}>
                            <mode.icon className="w-4 h-4 text-white" />
                          </div>
                          <p className="font-medium text-sm">{mode.shortTitle}</p>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* 난이도 선택 */}
                  <div>
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Flame className="w-4 h-4 text-orange-500" />
                      난이도
                    </h4>
                    <div className="flex gap-2">
                      {difficultyOptions.map((diff) => (
                        <motion.button
                          key={diff.id}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setSelectedDifficulty(diff.id)}
                          className={cn(
                            "flex-1 py-3 px-3 rounded-xl border transition-all duration-200 relative",
                            selectedDifficulty === diff.id
                              ? "border-primary bg-primary/10 ring-1 ring-primary"
                              : "border-white/10 bg-card/50 hover:border-white/20"
                          )}
                        >
                          {diff.recommended && (
                            <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] px-1.5 py-0 bg-primary text-primary-foreground border-0">
                              추천
                            </Badge>
                          )}
                          <div className="text-xl mb-1">{diff.icon}</div>
                          <p className="font-bold text-sm">{diff.label}</p>
                          <p className="text-[10px] text-muted-foreground">{diff.fullLabel}</p>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* 시작 버튼 */}
                  <motion.button
                    onClick={handleStartExam}
                    className={cn(
                      "w-full py-4 rounded-xl font-bold text-white text-base",
                      "bg-gradient-to-r from-primary via-purple-500 to-pink-500",
                      "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30",
                      "transition-all duration-300"
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Play className="w-5 h-5" />
                      {t(selectedExamData.titleKey)} 시작
                      <ArrowRight className="w-5 h-5" />
                    </span>
                  </motion.button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Section Selection Dialog */}
        <Dialog open={showModeDialog} onOpenChange={setShowModeDialog}>
          <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-white/10">
            <DialogHeader>
              <DialogTitle className="text-xl">{t('mockExam.dialog.title')}</DialogTitle>
              <DialogDescription>{t('mockExam.dialog.description')}</DialogDescription>
            </DialogHeader>
            <div
              className={cn(
                "grid gap-4 py-4",
                selectedExamForStart === 'topik2' ? 'grid-cols-3' : 'grid-cols-2'
              )}
            >
              {(() => {
                const listeningCount = availableSectionCounts['listening'] || 0;
                const readingCount = availableSectionCounts['reading'] || 0;
                const listeningDisabled = listeningCount <= 0;
                const readingDisabled = readingCount <= 0;

                return (
                  <>
                    <motion.button
                      whileHover={listeningDisabled ? undefined : { scale: 1.02 }}
                      whileTap={listeningDisabled ? undefined : { scale: 0.98 }}
                      disabled={listeningDisabled}
                      onClick={() => {
                        if (listeningDisabled) {
                          toast({
                            title: t('mockExam.sectionPreparing', '문제 준비중'),
                            description: t('mockExam.sectionNoData', '듣기 영역 문제 데이터가 아직 없습니다. 다른 영역을 선택해주세요.'),
                          });
                          return;
                        }
                        setShowModeDialog(false);
                        navigate(
                          `/mock-exam/${selectedExamForStart}?mode=section&section=listening&difficulty=${selectedDifficulty}`
                        );
                      }}
                      className={cn(
                        'h-28 flex flex-col items-center justify-center gap-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border transition-all',
                        listeningDisabled
                          ? 'border-white/10 opacity-40 cursor-not-allowed'
                          : 'border-blue-500/20 hover:border-blue-500/40'
                      )}
                    >
                      <Headphones className="w-8 h-8 text-blue-500" />
                      <span className="font-medium">{t('mockExam.dialog.listening')}</span>
                      {listeningDisabled && (
                        <span className="text-[11px] text-muted-foreground">{t('mockExam.preparing', '준비중')}</span>
                      )}
                    </motion.button>

                    <motion.button
                      whileHover={readingDisabled ? undefined : { scale: 1.02 }}
                      whileTap={readingDisabled ? undefined : { scale: 0.98 }}
                      disabled={readingDisabled}
                      onClick={() => {
                        if (readingDisabled) {
                          toast({
                            title: t('mockExam.sectionPreparing', '문제 준비중'),
                            description: t('mockExam.sectionNoDataReading', '읽기 영역 문제 데이터가 아직 없습니다. 다른 영역을 선택해주세요.'),
                          });
                          return;
                        }
                        setShowModeDialog(false);
                        navigate(
                          `/mock-exam/${selectedExamForStart}?mode=section&section=reading&difficulty=${selectedDifficulty}`
                        );
                      }}
                      className={cn(
                        'h-28 flex flex-col items-center justify-center gap-3 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border transition-all',
                        readingDisabled
                          ? 'border-white/10 opacity-40 cursor-not-allowed'
                          : 'border-emerald-500/20 hover:border-emerald-500/40'
                      )}
                    >
                      <BookOpen className="w-8 h-8 text-emerald-500" />
                      <span className="font-medium">{t('mockExam.dialog.reading')}</span>
                      {readingDisabled && (
                        <span className="text-[11px] text-muted-foreground">{t('mockExam.preparing', '준비중')}</span>
                      )}
                    </motion.button>

                    {selectedExamForStart === 'topik2' && (() => {
                      const writingCount = availableSectionCounts['writing'] || 0;
                      const writingDisabled = writingCount <= 0;

                      return (
                        <motion.button
                          whileHover={writingDisabled ? undefined : { scale: 1.02 }}
                          whileTap={writingDisabled ? undefined : { scale: 0.98 }}
                          disabled={writingDisabled}
                          onClick={() => {
                            if (writingDisabled) {
                              toast({
                                title: t('mockExam.sectionPreparing', '문제 준비중'),
                                description: t('mockExam.sectionNoDataWriting', '쓰기 영역 문제 데이터가 아직 없습니다. 다른 영역을 선택해주세요.'),
                              });
                              return;
                            }
                            setShowModeDialog(false);
                            navigate(
                              `/mock-exam/${selectedExamForStart}?mode=section&section=writing&difficulty=${selectedDifficulty}`
                            );
                          }}
                          className={cn(
                            'h-28 flex flex-col items-center justify-center gap-3 rounded-xl bg-gradient-to-br from-purple-500/10 to-violet-500/10 border transition-all',
                            writingDisabled
                              ? 'border-white/10 opacity-40 cursor-not-allowed'
                              : 'border-purple-500/20 hover:border-purple-500/40'
                          )}
                        >
                          <PenTool className="w-8 h-8 text-purple-500" />
                          <span className="font-medium">{t('mockExam.dialog.writing')}</span>
                          {writingDisabled && (
                            <span className="text-[11px] text-muted-foreground">{t('mockExam.preparing', '준비중')}</span>
                          )}
                        </motion.button>
                      );
                    })()}
                  </>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>

        {/* Part Selection Dialog */}
        <Dialog open={showPartDialog} onOpenChange={setShowPartDialog}>
          <DialogContent className="sm:max-w-lg bg-card/95 backdrop-blur-xl border-white/10">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                파트별 연습
              </DialogTitle>
              <DialogDescription>집중 연습할 파트를 선택하세요</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[400px]">
              <div className="grid grid-cols-2 gap-3 py-4">
                {availableParts.map(part => (
                  <motion.button
                    key={`${part.section}-${part.partNumber}`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setShowPartDialog(false);
                      navigate(`/mock-exam/${selectedExamForStart}?mode=part&section=${part.section}&part=${part.partNumber}&difficulty=${selectedDifficulty}`);
                    }}
                    className={cn(
                      "p-4 flex flex-col items-start gap-2 rounded-xl border transition-all",
                      part.section === 'listening' 
                        ? "bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20 hover:border-blue-500/40"
                        : part.section === 'reading'
                        ? "bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20 hover:border-emerald-500/40"
                        : "bg-gradient-to-br from-purple-500/10 to-violet-500/10 border-purple-500/20 hover:border-purple-500/40"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {part.section === 'listening' ? (
                        <Headphones className="w-4 h-4 text-blue-500" />
                      ) : part.section === 'reading' ? (
                        <BookOpen className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <PenTool className="w-4 h-4 text-purple-500" />
                      )}
                      <span className="font-medium capitalize">{part.section}</span>
                    </div>
                    <div className="text-lg font-bold">Part {part.partNumber}</div>
                    <Badge variant="secondary" className="text-xs">{part.count}문항</Badge>
                  </motion.button>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Weakness Analysis Dialog */}
        <Dialog open={showWeaknessDialog} onOpenChange={setShowWeaknessDialog}>
          <DialogContent className="sm:max-w-xl bg-card/95 backdrop-blur-xl border-white/10">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-500" />
                약점 집중 분석
              </DialogTitle>
              <DialogDescription>AI가 분석한 취약 유형 맞춤 문제입니다</DialogDescription>
            </DialogHeader>
            
            {loadingWeakness ? (
              <div className="py-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">약점 분석 중...</p>
              </div>
            ) : weaknessAnalysis && weaknessAnalysis.questions.length > 0 ? (
              <div className="space-y-4 py-4">
                {/* Summary */}
                <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-semibold">분석 결과</p>
                      <p className="text-sm text-muted-foreground">
                        {weaknessAnalysis.totalAnalyzed}개 취약 문제 발견
                      </p>
                    </div>
                  </div>
                  
                  {weaknessAnalysis.weakestSections.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-sm text-muted-foreground">취약 영역:</span>
                      {weaknessAnalysis.weakestSections.map(sec => (
                        <Badge key={sec} variant="outline" className="text-xs capitalize">
                          {sec}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {weaknessAnalysis.weakestParts.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-sm text-muted-foreground">취약 파트:</span>
                      {weaknessAnalysis.weakestParts.map(part => (
                        <Badge key={part} variant="secondary" className="text-xs">
                          Part {part}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Top weakness questions preview */}
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-2">
                    {weaknessAnalysis.questions.slice(0, 5).map((ws, idx) => (
                      <div key={ws.questionId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">#{idx + 1}</span>
                          <Badge variant="destructive" className="text-xs">
                            점수 {ws.score}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {getWeaknessReasonText(ws.reasons, 'ko')}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <Button
                  onClick={() => {
                    setShowWeaknessDialog(false);
                    const questionIds = weaknessAnalysis.questions.map(q => q.questionId).join(',');
                    const reasons = weaknessAnalysis.questions.map(q => 
                      encodeURIComponent(getWeaknessReasonText(q.reasons, 'ko'))
                    ).join(',');
                    navigate(`/mock-exam/${selectedExamForStart}?mode=weakness&questions=${questionIds}&reasons=${reasons}`);
                  }}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  {weaknessAnalysis.totalAnalyzed}개 약점 문제 풀기
                </Button>
              </div>
            ) : (
              <div className="py-12 text-center">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <p className="font-semibold text-lg mb-2">분석할 오답 데이터가 없습니다</p>
                <p className="text-sm text-muted-foreground">
                  먼저 실전 모의고사나 영역별 연습을 진행해주세요
                </p>
                <Button
                  onClick={() => {
                    setShowWeaknessDialog(false);
                    setSelectedMode('full');
                    setShowStartDialog(true);
                  }}
                  variant="outline"
                  className="mt-4"
                >
                  실전 모의고사 시작
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>

      <AppFooter />
    </div>
  );
};

export default MockExamHub;
