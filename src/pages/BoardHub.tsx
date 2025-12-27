import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Megaphone, 
  MessageCircle, 
  BookOpen,
  Ghost,
  Sparkles,
  ChevronRight,
  Users,
  FileText,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";

const boardMenus = [
  {
    id: "notice",
    titleKey: "boardHub.boards.notice.title",
    subtitleKey: "boardHub.boards.notice.subtitle",
    descriptionKey: "boardHub.boards.notice.description",
    icon: Megaphone,
    color: "from-red-500 to-rose-600",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    path: "/board/notice",
    isAdmin: true
  },
  {
    id: "free",
    titleKey: "boardHub.boards.free.title",
    subtitleKey: "boardHub.boards.free.subtitle",
    descriptionKey: "boardHub.boards.free.description",
    icon: MessageCircle,
    color: "from-blue-500 to-cyan-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    path: "/board/free",
    isNew: true
  },
  {
    id: "resource",
    titleKey: "boardHub.boards.resource.title",
    subtitleKey: "boardHub.boards.resource.subtitle",
    descriptionKey: "boardHub.boards.resource.description",
    icon: BookOpen,
    color: "from-emerald-500 to-teal-600",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    path: "/board/resource"
  },
  {
    id: "anonymous",
    titleKey: "boardHub.boards.anonymous.title",
    subtitleKey: "boardHub.boards.anonymous.subtitle",
    descriptionKey: "boardHub.boards.anonymous.description",
    icon: Ghost,
    color: "from-purple-500 to-indigo-600",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    path: "/board/anonymous"
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const getIconColor = (color: string) => {
  if (color.includes('red')) return '#ef4444';
  if (color.includes('blue')) return '#3b82f6';
  if (color.includes('emerald')) return '#10b981';
  if (color.includes('purple')) return '#a855f7';
  return '#8b5cf6';
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
            
            <div className="flex items-center gap-5 mb-5">
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                <Users className="w-9 h-9 sm:w-10 sm:h-10 text-white" />
              </div>
              <div>
                <h1 className="text-title font-bold text-foreground">💬 {t("boardHub.title")}</h1>
                <p className="text-body text-muted-foreground mt-1">{t("boardHub.subtitle")}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-3 mt-5">
              <Badge variant="outline" className="gap-2 py-2 px-4 text-card-caption">
                <FileText className="w-4 h-4 text-blue-500" />
                <span>{t("boardHub.stats.categories")}</span>
              </Badge>
              <Badge variant="outline" className="gap-2 py-2 px-4 text-card-caption">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span>{t("boardHub.stats.realtime")}</span>
              </Badge>
              <Badge variant="outline" className="gap-2 py-2 px-4 text-card-caption">
                <Zap className="w-4 h-4 text-green-500" />
                <span>{t("boardHub.stats.upload")}</span>
              </Badge>
            </div>
          </motion.div>

          {/* Board Cards Grid */}
          <motion.section
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
              {boardMenus.map((menu) => (
                <motion.div 
                  key={menu.id} 
                  variants={itemVariants}
                >
                  <Card
                    onClick={() => navigate(menu.path)}
                    className={`relative overflow-hidden cursor-pointer group h-full border-2 ${menu.borderColor} hover:shadow-2xl hover:scale-[1.02] transition-all duration-300`}
                  >
                    {/* Gradient overlay on hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${menu.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                    
                    {/* Badges */}
                    <div className="absolute top-4 right-4 z-20 flex gap-2">
                      {menu.isNew && (
                        <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-badge px-3 py-1.5 font-semibold">
                          ✨ {t("boardHub.badges.new")}
                        </Badge>
                      )}
                      {menu.isAdmin && (
                        <Badge className="bg-gradient-to-r from-red-500 to-rose-500 text-white text-badge px-3 py-1.5 font-semibold">
                          📢 {t("boardHub.badges.official")}
                        </Badge>
                      )}
                    </div>

                    <div className="relative z-10 p-6 sm:p-8 flex flex-col items-center text-center h-full">
                      {/* Icon with glow effect */}
                      <div className="relative mb-4">
                        <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl ${menu.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                          <menu.icon 
                            className="w-8 h-8 sm:w-10 sm:h-10" 
                            style={{ color: getIconColor(menu.color) }} 
                          />
                        </div>
                        <div className={`absolute inset-0 blur-xl opacity-0 group-hover:opacity-50 transition-opacity bg-gradient-to-br ${menu.color}`} />
                      </div>
                      
                      {/* Title */}
                      <h3 className="font-bold text-foreground text-card-title-lg sm:text-2xl mb-1.5">{t(menu.titleKey)}</h3>
                      <p className="text-card-caption sm:text-base text-muted-foreground mb-3">{t(menu.subtitleKey)}</p>

                      {/* Description */}
                      <p className="text-card-body sm:text-lg text-muted-foreground/90 leading-relaxed flex-1">
                        {t(menu.descriptionKey)}
                      </p>
                      
                      {/* Button indicator */}
                      <div className="mt-6 w-full">
                        <div className={`flex items-center justify-center gap-2 py-3 sm:py-3.5 rounded-xl bg-gradient-to-r ${menu.color} opacity-0 group-hover:opacity-100 transition-all duration-300`}>
                          <span className="text-white text-button-lg font-bold">{t("boardHub.viewNow")}</span>
                          <ChevronRight className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </div>
                  </Card>
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
