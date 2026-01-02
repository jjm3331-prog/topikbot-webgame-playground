import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Brain,
  ChevronDown,
  ChevronRight,
  Info,
  Sparkles,
  Target,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { PremiumPreviewBanner } from "@/components/PremiumPreviewBanner";

interface HanjaUnit {
  id: string;
  unit_number: number;
  title_ko: string;
  title_en: string | null;
}

interface HanjaDay {
  id: string;
  day_number: number;
  topic_ko: string;
  topic_en: string | null;
  unit_id: string;
}

interface UserProgress {
  day_id: string;
  completed: boolean;
  mastered_words: number;
  total_words: number;
}

const UNIT_COLORS: { [key: number]: string } = {
  1: "from-rose-500 to-pink-600",
  2: "from-emerald-500 to-teal-600",
  3: "from-amber-500 to-orange-600",
  4: "from-red-500 to-rose-600",
  5: "from-blue-500 to-indigo-600",
  6: "from-purple-500 to-violet-600",
  7: "from-cyan-500 to-blue-600",
  8: "from-pink-500 to-fuchsia-600",
  9: "from-yellow-500 to-amber-600",
  10: "from-indigo-500 to-purple-600",
  11: "from-violet-500 to-purple-600",
  12: "from-green-500 to-emerald-600",
  13: "from-slate-500 to-gray-600",
  14: "from-orange-500 to-red-600",
  15: "from-teal-500 to-cyan-600",
  16: "from-fuchsia-500 to-pink-600",
  17: "from-rose-500 to-red-600",
  18: "from-indigo-500 to-blue-600",
};

