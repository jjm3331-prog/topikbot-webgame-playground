import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
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
  ChevronLeft,
  ChevronRight,
  Check,
  Star,
  BookOpen,
  Trophy
} from "lucide-react";
import HangulTracing from "@/components/learning/HangulTracing";

type TabType = "consonants" | "words" | "sentences";

// Sample data for practice
const consonantsData = {
  basic: ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"],
  double: ["ㄲ", "ㄸ", "ㅃ", "ㅆ", "ㅉ"],
  vowels: ["ㅏ", "ㅑ", "ㅓ", "ㅕ", "ㅗ", "ㅛ", "ㅜ", "ㅠ", "ㅡ", "ㅣ"],
  compound: ["ㅐ", "ㅒ", "ㅔ", "ㅖ", "ㅘ", "ㅙ", "ㅚ", "ㅝ", "ㅞ", "ㅟ", "ㅢ"],
};

const wordsData = ["사랑", "감사", "한국", "친구", "행복", "가족", "음식", "학교", "서울", "안녕"];

const sentencesData = [
  "안녕하세요",
  "감사합니다", 
  "사랑해요",
  "만나서 반가워요",
  "한국어를 공부해요",
];

const HandwritingPractice = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>("consonants");
  const [completedTabs, setCompletedTabs] = useState<TabType[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkAuth();
  }, []);

  const getCurrentCharacters = () => {
    switch (activeTab) {
      case "consonants":
        return [...consonantsData.basic, ...consonantsData.vowels];
      case "words":
        return wordsData;
      case "sentences":
        return sentencesData;
      default:
        return consonantsData.basic;
    }
  };

  const handleTabComplete = (scores: number[]) => {
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    
    if (!completedTabs.includes(activeTab)) {
      setCompletedTabs(prev => [...prev, activeTab]);
    }
    
    toast({
      title: "Hoàn thành! 🎉",
      description: `Điểm trung bình: ${avg} điểm`,
    });
  };

  const tabConfig = [
    { 
      id: "consonants" as TabType, 
      label: "자음·모음", 
      sublabel: "Phụ âm & Nguyên âm",
      icon: Type,
      count: consonantsData.basic.length + consonantsData.vowels.length,
      color: "from-violet-500 to-purple-600"
    },
    { 
      id: "words" as TabType, 
      label: "단어", 
      sublabel: "Từ vựng",
      icon: BookOpen,
      count: wordsData.length,
      color: "from-blue-500 to-cyan-500"
    },
    { 
      id: "sentences" as TabType, 
      label: "문장", 
      sublabel: "Câu",
      icon: FileText,
      count: sentencesData.length,
      color: "from-emerald-500 to-teal-500"
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
              onClick={() => navigate("/dashboard")}
              className="mb-6 hover:bg-primary/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại
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
                    손글씨 연습
                  </motion.h1>
                  <motion.p 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-white/80 text-lg"
                  >
                    Luyện viết tay chữ Hàn
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
                  <span className="text-sm">{completedTabs.length}/3 Hoàn thành</span>
                </div>
                <div className="flex items-center gap-2 text-white/90">
                  <Star className="w-5 h-5" />
                  <span className="text-sm">Nội dung Premium</span>
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

                        {/* Count badge */}
                        <div className="mt-2 flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            isActive 
                              ? "bg-primary/20 text-primary" 
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {tab.count}개
                          </span>
                          
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
                                {activeTab === "consonants" && "자음·모음 따라쓰기 / Viết theo phụ âm·nguyên âm"}
                                {activeTab === "words" && "단어 따라쓰기 / Viết theo từ vựng"}
                                {activeTab === "sentences" && "문장 따라쓰기 / Viết theo câu"}
                              </h2>
                              <p className="text-sm text-muted-foreground">
                                Hãy viết trực tiếp trên canvas
                              </p>
                            </div>
                          </div>
                        </div>

                        <HangulTracing
                          characters={getCurrentCharacters()}
                          onComplete={handleTabComplete}
                        />
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
