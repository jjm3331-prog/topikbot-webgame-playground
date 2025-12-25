import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import MobileMenu from "@/components/MobileMenu";
import { safeSignOut } from "@/lib/safeSignOut";


interface UserStats {
  hp: number;
  money: number;
  points: number;
  missions_completed: number;
}

interface AppHeaderProps {
  username?: string;
  avatarUrl?: string | null;
  showBack?: boolean;
  showLogout?: boolean;
  showMenu?: boolean;
  title?: string;
  titleVi?: string;
  userStats?: UserStats | null;
}

const AppHeader = ({ 
  username, 
  avatarUrl,
  showBack = true, 
  showLogout = true,
  showMenu = true,
  title,
  titleVi,
  userStats 
}: AppHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await safeSignOut();
    window.location.href = "/";
  };

  const handleBack = () => {
    if (location.pathname === "/dashboard") {
      navigate("/");
    } else {
      navigate("/dashboard");
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
            onClick={() => navigate(username ? "/dashboard" : "/")}
          >
            <img 
              src="/favicon.png" 
              alt="LUKATO" 
              className="w-7 h-7 min-w-[28px] min-h-[28px] rounded-full shadow-lg shadow-neon-pink/20 object-cover aspect-square"
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
              {avatarUrl ? (
                <img src={avatarUrl} alt={username} className="w-4 h-4 rounded-full object-cover" />
              ) : (
                <User className="w-3 h-3 text-neon-cyan" />
              )}
              <span className="text-white text-[10px] font-medium max-w-[60px] truncate">{username}</span>
            </div>
          )}
          
          {showLogout && username && !showMenu && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 w-7 p-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          )}

          {/* Mobile Hamburger Menu */}
          {showMenu && (
            <MobileMenu username={username} avatarUrl={avatarUrl} isLoggedIn={!!username} userStats={userStats} />
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
