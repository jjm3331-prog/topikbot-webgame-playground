import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gamepad2,
  Briefcase,
  Crown,
  Heart,
  MessageSquare,
  Music,
  Clapperboard,
  Languages,
  PenTool,
  Sparkles,
  X,
  User,
  Users,
  Star,
  Trophy,
  Headphones,
  Notebook,
  HelpCircle,
  ChevronRight,
  ChevronDown,
  LogOut,
  Lock,
  Search,
  Mic,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";

interface MenuItem {
  icon: React.ElementType;
  label: string;
  href: string;
  isPremium?: boolean;
  isHighlight?: boolean;
}

interface MenuCategory {
  title: string;
  emoji?: string;
  items: MenuItem[];
}

// 기본 메뉴 (로그인 전/후 공통)
const baseMenuCategories: MenuCategory[] = [
  {
    title: "VIỆC LÀM",
    emoji: "💼",
    items: [
      { icon: Users, label: "Headhunting", href: "/headhunting", isPremium: true },
      { icon: Search, label: "Báo cáo Doanh nghiệp", href: "/company-report", isPremium: true },
      { icon: Mic, label: "Phỏng vấn Mô phỏng", href: "/interview-simulation", isPremium: true },
    ]
  },
  {
    title: "HỌC TOPIK",
    emoji: "📚",
    items: [
      { icon: Sparkles, label: "Trung tâm học TOPIK", href: "/learning-hub", isHighlight: true },
      { icon: MessageSquare, label: "Cộng đồng", href: "/board-hub", isHighlight: true },
    ]
  },
  {
    title: "GAME",
    emoji: "🎮",
    items: [
      { icon: Gamepad2, label: "Trung tâm Game", href: "/game-hub", isHighlight: true },
    ]
  },
  {
    title: "AI",
    emoji: "🤖",
    items: [
      { icon: MessageSquare, label: "Q&A Agent", href: "/ai-chat", isHighlight: true, isPremium: true },
      { icon: Sparkles, label: "Biến thể đề thi", href: "/question-variant", isPremium: true },
      { icon: PenTool, label: "Chấm bài viết", href: "/writing-correction", isPremium: true },
      { icon: Languages, label: "Roleplay Speaking", href: "/roleplay-speaking", isPremium: true },
    ]
  },
];

// 로그인 후 추가되는 "CỦA TÔI" 메뉴
const myMenuCategory: MenuCategory = {
  title: "CỦA TÔI",
  emoji: "👤",
  items: [
    { icon: User, label: "Hồ sơ", href: "/profile" },
    { icon: Trophy, label: "Bảng xếp hạng", href: "/ranking" },
    { icon: Star, label: "Bảng giá", href: "/pricing" },
    { icon: Headphones, label: "Trung tâm Hỗ trợ", href: "/help-center" },
    { icon: Notebook, label: "Điều khoản", href: "/terms" },
    { icon: HelpCircle, label: "Chính sách", href: "/privacy" },
  ],
};

interface MegaMenuOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  isLoggedIn?: boolean;
  onLogout?: () => void;
}

