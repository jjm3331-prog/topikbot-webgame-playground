import { Crown, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface FeatureTrialBannerProps {
  canUse: boolean;
  isPremium: boolean;
  cooldownSeconds: number;
  formattedCooldown: string;
  featureName: string;
}

export const FeatureTrialBanner = ({
  canUse,
  isPremium,
  cooldownSeconds,
  formattedCooldown,
  featureName,
}: FeatureTrialBannerProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Premium users don't see banner
  if (isPremium) return null;

  // Free user with available trial
  if (canUse) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-korean-green/20 to-emerald-500/20 border border-korean-green/30 rounded-xl p-4 mb-6"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-korean-green to-emerald-500 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm sm:text-base">
                {t("trial.available", "무료 체험 가능")}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {t("trial.freeToday", "오늘 1회 무료로 {{feature}}을 체험할 수 있습니다!", { feature: featureName })}
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate("/pricing")}
            size="sm"
            variant="outline"
            className="border-korean-green/50 text-korean-green hover:bg-korean-green hover:text-white shrink-0"
          >
            <Crown className="w-4 h-4 mr-2" />
            {t("trial.unlimitedAccess", "무제한 이용하기")}
          </Button>
        </div>
      </motion.div>
    );
  }

  // Free user on cooldown
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-korean-orange/20 via-korean-pink/20 to-korean-purple/20 border border-korean-orange/30 rounded-xl p-4 mb-6"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-korean-orange to-korean-pink flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm sm:text-base">
              {t("trial.completed", "오늘 체험 완료")}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {t("trial.nextTrialIn", "다음 무료 체험까지 {{time}} 남았습니다", { time: formattedCooldown })}
            </p>
          </div>
        </div>
        <Button
          onClick={() => navigate("/pricing")}
          size="sm"
          className="bg-gradient-to-r from-korean-orange to-korean-pink hover:from-korean-orange/90 hover:to-korean-pink/90 text-white shrink-0"
        >
          <Crown className="w-4 h-4 mr-2" />
          {t("trial.upgradePremium", "Premium 업그레이드")}
        </Button>
      </div>
    </motion.div>
  );
};

export default FeatureTrialBanner;
