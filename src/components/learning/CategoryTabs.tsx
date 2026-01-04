import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Book, FileText, Headphones, ClipboardCheck, LucideIcon } from "lucide-react";

export type LearningCategory = "vocabulary" | "grammar" | "reading" | "listening" | "mock_test";

interface CategoryTabsProps {
  activeCategory: LearningCategory;
  onCategoryChange: (category: LearningCategory) => void;
  className?: string;
}

interface CategoryConfig {
  id: LearningCategory;
  labelKey: string;
  icon: LucideIcon;
  color: string;
}

const categoryConfigs: CategoryConfig[] = [
  { id: "vocabulary", labelKey: "category.vocabulary", icon: Book, color: "from-korean-blue to-korean-cyan" },
  { id: "grammar", labelKey: "category.grammar", icon: FileText, color: "from-korean-purple to-korean-pink" },
  { id: "reading", labelKey: "category.reading", icon: FileText, color: "from-korean-green to-korean-teal" },
  { id: "listening", labelKey: "category.listening", icon: Headphones, color: "from-korean-orange to-korean-yellow" },
  { id: "mock_test", labelKey: "category.mockTest", icon: ClipboardCheck, color: "from-korean-red to-korean-pink" },
];

const CategoryTabs = ({
  activeCategory,
  onCategoryChange,
  className,
}: CategoryTabsProps) => {
  const { t } = useTranslation();
  
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {categoryConfigs.map((category) => {
        const isActive = activeCategory === category.id;
        const Icon = category.icon;

        return (
          <motion.button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300",
              isActive
                ? "text-white shadow-lg"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isActive && (
              <motion.div
                layoutId="activeCategoryBg"
                className={cn("absolute inset-0 rounded-xl bg-gradient-to-r", category.color)}
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Icon className="w-4 h-4" />
              <span className="font-medium">{t(category.labelKey)}</span>
            </span>
          </motion.button>
        );
      })}
    </div>
  );
};

export default CategoryTabs;
