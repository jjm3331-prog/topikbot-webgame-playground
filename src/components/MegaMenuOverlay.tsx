import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gamepad2,
  Crown,
  MessageSquare,
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
  Search,
  Mic,
  Swords,
  Smartphone,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface MenuItem {
  icon: React.ElementType;
  labelKey: string;
  href: string;
  isPremium?: boolean;
  isHighlight?: boolean;
  isBattle?: boolean;
}

interface MenuCategory {
  titleKey: string;
  emoji?: string;
  items: MenuItem[];
}

// 기본 메뉴 (로그인 전/후 공통)
const baseMenuCategories: MenuCategory[] = [
  {
    titleKey: "menu.categories.jobs",
    emoji: "💼",
    items: [
      { icon: Users, labelKey: "menu.items.headhunting", href: "/headhunting", isPremium: true },
      { icon: Search, labelKey: "menu.items.companyReport", href: "/company-report", isPremium: true },
      { icon: Mic, labelKey: "menu.items.interviewSimulation", href: "/interview-simulation", isPremium: true },
      { icon: Notebook, labelKey: "menu.items.practicalGuide", href: "/practical-guide", isPremium: true },
    ]
  },
  {
    titleKey: "menu.categories.topik",
    emoji: "📚",
    items: [
      { icon: Sparkles, labelKey: "menu.items.learningHub", href: "/learning-hub", isHighlight: true },
      { icon: GraduationCap, labelKey: "menu.items.hanjaMindmap", href: "/hanja-mindmap", isPremium: true },
      { icon: GraduationCap, labelKey: "menu.items.mockExam", href: "/mock-exam", isPremium: true, isHighlight: true },
      { icon: Smartphone, labelKey: "menu.items.shorts", href: "/shorts", isHighlight: true },
      { icon: MessageSquare, labelKey: "menu.items.community", href: "/board-hub", isHighlight: true },
    ]
  },
  {
    titleKey: "menu.categories.game",
    emoji: "🎮",
    items: [
      { icon: Gamepad2, labelKey: "menu.items.gameHub", href: "/game-hub", isHighlight: true },
      { icon: Swords, labelKey: "menu.items.battle", href: "/battle", isHighlight: true, isBattle: true },
    ]
  },
  {
    titleKey: "menu.categories.ai",
    emoji: "🤖",
    items: [
      { icon: MessageSquare, labelKey: "menu.items.qnaAgent", href: "/ai-chat", isHighlight: true, isPremium: true },
      { icon: Sparkles, labelKey: "menu.items.questionVariant", href: "/question-variant", isPremium: true },
      { icon: PenTool, labelKey: "menu.items.writingCorrection", href: "/writing-correction", isPremium: true },
      { icon: Languages, labelKey: "menu.items.roleplaySpeaking", href: "/roleplay-speaking", isPremium: true },
    ]
  },
];

