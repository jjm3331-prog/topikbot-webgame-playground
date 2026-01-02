import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { 
  ArrowLeft, Brain, Check, Crown, Target, BookOpen, Volume2,
  ChevronLeft, ChevronRight, Sparkles, Star, GraduationCap, Lightbulb
} from "lucide-react";
import { useTranslation } from "react-i18next";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
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
  definition_ko: string | null;
  definition_en: string | null;
  definition_ja: string | null;
  definition_zh: string | null;
  definition_vi: string | null;
  definition_ru: string | null;
  definition_uz: string | null;
  example_sentence: string | null;
  example_translation_en: string | null;
  example_translation_ja: string | null;
  example_translation_zh: string | null;
  example_translation_vi: string | null;
  example_translation_ru: string | null;
  example_translation_uz: string | null;
  display_order: number;
  root_id: string;
}

interface DayInfo {
  id: string;
  day_number: number;
  topic_ko: string;
  topic_en: string | null;
}

// 마인드맵 노드 색상 팔레트 - 더 세련된 그라데이션
const NODE_COLORS = [
  { 
    bg: "from-rose-500 via-pink-500 to-rose-600", 
    glow: "shadow-rose-500/50",
    border: "ring-rose-300/50",
    line: "#fb7185",
    accent: "bg-rose-100 text-rose-700"
  },
  { 
    bg: "from-amber-400 via-orange-500 to-amber-600", 
    glow: "shadow-amber-500/50",
    border: "ring-amber-300/50",
    line: "#fbbf24",
    accent: "bg-amber-100 text-amber-700"
  },
  { 
    bg: "from-emerald-400 via-teal-500 to-emerald-600", 
    glow: "shadow-emerald-500/50",
    border: "ring-emerald-300/50",
    line: "#34d399",
    accent: "bg-emerald-100 text-emerald-700"
  },
  { 
    bg: "from-blue-400 via-indigo-500 to-blue-600", 
    glow: "shadow-blue-500/50",
    border: "ring-blue-300/50",
    line: "#60a5fa",
    accent: "bg-blue-100 text-blue-700"
  },
  { 
    bg: "from-violet-400 via-purple-500 to-violet-600", 
    glow: "shadow-violet-500/50",
    border: "ring-violet-300/50",
    line: "#a78bfa",
    accent: "bg-violet-100 text-violet-700"
  },
  { 
    bg: "from-cyan-400 via-sky-500 to-cyan-600", 
    glow: "shadow-cyan-500/50",
    border: "ring-cyan-300/50",
    line: "#22d3ee",
    accent: "bg-cyan-100 text-cyan-700"
  },
  { 
    bg: "from-fuchsia-400 via-pink-500 to-fuchsia-600", 
    glow: "shadow-fuchsia-500/50",
    border: "ring-fuchsia-300/50",
    line: "#e879f9",
    accent: "bg-fuchsia-100 text-fuchsia-700"
  },
  { 
    bg: "from-lime-400 via-green-500 to-lime-600", 
    glow: "shadow-lime-500/50",
    border: "ring-lime-300/50",
    line: "#a3e635",
    accent: "bg-lime-100 text-lime-700"
  },
];

// 언어별 국기 이모지 매핑
const LANGUAGE_FLAGS: Record<string, string> = {
  ko: "🇰🇷",
  en: "🇬🇧",
  ja: "🇯🇵",
  zh: "🇨🇳",
  vi: "🇻🇳",
  ru: "🇷🇺",
  uz: "🇺🇿",
};

