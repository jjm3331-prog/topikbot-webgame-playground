import { useNavigate, useLocation } from "react-router-dom";
import { 
  BookOpen, 
  Trophy,
  HelpCircle,
  Notebook,
  Users,
  Sparkles,
  Crown,
  PenTool,
  Gamepad2,
  Heart,
  Briefcase,
  Clapperboard,
  Music,
  MessageSquare,
  Languages,
  User,
  LogOut,
  ChevronDown,
  PanelLeftClose,
  PanelLeft,
  Home,
  X,
  Building,
  GraduationCap,
  Star,
  Headphones
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { safeSignOut } from "@/lib/safeSignOut";


interface MenuItem {
  icon: React.ElementType;
  label: string;
  href: string;
  isPremium?: boolean;
  isHighlight?: boolean;
}

interface MenuSection {
  title: string;
  emoji: string;
  items: MenuItem[];
  defaultOpen?: boolean;
}

// MegaMenuOverlay와 동일한 구조
const menuSections: MenuSection[] = [
  {
    title: "DU HỌC & VIỆC LÀM",
    emoji: "✈️",
    items: [
      { icon: Building, label: "Tìm việc tại Hàn Quốc", href: "/korea-career", isPremium: true },
      { icon: Users, label: "Headhunting", href: "/headhunting", isPremium: true },
    ],
    defaultOpen: false
  },
  {
    title: "HỌC TOPIK",
    emoji: "📚",
    items: [
      { icon: BookOpen, label: "TOPIK I (1-2급)", href: "/topik-1" },
      { icon: GraduationCap, label: "TOPIK II (3-6급)", href: "/topik-2" },
      { icon: Languages, label: "Từ vựng", href: "/vocabulary" },
      { icon: Notebook, label: "Ngữ pháp", href: "/grammar" },
      { icon: PenTool, label: "Luyện viết tay", href: "/handwriting" },
      { icon: Headphones, label: "Luyện nghe", href: "/listening" },
      { icon: BookOpen, label: "Đọc hiểu A", href: "/reading-a" },
      { icon: BookOpen, label: "Đọc hiểu B", href: "/reading-b" },
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
      { icon: Clapperboard, label: "K-Drama Lồng tiếng", href: "/kdrama" },
      { icon: Briefcase, label: "Làm thêm Hàn Quốc", href: "/parttime" },
      { icon: HelpCircle, label: "Hướng dẫn sử dụng Game", href: "/tutorial" },
    ],
    defaultOpen: true
  },
  {
    title: "CÔNG CỤ AI",
    emoji: "🤖",
    items: [
      { icon: MessageSquare, label: "Q&A Agent", href: "/ai-chat", isHighlight: true, isPremium: true },
      { icon: PenTool, label: "Chấm bài viết", href: "/writing-correction", isPremium: true },
      { icon: Languages, label: "Roleplay Speaking", href: "/roleplay-speaking", isPremium: true },
      { icon: Star, label: "Bảng giá", href: "/pricing" },
    ],
    defaultOpen: false
  },
  {
    title: "CỦA TÔI",
    emoji: "👤",
    items: [
      { icon: Sparkles, label: "Tiến độ học tập", href: "/dashboard", isPremium: true, isHighlight: true },
      { icon: User, label: "Hồ sơ của tôi", href: "/profile" },
    ],
    defaultOpen: false
  },
];

interface AppSidebarProps {
  username?: string | null;
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const AppSidebar = ({ username, isOpen, onClose, isCollapsed, onToggleCollapse }: AppSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  
  const [openSections, setOpenSections] = useState<Set<string>>(() => {
    const initialOpen = new Set<string>();
    menuSections.forEach(section => {
      if (section.defaultOpen) {
        initialOpen.add(section.title);
      }
      if (section.items.some(item => currentPath === item.href || currentPath.startsWith(item.href.split("#")[0]))) {
        initialOpen.add(section.title);
      }
    });
    return initialOpen;
  });

  const handleLogout = async () => {
    await safeSignOut();
    toast({
      title: "Đăng xuất thành công",
      description: "Hẹn gặp lại bạn!",
    });
    navigate("/");
  };

  const handleNavigation = (href: string) => {
    onClose();
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

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border shrink-0">
        {!isCollapsed && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => handleNavigation("/")}
          >
            <span className="text-2xl">🇰🇷</span>
            <span className="font-heading font-bold text-lg text-foreground">LUKATO</span>
          </motion.div>
        )}
        
        {/* Desktop collapse button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className={cn("hidden lg:flex", isCollapsed && "mx-auto")}
        >
          {isCollapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </Button>

        {/* Mobile close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="lg:hidden"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* User Profile */}
      {!isCollapsed && username && (
        <div className="px-4 py-3 border-b border-border shrink-0">
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
            onClick={() => handleNavigation("/")}
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
      <div className="p-2 border-t border-border shrink-0">
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
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        initial={{ x: -280 }}
        animate={{ 
          x: 0,
          width: isCollapsed ? 64 : 280 
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={cn(
          "fixed left-0 top-0 bottom-0 z-40 bg-card border-r border-border flex-col hidden lg:flex",
          isCollapsed ? "w-16" : "w-70"
        )}
      >
        {sidebarContent}
      </motion.aside>

      {/* Mobile Sidebar with Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            />

            {/* Slide-out Menu */}
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-card border-r border-border flex flex-col lg:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default AppSidebar;
