import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { safeSignOut } from "@/lib/safeSignOut";


interface MenuItem {
  icon: React.ElementType;
  labelKey: string;
  href: string;
  isPremium?: boolean;
  isHighlight?: boolean;
}

interface MenuSection {
  titleKey: string;
  emoji: string;
  items: MenuItem[];
  defaultOpen?: boolean;
}

interface AppSidebarProps {
  username?: string | null;
  avatarUrl?: string | null;
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const AppSidebar = ({ username, avatarUrl, isOpen, onClose, isCollapsed, onToggleCollapse }: AppSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const currentPath = location.pathname;

  const menuSections: MenuSection[] = [
    {
      titleKey: "sidebar.sections.studyWork",
      emoji: "✈️",
      items: [
        { icon: Building, labelKey: "sidebar.items.koreaCareer", href: "/korea-career", isPremium: true },
        { icon: Users, labelKey: "sidebar.items.headhunting", href: "/headhunting", isPremium: true },
      ],
      defaultOpen: false
    },
    {
      titleKey: "sidebar.sections.topik",
      emoji: "📚",
      items: [
        { icon: Sparkles, labelKey: "sidebar.items.learningHub", href: "/learning-hub", isHighlight: true },
        { icon: MessageSquare, labelKey: "sidebar.items.community", href: "/board-hub", isHighlight: true },
      ],
      defaultOpen: true
    },
    {
      titleKey: "sidebar.sections.game",
      emoji: "🎮",
      items: [
        { icon: Gamepad2, labelKey: "sidebar.items.gameHub", href: "/game-hub", isHighlight: true },
      ],
      defaultOpen: true
    },
    {
      titleKey: "sidebar.sections.ai",
      emoji: "🤖",
      items: [
        { icon: MessageSquare, labelKey: "sidebar.items.qnaAgent", href: "/ai-chat", isHighlight: true, isPremium: true },
        { icon: PenTool, labelKey: "sidebar.items.writingCorrection", href: "/writing-correction", isPremium: true },
        { icon: Languages, labelKey: "sidebar.items.roleplay", href: "/roleplay-speaking", isPremium: true },
        { icon: Star, labelKey: "sidebar.items.pricing", href: "/pricing" },
      ],
      defaultOpen: false
    },
    {
      titleKey: "sidebar.sections.my",
      emoji: "👤",
      items: [
        { icon: Sparkles, labelKey: "sidebar.items.progress", href: "/dashboard", isPremium: true, isHighlight: true },
        { icon: User, labelKey: "sidebar.items.profile", href: "/profile" },
        { icon: Trophy, labelKey: "sidebar.items.ranking", href: "/ranking" },
        { icon: Star, labelKey: "sidebar.items.points", href: "/points-system" },
        { icon: Notebook, labelKey: "sidebar.items.terms", href: "/terms" },
        { icon: HelpCircle, labelKey: "sidebar.items.privacy", href: "/privacy" },
        { icon: Headphones, labelKey: "sidebar.items.helpCenter", href: "/help-center" },
      ],
      defaultOpen: false
    },
  ];
  
  const [openSections, setOpenSections] = useState<Set<string>>(() => {
    const initialOpen = new Set<string>();
    menuSections.forEach(section => {
      if (section.defaultOpen) {
        initialOpen.add(section.titleKey);
      }
      if (section.items.some(item => currentPath === item.href || currentPath.startsWith(item.href.split("#")[0]))) {
        initialOpen.add(section.titleKey);
      }
    });
    return initialOpen;
  });

  const handleLogout = async () => {
    await safeSignOut();
    toast({
      title: t("sidebar.logoutSuccess"),
      description: t("sidebar.seeYouAgain"),
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

  const toggleSection = (titleKey: string) => {
    setOpenSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(titleKey)) {
        newSet.delete(titleKey);
      } else {
        newSet.add(titleKey);
      }
      return newSet;
    });
  };

  const isActive = (href: string) => {
    return currentPath === href || (href !== "/" && currentPath.startsWith(href.split("#")[0]));
  };

  const sidebarContent = (
    <>
      <div className="h-16 flex items-center justify-between px-4 border-b border-border shrink-0">
        {!isCollapsed && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => handleNavigation("/")}
          >
            <img 
              src="/favicon.png" 
              alt="LUKATO" 
              className="w-9 h-9 rounded-full object-cover"
            />
            <span className="font-heading font-bold text-lg text-foreground">LUKATO</span>
          </motion.div>
        )}
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className={cn("hidden lg:flex", isCollapsed && "mx-auto")}
        >
          {isCollapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="lg:hidden"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {!isCollapsed && username && (
        <div className="border-b border-border shrink-0">
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              {avatarUrl ? (
                <img src={avatarUrl} alt={username} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{username}</p>
                <p className="text-xs text-muted-foreground">{t("sidebar.member")}</p>
              </div>
            </div>
          </div>

          <div className="px-2 pb-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleNavigation("/profile")}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left",
                  isActive("/profile") ? "bg-primary/15 text-primary" : "text-foreground hover:bg-muted"
                )}
              >
                <User className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium truncate">{t("sidebar.items.profile")}</span>
              </button>

              <button
                onClick={() => handleNavigation("/ranking")}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left",
                  isActive("/ranking") ? "bg-primary/15 text-primary" : "text-foreground hover:bg-muted"
                )}
              >
                <Trophy className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium truncate">{t("sidebar.items.ranking")}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-2">
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
            {!isCollapsed && <span className="text-sm font-medium">{t("sidebar.home")}</span>}
          </button>
        </div>

        {menuSections.map((section) => (
          <div key={section.titleKey} className="px-2 mb-1">
            <button
              onClick={() => !isCollapsed && toggleSection(section.titleKey)}
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
                    {t(section.titleKey)}
                  </span>
                )}
              </div>
              {!isCollapsed && (
                <ChevronDown 
                  className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform",
                    openSections.has(section.titleKey) ? "rotate-180" : ""
                  )} 
                />
              )}
            </button>

            <AnimatePresence>
              {(!isCollapsed && openSections.has(section.titleKey)) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  {section.items.map((item) => (
                    <button
                      key={item.labelKey}
                      onClick={() => handleNavigation(item.href)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 ml-4 rounded-lg transition-colors text-left",
                        isActive(item.href)
                          ? "bg-primary/15 text-primary border-l-2 border-primary"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      <item.icon className={cn("w-4 h-4 shrink-0", isActive(item.href) && "text-primary")} />
                      <span className="text-sm font-medium flex-1 truncate">{t(item.labelKey)}</span>
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

      <div className="p-2 border-t border-border shrink-0">
        {!isCollapsed ? (
          <Button 
            variant="outline"
            onClick={handleLogout}
            className="w-full rounded-xl font-semibold text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {t("common.logout")}
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

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            />

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
