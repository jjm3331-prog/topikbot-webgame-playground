import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
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
  Volume2
} from "lucide-react";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";
import { PremiumPreviewBanner } from "@/components/PremiumPreviewBanner";

const MockExamHub = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isPremium, loading } = useSubscription();
  const [selectedExam, setSelectedExam] = useState<string>("topik1");
  const [selectedMode, setSelectedMode] = useState<string>("full");
  const [showModeDialog, setShowModeDialog] = useState(false);

  const examTypes = [
    {
      id: "topik1",
      titleKey: "mockExam.examTypes.topik1.title",
      subtitleKey: "mockExam.examTypes.topik1.subtitle",
      descriptionKey: "mockExam.examTypes.topik1.description",
      color: "from-emerald-500 to-teal-600",
      icon: GraduationCap,
      sections: [
        { nameKey: "mockExam.sections.listening", questions: 30, time: 40, icon: Headphones },
        { nameKey: "mockExam.sections.reading", questions: 40, time: 60, icon: BookOpen }
      ],
      totalTime: 100,
      totalQuestions: 70
    },
    {
      id: "topik2",
      titleKey: "mockExam.examTypes.topik2.title",
      subtitleKey: "mockExam.examTypes.topik2.subtitle",
      descriptionKey: "mockExam.examTypes.topik2.description",
      color: "from-blue-500 to-indigo-600",
      icon: Trophy,
      sections: [
        { nameKey: "mockExam.sections.listening", questions: 50, time: 60, icon: Headphones },
        { nameKey: "mockExam.sections.reading", questions: 50, time: 70, icon: BookOpen },
        { nameKey: "mockExam.sections.writing", questions: 4, time: 50, icon: PenTool }
      ],
      totalTime: 180,
      totalQuestions: 104
    },
    {
      id: "eps",
      titleKey: "mockExam.examTypes.eps.title",
      subtitleKey: "mockExam.examTypes.eps.subtitle",
      descriptionKey: "mockExam.examTypes.eps.description",
      color: "from-orange-500 to-red-600",
      icon: Target,
      sections: [
        { nameKey: "mockExam.sections.listening", questions: 25, time: 25, icon: Headphones },
        { nameKey: "mockExam.sections.reading", questions: 25, time: 25, icon: BookOpen }
      ],
      totalTime: 50,
      totalQuestions: 50
    }
  ];

  const learningModes = [
    {
      id: "full",
      titleKey: "mockExam.modes.full.title",
      descriptionKey: "mockExam.modes.full.description",
      icon: Clock,
      color: "bg-gradient-to-br from-red-500 to-pink-600",
      featureKeys: ["mockExam.modes.full.features.timeLimit", "mockExam.modes.full.features.allQuestions", "mockExam.modes.full.features.realExam"]
    },
    {
      id: "section",
      titleKey: "mockExam.modes.section.title",
      descriptionKey: "mockExam.modes.section.description",
      icon: Target,
      color: "bg-gradient-to-br from-blue-500 to-cyan-600",
      featureKeys: ["mockExam.modes.section.features.selectSection", "mockExam.modes.section.features.noTimeLimit", "mockExam.modes.section.features.instantExplanation"]
    },
    {
      id: "part",
      titleKey: "mockExam.modes.part.title",
      descriptionKey: "mockExam.modes.part.description",
      icon: Zap,
      color: "bg-gradient-to-br from-amber-500 to-orange-600",
      featureKeys: ["mockExam.modes.part.features.typePractice", "mockExam.modes.part.features.repeatLearning", "mockExam.modes.part.features.weaknessImprovement"]
    },
    {
      id: "weakness",
      titleKey: "mockExam.modes.weakness.title",
      descriptionKey: "mockExam.modes.weakness.description",
      icon: Brain,
      color: "bg-gradient-to-br from-purple-500 to-violet-600",
      featureKeys: ["mockExam.modes.weakness.features.aiAnalysis", "mockExam.modes.weakness.features.customRecommend", "mockExam.modes.weakness.features.efficientLearning"]
    }
  ];

  const features = [
    {
      icon: Sparkles,
      titleKey: "mockExam.features.aiGeneration.title",
      descriptionKey: "mockExam.features.aiGeneration.description"
    },
    {
      icon: Volume2,
      titleKey: "mockExam.features.multiLanguage.title",
      descriptionKey: "mockExam.features.multiLanguage.description"
    },
    {
      icon: BarChart3,
      titleKey: "mockExam.features.detailedAnalysis.title",
      descriptionKey: "mockExam.features.detailedAnalysis.description"
    },
    {
      icon: BookMarked,
      titleKey: "mockExam.features.smartMistakeNote.title",
      descriptionKey: "mockExam.features.smartMistakeNote.description"
    }
  ];

  const tutorialSteps = [
    {
      step: 1,
      titleKey: "mockExam.tutorial.step1.title",
      descriptionKey: "mockExam.tutorial.step1.description"
    },
    {
      step: 2,
      titleKey: "mockExam.tutorial.step2.title",
      descriptionKey: "mockExam.tutorial.step2.description"
    },
    {
      step: 3,
      titleKey: "mockExam.tutorial.step3.title",
      descriptionKey: "mockExam.tutorial.step3.description"
    },
    {
      step: 4,
      titleKey: "mockExam.tutorial.step4.title",
      descriptionKey: "mockExam.tutorial.step4.description"
    },
    {
      step: 5,
      titleKey: "mockExam.tutorial.step5.title",
      descriptionKey: "mockExam.tutorial.step5.description"
    }
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
    <div className="min-h-screen bg-background">
      <CleanHeader />
      
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Premium Preview Banner */}
        {!loading && !isPremium && (
          <PremiumPreviewBanner featureName={t('mockExam.featureName')} />
        )}

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <Badge className="mb-4 bg-gradient-to-r from-primary to-purple-600 text-white border-0">
            {t('mockExam.badge')}
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
            {t('mockExam.title')}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('mockExam.subtitle')}
          </p>
        </motion.div>

        {/* Exam Type Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold mb-6 text-center">{t('mockExam.selectExamType')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {examTypes.map((exam) => (
              <Card 
                key={exam.id}
                className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
                  selectedExam === exam.id 
                    ? 'ring-2 ring-primary shadow-lg' 
                    : 'hover:shadow-md'
                }`}
                onClick={() => setSelectedExam(exam.id)}
              >
                <CardHeader className={`bg-gradient-to-br ${exam.color} text-white rounded-t-lg`}>
                  <div className="flex items-center justify-between">
                    <exam.icon className="w-10 h-10" />
                    {selectedExam === exam.id && (
                      <CheckCircle2 className="w-6 h-6" />
                    )}
                  </div>
                  <CardTitle className="text-2xl">{t(exam.titleKey)}</CardTitle>
                  <CardDescription className="text-white/90">{t(exam.subtitleKey)}</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-muted-foreground mb-4">{t(exam.descriptionKey)}</p>
                  <div className="space-y-2">
                    {exam.sections.map((section) => (
                      <div key={section.nameKey} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <section.icon className="w-4 h-4 text-muted-foreground" />
                          <span>{t(section.nameKey)}</span>
                        </div>
                        <span className="text-muted-foreground">
                          {section.questions}{t('mockExam.units.questions')} / {section.time}{t('mockExam.units.minutes')}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t flex justify-between text-sm font-medium">
                    <span>{t('mockExam.total')} {exam.totalQuestions}{t('mockExam.units.questions')}</span>
                    <span>{exam.totalTime}{t('mockExam.units.minutes')}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Learning Modes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold mb-6 text-center">{t('mockExam.selectMode')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {learningModes.map((mode) => (
              <Card 
                key={mode.id}
                className={`cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${
                  selectedMode === mode.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedMode(mode.id)}
              >
                <CardContent className="pt-6">
                  <div className={`w-12 h-12 rounded-xl ${mode.color} flex items-center justify-center mb-4`}>
                    <mode.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold mb-2">{t(mode.titleKey)}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{t(mode.descriptionKey)}</p>
                  <div className="flex flex-wrap gap-1">
                    {mode.featureKeys.map((featureKey) => (
                      <Badge key={featureKey} variant="secondary" className="text-xs">
                        {t(featureKey)}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center mb-12"
        >
          <Button 
            size="lg" 
            className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
            onClick={handleStartExam}
          >
            <Play className="w-5 h-5 mr-2" />
            {isPremium 
              ? `${t(selectedExamData?.titleKey || '')} ${t('mockExam.startButton')}`
              : t('mockExam.upgradeToPremium')
            }
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold mb-6 text-center">{t('mockExam.coreFeatures')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature, index) => (
              <Card key={index} className="text-center">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-bold mb-2">{t(feature.titleKey)}</h3>
                  <p className="text-sm text-muted-foreground">{t(feature.descriptionKey)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Tutorial Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-12"
        >
          <Card className="bg-gradient-to-br from-primary/5 to-purple-500/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-6 h-6 text-primary" />
                {t('mockExam.userGuide.title')}
              </CardTitle>
              <CardDescription>
                {t('mockExam.userGuide.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {tutorialSteps.map((step, index) => (
                  <div key={step.step} className="relative">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold mb-3">
                        {step.step}
                      </div>
                      <h4 className="font-medium mb-2">{t(step.titleKey)}</h4>
                      <p className="text-xs text-muted-foreground">{t(step.descriptionKey)}</p>
                    </div>
                    {index < tutorialSteps.length - 1 && (
                      <ChevronRight className="hidden md:block absolute top-5 -right-2 w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Important Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold mb-2 text-amber-700 dark:text-amber-400">{t('mockExam.notice.title')}</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• {t('mockExam.notice.item1')}</li>
                    <li>• {t('mockExam.notice.item2')}</li>
                    <li>• {t('mockExam.notice.item3')}</li>
                    <li>• {t('mockExam.notice.item4')}</li>
                    <li>• {t('mockExam.notice.item5')}</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-8 flex flex-wrap justify-center gap-4"
        >
          <Button variant="outline" onClick={() => navigate('/writing-correction')}>
            <PenTool className="w-4 h-4 mr-2" />
            {t('mockExam.quickLinks.writing')}
          </Button>
          <Button variant="outline" onClick={() => navigate('/roleplay-speaking')}>
            <Mic className="w-4 h-4 mr-2" />
            {t('mockExam.quickLinks.speaking')}
          </Button>
          <Button variant="outline" onClick={() => navigate('/ranking')}>
            <TrendingUp className="w-4 h-4 mr-2" />
            {t('mockExam.quickLinks.ranking')}
          </Button>
        </motion.div>

        {/* Section Selection Dialog */}
        <Dialog open={showModeDialog} onOpenChange={setShowModeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('mockExam.dialog.title')}</DialogTitle>
              <DialogDescription>{t('mockExam.dialog.description')}</DialogDescription>
            </DialogHeader>
            <div className={cn(
              "grid gap-4 py-4",
              selectedExam === 'topik2' ? "grid-cols-3" : "grid-cols-2"
            )}>
              <Button 
                variant="outline" 
                className="h-24 flex flex-col gap-2"
                onClick={() => navigate(`/mock-exam/${selectedExam}?mode=section&section=listening`)}
              >
                <Headphones className="w-8 h-8" />
                <span>{t('mockExam.sections.listening')}</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-24 flex flex-col gap-2"
                onClick={() => navigate(`/mock-exam/${selectedExam}?mode=section&section=reading`)}
              >
                <BookOpen className="w-8 h-8" />
                <span>{t('mockExam.sections.reading')}</span>
              </Button>
              {selectedExam === 'topik2' && (
                <Button 
                  variant="outline" 
                  className="h-24 flex flex-col gap-2"
                  onClick={() => navigate(`/mock-exam/${selectedExam}?mode=section&section=writing`)}
                >
                  <PenTool className="w-8 h-8" />
                  <span>{t('mockExam.sections.writing')}</span>
                </Button>
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