import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Menu, LogOut, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MegaMenuOverlay } from "@/components/MegaMenuOverlay";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface CleanHeaderProps {
  isLoggedIn?: boolean;
  username?: string;
}

export const CleanHeader = ({ isLoggedIn = false, username }: CleanHeaderProps) => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userId, setUserId] = useState<string | undefined>();

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      }
    };
    if (isLoggedIn) {
      getUser();
    }
  }, [isLoggedIn]);

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
      <header className="fixed top-0 left-0 right-0 z-50 h-[60px] bg-background">
        <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          {/* Logo */}
          <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => {
              setIsMenuOpen(false);
              navigate(isLoggedIn ? "/dashboard" : "/");
            }}
          >
            <span className="text-xl sm:text-2xl">🇰🇷</span>
            <span className="font-heading font-bold text-base sm:text-lg text-foreground">LUKATO AI</span>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            
            {isLoggedIn ? (
              <>
                <NotificationDropdown userId={userId} />
                <Button
                  variant="ghost"
                  onClick={() => navigate("/profile")}
                  className="h-10 w-10 p-0 rounded-lg"
                >
                  <User className="w-5 h-5" />
                </Button>
              </>
            ) : (
              <Button 
                onClick={() => navigate("/auth")}
                className="h-10 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              >
                <LogIn className="w-4 h-4" />
              </Button>
            )}

            {/* Hamburger Menu Button */}
            <Button
              variant="ghost"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="h-10 w-10 p-0 rounded-lg"
            >
              <motion.div
                animate={{ rotate: isMenuOpen ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <Menu className="w-6 h-6" />
              </motion.div>
            </Button>
          </div>
        </div>
      </header>

      <MegaMenuOverlay 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)}
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
      />
    </>
  );
};

export default CleanHeader;
