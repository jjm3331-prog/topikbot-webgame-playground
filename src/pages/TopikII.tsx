import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import CategoryTabs, { LearningCategory } from "@/components/learning/CategoryTabs";
import LessonCard from "@/components/learning/LessonCard";
import ProgressStats from "@/components/learning/ProgressStats";
import LevelBadge from "@/components/learning/LevelBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, BookOpen, GraduationCap, AlertCircle, Crown } from "lucide-react";

interface LessonData {
  id: string;
  title: string;
  titleKo: string;
  description: string;
  duration: string;
  difficulty: "easy" | "medium" | "hard";
  level: number;
  category: LearningCategory;
}

// Sample lesson data for TOPIK II (Level 3-6)
const topik2Lessons: LessonData[] = [
  // Level 3 - Vocabulary
  { id: "v3-1", title: "Abstract Concepts", titleKo: "추상적 개념", description: "감정, 생각 등 추상적 어휘를 배웁니다.", duration: "25분", difficulty: "medium", level: 3, category: "vocabulary" },
  { id: "v3-2", title: "Social Activities", titleKo: "사회 활동", description: "직장, 학교 관련 어휘를 배웁니다.", duration: "25분", difficulty: "medium", level: 3, category: "vocabulary" },
  { id: "v3-3", title: "Korean Culture", titleKo: "한국 문화", description: "전통문화 관련 어휘를 익힙니다.", duration: "25분", difficulty: "medium", level: 3, category: "vocabulary" },
  { id: "v3-4", title: "Media & Technology", titleKo: "미디어와 기술", description: "현대 기술 관련 어휘를 배웁니다.", duration: "25분", difficulty: "medium", level: 3, category: "vocabulary" },
  
  // Level 3 - Grammar
  { id: "g3-1", title: "Connective Endings", titleKo: "연결 어미", description: "-고, -아서/어서, -(으)니까 등을 배웁니다.", duration: "30분", difficulty: "medium", level: 3, category: "grammar" },
  { id: "g3-2", title: "Honorific Expressions", titleKo: "존댓말 표현", description: "높임말과 겸양어를 배웁니다.", duration: "30분", difficulty: "medium", level: 3, category: "grammar" },
  { id: "g3-3", title: "Indirect Speech", titleKo: "간접화법", description: "-다고 하다, -냐고 하다 등을 배웁니다.", duration: "35분", difficulty: "hard", level: 3, category: "grammar" },
  
  // Level 3 - Reading
  { id: "r3-1", title: "News Articles", titleKo: "뉴스 기사 읽기", description: "간단한 뉴스 기사를 읽고 이해합니다.", duration: "25분", difficulty: "medium", level: 3, category: "reading" },
  { id: "r3-2", title: "Opinion Essays", titleKo: "의견문 읽기", description: "짧은 의견문을 읽고 논점을 파악합니다.", duration: "25분", difficulty: "medium", level: 3, category: "reading" },
  { id: "r3-3", title: "Practical Documents", titleKo: "실용문 읽기", description: "계약서, 안내문 등을 읽습니다.", duration: "25분", difficulty: "hard", level: 3, category: "reading" },
  
  // Level 3 - Listening
  { id: "l3-1", title: "Interviews", titleKo: "인터뷰 듣기", description: "인터뷰 내용을 듣고 이해합니다.", duration: "25분", difficulty: "medium", level: 3, category: "listening" },
  { id: "l3-2", title: "Lectures", titleKo: "강의 듣기", description: "짧은 강의를 듣고 내용을 파악합니다.", duration: "30분", difficulty: "hard", level: 3, category: "listening" },
  
  // Level 3 - Mock Test
  { id: "m3-1", title: "TOPIK II Mock Test 1", titleKo: "모의고사 1회", description: "TOPIK II 형식의 전체 모의고사입니다.", duration: "120분", difficulty: "hard", level: 3, category: "mock_test" },
  
  // Level 4 - Vocabulary
  { id: "v4-1", title: "Academic Vocabulary", titleKo: "학술 어휘", description: "학문 분야별 전문 어휘를 배웁니다.", duration: "30분", difficulty: "hard", level: 4, category: "vocabulary" },
  { id: "v4-2", title: "Idioms & Proverbs", titleKo: "관용어와 속담", description: "자주 사용되는 관용 표현을 배웁니다.", duration: "30분", difficulty: "hard", level: 4, category: "vocabulary" },
  { id: "v4-3", title: "Formal Expressions", titleKo: "격식체 표현", description: "공식적인 상황의 어휘를 익힙니다.", duration: "30분", difficulty: "hard", level: 4, category: "vocabulary" },
  
  // Level 4 - Grammar
  { id: "g4-1", title: "Complex Sentences", titleKo: "복문 구조", description: "복잡한 문장 구조를 배웁니다.", duration: "35분", difficulty: "hard", level: 4, category: "grammar" },
  { id: "g4-2", title: "Causative & Passive", titleKo: "사동과 피동", description: "사동사와 피동사를 배웁니다.", duration: "35분", difficulty: "hard", level: 4, category: "grammar" },
  
  // Level 4 - Reading
  { id: "r4-1", title: "Academic Texts", titleKo: "학술문 읽기", description: "학술적 글을 읽고 분석합니다.", duration: "30분", difficulty: "hard", level: 4, category: "reading" },
  { id: "r4-2", title: "Literary Works", titleKo: "문학 작품 읽기", description: "현대 한국 문학을 읽습니다.", duration: "30분", difficulty: "hard", level: 4, category: "reading" },
  
  // Level 4 - Listening
  { id: "l4-1", title: "Debates", titleKo: "토론 듣기", description: "토론 내용을 듣고 논점을 파악합니다.", duration: "30분", difficulty: "hard", level: 4, category: "listening" },
  { id: "l4-2", title: "Documentary", titleKo: "다큐멘터리 듣기", description: "다큐멘터리 나레이션을 듣습니다.", duration: "30분", difficulty: "hard", level: 4, category: "listening" },
  
  // Level 4 - Mock Test
  { id: "m4-1", title: "TOPIK II Mock Test 2", titleKo: "모의고사 2회", description: "TOPIK II 형식의 전체 모의고사입니다.", duration: "120분", difficulty: "hard", level: 4, category: "mock_test" },
  
  // Level 5 - Vocabulary
  { id: "v5-1", title: "Professional Terms", titleKo: "전문 용어", description: "각 분야 전문 용어를 배웁니다.", duration: "35분", difficulty: "hard", level: 5, category: "vocabulary" },
  { id: "v5-2", title: "Nuanced Expressions", titleKo: "뉘앙스 표현", description: "미묘한 의미 차이를 구분합니다.", duration: "35분", difficulty: "hard", level: 5, category: "vocabulary" },
  
  // Level 5 - Grammar
  { id: "g5-1", title: "Advanced Endings", titleKo: "고급 어미", description: "문어체 고급 어미를 배웁니다.", duration: "40분", difficulty: "hard", level: 5, category: "grammar" },
  { id: "g5-2", title: "Stylistic Variations", titleKo: "문체 변화", description: "다양한 문체를 구사합니다.", duration: "40분", difficulty: "hard", level: 5, category: "grammar" },
  
  // Level 5 - Reading
  { id: "r5-1", title: "Research Papers", titleKo: "연구 논문 읽기", description: "학술 논문을 읽고 이해합니다.", duration: "40분", difficulty: "hard", level: 5, category: "reading" },
  { id: "r5-2", title: "Critical Analysis", titleKo: "비평문 읽기", description: "비평문을 읽고 분석합니다.", duration: "40분", difficulty: "hard", level: 5, category: "reading" },
  
  // Level 5 - Listening
  { id: "l5-1", title: "Academic Seminars", titleKo: "학술 세미나 듣기", description: "세미나 발표를 듣고 이해합니다.", duration: "40분", difficulty: "hard", level: 5, category: "listening" },
  
  // Level 5 - Mock Test
  { id: "m5-1", title: "TOPIK II Mock Test 3", titleKo: "모의고사 3회", description: "TOPIK II 고급 모의고사입니다.", duration: "120분", difficulty: "hard", level: 5, category: "mock_test" },
  
  // Level 6 - Vocabulary
  { id: "v6-1", title: "Native-level Vocabulary", titleKo: "원어민 수준 어휘", description: "원어민 수준의 고급 어휘를 배웁니다.", duration: "40분", difficulty: "hard", level: 6, category: "vocabulary" },
  { id: "v6-2", title: "Classical Korean", titleKo: "고전 한국어", description: "고전 문헌의 어휘를 익힙니다.", duration: "40분", difficulty: "hard", level: 6, category: "vocabulary" },
  
  // Level 6 - Grammar
  { id: "g6-1", title: "Literary Grammar", titleKo: "문학적 문법", description: "문학 작품의 고급 문법을 배웁니다.", duration: "45분", difficulty: "hard", level: 6, category: "grammar" },
  
  // Level 6 - Reading
  { id: "r6-1", title: "Classical Literature", titleKo: "고전 문학 읽기", description: "한국 고전 문학을 읽습니다.", duration: "45분", difficulty: "hard", level: 6, category: "reading" },
  { id: "r6-2", title: "Complex Arguments", titleKo: "논증문 분석", description: "복잡한 논증 구조를 분석합니다.", duration: "45분", difficulty: "hard", level: 6, category: "reading" },
  
  // Level 6 - Listening
  { id: "l6-1", title: "Expert Discussions", titleKo: "전문가 토론 듣기", description: "전문적인 토론을 듣고 이해합니다.", duration: "45분", difficulty: "hard", level: 6, category: "listening" },
  
  // Level 6 - Mock Test
  { id: "m6-1", title: "TOPIK II Mock Test 4", titleKo: "모의고사 4회 (최고급)", description: "TOPIK II 최고급 모의고사입니다.", duration: "120분", difficulty: "hard", level: 6, category: "mock_test" },
];

