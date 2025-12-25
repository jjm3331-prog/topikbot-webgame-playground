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
  ChevronDown,
  Sparkles,
  GraduationCap,
  Wand2,
  Crown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { safeSignOut } from "@/lib/safeSignOut";


interface UserStats {
  hp: number;
  money: number;
  points: number;
  missions_completed: number;
}

interface MobileMenuProps {
  username?: string;
  avatarUrl?: string | null;
  isLoggedIn?: boolean;
  userStats?: UserStats | null;
}

const MobileMenu = ({ username, avatarUrl, isLoggedIn, userStats }: MobileMenuProps) => {
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
    setIsOpen(false);
    await safeSignOut();
    // Hard reload to guarantee state reset
    window.location.href = "/";
  };

  const handleNavigate = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  // Việc làm section
  const careerItems = [
    { path: "/korea-career", icon: Briefcase, labelVi: "Tìm việc tại Hàn Quốc" },
    { path: "/headhunting", icon: GraduationCap, labelVi: "Headhunting" },
  ];

  // TOPIK 학습 허브
  const topikItems = [
    { path: "/learning-hub", icon: Sparkles, labelVi: "Trung tâm học TOPIK", isHighlight: true },
  ];

  // Game items
  const gameItems = [
    { path: "/game-hub", icon: Dice6, labelVi: "Trung tâm Game", isHighlight: true },
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
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={username} style={{ width: '14px', height: '14px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <User style={{ width: '12px', height: '12px', color: '#00d4ff' }} />
                        )}
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
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Tiền</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#4ade80', fontSize: '16px', fontWeight: 'bold' }}>{userStats.missions_completed}</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>NV</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#facc15', fontSize: '16px', fontWeight: 'bold' }}>{userStats.points.toLocaleString()}</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Điểm</div>
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
              {/* VIỆC LÀM Section */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ padding: '0 8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#facc15', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    💼 VIỆC LÀM
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {careerItems.map((item) => {
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
                          border: isActive ? '1px solid rgba(250,204,21,0.3)' : '1px solid rgba(250,204,21,0.15)',
                          background: isActive ? 'linear-gradient(to right, rgba(250,204,21,0.2), rgba(234,179,8,0.2))' : 'rgba(250,204,21,0.05)',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <IconComponent style={{ width: '20px', height: '20px', color: '#facc15' }} />
                        <div style={{ fontSize: '14px', fontWeight: 500, color: isActive ? 'white' : 'rgba(255,255,255,0.8)' }}>
                          {item.labelVi}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* HỌC TOPIK Section */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ padding: '0 8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    📚 HỌC TOPIK
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {topikItems.map((item) => {
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
                          border: isActive ? '1px solid rgba(168,85,247,0.3)' : '1px solid rgba(168,85,247,0.15)',
                          background: isActive ? 'linear-gradient(to right, rgba(168,85,247,0.2), rgba(236,72,153,0.2))' : 'rgba(168,85,247,0.05)',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <IconComponent style={{ width: '20px', height: '20px', color: '#a855f7' }} />
                        <div style={{ fontSize: '14px', fontWeight: 500, color: isActive ? 'white' : 'rgba(255,255,255,0.8)' }}>
                          {item.labelVi}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* GAME Section */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ padding: '0 8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#ec4899', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    🎮 GAME
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {gameItems.map((item) => {
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
                          border: isActive ? '1px solid rgba(236,72,153,0.3)' : 'none',
                          background: isActive ? 'linear-gradient(to right, rgba(236,72,153,0.2), rgba(168,85,247,0.2))' : 'transparent',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <IconComponent style={{ width: '20px', height: '20px', color: isActive ? '#00d4ff' : 'rgba(255,255,255,0.6)' }} />
                        <div style={{ fontSize: '14px', fontWeight: 500, color: isActive ? 'white' : 'rgba(255,255,255,0.8)' }}>
                          {item.labelVi}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PWA Section */}
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ padding: '0 8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#00d4ff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    📲 Cài đặt App
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
                    <div style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>
                      Cài đặt trên Android
                    </div>
                  </div>
                  <ChevronDown style={{ width: '16px', height: '16px', color: 'rgba(255,255,255,0.4)', transform: showAndroidGuide ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                {showAndroidGuide && (
                  <div style={{ padding: '12px', margin: '0 8px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', fontSize: '12px' }}>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500, marginBottom: '8px' }}>📱 Cách cài đặt trên Android:</p>
                    <ol style={{ color: 'rgba(255,255,255,0.6)', paddingLeft: '16px', margin: 0 }}>
                      <li>Nhấn menu Chrome (⋮) ở góc phải</li>
                      <li>Chọn "Thêm vào màn hình chính"</li>
                      <li>Nhấn nút "Cài đặt"</li>
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
                    <div style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>
                      Cài đặt trên iPhone
                    </div>
                  </div>
                  <ChevronDown style={{ width: '16px', height: '16px', color: 'rgba(255,255,255,0.4)', transform: showIOSGuide ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                {showIOSGuide && (
                  <div style={{ padding: '12px', margin: '0 8px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', fontSize: '12px' }}>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500, marginBottom: '8px' }}>🍎 Cách cài đặt trên iPhone:</p>
                    <ol style={{ color: 'rgba(255,255,255,0.6)', paddingLeft: '16px', margin: 0 }}>
                      <li>Mở bằng trình duyệt Safari</li>
                      <li>Nhấn nút chia sẻ (⎙) ở dưới</li>
                      <li>Chọn "Thêm vào MH chính"</li>
                      <li>Nhấn "Thêm" ở góc phải</li>
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