import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Megaphone, 
  MessageCircle, 
  BookOpen,
  Ghost,
  Headphones,
  Sparkles,
  Users,
  FileText,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";

const boardMenus = [
  {
    id: "notice",
    titleKey: "boardHub.boards.notice.title",
    descriptionKey: "boardHub.boards.notice.description",
    icon: Megaphone,
    gradient: "from-rose-500 to-pink-600",
    iconBg: "bg-rose-500/15",
    iconColor: "text-rose-500",
    path: "/board/notice",
    badge: "official"
  },
  {
    id: "free",
    titleKey: "boardHub.boards.free.title",
    descriptionKey: "boardHub.boards.free.description",
    icon: MessageCircle,
    gradient: "from-sky-500 to-blue-600",
    iconBg: "bg-sky-500/15",
    iconColor: "text-sky-500",
    path: "/board/free",
    badge: "new"
  },
  {
    id: "resource",
    titleKey: "boardHub.boards.resource.title",
    descriptionKey: "boardHub.boards.resource.description",
    icon: BookOpen,
    gradient: "from-emerald-500 to-teal-600",
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-500",
    path: "/board/resource"
  },
  {
    id: "podcast",
    titleKey: "boardHub.boards.podcast.title",
    descriptionKey: "boardHub.boards.podcast.description",
    icon: Headphones,
    gradient: "from-orange-500 to-amber-600",
    iconBg: "bg-orange-500/15",
    iconColor: "text-orange-500",
    path: "/board/podcast",
    badge: "new"
  },
  {
    id: "anonymous",
    titleKey: "boardHub.boards.anonymous.title",
    descriptionKey: "boardHub.boards.anonymous.description",
    icon: Ghost,
    gradient: "from-violet-500 to-purple-600",
    iconBg: "bg-violet-500/15",
    iconColor: "text-violet-500",
    path: "/board/anonymous"
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1
  }
};

export default function BoardHub() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CleanHeader />
      
      <main className="flex-1 pt-6 pb-12 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto w-full">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="mb-4 -ml-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("boardHub.back")}
            </Button>
            
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">💬 {t("boardHub.title")}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">{t("boardHub.subtitle")}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Badge variant="outline" className="gap-1.5 py-1.5 px-3 text-xs">
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                <span>{t("boardHub.stats.categories")}</span>
              </Badge>
              <Badge variant="outline" className="gap-1.5 py-1.5 px-3 text-xs">
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                <span>{t("boardHub.stats.realtime")}</span>
              </Badge>
              <Badge variant="outline" className="gap-1.5 py-1.5 px-3 text-xs">
                <Zap className="w-3.5 h-3.5 text-green-500" />
                <span>{t("boardHub.stats.upload")}</span>
              </Badge>
            </div>
          </motion.div>

          {/* Board Cards Grid - 3 columns on desktop */}
          <motion.section
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {boardMenus.map((menu) => (
                <motion.div 
                  key={menu.id} 
                  variants={itemVariants}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div
                    onClick={() => navigate(menu.path)}
                    className="relative overflow-hidden cursor-pointer group h-full rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm hover:border-border hover:bg-card/80 transition-all duration-300"
                  >
                    {/* Gradient hover effect */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${menu.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                    
                    {/* Badges */}
                    {menu.badge && (
                      <div className="absolute top-3 right-3 z-10">
                        {menu.badge === "new" && (
                          <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[10px] px-2 py-0.5 font-medium">
                            NEW
                          </Badge>
                        )}
                        {menu.badge === "official" && (
                          <Badge className="bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] px-2 py-0.5 font-medium">
                            Official
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="relative z-10 p-5">
                      {/* Icon */}
                      <div className={`w-11 h-11 rounded-xl ${menu.iconBg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                        <menu.icon className={`w-5 h-5 ${menu.iconColor}`} />
                      </div>
                      
                      {/* Title */}
                      <h3 className="font-semibold text-foreground text-base mb-1.5">{t(menu.titleKey)}</h3>

                      {/* Description */}
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {t(menu.descriptionKey)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        </div>
      </main>
      
      <AppFooter />
    </div>
  );
}
