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
          className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-background/95 backdrop-blur-lg border-t border-border shadow-2xl safe-area-bottom lg:hidden"
        >
          <div className="max-w-lg mx-auto flex items-center gap-2">
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-full hover:bg-muted transition-colors flex-shrink-0"
              aria-label="Đóng"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">
                Học tiếng Hàn miễn phí với AI
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                50,000+ học viên tin dùng
              </p>
            </div>

            {/* CTA Button */}
            <Button
              onClick={() => navigate("/auth")}
              size="sm"
              className="flex-shrink-0 h-9 px-4 btn-primary text-primary-foreground font-bold rounded-lg text-xs whitespace-nowrap"
            >
              <Rocket className="w-3.5 h-3.5 mr-1" />
              Bắt đầu
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StickyCTA;
