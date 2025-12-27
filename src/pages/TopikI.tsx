import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
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
import { ArrowLeft, BookOpen, GraduationCap, AlertCircle } from "lucide-react";

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

// Sample lesson data for TOPIK I (Level 1-2)
const topik1Lessons: LessonData[] = [
  // Level 1 - Vocabulary
  { id: "v1-1", title: "Basic Greetings", titleKo: "기본 인사말", description: "안녕하세요, 감사합니다 등 기본 인사 표현을 배웁니다.", duration: "15분", difficulty: "easy", level: 1, category: "vocabulary" },
  { id: "v1-2", title: "Numbers 1-100", titleKo: "숫자 1-100", description: "한국어 고유어 숫자와 한자어 숫자를 배웁니다.", duration: "20분", difficulty: "easy", level: 1, category: "vocabulary" },
  { id: "v1-3", title: "Family Members", titleKo: "가족 호칭", description: "가족 구성원을 한국어로 표현하는 방법을 배웁니다.", duration: "15분", difficulty: "easy", level: 1, category: "vocabulary" },
  { id: "v1-4", title: "Days & Time", titleKo: "요일과 시간", description: "요일, 시간 표현을 익힙니다.", duration: "20분", difficulty: "easy", level: 1, category: "vocabulary" },
  { id: "v1-5", title: "Colors & Shapes", titleKo: "색깔과 모양", description: "기본 색깔과 도형 표현을 배웁니다.", duration: "15분", difficulty: "easy", level: 1, category: "vocabulary" },
  
  // Level 1 - Grammar
  { id: "g1-1", title: "는/은 Topic Marker", titleKo: "은/는 주제 조사", description: "한국어의 기본 조사 은/는의 사용법을 배웁니다.", duration: "20분", difficulty: "easy", level: 1, category: "grammar" },
  { id: "g1-2", title: "이/가 Subject Marker", titleKo: "이/가 주격 조사", description: "주어를 나타내는 조사 이/가를 배웁니다.", duration: "20분", difficulty: "easy", level: 1, category: "grammar" },
  { id: "g1-3", title: "을/를 Object Marker", titleKo: "을/를 목적격 조사", description: "목적어를 나타내는 조사 을/를을 배웁니다.", duration: "20분", difficulty: "easy", level: 1, category: "grammar" },
  { id: "g1-4", title: "Basic Verb Endings", titleKo: "기본 동사 어미", description: "-아요/어요 형태의 기본 어미를 배웁니다.", duration: "25분", difficulty: "medium", level: 1, category: "grammar" },
  
  // Level 1 - Reading
  { id: "r1-1", title: "Simple Sentences", titleKo: "간단한 문장 읽기", description: "기초적인 한국어 문장을 읽고 이해합니다.", duration: "15분", difficulty: "easy", level: 1, category: "reading" },
  { id: "r1-2", title: "Short Dialogues", titleKo: "짧은 대화문", description: "일상적인 짧은 대화를 읽고 이해합니다.", duration: "20분", difficulty: "easy", level: 1, category: "reading" },
  { id: "r1-3", title: "Simple Signs", titleKo: "간판 읽기", description: "가게 간판, 표지판 등을 읽습니다.", duration: "15분", difficulty: "easy", level: 1, category: "reading" },
  
  // Level 1 - Listening
  { id: "l1-1", title: "Simple Greetings", titleKo: "인사말 듣기", description: "기본 인사말을 듣고 이해합니다.", duration: "15분", difficulty: "easy", level: 1, category: "listening" },
  { id: "l1-2", title: "Numbers Audio", titleKo: "숫자 듣기", description: "숫자를 듣고 받아쓰기합니다.", duration: "15분", difficulty: "easy", level: 1, category: "listening" },
  { id: "l1-3", title: "Short Conversations", titleKo: "짧은 대화 듣기", description: "일상 대화를 듣고 내용을 파악합니다.", duration: "20분", difficulty: "medium", level: 1, category: "listening" },
  
  // Level 1 - Mock Test
  { id: "m1-1", title: "TOPIK I Mock Test 1", titleKo: "모의고사 1회", description: "TOPIK I 형식의 전체 모의고사입니다.", duration: "60분", difficulty: "medium", level: 1, category: "mock_test" },
  { id: "m1-2", title: "TOPIK I Mock Test 2", titleKo: "모의고사 2회", description: "TOPIK I 형식의 전체 모의고사입니다.", duration: "60분", difficulty: "medium", level: 1, category: "mock_test" },
  
  // Level 2 - Vocabulary
  { id: "v2-1", title: "Daily Activities", titleKo: "일상 활동", description: "하루 일과 관련 어휘를 배웁니다.", duration: "20분", difficulty: "easy", level: 2, category: "vocabulary" },
  { id: "v2-2", title: "Food & Drinks", titleKo: "음식과 음료", description: "한국 음식과 음료 관련 어휘를 배웁니다.", duration: "20분", difficulty: "easy", level: 2, category: "vocabulary" },
  { id: "v2-3", title: "Shopping", titleKo: "쇼핑", description: "쇼핑 관련 표현과 어휘를 배웁니다.", duration: "20분", difficulty: "medium", level: 2, category: "vocabulary" },
  { id: "v2-4", title: "Transportation", titleKo: "교통수단", description: "대중교통 관련 어휘를 배웁니다.", duration: "20분", difficulty: "medium", level: 2, category: "vocabulary" },
  
  // Level 2 - Grammar
  { id: "g2-1", title: "Past Tense -았/었-", titleKo: "과거 시제", description: "과거 시제 표현을 배웁니다.", duration: "25분", difficulty: "medium", level: 2, category: "grammar" },
  { id: "g2-2", title: "Future Tense -(으)ㄹ 거예요", titleKo: "미래 시제", description: "미래 계획과 추측 표현을 배웁니다.", duration: "25분", difficulty: "medium", level: 2, category: "grammar" },
  { id: "g2-3", title: "Want to -고 싶다", titleKo: "희망 표현", description: "원하는 것을 표현하는 방법을 배웁니다.", duration: "20분", difficulty: "medium", level: 2, category: "grammar" },
  { id: "g2-4", title: "Can/Cannot -(으)ㄹ 수 있다/없다", titleKo: "가능/불가능 표현", description: "능력과 가능성을 표현합니다.", duration: "25분", difficulty: "medium", level: 2, category: "grammar" },
  
  // Level 2 - Reading
  { id: "r2-1", title: "Short Paragraphs", titleKo: "짧은 문단 읽기", description: "한 문단 분량의 글을 읽고 이해합니다.", duration: "20분", difficulty: "medium", level: 2, category: "reading" },
  { id: "r2-2", title: "Email Reading", titleKo: "이메일 읽기", description: "간단한 이메일을 읽고 내용을 파악합니다.", duration: "20분", difficulty: "medium", level: 2, category: "reading" },
  { id: "r2-3", title: "Announcements", titleKo: "안내문 읽기", description: "공공장소 안내문을 읽습니다.", duration: "20분", difficulty: "medium", level: 2, category: "reading" },
  
  // Level 2 - Listening
  { id: "l2-1", title: "Directions", titleKo: "길 안내 듣기", description: "길 찾기 대화를 듣고 이해합니다.", duration: "20분", difficulty: "medium", level: 2, category: "listening" },
  { id: "l2-2", title: "Phone Calls", titleKo: "전화 대화 듣기", description: "전화 통화를 듣고 내용을 파악합니다.", duration: "20분", difficulty: "medium", level: 2, category: "listening" },
  { id: "l2-3", title: "Public Announcements", titleKo: "안내 방송 듣기", description: "지하철, 버스 안내 방송을 듣습니다.", duration: "20분", difficulty: "medium", level: 2, category: "listening" },
  
  // Level 2 - Mock Test
  { id: "m2-1", title: "TOPIK I Mock Test 3", titleKo: "모의고사 3회", description: "TOPIK I 형식의 전체 모의고사입니다.", duration: "60분", difficulty: "medium", level: 2, category: "mock_test" },
  { id: "m2-2", title: "TOPIK I Mock Test 4", titleKo: "모의고사 4회", description: "TOPIK I 형식의 전체 모의고사입니다.", duration: "60분", difficulty: "hard", level: 2, category: "mock_test" },
];

