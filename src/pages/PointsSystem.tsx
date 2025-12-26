import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Gift,
  Calendar,
  Trophy,
  Users,
  Gamepad2,
  Target,
  Star,
  Crown,
  Zap,
  CheckCircle2,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { POINTS_CONFIG, LEVEL_THRESHOLDS, FREE_LIMITS, PREMIUM_FEATURES } from "@/lib/pointsPolicy";
import { useTranslation } from "react-i18next";

const PointsSystem = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const earnMethods = [
    {
      icon: Calendar,
      title: t("pointsSystem.earnMethods.daily.title"),
      points: `+${POINTS_CONFIG.DAILY_CHECKIN} ${t("common.points")}`,
      description: t("pointsSystem.earnMethods.daily.description"),
      color: "from-korean-blue to-korean-cyan",
    },
    {
      icon: Zap,
      title: t("pointsSystem.earnMethods.streak.title"),
      points: `+${POINTS_CONFIG.WEEKLY_STREAK_BONUS} ${t("common.points")}`,
      description: t("pointsSystem.earnMethods.streak.description"),
      color: "from-korean-orange to-korean-pink",
    },
    {
      icon: CheckCircle2,
      title: t("pointsSystem.earnMethods.quiz.title"),
      points: `+${POINTS_CONFIG.QUIZ_PERFECT_SCORE} ${t("common.points")}`,
      description: t("pointsSystem.earnMethods.quiz.description"),
      color: "from-korean-green to-korean-cyan",
    },
    {
      icon: Gamepad2,
      title: t("pointsSystem.earnMethods.game.title"),
      points: `+${POINTS_CONFIG.GAME_COMPLETE_MIN}~${POINTS_CONFIG.GAME_COMPLETE_MAX} ${t("common.points")}`,
      description: t("pointsSystem.earnMethods.game.description"),
      color: "from-korean-purple to-korean-pink",
    },
    {
      icon: Users,
      title: t("pointsSystem.earnMethods.referral.title"),
      points: `+${POINTS_CONFIG.REFERRAL_INVITER} ${t("common.points")}`,
      description: t("pointsSystem.earnMethods.referral.description"),
      color: "from-korean-cyan to-korean-blue",
    },
    {
      icon: Target,
      title: t("pointsSystem.earnMethods.weeklyGoal.title"),
      points: `+${POINTS_CONFIG.WEEKLY_GOAL_COMPLETE} ${t("common.points")}`,
      description: t("pointsSystem.earnMethods.weeklyGoal.description"),
      color: "from-korean-pink to-korean-orange",
    },
  ];

  const levels = [
    { ...LEVEL_THRESHOLDS.TOPIK_1, level: 1, range: "0 - 9.999" },
    { ...LEVEL_THRESHOLDS.TOPIK_2, level: 2, range: "10.000 - 49.999" },
    { ...LEVEL_THRESHOLDS.TOPIK_3, level: 3, range: "50.000 - 149.999" },
    { ...LEVEL_THRESHOLDS.TOPIK_4, level: 4, range: "150.000 - 349.999" },
    { ...LEVEL_THRESHOLDS.TOPIK_5, level: 5, range: "350.000 - 999.999" },
    { ...LEVEL_THRESHOLDS.TOPIK_6, level: 6, range: "1.000.000+" },
  ];

  const levelColors = ["bg-gray-500", "bg-green-500", "bg-blue-500", "bg-purple-500", "bg-orange-500", "bg-red-500"];

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <CleanHeader />

      <main className="flex-1 pb-12 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Back Button */}
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-primary hover:text-primary/80 mb-6"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>{t("common.back")}</span>
          </motion.button>

          {/* Page Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-korean-orange to-korean-pink flex items-center justify-center">
              <Gift className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-title font-heading font-bold text-foreground mb-2">{t("pointsSystem.title")}</h1>
            <p className="text-body text-muted-foreground">{t("pointsSystem.subtitle")}</p>
          </motion.div>

          {/* How to Earn Points */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-10"
          >
            <h2 className="text-headline font-bold text-foreground mb-6 flex items-center gap-2">
              <Star className="w-5 h-5 text-korean-orange" />
              {t("pointsSystem.howToEarn")}
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              {earnMethods.map((method, index) => (
                <motion.div
                  key={method.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  className="glass-card rounded-xl p-5 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${method.color} flex items-center justify-center shrink-0`}
                    >
                      <method.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-foreground text-card-body">{method.title}</h3>
                        <span className="text-korean-green font-bold text-card-caption shrink-0">{method.points}</span>
                      </div>
                      <p className="text-card-caption text-muted-foreground">{method.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Level System */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-10"
          >
            <h2 className="text-headline font-bold text-foreground mb-6 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-korean-orange" />
              {t("pointsSystem.levelSystem")}
            </h2>

            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="divide-y divide-border">
                {levels.map((level, index) => (
                  <div key={level.name} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                    <div className={`w-10 h-10 rounded-lg ${levelColors[index]} flex items-center justify-center`}>
                      <span className="text-white font-bold text-lg">{level.level}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground text-card-body">{level.name}</h3>
                      <p className="text-card-caption text-muted-foreground">
                        {level.range} {t("common.points")}
                      </p>
                    </div>
                    {index === 5 && (
                      <span className="px-3 py-1 bg-korean-orange/20 text-korean-orange text-badge font-bold rounded-full">
                        {t("pointsSystem.max")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.section>

          {/* Free vs Premium */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-10"
          >
            <h2 className="text-headline font-bold text-foreground mb-6 flex items-center gap-2">
              <Crown className="w-5 h-5 text-korean-orange" />
              {t("pointsSystem.freeVsPremium")}
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Free */}
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Zap className="w-5 h-5 text-foreground" />
                  </div>
                  <h3 className="font-bold text-foreground text-card-title-lg">{t("pointsSystem.free")}</h3>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2 text-card-body">
                    <CheckCircle2 className="w-5 h-5 text-korean-green shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">
                      {t("pointsSystem.freeItems.aiQuestions", { count: FREE_LIMITS.AI_QUESTIONS_PER_DAY })}
                    </span>
                  </li>
                  <li className="flex items-start gap-2 text-card-body">
                    <CheckCircle2 className="w-5 h-5 text-korean-green shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{t("pointsSystem.freeItems.topik")}</span>
                  </li>
                  <li className="flex items-start gap-2 text-card-body">
                    <CheckCircle2 className="w-5 h-5 text-korean-green shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{t("pointsSystem.freeItems.allGames")}</span>
                  </li>
                  <li className="flex items-start gap-2 text-card-body">
                    <CheckCircle2 className="w-5 h-5 text-korean-green shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{t("pointsSystem.freeItems.ranking")}</span>
                  </li>
                </ul>
              </div>

              {/* Premium */}
              <div className="rounded-2xl p-6 bg-gradient-to-b from-korean-green/10 to-background border border-korean-green/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-korean-green/20 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-korean-green" />
                  </div>
                  <h3 className="font-bold text-foreground text-card-title-lg">{t("pointsSystem.premium")}</h3>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2 text-card-body">
                    <CheckCircle2 className="w-5 h-5 text-korean-green shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{t("pointsSystem.premiumItems.allFree")}</span>
                  </li>
                  {PREMIUM_FEATURES.map((feature) => (
                    <li key={feature.id} className="flex items-start gap-2 text-card-body">
                      <CheckCircle2 className="w-5 h-5 text-korean-green shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{feature.nameKo}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => navigate("/pricing")}
                  className="w-full mt-6 bg-korean-green hover:bg-korean-green/90 text-white"
                >
                  {t("pointsSystem.viewPricing")}
                  <ArrowUpRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </motion.section>

          {/* Tips */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card rounded-2xl p-6"
          >
            <h2 className="text-headline font-bold text-foreground mb-4 flex items-center gap-2">
              💡 {t("pointsSystem.tips.title")}
            </h2>
            <ul className="space-y-3 text-card-body text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-korean-orange">•</span>
                {t("pointsSystem.tips.item1")}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-korean-orange">•</span>
                {t("pointsSystem.tips.item2", { points: POINTS_CONFIG.QUIZ_PERFECT_SCORE })}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-korean-orange">•</span>
                {t("pointsSystem.tips.item3")}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-korean-orange">•</span>
                {t("pointsSystem.tips.item4")}
              </li>
            </ul>
          </motion.section>
        </div>
      </main>

      <AppFooter />
    </div>
  );
};

export default PointsSystem;
