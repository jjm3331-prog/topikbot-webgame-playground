import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Headphones,
  ExternalLink,
  MessageCircle,
  Clock,
  Target,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import zaloQr from "@/assets/zalo-qr.jpg";

const HelpCenter = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const zaloLink = "https://zalo.me/g/mogvgb538";

  const helpItems = [
    t("helpCenter.helpItem1"),
    t("helpCenter.helpItem2"),
    t("helpCenter.helpItem3"),
    t("helpCenter.helpItem4"),
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label={t("common.back")}> 
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-heading font-bold text-lg">{t("helpCenter.title")}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <motion.section
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
            <Headphones className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">{t("helpCenter.title")}</h2>
          <p className="text-muted-foreground">{t("helpCenter.description")}</p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-card overflow-hidden"
        >
          <div className="p-6 flex flex-col items-center">
            <img
              src={zaloQr}
              alt="LUKATO AI help center QR code"
              className="w-80 h-80 sm:w-96 sm:h-96 md:w-[28rem] md:h-[28rem] object-contain rounded-xl"
              loading="lazy"
            />
            <p className="text-sm text-muted-foreground mt-4 text-center">{t("helpCenter.scanQr")}</p>
          </div>

          <div className="px-6 pb-6">
            <Button
              className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-6 text-base font-semibold"
              onClick={() => window.open(zaloLink, "_blank")}
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              {t("helpCenter.openZalo")}
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border bg-card p-5"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                {t("helpCenter.supportHours")}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">{t("helpCenter.supportTime")}</p>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-border bg-card p-5"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5 text-orange-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground flex items-center gap-2">{t("helpCenter.whatCanWeHelp")}</h3>
              <ul className="mt-3 space-y-2">
                {helpItems.map((item, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.section>

        <footer className="text-center pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground">{t("helpCenter.copyright")}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("helpCenter.platform")}</p>
        </footer>
      </main>
    </div>
  );
};

export default HelpCenter;