export default function HanjaMindmap() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { isPremium, loading: subLoading, user } = useSubscription();
  const [units, setUnits] = useState<HanjaUnit[]>([]);
  const [days, setDays] = useState<HanjaDay[]>([]);
  const [userProgress, setUserProgress] = useState<Map<string, UserProgress>>(new Map());
  const [expandedUnits, setExpandedUnits] = useState<Set<number>>(new Set([1]));
  const [loading, setLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(false);

  const isKoUI = useMemo(() => {
    const lng = i18n.language || "ko";
    return lng.toLowerCase().startsWith("ko");
  }, [i18n.language]);

  useEffect(() => {
    // SEO: title/description per language
    document.title = t("hanjaMindmapPage.seo.title");
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", t("hanjaMindmapPage.seo.description"));
  }, [t, i18n.language]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchData = async () => {
    try {
      const { data: unitsData } = await supabase
        .from("hanja_units")
        .select("id, unit_number, title_ko, title_en")
        .order("unit_number");

      const { data: daysData } = await supabase
        .from("hanja_days")
        .select("id, day_number, topic_ko, topic_en, unit_id")
        .order("day_number");

      if (unitsData) setUnits(unitsData);
      if (daysData) setDays(daysData);

      if (user) {
        const { data: progressData } = await supabase
          .from("hanja_learning_progress")
          .select("*")
          .eq("user_id", user.id);

        if (progressData) {
          const progressMap = new Map<string, UserProgress>();
          progressData.forEach((p) => {
            progressMap.set(p.day_id, p);
          });
          setUserProgress(progressMap);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleUnit = (unitNumber: number) => {
    setExpandedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(unitNumber)) next.delete(unitNumber);
      else next.add(unitNumber);
      return next;
    });
  };

  const getDaysForUnit = (unitId: string) => days.filter((day) => day.unit_id === unitId);
  const getProgressForDay = (dayId: string): UserProgress | undefined => userProgress.get(dayId);

  const getUnitTitle = (unit: HanjaUnit) => (isKoUI ? unit.title_ko : unit.title_en ?? unit.title_ko);
  const getDayTopic = (day: HanjaDay) => (isKoUI ? day.topic_ko : day.topic_en ?? day.topic_ko);

  const handleDayClick = (dayNumber: number) => {
    navigate(`/hanja-mindmap/${dayNumber}`);
  };

  const totalDays = days.length;
  const completedDays = Array.from(userProgress.values()).filter((p) => p.completed).length;
  const overallProgress = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

  if (loading || subLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-12 h-12 text-primary mx-auto animate-pulse" />
          <p className="mt-4 text-muted-foreground">{t("hanjaMindmapPage.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CleanHeader />

      <main className="pt-20 pb-24">
        <section className="container max-w-4xl mx-auto px-4">
          {/* Hero Section */}
          <motion.header
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
              <Brain className="w-5 h-5" />
              <span className="text-sm font-medium">{t("hanjaMindmapPage.hero.badge")}</span>
              <Badge
                variant="secondary"
                className="bg-gradient-to-r from-korean-orange to-korean-pink text-white text-xs"
              >
                {t("common.premium")}
              </Badge>
            </div>

            <h1 className="text-3xl md:text-4xl font-heading font-bold mb-3 bg-gradient-to-r from-korean-orange via-korean-pink to-korean-purple bg-clip-text text-transparent">
              {t("hanjaMindmapPage.hero.title")}
            </h1>

            <p className="text-muted-foreground max-w-xl mx-auto mb-6">
              {t("hanjaMindmapPage.hero.subtitleLine1")}
              <br />
              {t("hanjaMindmapPage.hero.subtitleLine2")}
            </p>

            {/* Progress Card */}
            {user && (
              <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{t("hanjaMindmapPage.progress.label")}</span>
                  <span className="text-sm text-muted-foreground">
                    {t("hanjaMindmapPage.progress.completed", { completedDays, totalDays })}
                  </span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${overallProgress}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-korean-orange to-korean-pink"
                  />
                </div>
              </Card>
            )}

            {/* Guide Toggle Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGuide(!showGuide)}
              className="gap-2"
            >
              <Info className="w-4 h-4" />
              {t("hanjaMindmapPage.guide.toggle")}
              <ChevronDown className={`w-4 h-4 transition-transform ${showGuide ? "rotate-180" : ""}`} />
            </Button>
          </motion.header>

          {/* Learning Guide */}
          <AnimatePresence>
            {showGuide && (
              <motion.section
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-8 overflow-hidden"
                aria-label={t("hanjaMindmapPage.guide.aria")}
              >
                <Card className="p-6 bg-gradient-to-br from-muted/50 to-muted/30 border-border/50">
                  <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    {t("hanjaMindmapPage.guide.title")}
                  </h2>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-korean-orange/20 flex items-center justify-center shrink-0">
                          <span className="text-korean-orange font-bold text-sm">1</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{t("hanjaMindmapPage.guide.step1.title")}</p>
                          <p className="text-xs text-muted-foreground">{t("hanjaMindmapPage.guide.step1.desc")}</p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-korean-pink/20 flex items-center justify-center shrink-0">
                          <span className="text-korean-pink font-bold text-sm">2</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{t("hanjaMindmapPage.guide.step2.title")}</p>
                          <p className="text-xs text-muted-foreground">{t("hanjaMindmapPage.guide.step2.desc")}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-korean-purple/20 flex items-center justify-center shrink-0">
                          <span className="text-korean-purple font-bold text-sm">3</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{t("hanjaMindmapPage.guide.step3.title")}</p>
                          <p className="text-xs text-muted-foreground">{t("hanjaMindmapPage.guide.step3.desc")}</p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                          <span className="text-emerald-500 font-bold text-sm">4</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{t("hanjaMindmapPage.guide.step4.title")}</p>
                          <p className="text-xs text-muted-foreground">{t("hanjaMindmapPage.guide.step4.desc")}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Premium Banner for non-premium users */}
          {!isPremium && <PremiumPreviewBanner featureName={t("hanjaMindmapPage.premium.featureName")} />}

          {/* Units List */}
          <section className="space-y-4" aria-label={t("hanjaMindmapPage.units.aria")}>
            {units.map((unit, index) => {
              const unitDays = getDaysForUnit(unit.id);
              const isExpanded = expandedUnits.has(unit.unit_number);
              const completedInUnit = unitDays.filter((day) => getProgressForDay(day.id)?.completed).length;

              return (
                <motion.article
                  key={unit.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="overflow-hidden">
                    {/* Unit Header */}
                    <button
                      onClick={() => toggleUnit(unit.unit_number)}
                      className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${UNIT_COLORS[unit.unit_number] || "from-gray-500 to-slate-600"} flex items-center justify-center shadow-lg`}
                        >
                          <span className="text-white font-bold">{unit.unit_number}</span>
                        </div>
                        <div className="text-left">
                          <h3 className="font-semibold text-foreground">{getUnitTitle(unit)}</h3>
                          <p className="text-sm text-muted-foreground">
                            {t("hanjaMindmapPage.units.unitMeta", {
                              days: unitDays.length,
                              completed: completedInUnit,
                            })}
                          </p>
                        </div>
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </button>

                    {/* Days List */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-border p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {unitDays.map((day) => {
                              const progress = getProgressForDay(day.id);
                              const isCompleted = progress?.completed;

                              return (
                                <motion.button
                                  key={day.id}
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => handleDayClick(day.day_number)}
                                  className={`p-3 rounded-xl border transition-all text-left ${
                                    isCompleted
                                      ? "bg-primary/10 border-primary/30"
                                      : "bg-muted/30 border-border hover:border-primary/50 hover:bg-muted/50"
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium text-muted-foreground">
                                      {t("hanjaMindmapPage.units.dayLabel", {
                                        day: String(day.day_number).padStart(2, "0"),
                                      })}
                                    </span>
                                    {isCompleted && <Target className="w-4 h-4 text-primary" />}
                                  </div>
                                  <p className="text-sm font-medium text-foreground truncate">{getDayTopic(day)}</p>
                                  {progress && progress.total_words > 0 && (
                                    <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-primary transition-all"
                                        style={{ width: `${(progress.mastered_words / progress.total_words) * 100}%` }}
                                      />
                                    </div>
                                  )}
                                </motion.button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.article>
              );
            })}

            {/* Empty State */}
            {units.length === 0 && (
              <Card className="p-12 text-center">
                <Brain className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t("hanjaMindmapPage.empty.title")}</h3>
                <p className="text-muted-foreground">{t("hanjaMindmapPage.empty.desc")}</p>
              </Card>
            )}
          </section>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
