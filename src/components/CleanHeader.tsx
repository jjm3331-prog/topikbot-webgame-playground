import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Bell, Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MegaMenuOverlay } from "@/components/MegaMenuOverlay";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface CleanHeaderProps {
  isLoggedIn?: boolean;
  username?: string;
}

export const CleanHeader = ({ isLoggedIn = false, username }: CleanHeaderProps) => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    setIsMenuOpen(false);
    await supabase.auth.signOut();
    toast({
      title: "Đã đăng xuất",
      description: "Hẹn gặp lại bạn!",
    });
    navigate("/");
  };

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
              navigate(isLoggedIn ? "/dashboard" : "/");
            }}
          >
            <span className="text-xl sm:text-2xl">🇰🇷</span>
            <div className="flex flex-col">
              <span className="font-heading font-bold text-base sm:text-lg text-foreground leading-tight">LUKATO AI</span>
              {!isLoggedIn && (
                <span className="text-[10px] text-muted-foreground hidden sm:block">Học tiếng Hàn #1 VN</span>
              )}
            </div>
          </motion.div>

          {/* Center Menu Button */}
          <Button
            variant={isMenuOpen ? "default" : "outline"}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`flex items-center gap-2 h-9 px-4 rounded-full transition-all ${
              isMenuOpen 
                ? "bg-primary text-primary-foreground" 
                : "border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            }`}
          >
            <Menu className="w-4 h-4" />
            <span className="font-medium">Menu</span>
            <motion.span
              animate={{ rotate: isMenuOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              ∧
            </motion.span>
          </Button>

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

            {isLoggedIn ? (
              <>
                {/* User Badge */}
                <Button
                  variant="outline"
                  onClick={() => navigate("/profile")}
                  className="flex items-center gap-2 h-9 px-3 rounded-full"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm font-medium">{username || 'User'}</span>
                </Button>

                {/* Logout Button */}
                <Button 
                  variant="outline"
                  onClick={handleLogout}
                  className="h-9 px-3 rounded-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <LogOut className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline text-sm font-medium">Đăng xuất</span>
                </Button>
              </>
            ) : (
              <>
                {/* Guest User Icon */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-9 h-9 rounded-full"
                >
                  <User className="w-4 h-4" />
                </Button>

                {/* Login Button */}
                <Button 
                  onClick={() => navigate("/auth")}
                  className="h-9 px-4 rounded-full btn-primary text-primary-foreground text-sm font-semibold"
                >
                  Đăng nhập
                </Button>
              </>
            )}
          </div>
        </div>
      </motion.header>

      <MegaMenuOverlay 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
        isLoggedIn={isLoggedIn}
      />
    </>
  );
};

export default CleanHeader;