const TopikI = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeLevel, setActiveLevel] = useState<string>("1");
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
          .in("level", [1, 2]);
        
        if (!error && data) {
          setProgress(data);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const filteredLessons = topik1Lessons.filter(
    (lesson) =>
      lesson.level === parseInt(activeLevel) &&
      lesson.category === activeCategory
  );

  const getProgressForLesson = (lessonId: string) => {
    return progress.find((p) => p.lesson_id === lessonId);
  };

  const stats = {
    totalLessons: topik1Lessons.filter((l) => l.level === parseInt(activeLevel)).length,
    completedLessons: progress.filter((p) => p.level === parseInt(activeLevel) && p.completed).length,
    totalScore: progress.filter((p) => p.level === parseInt(activeLevel)).reduce((sum, p) => sum + (p.score || 0), 0),
    averageScore: progress.filter((p) => p.level === parseInt(activeLevel) && p.completed).length > 0
      ? Math.round(progress.filter((p) => p.level === parseInt(activeLevel) && p.completed).reduce((sum, p) => sum + (p.score || 0), 0) / progress.filter((p) => p.level === parseInt(activeLevel) && p.completed).length)
      : 0,
    totalTimeSpent: progress.filter((p) => p.level === parseInt(activeLevel)).reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0),
  };

  const handleLessonClick = (lesson: LessonData) => {
    // Auth check disabled for testing - allow access without login
    navigate(`/lesson/${lesson.id}?level=${lesson.level}&category=${lesson.category}&topik=${lesson.level <= 2 ? "1" : "2"}`);
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
              돌아가기
            </Button>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-korean-green to-korean-cyan flex items-center justify-center shadow-lg">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">TOPIK I</h1>
                <p className="text-muted-foreground">한국어능력시험 초급 (1-2급)</p>
              </div>
            </div>

            {/* Info banner */}
            <div className="glass-card p-4 flex items-start gap-3 mb-6">
              <AlertCircle className="w-5 h-5 text-korean-blue shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-foreground font-medium">TOPIK I 학습 안내</p>
                <p className="text-sm text-muted-foreground">
                  TOPIK I은 1급과 2급으로 구성되며, 일상생활에 필요한 기초 한국어 능력을 평가합니다.
                  어휘, 문법, 읽기, 듣기 영역을 체계적으로 학습하세요.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Level Tabs */}
          <Tabs value={activeLevel} onValueChange={setActiveLevel} className="mb-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="1" className="flex items-center gap-2">
                <LevelBadge level={1} size="sm" />
                <span>1급 (초급)</span>
              </TabsTrigger>
              <TabsTrigger value="2" className="flex items-center gap-2">
                <LevelBadge level={2} size="sm" />
                <span>2급 (초급)</span>
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

export default TopikI;
