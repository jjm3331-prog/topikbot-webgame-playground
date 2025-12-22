import { useNavigate, useLocation } from "react-router-dom";
import { 
  BookOpen, 
  MessageCircle,
  Trophy,
  HelpCircle,
  Compass,
  Notebook,
  Users,
  Sparkles,
  Crown,
  PenTool,
  Gamepad2,
  Heart,
  Briefcase,
  Drama,
  Music,
  MessageSquare,
  Bookmark,
  Languages,
  User,
  LogOut,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  Home
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface MenuItem {
  icon: React.ElementType;
  label: string;
  href: string;
  isPremium?: boolean;
}

interface MenuSection {
  title: string;
  emoji: string;
  items: MenuItem[];
  defaultOpen?: boolean;
}

const menuSections: MenuSection[] = [
  {
    title: "DU HỌC & VIỆC LÀM",
    emoji: "✈️",
    items: [
      { icon: Briefcase, label: "Tìm việc tại Hàn Quốc", href: "/korea-career" },
      { icon: BookOpen, label: "Tư vấn du học Hàn", href: "/korea-career#study" },
    ],
    defaultOpen: false
  },
  {
    title: "HỌC TOPIK",
    emoji: "📚",
    items: [
      { icon: BookOpen, label: "TOPIK I (1-2급)", href: "/topik-1" },
      { icon: Crown, label: "TOPIK II (3-6급)", href: "/topik-2" },
    ],
    defaultOpen: true
  },
  {
    title: "GAME HỌC",
    emoji: "🎮",
    items: [
      { icon: Crown, label: "LUKATO Manager", href: "/manager" },
      { icon: Gamepad2, label: "AI Sinh tồn Seoul", href: "/chat" },
      { icon: Heart, label: "Hẹn hò Hàn Quốc", href: "/dating" },
      { icon: MessageSquare, label: "Nối từ tiếng Hàn", href: "/wordchain" },
      { icon: Music, label: "K-POP Quiz", href: "/kpop" },
      { icon: Drama, label: "K-Drama Lồng tiếng", href: "/kdrama" },
      { icon: Briefcase, label: "Làm thêm Hàn Quốc", href: "/parttime" },
    ],
    defaultOpen: true
  },
  {
    title: "CÔNG CỤ AI",
    emoji: "🤖",
    items: [
      { icon: MessageCircle, label: "Hỏi AI (30/ngày)", href: "/ai-tutor" },
      { icon: PenTool, label: "Chấm bài viết", href: "/writing-correction", isPremium: true },
      { icon: Languages, label: "Dịch Hàn-Việt", href: "/translate" },
    ],
    defaultOpen: false
  },
  {
    title: "CỦA TÔI",
    emoji: "👤",
    items: [
      { icon: Sparkles, label: "Tiến độ học tập", href: "/progress", isPremium: true },
      { icon: Trophy, label: "Xếp hạng của tôi", href: "/ranking" },
      { icon: Notebook, label: "Sổ lỗi sai", href: "/mistakes", isPremium: true },
      { icon: Bookmark, label: "Từ vựng đã lưu (15/50)", href: "/vocabulary" },
      { icon: User, label: "Hồ sơ của tôi", href: "/profile" },
      { icon: Users, label: "Mời bạn bè", href: "/profile#invite" },
    ],
    defaultOpen: false
  },
  {
    title: "KHÁC",
    emoji: "⚙️",
    items: [
      { icon: Crown, label: "Bảng giá", href: "/pricing" },
      { icon: Compass, label: "Hướng dẫn", href: "/tutorial" },
      { icon: HelpCircle, label: "Hỗ trợ", href: "/support" },
    ],
    defaultOpen: false
  },
];

interface AppSidebarProps {
  username?: string | null;
}

export const AppSidebar = ({ username }: AppSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(() => {
    const initialOpen = new Set<string>();
    menuSections.forEach(section => {
      if (section.defaultOpen) {
        initialOpen.add(section.title);
      }
      // Also open section containing current route
      if (section.items.some(item => currentPath === item.href || currentPath.startsWith(item.href.split("#")[0]))) {
        initialOpen.add(section.title);
      }
    });
    return initialOpen;
  });

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
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

  const handleNavigation = (href: string) => {
    if (href.startsWith("#")) {
      const element = document.querySelector(href);
      element?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate(href);
    }
  };

  const toggleSection = (title: string) => {
    setOpenSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(title)) {
        newSet.delete(title);
      } else {
        newSet.add(title);
      }
      return newSet;
    });
  };

  const isActive = (href: string) => {
    return currentPath === href || (href !== "/" && currentPath.startsWith(href.split("#")[0]));
  };

  return (
    <motion.aside
      initial={{ x: -280 }}
      animate={{ 
        x: 0,
        width: isCollapsed ? 64 : 280 
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={cn(
        "fixed left-0 top-0 bottom-0 z-40 bg-card border-r border-border flex flex-col",
        isCollapsed ? "w-16" : "w-70"
      )}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        {!isCollapsed && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <span className="text-2xl">🇰🇷</span>
            <span className="font-heading font-bold text-lg text-foreground">LUKATO</span>
          </motion.div>
        )}
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={isCollapsed ? "mx-auto" : ""}
        >
          {isCollapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </Button>
      </div>

      {/* User Profile */}
      {!isCollapsed && username && (
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{username}</p>
              <p className="text-xs text-muted-foreground">Thành viên</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {/* Home Link */}
        <div className="px-2 mb-2">
          <button
            onClick={() => navigate("/")}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
              currentPath === "/" 
                ? "bg-primary/15 text-primary" 
                : "text-foreground hover:bg-muted"
            )}
          >
            <Home className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span className="text-sm font-medium">Trang chủ</span>}
          </button>
        </div>

        {/* Menu Sections */}
        {menuSections.map((section) => (
          <div key={section.title} className="px-2 mb-1">
            {/* Section Header */}
            <button
              onClick={() => !isCollapsed && toggleSection(section.title)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors",
                isCollapsed ? "justify-center" : "justify-between",
                "hover:bg-muted/50"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{section.emoji}</span>
                {!isCollapsed && (
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {section.title}
                  </span>
                )}
              </div>
              {!isCollapsed && (
                <ChevronDown 
                  className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform",
                    openSections.has(section.title) ? "rotate-180" : ""
                  )} 
                />
              )}
            </button>

            {/* Section Items */}
            <AnimatePresence>
              {(!isCollapsed && openSections.has(section.title)) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  {section.items.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => handleNavigation(item.href)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 ml-4 rounded-lg transition-colors text-left",
                        isActive(item.href)
                          ? "bg-primary/15 text-primary border-l-2 border-primary"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      <item.icon className={cn("w-4 h-4 shrink-0", isActive(item.href) && "text-primary")} />
                      <span className="text-sm font-medium flex-1 truncate">{item.label}</span>
                      {item.isPremium && (
                        <span className="px-1.5 py-0.5 bg-accent text-accent-foreground text-[10px] font-bold rounded shrink-0">
                          Premium
                        </span>
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-border">
        {!isCollapsed ? (
          <Button 
            variant="outline"
            onClick={handleLogout}
            className="w-full rounded-xl font-semibold text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Đăng xuất
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="w-full text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        )}
      </div>
    </motion.aside>
  );
};

export default AppSidebar;
