import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BookOpen, 
  Gamepad2, 
  MessageCircle, 
  Briefcase,
  ChevronRight,
  ChevronLeft,
  Crown,
  Heart,
  MessageSquare,
  Music,
  Drama,
  Languages,
  PenTool,
  HelpCircle
} from "lucide-react";

interface SubMenuItem {
  icon: React.ElementType;
  label: string;
  href: string;
  isPremium?: boolean;
}

interface MenuItem {
  icon: React.ElementType;
  label: string;
  emoji: string;
  items: SubMenuItem[];
}

const menuItems: MenuItem[] = [
  {
    icon: Briefcase,
    label: "DU HỌC & VIỆC LÀM",
    emoji: "✈️",
    items: [
      { icon: Briefcase, label: "Tìm việc tại Hàn Quốc", href: "/korea-career" },
      { icon: BookOpen, label: "Tư vấn du học Hàn", href: "/korea-career#study" },
    ]
  },
  {
    icon: BookOpen,
    label: "HỌC TOPIK",
    emoji: "📚",
    items: [
      { icon: BookOpen, label: "TOPIK I (1-2급)", href: "/topik-1" },
      { icon: Crown, label: "TOPIK II (3-6급)", href: "/topik-2" },
    ]
  },
  {
    icon: Gamepad2,
    label: "GAME HỌC",
    emoji: "🎮",
    items: [
      { icon: Crown, label: "LUKATO Manager", href: "/manager" },
      { icon: Gamepad2, label: "AI Sinh tồn Seoul", href: "/chat" },
      { icon: Heart, label: "Hẹn hò Hàn Quốc", href: "/dating" },
      { icon: MessageSquare, label: "Nối từ tiếng Hàn", href: "/wordchain" },
      { icon: Music, label: "K-POP Quiz", href: "/kpop" },
      { icon: Drama, label: "K-Drama Lồng tiếng", href: "/kdrama" },
      { icon: Briefcase, label: "Làm thêm Hàn Quốc", href: "/parttime" },
      { icon: HelpCircle, label: "Hướng dẫn sử dụng Game", href: "/tutorial" },
    ]
  },
  {
    icon: MessageCircle,
    label: "CÔNG CỤ AI",
    emoji: "🤖",
    items: [
      { icon: MessageCircle, label: "Hỏi AI (30/ngày)", href: "/ai-tutor" },
      { icon: PenTool, label: "Chấm bài viết", href: "/writing-correction", isPremium: true },
      { icon: Languages, label: "Dịch Hàn-Việt", href: "/translate" },
    ]
  },
];

interface CompactDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CompactDropdown = ({ isOpen, onClose }: CompactDropdownProps) => {
  const navigate = useNavigate();
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);

  const handleNavigation = (href: string) => {
    onClose();
    setActiveSubmenu(null);
    if (href.startsWith("#")) {
      const element = document.querySelector(href);
      element?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate(href);
    }
  };

  const handleBack = () => {
    setActiveSubmenu(null);
  };

  const activeMenu = menuItems.find(m => m.label === activeSubmenu);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              onClose();
              setActiveSubmenu(null);
            }}
            className="fixed inset-0 z-40"
            style={{ top: "64px" }}
          />

          {/* Dropdown */}
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed left-1/2 -translate-x-1/2 z-50 w-72 bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
            style={{ top: "72px" }}
          >
            <AnimatePresence mode="wait">
              {!activeSubmenu ? (
                /* Main Menu */
                <motion.div
                  key="main"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.15 }}
                  className="py-2"
                >
                  {menuItems.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => setActiveSubmenu(item.label)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{item.emoji}</span>
                        <span className="text-sm font-medium text-foreground">{item.label}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  ))}
                  
                  {/* Quick Links */}
                  <div className="border-t border-border mt-2 pt-2">
                    <button
                      onClick={() => handleNavigation("/pricing")}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors"
                    >
                      <Crown className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium text-foreground">Bảng giá</span>
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* Submenu */
                <motion.div
                  key="submenu"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.15 }}
                  className="py-2"
                >
                  {/* Back Button */}
                  <button
                    onClick={handleBack}
                    className="w-full flex items-center gap-2 px-4 py-3 border-b border-border hover:bg-muted transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {activeMenu?.emoji} {activeMenu?.label}
                    </span>
                  </button>

                  {/* Submenu Items */}
                  {activeMenu?.items.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => handleNavigation(item.href)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors"
                    >
                      <item.icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{item.label}</span>
                      {item.isPremium && (
                        <span className="ml-auto px-1.5 py-0.5 bg-accent text-accent-foreground text-[10px] font-bold rounded">
                          Premium
                        </span>
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CompactDropdown;
