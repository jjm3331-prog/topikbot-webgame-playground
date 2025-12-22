import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Bell, X, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MegaMenuOverlay } from "@/components/MegaMenuOverlay";

export const CleanHeader = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 h-[60px] bg-background border-b border-border"
      >
        <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          {/* Logo */}
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => {
              setIsMenuOpen(false);
              navigate("/");
            }}
          >
            <span className="text-xl sm:text-2xl">🇰🇷</span>
            <span className="font-heading font-bold text-base sm:text-lg text-foreground">LUKATO AI</span>
          </motion.div>

          {/* Right Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 rounded-full"
            >
              <Bell className="w-4 h-4" />
            </Button>

            {/* Profile/Menu Toggle */}
            <Button
              variant={isMenuOpen ? "destructive" : "outline"}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`flex items-center gap-2 h-9 px-3 rounded-full transition-all ${
                isMenuOpen 
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" 
                  : "hover:bg-muted"
              }`}
            >
              {isMenuOpen ? (
                <X className="w-4 h-4" />
              ) : (
                <>
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm font-medium">Menu</span>
                </>
              )}
            </Button>

            {/* Login Button - only show when menu is closed */}
            {!isMenuOpen && (
              <Button 
                onClick={() => navigate("/auth")}
                className="h-9 px-4 rounded-full btn-primary text-primary-foreground text-sm font-semibold"
              >
                Đăng nhập
              </Button>
            )}
          </div>
        </div>
      </motion.header>

      <MegaMenuOverlay isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </>
  );
};

export default CleanHeader;
