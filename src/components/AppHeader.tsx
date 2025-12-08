import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface AppHeaderProps {
  username?: string;
  showBack?: boolean;
  showLogout?: boolean;
  title?: string;
  titleVi?: string;
}

const AppHeader = ({ 
  username, 
  showBack = true, 
  showLogout = true,
  title,
  titleVi 
}: AppHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleBack = () => {
    if (location.pathname === "/game") {
      navigate("/");
    } else {
      navigate("/game");
    }
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-white/10">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          {showBack && (
            <button 
              onClick={handleBack} 
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-white/70 hover:text-white" />
            </button>
          )}
          
          {/* Logo */}
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => navigate(username ? "/game" : "/")}
          >
            <img 
              src="/favicon.png" 
              alt="LUKATO" 
              className="w-8 h-8 rounded-full shadow-lg shadow-neon-pink/20"
            />
            <div className="hidden sm:block">
              <span className="font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-neon-pink to-neon-cyan">
                LUKATO
              </span>
            </div>
          </div>

          {/* Page Title */}
          {title && (
            <div className="ml-2 pl-3 border-l border-white/20">
              <span className="text-white font-medium text-sm">{title}</span>
              {titleVi && (
                <span className="text-white/50 text-xs ml-1.5">/ {titleVi}</span>
              )}
            </div>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {username && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <User className="w-4 h-4 text-neon-cyan" />
              <span className="text-white text-sm font-medium">{username}</span>
            </div>
          )}
          
          {showLogout && username && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
