import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  Zap,
  Crown,
  Check,
  X,
  CreditCard,
  Shield,
  Sparkles,
  BookOpen,
  Gamepad2,
  PenTool,
  Users,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { supabase } from "@/integrations/supabase/client";
import zaloPayLogo from "@/assets/zalopay-logo.png";

type BillingPeriod = "1-month" | "6-months" | "12-months";

const Pricing = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("1-month");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState<string | undefined>();

  const comparisonFeatures = useMemo(
    () => [
      {
        icon: Gamepad2,
        name: t("pricing.features.games.name"),
        free: true,
        premium: true,
        description: t("pricing.features.games.desc"),
      },
      {
        icon: BookOpen,
        name: t("pricing.features.topik.name"),
        free: true,
        premium: true,
        description: t("pricing.features.topik.desc"),
      },
      {
        icon: Users,
        name: t("pricing.features.headhunting.name"),
        free: false,
        premium: true,
        description: t("pricing.features.headhunting.desc"),
      },
      {
        icon: PenTool,
        name: t("pricing.features.writing.name"),
        free: false,
        premium: true,
        description: t("pricing.features.writing.desc"),
      },
      {
        icon: Sparkles,
        name: t("pricing.features.variant.name"),
        free: false,
        premium: true,
        description: t("pricing.features.variant.desc"),
      },
    ],
    [t]
  );

  const faqItems = useMemo(
    () => [
      {
        question: t("pricing.faq.cancel.question"),
        answer: t("pricing.faq.cancel.answer"),
      },
      {
        question: t("pricing.faq.payment.question"),
        answer: t("pricing.faq.payment.answer"),
      },
      {
        question: t("pricing.faq.includes.question"),
        answer: t("pricing.faq.includes.answer"),
      },
      {
        question: t("pricing.faq.refund.question"),
        answer: t("pricing.faq.refund.answer"),
      },
      {
        question: t("pricing.faq.student.question"),
        answer: t("pricing.faq.student.answer"),
      },
    ],
    [t]
  );

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setIsLoggedIn(true);
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", session.user.id)
          .single();
        if (profile) {
          setUsername(profile.username);
        }
      }
    };
    checkAuth();
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN").format(price);
  };

  const getPremiumPrice = () => {
    switch (billingPeriod) {
      case "1-month":
        return { price: 299000, perMonth: 299000, savings: 0 };
      case "6-months":
        return { price: 1500000, perMonth: 250000, savings: 294000 };
      case "12-months":
        return { price: 2500000, perMonth: 208333, savings: 1088000 };
    }
  };

  const premiumPrice = getPremiumPrice();

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <CleanHeader />

      <main className="flex-1 pt-8 pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10 pt-8">
            <h1 className="text-title font-heading font-bold mb-4">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-korean-green via-korean-cyan to-korean-blue">
                {t("pricing.title")}
              </span>
            </h1>
            <p className="text-body text-muted-foreground">{t("pricing.subtitle")}</p>
          </motion.div>

          {/* Billing Period Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex justify-center mb-8"
          >
            <div className="inline-flex items-center p-1.5 rounded-full bg-muted border border-border">
              <button
                onClick={() => setBillingPeriod("1-month")}
                className={`px-4 sm:px-5 py-2.5 rounded-full text-card-caption sm:text-card-body font-medium transition-all ${
                  billingPeriod === "1-month"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("pricing.period.1month")}
              </button>
              <button
                onClick={() => setBillingPeriod("6-months")}
                className={`px-4 sm:px-5 py-2.5 rounded-full text-card-caption sm:text-card-body font-medium transition-all relative ${
                  billingPeriod === "6-months"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("pricing.period.6months")}
                <span className="absolute -top-2.5 -right-2.5 px-2 py-0.5 rounded text-badge font-bold bg-korean-orange text-white">
                  -20%
                </span>
              </button>
              <button
                onClick={() => setBillingPeriod("12-months")}
                className={`px-4 sm:px-5 py-2.5 rounded-full text-card-caption sm:text-card-body font-medium transition-all relative ${
                  billingPeriod === "12-months"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("pricing.period.12months")}
                <span className="absolute -top-2.5 -right-2.5 px-2 py-0.5 rounded text-badge font-bold bg-korean-green text-white">
                  BEST
                </span>
              </button>
            </div>
          </motion.div>

          {/* Pricing Cards - 2 Column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-12"
          >
            {/* Free Plan */}
            <div className="relative rounded-2xl p-7 border bg-card border-border hover:border-primary/30 transition-all">
              <span className="absolute -top-3.5 left-6 px-4 py-1.5 rounded-full bg-muted text-foreground text-badge font-bold border border-border">
                {t("pricing.free.badge")}
              </span>

              <div className="flex justify-center mb-5 pt-5">
                <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                  <Zap className="w-8 h-8 text-muted-foreground" />
                </div>
              </div>

              <h3 className="text-center text-card-title-lg font-bold text-foreground mb-3">Free</h3>

              <div className="text-center mb-7">
                <div className="text-4xl sm:text-5xl font-bold text-foreground">0đ</div>
                <p className="text-card-caption text-muted-foreground mt-2">{t("pricing.free.forever")}</p>
              </div>

              <ul className="space-y-4 mb-7">
                {[
                  t("pricing.free.feature1"),
                  t("pricing.free.feature2"),
                  t("pricing.free.feature3"),
                ].map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-card-body">
                    <Check className="w-5 h-5 shrink-0 mt-0.5 text-korean-green" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => navigate(isLoggedIn ? "/dashboard" : "/auth")}
                variant="outline"
                className="w-full text-button-lg py-3"
              >
                {isLoggedIn ? t("pricing.free.currentPlan") : t("pricing.free.startFree")}
              </Button>
            </div>

            {/* Premium Plan */}
            <div className="relative rounded-2xl p-7 border bg-gradient-to-b from-korean-green/10 to-background border-korean-green/50 shadow-lg shadow-korean-green/10">
              <span className="absolute -top-3.5 left-6 px-4 py-1.5 rounded-full bg-korean-orange text-white text-badge font-bold">
                {t("pricing.premium.badge")}
              </span>

              <div className="flex justify-center mb-5 pt-5">
                <div className="w-16 h-16 rounded-xl bg-korean-green/20 flex items-center justify-center">
                  <Crown className="w-8 h-8 text-korean-green" />
                </div>
              </div>

              <h3 className="text-center text-card-title-lg font-bold text-foreground mb-3">Premium</h3>

              <div className="text-center mb-7">
                <div className="text-4xl sm:text-5xl font-bold text-korean-green">{formatPrice(premiumPrice.price)}đ</div>
                {billingPeriod !== "1-month" && (
                  <p className="text-card-caption text-muted-foreground mt-2">
                    ~{formatPrice(premiumPrice.perMonth)}đ/{t("pricing.perMonth")}
                  </p>
                )}
                {premiumPrice.savings > 0 && (
                  <p className="text-card-caption text-korean-green mt-1">
                    {t("pricing.save")} {formatPrice(premiumPrice.savings)}đ
                  </p>
                )}
              </div>

              <ul className="space-y-4 mb-7">
                {[
                  `✅ ${t("pricing.premium.feature1")}`,
                  `👔 ${t("pricing.premium.feature2")}`,
                  `✍️ ${t("pricing.premium.feature3")}`,
                  `🎯 ${t("pricing.premium.feature4")}`,
                ].map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-card-body">
                    <Check className="w-5 h-5 shrink-0 mt-0.5 text-korean-green" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => navigate("/auth")}
                className="w-full bg-korean-green hover:bg-korean-green/90 text-white text-button-lg py-3"
              >
                {t("pricing.premium.upgrade")}
              </Button>
            </div>
          </motion.div>

          {/* Feature Comparison Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-14"
          >
            <h2 className="text-headline font-bold text-center text-foreground mb-8">{t("pricing.comparison.title")}</h2>
            <div className="overflow-x-auto">
              <table className="w-full max-w-2xl mx-auto">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-4 px-4 text-card-caption font-medium text-muted-foreground">
                      {t("pricing.comparison.feature")}
                    </th>
                    <th className="text-center py-4 px-4 text-card-caption font-medium text-muted-foreground w-28">
                      Free
                    </th>
                    <th className="text-center py-4 px-4 text-card-caption font-medium text-korean-green w-28">
                      Premium
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((feature) => (
                    <tr key={feature.name} className="border-b border-border/50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <feature.icon className="w-5 h-5 text-muted-foreground shrink-0" />
                          <div>
                            <span className="text-card-body text-foreground block">{feature.name}</span>
                            <span className="text-card-caption text-muted-foreground hidden sm:block">
                              {feature.description}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-4 px-4">
                        {feature.free ? (
                          <Check className="w-5 h-5 text-korean-green mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-muted-foreground/50 mx-auto" />
                        )}
                      </td>
                      <td className="text-center py-4 px-4">
                        {feature.premium ? (
                          <Check className="w-5 h-5 text-korean-green mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-muted-foreground/50 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Payment Process */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-14"
          >
            <h2 className="text-headline font-bold text-center text-foreground mb-3">{t("pricing.process.title")}</h2>
            <p className="text-center text-body text-muted-foreground mb-8">{t("pricing.process.subtitle")}</p>

            <div className="grid sm:grid-cols-3 gap-8 max-w-2xl mx-auto">
              {[
                {
                  step: 1,
                  icon: BookOpen,
                  title: t("pricing.process.step1.title"),
                  description: t("pricing.process.step1.desc"),
                },
                {
                  step: 2,
                  icon: CreditCard,
                  title: t("pricing.process.step2.title"),
                  description: t("pricing.process.step2.desc"),
                },
                {
                  step: 3,
                  icon: Zap,
                  title: t("pricing.process.step3.title"),
                  description: t("pricing.process.step3.desc"),
                },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="relative inline-block mb-4">
                    <div className="w-16 h-16 rounded-xl bg-muted border border-border flex items-center justify-center">
                      <item.icon className="w-7 h-7 text-foreground" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-korean-cyan text-white text-badge font-bold flex items-center justify-center">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground text-card-body mb-1.5">{item.title}</h3>
                  <p className="text-card-caption text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Security Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="max-w-xl mx-auto mb-14"
          >
            <div className="flex items-start gap-4 p-5 rounded-xl bg-korean-green/10 border border-korean-green/20">
              <Shield className="w-6 h-6 text-korean-green shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground text-card-body mb-1.5">{t("pricing.security.title")}</h3>
                <p className="text-card-caption text-muted-foreground">{t("pricing.security.desc")}</p>
              </div>
            </div>
          </motion.div>

          {/* FAQ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="max-w-2xl mx-auto mb-14"
          >
            <h2 className="text-headline font-bold text-center text-foreground mb-3">{t("pricing.faqTitle")}</h2>
            <p className="text-center text-body text-muted-foreground mb-8">{t("pricing.faqSubtitle")}</p>

            <Accordion type="single" collapsible className="space-y-3">
              {faqItems.map((item, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="border border-border rounded-xl px-5 data-[state=open]:bg-muted/50"
                >
                  <AccordionTrigger className="text-card-body font-medium text-foreground hover:no-underline py-4">
                    <div className="flex items-center gap-3">
                      <HelpCircle className="w-5 h-5 text-muted-foreground" />
                      {item.question}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-card-body text-muted-foreground pb-4">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="text-center"
          >
            <p className="text-body text-muted-foreground mb-5">{t("pricing.paymentVia")}</p>
            <div className="flex justify-center">
              <img src={zaloPayLogo} alt="ZaloPay" className="h-8 sm:h-10 md:h-12 w-auto object-contain" />
            </div>
          </motion.div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
};

export default Pricing;
