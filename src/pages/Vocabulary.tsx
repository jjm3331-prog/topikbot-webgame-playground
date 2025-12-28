import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowLeft, 
  BookOpen,
  Sparkles,
  Zap,
  Brain,
  Shuffle,
  Puzzle,
  Globe
} from "lucide-react";
import { useVocabulary, VocabWord } from "@/hooks/useVocabulary";

// Import module components
import FlashLoop from "@/components/vocabulary/FlashLoop";
import MeaningMatch from "@/components/vocabulary/MeaningMatch";
import MiniCloze from "@/components/vocabulary/MiniCloze";
import SentenceBuilder from "@/components/vocabulary/SentenceBuilder";

// Module types - 4개 모듈만
type ModuleType = "flash" | "match" | "cloze" | "sentence";

// 모듈 설정: 암기 영역 2개 + 맥락 영역 2개
const moduleConfig = [
  { 
    id: "flash" as ModuleType, 
    icon: Zap, 
    title: "Flash Loop", 
    titleKo: "플래시 암기",
    desc: "3초 플래시카드로 빠른 암기",
    category: "암기",
    color: "from-yellow-400 to-orange-500",
  },
  { 
    id: "match" as ModuleType, 
    icon: Shuffle, 
    title: "Meaning Match", 
    titleKo: "뜻 매칭",
    desc: "한국어 ↔ 내 언어 매칭 게임",
    category: "암기",
    color: "from-pink-400 to-rose-500",
  },
  { 
    id: "cloze" as ModuleType, 
    icon: Brain, 
    title: "Mini Cloze", 
    titleKo: "빈칸 채우기",
    desc: "문맥 속 빈칸 퀴즈",
    category: "맥락",
    color: "from-purple-400 to-pink-500",
  },
  { 
    id: "sentence" as ModuleType, 
    icon: Puzzle, 
    title: "Sentence Builder", 
    titleKo: "문장 완성",
    desc: "조각을 맞춰 문장 만들기",
    category: "맥락",
    color: "from-cyan-400 to-blue-500",
  },
];

// 급수 그룹 설정
const levelGroups = [
  { levels: [1, 2], label: "1-2급", sublabel: "초급", color: "from-green-400 to-emerald-500" },
  { levels: [3, 4], label: "3-4급", sublabel: "중급", color: "from-blue-400 to-cyan-500" },
  { levels: [5, 6], label: "5-6급", sublabel: "고급", color: "from-purple-500 to-pink-500" },
];

