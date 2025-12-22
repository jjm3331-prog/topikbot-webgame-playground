import { motion } from "framer-motion";
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
  label: string;
  labelKo: string;
  icon: LucideIcon;
  color: string;
}

const categories: CategoryConfig[] = [
  {
    id: "vocabulary",
    label: "Vocabulary",
    labelKo: "어휘",
    icon: Book,
    color: "from-korean-blue to-korean-cyan",
  },
  {
    id: "grammar",
    label: "Grammar",
    labelKo: "문법",
    icon: FileText,
    color: "from-korean-purple to-korean-pink",
  },
  {
    id: "reading",
    label: "Reading",
    labelKo: "읽기",
    icon: FileText,
    color: "from-korean-green to-korean-teal",
  },
  {
    id: "listening",
    label: "Listening",
    labelKo: "듣기",
    icon: Headphones,
    color: "from-korean-orange to-korean-yellow",
  },
  {
    id: "mock_test",
    label: "Mock Test",
    labelKo: "모의고사",
    icon: ClipboardCheck,
    color: "from-korean-red to-korean-pink",
  },
];

const CategoryTabs = ({
  activeCategory,
  onCategoryChange,
  className,
}: CategoryTabsProps) => {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {categories.map((category) => {
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
              <span className="font-medium">{category.labelKo}</span>
            </span>
          </motion.button>
        );
      })}
    </div>
  );
};

export default CategoryTabs;
