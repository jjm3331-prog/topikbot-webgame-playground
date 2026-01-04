import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BookOpen, 
  Heart, 
  Coins, 
  Target, 
  Star,
  Dice6,
  Trophy,
  Briefcase,
  Link2,
  MessageSquare,
  Film,
  Music,
  Zap,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Lightbulb,
  Keyboard,
  MousePointer,
  Crown,
  Play
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";

const Tutorial = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [expandedGame, setExpandedGame] = useState<string | null>(null);

  const gameGuides = [
    {
      id: "manager",
      icon: Crown,
      titleKey: "tutorial.games.manager.title",
      titleViKey: "tutorial.games.manager.titleVi",
      color: "from-korean-purple to-korean-pink",
      summaryKey: "tutorial.games.manager.summary",
      summaryViKey: "tutorial.games.manager.summaryVi",
      howToStartKey: "tutorial.games.manager.howToStart",
      howToStartViKey: "tutorial.games.manager.howToStartVi",
      tips: [
        { key: "tutorial.games.manager.tip1", viKey: "tutorial.games.manager.tip1Vi" },
        { key: "tutorial.games.manager.tip2", viKey: "tutorial.games.manager.tip2Vi" },
      ],
    },
    {
      id: "survival",
      icon: Dice6,
      titleKey: "tutorial.games.survival.title",
      titleViKey: "tutorial.games.survival.titleVi",
      color: "from-korean-pink to-korean-orange",
      summaryKey: "tutorial.games.survival.summary",
      summaryViKey: "tutorial.games.survival.summaryVi",
      howToStartKey: "tutorial.games.survival.howToStart",
      howToStartViKey: "tutorial.games.survival.howToStartVi",
      tips: [
        { key: "tutorial.games.survival.tip1", viKey: "tutorial.games.survival.tip1Vi" },
        { key: "tutorial.games.survival.tip2", viKey: "tutorial.games.survival.tip2Vi" },
      ],
    },
    {
      id: "dating",
      icon: Heart,
      titleKey: "tutorial.games.dating.title",
      titleViKey: "tutorial.games.dating.titleVi",
      color: "from-pink-500 to-rose-500",
      summaryKey: "tutorial.games.dating.summary",
      summaryViKey: "tutorial.games.dating.summaryVi",
      howToStartKey: "tutorial.games.dating.howToStart",
      howToStartViKey: "tutorial.games.dating.howToStartVi",
      tips: [
        { key: "tutorial.games.dating.tip1", viKey: "tutorial.games.dating.tip1Vi" },
        { key: "tutorial.games.dating.tip2", viKey: "tutorial.games.dating.tip2Vi" },
      ],
    },
    {
      id: "wordchain",
      icon: Link2,
      titleKey: "tutorial.games.wordchain.title",
      titleViKey: "tutorial.games.wordchain.titleVi",
      color: "from-korean-cyan to-korean-blue",
      summaryKey: "tutorial.games.wordchain.summary",
      summaryViKey: "tutorial.games.wordchain.summaryVi",
      howToStartKey: "tutorial.games.wordchain.howToStart",
      howToStartViKey: "tutorial.games.wordchain.howToStartVi",
      tips: [
        { key: "tutorial.games.wordchain.tip1", viKey: "tutorial.games.wordchain.tip1Vi" },
        { key: "tutorial.games.wordchain.tip2", viKey: "tutorial.games.wordchain.tip2Vi" },
      ],
    },
    {
      id: "kpop",
      icon: Music,
      titleKey: "tutorial.games.kpop.title",
      titleViKey: "tutorial.games.kpop.titleVi",
      color: "from-rose-500 to-red-500",
      summaryKey: "tutorial.games.kpop.summary",
      summaryViKey: "tutorial.games.kpop.summaryVi",
      howToStartKey: "tutorial.games.kpop.howToStart",
      howToStartViKey: "tutorial.games.kpop.howToStartVi",
      tips: [
        { key: "tutorial.games.kpop.tip1", viKey: "tutorial.games.kpop.tip1Vi" },
        { key: "tutorial.games.kpop.tip2", viKey: "tutorial.games.kpop.tip2Vi" },
      ],
    },
    {
      id: "kdrama",
      icon: Film,
      titleKey: "tutorial.games.kdrama.title",
      titleViKey: "tutorial.games.kdrama.titleVi",
      color: "from-korean-purple to-pink-500",
      summaryKey: "tutorial.games.kdrama.summary",
      summaryViKey: "tutorial.games.kdrama.summaryVi",
      howToStartKey: "tutorial.games.kdrama.howToStart",
      howToStartViKey: "tutorial.games.kdrama.howToStartVi",
      tips: [
        { key: "tutorial.games.kdrama.tip1", viKey: "tutorial.games.kdrama.tip1Vi" },
        { key: "tutorial.games.kdrama.tip2", viKey: "tutorial.games.kdrama.tip2Vi" },
      ],
    },
    {
      id: "parttime",
      icon: Briefcase,
      titleKey: "tutorial.games.parttime.title",
      titleViKey: "tutorial.games.parttime.titleVi",
      color: "from-korean-green to-korean-teal",
      summaryKey: "tutorial.games.parttime.summary",
      summaryViKey: "tutorial.games.parttime.summaryVi",
      howToStartKey: "tutorial.games.parttime.howToStart",
      howToStartViKey: "tutorial.games.parttime.howToStartVi",
      tips: [
        { key: "tutorial.games.parttime.tip1", viKey: "tutorial.games.parttime.tip1Vi" },
        { key: "tutorial.games.parttime.tip2", viKey: "tutorial.games.parttime.tip2Vi" },
      ],
    },
  ];

  const toggleGame = (gameId: string) => {
    setExpandedGame(expandedGame === gameId ? null : gameId);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CleanHeader />

      <main className="flex-1 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8 sm:mb-12"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-korean-pink to-korean-purple flex items-center justify-center shadow-lg">
              <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-foreground mb-2">
              {t("tutorial.title")}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
              {t("tutorial.subtitle")}
            </p>
          </motion.div>

          {/* Quick Start Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <Card className="p-4 sm:p-6 bg-gradient-to-br from-korean-pink/10 to-korean-purple/10 border-korean-pink/30">
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <MousePointer className="w-5 h-5 text-korean-pink" />
                {t("tutorial.quickStart.title")}
              </h2>
              <div className="grid sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="flex items-start gap-3 p-3 sm:p-4 bg-background/50 rounded-xl">
                  <span className="w-8 h-8 rounded-full bg-korean-pink text-white text-sm font-bold flex items-center justify-center shrink-0">1</span>
                  <div>
                    <p className="font-semibold text-foreground text-sm sm:text-base">{t("tutorial.quickStart.step1.title")}</p>
                    <p className="text-muted-foreground text-xs sm:text-sm">{t("tutorial.quickStart.step1.desc")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 sm:p-4 bg-background/50 rounded-xl">
                  <span className="w-8 h-8 rounded-full bg-korean-purple text-white text-sm font-bold flex items-center justify-center shrink-0">2</span>
                  <div>
                    <p className="font-semibold text-foreground text-sm sm:text-base">{t("tutorial.quickStart.step2.title")}</p>
                    <p className="text-muted-foreground text-xs sm:text-sm">{t("tutorial.quickStart.step2.desc")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 sm:p-4 bg-background/50 rounded-xl">
                  <span className="w-8 h-8 rounded-full bg-korean-orange text-white text-sm font-bold flex items-center justify-center shrink-0">3</span>
                  <div>
                    <p className="font-semibold text-foreground text-sm sm:text-base">{t("tutorial.quickStart.step3.title")}</p>
                    <p className="text-muted-foreground text-xs sm:text-sm">{t("tutorial.quickStart.step3.desc")}</p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Stats Explanation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-8"
          >
            <Card className="p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-korean-yellow" />
                {t("tutorial.stats.title")}
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl">
                  <Heart className="w-6 h-6 text-destructive shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground text-sm">{t("tutorial.stats.hp.title")}</p>
                    <p className="text-muted-foreground text-xs">{t("tutorial.stats.hp.desc")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl">
                  <Coins className="w-6 h-6 text-korean-yellow shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground text-sm">{t("tutorial.stats.money.title")}</p>
                    <p className="text-muted-foreground text-xs">{t("tutorial.stats.money.desc")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl">
                  <Target className="w-6 h-6 text-korean-green shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground text-sm">{t("tutorial.stats.mission.title")}</p>
                    <p className="text-muted-foreground text-xs">{t("tutorial.stats.mission.desc")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl">
                  <Star className="w-6 h-6 text-korean-cyan shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground text-sm">{t("tutorial.stats.points.title")}</p>
                    <p className="text-muted-foreground text-xs">{t("tutorial.stats.points.desc")}</p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Important Tips */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <Card className="p-4 sm:p-6 border-korean-cyan/30 bg-gradient-to-br from-korean-cyan/5 to-korean-blue/5">
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-korean-cyan" />
                {t("tutorial.importantTips.title")}
              </h2>
              <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="flex items-start gap-3 p-3 bg-background/50 rounded-xl">
                  <Keyboard className="w-5 h-5 text-korean-pink shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground text-sm">{t("tutorial.importantTips.tip1.title")}</p>
                    <p className="text-muted-foreground text-xs">{t("tutorial.importantTips.tip1.desc")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-background/50 rounded-xl">
                  <Star className="w-5 h-5 text-korean-yellow shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground text-sm">{t("tutorial.importantTips.tip2.title")}</p>
                    <p className="text-muted-foreground text-xs">{t("tutorial.importantTips.tip2.desc")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-background/50 rounded-xl">
                  <Lightbulb className="w-5 h-5 text-korean-green shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground text-sm">{t("tutorial.importantTips.tip3.title")}</p>
                    <p className="text-muted-foreground text-xs">{t("tutorial.importantTips.tip3.desc")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-background/50 rounded-xl">
                  <BookOpen className="w-5 h-5 text-korean-blue shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground text-sm">{t("tutorial.importantTips.tip4.title")}</p>
                    <p className="text-muted-foreground text-xs">{t("tutorial.importantTips.tip4.desc")}</p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Game Guides */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mb-8"
          >
            <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-korean-yellow" />
              {t("tutorial.gameGuides.title")}
            </h2>
            <p className="text-muted-foreground text-sm mb-4">
              {t("tutorial.gameGuides.subtitle")}
            </p>

            <div className="space-y-3">
              {gameGuides.map((game, index) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                >
                  <Card className="overflow-hidden">
                    {/* Game Header - Clickable */}
                    <button
                      onClick={() => toggleGame(game.id)}
                      className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-r ${game.color} flex items-center justify-center shrink-0 shadow-md`}>
                          <game.icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                        </div>
                        <div className="text-left">
                          <h3 className="font-bold text-foreground text-sm sm:text-base">{t(game.titleKey)}</h3>
                          <p className="text-muted-foreground text-xs sm:text-sm">{t(game.titleViKey)}</p>
                        </div>
                      </div>
                      <motion.div
                        animate={{ rotate: expandedGame === game.id ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      </motion.div>
                    </button>

                    {/* Expanded Content */}
                    <AnimatePresence>
                      {expandedGame === game.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4">
                            {/* Summary */}
                            <div className="p-3 sm:p-4 bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl border-l-4 border-primary">
                              <p className="text-foreground text-sm">{t(game.summaryKey)}</p>
                              <p className="text-muted-foreground text-xs mt-1">{t(game.summaryViKey)}</p>
                            </div>

                            {/* How to Start */}
                            <div className="p-3 sm:p-4 bg-korean-pink/10 rounded-xl">
                              <div className="flex items-center gap-2 mb-2">
                                <Play className="w-4 h-4 text-korean-pink" />
                                <span className="text-korean-pink font-bold text-sm">{t("tutorial.howToStart")}</span>
                              </div>
                              <p className="text-foreground text-sm">{t(game.howToStartKey)}</p>
                              <p className="text-muted-foreground text-xs">{t(game.howToStartViKey)}</p>
                            </div>

                            {/* Tips */}
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Lightbulb className="w-4 h-4 text-korean-yellow" />
                                <span className="text-korean-yellow font-bold text-sm">{t("tutorial.tips")}</span>
                              </div>
                              <div className="grid sm:grid-cols-2 gap-2">
                                {game.tips.map((tip, tipIndex) => (
                                  <div key={tipIndex} className="flex items-start gap-2 p-3 bg-korean-yellow/10 rounded-lg">
                                    <CheckCircle2 className="w-4 h-4 text-korean-yellow shrink-0 mt-0.5" />
                                    <div>
                                      <p className="text-foreground text-xs sm:text-sm">{t(tip.key)}</p>
                                      <p className="text-muted-foreground text-xs">{t(tip.viKey)}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Start Button */}
                            <Button
                              onClick={() => {
                                const routes: Record<string, string> = {
                                  manager: "/manager",
                                  survival: "/chat",
                                  dating: "/dating",
                                  wordchain: "/wordchain",
                                  kpop: "/kpop",
                                  kdrama: "/kdrama",
                                  parttime: "/parttime",
                                };
                                navigate(routes[game.id] || "/");
                              }}
                              className="w-full bg-gradient-to-r from-korean-pink to-korean-purple hover:opacity-90 text-white"
                            >
                              <Play className="w-4 h-4 mr-2" />
                              {t("tutorial.playNow")}
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              onClick={() => navigate("/dashboard")}
              className="w-full h-14 bg-gradient-to-r from-korean-pink to-korean-purple hover:opacity-90 text-white font-bold text-base sm:text-lg"
            >
              {t("tutorial.startLearning")}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
};

export default Tutorial;
