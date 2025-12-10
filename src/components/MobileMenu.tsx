import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
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
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

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
  ];

  const menuContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Full screen overlay with solid black background */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.95)',
              zIndex: 99998,
            }}
            onClick={() => setIsOpen(false)}
          />

          {/* Menu Panel - absolutely positioned with solid background */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '85%',
              maxWidth: '320px',
              backgroundColor: '#0a0a14',
              zIndex: 99999,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Header */}
            <div style={{ 
              padding: '16px', 
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              backgroundColor: '#0a0a14',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img 
                    src="/favicon.png" 
                    alt="LUKATO" 
                    style={{ width: '40px', height: '40px', borderRadius: '50%' }}
                  />
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '18px', background: 'linear-gradient(to right, #ff6b9d, #00d4ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      LUKATO
                    </div>
                    {username && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <User style={{ width: '12px', height: '12px', color: '#00d4ff' }} />
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{username}</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{ padding: '8px', borderRadius: '50%', background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  <X style={{ width: '24px', height: '24px', color: 'white' }} />
                </button>
              </div>

              {/* User Stats */}
              {isLoggedIn && userStats && (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(4, 1fr)', 
                  gap: '8px', 
                  marginTop: '12px',
                  padding: '12px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#ff6b9d', fontSize: '16px', fontWeight: 'bold' }}>{userStats.hp}</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>HP</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#00d4ff', fontSize: '14px', fontWeight: 'bold' }}>₩{userStats.money.toLocaleString()}</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>소지금</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#4ade80', fontSize: '16px', fontWeight: 'bold' }}>{userStats.missions_completed}</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>미션</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#facc15', fontSize: '16px', fontWeight: 'bold' }}>{userStats.points.toLocaleString()}</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>포인트</div>
                  </div>
                </div>
              )}
            </div>

            {/* Scrollable Menu Items */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              padding: '16px 12px',
              backgroundColor: '#0a0a14',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {menuItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  const IconComponent = item.icon;
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleNavigate(item.path)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        borderRadius: '12px',
                        border: isActive ? '1px solid rgba(255,107,157,0.3)' : 'none',
                        background: isActive ? 'linear-gradient(to right, rgba(255,107,157,0.2), rgba(168,85,247,0.2))' : 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <IconComponent style={{ width: '20px', height: '20px', color: isActive ? '#00d4ff' : 'rgba(255,255,255,0.6)' }} />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: isActive ? 'white' : 'rgba(255,255,255,0.8)' }}>
                          {item.labelKo}
                        </div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>{item.labelVi}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* PWA Section */}
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ padding: '0 8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#00d4ff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    앱 설치 안내
                  </span>
                </div>

                {/* Android */}
                <button
                  onClick={() => setShowAndroidGuide(!showAndroidGuide)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Smartphone style={{ width: '20px', height: '20px', color: '#4ade80' }} />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>Android 설치</div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Cài đặt trên Android</div>
                    </div>
                  </div>
                  <ChevronDown style={{ width: '16px', height: '16px', color: 'rgba(255,255,255,0.4)', transform: showAndroidGuide ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                {showAndroidGuide && (
                  <div style={{ padding: '12px', margin: '0 8px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', fontSize: '12px' }}>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500, marginBottom: '8px' }}>📱 Android 설치 방법:</p>
                    <ol style={{ color: 'rgba(255,255,255,0.6)', paddingLeft: '16px', margin: 0 }}>
                      <li>Chrome 메뉴 (⋮) 클릭</li>
                      <li>"홈 화면에 추가" 선택</li>
                      <li>"설치" 버튼 클릭</li>
                    </ol>
                  </div>
                )}

                {/* iOS */}
                <button
                  onClick={() => setShowIOSGuide(!showIOSGuide)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    marginTop: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Apple style={{ width: '20px', height: '20px', color: 'rgba(255,255,255,0.8)' }} />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>iOS 설치</div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Cài đặt trên iPhone</div>
                    </div>
                  </div>
                  <ChevronDown style={{ width: '16px', height: '16px', color: 'rgba(255,255,255,0.4)', transform: showIOSGuide ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                {showIOSGuide && (
                  <div style={{ padding: '12px', margin: '0 8px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', fontSize: '12px' }}>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500, marginBottom: '8px' }}>🍎 iOS 설치 방법:</p>
                    <ol style={{ color: 'rgba(255,255,255,0.6)', paddingLeft: '16px', margin: 0 }}>
                      <li>Safari에서 열기</li>
                      <li>공유 버튼 (⎙) 클릭</li>
                      <li>"홈 화면에 추가" 선택</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            {isLoggedIn && (
              <div style={{ 
                padding: '16px', 
                borderTop: '1px solid rgba(255,255,255,0.1)',
                backgroundColor: '#0a0a14',
                flexShrink: 0,
              }}>
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
  );

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

      {/* Render menu in portal to avoid z-index issues */}
      {typeof document !== 'undefined' && createPortal(menuContent, document.body)}
    </>
  );
};

export default MobileMenu;