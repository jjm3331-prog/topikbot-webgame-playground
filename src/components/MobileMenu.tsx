import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Menu, 
  X, 
  Home, 
  Trophy, 
  Heart, 
  Briefcase, 
  Link2, 
  MessageSquare, 
  Film, 
  Music, 
  HelpCircle,
  Download,
  LogOut,
  Zap,
  Dice6,
  User
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface MobileMenuProps {
  username?: string;
  isLoggedIn?: boolean;
}

const MobileMenu = ({ username, isLoggedIn }: MobileMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsOpen(false);
    navigate("/");
  };

  const handleNavigate = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  const menuItems = [
    { path: "/game", icon: Home, labelKo: "메인 메뉴", labelVi: "Menu chính" },
    { path: "/chat", icon: Dice6, labelKo: "서울 생존", labelVi: "Sinh tồn Seoul" },
    { path: "/ranking", icon: Trophy, labelKo: "랭킹", labelVi: "Xếp hạng" },
    { path: "/dating", icon: Heart, labelKo: "Seoul Love Signal", labelVi: "Tín hiệu tình yêu" },
    { path: "/bankruptcy", icon: Zap, labelKo: "파산 복구", labelVi: "Phục hồi phá sản" },
    { path: "/parttime", icon: Briefcase, labelKo: "아르바이트", labelVi: "Làm thêm" },
    { path: "/wordchain", icon: Link2, labelKo: "끝말잇기", labelVi: "Nối từ" },
    { path: "/quiz", icon: MessageSquare, labelKo: "관용어 퀴즈", labelVi: "Quiz thành ngữ" },
    { path: "/kdrama", icon: Film, labelKo: "K-Drama 더빙", labelVi: "Lồng tiếng" },
    { path: "/kpop", icon: Music, labelKo: "K-POP 가사", labelVi: "Lời bài hát" },
    { path: "/tutorial", icon: HelpCircle, labelKo: "사용법 안내", labelVi: "Hướng dẫn" },
    { path: "/pwa-guide", icon: Download, labelKo: "앱 설치 안내", labelVi: "Cài đặt ứng dụng" },
  ];

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6 text-white" />
      </button>

      {/* Full Screen Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-[85%] max-w-[320px] bg-gradient-to-b from-[#1a1a2e] to-[#0f0f23] z-[101] flex flex-col safe-area-inset"
            >
              {/* Menu Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <img 
                    src="/favicon.png" 
                    alt="LUKATO" 
                    className="w-10 h-10 rounded-full shadow-lg shadow-neon-pink/30"
                  />
                  <div>
                    <span className="font-display font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-neon-pink to-neon-cyan">
                      LUKATO
                    </span>
                    {username && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3 text-neon-cyan" />
                        <span className="text-white/60 text-xs">{username}</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>

              {/* Menu Items */}
              <div className="flex-1 overflow-y-auto py-4 px-3">
                <div className="space-y-1">
                  {menuItems.map((item, index) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <motion.button
                        key={item.path}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => handleNavigate(item.path)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                          isActive 
                            ? "bg-gradient-to-r from-neon-pink/20 to-neon-purple/20 border border-neon-pink/30" 
                            : "hover:bg-white/5"
                        }`}
                      >
                        <item.icon className={`w-5 h-5 ${isActive ? "text-neon-cyan" : "text-white/60"}`} />
                        <div className="flex flex-col items-start">
                          <span className={`text-sm font-medium ${isActive ? "text-white" : "text-white/80"}`}>
                            {item.labelKo}
                          </span>
                          <span className="text-[10px] text-white/40">{item.labelVi}</span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Menu Footer */}
              {isLoggedIn && (
                <div className="p-4 border-t border-white/10">
                  <Button
                    variant="outline"
                    onClick={handleLogout}
                    className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    로그아웃 / Đăng xuất
                  </Button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default MobileMenu;
