import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { 
  ArrowLeft, Brain, Check, Crown, Target, X, Star, Languages, 
  ChevronLeft, ChevronRight, Sparkles
} from "lucide-react";
import { useTranslation } from "react-i18next";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  meaning_ko: string | null;
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
  topic_en: string | null;
}

// 마인드맵 노드 색상 팔레트
const NODE_COLORS = [
  { bg: "from-rose-500 to-pink-600", border: "border-rose-400", text: "text-rose-100", line: "#f43f5e" },
  { bg: "from-amber-500 to-orange-600", border: "border-amber-400", text: "text-amber-100", line: "#f59e0b" },
  { bg: "from-emerald-500 to-teal-600", border: "border-emerald-400", text: "text-emerald-100", line: "#10b981" },
  { bg: "from-blue-500 to-indigo-600", border: "border-blue-400", text: "text-blue-100", line: "#3b82f6" },
  { bg: "from-purple-500 to-violet-600", border: "border-purple-400", text: "text-purple-100", line: "#8b5cf6" },
  { bg: "from-cyan-500 to-blue-600", border: "border-cyan-400", text: "text-cyan-100", line: "#06b6d4" },
  { bg: "from-fuchsia-500 to-pink-600", border: "border-fuchsia-400", text: "text-fuchsia-100", line: "#d946ef" },
  { bg: "from-green-500 to-emerald-600", border: "border-green-400", text: "text-green-100", line: "#22c55e" },
];

