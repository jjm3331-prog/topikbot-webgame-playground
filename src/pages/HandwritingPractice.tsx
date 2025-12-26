import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  PenTool,
  Type,
  FileText,
  Sparkles,
  RotateCcw,
  Check,
  Star,
  BookOpen,
  Trophy,
  RefreshCw,
  Loader2
} from "lucide-react";
import HangulTracing, { type CharacterItem } from "@/components/learning/HangulTracing";

type TabType = "consonants" | "words" | "sentences";

// Static data for consonants/vowels (these don't need RAG)
const consonantsData = {
  basic: ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"],
  double: ["ㄲ", "ㄸ", "ㅃ", "ㅆ", "ㅉ"],
  vowels: ["ㅏ", "ㅑ", "ㅓ", "ㅕ", "ㅗ", "ㅛ", "ㅜ", "ㅠ", "ㅡ", "ㅣ"],
  compound: ["ㅐ", "ㅒ", "ㅔ", "ㅖ", "ㅘ", "ㅙ", "ㅚ", "ㅝ", "ㅞ", "ㅟ", "ㅢ"],
};

// Fallback data with translations
const fallbackWords: CharacterItem[] = [
  { korean: "사랑", vietnamese: "Tình yêu" },
  { korean: "감사", vietnamese: "Cảm ơn" },
  { korean: "한국", vietnamese: "Hàn Quốc" },
  { korean: "친구", vietnamese: "Bạn bè" },
  { korean: "행복", vietnamese: "Hạnh phúc" },
  { korean: "가족", vietnamese: "Gia đình" },
  { korean: "음식", vietnamese: "Đồ ăn" },
  { korean: "학교", vietnamese: "Trường học" },
  { korean: "서울", vietnamese: "Seoul" },
  { korean: "안녕", vietnamese: "Xin chào" },
];

const fallbackSentences: CharacterItem[] = [
  { korean: "안녕하세요", vietnamese: "Xin chào" },
  { korean: "감사합니다", vietnamese: "Cảm ơn" },
  { korean: "사랑해요", vietnamese: "Yêu bạn" },
  { korean: "만나서 반가워요", vietnamese: "Rất vui được gặp bạn" },
  { korean: "한국어를 공부해요", vietnamese: "Tôi học tiếng Hàn" },
];

