import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

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
    navigate("/", { replace: true });
  };

  const handleNavigate = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  const careerItems = [
    { path: "/korea-career", icon: Briefcase, labelKey: "mobileMenu.items.koreaCareer" },
    { path: "/headhunting", icon: GraduationCap, labelKey: "mobileMenu.items.headhunting" },
  ];

  const topikItems = [
    { path: "/learning-hub", icon: Sparkles, labelKey: "mobileMenu.items.learningHub", isHighlight: true },
    { path: "/hanja-mindmap", icon: GraduationCap, labelKey: "menu.items.hanjaMindmap", isHighlight: true },
    { path: "/mock-exam", icon: GraduationCap, labelKey: "menu.items.mockExam", isHighlight: true },
    { path: "/shorts", icon: Smartphone, labelKey: "menu.items.shorts", isHighlight: true },
    { path: "/board-hub", icon: MessageSquare, labelKey: "mobileMenu.items.community", isHighlight: true },
  ];

  const gameItems = [
    { path: "/game-hub", icon: Dice6, labelKey: "mobileMenu.items.gameHub", isHighlight: true },
  ];

  const menuContent = (
    <AnimatePresence>
      {isOpen && (
        <>
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
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>{t("mobileMenu.stats.money")}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#4ade80', fontSize: '16px', fontWeight: 'bold' }}>{userStats.missions_completed}</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>{t("mobileMenu.stats.missions")}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#facc15', fontSize: '16px', fontWeight: 'bold' }}>{userStats.points.toLocaleString()}</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>{t("mobileMenu.stats.points")}</div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              padding: '16px 12px',
              backgroundColor: '#0a0a14',
            }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ padding: '0 8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#facc15', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    💼 {t("mobileMenu.sections.career")}
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
                          {t(item.labelKey)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ padding: '0 8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    📚 {t("mobileMenu.sections.topik")}
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
                          {t(item.labelKey)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ padding: '0 8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#ec4899', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    🎮 {t("mobileMenu.sections.game")}
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
                          {t(item.labelKey)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ padding: '0 8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#00d4ff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    📲 {t("mobileMenu.sections.installApp")}
                  </span>
                </div>

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
                      {t("mobileMenu.pwa.android")}
                    </div>
                  </div>
                  <ChevronDown style={{ width: '16px', height: '16px', color: 'rgba(255,255,255,0.4)', transform: showAndroidGuide ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                {showAndroidGuide && (
                  <div style={{ padding: '12px', margin: '0 8px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', fontSize: '12px' }}>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500, marginBottom: '8px' }}>📱 {t("mobileMenu.pwa.androidGuideTitle")}:</p>
                    <ol style={{ color: 'rgba(255,255,255,0.6)', paddingLeft: '16px', margin: 0 }}>
                      <li>{t("mobileMenu.pwa.androidStep1")}</li>
                      <li>{t("mobileMenu.pwa.androidStep2")}</li>
                      <li>{t("mobileMenu.pwa.androidStep3")}</li>
                    </ol>
                  </div>
                )}

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
                      {t("mobileMenu.pwa.ios")}
                    </div>
                  </div>
                  <ChevronDown style={{ width: '16px', height: '16px', color: 'rgba(255,255,255,0.4)', transform: showIOSGuide ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                {showIOSGuide && (
                  <div style={{ padding: '12px', margin: '0 8px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', fontSize: '12px' }}>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500, marginBottom: '8px' }}>🍎 {t("mobileMenu.pwa.iosGuideTitle")}:</p>
                    <ol style={{ color: 'rgba(255,255,255,0.6)', paddingLeft: '16px', margin: 0 }}>
                      <li>{t("mobileMenu.pwa.iosStep1")}</li>
                      <li>{t("mobileMenu.pwa.iosStep2")}</li>
                      <li>{t("mobileMenu.pwa.iosStep3")}</li>
                      <li>{t("mobileMenu.pwa.iosStep4")}</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>

            {isLoggedIn && (
              <div style={{ 
                padding: '16px', 
                borderTop: '1px solid rgba(255,255,255,0.1)',
                backgroundColor: '#0a0a14',
                flexShrink: 0,
              }}>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(239,68,68,0.3)',
                    background: 'rgba(239,68,68,0.1)',
                    cursor: 'pointer',
                    color: '#ef4444',
                    fontWeight: 600,
                    fontSize: '14px',
                  }}
                >
                  <LogOut style={{ width: '18px', height: '18px' }} />
                  {t("common.logout")}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="lg:hidden"
      >
        <Menu className="w-6 h-6" />
      </Button>

      {typeof document !== 'undefined' && createPortal(menuContent, document.body)}
    </>
  );
};

export default MobileMenu;
