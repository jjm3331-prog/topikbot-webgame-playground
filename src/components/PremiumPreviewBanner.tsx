import { Crown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface PremiumPreviewBannerProps {
  featureName?: string;
}

export const PremiumPreviewBanner = ({ featureName }: PremiumPreviewBannerProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-korean-orange/20 via-korean-pink/20 to-korean-purple/20 border border-korean-orange/30 rounded-xl p-4 mb-6"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-korean-orange to-korean-pink flex items-center justify-center shrink-0">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm sm:text-base">
              {t("premium.previewMode")}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {t("premium.upgradeToUse", { feature: featureName || t("premium.thisFeature") })}
            </p>
          </div>
        </div>
        <Button 
          onClick={() => navigate("/pricing")}
          size="sm"
          className="bg-gradient-to-r from-korean-orange to-korean-pink hover:from-korean-orange/90 hover:to-korean-pink/90 text-white shrink-0"
        >
          <Crown className="w-4 h-4 mr-2" />
          {t("premium.upgrade")}
        </Button>
      </div>
    </motion.div>
  );
};

interface PremiumActionButtonProps {
  isPremium: boolean;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export const PremiumActionButton = ({
  isPremium,
  onClick,
  disabled,
  loading,
  children,
  className = "",
  variant = "default",
  size = "default"
}: PremiumActionButtonProps) => {
  const navigate = useNavigate();

  if (!isPremium) {
    return (
      <Button
        variant={variant}
        size={size}
        className={`${className} opacity-80`}
        onClick={() => navigate("/pricing")}
      >
        <Lock className="w-4 h-4 mr-2" />
        Premium
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {children}
    </Button>
  );
};

export default PremiumPreviewBanner;
