import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Volume2, 
  VolumeX,
  Play,
  Pause,
  BookOpen,
  Headphones,
  PenTool,
  Flag,
  CheckCircle2,
  AlertCircle,
  X,
  Save,
  RotateCcw,
  Send,
  Home,
  Eye,
  FileText,
  EyeOff,
  Lightbulb
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: number;
  section: string;
  part_number: number;
  question_audio_url?: string;
  question_image_url?: string;
  explanation_ko?: string;
  explanation_vi?: string;
  explanation_en?: string;
  // Writing section specific
  question_type?: 'multiple_choice' | 'short_answer' | 'essay';
  word_limit?: number;
  sample_answer?: string;
}

interface AttemptData {
  id: string;
  user_id: string;
  exam_type: string;
  exam_mode: string;
  section?: string;
  part_number?: number;
  total_questions: number;
  correct_count: number;
  started_at: string;
  finished_at?: string;
  is_completed: boolean;
  time_taken_seconds?: number;
  time_limit_seconds?: number;
}

interface AnswerData {
  question_id: string;
  user_answer: number | null;
  is_correct?: boolean;
  time_spent_seconds?: number;
  // Writing answer
  text_answer?: string;
}

const MockExamTest = () => {
  const { examType } = useParams<{ examType: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  
  // Mode from URL params
  const mode = searchParams.get('mode') || 'full'; // full, section, part
  const section = searchParams.get('section'); // listening, reading
  const partNumber = searchParams.get('part') ? parseInt(searchParams.get('part')!) : null;
  
  // State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, AnswerData>>(new Map());
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [attempt, setAttempt] = useState<AttemptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // Timer state
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Audio state (for listening section)
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState<Map<string, number>>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Practice mode state
  const isPracticeMode = mode === 'section' || mode === 'part';
  const [showExplanation, setShowExplanation] = useState<Map<string, boolean>>(new Map());
  
  // Auto-save interval
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentQuestion = questions[currentIndex];
  const isListeningSection = currentQuestion?.section === 'listening';
  const isWritingSection = currentQuestion?.section === 'writing';
  const isReadingSection = currentQuestion?.section === 'reading';
  
  // Writing state
  const [writingAnswers, setWritingAnswers] = useState<Map<string, string>>(new Map());
  
  // Time limits based on exam type and mode
  const getTimeLimit = useCallback(() => {
    if (isPracticeMode) return null; // No time limit in practice mode
    
    const timeLimits: Record<string, { listening: number; reading: number; writing?: number }> = {
      TOPIK_I: { listening: 40 * 60, reading: 60 * 60 },
      TOPIK_II: { listening: 60 * 60, reading: 70 * 60, writing: 50 * 60 },
      TOPIK_EPS: { listening: 25 * 60, reading: 25 * 60 }
    };
    
    const examLimits = timeLimits[examType || 'TOPIK_I'];
    if (section) {
      return examLimits[section as keyof typeof examLimits] || null;
    }
    return examLimits.listening + examLimits.reading + (examLimits.writing || 0);
  }, [examType, section, isPracticeMode]);

  // Initialize exam
  useEffect(() => {
    const initExam = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "로그인이 필요합니다", variant: "destructive" });
        navigate('/auth');
        return;
      }
      setUser(user);
      
      // Check for existing incomplete attempt
      const { data: existingAttempt } = await supabase
        .from('mock_exam_attempts')
        .select('*')
        .eq('user_id', user.id)
        .eq('exam_type', examType)
        .eq('is_completed', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (existingAttempt) {
        // Resume existing attempt
        await resumeAttempt(existingAttempt, user.id);
      } else {
        // Start new attempt
        await startNewAttempt(user.id);
      }
    };
    
    initExam();
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
    };
  }, [examType, mode, section, partNumber]);

  const startNewAttempt = async (userId: string) => {
    try {
      // Fetch questions from database
      let query = supabase
        .from('mock_question_bank')
        .select('*')
        .eq('exam_type', examType)
        .eq('is_active', true);
      
      if (section) {
        query = query.eq('section', section);
      }
      if (partNumber) {
        query = query.eq('part_number', partNumber);
      }
      
      const { data: questionData, error } = await query.order('section').order('part_number').order('question_number');
      
      if (error || !questionData?.length) {
        toast({ title: "문제를 불러올 수 없습니다", description: "관리자에게 문의하세요", variant: "destructive" });
        navigate('/mock-exam');
        return;
      }
      
      const formattedQuestions: Question[] = questionData.map(q => ({
        id: q.id,
        question_text: q.question_text,
        options: Array.isArray(q.options) ? q.options as string[] : [],
        correct_answer: q.correct_answer,
        section: q.section,
        part_number: q.part_number,
        question_audio_url: q.question_audio_url || undefined,
        question_image_url: q.question_image_url || undefined,
        explanation_ko: q.explanation_ko || undefined,
        explanation_vi: q.explanation_vi || undefined,
        explanation_en: q.explanation_en || undefined,
        // Writing section questions
        question_type: q.section === 'writing' ? 
          (q.part_number <= 2 ? 'short_answer' : 'essay') : 'multiple_choice',
        word_limit: q.section === 'writing' ? 
          (q.part_number === 1 ? 30 : q.part_number === 2 ? 50 : q.part_number === 3 ? 300 : 700) : undefined,
        sample_answer: undefined
      }));
      
      setQuestions(formattedQuestions);
      
      const timeLimit = getTimeLimit();
      
      // Create attempt record
      const { data: newAttempt, error: attemptError } = await supabase
        .from('mock_exam_attempts')
        .insert({
          user_id: userId,
          exam_type: examType,
          exam_mode: mode,
          section: section || null,
          part_number: partNumber,
          total_questions: formattedQuestions.length,
          correct_count: 0,
          time_limit_seconds: timeLimit,
          is_completed: false
        })
        .select()
        .single();
      
      if (attemptError) throw attemptError;
      
      setAttempt(newAttempt);
      setTimeRemaining(timeLimit);
      setLoading(false);
      
      // Start timer if not practice mode
      if (timeLimit) {
        startTimer();
      }
      
      // Start auto-save
      startAutoSave(newAttempt.id);
      
    } catch (error) {
      console.error('Failed to start exam:', error);
      toast({ title: "시험 시작 실패", variant: "destructive" });
    }
  };

  const resumeAttempt = async (existingAttempt: any, userId: string) => {
    try {
      // Fetch questions
      let query = supabase
        .from('mock_question_bank')
        .select('*')
        .eq('exam_type', existingAttempt.exam_type)
        .eq('is_active', true);
      
      if (existingAttempt.section) {
        query = query.eq('section', existingAttempt.section);
      }
      if (existingAttempt.part_number) {
        query = query.eq('part_number', existingAttempt.part_number);
      }
      
      const { data: questionData } = await query.order('section').order('part_number').order('question_number');
      
      if (!questionData?.length) {
        navigate('/mock-exam');
        return;
      }
      
      const formattedQuestions: Question[] = questionData.map(q => ({
        id: q.id,
        question_text: q.question_text,
        options: Array.isArray(q.options) ? q.options as string[] : [],
        correct_answer: q.correct_answer,
        section: q.section,
        part_number: q.part_number,
        question_audio_url: q.question_audio_url || undefined,
        question_image_url: q.question_image_url || undefined,
        explanation_ko: q.explanation_ko || undefined,
        explanation_vi: q.explanation_vi || undefined,
        explanation_en: q.explanation_en || undefined
      }));
      
      setQuestions(formattedQuestions);
      
      // Fetch existing answers
      const { data: existingAnswers } = await supabase
        .from('mock_exam_answers')
        .select('*')
        .eq('attempt_id', existingAttempt.id);
      
      if (existingAnswers) {
        const answersMap = new Map<string, AnswerData>();
        existingAnswers.forEach(a => {
          answersMap.set(a.question_id, {
            question_id: a.question_id,
            user_answer: a.user_answer,
            is_correct: a.is_correct || undefined,
            time_spent_seconds: a.time_spent_seconds || undefined
          });
        });
        setAnswers(answersMap);
      }
      
      // Calculate remaining time
      const startedAt = new Date(existingAttempt.started_at).getTime();
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = existingAttempt.time_limit_seconds ? Math.max(0, existingAttempt.time_limit_seconds - elapsed) : null;
      
      setAttempt(existingAttempt);
      setTimeRemaining(remaining);
      setLoading(false);
      
      if (remaining && remaining > 0) {
        startTimer();
      }
      
      startAutoSave(existingAttempt.id);
      
      toast({ title: "이어서 풀기", description: "이전 진행 상황을 불러왔습니다" });
      
    } catch (error) {
      console.error('Failed to resume:', error);
      await startNewAttempt(userId);
    }
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimeUp = () => {
    toast({ title: "시간 종료", description: "자동으로 제출됩니다", variant: "destructive" });
    handleSubmit();
  };

  const startAutoSave = (attemptId: string) => {
    if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
    
    saveIntervalRef.current = setInterval(() => {
      saveProgress(attemptId);
    }, 30000); // Save every 30 seconds
  };

  const saveProgress = async (attemptId: string) => {
    if (!attemptId) return;
    
    try {
      const answersArray = Array.from(answers.values());
      
      for (const answer of answersArray) {
        await supabase
          .from('mock_exam_answers')
          .upsert({
            attempt_id: attemptId,
            question_id: answer.question_id,
            user_answer: answer.user_answer,
            is_correct: answer.is_correct,
            time_spent_seconds: answer.time_spent_seconds
          }, { onConflict: 'attempt_id,question_id' });
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const handleAnswer = (optionIndex: number) => {
    if (!currentQuestion) return;
    
    const isCorrect = optionIndex === currentQuestion.correct_answer;
    
    const newAnswer: AnswerData = {
      question_id: currentQuestion.id,
      user_answer: optionIndex,
      is_correct: isCorrect
    };
    
    setAnswers(prev => new Map(prev).set(currentQuestion.id, newAnswer));
    
    // In practice mode, show explanation immediately
    if (isPracticeMode) {
      setShowExplanation(prev => new Map(prev).set(currentQuestion.id, true));
      
      // Save to mistakes if wrong
      if (!isCorrect && user) {
        saveMistake(currentQuestion, optionIndex);
      }
    }
  };

  const saveMistake = async (question: Question, userAnswer: number) => {
    if (!user || !attempt) return;
    
    try {
      await supabase
        .from('mock_exam_mistakes')
        .upsert({
          user_id: user.id,
          question_id: question.id,
          attempt_id: attempt.id,
          mastered: false,
          review_count: 0
        }, { onConflict: 'user_id,question_id' });
    } catch (error) {
      console.error('Failed to save mistake:', error);
    }
  };

  const handleFlag = () => {
    if (!currentQuestion) return;
    
    setFlagged(prev => {
      const newSet = new Set(prev);
      if (newSet.has(currentQuestion.id)) {
        newSet.delete(currentQuestion.id);
      } else {
        newSet.add(currentQuestion.id);
      }
      return newSet;
    });
  };

  const handlePlayAudio = () => {
    if (!currentQuestion?.question_audio_url) return;
    
    const currentPlayCount = playCount.get(currentQuestion.id) || 0;
    
    // In practice mode, unlimited plays. In real mode, max 2 plays
    if (!isPracticeMode && currentPlayCount >= 2) {
      toast({ title: "재생 제한", description: "이 문제는 2회까지만 재생할 수 있습니다" });
      return;
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    audioRef.current = new Audio(currentQuestion.question_audio_url);
    audioRef.current.onplay = () => setIsPlaying(true);
    audioRef.current.onended = () => {
      setIsPlaying(false);
      if (!isPracticeMode) {
        setPlayCount(prev => new Map(prev).set(currentQuestion.id, (prev.get(currentQuestion.id) || 0) + 1));
      }
    };
    audioRef.current.onerror = () => {
      setIsPlaying(false);
      toast({ title: "오디오 재생 오류", variant: "destructive" });
    };
    audioRef.current.play();
  };

  const handleSubmit = async () => {
    if (!attempt) return;
    
    try {
      // Calculate score
      let correctCount = 0;
      const answersArray = Array.from(answers.values());
      
      for (const answer of answersArray) {
        if (answer.is_correct) correctCount++;
        
        // Save all answers
        await supabase
          .from('mock_exam_answers')
          .upsert({
            attempt_id: attempt.id,
            question_id: answer.question_id,
            user_answer: answer.user_answer,
            is_correct: answer.is_correct,
            answered_at: new Date().toISOString()
          }, { onConflict: 'attempt_id,question_id' });
      }
      
      // Calculate time taken
      const startedAt = new Date(attempt.started_at).getTime();
      const timeTaken = Math.floor((Date.now() - startedAt) / 1000);
      
      // Calculate scores
      const totalScore = Math.round((correctCount / questions.length) * 100);
      
      // Update attempt
      await supabase
        .from('mock_exam_attempts')
        .update({
          is_completed: true,
          finished_at: new Date().toISOString(),
          correct_count: correctCount,
          time_taken_seconds: timeTaken,
          total_score: totalScore
        })
        .eq('id', attempt.id);
      
      // Save mistakes for wrong answers
      for (const answer of answersArray) {
        if (!answer.is_correct && user) {
          const question = questions.find(q => q.id === answer.question_id);
          if (question) {
            await supabase
              .from('mock_exam_mistakes')
              .upsert({
                user_id: user.id,
                question_id: answer.question_id,
                attempt_id: attempt.id,
                mastered: false,
                review_count: 0
              }, { onConflict: 'user_id,question_id' });
          }
        }
      }
      
      if (timerRef.current) clearInterval(timerRef.current);
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
      
      setShowSubmitDialog(false);
      setShowResultDialog(true);
      
    } catch (error) {
      console.error('Submit failed:', error);
      toast({ title: "제출 실패", variant: "destructive" });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getExplanation = (question: Question) => {
    const lang = i18n.language;
    if (lang === 'vi' && question.explanation_vi) return question.explanation_vi;
    if (lang === 'en' && question.explanation_en) return question.explanation_en;
    return question.explanation_ko || "해설이 없습니다.";
  };

  const getAnswerStatus = (questionId: string) => {
    const answer = answers.get(questionId);
    if (!answer) return 'unanswered';
    if (isPracticeMode) {
      return answer.is_correct ? 'correct' : 'incorrect';
    }
    return 'answered';
  };

  const answeredCount = answers.size;
  const progress = (answeredCount / questions.length) * 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">시험 준비 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Question Navigation */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="w-72 border-r bg-card flex flex-col h-screen sticky top-0"
          >
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-bold">{examType?.replace('_', ' ')}</h2>
                <Badge variant={isPracticeMode ? "secondary" : "default"}>
                  {isPracticeMode ? "연습 모드" : "실전 모드"}
                </Badge>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground mt-1">
                {answeredCount} / {questions.length} 완료
              </p>
            </div>
            
            {/* Timer (real mode only) */}
            {timeRemaining !== null && (
              <div className={cn(
                "p-4 border-b flex items-center gap-2",
                timeRemaining < 300 && "bg-destructive/10"
              )}>
                <Clock className={cn(
                  "w-5 h-5",
                  timeRemaining < 300 ? "text-destructive" : "text-muted-foreground"
                )} />
                <span className={cn(
                  "text-xl font-mono font-bold",
                  timeRemaining < 300 && "text-destructive"
                )}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
            )}
            
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {/* Group by section */}
                {['listening', 'reading', 'writing'].map(sec => {
                  const sectionQuestions = questions.filter(q => q.section === sec);
                  if (sectionQuestions.length === 0) return null;
                  
                  return (
                    <div key={sec}>
                      <div className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground">
                        {sec === 'listening' ? (
                          <Headphones className="w-4 h-4" />
                        ) : sec === 'reading' ? (
                          <BookOpen className="w-4 h-4" />
                        ) : (
                          <PenTool className="w-4 h-4" />
                        )}
                        <span>{sec === 'listening' ? '듣기' : sec === 'reading' ? '읽기' : '쓰기'}</span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {sectionQuestions.map((q, idx) => {
                          const globalIndex = questions.indexOf(q);
                          const status = getAnswerStatus(q.id);
                          const isFlagged = flagged.has(q.id);
                          // For writing questions, check if text answer exists
                          const hasWritingAnswer = sec === 'writing' && writingAnswers.has(q.id) && (writingAnswers.get(q.id)?.length || 0) > 0;
                          
                          return (
                            <button
                              key={q.id}
                              onClick={() => setCurrentIndex(globalIndex)}
                              className={cn(
                                "w-10 h-10 rounded-lg text-sm font-medium transition-all relative",
                                globalIndex === currentIndex && "ring-2 ring-primary",
                                !hasWritingAnswer && status === 'unanswered' && "bg-muted hover:bg-muted/80",
                                (status === 'answered' || hasWritingAnswer) && "bg-primary text-primary-foreground",
                                status === 'correct' && "bg-green-500 text-white",
                                status === 'incorrect' && "bg-destructive text-white"
                              )}
                            >
                              {sec === 'writing' ? `${51 + idx}` : globalIndex + 1}
                              {isFlagged && (
                                <Flag className="w-3 h-3 absolute -top-1 -right-1 text-amber-500 fill-amber-500" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t space-y-2">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowExitDialog(true)}
              >
                <Home className="w-4 h-4 mr-2" />
                나가기
              </Button>
              <Button 
                className="w-full"
                onClick={() => setShowSubmitDialog(true)}
              >
                <Send className="w-4 h-4 mr-2" />
                제출하기
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen">
        {/* Top Bar */}
        <div className="border-b p-4 flex items-center justify-between bg-card">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <ChevronLeft /> : <ChevronRight />}
            </Button>
            <div>
              <span className="text-sm text-muted-foreground">
                {currentQuestion?.section === 'listening' ? '듣기' : 
                 currentQuestion?.section === 'reading' ? '읽기' : '쓰기'} - Part {currentQuestion?.part_number}
              </span>
              <h2 className="font-bold">
                문제 {isWritingSection ? 50 + (questions.filter(q => q.section === 'writing').indexOf(currentQuestion!) + 1) : currentIndex + 1}
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Audio controls for listening */}
            {isListeningSection && currentQuestion?.question_audio_url && (
              <div className="flex items-center gap-2 mr-4">
                <Button
                  variant={isPlaying ? "secondary" : "default"}
                  size="sm"
                  onClick={handlePlayAudio}
                  disabled={!isPracticeMode && (playCount.get(currentQuestion.id) || 0) >= 2}
                >
                  {isPlaying ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                  {isPlaying ? "재생 중" : "듣기"}
                </Button>
                {!isPracticeMode && (
                  <Badge variant="outline">
                    {2 - (playCount.get(currentQuestion.id) || 0)}회 남음
                  </Badge>
                )}
              </div>
            )}
            
            <Button
              variant={flagged.has(currentQuestion?.id || '') ? "secondary" : "outline"}
              size="sm"
              onClick={handleFlag}
            >
              <Flag className={cn(
                "w-4 h-4 mr-1",
                flagged.has(currentQuestion?.id || '') && "fill-amber-500 text-amber-500"
              )} />
              표시
            </Button>
          </div>
        </div>

        {/* Question Content */}
        <ScrollArea className="flex-1 p-6">
          {currentQuestion && (
            <div className="max-w-3xl mx-auto">
              {/* Question Image */}
              {currentQuestion.question_image_url && (
                <div className="mb-6">
                  <img 
                    src={currentQuestion.question_image_url} 
                    alt="문제 이미지" 
                    className="max-w-full rounded-lg border"
                  />
                </div>
              )}
              
              {/* Question Text */}
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <p className="text-lg whitespace-pre-wrap">{currentQuestion.question_text}</p>
                </CardContent>
              </Card>
              
              {/* Multiple Choice Options (Listening/Reading) */}
              {!isWritingSection && (
                <div className="space-y-3">
                  {currentQuestion.options.map((option, idx) => {
                    const answer = answers.get(currentQuestion.id);
                    const isSelected = answer?.user_answer === idx;
                    const isCorrect = idx === currentQuestion.correct_answer;
                    const showResult = isPracticeMode && answer !== undefined;
                    
                    return (
                      <button
                        key={idx}
                        onClick={() => handleAnswer(idx)}
                        disabled={isPracticeMode && answer !== undefined}
                        className={cn(
                          "w-full p-4 rounded-lg border text-left transition-all flex items-start gap-3",
                          !showResult && isSelected && "border-primary bg-primary/5",
                          !showResult && !isSelected && "hover:border-primary/50 hover:bg-muted/50",
                          showResult && isCorrect && "border-green-500 bg-green-50 dark:bg-green-950/30",
                          showResult && isSelected && !isCorrect && "border-destructive bg-destructive/10"
                        )}
                      >
                        <span className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0",
                          isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}>
                          {idx + 1}
                        </span>
                        <span className="flex-1 pt-1">{option}</span>
                        {showResult && isCorrect && (
                          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                        )}
                        {showResult && isSelected && !isCorrect && (
                          <X className="w-5 h-5 text-destructive shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              
              {/* Writing Section - Text Input */}
              {isWritingSection && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PenTool className="w-5 h-5 text-primary" />
                      <span className="font-medium">
                        {currentQuestion.question_type === 'short_answer' ? '단답형' : '서술형'}
                      </span>
                    </div>
                    {currentQuestion.word_limit && (
                      <Badge variant="outline">
                        권장 {currentQuestion.word_limit}자
                      </Badge>
                    )}
                  </div>
                  
                  <div className="relative">
                    <textarea
                      value={writingAnswers.get(currentQuestion.id) || ''}
                      onChange={(e) => {
                        const newText = e.target.value;
                        setWritingAnswers(prev => new Map(prev).set(currentQuestion.id, newText));
                        // Also update answers map for tracking
                        setAnswers(prev => new Map(prev).set(currentQuestion.id, {
                          question_id: currentQuestion.id,
                          user_answer: null,
                          text_answer: newText
                        }));
                      }}
                      placeholder={currentQuestion.question_type === 'short_answer' 
                        ? "빈칸에 알맞은 내용을 쓰세요..." 
                        : "주어진 주제에 대해 글을 작성하세요..."}
                      className={cn(
                        "w-full rounded-lg border bg-background p-4 text-base resize-none focus:outline-none focus:ring-2 focus:ring-primary/50",
                        currentQuestion.question_type === 'short_answer' ? "h-32" : "h-64 md:h-96"
                      )}
                    />
                    <div className="absolute bottom-3 right-3 text-sm text-muted-foreground">
                      {(writingAnswers.get(currentQuestion.id) || '').length}자
                      {currentQuestion.word_limit && ` / ${currentQuestion.word_limit}자`}
                    </div>
                  </div>
                  
                  {/* Writing Tips */}
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <FileText className="w-5 h-5 text-primary mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium mb-1">작성 안내</p>
                          {currentQuestion.question_type === 'short_answer' ? (
                            <ul className="text-muted-foreground space-y-1">
                              <li>• 빈칸에 적절한 표현을 완성하세요.</li>
                              <li>• 문맥에 맞는 문법과 어휘를 사용하세요.</li>
                            </ul>
                          ) : (
                            <ul className="text-muted-foreground space-y-1">
                              <li>• 주제에 맞게 서론-본론-결론 구조로 작성하세요.</li>
                              <li>• 다양한 문법과 어휘를 사용하세요.</li>
                              <li>• 제출 후 AI 첨삭을 받을 수 있습니다.</li>
                            </ul>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              
              {/* Explanation (Practice Mode) - Only for multiple choice */}
              {isPracticeMode && !isWritingSection && answers.has(currentQuestion.id) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6"
                >
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        <span className="flex items-center gap-2">
                          <Lightbulb className="w-4 h-4 text-amber-500" />
                          해설 보기
                        </span>
                        <ChevronRight className="w-4 h-4 transition-transform ui-open:rotate-90" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <Card className="mt-2 border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
                        <CardContent className="pt-4">
                          <p className="text-sm whitespace-pre-wrap">{getExplanation(currentQuestion)}</p>
                        </CardContent>
                      </Card>
                    </CollapsibleContent>
                  </Collapsible>
                </motion.div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Bottom Navigation */}
        <div className="border-t p-4 flex items-center justify-between bg-card">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            이전
          </Button>
          
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} / {questions.length}
          </span>
          
          <Button
            variant="outline"
            onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
            disabled={currentIndex === questions.length - 1}
          >
            다음
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Exit Dialog */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>시험을 나가시겠습니까?</DialogTitle>
            <DialogDescription>
              진행 상황은 자동 저장되며, 나중에 이어서 풀 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExitDialog(false)}>
              계속 풀기
            </Button>
            <Button variant="destructive" onClick={() => {
              saveProgress(attempt?.id || '');
              navigate('/mock-exam');
            }}>
              저장 후 나가기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>답안을 제출하시겠습니까?</DialogTitle>
            <DialogDescription>
              {questions.length - answeredCount > 0 && (
                <span className="text-destructive">
                  아직 {questions.length - answeredCount}개의 문제를 풀지 않았습니다.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex justify-between text-sm mb-2">
              <span>풀이 완료</span>
              <span className="font-medium">{answeredCount} / {questions.length}</span>
            </div>
            <Progress value={progress} className="h-2" />
            {flagged.size > 0 && (
              <p className="text-sm text-amber-600 mt-2">
                <Flag className="w-4 h-4 inline mr-1" />
                표시한 문제: {flagged.size}개
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              돌아가기
            </Button>
            <Button onClick={handleSubmit}>
              제출하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">시험 결과</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center mb-4">
              <span className="text-3xl font-bold text-white">
                {Math.round((Array.from(answers.values()).filter(a => a.is_correct).length / questions.length) * 100)}
              </span>
            </div>
            <p className="text-lg font-medium mb-2">
              {Array.from(answers.values()).filter(a => a.is_correct).length} / {questions.length} 정답
            </p>
            <div className={cn(
              "grid gap-4 mt-6 text-sm",
              questions.some(q => q.section === 'writing') ? "grid-cols-3" : "grid-cols-2"
            )}>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-muted-foreground">듣기</p>
                <p className="font-bold text-lg">
                  {Array.from(answers.values()).filter(a => {
                    const q = questions.find(q => q.id === a.question_id);
                    return q?.section === 'listening' && a.is_correct;
                  }).length} / {questions.filter(q => q.section === 'listening').length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-muted-foreground">읽기</p>
                <p className="font-bold text-lg">
                  {Array.from(answers.values()).filter(a => {
                    const q = questions.find(q => q.id === a.question_id);
                    return q?.section === 'reading' && a.is_correct;
                  }).length} / {questions.filter(q => q.section === 'reading').length}
                </p>
              </div>
              {questions.some(q => q.section === 'writing') && (
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-muted-foreground">쓰기</p>
                  <p className="font-bold text-lg">
                    {writingAnswers.size} / {questions.filter(q => q.section === 'writing').length}
                    <span className="text-xs font-normal ml-1 text-primary">작성</span>
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button className="w-full" onClick={() => navigate('/mock-exam')}>
              모의고사 허브로 이동
            </Button>
            <Button variant="outline" className="w-full" onClick={() => {
              setShowResultDialog(false);
              // Navigate to review mode
            }}>
              오답 복습하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MockExamTest;