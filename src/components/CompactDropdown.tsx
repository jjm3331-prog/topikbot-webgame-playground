import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  labelKey: string;
  href: string;
  isPremium?: boolean;
}

interface MenuItem {
  icon: React.ElementType;
  labelKey: string;
  emoji: string;
  items: SubMenuItem[];
}

export const CompactDropdown = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);

  const menuItems: MenuItem[] = [
    {
      icon: Briefcase,
      labelKey: "compactDropdown.sections.studyWork",
      emoji: "✈️",
      items: [
        { icon: Briefcase, labelKey: "compactDropdown.items.koreaCareer", href: "/korea-career" },
        { icon: BookOpen, labelKey: "compactDropdown.items.studyAbroad", href: "/korea-career#study" },
      ]
    },
    {
      icon: BookOpen,
      labelKey: "compactDropdown.sections.topik",
      emoji: "📚",
      items: [
        { icon: BookOpen, labelKey: "compactDropdown.items.topik1", href: "/topik-1" },
        { icon: Crown, labelKey: "compactDropdown.items.topik2", href: "/topik-2" },
      ]
    },
    {
      icon: Gamepad2,
      labelKey: "compactDropdown.sections.game",
      emoji: "🎮",
      items: [
        { icon: Crown, labelKey: "compactDropdown.items.manager", href: "/manager" },
        { icon: Gamepad2, labelKey: "compactDropdown.items.survival", href: "/chat" },
        { icon: Heart, labelKey: "compactDropdown.items.dating", href: "/dating" },
        { icon: MessageSquare, labelKey: "compactDropdown.items.wordChain", href: "/wordchain" },
        { icon: Music, labelKey: "compactDropdown.items.kpop", href: "/kpop" },
        { icon: Drama, labelKey: "compactDropdown.items.kdrama", href: "/kdrama" },
        { icon: Briefcase, labelKey: "compactDropdown.items.parttime", href: "/parttime" },
        { icon: HelpCircle, labelKey: "compactDropdown.items.tutorial", href: "/tutorial" },
      ]
    },
    {
      icon: MessageCircle,
      labelKey: "compactDropdown.sections.ai",
      emoji: "🤖",
      items: [
        { icon: MessageCircle, labelKey: "compactDropdown.items.askAi", href: "/ai-tutor" },
        { icon: PenTool, labelKey: "compactDropdown.items.writingCorrection", href: "/writing-correction", isPremium: true },
        { icon: Languages, labelKey: "compactDropdown.items.roleplay", href: "/roleplay-speaking" },
      ]
    },
  ];

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

  const activeMenu = menuItems.find(m => t(m.labelKey) === activeSubmenu);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
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
                      key={item.labelKey}
                      onClick={() => setActiveSubmenu(t(item.labelKey))}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{item.emoji}</span>
                        <span className="text-sm font-medium text-foreground">{t(item.labelKey)}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  ))}
                  
                  <div className="border-t border-border mt-2 pt-2">
                    <button
                      onClick={() => handleNavigation("/pricing")}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors"
                    >
                      <Crown className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium text-foreground">{t("compactDropdown.items.pricing")}</span>
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="submenu"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.15 }}
                  className="py-2"
                >
                  <button
                    onClick={handleBack}
                    className="w-full flex items-center gap-2 px-4 py-3 border-b border-border hover:bg-muted transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {activeMenu?.emoji} {activeSubmenu}
                    </span>
                  </button>

                  {activeMenu?.items.map((item) => (
                    <button
                      key={item.labelKey}
                      onClick={() => handleNavigation(item.href)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors"
                    >
                      <item.icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{t(item.labelKey)}</span>
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