export default function HanjaMindmapDay() {
  const navigate = useNavigate();
  const { dayNumber } = useParams<{ dayNumber: string }>();
  const { isPremium, user } = useSubscription();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const isKorean = currentLang === 'ko';
  
  const [dayInfo, setDayInfo] = useState<DayInfo | null>(null);
  const [roots, setRoots] = useState<HanjaRoot[]>([]);
  const [words, setWords] = useState<Map<string, HanjaWord[]>>(new Map());
  const [selectedRoot, setSelectedRoot] = useState<HanjaRoot | null>(null);
  const [selectedWord, setSelectedWord] = useState<HanjaWord | null>(null);
  const [masteredWords, setMasteredWords] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [hoveredRoot, setHoveredRoot] = useState<string | null>(null);

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
        .maybeSingle();

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

      const safeRoots = rootsData ?? [];
      setRoots(safeRoots);

      // Avoid `.in()` with empty array (can cause non-2xx errors).
      if (safeRoots.length > 0) {
        const rootIds = safeRoots.map((r) => r.id);
        const { data: wordsData } = await supabase
          .from("hanja_words")
          .select("*")
          .in("root_id", rootIds)
          .order("display_order");

        const wordsMap = new Map<string, HanjaWord[]>();
        (wordsData ?? []).forEach((word) => {
          const existing = wordsMap.get(word.root_id) || [];
          existing.push(word as HanjaWord);
          wordsMap.set(word.root_id, existing);
        });
        setWords(wordsMap);
      } else {
        setWords(new Map());
      }

      if (user) {
        const { data: masteredData } = await supabase
          .from("hanja_mastered_words")
          .select("word_id")
          .eq("user_id", user.id);

        if (masteredData) {
          setMasteredWords(new Set(masteredData.map(m => m.word_id).filter(Boolean) as string[]));
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

  // 언어스위칭 100% 적용 - 한국어 + 사용자 언어만 표시
  const getRootMeaning = (root: HanjaRoot): string => {
    if (isKorean) return root.meaning_ko;
    switch(currentLang) {
      case 'en': return root.meaning_en || root.meaning_ko;
      case 'ja': return root.meaning_ja || root.meaning_ko;
      case 'zh': return root.meaning_zh || root.meaning_ko;
      case 'vi': return root.meaning_vi || root.meaning_ko;
      default: return root.meaning_en || root.meaning_ko;
    }
  };

  const getWordMeaning = (word: HanjaWord): string => {
    if (isKorean) return word.meaning_ko || '';
    switch(currentLang) {
      case 'en': return word.meaning_en || word.meaning_ko || '';
      case 'ja': return word.meaning_ja || word.meaning_ko || '';
      case 'zh': return word.meaning_zh || word.meaning_ko || '';
      case 'vi': return word.meaning_vi || word.meaning_ko || '';
      case 'ru': return word.meaning_en || word.meaning_ko || '';
      case 'uz': return word.meaning_en || word.meaning_ko || '';
      default: return word.meaning_en || word.meaning_ko || '';
    }
  };

  const getWordDefinition = (word: HanjaWord): string => {
    switch(currentLang) {
      case 'ko': return word.definition_ko || word.meaning_ko || '';
      case 'en': return word.definition_en || word.meaning_en || '';
      case 'ja': return word.definition_ja || word.meaning_ja || '';
      case 'zh': return word.definition_zh || word.meaning_zh || '';
      case 'vi': return word.definition_vi || word.meaning_vi || '';
      case 'ru': return word.definition_ru || word.definition_en || word.meaning_en || '';
      case 'uz': return word.definition_uz || word.definition_en || word.meaning_en || '';
      default: return word.definition_en || word.meaning_en || '';
    }
  };

  const getExampleTranslation = (word: HanjaWord): string => {
    switch(currentLang) {
      case 'en': return word.example_translation_en || '';
      case 'ja': return word.example_translation_ja || '';
      case 'zh': return word.example_translation_zh || '';
      case 'vi': return word.example_translation_vi || '';
      case 'ru': return word.example_translation_ru || '';
      case 'uz': return word.example_translation_uz || '';
      default: return word.example_translation_en || '';
    }
  };

  const getDayTopic = () => {
    if (isKorean) return dayInfo?.topic_ko || `Day ${day}`;
    return dayInfo?.topic_en || dayInfo?.topic_ko || `Day ${day}`;
  };

  const getCurrentLanguageName = (): string => {
    const names: Record<string, string> = {
      ko: "한국어",
      en: "English",
      ja: "日本語",
      zh: "中文",
      vi: "Tiếng Việt",
      ru: "Русский",
      uz: "O'zbek",
    };
    return names[currentLang] || "English";
  };

  // 마인드맵 노드 위치 계산 - 더 넓은 간격
  const calculateNodePositions = useCallback(() => {
    const positions: { x: number; y: number; angle: number }[] = [];
    const count = roots.length;
    const baseRadius = Math.min(280, window.innerWidth * 0.35);
    
    for (let i = 0; i < count; i++) {
      const angle = (i * 360 / count) - 90;
      const radians = (angle * Math.PI) / 180;
      // 약간의 불규칙성을 추가하여 더 자연스럽게
      const radiusVariation = 1 + (Math.sin(i * 1.5) * 0.1);
      const radius = baseRadius * radiusVariation;
      
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
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative">
            <Brain className="w-16 h-16 text-primary mx-auto" />
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-primary/30"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
          <p className="mt-6 text-lg text-muted-foreground font-medium">
            {t('hanjaMindmapDay.loading', 'Day {{day}} 로딩 중...', { day })}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CleanHeader />

      <main className="pt-20 pb-24">
        <div className="container max-w-7xl mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/hanja-mindmap")}
              className="mb-4 hover:bg-primary/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('hanjaMindmapDay.backToList', '목록으로')}
            </Button>

            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-gradient-to-r from-primary to-primary/70 text-primary-foreground text-sm px-3 py-1">
                    <GraduationCap className="w-3.5 h-3.5 mr-1.5" />
                    Day {String(day).padStart(2, "0")}
                  </Badge>
                  {!isPremium && (
                    <Badge className="bg-gradient-to-r from-korean-orange to-korean-pink text-white text-xs">
                      <Crown className="w-3 h-3 mr-1" />
                      Premium
                    </Badge>
                  )}
                </div>
                <h1 className="text-3xl md:text-4xl font-heading font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  {getDayTopic()}
                </h1>
                <p className="text-muted-foreground mt-1 flex items-center gap-2">
                  <span>{LANGUAGE_FLAGS[currentLang] || "🌐"}</span>
                  <span>{getCurrentLanguageName()}</span>
                </p>
              </div>

              {/* Progress Card */}
              <Card className="px-5 py-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-primary/20">
                    <Target className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">
                      {masteredCount} / {totalWords}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('hanjaMindmapDay.wordsLearned', '단어 학습 완료')}
                    </p>
                    <div className="w-32 h-2.5 bg-muted rounded-full overflow-hidden mt-2">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </motion.div>

          {/* 마인드맵 시각화 - 개선된 버전 */}
          {roots.length === 0 ? (
            <Card className="p-8 md:p-10 text-center bg-gradient-to-br from-muted/40 to-muted/20 border-border/60">
              <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Lightbulb className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-xl font-heading font-bold text-foreground">
                {t("hanjaMindmapDay.empty.title", "이 Day는 아직 준비 중입니다")}
              </h2>
              <p className="mt-2 text-muted-foreground">
                {t("hanjaMindmapDay.empty.desc", "다른 Day를 먼저 학습해 주세요.")}
              </p>
            </Card>
          ) : (
            <div className="relative w-full aspect-square max-w-[800px] mx-auto my-8 md:my-12">
              {/* 배경 장식 */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 rounded-3xl" />

              {/* SVG 연결선 - 곡선으로 개선 */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 800 800">
                <defs>
                  {roots.map((root, index) => (
                    <linearGradient
                      key={`gradient-${root.id}`}
                      id={`line-gradient-${index}`}
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="0%"
                    >
                      <stop offset="0%" stopColor={NODE_COLORS[index % NODE_COLORS.length].line} stopOpacity="0.3" />
                      <stop offset="50%" stopColor={NODE_COLORS[index % NODE_COLORS.length].line} stopOpacity="0.8" />
                      <stop offset="100%" stopColor={NODE_COLORS[index % NODE_COLORS.length].line} stopOpacity="0.3" />
                    </linearGradient>
                  ))}
                </defs>

                {roots.map((root, index) => {
                  const pos = nodePositions[index];
                  if (!pos) return null;
                  const isHovered = hoveredRoot === root.id;

                  // 베지어 곡선 제어점 계산
                  const startX = 400;
                  const startY = 400;
                  const endX = 400 + pos.x;
                  const endY = 400 + pos.y;
                  const midX = (startX + endX) / 2;
                  const midY = (startY + endY) / 2;
                  // 곡선 효과를 위한 제어점
                  const controlOffset = 30;
                  const controlX = midX + controlOffset * Math.sin((pos.angle * Math.PI) / 180);
                  const controlY = midY - controlOffset * Math.cos((pos.angle * Math.PI) / 180);

                  return (
                    <motion.path
                      key={`line-${root.id}`}
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{
                        pathLength: 1,
                        opacity: isHovered ? 1 : 0.6,
                        strokeWidth: isHovered ? 4 : 2.5,
                      }}
                      transition={{ delay: 0.3 + index * 0.08, duration: 0.6 }}
                      d={`M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`}
                      stroke={`url(#line-gradient-${index})`}
                      strokeWidth="2.5"
                      fill="none"
                      strokeLinecap="round"
                    />
                  );
                })}
              </svg>

              {/* 중앙 노드 (주제) - 더 화려하게 */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 150, damping: 15, delay: 0.2 }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
              >
                <div className="relative group">
                  {/* 외부 글로우 효과 */}
                  <div className="absolute inset-0 -m-4 rounded-full bg-gradient-to-br from-primary/20 to-korean-pink/20 blur-xl animate-pulse" />

                  {/* 메인 노드 */}
                  <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-full bg-gradient-to-br from-primary via-korean-orange to-korean-pink shadow-2xl shadow-primary/40 flex flex-col items-center justify-center text-white border-4 border-white/30 group-hover:scale-105 transition-transform duration-300">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 rounded-full border-2 border-dashed border-white/20"
                    />
                    <Sparkles className="w-7 h-7 mb-2 animate-pulse" />
                    <span className="text-lg md:text-xl font-bold text-center px-4 leading-tight drop-shadow-lg">
                      {getDayTopic()}
                    </span>
                    <Badge className="mt-2 bg-white/20 text-white border-0 text-xs">Day {day}</Badge>
                  </div>

                  {/* 장식 링들 */}
                  <motion.div
                    className="absolute inset-0 -m-6 rounded-full border-2 border-primary/20"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />
                  <motion.div
                    className="absolute inset-0 -m-10 rounded-full border border-primary/10"
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
                  />
                </div>
              </motion.div>

              {/* 한자 루트 노드들 - 더 세련되게 */}
              {roots.map((root, index) => {
                const pos = nodePositions[index];
                if (!pos) return null;
                const color = NODE_COLORS[index % NODE_COLORS.length];
                const rootWords = getWordsForRoot(root.id);
                const masteredInRoot = rootWords.filter((w) => masteredWords.has(w.id)).length;
                const isComplete = masteredInRoot === rootWords.length && rootWords.length > 0;

                return (
                  <motion.div
                    key={root.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.4 + index * 0.08, type: "spring", stiffness: 150, damping: 15 }}
                    className="absolute z-10"
                    style={{
                      left: `calc(50% + ${pos.x}px)`,
                      top: `calc(50% + ${pos.y}px)`,
                      transform: "translate(-50%, -50%)",
                    }}
                    onMouseEnter={() => setHoveredRoot(root.id)}
                    onMouseLeave={() => setHoveredRoot(null)}
                  >
                    <motion.button
                      onClick={() => setSelectedRoot(root)}
                      whileHover={{ scale: 1.15, rotate: [0, -2, 2, 0] }}
                      whileTap={{ scale: 0.95 }}
                      className="relative group cursor-pointer"
                    >
                      {/* 글로우 효과 */}
                      <div
                        className={`absolute inset-0 -m-2 rounded-2xl bg-gradient-to-br ${color.bg} opacity-30 blur-lg group-hover:opacity-50 transition-opacity`}
                      />

                      {/* 메인 카드 */}
                      <div
                        className={`relative w-22 h-22 md:w-28 md:h-28 rounded-2xl bg-gradient-to-br ${color.bg} shadow-xl ${color.glow} shadow-lg ring-2 ${color.border} flex flex-col items-center justify-center text-white overflow-hidden`}
                      >
                        {/* 배경 패턴 */}
                        <div className="absolute inset-0 opacity-10">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-white/20 rounded-full -translate-y-1/2 translate-x-1/2" />
                          <div className="absolute bottom-0 left-0 w-12 h-12 bg-white/20 rounded-full translate-y-1/2 -translate-x-1/2" />
                        </div>

                        <span className="text-3xl md:text-4xl font-bold drop-shadow-lg relative z-10">{root.hanja}</span>
                        <span className="text-xs md:text-sm opacity-90 mt-0.5 relative z-10">{root.reading_ko}</span>

                        {/* 완료 표시 */}
                        {isComplete && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white"
                          >
                            <Check className="w-3.5 h-3.5 text-white" />
                          </motion.div>
                        )}
                      </div>

                      {/* 진행도 배지 */}
                      <div
                        className={`absolute -bottom-2 left-1/2 -translate-x-1/2 ${color.accent} text-xs font-bold px-2.5 py-1 rounded-full shadow-md whitespace-nowrap`}
                      >
                        {masteredInRoot}/{rootWords.length}
                      </div>

                      {/* 호버 시 의미 표시 */}
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        whileHover={{ opacity: 1, y: 0 }}
                        className="absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap text-sm font-medium text-foreground bg-background/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-lg border pointer-events-none"
                      >
                        {getRootMeaning(root)}
                      </motion.div>
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* 하단 네비게이션 */}
          <div className="flex items-center justify-between mt-8 max-w-md mx-auto">
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate(`/hanja-mindmap/${day - 1}`)}
              disabled={day <= 1}
              className="gap-2"
            >
              <ChevronLeft className="w-5 h-5" />
              {t('hanjaMindmapDay.prevDay', '이전 Day')}
            </Button>

            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{progress}%</p>
              <p className="text-xs text-muted-foreground">{t('hanjaMindmapDay.complete', '완료')}</p>
            </div>

            <Button
              size="lg"
              onClick={() => navigate(`/hanja-mindmap/${day + 1}`)}
              disabled={day >= 82}
              className="gap-2"
            >
              {t('hanjaMindmapDay.nextDay', '다음 Day')}
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </main>

      <AppFooter />

      {/* 루트 상세 모달 - 최고급 UX/UI 적용 */}
      <AnimatePresence>
        {selectedRoot && (
          <Dialog open={!!selectedRoot} onOpenChange={(open) => !open && setSelectedRoot(null)}>
            <DialogContent className="w-[95vw] max-w-lg p-0 overflow-hidden bg-card border-border/50 shadow-2xl rounded-2xl max-h-[85vh] flex flex-col">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="flex flex-col h-full"
              >
                {/* 헤더 - 고정 */}
                <div className={`p-4 sm:p-6 bg-gradient-to-br ${NODE_COLORS[roots.indexOf(selectedRoot) % NODE_COLORS.length].bg} text-white flex-shrink-0`}>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-2xl sm:text-3xl font-bold">{selectedRoot.hanja}</span>
                      <span className="text-xs sm:text-sm opacity-90">{selectedRoot.reading_ko}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl sm:text-2xl font-bold truncate">{getRootMeaning(selectedRoot)}</h2>
                      {!isKorean && (
                        <p className="text-white/80 text-xs sm:text-sm mt-1 truncate">
                          {LANGUAGE_FLAGS.ko} {selectedRoot.meaning_ko}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 스크롤 가능한 단어 목록 */}
                <div className="flex-1 overflow-y-auto overscroll-contain">
                  <div className="p-4 sm:p-6">
                    <div className="space-y-3">
                      <h4 className="font-bold text-foreground flex items-center gap-2 text-sm sm:text-base sticky top-0 bg-card py-2 -mt-2">
                        <BookOpen className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>{t('hanjaMindmapDay.relatedWords', '관련 단어')}</span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {getWordsForRoot(selectedRoot.id).length}
                        </Badge>
                      </h4>
                      
                      <div className="space-y-2">
                        {getWordsForRoot(selectedRoot.id).map((word) => {
                          const isMastered = masteredWords.has(word.id);
                          
                          return (
                            <motion.div
                              key={word.id}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              className={`p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all active:scale-[0.98] ${
                                isMastered 
                                  ? "bg-primary/10 border-primary/30" 
                                  : "bg-card border-border hover:border-primary/50 hover:shadow-md"
                              }`}
                              onClick={() => setSelectedWord(word)}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleMastered(word.id);
                                    }}
                                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                                      isMastered 
                                        ? "bg-primary border-primary text-white" 
                                        : "border-muted-foreground/30 hover:border-primary"
                                    }`}
                                  >
                                    {isMastered && <Check className="w-3 h-3 sm:w-4 sm:h-4" />}
                                  </button>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-bold text-base sm:text-lg text-foreground truncate">{word.word}</p>
                                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                      {getWordMeaning(word)}
                                    </p>
                                  </div>
                                </div>
                                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0" />
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* 단어 상세 모달 - 최고급 UX/UI 적용 */}
      <AnimatePresence>
        {selectedWord && (
          <Dialog open={!!selectedWord} onOpenChange={(open) => !open && setSelectedWord(null)}>
            <DialogContent className="w-[95vw] max-w-lg p-0 overflow-hidden bg-card border-border/50 shadow-2xl rounded-2xl max-h-[90vh] flex flex-col">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col h-full"
              >
                {/* 헤더 - 고정 */}
                <div className="p-4 sm:p-6 bg-gradient-to-br from-primary/15 via-primary/10 to-secondary/10 border-b border-border/50 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-primary/20 flex items-center justify-center">
                      <span className="text-2xl sm:text-3xl font-bold text-primary">{selectedWord.word}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2 truncate">
                        {selectedWord.word}
                        {masteredWords.has(selectedWord.id) && (
                          <Star className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                        )}
                      </h2>
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">
                        {getWordMeaning(selectedWord)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 스크롤 가능한 컨텐츠 영역 */}
                <div className="flex-1 overflow-y-auto overscroll-contain">
                  <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                    {/* 한국어 의미 */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-primary uppercase tracking-wider">
                        <span className="text-base">{LANGUAGE_FLAGS.ko}</span>
                        <span>한국어</span>
                      </div>
                      <div className="p-3 sm:p-4 rounded-xl bg-muted/50 border border-border/50">
                        <p className="text-base sm:text-lg text-foreground font-medium leading-relaxed">
                          {selectedWord.definition_ko || selectedWord.meaning_ko || "-"}
                        </p>
                      </div>
                    </div>

                    {/* 사용자 언어 의미 (한국어가 아닌 경우) */}
                    {!isKorean && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-primary uppercase tracking-wider">
                          <span className="text-base">{LANGUAGE_FLAGS[currentLang] || "🌐"}</span>
                          <span>{getCurrentLanguageName()}</span>
                        </div>
                        <div className="p-3 sm:p-4 rounded-xl bg-primary/5 border border-primary/20">
                          <p className="text-base sm:text-lg text-foreground font-medium leading-relaxed">
                            {getWordDefinition(selectedWord) || getWordMeaning(selectedWord) || "-"}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* 예문 섹션 */}
                    {selectedWord.example_sentence && (
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                          <Lightbulb className="w-4 h-4" />
                          <span>{t('hanjaMindmapDay.exampleSentence', '예문')}</span>
                        </div>
                        
                        {/* 한국어 예문 */}
                        <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/50 dark:border-amber-800/50">
                          <div className="flex items-start gap-2 sm:gap-3">
                            <span className="text-base sm:text-lg flex-shrink-0 mt-0.5">{LANGUAGE_FLAGS.ko}</span>
                            <p className="text-sm sm:text-base text-foreground font-medium leading-relaxed break-words">
                              {selectedWord.example_sentence}
                            </p>
                          </div>
                        </div>
                        
                        {/* 번역된 예문 (한국어가 아닌 경우) */}
                        {!isKorean && getExampleTranslation(selectedWord) && (
                          <div className="p-3 sm:p-4 rounded-xl bg-muted/50 border border-border/50">
                            <div className="flex items-start gap-2 sm:gap-3">
                              <span className="text-base sm:text-lg flex-shrink-0 mt-0.5">{LANGUAGE_FLAGS[currentLang] || "🌐"}</span>
                              <p className="text-sm sm:text-base text-foreground leading-relaxed break-words">
                                {getExampleTranslation(selectedWord)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 예문이 없는 경우 안내 */}
                    {!selectedWord.example_sentence && (
                      <div className="text-center py-6 sm:py-8">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center">
                          <Lightbulb className="w-6 h-6 sm:w-7 sm:h-7 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {t('hanjaMindmapDay.noExample', '예문이 아직 준비되지 않았습니다.')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 하단 버튼 - 고정 */}
                <div className="p-4 border-t border-border/50 bg-card flex-shrink-0">
                  <Button
                    onClick={() => toggleMastered(selectedWord.id)}
                    className={`w-full h-11 sm:h-12 text-sm sm:text-base font-semibold rounded-xl transition-all ${
                      masteredWords.has(selectedWord.id) 
                        ? "bg-muted hover:bg-muted/80 text-muted-foreground" 
                        : "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg shadow-primary/25"
                    }`}
                    variant={masteredWords.has(selectedWord.id) ? "outline" : "default"}
                  >
                    {masteredWords.has(selectedWord.id) ? (
                      <>
                        <Check className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                        {t('hanjaMindmapDay.markUnmastered', '학습 완료 취소')}
                      </>
                    ) : (
                      <>
                        <Star className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                        {t('hanjaMindmapDay.markMastered', '학습 완료')}
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}
