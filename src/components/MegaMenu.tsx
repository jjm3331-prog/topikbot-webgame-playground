import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Home, 
  BookOpen, 
  MessageCircle,
  Trophy,
  HelpCircle,
  Compass,
  History,
  Notebook,
  Users,
  Sparkles,
  Crown,
  PenTool,
  ChevronDown,
  X,
  Menu,
  Gamepad2,
  Heart,
  Mic2,
  Briefcase,
  Drama,
  Music,
  MessageSquare,
  Bookmark,
  Languages,
  ExternalLink,
  LogOut,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface MenuItem {
  icon: React.ElementType;
  label: string;
  href: string;
  isPremium?: boolean;
  isExternal?: boolean;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const menuSections: MenuSection[] = [
  {
    title: "HỌC TOPIK",
    items: [
      { icon: BookOpen, label: "TOPIK I (1-2급)", href: "/topik-1" },
      { icon: Crown, label: "TOPIK II (3-6급)", href: "/topik-2" },
    ]
  },
  {
    title: "GAME HỌC",
    items: [
      { icon: Gamepad2, label: "AI Sinh tồn Seoul", href: "/chat" },
      { icon: Heart, label: "Hẹn hò Hàn Quốc", href: "/dating" },
      { icon: MessageSquare, label: "Nối từ tiếng Hàn", href: "/wordchain" },
      { icon: Music, label: "K-POP Quiz", href: "/kpop" },
      { icon: Drama, label: "K-Drama Lồng tiếng", href: "/kdrama" },
      { icon: Briefcase, label: "Làm thêm Hàn Quốc", href: "/parttime" },
    ]
  },
  {
    title: "CÔNG CỤ AI",
    items: [
      { icon: MessageCircle, label: "Hỏi AI (5 lần/ngày)", href: "/ai-tutor" },
      { icon: PenTool, label: "Chấm Writing TOPIK", href: "/writing-correction", isPremium: true },
      { icon: Languages, label: "Dịch Hàn-Việt", href: "/translate" },
    ]
  },
  {
    title: "CỦA TÔI",
    items: [
      { icon: User, label: "Hồ sơ của tôi", href: "/profile" },
      { icon: Sparkles, label: "Tiến độ học tập", href: "/progress" },
      { icon: Notebook, label: "Sổ lỗi sai", href: "/mistakes", isPremium: true },
      { icon: Bookmark, label: "Từ vựng đã lưu", href: "/vocabulary" },
      { icon: History, label: "Lịch sử học tập", href: "/history" },
    ]
  },
  {
    title: "KHÁC",
    items: [
      { icon: Crown, label: "Bảng giá", href: "/pricing" },
      { icon: Trophy, label: "Bảng xếp hạng", href: "/ranking" },
      { icon: Users, label: "Cộng đồng", href: "/community" },
      { icon: Compass, label: "Hướng dẫn", href: "/tutorial" },
      { icon: HelpCircle, label: "Hỗ trợ", href: "/support" },
    ]
  },
];

export const MegaMenu = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsLoggedIn(true);
        // Fetch username from profiles
        const { data } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", session.user.id)
          .single();
        if (data) {
          setUsername(data.username);
        }
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
      if (!session) {
        setUsername(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setIsOpen(false);
      toast({
        title: "Đăng xuất thành công",
        description: "Hẹn gặp lại bạn!",
      });
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Lỗi",
        description: "Không thể đăng xuất. Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  const handleNavigation = (href: string, isExternal?: boolean) => {
    setIsOpen(false);
    if (isExternal) {
      window.open(href, "_blank");
    } else if (href.startsWith("#")) {
      const element = document.querySelector(href);
      element?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate(href);
    }
  };

  return (
    <>
      {/* Header */}
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/90 border-b border-border/50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          {/* Logo */}
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-2 sm:gap-3 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <span className="text-2xl sm:text-3xl">🇰🇷</span>
            <div>
              <span className="font-heading font-bold text-lg sm:text-xl text-foreground">LUKATO AI</span>
              <span className="hidden sm:block text-xs text-muted-foreground -mt-0.5">Học tiếng Hàn #1 VN</span>
            </div>
          </motion.div>

          {/* Desktop Navigation Trigger */}
          <nav className="hidden lg:flex items-center">
            <Button
              variant="ghost"
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-2 font-medium text-muted-foreground hover:text-foreground"
            >
              <Menu className="w-4 h-4" />
              Menu
              <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </Button>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            
            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>

            {/* Auth Buttons */}
            {isLoggedIn ? (
              <div className="flex items-center gap-2">
                {username && (
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border">
                    <User className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-foreground max-w-[100px] truncate">
                      {username}
                    </span>
                  </div>
                )}
                <Button 
                  variant="ghost"
                  onClick={() => navigate("/dashboard")}
                  className="hidden sm:flex rounded-xl font-semibold px-4 text-sm"
                >
                  Dashboard
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleLogout}
                  className="rounded-xl font-semibold px-4 text-sm text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Đăng xuất</span>
                </Button>
              </div>
            ) : (
              <Button 
                onClick={() => navigate("/auth")}
                className="btn-primary text-primary-foreground rounded-xl font-semibold px-4 sm:px-6 text-sm sm:text-base"
              >
                Đăng nhập
              </Button>
            )}
          </div>
        </div>
      </motion.header>

      {/* Mega Menu Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
              style={{ top: "64px" }}
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="fixed left-0 right-0 z-50 bg-card border-b border-border shadow-2xl max-h-[80vh] overflow-y-auto"
              style={{ top: "64px" }}
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {/* Close button */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="absolute top-4 right-4 sm:right-6 p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>

                {/* Menu Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 sm:gap-8">
                  {menuSections.map((section) => (
                    <div key={section.title}>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                        {section.title}
                      </h3>
                      <ul className="space-y-1">
                        {section.items.map((item) => (
                          <li key={item.label}>
                            <button
                              onClick={() => handleNavigation(item.href, item.isExternal)}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all
                                ${item.href === "/" 
                                  ? "bg-primary/10 text-primary" 
                                  : "text-foreground hover:bg-muted"
                                }
                              `}
                            >
                              <item.icon className="w-4 h-4 shrink-0" />
                              <span className="text-sm font-medium truncate">{item.label}</span>
                              {item.isPremium && (
                                <span className="ml-auto px-1.5 py-0.5 bg-accent text-accent-foreground text-[10px] font-bold rounded">
                                  Premium
                                </span>
                              )}
                              {item.isExternal && (
                                <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {/* Premium AI Banner */}
                <div className="mt-8 pt-6 border-t border-border">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-korean-purple/10 to-korean-pink/10 rounded-2xl p-4 sm:p-6">
                    <div className="flex items-center gap-3 text-center sm:text-left">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-korean-orange flex items-center justify-center">
                        <Crown className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">🚀 LUKATO AI Premium</p>
                        <p className="text-sm text-muted-foreground">Hỏi AI không giới hạn + Chấm Writing chuyên sâu</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline"
                        onClick={() => window.open("https://chat-topikbot.kr", "_blank")}
                        className="rounded-xl font-semibold"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        LUKATO AI Engine
                      </Button>
                      <Button 
                        onClick={() => {
                          setIsOpen(false);
                          document.querySelector("#pricing")?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="btn-primary text-primary-foreground rounded-xl font-semibold"
                      >
                        Xem bảng giá
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default MegaMenu;