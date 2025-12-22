import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Home,
  BookOpen, 
  Gamepad2, 
  MessageCircle, 
  Briefcase,
  Crown,
  Heart,
  MessageSquare,
  Music,
  Clapperboard,
  Languages,
  PenTool,
  Trophy,
  HelpCircle,
  BookMarked,
  GraduationCap,
  Sparkles,
  X,
  User,
  FileX,
  Users,
  Star,
  Building,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
    title: "DU HỌC & VIỆC LÀM",
    emoji: "✈️",
    items: [
      { icon: Building, label: "Tìm việc tại Hàn Quốc", href: "/korea-career" },
      { icon: BookOpen, label: "Tư vấn du học Hàn", href: "/tutorial" },
    ]
  },
  {
    title: "HỌC TOPIK",
    items: [
      { icon: BookOpen, label: "TOPIK I (1-2급)", href: "/topik-1" },
      { icon: GraduationCap, label: "TOPIK II (3-6급)", href: "/topik-2" },
    ]
  },
  {
    title: "GAME HỌC",
    items: [
      { icon: Crown, label: "LUKATO Manager", href: "/manager" },
      { icon: Gamepad2, label: "AI Sinh tồn Seoul", href: "/chat" },
      { icon: Heart, label: "Hẹn hò Hàn Quốc", href: "/dating" },
      { icon: MessageSquare, label: "Nối từ tiếng Hàn", href: "/wordchain" },
      { icon: Music, label: "K-POP Quiz", href: "/kpop" },
      { icon: Clapperboard, label: "K-Drama Lồng tiếng", href: "/kdrama" },
      { icon: Briefcase, label: "Làm thêm Hàn Quốc", href: "/parttime" },
    ]
  },
  {
    title: "CÔNG CỤ AI",
    items: [
      { icon: MessageCircle, label: "Hỏi AI (30/ngày)", href: "/ai-tutor", isHighlight: true },
      { icon: PenTool, label: "Chấm bài viết", href: "/writing-correction", isPremium: true },
      { icon: Languages, label: "Dịch Hàn-Việt", href: "/translate" },
    ]
  },
];

// 로그인 후 추가되는 "CỦA TÔI" 메뉴
const myMenuCategory: MenuCategory = {
  title: "CỦA TÔI",
  items: [
    { icon: Sparkles, label: "Tiến độ học tập", href: "/dashboard", isPremium: true },
    { icon: Trophy, label: "Xếp hạng của tôi", href: "/ranking" },
    { icon: FileX, label: "Sổ lỗi sai", href: "/mistakes", isPremium: true },
    { icon: BookMarked, label: "Từ vựng đã lưu (15/50)", href: "/vocabulary" },
    { icon: User, label: "Hồ sơ của tôi", href: "/profile" },
    { icon: Users, label: "Mời bạn bè", href: "/profile#invite" },
  ]
};

// 하단 메뉴
const bottomMenuItems: MenuItem[] = [
  { icon: Star, label: "Bảng giá", href: "/pricing" },
  { icon: HelpCircle, label: "Hướng dẫn", href: "/tutorial" },
];

interface MegaMenuOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  isLoggedIn?: boolean;
}

export const MegaMenuOverlay = ({ isOpen, onClose, isLoggedIn = false }: MegaMenuOverlayProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const handleNavigation = (href: string) => {
    onClose();
    navigate(href);
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-40 bg-background"
          style={{ top: "60px" }}
        >
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 md:top-6 md:right-8 w-10 h-10 rounded-full border border-border hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </Button>

          {/* Menu Content */}
          <div className="max-w-7xl mx-auto px-6 py-8 md:py-12 overflow-y-auto max-h-[calc(100vh-60px)]">
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
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 md:mb-6 flex items-center gap-2">
                    {category.emoji && <span>{category.emoji}</span>}
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
                            onClick={() => handleNavigation(item.href)}
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
                            
                            <item.icon className={`w-4 h-4 transition-all duration-200 ${
                              active
                                ? 'text-primary-foreground'
                                : item.isHighlight 
                                  ? 'text-primary group-hover:text-primary-foreground' 
                                  : 'text-muted-foreground group-hover:text-primary group-hover:scale-110'
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

            {/* Bottom Menu */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-12 pt-6 border-t border-border"
            >
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                KHÁC
              </h3>
              <div className="flex flex-wrap gap-4">
                {bottomMenuItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <motion.button
                      key={item.label}
                      onClick={() => handleNavigation(item.href)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`flex items-center gap-2 text-sm transition-all px-3 py-2 rounded-lg ${
                        active 
                          ? 'bg-primary text-primary-foreground' 
                          : 'text-muted-foreground hover:text-primary hover:bg-muted/50'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MegaMenuOverlay;
