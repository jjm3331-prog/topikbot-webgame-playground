import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { 
  ArrowLeft, Brain, ChevronDown, ChevronUp, Check, 
  BookOpen, Languages, Star, Target, Crown
} from "lucide-react";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "@/hooks/use-toast";

interface HanjaRoot {
  id: string;
  hanja: string;
  reading_ko: string;
  meaning_ko: string;
  meaning_en: string | null;
  meaning_ja: string | null;
  meaning_zh: string | null;
  meaning_vi: string | null;
  display_order: number;
}

interface HanjaWord {
  id: string;
  word: string;
  meaning_en: string | null;
  meaning_ja: string | null;
  meaning_zh: string | null;
  meaning_vi: string | null;
  display_order: number;
  root_id: string;
}

interface DayInfo {
  id: string;
  day_number: number;
  topic_ko: string;
}

const ROOT_COLORS = [
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-emerald-500 to-teal-600",
  "from-blue-500 to-indigo-600",
  "from-purple-500 to-violet-600",
  "from-cyan-500 to-blue-600",
  "from-fuchsia-500 to-pink-600",
  "from-green-500 to-emerald-600",
];

export default function HanjaMindmapDay() {
  const navigate = useNavigate();
  const { dayNumber } = useParams<{ dayNumber: string }>();
  const { isPremium, user } = useSubscription();
  
  const [dayInfo, setDayInfo] = useState<DayInfo | null>(null);
  const [roots, setRoots] = useState<HanjaRoot[]>([]);
  const [words, setWords] = useState<Map<string, HanjaWord[]>>(new Map());
  const [expandedRoots, setExpandedRoots] = useState<Set<string>>(new Set());
  const [masteredWords, setMasteredWords] = useState<Set<string>>(new Set());
  const [selectedWord, setSelectedWord] = useState<HanjaWord | null>(null);
  const [loading, setLoading] = useState(true);

  const day = parseInt(dayNumber || "1", 10);

  useEffect(() => {
    fetchDayData();
  }, [day, user]);

  const fetchDayData = async () => {
    setLoading(true);
    try {
      // Fetch day info
      const { data: dayData } = await supabase
        .from("hanja_days")
        .select("*")
        .eq("day_number", day)
        .single();

      if (!dayData) {
        toast({
          title: "데이터 없음",
          description: `Day ${day} 데이터가 없습니다.`,
          variant: "destructive",
        });
        navigate("/hanja-mindmap");
        return;
      }

      setDayInfo(dayData);

      // Fetch roots for this day
      const { data: rootsData } = await supabase
        .from("hanja_roots")
        .select("*")
        .eq("day_id", dayData.id)
        .order("display_order");

      if (rootsData) {
        setRoots(rootsData);

        // Fetch words for all roots
        const rootIds = rootsData.map(r => r.id);
        const { data: wordsData } = await supabase
          .from("hanja_words")
          .select("*")
          .in("root_id", rootIds)
          .order("display_order");

        if (wordsData) {
          const wordsMap = new Map<string, HanjaWord[]>();
          wordsData.forEach(word => {
            const existing = wordsMap.get(word.root_id) || [];
            existing.push(word);
            wordsMap.set(word.root_id, existing);
          });
          setWords(wordsMap);
        }

        // Expand first root by default
        if (rootsData.length > 0) {
          setExpandedRoots(new Set([rootsData[0].id]));
        }
      }

      // Fetch user's mastered words
      if (user) {
        const { data: masteredData } = await supabase
          .from("hanja_mastered_words")
          .select("word_id")
          .eq("user_id", user.id);

        if (masteredData) {
          setMasteredWords(new Set(masteredData.map(m => m.word_id)));
        }
      }
    } catch (error) {
      console.error("Error fetching day data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRoot = (rootId: string) => {
    setExpandedRoots(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rootId)) {
        newSet.delete(rootId);
      } else {
        newSet.add(rootId);
      }
      return newSet;
    });
  };

  const toggleMastered = async (wordId: string) => {
    if (!user) {
      toast({
        title: "로그인 필요",
        description: "학습 진도를 저장하려면 로그인하세요.",
      });
      return;
    }

    const isMastered = masteredWords.has(wordId);

    try {
      if (isMastered) {
        await supabase
          .from("hanja_mastered_words")
          .delete()
          .eq("user_id", user.id)
          .eq("word_id", wordId);

        setMasteredWords(prev => {
          const newSet = new Set(prev);
          newSet.delete(wordId);
          return newSet;
        });
      } else {
        await supabase
          .from("hanja_mastered_words")
          .insert({ user_id: user.id, word_id: wordId });

        setMasteredWords(prev => new Set([...prev, wordId]));
      }
    } catch (error) {
      console.error("Error toggling mastered:", error);
    }
  };

  const getWordsForRoot = (rootId: string): HanjaWord[] => {
    return words.get(rootId) || [];
  };

  const totalWords = Array.from(words.values()).flat().length;
  const masteredCount = Array.from(words.values()).flat().filter(w => masteredWords.has(w.id)).length;
  const progress = totalWords > 0 ? Math.round((masteredCount / totalWords) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-12 h-12 text-primary mx-auto animate-pulse" />
          <p className="mt-4 text-muted-foreground">Day {day} 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CleanHeader />

      <main className="pt-20 pb-24">
        <div className="container max-w-4xl mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/hanja-mindmap")}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              목록으로
            </Button>

            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-primary border-primary">
                    Day {String(day).padStart(2, "0")}
                  </Badge>
                  {!isPremium && (
                    <Badge className="bg-gradient-to-r from-korean-orange to-korean-pink text-white text-xs">
                      <Crown className="w-3 h-3 mr-1" />
                      Premium
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl md:text-3xl font-heading font-bold">
                  {dayInfo?.topic_ko || `Day ${day}`}
                </h1>
              </div>

              {/* Progress */}
              <Card className="px-4 py-3 bg-primary/5 border-primary/20">
                <div className="flex items-center gap-4">
                  <Target className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{masteredCount}/{totalWords} 단어</p>
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden mt-1">
                      <div 
                        className="h-full bg-primary transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </motion.div>

          {/* Mind Map - Roots */}
          <div className="space-y-4">
            {roots.map((root, index) => {
              const rootWords = getWordsForRoot(root.id);
              const isExpanded = expandedRoots.has(root.id);
              const colorClass = ROOT_COLORS[index % ROOT_COLORS.length];

              return (
                <motion.div
                  key={root.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="overflow-hidden">
                    {/* Root Header */}
                    <button
                      onClick={() => toggleRoot(root.id)}
                      className="w-full p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${colorClass} flex flex-col items-center justify-center shadow-lg`}>
                        <span className="text-white text-2xl font-bold">{root.hanja}</span>
                        <span className="text-white/80 text-xs">{root.reading_ko}</span>
                      </div>

                      <div className="flex-1 text-left">
                        <h3 className="font-semibold text-lg text-foreground">
                          {root.meaning_ko}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {root.meaning_en || root.meaning_vi}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {rootWords.length}개 단어
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {rootWords.filter(w => masteredWords.has(w.id)).length}/{rootWords.length}
                        </Badge>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {/* Words Grid */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-border p-4">
                            {/* Root Meanings in all languages */}
                            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground">🇬🇧 </span>
                                  <span>{root.meaning_en || "-"}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">🇯🇵 </span>
                                  <span>{root.meaning_ja || "-"}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">🇨🇳 </span>
                                  <span>{root.meaning_zh || "-"}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">🇻🇳 </span>
                                  <span>{root.meaning_vi || "-"}</span>
                                </div>
                              </div>
                            </div>

                            {/* Words */}
                            <div className="grid gap-2">
                              {rootWords.map((word) => {
                                const isMastered = masteredWords.has(word.id);

                                return (
                                  <Drawer key={word.id}>
                                    <DrawerTrigger asChild>
                                      <motion.div
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                                          isMastered 
                                            ? "bg-primary/10 border-primary/30" 
                                            : "bg-background border-border hover:border-primary/50"
                                        }`}
                                        onClick={() => setSelectedWord(word)}
                                      >
                                        <div className="flex items-center gap-3">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleMastered(word.id);
                                            }}
                                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                              isMastered 
                                                ? "bg-primary border-primary text-white" 
                                                : "border-muted-foreground/30 hover:border-primary"
                                            }`}
                                          >
                                            {isMastered && <Check className="w-4 h-4" />}
                                          </button>
                                          <div>
                                            <p className="font-semibold text-foreground">{word.word}</p>
                                            <p className="text-sm text-muted-foreground line-clamp-1">
                                              {word.meaning_en || word.meaning_vi}
                                            </p>
                                          </div>
                                        </div>
                                        <Languages className="w-4 h-4 text-muted-foreground" />
                                      </motion.div>
                                    </DrawerTrigger>

                                    <DrawerContent>
                                      <DrawerHeader className="text-left">
                                        <DrawerTitle className="text-2xl flex items-center gap-2">
                                          {word.word}
                                          {isMastered && (
                                            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                                          )}
                                        </DrawerTitle>
                                      </DrawerHeader>
                                      <div className="px-4 pb-8 space-y-4">
                                        <Card className="p-4 space-y-3">
                                          <div className="flex items-center gap-2">
                                            <span className="text-lg">🇬🇧</span>
                                            <span className="text-foreground">{word.meaning_en || "-"}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-lg">🇯🇵</span>
                                            <span className="text-foreground">{word.meaning_ja || "-"}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-lg">🇨🇳</span>
                                            <span className="text-foreground">{word.meaning_zh || "-"}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-lg">🇻🇳</span>
                                            <span className="text-foreground">{word.meaning_vi || "-"}</span>
                                          </div>
                                        </Card>

                                        <Button
                                          onClick={() => toggleMastered(word.id)}
                                          className={`w-full ${isMastered ? "bg-muted text-foreground hover:bg-muted/80" : ""}`}
                                          variant={isMastered ? "outline" : "default"}
                                        >
                                          {isMastered ? (
                                            <>
                                              <Check className="w-4 h-4 mr-2" />
                                              학습 완료
                                            </>
                                          ) : (
                                            <>
                                              <Star className="w-4 h-4 mr-2" />
                                              완료로 표시
                                            </>
                                          )}
                                        </Button>
                                      </div>
                                    </DrawerContent>
                                  </Drawer>
                                );
                              })}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              );
            })}

            {/* Empty State */}
            {roots.length === 0 && (
              <Card className="p-12 text-center">
                <Brain className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">데이터 준비 중</h3>
                <p className="text-muted-foreground">
                  Day {day} 콘텐츠가 곧 업데이트됩니다.
                </p>
                <Button
                  variant="outline"
                  onClick={() => navigate("/hanja-mindmap")}
                  className="mt-4"
                >
                  목록으로 돌아가기
                </Button>
              </Card>
            )}
          </div>

          {/* Navigation Buttons */}
          {roots.length > 0 && (
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={() => navigate(`/hanja-mindmap/${day - 1}`)}
                disabled={day <= 1}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                이전 Day
              </Button>
              <Button
                onClick={() => navigate(`/hanja-mindmap/${day + 1}`)}
                disabled={day >= 82}
              >
                다음 Day
                <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
              </Button>
            </div>
          )}
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
