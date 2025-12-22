import { useNavigate } from "react-router-dom";
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
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface MenuItem {
  icon: React.ElementType;
  label: string;
  href: string;
  isPremium?: boolean;
}

interface MenuCategory {
  title: string;
  items: MenuItem[];
}

const menuCategories: MenuCategory[] = [
  {
    title: "MENU CHÍNH",
    items: [
      { icon: Home, label: "Trang chủ", href: "/" },
      { icon: BookOpen, label: "TOPIK I (Sơ cấp)", href: "/topik-1" },
      { icon: GraduationCap, label: "TOPIK II (Trung-Cao)", href: "/topik-2" },
      { icon: MessageCircle, label: "Hỏi AI", href: "/ai-tutor" },
    ]
  },
  {
    title: "KHÁM PHÁ",
    items: [
      { icon: Trophy, label: "Xếp hạng", href: "/ranking" },
      { icon: Briefcase, label: "Việc làm Hàn Quốc", href: "/korea-career" },
      { icon: HelpCircle, label: "Hướng dẫn", href: "/tutorial" },
      { icon: Crown, label: "Nâng cấp", href: "/pricing" },
    ]
  },
  {
    title: "GAME HỌC TIẾNG HÀN",
    items: [
      { icon: Sparkles, label: "LUKATO Manager", href: "/manager", isPremium: true },
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
      { icon: MessageCircle, label: "Hỏi AI (30/ngày)", href: "/ai-tutor" },
      { icon: PenTool, label: "Chấm bài viết", href: "/writing-correction", isPremium: true },
      { icon: Languages, label: "Dịch Hàn-Việt", href: "/translate" },
      { icon: BookMarked, label: "Thành ngữ Quiz", href: "/quiz" },
    ]
  },
];

interface MegaMenuOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MegaMenuOverlay = ({ isOpen, onClose }: MegaMenuOverlayProps) => {
  const navigate = useNavigate();

  const handleNavigation = (href: string) => {
    onClose();
    navigate(href);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-40 bg-background/95 backdrop-blur-xl"
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
          <div className="max-w-6xl mx-auto px-6 py-8 md:py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
              {menuCategories.map((category, categoryIndex) => (
                <motion.div
                  key={category.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: categoryIndex * 0.05 }}
                >
                  {/* Category Title */}
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 md:mb-6">
                    {category.title}
                  </h3>

                  {/* Menu Items */}
                  <ul className="space-y-1">
                    {category.items.map((item, itemIndex) => (
                      <motion.li
                        key={item.label}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: categoryIndex * 0.05 + itemIndex * 0.03 }}
                      >
                        <button
                          onClick={() => handleNavigation(item.href)}
                          className="group flex items-center gap-3 w-full py-2.5 text-left transition-colors hover:text-primary"
                        >
                          <item.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                            {item.label}
                          </span>
                          {item.isPremium && (
                            <span className="px-1.5 py-0.5 bg-accent text-accent-foreground text-[10px] font-bold rounded">
                              Premium
                            </span>
                          )}
                        </button>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MegaMenuOverlay;
