import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Briefcase,
  Search,
  Mic,
  ChevronRight,
  Building2,
  Users,
  Crown,
  Sparkles,
  Star,
  TrendingUp,
  Clock,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { PremiumPreviewBanner } from "@/components/PremiumPreviewBanner";
import { useSubscription } from "@/hooks/useSubscription";

const KoreaCareer = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isPremium } = useSubscription();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const services = [
    {
      id: "headhunting",
      icon: Briefcase,
      titleKey: "careerPages.hub.services.headhunting.title",
      subtitleKey: "careerPages.hub.services.headhunting.subtitle",
      descriptionKey: "careerPages.hub.services.headhunting.description",
      featureKeys: [
        "careerPages.hub.services.headhunting.features.consulting",
        "careerPages.hub.services.headhunting.features.cvReview",
        "careerPages.hub.services.headhunting.features.interviewCoaching",
        "careerPages.hub.services.headhunting.features.salaryNegotiation",
      ],
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-500/10 to-cyan-500/10",
      shadowColor: "shadow-blue-500/20",
      path: "/headhunting",
      status: "active" as const,
      emoji: "💼",
    },
    {
      id: "company-report",
      icon: Search,
      titleKey: "careerPages.hub.services.companyReport.title",
      subtitleKey: "careerPages.hub.services.companyReport.subtitle",
      descriptionKey: "careerPages.hub.services.companyReport.description",
      featureKeys: [
        "careerPages.hub.services.companyReport.features.salary",
        "careerPages.hub.services.companyReport.features.culture",
        "careerPages.hub.services.companyReport.features.interviewReviews",
        "careerPages.hub.services.companyReport.features.news",
      ],
      gradient: "from-purple-500 to-pink-500",
      bgGradient: "from-purple-500/10 to-pink-500/10",
      shadowColor: "shadow-purple-500/20",
      path: "/company-report",
      status: "active" as const,
      emoji: "🔍",
    },
    {
      id: "interview-sim",
      icon: Mic,
      titleKey: "careerPages.hub.services.interviewSim.title",
      subtitleKey: "careerPages.hub.services.interviewSim.subtitle",
      descriptionKey: "careerPages.hub.services.interviewSim.description",
      featureKeys: [
        "careerPages.hub.services.interviewSim.features.voice",
        "careerPages.hub.services.interviewSim.features.realtimeFeedback",
        "careerPages.hub.services.interviewSim.features.scoring",
        "careerPages.hub.services.interviewSim.features.customQuestions",
      ],
      gradient: "from-orange-500 to-red-500",
      bgGradient: "from-orange-500/10 to-red-500/10",
      shadowColor: "shadow-orange-500/20",
      path: "/interview-simulation",
      status: "active" as const,
      emoji: "🎤",
    },
    {
      id: "practical-guide",
      icon: BookOpen,
      titleKey: "careerPages.hub.services.practicalGuide.title",
      subtitleKey: "careerPages.hub.services.practicalGuide.subtitle",
      descriptionKey: "careerPages.hub.services.practicalGuide.description",
      featureKeys: [
        "careerPages.hub.services.practicalGuide.features.itTerms",
        "careerPages.hub.services.practicalGuide.features.meetingSim",
        "careerPages.hub.services.practicalGuide.features.emailTemplates",
        "careerPages.hub.services.practicalGuide.features.businessKorean",
      ],
      gradient: "from-emerald-500 to-teal-500",
      bgGradient: "from-emerald-500/10 to-teal-500/10",
      shadowColor: "shadow-emerald-500/20",
      path: "/practical-guide",
      status: "coming" as const,
      emoji: "📖",
    },
  ];

  const handleServiceClick = (service: (typeof services)[0]) => {
    navigate(service.path);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CleanHeader />

      <main className="flex-1 pt-8 pb-12 px-4 max-w-6xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Premium Preview Banner */}
          {!isPremium && (
            <PremiumPreviewBanner featureName={t("careerPages.hub.premiumPreviewFeatureName")} />
          )}

          {/* Header */}
          <div className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30"
            >
              <Building2 className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-foreground">
                🇰🇷 {t("careerPages.hub.badge")}
              </span>
            </motion.div>

            <h1 className="text-headline">
              <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                {t("careerPages.hub.title")}
              </span>
            </h1>

            <p className="text-body text-muted-foreground max-w-2xl mx-auto">
              {t("careerPages.hub.subtitle")}
            </p>
            <p className="text-card-caption text-muted-foreground">
              {t("careerPages.hub.subline")}
            </p>
          </div>

          {/* Service Cards with 2x2 Grid */}
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
            {services.map((service, idx) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + idx * 0.1 }}
                onMouseEnter={() => setHoveredCard(service.id)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{ perspective: "1000px" }}
              >
                <motion.div
                  animate={{
                    rotateX: hoveredCard === service.id ? -5 : 0,
                    rotateY: hoveredCard === service.id ? 5 : 0,
                    z: hoveredCard === service.id ? 50 : 0,
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <Card
                    onClick={() => handleServiceClick(service)}
                    className={`relative overflow-hidden p-6 h-full transition-all duration-500 cursor-pointer hover:shadow-2xl ${service.shadowColor} bg-gradient-to-br ${service.bgGradient} border-2 ${
                      hoveredCard === service.id ? "border-primary/50" : "border-transparent"
                    }`}
                  >
                    {/* Animated background glow */}
                    {hoveredCard === service.id && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`absolute inset-0 bg-gradient-to-br ${service.gradient} opacity-10`}
                      />
                    )}

                    {/* Status Badge */}
                    <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full flex items-center gap-1 ${
                      service.status === "active" 
                        ? "bg-green-500/20 border border-green-500/50" 
                        : "bg-yellow-500/20 border border-yellow-500/50"
                    }`}>
                      {service.status === "active" ? (
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                      ) : (
                        <Clock className="w-3 h-3 text-yellow-500" />
                      )}
                      <span className={`text-xs font-medium ${
                        service.status === "active" 
                          ? "text-green-600 dark:text-green-400" 
                          : "text-yellow-600 dark:text-yellow-400"
                      }`}>
                        {service.status === "active" 
                          ? t("careerPages.hub.status.active") 
                          : t("careerPages.hub.status.coming")}
                      </span>
                    </div>

                    {/* Icon with emoji */}
                    <div className="relative mb-4">
                      <motion.div
                        className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${service.gradient} flex items-center justify-center shadow-lg`}
                        animate={{
                          scale: hoveredCard === service.id ? 1.1 : 1,
                          rotate: hoveredCard === service.id ? 5 : 0,
                        }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <service.icon className="w-7 h-7 text-white" />
                      </motion.div>
                      <span className="absolute -bottom-1 -right-1 text-xl">{service.emoji}</span>
                    </div>

                    {/* Title */}
                    <h3 className="text-card-title-lg text-foreground mb-1">{t(service.titleKey)}</h3>
                    <p className="text-badge text-primary font-medium mb-3">{t(service.subtitleKey)}</p>

                    {/* Description */}
                    <p className="text-card-body text-muted-foreground mb-4 leading-relaxed">
                      {t(service.descriptionKey)}
                    </p>

                    {/* Features */}
                    <div className="space-y-2 mb-4">
                      <div className="flex flex-wrap gap-1.5">
                        {service.featureKeys.map((featureKey, i) => (
                          <motion.span
                            key={featureKey}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 + i * 0.05 }}
                            className="px-2.5 py-1 text-xs rounded-full bg-background/70 text-foreground/80 border border-border/50 backdrop-blur-sm"
                          >
                            {t(featureKey)}
                          </motion.span>
                        ))}
                      </div>
                    </div>

                    {/* CTA */}
                    {service.status === "active" ? (
                      <motion.div
                        className="flex items-center gap-2 text-primary font-semibold text-sm"
                        animate={{ x: hoveredCard === service.id ? 5 : 0 }}
                      >
                        <span>{t("careerPages.hub.cta")}</span>
                        <ChevronRight className="w-4 h-4" />
                      </motion.div>
                    ) : (
                      <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 font-semibold text-sm">
                        <Clock className="w-4 h-4" />
                        <span>{t("careerPages.hub.comingSoon")}</span>
                      </div>
                    )}
                  </Card>
                </motion.div>
              </motion.div>
            ))}
          </div>

          {/* Stats Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="p-6 bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <motion.div whileHover={{ scale: 1.05 }} className="space-y-1">
                  <div className="text-title font-bold text-primary flex items-center justify-center gap-1">
                    <Building2 className="w-5 h-5" />
                    500+
                  </div>
                  <div className="text-card-caption text-muted-foreground">
                    {t("careerPages.hub.stats.partnerCompanies")}
                  </div>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} className="space-y-1">
                  <div className="text-title font-bold text-purple-500 flex items-center justify-center gap-1">
                    <TrendingUp className="w-5 h-5" />
                    1,000+
                  </div>
                  <div className="text-card-caption text-muted-foreground">
                    {t("careerPages.hub.stats.successPlacements")}
                  </div>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} className="space-y-1">
                  <div className="text-title font-bold text-pink-500 flex items-center justify-center gap-1">
                    <Star className="w-5 h-5" />
                    98%
                  </div>
                  <div className="text-card-caption text-muted-foreground">
                    {t("careerPages.hub.stats.satisfaction")}
                  </div>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} className="space-y-1">
                  <div className="text-title font-bold text-orange-500 flex items-center justify-center gap-1">
                    <Sparkles className="w-5 h-5" />
                    24/7
                  </div>
                  <div className="text-card-caption text-muted-foreground">
                    {t("careerPages.hub.stats.aiSupport")}
                  </div>
                </motion.div>
              </div>
            </Card>
          </motion.div>

          {/* Premium CTA */}
          {!isPremium && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card
                className="p-6 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30 cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all"
                onClick={() => navigate("/pricing")}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center"
                    >
                      <Crown className="w-6 h-6 text-white" />
                    </motion.div>
                    <div>
                      <h3 className="text-card-title-lg text-foreground flex items-center gap-2">
                        {t("careerPages.hub.premiumCta.title")}
                        <Sparkles className="w-4 h-4 text-yellow-500" />
                      </h3>
                      <p className="text-card-body text-muted-foreground">
                        {t("careerPages.hub.premiumCta.description")}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Card>
            </motion.div>
          )}

          {/* Additional Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="grid sm:grid-cols-2 gap-4"
          >
            <Card className="p-4 bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="text-card-title-lg text-foreground">
                    {t("careerPages.hub.infoCards.headhunters.title")}
                  </h4>
                  <p className="text-card-body text-muted-foreground mt-1">
                    {t("careerPages.hub.infoCards.headhunters.description")}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <h4 className="text-card-title-lg text-foreground">
                    {t("careerPages.hub.infoCards.ai.title")}
                  </h4>
                  <p className="text-card-body text-muted-foreground mt-1">
                    {t("careerPages.hub.infoCards.ai.description")}
                  </p>
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

export default KoreaCareer;