export default function HanjaMindmapDay() {
  const navigate = useNavigate();
  const { dayNumber } = useParams<{ dayNumber: string }>();
  const { isPremium, user } = useSubscription();
  const { t, i18n } = useTranslation();
  const isKorean = i18n.language === 'ko';
  
  const [dayInfo, setDayInfo] = useState<DayInfo | null>(null);
  const [roots, setRoots] = useState<HanjaRoot[]>([]);
  const [words, setWords] = useState<Map<string, HanjaWord[]>>(new Map());
  const [selectedRoot, setSelectedRoot] = useState<HanjaRoot | null>(null);
  const [selectedWord, setSelectedWord] = useState<HanjaWord | null>(null);
  const [masteredWords, setMasteredWords] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const day = parseInt(dayNumber || "1", 10);

  useEffect(() => {
    fetchDayData();
  }, [day, user]);

  const fetchDayData = async () => {
    setLoading(true);
    try {
      const { data: dayData } = await supabase
        .from("hanja_days")
        .select("*")
        .eq("day_number", day)
        .single();

      if (!dayData) {
        toast({
          title: t('hanjaMindmapDay.noData', '데이터 없음'),
          description: t('hanjaMindmapDay.noDataDesc', { day }),
          variant: "destructive",
        });
        navigate("/hanja-mindmap");
        return;
      }

      setDayInfo(dayData);

      const { data: rootsData } = await supabase
        .from("hanja_roots")
        .select("*")
        .eq("day_id", dayData.id)
        .order("display_order");

      if (rootsData) {
        setRoots(rootsData);

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
      }

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

  const toggleMastered = async (wordId: string) => {
    if (!user) {
      toast({
        title: t('hanjaMindmapDay.loginRequired', '로그인 필요'),
        description: t('hanjaMindmapDay.loginDesc', '학습 진도를 저장하려면 로그인하세요.'),
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

  const getRootMeaning = (root: HanjaRoot) => {
    if (isKorean) return root.meaning_ko;
    switch(i18n.language) {
      case 'en': return root.meaning_en || root.meaning_ko;
      case 'ja': return root.meaning_ja || root.meaning_en || root.meaning_ko;
      case 'zh': return root.meaning_zh || root.meaning_ko;
      case 'vi': return root.meaning_vi || root.meaning_en || root.meaning_ko;
      default: return root.meaning_en || root.meaning_ko;
    }
  };

  const getWordMeaning = (word: HanjaWord) => {
    if (isKorean) return word.meaning_ko || '';
    switch(i18n.language) {
      case 'en': return word.meaning_en || word.meaning_ko || '';
      case 'ja': return word.meaning_ja || word.meaning_en || word.meaning_ko || '';
      case 'zh': return word.meaning_zh || word.meaning_ko || '';
      case 'vi': return word.meaning_vi || word.meaning_en || word.meaning_ko || '';
      default: return word.meaning_en || word.meaning_ko || '';
    }
  };

  const getDayTopic = () => {
    if (isKorean) return dayInfo?.topic_ko || `Day ${day}`;
    return dayInfo?.topic_en || dayInfo?.topic_ko || `Day ${day}`;
  };

  // 마인드맵 노드 위치 계산
  const calculateNodePositions = useCallback(() => {
    const positions: { x: number; y: number; angle: number }[] = [];
    const count = roots.length;
    
    for (let i = 0; i < count; i++) {
      const angle = (i * 360 / count) - 90; // 시작점을 12시 방향으로
      const radians = (angle * Math.PI) / 180;
      const radius = 160; // 중심에서 노드까지의 거리
      
      positions.push({
        x: Math.cos(radians) * radius,
        y: Math.sin(radians) * radius,
        angle
      });
    }
    
    return positions;
  }, [roots.length]);

  const nodePositions = useMemo(() => calculateNodePositions(), [calculateNodePositions]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-12 h-12 text-primary mx-auto animate-pulse" />
          <p className="mt-4 text-muted-foreground">{t('hanjaMindmapDay.loading', 'Day {{day}} 로딩 중...', { day })}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CleanHeader />

      <main className="pt-20 pb-24">
        <div className="container max-w-6xl mx-auto px-4">
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
              {t('hanjaMindmapDay.backToList', '목록으로')}
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
                  {getDayTopic()}
                </h1>
              </div>

              {/* Progress */}
              <Card className="px-4 py-3 bg-primary/5 border-primary/20">
                <div className="flex items-center gap-4">
                  <Target className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">
                      {t('hanjaMindmapDay.wordsProgress', '{{mastered}}/{{total}} 단어', { mastered: masteredCount, total: totalWords })}
                    </p>
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

          {/* 마인드맵 시각화 */}
          <div className="relative w-full aspect-square max-w-[700px] mx-auto my-8">
            {/* SVG 연결선 */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {roots.map((root, index) => {
                const pos = nodePositions[index];
                if (!pos) return null;
                const color = NODE_COLORS[index % NODE_COLORS.length];
                
                return (
                  <motion.line
                    key={`line-${root.id}`}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.6 }}
                    transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
                    x1="50%"
                    y1="50%"
                    x2={`calc(50% + ${pos.x}px)`}
                    y2={`calc(50% + ${pos.y}px)`}
                    stroke={color.line}
                    strokeWidth="3"
                    strokeDasharray="8 4"
                  />
                );
              })}
            </svg>

            {/* 중앙 노드 (주제) */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
            >
              <div className="relative">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-primary via-korean-orange to-korean-pink shadow-2xl shadow-primary/30 flex flex-col items-center justify-center text-white border-4 border-white/20">
                  <Sparkles className="w-6 h-6 mb-1 animate-pulse" />
                  <span className="text-base md:text-lg font-bold text-center px-2 leading-tight">
                    {getDayTopic()}
                  </span>
                  <span className="text-xs opacity-80 mt-1">Day {day}</span>
                </div>
                {/* 장식 링 */}
                <div className="absolute inset-0 -m-3 rounded-full border-2 border-primary/30 animate-pulse" />
                <div className="absolute inset-0 -m-6 rounded-full border border-primary/20" />
              </div>
            </motion.div>

            {/* 한자 루트 노드들 */}
            {roots.map((root, index) => {
              const pos = nodePositions[index];
              if (!pos) return null;
              const color = NODE_COLORS[index % NODE_COLORS.length];
              const rootWords = getWordsForRoot(root.id);
              const masteredInRoot = rootWords.filter(w => masteredWords.has(w.id)).length;

              return (
                <motion.div
                  key={root.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 + index * 0.1, type: "spring", stiffness: 200, damping: 20 }}
                  className="absolute z-10"
                  style={{
                    left: `calc(50% + ${pos.x}px)`,
                    top: `calc(50% + ${pos.y}px)`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <motion.button
                    onClick={() => setSelectedRoot(root)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className={`relative w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br ${color.bg} shadow-xl hover:shadow-2xl transition-shadow flex flex-col items-center justify-center text-white group cursor-pointer`}
                  >
                    <span className="text-2xl md:text-3xl font-bold">{root.hanja}</span>
                    <span className="text-xs opacity-80">{root.reading_ko}</span>
                    
                    {/* 진행도 배지 */}
                    <div className="absolute -top-2 -right-2 bg-background text-foreground text-xs font-bold px-2 py-0.5 rounded-full shadow-md border">
                      {masteredInRoot}/{rootWords.length}
                    </div>
                    
                    {/* 호버 시 의미 표시 */}
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity text-xs text-foreground bg-background/90 backdrop-blur-sm px-2 py-1 rounded shadow-md">
                      {getRootMeaning(root)}
                    </div>
                  </motion.button>
                </motion.div>
              );
            })}
          </div>

          {/* 하단 네비게이션 */}
          <div className="flex items-center justify-between mt-8">
            <Button
              variant="outline"
              onClick={() => navigate(`/hanja-mindmap/${day - 1}`)}
              disabled={day <= 1}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              {t('hanjaMindmapDay.prevDay', '이전 Day')}
            </Button>

            <Button
              onClick={() => navigate(`/hanja-mindmap/${day + 1}`)}
              disabled={day >= 82}
            >
              {t('hanjaMindmapDay.nextDay', '다음 Day')}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </main>

      <AppFooter />

      {/* 루트 상세 모달 */}
      <Dialog open={!!selectedRoot} onOpenChange={(open) => !open && setSelectedRoot(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-auto">
          {selectedRoot && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${NODE_COLORS[roots.indexOf(selectedRoot) % NODE_COLORS.length].bg} flex flex-col items-center justify-center text-white`}>
                    <span className="text-xl font-bold">{selectedRoot.hanja}</span>
                    <span className="text-xs opacity-80">{selectedRoot.reading_ko}</span>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{getRootMeaning(selectedRoot)}</p>
                    <p className="text-sm text-muted-foreground">{selectedRoot.meaning_ko}</p>
                  </div>
                </DialogTitle>
              </DialogHeader>

              {/* 다국어 의미 */}
              <div className="p-3 bg-muted/50 rounded-lg mb-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span>🇬🇧</span>
                    <span>{selectedRoot.meaning_en || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>🇯🇵</span>
                    <span>{selectedRoot.meaning_ja || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>🇨🇳</span>
                    <span>{selectedRoot.meaning_zh || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>🇻🇳</span>
                    <span>{selectedRoot.meaning_vi || "-"}</span>
                  </div>
                </div>
              </div>

              {/* 단어 목록 */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                  {t('hanjaMindmapDay.relatedWords', '관련 단어')} ({getWordsForRoot(selectedRoot.id).length})
                </h4>
                {getWordsForRoot(selectedRoot.id).map((word) => {
                  const isMastered = masteredWords.has(word.id);
                  
                  return (
                    <motion.div
                      key={word.id}
                      whileHover={{ scale: 1.01 }}
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
                            {getWordMeaning(word)}
                          </p>
                        </div>
                      </div>
                      <Languages className="w-4 h-4 text-muted-foreground" />
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 단어 상세 모달 */}
      <Dialog open={!!selectedWord} onOpenChange={(open) => !open && setSelectedWord(null)}>
        <DialogContent className="max-w-sm">
          {selectedWord && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl flex items-center gap-2">
                  {selectedWord.word}
                  {masteredWords.has(selectedWord.id) && (
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  )}
                </DialogTitle>
              </DialogHeader>

              <Card className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🇰🇷</span>
                  <span className="text-foreground">{selectedWord.meaning_ko || "-"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🇬🇧</span>
                  <span className="text-foreground">{selectedWord.meaning_en || "-"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🇯🇵</span>
                  <span className="text-foreground">{selectedWord.meaning_ja || "-"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🇨🇳</span>
                  <span className="text-foreground">{selectedWord.meaning_zh || "-"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🇻🇳</span>
                  <span className="text-foreground">{selectedWord.meaning_vi || "-"}</span>
                </div>
              </Card>

              <Button
                onClick={() => toggleMastered(selectedWord.id)}
                className={`w-full ${masteredWords.has(selectedWord.id) ? "bg-muted text-foreground hover:bg-muted/80" : ""}`}
                variant={masteredWords.has(selectedWord.id) ? "outline" : "default"}
              >
                {masteredWords.has(selectedWord.id) 
                  ? t('hanjaMindmapDay.markUnmastered', '학습 완료 취소')
                  : t('hanjaMindmapDay.markMastered', '학습 완료')
                }
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