const Vocabulary = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { languageLabels, getCurrentLanguage } = useVocabulary();
  const [user, setUser] = useState<any>(null);
  const [activeModule, setActiveModule] = useState<ModuleType | null>(null);
  const [selectedLevelGroup, setSelectedLevelGroup] = useState(0); // 0=초급, 1=중급, 2=고급
  const [selectedLevel, setSelectedLevel] = useState(1);

  const currentLang = getCurrentLanguage();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkAuth();
  }, []);

  // 급수 그룹 변경 시 첫 번째 레벨 선택
  useEffect(() => {
    setSelectedLevel(levelGroups[selectedLevelGroup].levels[0]);
  }, [selectedLevelGroup]);

  const handleMistake = async (item: any, type: string) => {
    if (!user) return;

    try {
      const { data: existing } = await supabase
        .from('user_mistakes')
        .select('id, mistake_count')
        .eq('user_id', user.id)
        .eq('item_type', type)
        .eq('item_id', item.id)
        .single();

      if (existing) {
        await supabase
          .from('user_mistakes')
          .update({ 
            mistake_count: existing.mistake_count + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('user_mistakes')
          .insert({
            user_id: user.id,
            item_type: type,
            item_id: item.id,
            item_data: item,
            mistake_count: 1
          });
      }
    } catch (error) {
      console.error('Error recording mistake:', error);
    }
  };

  const renderModuleContent = () => {
    switch (activeModule) {
      case "flash":
        return <FlashLoop level={selectedLevel} onMistake={(word) => handleMistake(word, 'vocabulary')} />;
      case "match":
        return <MeaningMatch level={selectedLevel} onMistake={(word) => handleMistake(word, 'vocabulary')} />;
      case "cloze":
        return <MiniCloze level={selectedLevel} onMistake={(q) => handleMistake(q, 'cloze')} />;
      case "sentence":
        return <SentenceBuilder level={selectedLevel} onMistake={(word) => handleMistake(word, 'vocabulary')} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CleanHeader />
      
      <main className="flex-1 pb-24">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => activeModule ? setActiveModule(null) : navigate("/dashboard")}
              className="mb-6 hover:bg-primary/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {activeModule ? "모듈 선택" : t('common.back')}
            </Button>

            {/* Hero Section - Premium Agency Grade Design */}
            <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl mb-8">
              {/* Premium Gradient Background with Glass Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900" />
              
              {/* Animated Gradient Orbs */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-cyan-500/20 to-blue-500/10 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
              <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-r from-pink-500/10 to-orange-500/10 rounded-full blur-2xl transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              
              {/* Grid Pattern Overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:44px_44px]" />
              
              {/* Content Container */}
              <div className="relative z-10 p-6 sm:p-8 md:p-10 lg:p-12">
                {/* Top Row - Badge + Language */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center gap-3"
                  >
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-white/90 text-xs sm:text-sm font-medium tracking-wide">TOPIK 공식 어휘 100% 수록</span>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 border border-white/10"
                  >
                    <Globe className="w-4 h-4 text-violet-300" />
                    <span className="text-white/90 text-sm font-medium">{languageLabels[currentLang]}</span>
                  </motion.div>
                </div>
                
                {/* Main Content */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 lg:gap-10">
                  {/* Icon Box */}
                  <motion.div 
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", delay: 0.2, stiffness: 200 }}
                    className="relative shrink-0"
                  >
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 p-0.5 shadow-2xl shadow-violet-500/30">
                      <div className="w-full h-full rounded-2xl sm:rounded-[22px] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center">
                        <BookOpen className="w-9 h-9 sm:w-12 sm:h-12 text-white" />
                      </div>
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                  </motion.div>
                  
                  {/* Text Content */}
                  <div className="flex-1 min-w-0">
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      className="mb-3"
                    >
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/30 mb-3">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-amber-200/90 text-xs sm:text-sm font-semibold tracking-wide">4개 학습 모듈 • 7개국 언어 지원</span>
                      </div>
                      <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-violet-200 leading-tight">
                        어휘 학습
                      </h1>
                    </motion.div>
                    
                    {/* Premium Description */}
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="relative mt-4 p-4 sm:p-5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10"
                    >
                      <div className="absolute -top-3 left-4 px-3 py-1 rounded-full bg-gradient-to-r from-red-500 to-rose-600 text-white text-[10px] sm:text-xs font-bold tracking-wider shadow-lg">
                        🇰🇷 MADE IN KOREA
                      </div>
                      <p className="text-white/80 text-sm sm:text-base leading-relaxed mt-2">
                        <span className="text-white font-bold">TOPIK의 심장, 한국에서.</span>{" "}
                        <span className="text-violet-200">출제위원급 한국 본사 연구진</span>이, TOPIK 주관 기관이 공식 발표한{" "}
                        <span className="text-amber-300 font-semibold">'출제 어휘 목록' 전체</span>를, 이 하나의 서비스에{" "}
                        <span className="text-emerald-300 font-bold">100% 완벽히</span> 담아냈습니다.
                      </p>
                      <p className="text-white/70 text-xs sm:text-sm mt-3 italic">
                        이것이 당신이 찾던 유일한 <span className="text-white font-semibold">'진짜' TOPIK AI 서비스</span>입니다.
                      </p>
                    </motion.div>
                  </div>
                </div>
                
                {/* Bottom Stats Bar */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex flex-wrap items-center gap-4 sm:gap-6 mt-6 pt-6 border-t border-white/10"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <span className="text-emerald-400 text-sm font-bold">✓</span>
                    </div>
                    <span className="text-white/70 text-xs sm:text-sm">10,435+ 어휘</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                      <span className="text-violet-400 text-sm font-bold">6</span>
                    </div>
                    <span className="text-white/70 text-xs sm:text-sm">TOPIK 급수</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <span className="text-amber-400 text-sm font-bold">7</span>
                    </div>
                    <span className="text-white/70 text-xs sm:text-sm">지원 언어</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
                      <span className="text-pink-400 text-sm font-bold">AI</span>
                    </div>
                    <span className="text-white/70 text-xs sm:text-sm">프리미엄 TTS</span>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Level Group Selection */}
            {!activeModule && (
              <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-3">TOPIK 급수 선택</p>
                <div className="flex gap-2 mb-4">
                  {levelGroups.map((group, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedLevelGroup(idx)}
                      className={`flex-1 px-4 py-3 rounded-xl transition-all font-medium ${
                        selectedLevelGroup === idx
                          ? `bg-gradient-to-r ${group.color} text-white shadow-lg`
                          : "bg-muted hover:bg-muted/80 text-muted-foreground"
                      }`}
                    >
                      <span className="text-sm font-bold">{group.label}</span>
                      <span className="block text-xs opacity-80">{group.sublabel}</span>
                    </button>
                  ))}
                </div>
                
                {/* Individual Level Selection */}
                <div className="flex gap-2">
                  {levelGroups[selectedLevelGroup].levels.map((level) => (
                    <button
                      key={level}
                      onClick={() => setSelectedLevel(level)}
                      className={`flex-1 px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                        selectedLevel === level
                          ? "bg-foreground text-background"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {level}급
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Module Content or Selection */}
          <AnimatePresence mode="wait">
            {activeModule ? (
              <motion.div
                key="module-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="rounded-2xl sm:rounded-3xl bg-card border border-border p-4 sm:p-6 md:p-8"
              >
                {/* Module Header */}
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                  {(() => {
                    const module = moduleConfig.find(m => m.id === activeModule);
                    if (!module) return null;
                    const Icon = module.icon;
                    return (
                      <>
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${module.color} flex items-center justify-center`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h2 className="font-bold text-lg">{module.titleKo}</h2>
                          <p className="text-sm text-muted-foreground">TOPIK {selectedLevel}급 • {languageLabels[currentLang]}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
                {renderModuleContent()}
              </motion.div>
            ) : (
              <motion.div
                key="module-selection"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {/* 암기 영역 */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    암기 영역
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {moduleConfig.filter(m => m.category === "암기").map((module, idx) => (
                      <ModuleCard key={module.id} module={module} onClick={() => setActiveModule(module.id)} delay={idx * 0.1} />
                    ))}
                  </div>
                </div>

                {/* 맥락 영역 */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-purple-500" />
                    맥락 영역
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {moduleConfig.filter(m => m.category === "맥락").map((module, idx) => (
                      <ModuleCard key={module.id} module={module} onClick={() => setActiveModule(module.id)} delay={idx * 0.1 + 0.2} />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      
      <AppFooter />
    </div>
  );
};

// Module Card Component
const ModuleCard = ({ module, onClick, delay }: { module: typeof moduleConfig[0]; onClick: () => void; delay: number }) => {
  const Icon = module.icon;
  
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={onClick}
      className="relative overflow-hidden rounded-2xl bg-card border border-border p-6 text-left transition-all group hover:border-primary/50 hover:shadow-lg hover:-translate-y-1"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${module.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${module.color} flex items-center justify-center mb-4 shadow-lg`}>
        <Icon className="w-7 h-7 text-white" />
      </div>
      <h3 className="text-lg font-bold mb-1">{module.titleKo}</h3>
      <p className="text-sm text-muted-foreground">{module.desc}</p>
      <div className="absolute bottom-6 right-6 w-8 h-8 rounded-full bg-muted flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowLeft className="w-4 h-4 rotate-180" />
      </div>
    </motion.button>
  );
};

export default Vocabulary;