// Mobile Accordion Category Component
const MobileAccordionCategory = ({
  category,
  isActive,
  onNavigate,
}: {
  category: MenuCategory;
  onNavigate: (href: string, isPremium?: boolean) => void;
  isActive: (href: string) => boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasActiveItem = category.items.some((item) => isActive(item.href));

  // Auto-expand if has active item
  useEffect(() => {
    if (hasActiveItem) setIsExpanded(true);
  }, [hasActiveItem]);

  return (
    <div className="border-b border-border last:border-b-0">
      {/* Category Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between px-4 py-4 transition-colors ${
          hasActiveItem ? "bg-primary/5" : "hover:bg-muted/50"
        }`}
      >
        <div className="flex items-center gap-3">
          {category.emoji && <span className="text-2xl">{category.emoji}</span>}
          <span className={`text-base font-bold uppercase tracking-wide ${
            hasActiveItem ? "text-primary" : "text-foreground"
          }`}>
            {category.title}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className={`w-5 h-5 ${
            hasActiveItem ? "text-primary" : "text-muted-foreground"
          }`} />
        </motion.div>
      </button>

      {/* Category Items */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <ul className="pb-2 px-2">
              {category.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.label}>
                    <button
                      onClick={() => onNavigate(item.href, item.isPremium)}
                      className={`group flex items-center gap-3 w-full py-3 px-4 rounded-lg text-left transition-all ${
                        active
                          ? 'bg-primary text-primary-foreground'
                          : item.isHighlight 
                            ? 'bg-primary/10 text-primary' 
                            : 'hover:bg-muted/80'
                      }`}
                    >
                      <item.icon className={`w-5 h-5 ${
                        active
                          ? 'text-primary-foreground'
                          : item.isHighlight 
                            ? 'text-primary' 
                            : 'text-foreground/70'
                      }`} />
                      
                      <span className={`text-sm font-medium flex-1 ${
                        active
                          ? 'text-primary-foreground'
                          : item.isHighlight 
                            ? 'text-primary' 
                            : 'text-foreground'
                      }`}>
                        {item.label}
                      </span>
                      
                      {item.isPremium && !active && (
                        <span className="px-1.5 py-0.5 bg-accent text-accent-foreground text-[10px] font-bold rounded">
                          Premium
                        </span>
                      )}
                      
                      {active && (
                        <ChevronRight className="w-3 h-3 text-primary-foreground" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const MegaMenuOverlay = ({
  isOpen,
  onClose,
  isLoggedIn = false,
  onLogout,
}: MegaMenuOverlayProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const isMobile = useIsMobile();
  const { isPremium } = useSubscription();

  // Premium routes that require subscription
  const premiumRoutes = [
    "/question-variant",
    "/headhunting",
    "/writing-correction",
    "/ai-chat",
    "/roleplay-speaking",
  ];

  const handleNavigation = (href: string, isPremiumItem?: boolean) => {
    // Pages should still be viewable; show an upsell message for premium features.
    if (isPremiumItem && premiumRoutes.includes(href) && !isPremium) {
      toast.message("Tính năng Premium", {
        description: "Bạn vẫn có thể xem trang, nhưng để sử dụng đầy đủ tính năng vui lòng nâng cấp Premium.",
        action: {
          label: "Nâng cấp",
          onClick: () => {
            onClose();
            navigate("/pricing");
          },
        },
        icon: <Lock className="w-4 h-4" />,
      });
    }

    onClose();
    navigate(href);
  };

  const handleLogoutClick = () => {
    onClose();
    onLogout?.();
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return currentPath === '/dashboard';
    }
    return currentPath === href || currentPath.startsWith(href + '/');
  };

  // 로그인 상태에 따라 메뉴 구성
  const menuCategories = isLoggedIn 
    ? [...baseMenuCategories, myMenuCategory]
    : baseMenuCategories;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed inset-0 z-50 bg-background"
        >
          {/* Full Screen Header with X & Logout */}
          <div className="flex items-center justify-between px-4 md:px-8 h-14 md:h-16 border-b border-border">
            <span className="font-heading font-bold text-lg md:text-xl text-foreground">Menu</span>
            <div className="flex items-center gap-2">
              {isLoggedIn && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogoutClick}
                  className="text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="w-10 h-10 rounded-full hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Menu Content */}
          <div className="overflow-y-auto h-[calc(100%-56px)] md:h-[calc(100%-64px)]">
            {isMobile ? (
              // Mobile: Accordion Style
              <div className="flex flex-col min-h-full">
                <div className="flex-1 pt-2">
                  {menuCategories.map((category, idx) => (
                    <motion.div
                      key={category.title}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <MobileAccordionCategory
                        category={category}
                        isActive={isActive}
                        onNavigate={handleNavigation}
                      />
                    </motion.div>
                  ))}

                </div>

              </div>
            ) : (
              // Desktop: Full Screen Grid Style
              <div className="flex flex-col min-h-full">
                <div className="flex-1 max-w-7xl mx-auto px-6 py-8 md:py-12 w-full">
                  <div className={`grid gap-8 md:gap-10 ${
                    isLoggedIn 
                      ? 'grid-cols-2 md:grid-cols-5' 
                      : 'grid-cols-2 md:grid-cols-4'
                  }`}>
                  {menuCategories.map((category, categoryIndex) => (
                    <motion.div
                      key={category.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: categoryIndex * 0.05 }}
                    >
                      {/* Category Title */}
                      <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 md:mb-6 flex items-center gap-3">
                        {category.emoji && <span className="text-xl">{category.emoji}</span>}
                        {category.title}
                      </h3>

                      {/* Menu Items */}
                      <ul className="space-y-1">
                        {category.items.map((item, itemIndex) => {
                          const active = isActive(item.href);
                          return (
                            <motion.li
                              key={item.label}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.2, delay: categoryIndex * 0.05 + itemIndex * 0.03 }}
                            >
                              <motion.button
                                onClick={() => handleNavigation(item.href, item.isPremium)}
                                whileHover={{ x: 4, scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={`group flex items-center gap-3 w-full py-2.5 px-3 rounded-lg text-left transition-all relative overflow-hidden ${
                                  active
                                    ? 'bg-primary text-primary-foreground shadow-md'
                                    : item.isHighlight 
                                      ? 'bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground' 
                                      : 'hover:bg-muted/80'
                                }`}
                              >
                                {/* Active indicator bar */}
                                {active && (
                                  <motion.div
                                    layoutId="activeIndicator"
                                    className="absolute left-0 top-0 bottom-0 w-1 bg-primary-foreground rounded-r-full"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.2 }}
                                  />
                                )}
                                
                                <item.icon className={`w-5 h-5 transition-all duration-200 ${
                                  active
                                    ? 'text-primary-foreground'
                                    : item.isHighlight 
                                      ? 'text-primary group-hover:text-primary-foreground' 
                                      : 'text-foreground/70 group-hover:text-primary group-hover:scale-110'
                                }`} />
                                
                                <span className={`text-sm font-medium transition-colors duration-200 flex-1 ${
                                  active
                                    ? 'text-primary-foreground'
                                    : item.isHighlight 
                                      ? 'text-primary group-hover:text-primary-foreground' 
                                      : 'text-foreground group-hover:text-primary'
                                }`}>
                                  {item.label}
                                </span>
                                
                                {item.isPremium && !active && (
                                  <span className="px-1.5 py-0.5 bg-accent text-accent-foreground text-[10px] font-bold rounded">
                                    Premium
                                  </span>
                                )}
                                
                                {/* Hover arrow indicator */}
                                <ChevronRight className={`w-3 h-3 opacity-0 -translate-x-2 transition-all duration-200 ${
                                  active 
                                    ? 'text-primary-foreground opacity-100 translate-x-0' 
                                    : 'group-hover:opacity-100 group-hover:translate-x-0 text-muted-foreground group-hover:text-primary'
                                }`} />
                              </motion.button>
                            </motion.li>
                          );
                        })}
                      </ul>
                    </motion.div>
                  ))}
                  </div>

                </div>

              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MegaMenuOverlay;
