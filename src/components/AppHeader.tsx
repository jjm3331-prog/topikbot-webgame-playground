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
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#1a1a2e]/95 border-b border-white/10 shrink-0 safe-area-top">
      <div className="flex items-center justify-between px-3 py-2">
        {/* Left Section */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {showBack && (
            <button 
              onClick={handleBack} 
              className="p-1 rounded-full hover:bg-white/10 transition-colors shrink-0"
            >
              <ChevronLeft className="w-5 h-5 text-white/70" />
            </button>
          )}
          
          {/* Logo */}
          <div 
            className="flex items-center gap-1.5 cursor-pointer shrink-0" 
            onClick={() => navigate(username ? "/game" : "/")}
          >
            <img 
              src="/favicon.png" 
              alt="LUKATO" 
              className="w-7 h-7 rounded-full shadow-lg shadow-neon-pink/20"
            />
            <span className="font-display font-bold text-sm text-transparent bg-clip-text bg-gradient-to-r from-neon-pink to-neon-cyan hidden xs:inline">
              LUKATO
            </span>
          </div>

          {/* Page Title */}
          {title && (
            <div className="ml-1 pl-2 border-l border-white/20 min-w-0 truncate">
              <span className="text-white font-medium text-xs">{title}</span>
              {titleVi && (
                <span className="text-white/40 text-[10px] ml-1">/ {titleVi}</span>
              )}
            </div>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-1 shrink-0">
          {username && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 border border-white/10">
              <User className="w-3 h-3 text-neon-cyan" />
              <span className="text-white text-[10px] font-medium max-w-[60px] truncate">{username}</span>
            </div>
          )}
          
          {showLogout && username && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 w-7 p-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
