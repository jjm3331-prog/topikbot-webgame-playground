import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  Trophy,
  Target,
  TrendingUp,
  TrendingDown,
  Brain,
  BookOpen,
  Headphones,
  PenTool,
  Clock,
  Star,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Calendar,
  ArrowLeft,
  Download,
  Share2,
  RefreshCw,
  Sparkles,
  BarChart3
} from "lucide-react";
import CleanHeader from "@/components/CleanHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Analysis {
  overallAnalysis: string;
  strengths: string[];
  weaknesses: string[];
  listeningAnalysis: string;
  readingAnalysis: string;
  writingAnalysis?: string;
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    category: string;
    advice: string;
  }>;
  studyPlan: {
    daily: string;
    weekly: string;
    focusAreas: string[];
  };
  motivationalMessage: string;
}

const MockExamReport = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [attempt, setAttempt] = useState<any>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [report, setReport] = useState<{
    predictedGrade: number;
    scores: { total: number; listening: number; reading: number };
    analysis: Analysis;
  } | null>(null);

  useEffect(() => {
    loadAttemptData();
  }, [attemptId]);

  const loadAttemptData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Load attempt
      const { data: attemptData, error: attemptError } = await supabase
        .from('mock_exam_attempts')
        .select('*')
        .eq('id', attemptId)
        .single();

      if (attemptError || !attemptData) {
        toast({ title: t('mockExam.error.notFound'), variant: "destructive" });
        navigate('/mock-exam');
        return;
      }

      setAttempt(attemptData);

      // Load answers
      const { data: answersData } = await supabase
        .from('mock_exam_answers')
        .select('*')
        .eq('attempt_id', attemptId);

      setAnswers(answersData || []);

      // Load questions
      const { data: questionsData } = await supabase
        .from('mock_question_bank')
        .select('*')
        .eq('exam_type', attemptData.exam_type)
        .eq('is_active', true);

      setQuestions(questionsData || []);
      setLoading(false);

      // Auto-generate report
      generateReport(attemptData, answersData || [], questionsData || []);

    } catch (error) {
      console.error('Load error:', error);
      setLoading(false);
    }
  };

  const generateReport = async (attemptData: any, answersData: any[], questionsData: any[]) => {
    setGenerating(true);

    try {
      const listeningQuestions = questionsData.filter(q => q.section === 'listening');
      const readingQuestions = questionsData.filter(q => q.section === 'reading');
      const writingQuestions = questionsData.filter(q => q.section === 'writing');

      const listeningAnswers = answersData.filter(a => {
        const q = questionsData.find(q => q.id === a.question_id);
        return q?.section === 'listening';
      });
      const readingAnswers = answersData.filter(a => {
        const q = questionsData.find(q => q.id === a.question_id);
        return q?.section === 'reading';
      });

      const wrongQuestions = answersData
        .filter(a => !a.is_correct)
        .map(a => {
          const q = questionsData.find(q => q.id === a.question_id);
          return {
            section: q?.section || '',
            partNumber: q?.part_number || 0,
            questionText: q?.question_text?.substring(0, 100) || '',
            userAnswer: a.user_answer,
            correctAnswer: q?.correct_answer || 0
          };
        });

      const examData = {
        examType: attemptData.exam_type,
        totalQuestions: attemptData.total_questions,
        correctCount: attemptData.correct_count,
        listeningCorrect: listeningAnswers.filter(a => a.is_correct).length,
        listeningTotal: listeningQuestions.length,
        readingCorrect: readingAnswers.filter(a => a.is_correct).length,
        readingTotal: readingQuestions.length,
        writingCount: writingQuestions.length > 0 ? answersData.filter(a => {
          const q = questionsData.find(q => q.id === a.question_id);
          return q?.section === 'writing' && a.text_answer;
        }).length : undefined,
        writingTotal: writingQuestions.length > 0 ? writingQuestions.length : undefined,
        timeTaken: attemptData.time_taken_seconds || 0,
        wrongQuestions
      };

      const { data, error } = await supabase.functions.invoke('mock-exam-report', {
        body: { examData, language: i18n.language }
      });

      if (error) throw error;

      setReport(data);

    } catch (error) {
      console.error('Report generation error:', error);
      toast({ title: "리포트 생성 중 오류가 발생했습니다", variant: "destructive" });
      
      // Fallback report
      const totalRate = Math.round((attemptData.correct_count / attemptData.total_questions) * 100);
      setReport({
        predictedGrade: totalRate >= 80 ? 2 : 1,
        scores: { total: totalRate, listening: 0, reading: 0 },
        analysis: {
          overallAnalysis: "리포트를 생성하는 중 오류가 발생했습니다. 다시 시도해주세요.",
          strengths: [],
          weaknesses: [],
          listeningAnalysis: "",
          readingAnalysis: "",
          recommendations: [],
          studyPlan: { daily: "", weekly: "", focusAreas: [] },
          motivationalMessage: ""
        }
      });
    } finally {
      setGenerating(false);
    }
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 5) return "from-yellow-400 to-amber-500";
    if (grade >= 3) return "from-blue-400 to-indigo-500";
    return "from-emerald-400 to-teal-500";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'medium': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      default: return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">결과 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CleanHeader />

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={() => navigate('/mock-exam')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            모의고사 허브
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/mock-exam/mistakes`)}>
              <BookOpen className="w-4 h-4 mr-2" />
              오답노트
            </Button>
          </div>
        </div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <Badge className="mb-4 bg-gradient-to-r from-primary to-purple-600 text-white border-0">
            <Sparkles className="w-3 h-3 mr-1" />
            AI 분석 리포트
          </Badge>
          <h1 className="text-3xl font-bold mb-2">{attempt?.exam_type?.replace('_', ' ')} 결과 분석</h1>
          <p className="text-muted-foreground">
            {new Date(attempt?.finished_at || attempt?.created_at).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </motion.div>

        {generating ? (
          <Card className="p-12 text-center">
            <Brain className="w-16 h-16 mx-auto mb-4 text-primary animate-pulse" />
            <h3 className="text-xl font-bold mb-2">AI가 결과를 분석하고 있습니다...</h3>
            <p className="text-muted-foreground">취약점과 학습 추천을 생성 중입니다</p>
          </Card>
        ) : report && (
          <>
            {/* Score Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
            >
              {/* Grade Card */}
              <Card className="md:col-span-1">
                <CardContent className="pt-6 text-center">
                  <div className={cn(
                    "w-24 h-24 mx-auto rounded-full bg-gradient-to-br flex items-center justify-center mb-4",
                    getGradeColor(report.predictedGrade)
                  )}>
                    <span className="text-4xl font-bold text-white">{report.predictedGrade}</span>
                  </div>
                  <h3 className="font-bold text-lg">예상 등급</h3>
                  <p className="text-sm text-muted-foreground">
                    {report.predictedGrade >= 5 ? '고급' : report.predictedGrade >= 3 ? '중급' : '초급'}
                  </p>
                </CardContent>
              </Card>

              {/* Score Cards */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-muted-foreground">총점</span>
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-3xl font-bold">{report.scores.total}%</p>
                  <Progress value={report.scores.total} className="mt-2" />
                  <p className="text-sm text-muted-foreground mt-1">
                    {attempt?.correct_count} / {attempt?.total_questions}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-muted-foreground">{t('mockExam.sections.listening')}</span>
                    <Headphones className="w-5 h-5 text-blue-500" />
                  </div>
                  <p className="text-3xl font-bold">{report.scores.listening}%</p>
                  <Progress value={report.scores.listening} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-muted-foreground">{t('mockExam.sections.reading')}</span>
                    <BookOpen className="w-5 h-5 text-emerald-500" />
                  </div>
                  <p className="text-3xl font-bold">{report.scores.reading}%</p>
                  <Progress value={report.scores.reading} className="mt-2" />
                </CardContent>
              </Card>
            </motion.div>

            {/* Detailed Analysis */}
            <Tabs defaultValue="analysis" className="mb-8">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="analysis">종합 분석</TabsTrigger>
                <TabsTrigger value="recommendations">학습 추천</TabsTrigger>
                <TabsTrigger value="plan">학습 계획</TabsTrigger>
              </TabsList>

              <TabsContent value="analysis" className="space-y-4 mt-4">
                {/* Overall Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-primary" />
                      종합 분석
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {report.analysis.overallAnalysis}
                    </p>
                  </CardContent>
                </Card>

                {/* Strengths & Weaknesses */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-green-500/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-green-600">
                        <TrendingUp className="w-5 h-5" />
                        강점
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {report.analysis.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                            <span className="text-sm">{s}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="border-red-500/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-red-600">
                        <TrendingDown className="w-5 h-5" />
                        약점
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {report.analysis.weaknesses.map((w, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500 mt-1 shrink-0" />
                            <span className="text-sm">{w}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                {/* Section Analysis */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2">
                        <Headphones className="w-5 h-5 text-blue-500" />
                        {t('mockExam.analysis.listening')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {report.analysis.listeningAnalysis}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-emerald-500" />
                        {t('mockExam.analysis.reading')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {report.analysis.readingAnalysis}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="recommendations" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-amber-500" />
                      맞춤 학습 추천
                    </CardTitle>
                    <CardDescription>AI가 분석한 취약점 기반 우선순위별 학습 가이드</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {report.analysis.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                        <Badge className={cn("shrink-0", getPriorityColor(rec.priority))}>
                          {rec.priority === 'high' ? '높음' : rec.priority === 'medium' ? '보통' : '낮음'}
                        </Badge>
                        <div>
                          <p className="font-medium mb-1">{rec.category}</p>
                          <p className="text-sm text-muted-foreground">{rec.advice}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="plan" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        일일 목표
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{report.analysis.studyPlan.daily}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-primary" />
                        주간 목표
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{report.analysis.studyPlan.weekly}</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>집중 학습 영역</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {report.analysis.studyPlan.focusAreas.map((area, i) => (
                        <Badge key={i} variant="secondary" className="text-sm py-1 px-3">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Motivational Message */}
                <Card className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/30">
                  <CardContent className="pt-6 text-center">
                    <Trophy className="w-12 h-12 mx-auto mb-4 text-primary" />
                    <p className="text-lg font-medium">{report.analysis.motivationalMessage}</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-center gap-4">
              <Button onClick={() => generateReport(attempt, answers, questions)}>
                <RefreshCw className="w-4 h-4 mr-2" />
                리포트 다시 생성
              </Button>
              <Button variant="outline" onClick={() => navigate('/mock-exam/mistakes')}>
                <BookOpen className="w-4 h-4 mr-2" />
                오답노트로 이동
              </Button>
              <Button variant="outline" onClick={() => navigate('/mock-exam')}>
                다시 도전하기
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default MockExamReport;
