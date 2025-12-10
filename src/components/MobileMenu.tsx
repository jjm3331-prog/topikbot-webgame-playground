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
  User,
  Smartphone,
  Apple,
  ChevronDown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface UserStats {
  hp: number;
  money: number;
  points: number;
  missions_completed: number;
}

interface MobileMenuProps {
  username?: string;
  isLoggedIn?: boolean;
  userStats?: UserStats | null;
}

const MobileMenu = ({ username, isLoggedIn, userStats }: MobileMenuProps) => {
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

  const [showAndroidGuide, setShowAndroidGuide] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

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

            {/* Menu Panel - 완전 불투명 배경 */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-[85%] max-w-[320px] bg-[#0f0f1a] z-[101] flex flex-col safe-area-inset shadow-2xl"
              style={{ backgroundColor: '#0f0f1a' }}
            >
              {/* Menu Header */}
              <div className="p-4 border-b border-white/10 bg-[#0f0f1a]">
                <div className="flex items-center justify-between mb-3">
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

                {/* User Stats Display */}
                {isLoggedIn && userStats && (
                  <div className="grid grid-cols-4 gap-2 mt-3 p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-center">
                      <div className="text-neon-pink text-lg font-bold">{userStats.hp}</div>
                      <div className="text-[10px] text-white/40">HP</div>
                    </div>
                    <div className="text-center">
                      <div className="text-neon-cyan text-lg font-bold">₩{userStats.money.toLocaleString()}</div>
                      <div className="text-[10px] text-white/40">소지금</div>
                    </div>
                    <div className="text-center">
                      <div className="text-green-400 text-lg font-bold">{userStats.missions_completed}</div>
                      <div className="text-[10px] text-white/40">미션</div>
                    </div>
                    <div className="text-center">
                      <div className="text-yellow-400 text-lg font-bold">{userStats.points.toLocaleString()}</div>
                      <div className="text-[10px] text-white/40">포인트</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Menu Items */}
              <div className="flex-1 overflow-y-auto py-4 px-3 bg-[#0f0f1a]">
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

                {/* PWA 설치 안내 섹션 */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="px-2 mb-2">
                    <span className="text-xs font-semibold text-neon-cyan uppercase tracking-wider">
                      앱 설치 안내 / Cài đặt ứng dụng
                    </span>
                  </div>

                  {/* Android 설치 안내 */}
                  <div className="mb-2">
                    <button
                      onClick={() => setShowAndroidGuide(!showAndroidGuide)}
                      className="w-full flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-5 h-5 text-green-400" />
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-medium text-white/80">Android 설치</span>
                          <span className="text-[10px] text-white/40">Cài đặt trên Android</span>
                        </div>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${showAndroidGuide ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {showAndroidGuide && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 py-3 mx-2 rounded-lg bg-white/5 text-xs space-y-2">
                            <p className="text-white/70 font-medium">📱 Android 설치 방법:</p>
                            <ol className="text-white/60 space-y-1 pl-4 list-decimal">
                              <li>Chrome 브라우저 메뉴 (⋮) 클릭</li>
                              <li>"홈 화면에 추가" 또는 "앱 설치" 선택</li>
                              <li>"설치" 버튼 클릭</li>
                            </ol>
                            <p className="text-white/50 pt-1 border-t border-white/10">
                              🇻🇳 Nhấn menu (⋮) → "Thêm vào màn hình chính" → "Cài đặt"
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* iOS 설치 안내 */}
                  <div>
                    <button
                      onClick={() => setShowIOSGuide(!showIOSGuide)}
                      className="w-full flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Apple className="w-5 h-5 text-white/80" />
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-medium text-white/80">iOS (iPhone) 설치</span>
                          <span className="text-[10px] text-white/40">Cài đặt trên iPhone</span>
                        </div>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${showIOSGuide ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {showIOSGuide && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 py-3 mx-2 rounded-lg bg-white/5 text-xs space-y-2">
                            <p className="text-white/70 font-medium">🍎 iOS 설치 방법:</p>
                            <ol className="text-white/60 space-y-1 pl-4 list-decimal">
                              <li>Safari 브라우저에서 열기</li>
                              <li>하단 공유 버튼 (⎙) 클릭</li>
                              <li>"홈 화면에 추가" 선택</li>
                              <li>"추가" 버튼 클릭</li>
                            </ol>
                            <p className="text-white/50 pt-1 border-t border-white/10">
                              🇻🇳 Mở Safari → Nhấn nút chia sẻ (⎙) → "Thêm vào MH chính" → "Thêm"
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Menu Footer */}
              {isLoggedIn && (
                <div className="p-4 border-t border-white/10 bg-[#0f0f1a]">
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
