import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Rocket, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const StickyCTA = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling 400px
      const shouldShow = window.scrollY > 400;
      setIsVisible(shouldShow && !isDismissed);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isDismissed]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 bg-background/95 backdrop-blur-lg border-t border-border shadow-2xl safe-area-bottom"
        >
          <div className="max-w-lg mx-auto flex items-center gap-3">
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="p-2 rounded-full hover:bg-muted transition-colors flex-shrink-0"
              aria-label="Đóng"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                Học tiếng Hàn với AI miễn phí
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                50,000+ học viên đã tham gia
              </p>
            </div>

            {/* CTA Button */}
            <Button
              onClick={() => navigate("/auth")}
              size="sm"
              className="flex-shrink-0 h-10 sm:h-11 px-4 sm:px-6 btn-primary text-primary-foreground font-bold rounded-xl text-xs sm:text-sm whitespace-nowrap"
            >
              <Rocket className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" />
              Bắt đầu miễn phí
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StickyCTA;