// 로그인 후 추가되는 "CỦA TÔI" 메뉴
const myMenuCategory: MenuCategory = {
  titleKey: "menu.categories.my",
  emoji: "👤",
  items: [
    { icon: User, labelKey: "menu.items.profile", href: "/profile" },
    { icon: Trophy, labelKey: "menu.items.ranking", href: "/ranking" },
    { icon: Star, labelKey: "menu.items.pricing", href: "/pricing" },
    { icon: Headphones, labelKey: "menu.items.helpCenter", href: "/help-center" },
    { icon: Notebook, labelKey: "menu.items.terms", href: "/terms" },
    { icon: HelpCircle, labelKey: "menu.items.privacy", href: "/privacy" },
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
  t,
}: {
  category: MenuCategory;
  onNavigate: (href: string, isPremium?: boolean) => void;
  isActive: (href: string) => boolean;
  t: (key: string) => string;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasActiveItem = category.items.some((item) => isActive(item.href));

  useEffect(() => {
    if (hasActiveItem) setIsExpanded(true);
  }, [hasActiveItem]);

  return (
    <div className="border-b border-border last:border-b-0">
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
            {t(category.titleKey)}
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
                const isBattleItem = item.isBattle;
                const label = t(item.labelKey);
                return (
                  <li key={item.labelKey}>
                    <button
                      onClick={() => onNavigate(item.href, item.isPremium)}
                      className={`group flex items-center gap-3 w-full py-3 px-4 rounded-lg text-left transition-all ${
                        active
                          ? isBattleItem 
                            ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
                            : 'bg-primary text-primary-foreground'
                          : isBattleItem
                            ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30'
                            : item.isHighlight 
                              ? 'bg-primary/10 text-primary' 
                              : 'hover:bg-muted/80'
                      }`}
                    >
                      <item.icon className={`w-5 h-5 ${
                        isBattleItem ? 'animate-heartbeat' : ''
                      } ${
                        active
                          ? 'text-white'
                          : isBattleItem 
                            ? 'text-yellow-500' 
                            : item.isHighlight 
                              ? 'text-primary' 
                              : 'text-foreground/70'
                      }`} />
                      
                      <span className={`text-sm font-bold flex-1 ${
                        active
                          ? 'text-white'
                          : isBattleItem 
                            ? 'text-yellow-600 dark:text-yellow-400' 
                            : item.isHighlight 
                              ? 'text-primary' 
                              : 'text-foreground'
                      }`}>
                        {label}
                      </span>
                      
                      {item.isPremium && !active && (
                        <span className="px-1.5 py-0.5 bg-accent text-accent-foreground text-[10px] font-bold rounded">
                          {t("common.premium")}
                        </span>
                      )}
                      
                      {active && (
                        <ChevronRight className="w-3 h-3 text-white" />
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
  const { t } = useTranslation();
  const currentPath = location.pathname;
  const isMobile = useIsMobile();

  const handleNavigation = (href: string, isPremiumItem?: boolean) => {
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
          <div className="flex items-center justify-between px-4 md:px-8 h-14 md:h-16 border-b border-border">
            <span className="font-heading font-bold text-lg md:text-xl text-foreground">{t('menu.title')}</span>
            <div className="flex items-center gap-2">
              {isLoggedIn && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogoutClick}
                  className="text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('menu.logout')}
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

          <div className="overflow-y-auto h-[calc(100%-56px)] md:h-[calc(100%-64px)]">
            {isMobile ? (
              <div className="flex flex-col min-h-full">
                <div className="flex-1 pt-2">
                  {menuCategories.map((category, idx) => (
                    <motion.div
                      key={category.titleKey}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <MobileAccordionCategory
                        category={category}
                        isActive={isActive}
                        onNavigate={handleNavigation}
                        t={t}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col min-h-full">
                <div className="flex-1 max-w-7xl mx-auto px-6 py-8 md:py-12 w-full">
                  <div className={`grid gap-8 md:gap-10 ${
                    isLoggedIn 
                      ? 'grid-cols-2 md:grid-cols-5' 
                      : 'grid-cols-2 md:grid-cols-4'
                  }`}>
                    {menuCategories.map((category, categoryIndex) => (
                      <motion.div
                        key={category.titleKey}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: categoryIndex * 0.05 }}
                      >
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 md:mb-6 flex items-center gap-3">
                          {category.emoji && <span className="text-xl">{category.emoji}</span>}
                          {t(category.titleKey)}
                        </h3>

                        <ul className="space-y-1">
                          {category.items.map((item, itemIndex) => {
                            const active = isActive(item.href);
                            const isBattleItem = item.isBattle;
                            const label = t(item.labelKey);
                            return (
                              <motion.li
                                key={item.labelKey}
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
                                      ? isBattleItem
                                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg shadow-yellow-500/30'
                                        : 'bg-primary text-primary-foreground shadow-md'
                                      : isBattleItem
                                        ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500 hover:text-white'
                                        : item.isHighlight 
                                          ? 'bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground' 
                                          : 'hover:bg-muted/80'
                                  }`}
                                >
                                  {active && (
                                    <motion.div
                                      layoutId="activeIndicator"
                                      className={`absolute left-0 top-0 bottom-0 w-1 rounded-r-full ${
                                        isBattleItem ? 'bg-white' : 'bg-primary-foreground'
                                      }`}
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      transition={{ duration: 0.2 }}
                                    />
                                  )}
                                  
                                  <item.icon className={`w-5 h-5 transition-all duration-200 ${
                                    isBattleItem ? 'animate-heartbeat' : ''
                                  } ${
                                    active
                                      ? 'text-white'
                                      : isBattleItem
                                        ? 'text-yellow-500 group-hover:text-white'
                                        : item.isHighlight 
                                          ? 'text-primary group-hover:text-primary-foreground' 
                                          : 'text-foreground/70 group-hover:text-primary group-hover:scale-110'
                                  }`} />
                                  
                                  <span className={`text-sm font-bold transition-colors duration-200 flex-1 ${
                                    active
                                      ? 'text-white'
                                      : isBattleItem
                                        ? 'text-yellow-600 dark:text-yellow-400 group-hover:text-white'
                                        : item.isHighlight 
                                          ? 'text-primary group-hover:text-primary-foreground' 
                                          : 'text-foreground group-hover:text-primary'
                                  }`}>
                                    {label}
                                  </span>
                                  
                                  {item.isPremium && !active && (
                                    <span className="px-1.5 py-0.5 bg-accent text-accent-foreground text-[10px] font-bold rounded">
                                      {t("common.premium")}
                                    </span>
                                  )}
                                  
                                  <ChevronRight className={`w-3 h-3 opacity-0 -translate-x-2 transition-all duration-200 ${
                                    active 
                                      ? 'text-white opacity-100 translate-x-0' 
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
