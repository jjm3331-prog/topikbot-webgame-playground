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
  CheckSquare,
  Lightbulb,
  BookX,
  Lock
} from "lucide-react";

// Import new module components
import FlashLoop from "@/components/vocabulary/FlashLoop";
import MiniCloze from "@/components/vocabulary/MiniCloze";
import OXSpeed from "@/components/vocabulary/OXSpeed";
import IdiomMaster from "@/components/vocabulary/IdiomMaster";
import MistakeNote from "@/components/vocabulary/MistakeNote";

// TOPIK level config
const topikLevelConfig = {
  1: { label: "1급", color: "from-green-400 to-emerald-500", desc: "입문" },
  2: { label: "2급", color: "from-green-500 to-teal-500", desc: "초급" },
  3: { label: "3급", color: "from-blue-400 to-cyan-500", desc: "중급I" },
  4: { label: "4급", color: "from-blue-500 to-indigo-500", desc: "중급II" },
  5: { label: "5급", color: "from-purple-500 to-violet-500", desc: "고급I" },
  6: { label: "6급", color: "from-purple-600 to-pink-500", desc: "고급II" },
};

type TopikLevel = keyof typeof topikLevelConfig;

// Module types
type ModuleType = "flash" | "cloze" | "ox" | "idiom" | "mistake";

const moduleConfig = [
  { 
    id: "flash" as ModuleType, 
    icon: Zap, 
    title: "Flash Loop", 
    desc: "3초 플래시 암기",
    color: "from-yellow-400 to-orange-500",
    premium: false
  },
  { 
    id: "cloze" as ModuleType, 
    icon: Brain, 
    title: "Mini Cloze", 
    desc: "빈칸 퀴즈",
    color: "from-purple-400 to-pink-500",
    premium: false
  },
  { 
    id: "ox" as ModuleType, 
    icon: CheckSquare, 
    title: "O/X Speed", 
    desc: "5초 문법 판별",
    color: "from-blue-400 to-cyan-500",
    premium: false
  },
  { 
    id: "idiom" as ModuleType, 
    icon: Lightbulb, 
    title: "Idiom Master", 
    desc: "관용표현 마스터",
    color: "from-amber-400 to-yellow-500",
    premium: false
  },
  { 
    id: "mistake" as ModuleType, 
    icon: BookX, 
    title: "실수 노트", 
    desc: "60초 강제 복습",
    color: "from-red-400 to-rose-500",
    premium: false
  },
];

const Vocabulary = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [activeModule, setActiveModule] = useState<ModuleType | null>(null);
  const [topikLevel, setTopikLevel] = useState<TopikLevel>(1);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkAuth();
  }, []);

  const handleMistake = async (item: any, type: string) => {
    if (!user) return;

    try {
      // Check if mistake already exists
      const { data: existing } = await supabase
        .from('user_mistakes')
        .select('id, mistake_count')
        .eq('user_id', user.id)
        .eq('item_type', type)
        .eq('item_id', item.id)
        .single();

      if (existing) {
        // Update mistake count
        await supabase
          .from('user_mistakes')
          .update({ 
            mistake_count: existing.mistake_count + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        // Create new mistake record
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
        return (
          <FlashLoop 
            level={topikLevel} 
            onMistake={(word) => handleMistake(word, 'vocabulary')}
          />
        );
      case "cloze":
        return (
          <MiniCloze 
            level={topikLevel}
            onMistake={(question) => handleMistake(question, 'cloze')}
          />
        );
      case "ox":
        return (
          <OXSpeed 
            level={topikLevel}
            onMistake={(question) => handleMistake(question, 'grammar_ox')}
          />
        );
      case "idiom":
        return (
          <IdiomMaster 
            level={topikLevel}
            onMistake={(idiom) => handleMistake(idiom, 'idiom')}
          />
        );
      case "mistake":
        return (
          <MistakeNote userId={user?.id} />
        );
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-6"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => activeModule ? setActiveModule(null) : navigate("/dashboard")}
              className="mb-6 hover:bg-primary/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {activeModule ? "모듈 선택" : t('common.back')}
            </Button>

            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-4 sm:p-6 md:p-8 mb-6 sm:mb-8">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjIiLz48L2c+PC9zdmc+')] opacity-30" />
              
              <div className="relative z-10 flex items-center gap-4 sm:gap-6">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-2xl border border-white/30 shrink-0"
                >
                  <BookOpen className="w-7 h-7 sm:w-10 sm:h-10 text-white" />
                </motion.div>
                <div className="min-w-0">
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="inline-flex items-center gap-2 px-2 sm:px-3 py-1 rounded-full bg-white/20 text-white text-[10px] sm:text-xs font-medium mb-2"
                  >
                    <Sparkles className="w-3 h-3" />
                    5개 학습 모듈
                  </motion.div>
                  <motion.h1 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1"
                  >
                    어휘 학습
                  </motion.h1>
                  <motion.p 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-white/80 text-sm sm:text-base"
                  >
                    TOPIK 급수별 체계적 어휘 학습
                  </motion.p>
                </div>
              </div>
            </div>

            {/* TOPIK Level Selection */}
            {!activeModule && (
              <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-3">TOPIK 급수 선택</p>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {(Object.keys(topikLevelConfig) as unknown as TopikLevel[]).map((level) => {
                    const numLevel = Number(level) as TopikLevel;
                    const config = topikLevelConfig[numLevel];
                    return (
                      <button
                        key={level}
                        onClick={() => setTopikLevel(numLevel)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all font-medium ${
                          topikLevel === numLevel
                            ? `bg-gradient-to-r ${config.color} text-white shadow-lg`
                            : "bg-muted hover:bg-muted/80 text-muted-foreground"
                        }`}
                      >
                        <span className="text-sm font-bold">{config.label}</span>
                        <span className="text-xs opacity-80">{config.desc}</span>
                      </button>
                    );
                  })}
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
                          <h2 className="font-bold text-lg">{module.title}</h2>
                          <p className="text-sm text-muted-foreground">TOPIK {topikLevel}급</p>
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
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {moduleConfig.map((module, idx) => {
                  const Icon = module.icon;
                  const isLocked = module.premium && !user;
                  
                  return (
                    <motion.button
                      key={module.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      onClick={() => !isLocked && setActiveModule(module.id)}
                      disabled={isLocked}
                      className={`relative overflow-hidden rounded-2xl bg-card border border-border p-6 text-left transition-all group ${
                        isLocked 
                          ? 'opacity-60 cursor-not-allowed' 
                          : 'hover:border-primary/50 hover:shadow-lg hover:-translate-y-1'
                      }`}
                    >
                      {/* Background Gradient */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${module.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                      
                      {/* Lock Badge */}
                      {isLocked && (
                        <div className="absolute top-3 right-3">
                          <Lock className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}

                      {/* Icon */}
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${module.color} flex items-center justify-center mb-4 shadow-lg`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>

                      {/* Content */}
                      <h3 className="text-lg font-bold mb-1">{module.title}</h3>
                      <p className="text-sm text-muted-foreground">{module.desc}</p>

                      {/* Arrow */}
                      <div className="absolute bottom-6 right-6 w-8 h-8 rounded-full bg-muted flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowLeft className="w-4 h-4 rotate-180" />
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      
      <AppFooter />
    </div>
  );
};

export default Vocabulary;
