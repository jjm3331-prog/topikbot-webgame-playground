import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Headphones,
  PenTool,
  CheckCircle2,
  X,
  RotateCcw,
  Trash2,
  Filter,
  Search,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Star,
  Clock,
  TrendingUp,
  Target
} from "lucide-react";
import CleanHeader from "@/components/CleanHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Mistake {
  id: string;
  question_id: string;
  attempt_id: string;
  mastered: boolean;
  review_count: number;
  last_reviewed: string | null;
  next_review: string | null;
  question: {
    id: string;
    question_text: string;
    options: string[];
    correct_answer: number;
    section: string;
    part_number: number;
    exam_type: string;
    explanation_ko?: string;
    explanation_vi?: string;
    explanation_en?: string;
  };
  userAnswer?: number;
}

const MockExamMistakes = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [filteredMistakes, setFilteredMistakes] = useState<Mistake[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [reviewMode, setReviewMode] = useState(false);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    loadMistakes();
  }, []);

  useEffect(() => {
    filterMistakes();
  }, [mistakes, searchQuery, sectionFilter, statusFilter]);

  const loadMistakes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: mistakesData, error } = await supabase
        .from('mock_exam_mistakes')
        .select(`
          *,
          question:mock_question_bank(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform and get user answers
      const mistakesWithAnswers = await Promise.all(
        (mistakesData || []).map(async (m: any) => {
          // Transform question options to string array
          const question = m.question ? {
            ...m.question,
            options: Array.isArray(m.question.options) ? m.question.options as string[] : []
          } : null;
          
          let userAnswer: number | undefined;
          if (m.attempt_id) {
            const { data: answerData } = await supabase
              .from('mock_exam_answers')
              .select('user_answer')
              .eq('attempt_id', m.attempt_id)
              .eq('question_id', m.question_id)
              .single();
            userAnswer = answerData?.user_answer ?? undefined;
          }
          
          return { 
            ...m, 
            question,
            userAnswer 
          } as Mistake;
        })
      );

      setMistakes(mistakesWithAnswers);
      setLoading(false);
    } catch (error) {
      console.error('Load mistakes error:', error);
      toast({ title: t("mockExam.mistakes.loadError"), variant: "destructive" });
      setLoading(false);
    }
  };

  const filterMistakes = () => {
    let filtered = [...mistakes];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.question?.question_text?.toLowerCase().includes(query)
      );
    }

    if (sectionFilter !== 'all') {
      filtered = filtered.filter(m => m.question?.section === sectionFilter);
    }

    if (statusFilter === 'mastered') {
      filtered = filtered.filter(m => m.mastered);
    } else if (statusFilter === 'unmastered') {
      filtered = filtered.filter(m => !m.mastered);
    } else if (statusFilter === 'review') {
      filtered = filtered.filter(m => 
        m.next_review && new Date(m.next_review) <= new Date()
      );
    }

    setFilteredMistakes(filtered);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleMastered = async (mistake: Mistake) => {
    try {
      const newMastered = !mistake.mastered;
      
      await supabase
        .from('mock_exam_mistakes')
        .update({ 
          mastered: newMastered,
          mastered_at: newMastered ? new Date().toISOString() : null,
          review_count: mistake.review_count + 1,
          last_reviewed: new Date().toISOString()
        })
        .eq('id', mistake.id);

      setMistakes(prev => prev.map(m => 
        m.id === mistake.id 
          ? { ...m, mastered: newMastered, review_count: m.review_count + 1 }
          : m
      ));

      toast({ 
        title: newMastered ? t("mockExam.mistakes.masteredComplete") : t("mockExam.mistakes.masteredCancel"),
        description: newMastered ? t("mockExam.mistakes.masteredDesc") : t("mockExam.mistakes.reviewAgain")
      });
    } catch (error) {
      console.error('Toggle mastered error:', error);
    }
  };

  const deleteMistake = async (id: string) => {
    try {
      await supabase
        .from('mock_exam_mistakes')
        .delete()
        .eq('id', id);

      setMistakes(prev => prev.filter(m => m.id !== id));
      toast({ title: t("mockExam.mistakes.deleteComplete") });
    } catch (error) {
      console.error('Delete mistake error:', error);
    }
  };

  const getExplanation = (question: any) => {
    const lang = i18n.language;
    if (lang === 'vi' && question?.explanation_vi) return question.explanation_vi;
    if (lang === 'en' && question?.explanation_en) return question.explanation_en;
    return question?.explanation_ko || "해설이 없습니다.";
  };

  const getSectionIcon = (section: string) => {
    switch (section) {
      case 'listening': return Headphones;
      case 'reading': return BookOpen;
      case 'writing': return PenTool;
      default: return BookOpen;
    }
  };

  const masteredCount = mistakes.filter(m => m.mastered).length;
  const totalCount = mistakes.length;
  const masteredRate = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0;

  const reviewMistakes = filteredMistakes.filter(m => !m.mastered);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{t("mockExam.mistakes.loading", "오답노트 로딩 중...")}</p>
        </div>
      </div>
    );
  }

  // Review Mode
  if (reviewMode && reviewMistakes.length > 0) {
    const currentMistake = reviewMistakes[currentReviewIndex];
    const question = currentMistake?.question;

    return (
      <div className="min-h-screen bg-background">
        <CleanHeader />
        
        <main className="container mx-auto px-4 py-8 max-w-3xl">
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" onClick={() => setReviewMode(false)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("mockExam.mistakes.endReview", "복습 종료")}
            </Button>
            <Badge variant="outline">
              {currentReviewIndex + 1} / {reviewMistakes.length}
            </Badge>
          </div>

          <Progress 
            value={((currentReviewIndex + 1) / reviewMistakes.length) * 100} 
            className="mb-8"
          />

          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                {(() => {
                  const Icon = getSectionIcon(question?.section || '');
                  return <Icon className="w-4 h-4" />;
                })()}
                <span>{question?.section === 'listening' ? t('mockExam.sections.listening') : question?.section === 'reading' ? t('mockExam.sections.reading') : t('mockExam.sections.writing')}</span>
                <span>•</span>
                <span>Part {question?.part_number}</span>
              </div>
              <CardTitle className="text-lg">{question?.question_text}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {question?.options?.map((option: string, idx: number) => {
                  // DB stores correct_answer as 1-based (1,2,3,4), idx is 0-based (0,1,2,3)
                  const isCorrectAnswer = (idx + 1) === question.correct_answer;
                  const isUserAnswer = currentMistake.userAnswer === idx;
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "p-4 rounded-lg border transition-all",
                        showAnswer && isCorrectAnswer && "border-green-500 bg-green-50 dark:bg-green-950/30",
                        showAnswer && isUserAnswer && !isCorrectAnswer && "border-red-500 bg-red-50 dark:bg-red-950/30"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                          {idx + 1}
                        </span>
                        <span>{option}</span>
                        {showAnswer && isCorrectAnswer && (
                          <CheckCircle2 className="w-5 h-5 text-green-500 ml-auto" />
                        )}
                        {showAnswer && isUserAnswer && !isCorrectAnswer && (
                          <X className="w-5 h-5 text-red-500 ml-auto" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {showAnswer && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6"
                >
                  <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-5 h-5 text-amber-500 mt-0.5" />
                        <div>
                          <p className="font-medium mb-2">{t("mockExam.mistakes.explanation", "해설")}</p>
                          <p className="text-sm text-muted-foreground">{getExplanation(question)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setShowAnswer(false);
                setCurrentReviewIndex(Math.max(0, currentReviewIndex - 1));
              }}
              disabled={currentReviewIndex === 0}
            >
              이전
            </Button>

            {!showAnswer ? (
              <Button onClick={() => setShowAnswer(true)}>
                정답 확인
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAnswer(false);
                    if (currentReviewIndex < reviewMistakes.length - 1) {
                      setCurrentReviewIndex(currentReviewIndex + 1);
                    } else {
                      setReviewMode(false);
                      toast({ title: t("mockExam.mistakes.reviewComplete"), description: t("mockExam.mistakes.goodJob") });
                    }
                  }}
                >
                  {t("common.next")}
                </Button>
                <Button
                  onClick={() => {
                    toggleMastered(currentMistake);
                    setShowAnswer(false);
                    if (currentReviewIndex < reviewMistakes.length - 1) {
                      setCurrentReviewIndex(currentReviewIndex + 1);
                    } else {
                      setReviewMode(false);
                    }
                  }}
                >
                  <Star className="w-4 h-4 mr-1" />
                  마스터
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CleanHeader />

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate('/mock-exam')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            모의고사 허브
          </Button>
        </div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold mb-2">{t("mockExam.mistakes.title", "오답노트")}</h1>
          <p className="text-muted-foreground">{t("mockExam.mistakes.subtitle", "틀린 문제를 복습하고 마스터하세요")}</p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold text-primary">{totalCount}</p>
              <p className="text-sm text-muted-foreground">{t("mockExam.mistakes.totalMistakes", "총 오답")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold text-green-500">{masteredCount}</p>
              <p className="text-sm text-muted-foreground">{t("mockExam.mistakes.mastered", "마스터")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold text-amber-500">{totalCount - masteredCount}</p>
              <p className="text-sm text-muted-foreground">{t("mockExam.mistakes.needsReview", "복습 필요")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold">{masteredRate}%</p>
              <p className="text-sm text-muted-foreground">{t("mockExam.mistakes.masteryRate", "마스터율")}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Review Button */}
        {reviewMistakes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <Card className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/30">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="text-center md:text-left">
                    <h3 className="font-bold text-lg mb-1">{t("mockExam.mistakes.startReview", "복습 모드 시작")}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t("mockExam.mistakes.reviewCount", "{{count}}개의 미마스터 문제를 복습하세요", { count: reviewMistakes.length })}
                    </p>
                  </div>
                  <Button 
                    size="lg" 
                    onClick={() => {
                      setReviewMode(true);
                      setCurrentReviewIndex(0);
                      setShowAnswer(false);
                    }}
                  >
                    <Target className="w-4 h-4 mr-2" />
                    복습 시작
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("mockExam.filter.searchPlaceholder", "문제 검색...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={sectionFilter} onValueChange={setSectionFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('mockExam.filter.section')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('mockExam.filter.allSections')}</SelectItem>
              <SelectItem value="listening">{t('mockExam.sections.listening')}</SelectItem>
              <SelectItem value="reading">{t('mockExam.sections.reading')}</SelectItem>
              <SelectItem value="writing">{t('mockExam.sections.writing')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('mockExam.filter.status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('mockExam.filter.all')}</SelectItem>
              <SelectItem value="unmastered">{t('mockExam.filter.unmastered')}</SelectItem>
              <SelectItem value="mastered">{t('mockExam.mastered')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Mistakes List */}
        {filteredMistakes.length === 0 ? (
          <Card className="p-12 text-center">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-bold mb-2">{t('mockExam.mistakes.noMistakes')}</h3>
            <p className="text-muted-foreground mb-4">{t('mockExam.mistakes.noMistakesDesc')}</p>
            <Button onClick={() => navigate('/mock-exam')}>
              {t('mockExam.mistakes.startExam')}
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredMistakes.map((mistake, index) => {
              const Icon = getSectionIcon(mistake.question?.section || '');
              const isExpanded = expandedIds.has(mistake.id);

              return (
                <motion.div
                  key={mistake.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={cn(
                    "transition-all",
                    mistake.mastered && "border-green-500/30 bg-green-50/30 dark:bg-green-950/10"
                  )}>
                    <Collapsible open={isExpanded} onOpenChange={() => toggleExpand(mistake.id)}>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className="mt-1">
                                <Icon className="w-5 h-5 text-muted-foreground" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs">
                                    {mistake.question?.section === 'listening' ? t('mockExam.sections.listening') : 
                                     mistake.question?.section === 'reading' ? t('mockExam.sections.reading') : t('mockExam.sections.writing')}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    Part {mistake.question?.part_number}
                                  </Badge>
                                  {mistake.mastered && (
                                    <Badge className="bg-green-500 text-white text-xs">
                                      <Star className="w-3 h-3 mr-1" />
                                      {t('mockExam.mastered')}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm line-clamp-2">
                                  {mistake.question?.question_text}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {mistake.review_count}회 복습
                              </Badge>
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <div className="space-y-3 mb-4">
                            {mistake.question?.options?.map((option: string, idx: number) => (
                              <div
                                key={idx}
                                className={cn(
                                  "p-3 rounded-lg border text-sm",
                                  idx === mistake.question.correct_answer && "border-green-500 bg-green-50 dark:bg-green-950/30",
                                  mistake.userAnswer === idx && idx !== mistake.question.correct_answer && "border-red-500 bg-red-50 dark:bg-red-950/30"
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                                    {idx + 1}
                                  </span>
                                  <span>{option}</span>
                                  {idx === mistake.question.correct_answer && (
                                    <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />
                                  )}
                                  {mistake.userAnswer === idx && idx !== mistake.question.correct_answer && (
                                    <X className="w-4 h-4 text-red-500 ml-auto" />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 mb-4">
                            <CardContent className="pt-4">
                              <div className="flex items-start gap-2">
                                <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5" />
                                <p className="text-sm text-muted-foreground">
                                  {getExplanation(mistake.question)}
                                </p>
                              </div>
                            </CardContent>
                          </Card>

                          <div className="flex justify-end gap-2">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  {t("mockExam.mistakes.delete", "삭제")}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t("mockExam.mistakes.deleteTitle", "오답 삭제")}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t("mockExam.mistakes.deleteConfirm", "이 오답을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.")}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t("common.cancel", "취소")}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteMistake(mistake.id)}>
                                    {t("common.delete", "삭제")}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            <Button
                              variant={mistake.mastered ? "outline" : "default"}
                              size="sm"
                              onClick={() => toggleMastered(mistake)}
                            >
                              {mistake.mastered ? (
                                <>
                                  <RotateCcw className="w-4 h-4 mr-1" />
                                  다시 복습
                                </>
                              ) : (
                                <>
                                  <Star className="w-4 h-4 mr-1" />
                                  마스터
                                </>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default MockExamMistakes;
