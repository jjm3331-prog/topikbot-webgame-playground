import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Home, 
  BookOpen, 
  MessageCircle,
  Trophy,
  HelpCircle,
  Compass,
  GraduationCap,
  FileText,
  History,
  Notebook,
  Users,
  Gift,
  Sparkles,
  Crown,
  PenTool,
  AlertCircle,
  ChevronDown,
  X,
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

interface MenuItem {
  icon: React.ElementType;
  label: string;
  href: string;
  isPremium?: boolean;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const menuSections: MenuSection[] = [
  {
    title: "MENU CHÍNH",
    items: [
      { icon: Home, label: "Trang chủ", href: "/" },
      { icon: BookOpen, label: "Môn học", href: "/game" },
      { icon: MessageCircle, label: "Hỏi AI", href: "/chat" },
    ]
  },
  {
    title: "KHÁM PHÁ",
    items: [
      { icon: Trophy, label: "Xếp hạng", href: "/ranking" },
      { icon: HelpCircle, label: "Hỗ trợ", href: "#" },
      { icon: Compass, label: "Hướng dẫn", href: "/tutorial" },
      { icon: Crown, label: "Nâng cấp", href: "#pricing" },
    ]
  },
  {
    title: "HỌC TẬP",
    items: [
      { icon: GraduationCap, label: "Snapshot Coaching", href: "#", isPremium: true },
      { icon: FileText, label: "Báo cáo Tuyển sinh", href: "#", isPremium: true },
      { icon: PenTool, label: "Chấm văn AI", href: "#", isPremium: true },
    ]
  },
  {
    title: "HỌC TẬP CỦA TÔI",
    items: [
      { icon: Notebook, label: "Ghi chú", href: "#" },
      { icon: FileText, label: "Tài liệu", href: "#", isPremium: true },
      { icon: History, label: "Lịch sử", href: "#" },
      { icon: AlertCircle, label: "Sổ lỗi sai", href: "#", isPremium: true },
    ]
  },
  {
    title: "KHÁC",
    items: [
      { icon: Users, label: "Cộng đồng", href: "#" },
      { icon: Gift, label: "Điểm thưởng", href: "#" },
      { icon: Sparkles, label: "Tính năng", href: "#features" },
    ]
  },
];

export const MegaMenu = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleNavigation = (href: string) => {
    setIsOpen(false);
    if (href.startsWith("#")) {
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

            {/* Single CTA Button */}
            <Button 
              onClick={() => navigate("/auth")}
              className="btn-primary text-primary-foreground rounded-xl font-semibold px-4 sm:px-6 text-sm sm:text-base"
            >
              Đăng nhập
            </Button>
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
              className="fixed left-0 right-0 z-50 bg-card border-b border-border shadow-2xl"
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
                              onClick={() => handleNavigation(item.href)}
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
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {/* Bottom Banner */}
                <div className="mt-8 pt-6 border-t border-border">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-korean-purple/10 to-korean-pink/10 rounded-2xl p-4 sm:p-6">
                    <div className="flex items-center gap-3 text-center sm:text-left">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-korean-orange flex items-center justify-center">
                        <Crown className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">Nâng cấp Premium</p>
                        <p className="text-sm text-muted-foreground">Mở khóa tất cả tính năng học tập</p>
                      </div>
                    </div>
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
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default MegaMenu;