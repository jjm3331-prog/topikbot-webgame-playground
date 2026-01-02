import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  BookOpen, ChevronRight, GraduationCap, Crown, 
  Info, ChevronDown, Brain, Sparkles, Target, Play
} from "lucide-react";
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
}

interface HanjaDay {
  id: string;
  day_number: number;
  topic_ko: string;
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
  const { isPremium, loading: subLoading, user } = useSubscription();
  const [units, setUnits] = useState<HanjaUnit[]>([]);
  const [days, setDays] = useState<HanjaDay[]>([]);
  const [userProgress, setUserProgress] = useState<Map<string, UserProgress>>(new Map());
  const [expandedUnits, setExpandedUnits] = useState<Set<number>>(new Set([1]));
  const [loading, setLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch units
      const { data: unitsData } = await supabase
        .from("hanja_units")
        .select("*")
        .order("unit_number");

      // Fetch days
      const { data: daysData } = await supabase
        .from("hanja_days")
        .select("*")
        .order("day_number");

      if (unitsData) setUnits(unitsData);
      if (daysData) setDays(daysData);

      // Fetch user progress if logged in
      if (user) {
        const { data: progressData } = await supabase
          .from("hanja_learning_progress")
          .select("*")
          .eq("user_id", user.id);

        if (progressData) {
          const progressMap = new Map<string, UserProgress>();
          progressData.forEach(p => {
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
    setExpandedUnits(prev => {
      const newSet = new Set(prev);
      if (newSet.has(unitNumber)) {
        newSet.delete(unitNumber);
      } else {
        newSet.add(unitNumber);
      }
      return newSet;
    });
  };

  const getDaysForUnit = (unitId: string) => {
    return days.filter(day => day.unit_id === unitId);
  };

  const getProgressForDay = (dayId: string): UserProgress | undefined => {
    return userProgress.get(dayId);
  };

  const handleDayClick = (dayNumber: number) => {
    navigate(`/hanja-mindmap/${dayNumber}`);
  };

  const totalDays = days.length;
  const completedDays = Array.from(userProgress.values()).filter(p => p.completed).length;
  const overallProgress = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

  if (loading || subLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-12 h-12 text-primary mx-auto animate-pulse" />
          <p className="mt-4 text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CleanHeader />

      <main className="pt-20 pb-24">
        <div className="container max-w-4xl mx-auto px-4">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
              <Brain className="w-5 h-5" />
              <span className="text-sm font-medium">마인드맵 한자어 학습</span>
              <Badge variant="secondary" className="bg-gradient-to-r from-korean-orange to-korean-pink text-white text-xs">
                Premium
              </Badge>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-heading font-bold mb-3 bg-gradient-to-r from-korean-orange via-korean-pink to-korean-purple bg-clip-text text-transparent">
              한자어 2300
            </h1>
            
            <p className="text-muted-foreground max-w-xl mx-auto mb-6">
              마인드맵으로 배우는 중·고급 한자어 2,300개!<br />
              82일 완성 체계적인 TOPIK 어휘 마스터
            </p>

            {/* Progress Card */}
            {user && (
              <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">전체 진도</span>
                  <span className="text-sm text-muted-foreground">{completedDays}/{totalDays} Day 완료</span>
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
              학습 가이드
              <ChevronDown className={`w-4 h-4 transition-transform ${showGuide ? "rotate-180" : ""}`} />
            </Button>
          </motion.div>

          {/* Learning Guide */}
          <AnimatePresence>
            {showGuide && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-8 overflow-hidden"
              >
                <Card className="p-6 bg-gradient-to-br from-muted/50 to-muted/30 border-border/50">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    학습 방법 가이드
                  </h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-korean-orange/20 flex items-center justify-center shrink-0">
                          <span className="text-korean-orange font-bold text-sm">1</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">마인드맵 탐색</p>
                          <p className="text-xs text-muted-foreground">한자 뿌리를 클릭하여 파생 단어를 확인하세요</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-korean-pink/20 flex items-center justify-center shrink-0">
                          <span className="text-korean-pink font-bold text-sm">2</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">다국어 뜻 학습</p>
                          <p className="text-xs text-muted-foreground">영어, 일본어, 중국어, 베트남어로 의미 파악</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-korean-purple/20 flex items-center justify-center shrink-0">
                          <span className="text-korean-purple font-bold text-sm">3</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">단어 마스터 체크</p>
                          <p className="text-xs text-muted-foreground">학습한 단어를 체크하여 진도를 관리하세요</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                          <span className="text-emerald-500 font-bold text-sm">4</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">매일 1 Day 완성</p>
                          <p className="text-xs text-muted-foreground">82일이면 2,300개 어휘 완전 정복!</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Premium Banner for non-premium users */}
          {!isPremium && <PremiumPreviewBanner featureName="한자어 마인드맵" />}

          {/* Units List */}
          <div className="space-y-4">
            {units.map((unit, index) => {
              const unitDays = getDaysForUnit(unit.id);
              const isExpanded = expandedUnits.has(unit.unit_number);
              const completedInUnit = unitDays.filter(day => 
                getProgressForDay(day.id)?.completed
              ).length;

              return (
                <motion.div
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
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${UNIT_COLORS[unit.unit_number] || "from-gray-500 to-slate-600"} flex items-center justify-center shadow-lg`}>
                          <span className="text-white font-bold">{unit.unit_number}</span>
                        </div>
                        <div className="text-left">
                          <h3 className="font-semibold text-foreground">{unit.title_ko}</h3>
                          <p className="text-sm text-muted-foreground">
                            {unitDays.length} Day · {completedInUnit}/{unitDays.length} 완료
                          </p>
                        </div>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
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
                                      Day {String(day.day_number).padStart(2, "0")}
                                    </span>
                                    {isCompleted && (
                                      <Target className="w-4 h-4 text-primary" />
                                    )}
                                  </div>
                                  <p className="text-sm font-medium text-foreground truncate">
                                    {day.topic_ko}
                                  </p>
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
                </motion.div>
              );
            })}

            {/* Empty State */}
            {units.length === 0 && (
              <Card className="p-12 text-center">
                <Brain className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">데이터 준비 중</h3>
                <p className="text-muted-foreground">
                  한자어 마인드맵 콘텐츠가 곧 업데이트됩니다.
                </p>
              </Card>
            )}
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