const HandwritingPractice = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>("consonants");
  const [completedTabs, setCompletedTabs] = useState<TabType[]>([]);
  
  // RAG-powered content states
  const [wordsData, setWordsData] = useState<CharacterItem[]>(fallbackWords);
  const [sentencesData, setSentencesData] = useState<CharacterItem[]>(fallbackSentences);
  const [isLoadingWords, setIsLoadingWords] = useState(false);
  const [isLoadingSentences, setIsLoadingSentences] = useState(false);
  const [usedWords, setUsedWords] = useState<string[]>([]);
  const [usedSentences, setUsedSentences] = useState<string[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkAuth();
  }, []);

  // Fetch RAG content for words/sentences
  const fetchRagContent = useCallback(async (type: 'words' | 'sentences', exclude: string[] = []) => {
    const setLoading = type === 'words' ? setIsLoadingWords : setIsLoadingSentences;
    const setData = type === 'words' ? setWordsData : setSentencesData;
    const setUsed = type === 'words' ? setUsedWords : setUsedSentences;
    const fallback = type === 'words' ? fallbackWords : fallbackSentences;
    
    setLoading(true);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handwriting-content`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            type, 
            count: type === 'words' ? 10 : 5,
            exclude 
          }),
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch content');
      
      const data = await response.json();
      
      if (data.success && data.content?.length > 0) {
        const contentItems: CharacterItem[] = data.content.map((item: { korean: string; vietnamese: string }) => ({
          korean: item.korean,
          vietnamese: item.vietnamese,
        }));
        setData(contentItems);
        
        // Track used content
        const koreanContent = contentItems.map(item => item.korean);
        setUsed(prev => [...new Set([...prev, ...koreanContent])]);
        
        if (data.source === 'rag') {
          toast({
            title: type === 'words' ? t("handwriting.wordsLoaded") : t("handwriting.sentencesLoaded"),
            description: t("handwriting.aiGenerated", { count: contentItems.length }),
          });
        }
      } else {
        setData(fallback);
      }
    } catch (error) {
      console.error('Error fetching RAG content:', error);
      setData(fallback);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Load initial content when tab changes
  useEffect(() => {
    if (activeTab === 'words' && wordsData === fallbackWords) {
      fetchRagContent('words', usedWords);
    } else if (activeTab === 'sentences' && sentencesData === fallbackSentences) {
      fetchRagContent('sentences', usedSentences);
    }
  }, [activeTab]);

  // Refresh content with new items
  const handleRefreshContent = () => {
    if (activeTab === 'words') {
      fetchRagContent('words', usedWords);
    } else if (activeTab === 'sentences') {
      fetchRagContent('sentences', usedSentences);
    }
  };

  const getCurrentCharacters = (): CharacterItem[] => {
    switch (activeTab) {
      case "consonants":
        // Convert consonants to CharacterItem format
        return [...consonantsData.basic, ...consonantsData.vowels].map(char => ({
          korean: char,
          vietnamese: undefined,
        }));
      case "words":
        return wordsData;
      case "sentences":
        return sentencesData;
      default:
        return consonantsData.basic.map(char => ({ korean: char }));
    }
  };

  const handleTabComplete = (scores: number[]) => {
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    
    if (!completedTabs.includes(activeTab)) {
      setCompletedTabs(prev => [...prev, activeTab]);
    }
    
    toast({
      title: t("handwriting.completed"),
      description: t("handwriting.averageScore", { score: avg }),
    });

    // Auto-refresh content after completion for words/sentences
    if (activeTab === 'words' || activeTab === 'sentences') {
      setTimeout(() => {
        fetchRagContent(activeTab, activeTab === 'words' ? usedWords : usedSentences);
      }, 2000);
    }
  };

  const isLoading = (activeTab === 'words' && isLoadingWords) || (activeTab === 'sentences' && isLoadingSentences);

  const tabConfig = [
    { 
      id: "consonants" as TabType, 
      label: t("handwriting.tabs.consonants"), 
      sublabel: t("handwriting.tabs.consonantsSub"),
      icon: Type,
      count: consonantsData.basic.length + consonantsData.vowels.length,
      color: "from-violet-500 to-purple-600"
    },
    { 
      id: "words" as TabType, 
      label: t("handwriting.tabs.words"), 
      sublabel: t("handwriting.tabs.wordsSub"),
      icon: BookOpen,
      count: wordsData.length,
      color: "from-blue-500 to-cyan-500",
      isRag: true
    },
    { 
      id: "sentences" as TabType, 
      label: t("handwriting.tabs.sentences"), 
      sublabel: t("handwriting.tabs.sentencesSub"),
      icon: FileText,
      count: sentencesData.length,
      color: "from-emerald-500 to-teal-500",
      isRag: true
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CleanHeader />
      
      <main className="flex-1 pb-24">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Premium Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-6"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/learning-hub")}
              className="mb-6 hover:bg-primary/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("common.back")}
            </Button>

            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-8 mb-8">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjIiLz48L2c+PC9zdmc+')] opacity-30" />
              
              <div className="relative z-10 flex items-center gap-6">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-2xl border border-white/30"
                >
                  <PenTool className="w-10 h-10 text-white" />
                </motion.div>
                <div>
                  <motion.h1 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-3xl sm:text-4xl font-bold text-white mb-2"
                  >
                    {t("handwriting.title")}
                  </motion.h1>
                  <motion.p 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-white/80 text-lg"
                  >
                    {t("handwriting.subtitle")}
                  </motion.p>
                </div>
              </div>

              {/* Stats */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="relative z-10 mt-6 flex gap-6"
              >
                <div className="flex items-center gap-2 text-white/90">
                  <Trophy className="w-5 h-5" />
                  <span className="text-sm">{t("handwriting.completedCount", { count: completedTabs.length })}</span>
                </div>
                <div className="flex items-center gap-2 text-white/90">
                  <Star className="w-5 h-5" />
                  <span className="text-sm">AI-Powered RAG</span>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Premium Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="w-full">
              {/* Custom Tab Cards */}
              <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
                {tabConfig.map((tab, index) => {
                  const isActive = activeTab === tab.id;
                  const isCompleted = completedTabs.includes(tab.id);
                  
                  return (
                    <motion.button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                      whileHover={{ scale: 1.02, y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      className={`relative p-4 sm:p-6 rounded-2xl border-2 transition-all duration-300 text-left overflow-hidden ${
                        isActive 
                          ? "border-primary bg-primary/5 shadow-xl shadow-primary/20" 
                          : "border-border bg-card hover:border-primary/50 hover:shadow-lg"
                      }`}
                    >
                      {/* Gradient overlay for active */}
                      {isActive && (
                        <motion.div
                          layoutId="activeTabBg"
                          className={`absolute inset-0 bg-gradient-to-br ${tab.color} opacity-5`}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                      )}

                      <div className="relative z-10">
                        {/* Icon */}
                        <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center mb-3 transition-all duration-300 ${
                          isActive 
                            ? `bg-gradient-to-br ${tab.color} shadow-lg` 
                            : "bg-muted"
                        }`}>
                          <tab.icon className={`w-6 h-6 sm:w-7 sm:h-7 ${isActive ? "text-white" : "text-muted-foreground"}`} />
                        </div>

                        {/* Label */}
                        <h3 className={`font-bold text-base sm:text-lg mb-0.5 ${isActive ? "text-foreground" : "text-foreground/80"}`}>
                          {tab.label}
                        </h3>
                        <p className="text-xs text-muted-foreground hidden sm:block">{tab.sublabel}</p>

                        <div className="mt-2 flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            isActive 
                              ? "bg-primary/20 text-primary" 
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {tab.count}{t("handwriting.count")}
                          </span>
                          
                          {/* RAG badge */}
                          {'isRag' in tab && tab.isRag && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium">
                              AI
                            </span>
                          )}
                          
                          {isCompleted && (
                            <span className="flex items-center gap-1 text-xs text-green-500">
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Completed indicator */}
                      {isCompleted && (
                        <div className="absolute top-3 right-3">
                          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <TabsContent value={activeTab} className="mt-0">
                    {/* Practice Card */}
                    <div className="relative rounded-3xl bg-gradient-to-b from-card to-card/50 border border-border/50 shadow-2xl overflow-hidden">
                      {/* Top accent */}
                      <div className={`h-1.5 bg-gradient-to-r ${tabConfig.find(t => t.id === activeTab)?.color}`} />
                      
                      <div className="p-6 sm:p-8">
                        {/* Info bar */}
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/50">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tabConfig.find(t => t.id === activeTab)?.color} flex items-center justify-center`}>
                              <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h2 className="font-bold text-foreground">
                                {activeTab === "consonants" && t("handwriting.practice.consonants")}
                                {activeTab === "words" && t("handwriting.practice.words")}
                                {activeTab === "sentences" && t("handwriting.practice.sentences")}
                              </h2>
                              <p className="text-sm text-muted-foreground">
                                {t("handwriting.practice.instruction")}
                              </p>
                            </div>
                          </div>
                          
                          {/* Refresh button for RAG content */}
                          {(activeTab === 'words' || activeTab === 'sentences') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleRefreshContent}
                              disabled={isLoading}
                              className="gap-2"
                            >
                              {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4" />
                              )}
                              <span className="hidden sm:inline">
                                {isLoading ? t("common.loading") : t("handwriting.newContent")}
                              </span>
                            </Button>
                          )}
                        </div>

                        {isLoading ? (
                          <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="w-10 h-10 animate-spin text-primary" />
                            <p className="text-muted-foreground">{t("handwriting.aiGenerating")}</p>
                          </div>
                        ) : (
                          <HangulTracing
                            characters={getCurrentCharacters()}
                            onComplete={handleTabComplete}
                          />
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </motion.div>
              </AnimatePresence>
            </Tabs>
          </motion.div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
};

export default HandwritingPractice;
