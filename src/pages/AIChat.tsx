import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CleanHeader from "@/components/CleanHeader";
import CommonFooter from "@/components/CommonFooter";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles,
  Bot,
  MessageSquare,
  Zap,
  ArrowRight,
  Crown,
  BookOpen,
  GraduationCap,
  Globe,
  Lock,
} from "lucide-react";

type AgentId = "topik" | "ielts" | "jlpt" | "hsk";

const AIChat = () => {
  const { t } = useTranslation();
  const [isPremium, setIsPremium] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);

      if (user) {
        const { data: sub } = await supabase
          .from("user_subscriptions")
          .select("plan")
          .eq("user_id", user.id)
          .maybeSingle();
        setIsPremium(sub?.plan === "premium" || sub?.plan === "plus");
      }
    };
    checkAuth();
  }, []);

  const agents = useMemo(
    () =>
      [
        {
          id: "topik" as const,
          title: "TOPIK Agent",
          subtitle: t("aiChat.agent.topik.subtitle"),
          description: t("aiChat.agent.topik.description"),
          icon: GraduationCap,
          available: true,
          features: t("aiChat.agent.topik.features", { returnObjects: true }) as string[],
          gradient: "from-korean-blue to-korean-green",
          path: "/ai-chat/topik",
        },
        {
          id: "ielts" as const,
          title: "IELTS Agent",
          subtitle: t("aiChat.agent.ielts.subtitle"),
          description: t("aiChat.agent.ielts.description"),
          icon: Globe,
          available: true,
          features: t("aiChat.agent.ielts.features", { returnObjects: true }) as string[],
          gradient: "from-blue-500 to-indigo-500",
          path: "/ai-chat/ielts",
        },
        {
          id: "jlpt" as const,
          title: "JLPT Agent",
          subtitle: t("aiChat.agent.jlpt.subtitle"),
          description: t("aiChat.agent.jlpt.description"),
          icon: BookOpen,
          available: false,
          features: t("aiChat.agent.jlpt.features", { returnObjects: true }) as string[],
          gradient: "from-red-500 to-pink-500",
          path: "/ai-chat/jlpt",
        },
        {
          id: "hsk" as const,
          title: "HSK Agent",
          subtitle: t("aiChat.agent.hsk.subtitle"),
          description: t("aiChat.agent.hsk.description"),
          icon: Globe,
          available: false,
          features: t("aiChat.agent.hsk.features", { returnObjects: true }) as string[],
          gradient: "from-yellow-500 to-red-500",
          path: "/ai-chat/hsk",
        },
      ],
    [t]
  );

  const handleAgentClick = (agent: (typeof agents)[number]) => {
    if (!agent.available) return;
    navigate(agent.path);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CleanHeader />

      <main className="flex-1 pt-20 pb-8">
        <div className="max-w-6xl mx-auto px-4">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              {t("aiChat.badge")}
              <Badge variant="secondary" className="text-xs bg-korean-green/20 text-korean-green border-0">
                {t("aiChat.rag")}
              </Badge>
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-korean-blue to-korean-green bg-clip-text text-transparent">
              {t("aiChat.title")}
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t("aiChat.description")}</p>

            {/* Premium badge */}
            {isPremium && (
              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-korean-yellow/10 text-korean-yellow text-sm font-medium">
                <Crown className="w-4 h-4" />
                {t("aiChat.premiumUnlimited")}
              </div>
            )}
          </motion.div>

          {/* Agent Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent, index) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className={`h-full overflow-hidden transition-all duration-300 group ${
                    agent.available
                      ? "cursor-pointer hover:shadow-xl hover:border-primary/50 hover:-translate-y-1"
                      : "opacity-60 cursor-not-allowed"
                  }`}
                  onClick={() => handleAgentClick(agent)}
                >
                  {/* Gradient Header */}
                  <div className={`h-2 bg-gradient-to-r ${agent.gradient}`} />

                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className={`w-14 h-14 rounded-xl bg-gradient-to-br ${agent.gradient} flex items-center justify-center shadow-lg`}
                      >
                        <agent.icon className="w-7 h-7 text-white" />
                      </div>

                      {!agent.available && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Lock className="w-3 h-3" />
                          {t("aiChat.comingSoon")}
                        </Badge>
                      )}

                      {agent.available && (
                        <Badge className="bg-korean-green/20 text-korean-green border-0 text-xs">
                          <Zap className="w-3 h-3 mr-1" />
                          {t("aiChat.active")}
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-xl font-bold mb-1">{agent.title}</h3>
                    <p className="text-sm text-primary font-medium mb-3">{agent.subtitle}</p>
                    <p className="text-muted-foreground text-sm mb-4">{agent.description}</p>

                    {/* Features */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {agent.features.map((feature, i) => (
                        <span key={i} className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                          {feature}
                        </span>
                      ))}
                    </div>

                    {/* CTA Button */}
                    <Button
                      className={`w-full gap-2 ${agent.available ? "" : "opacity-50"}`}
                      disabled={!agent.available}
                      variant={agent.available ? "default" : "outline"}
                    >
                      {agent.available ? (
                        <>
                          <MessageSquare className="w-4 h-4" />
                          {t("aiChat.startChat")}
                          <ArrowRight className="w-4 h-4 ml-auto group-hover:translate-x-1 transition-transform" />
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          {t("aiChat.comingSoon")}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Info Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-12 text-center"
          >
            <Card className="max-w-2xl mx-auto bg-muted/30 border-dashed">
              <CardContent className="p-6">
                <Bot className="w-10 h-10 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">{t("aiChat.whatIsTitle")}</h3>
                <p className="text-sm text-muted-foreground">{t("aiChat.whatIsDesc")}</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      <CommonFooter />
    </div>
  );
};

export default AIChat;