const TopikII = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeLevel, setActiveLevel] = useState<string>("3");
  const [activeCategory, setActiveCategory] = useState<LearningCategory>("vocabulary");
  const [user, setUser] = useState<any>(null);
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        const { data, error } = await supabase
          .from("learning_progress")
          .select("*")
          .eq("user_id", user.id)
          .in("level", [3, 4, 5, 6]);
        
        if (!error && data) {
          setProgress(data);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const filteredLessons = topik2Lessons.filter(
    (lesson) =>
      lesson.level === parseInt(activeLevel) &&
      lesson.category === activeCategory
  );

  const getProgressForLesson = (lessonId: string) => {
    return progress.find((p) => p.lesson_id === lessonId);
  };

  const stats = {
    totalLessons: topik2Lessons.filter((l) => l.level === parseInt(activeLevel)).length,
    completedLessons: progress.filter((p) => p.level === parseInt(activeLevel) && p.completed).length,
    totalScore: progress.filter((p) => p.level === parseInt(activeLevel)).reduce((sum, p) => sum + (p.score || 0), 0),
    averageScore: progress.filter((p) => p.level === parseInt(activeLevel) && p.completed).length > 0
      ? Math.round(progress.filter((p) => p.level === parseInt(activeLevel) && p.completed).reduce((sum, p) => sum + (p.score || 0), 0) / progress.filter((p) => p.level === parseInt(activeLevel) && p.completed).length)
      : 0,
    totalTimeSpent: progress.filter((p) => p.level === parseInt(activeLevel)).reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0),
  };

  const handleLessonClick = (lesson: LessonData) => {
    // Auth check disabled for testing - allow access without login
    navigate(`/lesson/${lesson.id}?level=${lesson.level}&category=${lesson.category}&topik=2`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CleanHeader />
      
      <main className="flex-1 pb-24">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('topikPage.goBack')}
            </Button>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-korean-purple to-korean-pink flex items-center justify-center shadow-lg">
                <Crown className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">{t('topikPage.topik2.title')}</h1>
                <p className="text-muted-foreground">{t('topikPage.topik2.subtitle')}</p>
              </div>
            </div>

            {/* Info banner */}
            <div className="glass-card p-4 flex items-start gap-3 mb-6">
              <AlertCircle className="w-5 h-5 text-korean-purple shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-foreground font-medium">{t('topikPage.topik2.infoTitle')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('topikPage.topik2.infoDesc')}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Level Tabs */}
          <Tabs value={activeLevel} onValueChange={setActiveLevel} className="mb-6">
            <TabsList className="grid w-full max-w-2xl grid-cols-4">
              <TabsTrigger value="3" className="flex items-center gap-1 text-xs md:text-sm">
                <LevelBadge level={3} size="sm" />
                <span className="hidden md:inline">{t('topikPage.topik2.level3')}</span>
              </TabsTrigger>
              <TabsTrigger value="4" className="flex items-center gap-1 text-xs md:text-sm">
                <LevelBadge level={4} size="sm" />
                <span className="hidden md:inline">{t('topikPage.topik2.level4')}</span>
              </TabsTrigger>
              <TabsTrigger value="5" className="flex items-center gap-1 text-xs md:text-sm">
                <LevelBadge level={5} size="sm" />
                <span className="hidden md:inline">{t('topikPage.topik2.level5')}</span>
              </TabsTrigger>
              <TabsTrigger value="6" className="flex items-center gap-1 text-xs md:text-sm">
                <LevelBadge level={6} size="sm" />
                <span className="hidden md:inline">{t('topikPage.topik2.level6')}</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Progress Stats */}
          {user && <ProgressStats {...stats} className="mb-6" />}

          {/* Category Tabs */}
          <CategoryTabs
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            className="mb-6"
          />

          {/* Lessons Grid */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeLevel}-${activeCategory}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {filteredLessons.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredLessons.map((lesson, index) => {
                    const lessonProgress = getProgressForLesson(lesson.id);
                    return (
                      <LessonCard
                        key={lesson.id}
                        id={lesson.id}
                        title={lesson.title}
                        titleKo={lesson.titleKo}
                        description={lesson.description}
                        duration={lesson.duration}
                        difficulty={lesson.difficulty}
                        completed={lessonProgress?.completed || false}
                        locked={false}
                        score={lessonProgress?.score}
                        correctRate={
                          lessonProgress?.total_count > 0
                            ? Math.round((lessonProgress.correct_count / lessonProgress.total_count) * 100)
                            : undefined
                        }
                        onClick={() => handleLessonClick(lesson)}
                        index={index}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">이 카테고리에 아직 콘텐츠가 없습니다.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <AppFooter />
    </div>
  );
};

export default TopikII;
