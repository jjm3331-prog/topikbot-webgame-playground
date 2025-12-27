import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { BookOpen, MessageSquare, Mail, Briefcase, Clock, Construction } from "lucide-react";
import { Card } from "@/components/ui/card";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { PremiumPreviewBanner } from "@/components/PremiumPreviewBanner";
import { useSubscription } from "@/hooks/useSubscription";

const PracticalGuide = () => {
  const { t } = useTranslation();
  const { isPremium } = useSubscription();

  const features = [
    {
      icon: BookOpen,
      titleKey: "practicalGuidePage.features.itTerms.title",
      descKey: "practicalGuidePage.features.itTerms.desc",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      icon: MessageSquare,
      titleKey: "practicalGuidePage.features.meeting.title",
      descKey: "practicalGuidePage.features.meeting.desc",
      gradient: "from-purple-500 to-pink-500",
    },
    {
      icon: Mail,
      titleKey: "practicalGuidePage.features.email.title",
      descKey: "practicalGuidePage.features.email.desc",
      gradient: "from-orange-500 to-red-500",
    },
    {
      icon: Briefcase,
      titleKey: "practicalGuidePage.features.business.title",
      descKey: "practicalGuidePage.features.business.desc",
      gradient: "from-emerald-500 to-teal-500",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CleanHeader />

      <main className="flex-1 pt-8 pb-12 px-4 max-w-4xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Premium Preview Banner */}
          {!isPremium && (
            <PremiumPreviewBanner featureName={t("careerPages.hub.services.practicalGuide.title")} />
          )}

          {/* Header */}
          <div className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30"
            >
              <BookOpen className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium text-foreground">
                {t("practicalGuidePage.badge")}
              </span>
            </motion.div>

            <h1 className="text-headline">
              <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent">
                Practical Guide
              </span>
            </h1>

            <p className="text-body text-muted-foreground max-w-2xl mx-auto">
              {t("practicalGuidePage.tagline")}
            </p>
          </div>

          {/* Coming Soon Banner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-8 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
              <div className="flex flex-col items-center text-center gap-4">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center"
                >
                  <Construction className="w-8 h-8 text-white" />
                </motion.div>
                <div>
                  <h2 className="text-title font-bold text-foreground mb-2 flex items-center justify-center gap-2">
                    <Clock className="w-5 h-5 text-yellow-500" />
                    {t("practicalGuidePage.comingSoon")}
                  </h2>
                  <p className="text-card-body text-muted-foreground">
                    {t("practicalGuidePage.comingSoonDesc")}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Feature Preview Cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((feature, idx) => (
              <motion.div
                key={feature.titleKey}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + idx * 0.1 }}
              >
                <Card className="p-5 h-full bg-muted/30 hover:bg-muted/50 transition-colors border-dashed">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shrink-0 opacity-70`}>
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-card-title-lg text-foreground mb-1">
                        {t(feature.titleKey)}
                      </h3>
                      <p className="text-card-body text-muted-foreground">
                        {t(feature.descKey)}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Target Audience */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="p-6 bg-gradient-to-r from-primary/5 to-emerald-500/5 border-primary/20">
              <h3 className="text-card-title-lg text-foreground mb-4 text-center">
                {t("practicalGuidePage.targetTitle")}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="space-y-1">
                  <div className="text-2xl">💻</div>
                  <div className="text-sm font-medium text-foreground">IT COMTOR</div>
                  <div className="text-xs text-muted-foreground">{t("practicalGuidePage.targets.comtor")}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl">🎮</div>
                  <div className="text-sm font-medium text-foreground">Game QA</div>
                  <div className="text-xs text-muted-foreground">{t("practicalGuidePage.targets.gameqa")}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl">🌐</div>
                  <div className="text-sm font-medium text-foreground">BrSE</div>
                  <div className="text-xs text-muted-foreground">{t("practicalGuidePage.targets.brse")}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl">📊</div>
                  <div className="text-sm font-medium text-foreground">PM/PL</div>
                  <div className="text-xs text-muted-foreground">{t("practicalGuidePage.targets.pmpl")}</div>
                </div>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      </main>

      <AppFooter />
    </div>
  );
};

export default PracticalGuide;