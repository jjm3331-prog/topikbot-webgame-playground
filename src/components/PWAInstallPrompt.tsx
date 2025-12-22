import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed before (with 24-hour cooldown)
    const dismissedTime = localStorage.getItem("pwa-prompt-dismissed");
    if (dismissedTime) {
      const hoursSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60);
      if (hoursSinceDismissed < 24) {
        return;
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after a short delay for better UX
      setTimeout(() => setShowPrompt(true), 2000);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error("PWA install error:", error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-prompt-dismissed", Date.now().toString());
  };

  if (isInstalled || !showPrompt) return null;

  return (
    <AnimatePresence>
      {showPrompt && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={handleDismiss}
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto"
          >
            <div className="bg-gradient-to-br from-purple-900 via-gray-900 to-pink-900 rounded-3xl p-6 shadow-2xl border border-white/10">
              {/* Close button */}
              <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Icon */}
              <div className="flex justify-center mb-4">
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                  className="relative"
                >
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-neon-cyan to-neon-pink flex items-center justify-center shadow-lg shadow-neon-pink/30">
                    <Smartphone className="w-10 h-10 text-white" />
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute -top-2 -right-2"
                  >
                    <Sparkles className="w-6 h-6 text-yellow-400" />
                  </motion.div>
                </motion.div>
              </div>

              {/* Content */}
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white mb-2">
                  📱 Cài đặt Game LUKATO
                </h3>
                <p className="text-white/60 text-sm mt-3 leading-relaxed">
                  Thêm vào màn hình chính để truy cập nhanh hơn!<br />
                  Trải nghiệm như ứng dụng thực thụ!
                </p>
              </div>

              {/* Benefits */}
              <div className="grid grid-cols-3 gap-2 mb-6">
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <span className="text-2xl">⚡</span>
                  <p className="text-white/80 text-xs mt-1">Khởi động nhanh</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <span className="text-2xl">📴</span>
                  <p className="text-white/80 text-xs mt-1">Dùng offline</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <span className="text-2xl">🔔</span>
                  <p className="text-white/80 text-xs mt-1">Nhận thông báo</p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleDismiss}
                  className="flex-1 border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
                >
                  Để sau
                </Button>
                <Button
                  onClick={handleInstall}
                  className="flex-1 bg-gradient-to-r from-neon-cyan to-neon-pink hover:from-neon-cyan/90 hover:to-neon-pink/90 text-white font-bold"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Cài đặt ngay
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PWAInstallPrompt;