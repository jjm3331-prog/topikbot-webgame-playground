import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  MessageCircle,
  ExternalLink,
  Sparkles,
  Clock,
  Globe,
  BookOpen,
  Users,
  CheckCircle,
  Zap,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";

const LUKATO_AI_CHAT_URL = "https://chat-topikbot.kr";

const AITutor = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const features = [
    {
      icon: MessageCircle,
      title: t("aiTutor.features.qa.title"),
      description: t("aiTutor.features.qa.desc"),
    },
    {
      icon: Clock,
      title: t("aiTutor.features.support.title"),
      description: t("aiTutor.features.support.desc"),
    },
    {
      icon: BookOpen,
      title: t("aiTutor.features.subjects.title"),
      description: t("aiTutor.features.subjects.desc"),
    },
    {
      icon: Sparkles,
      title: t("aiTutor.features.ai.title"),
      description: t("aiTutor.features.ai.desc"),
    },
  ];

  const aiModels = [
    {
      name: t("aiTutor.models.thpt.name"),
      subtitle: t("aiTutor.models.thpt.subtitle"),
      description: t("aiTutor.models.thpt.desc"),
      icon: "🇻🇳",
    },
    {
      name: t("aiTutor.models.dgnl.name"),
      subtitle: t("aiTutor.models.dgnl.subtitle"),
      description: t("aiTutor.models.dgnl.desc"),
      icon: "⭐",
    },
    {
      name: t("aiTutor.models.math.name"),
      subtitle: t("aiTutor.models.math.subtitle"),
      description: t("aiTutor.models.math.desc"),
      icon: "📐",
    },
    {
      name: t("aiTutor.models.english.name"),
      subtitle: t("aiTutor.models.english.subtitle"),
      description: t("aiTutor.models.english.desc"),
      icon: "🇬🇧",
    },
  ];

  const steps = [
    {
      number: 1,
      title: t("aiTutor.steps.step1.title"),
      description: t("aiTutor.steps.step1.desc"),
      highlight: t("aiTutor.steps.step1.highlight"),
    },
    {
      number: 2,
      title: t("aiTutor.steps.step2.title"),
      description: t("aiTutor.steps.step2.desc"),
      highlight: t("aiTutor.steps.step2.highlight"),
    },
    {
      number: 3,
      title: t("aiTutor.steps.step3.title"),
      description: t("aiTutor.steps.step3.desc"),
      highlight: t("aiTutor.steps.step3.highlight"),
    },
    {
      number: 4,
      title: t("aiTutor.steps.step4.title"),
      description: t("aiTutor.steps.step4.desc"),
      highlight: t("aiTutor.steps.step4.highlight"),
    },
  ];

  const notices = [
    t("aiTutor.notices.item1"),
    t("aiTutor.notices.item2"),
    t("aiTutor.notices.item3"),
    t("aiTutor.notices.item4"),
  ];

  const handleOpenChat = () => {
    window.open(LUKATO_AI_CHAT_URL, "_blank");
  };

  return (
    <div className="min-h-screen bg-background">
      <CleanHeader />

      <main className="pt-8">
        {/* Hero Section */}
        <section className="relative py-16 px-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                <MessageCircle className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">{t("aiTutor.badge")}</span>
                <span className="px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-korean-orange to-korean-pink text-white rounded-full">
                  Basic & Premium
                </span>
              </div>

              {/* Title */}
              <h1 className="text-4xl md:text-5xl font-heading font-bold text-foreground">{t("aiTutor.title")}</h1>

              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t("aiTutor.description")}</p>

              {/* CTA Button */}
              <div className="flex flex-col items-center gap-4">
                <Button
                  onClick={handleOpenChat}
                  size="lg"
                  className="bg-gradient-to-r from-korean-orange to-korean-pink hover:from-korean-orange/90 hover:to-korean-pink/90 text-white font-bold px-8 py-6 text-lg rounded-xl shadow-lg"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  {t("aiTutor.openChat")}
                  <ExternalLink className="w-5 h-5 ml-2" />
                </Button>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-korean-green" />
                  {t("aiTutor.supportAt")}
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* How to Use Section */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-heading font-bold text-primary mb-4">{t("aiTutor.howToUse.title")}</h2>
              <p className="text-muted-foreground">{t("aiTutor.howToUse.subtitle")}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {steps.map((step, index) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="p-6 h-full bg-card border-border hover:border-primary/30 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-lg font-bold text-primary">{step.number}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                        <p className="text-muted-foreground text-sm mb-3">{step.description}</p>
                        <div className="flex items-center gap-2 text-xs text-primary">
                          <Zap className="w-3 h-3" />
                          <span>{step.highlight}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* AI Models Section */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground mb-4">{t("aiTutor.modelsTitle")}</h2>
              <p className="text-muted-foreground">{t("aiTutor.modelsSubtitle")}</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {aiModels.map((model, index) => (
                <motion.div
                  key={model.name}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="p-4 h-full bg-card border-border hover:border-primary/30 transition-all hover:shadow-md">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{model.icon}</span>
                      <div>
                        <h3 className="font-semibold text-foreground text-sm">{model.name}</h3>
                        <p className="text-xs text-muted-foreground">{model.subtitle}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{model.description}</p>
                  </Card>
                </motion.div>
              ))}
            </div>

            <p className="text-center text-sm text-muted-foreground mt-6">💡 {t("aiTutor.modelsHint")}</p>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground mb-4">{t("aiTutor.featuresTitle")}</h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="p-6 h-full bg-gradient-to-b from-primary/5 to-transparent border-primary/10 hover:border-primary/30 transition-colors text-center">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Important Notices */}
        <section className="py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <Card className="p-6 bg-muted/50 border-border">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">{t("aiTutor.noticesTitle")}</h3>
              </div>
              <ul className="space-y-2">
                {notices.map((notice, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-korean-green shrink-0 mt-0.5" />
                    <span>{notice}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <Card className="p-8 bg-gradient-to-r from-primary/10 via-korean-purple/10 to-korean-pink/10 border-primary/20 text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Brain className="w-6 h-6 text-primary" />
                <Sparkles className="w-5 h-5 text-korean-yellow" />
              </div>
              <h2 className="text-2xl font-heading font-bold text-foreground mb-3">{t("aiTutor.cta.title")}</h2>
              <p className="text-muted-foreground mb-6">{t("aiTutor.cta.desc")}</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  onClick={handleOpenChat}
                  size="lg"
                  className="bg-gradient-to-r from-korean-orange to-korean-pink hover:from-korean-orange/90 hover:to-korean-pink/90 text-white font-bold"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {t("aiTutor.openChat")}
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
                <Button variant="outline" size="lg" onClick={() => navigate("/pricing")}>
                  <Users className="w-4 h-4 mr-2" />
                  {t("aiTutor.cta.practice")}
                </Button>
              </div>
            </Card>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
};

export default AITutor;
