import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Heart, Trophy, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

const PWAWelcome = () => {
  const { t } = useTranslation();
  const [showWelcome, setShowWelcome] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches 
      || (window.navigator as any).standalone === true;
    const hasSeenWelcome = localStorage.getItem("pwa-welcome-seen");

    if (isStandalone && !hasSeenWelcome) {
      setShowWelcome(true);
      setTimeout(() => {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }, 500);
    }
  }, []);

  const handleComplete = () => {
    localStorage.setItem("pwa-welcome-seen", "true");
    setShowWelcome(false);
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      handleComplete();
    }
  };

  const slides = [
    {
      icon: Sparkles,
      emoji: "🎉",
      titleKey: "pwaWelcome.installComplete",
      descKey: "pwaWelcome.appAdded",
      color: "from-neon-pink to-neon-purple"
    },
    {
      icon: Heart,
      emoji: "💕",
      titleKey: "pwaWelcome.seoulLoveSignal",
      descKey: "pwaWelcome.seoulLoveSignalDesc",
      color: "from-pink-500 to-rose-500"
    },
    {
      icon: Trophy,
      emoji: "🏆",
      titleKey: "pwaWelcome.rankingChallenge",
      descKey: "pwaWelcome.rankingChallengeDesc",
      color: "from-yellow-500 to-orange-500"
    },
    {
      icon: Star,
      emoji: "✨",
      titleKey: "pwaWelcome.startNow",
      descKey: "pwaWelcome.startNowDesc",
      color: "from-neon-cyan to-blue-500"
    }
  ];

  if (!showWelcome) return null;

  const currentData = slides[currentSlide];

  return (
    <AnimatePresence>
      {showWelcome && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-gradient-to-b from-[#1a1a2e] to-[#0f0f23] z-[200] flex flex-col items-center justify-center p-6"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 15 }}
            className="mb-8"
          >
            <img 
              src="/favicon.png" 
              alt="LUKATO" 
              className="w-20 h-20 rounded-2xl shadow-2xl shadow-neon-pink/40"
            />
          </motion.div>

          {/* Content Slider */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="text-center max-w-sm w-full"
            >
              <div className={`w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br ${currentData.color} flex items-center justify-center shadow-lg`}>
                <span className="text-5xl">{currentData.emoji}</span>
              </div>

              <h1 className="text-2xl font-bold text-white mb-2">
                {t(currentData.titleKey)}
              </h1>

              <p className="text-white/80 text-sm mb-2">
                {t(currentData.descKey)}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="flex gap-2 mt-8 mb-6">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentSlide 
                    ? "w-6 bg-gradient-to-r from-neon-pink to-neon-cyan" 
                    : "bg-white/30"
                }`}
              />
            ))}
          </div>

          <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
            <Button
              onClick={handleNext}
              className={`w-full py-6 text-lg font-bold bg-gradient-to-r ${currentData.color} hover:opacity-90 text-white rounded-xl`}
            >
              {currentSlide < slides.length - 1 ? (
                <>
                  {t("pwaWelcome.next")} <ArrowRight className="w-5 h-5 ml-2" />
                </>
              ) : (
                t("pwaWelcome.start")
              )}
            </Button>
            
            {currentSlide < slides.length - 1 && (
              <Button
                variant="ghost"
                onClick={handleComplete}
                className="text-white/50 hover:text-white hover:bg-white/10"
              >
                {t("pwaWelcome.skipBtn")}
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PWAWelcome;
