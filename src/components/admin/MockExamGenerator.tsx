import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, Sparkles, Upload, FileText, CheckCircle, 
  AlertTriangle, XCircle, Brain, Wand2, Eye, Save,
  RefreshCw, FileUp, BookOpen, Headphones, PenLine,
  Target, Zap, ThumbsUp, ThumbsDown, Edit
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface GeneratedQuestion {
  question_text: string;
  options: string[];
  correct_answer: number;
  explanation_ko: string;
  explanation_en: string;
  explanation_vi: string;
  part_number: number;
  question_number: number;
  grammar_points: string[];
  vocabulary: string[];
  difficulty: string;
  topic: string;
  listening_script?: string;
  question_audio_url?: string;
}

interface ValidationResult {
  question_number: number;
  isValid: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
  correctedQuestion?: GeneratedQuestion;
}

interface GenerationState {
  step: "idle" | "generating" | "validating" | "ready" | "saving";
  progress: number;
  message: string;
}

const MockExamGenerator = () => {
  const { toast } = useToast();
  
  // Generation settings
  const [examType, setExamType] = useState<string>("topik1");
  const [section, setSection] = useState<string>("reading");
  const [difficulty, setDifficulty] = useState<string>("intermediate");
  const [topic, setTopic] = useState<string>("");
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [examRound, setExamRound] = useState<string>("");
  const [useRag, setUseRag] = useState<boolean>(true);
  const [generateAudio, setGenerateAudio] = useState<boolean>(true);
  
  // Reference document
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referenceContent, setReferenceContent] = useState<string>("");
  const [uploadingRef, setUploadingRef] = useState(false);
  
  // Generated questions
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set());
  
  // State
  const [genState, setGenState] = useState<GenerationState>({
    step: "idle",
    progress: 0,
    message: "",
  });
  const [showPreview, setShowPreview] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<GeneratedQuestion | null>(null);

  // Handle reference file upload
  const handleReferenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setReferenceFile(file);
    setUploadingRef(true);
    
    try {
      // For text files, read directly
      if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        const text = await file.text();
        setReferenceContent(text);
        toast({
          title: "파일 로드 완료",
          description: `${file.name} 파일이 로드되었습니다.`,
        });
      } else {
        // Upload to storage for processing
        const fileName = `references/${Date.now()}_${file.name}`;
        const { data, error } = await supabase.storage
          .from("mock-exam-references")
          .upload(fileName, file);
        
        if (error) throw error;
        
        // For now, we'll let Gemini process the file content
        // In a full implementation, we'd use a document parser
        const text = await file.text();
        setReferenceContent(text);
        
        toast({
          title: "파일 업로드 완료",
          description: `${file.name} 파일이 업로드되었습니다.`,
        });
      }
    } catch (error: any) {
      console.error("File upload error:", error);
      toast({
        title: "파일 업로드 실패",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingRef(false);
    }
  };

  // Generate questions using AI
  const handleGenerate = async () => {
    if (!examRound.trim()) {
      toast({
        title: "입력 오류",
        description: "회차를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setGenState({ step: "generating", progress: 20, message: "🤖 Gemini 2.5 Pro가 문제를 생성 중..." });
    setGeneratedQuestions([]);
    setValidationResults([]);
    setSelectedQuestions(new Set());

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Step 1: Generate questions
      const generateResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mock-exam-generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            examType,
            section,
            difficulty,
            topic: topic.trim() || undefined,
            questionCount,
            useRag,
            generateAudio: section === 'listening' ? generateAudio : false,
            examRound: parseInt(examRound, 10),
            referenceDocContent: referenceContent || undefined,
          }),
        }
      );

      const generateResult = await generateResponse.json();
      
      if (!generateResponse.ok) {
        throw new Error(generateResult.error || "문제 생성 실패");
      }

      if (!generateResult.questions || generateResult.questions.length === 0) {
        throw new Error("생성된 문제가 없습니다.");
      }

      setGeneratedQuestions(generateResult.questions);
      setGenState({ step: "validating", progress: 60, message: "🔍 AI가 문제를 검증 중..." });

      // Step 2: Validate questions
      const validateResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mock-exam-validate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            questions: generateResult.questions,
            examType,
            section,
          }),
        }
      );

      const validateResult = await validateResponse.json();

      if (!validateResponse.ok) {
        console.warn("Validation failed, using generated questions as-is");
        // Set all questions as selected if validation fails
        setSelectedQuestions(new Set(generateResult.questions.map((_: any, i: number) => i)));
      } else {
        setValidationResults(validateResult.validations || []);
        
        // Auto-select questions that passed validation (score >= 80)
        const passedIndices = new Set<number>();
        (validateResult.validations || []).forEach((v: ValidationResult, i: number) => {
          if (v.score >= 80) {
            passedIndices.add(i);
          }
        });
        setSelectedQuestions(passedIndices);
        
        // Apply corrections
        if (validateResult.validations) {
          const correctedQuestions = generateResult.questions.map((q: GeneratedQuestion, i: number) => {
            const validation = validateResult.validations[i];
            if (validation?.correctedQuestion) {
              return { ...q, ...validation.correctedQuestion };
            }
            return q;
          });
          setGeneratedQuestions(correctedQuestions);
        }

        toast({
          title: "검증 완료",
          description: `${validateResult.passedCount}개 통과, ${validateResult.failedCount}개 검토 필요`,
        });
      }

      setGenState({ step: "ready", progress: 100, message: "✅ 생성 및 검증 완료!" });

    } catch (error: any) {
      console.error("Generation error:", error);
      setGenState({ step: "idle", progress: 0, message: "" });
      toast({
        title: "생성 실패",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Save approved questions to database
  const handleSaveApproved = async () => {
    if (selectedQuestions.size === 0) {
      toast({
        title: "선택된 문제 없음",
        description: "저장할 문제를 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    setGenState({ step: "saving", progress: 90, message: "💾 문제를 저장 중..." });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const questionsToSave = generatedQuestions
        .filter((_, i) => selectedQuestions.has(i))
        .map((q, idx) => ({
          exam_type: examType,
          section,
          exam_round: parseInt(examRound, 10),
          part_number: q.part_number,
          question_number: q.question_number || idx + 1,
          question_text: q.question_text,
          options: q.options,
          correct_answer: q.correct_answer,
          explanation_ko: q.explanation_ko,
          explanation_en: q.explanation_en || null,
          explanation_vi: q.explanation_vi || null,
          difficulty: q.difficulty,
          topic: q.topic || topic || null,
          grammar_points: q.grammar_points || [],
          vocabulary: q.vocabulary || [],
          generation_source: referenceContent ? "ai_from_reference" : "ai_generated",
          status: "approved",
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          is_active: true,
        }));

      const { error } = await supabase
        .from("mock_question_bank")
        .insert(questionsToSave);

      if (error) throw error;

      toast({
        title: "저장 완료! 🎉",
        description: `${questionsToSave.length}개의 문제가 승인되어 저장되었습니다.`,
      });

      // Reset state
      setGenState({ step: "idle", progress: 0, message: "" });
      setGeneratedQuestions([]);
      setValidationResults([]);
      setSelectedQuestions(new Set());
      setReferenceContent("");
      setReferenceFile(null);

    } catch (error: any) {
      console.error("Save error:", error);
      setGenState({ step: "ready", progress: 100, message: "저장 실패" });
      toast({
        title: "저장 실패",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Toggle question selection
  const toggleQuestionSelection = (index: number) => {
    const newSet = new Set(selectedQuestions);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedQuestions(newSet);
  };

  // Select all / deselect all
  const selectAll = () => {
    setSelectedQuestions(new Set(generatedQuestions.map((_, i) => i)));
  };

  const deselectAll = () => {
    setSelectedQuestions(new Set());
  };

  // Get validation status for a question
  const getValidationStatus = (index: number) => {
    const validation = validationResults[index];
    if (!validation) return { color: "gray", icon: null, score: null };
    
    if (validation.score >= 80) {
      return { color: "green", icon: <CheckCircle className="w-4 h-4 text-green-500" />, score: validation.score };
    } else if (validation.score >= 60) {
      return { color: "yellow", icon: <AlertTriangle className="w-4 h-4 text-yellow-500" />, score: validation.score };
    } else {
      return { color: "red", icon: <XCircle className="w-4 h-4 text-red-500" />, score: validation.score };
    }
  };

  const getSectionIcon = (s: string) => {
    switch (s) {
      case "listening": return <Headphones className="w-4 h-4" />;
      case "reading": return <BookOpen className="w-4 h-4" />;
      case "writing": return <PenLine className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-purple-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            AI 문제 자동 생성 시스템
          </CardTitle>
          <CardDescription>
            Gemini 2.5 Pro + RAG 기반 TOPIK 모의고사 문제 자동 생성 및 검증
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5" />
            생성 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Settings */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>LUKATO 회차 *</Label>
              <Input
                type="number"
                placeholder="예: 1, 2, 3..."
                value={examRound}
                onChange={(e) => setExamRound(e.target.value)}
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label>시험 유형</Label>
              <Select value={examType} onValueChange={setExamType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="topik1">TOPIK I (1-2급)</SelectItem>
                  <SelectItem value="topik2">TOPIK II (3-6급)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>영역</Label>
              <Select value={section} onValueChange={setSection}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reading">읽기 (Reading)</SelectItem>
                  <SelectItem value="listening">듣기 (Listening)</SelectItem>
                  <SelectItem value="writing">쓰기 (Writing)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>난이도</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">초급 (1-2급)</SelectItem>
                  <SelectItem value="intermediate">중급 (3-4급)</SelectItem>
                  <SelectItem value="advanced">고급 (5-6급)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>주제/문법 (선택)</Label>
              <Input
                placeholder="예: -아/어서, 음식, 교통..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>생성할 문제 수</Label>
              <Select value={questionCount.toString()} onValueChange={(v) => setQuestionCount(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5문제</SelectItem>
                  <SelectItem value="10">10문제</SelectItem>
                  <SelectItem value="15">15문제</SelectItem>
                  <SelectItem value="20">20문제</SelectItem>
                  <SelectItem value="30">30문제</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* RAG Toggle */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Checkbox
              id="useRag"
              checked={useRag}
              onCheckedChange={(checked) => setUseRag(checked === true)}
            />
            <div className="flex-1">
              <Label htmlFor="useRag" className="cursor-pointer flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                RAG 활용 (벡터 DB 참조)
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                기존 TOPIK 자료를 참조하여 더 정확한 문제를 생성합니다.
              </p>
            </div>
          </div>

          {/* Audio Generation Toggle (for listening section) */}
          {section === 'listening' && (
            <div className="flex items-center gap-3 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
              <Checkbox
                id="generateAudio"
                checked={generateAudio}
                onCheckedChange={(checked) => setGenerateAudio(checked === true)}
              />
              <div className="flex-1">
                <Label htmlFor="generateAudio" className="cursor-pointer flex items-center gap-2">
                  <Headphones className="w-4 h-4 text-cyan-500" />
                  ElevenLabs TTS 음성 자동 생성
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  듣기 문제의 대화 스크립트를 자연스러운 한국어 음성으로 자동 생성합니다.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <FileUp className="w-4 h-4" />
              레퍼런스 문서 업로드 (선택)
            </Label>
            <div className="flex items-center gap-3">
              <Input
                type="file"
                accept=".txt,.md,.docx,.pdf"
                onChange={handleReferenceUpload}
                disabled={uploadingRef}
                className="flex-1"
              />
              {referenceFile && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {referenceFile.name}
                </Badge>
              )}
            </div>
            {referenceContent && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">레퍼런스 미리보기:</p>
                <p className="text-xs line-clamp-3">{referenceContent.slice(0, 500)}...</p>
              </div>
            )}
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={genState.step !== "idle" && genState.step !== "ready"}
            className="w-full h-12 text-lg"
            size="lg"
          >
            {genState.step === "generating" || genState.step === "validating" ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {genState.message}
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5 mr-2" />
                AI로 문제 생성하기
              </>
            )}
          </Button>

          {/* Progress Bar */}
          {genState.step !== "idle" && (
            <div className="space-y-2">
              <Progress value={genState.progress} className="h-2" />
              <p className="text-sm text-center text-muted-foreground">{genState.message}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generated Questions */}
      <AnimatePresence>
        {generatedQuestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    생성된 문제 ({generatedQuestions.length}개)
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      선택됨: {selectedQuestions.size}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={selectAll}>
                      전체 선택
                    </Button>
                    <Button variant="ghost" size="sm" onClick={deselectAll}>
                      전체 해제
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  <Accordion type="multiple" className="space-y-2">
                    {generatedQuestions.map((question, index) => {
                      const status = getValidationStatus(index);
                      const validation = validationResults[index];
                      const isSelected = selectedQuestions.has(index);

                      return (
                        <AccordionItem
                          key={index}
                          value={`question-${index}`}
                          className={`border rounded-lg ${isSelected ? 'border-primary/50 bg-primary/5' : 'border-border'}`}
                        >
                          <div className="flex items-center px-4 py-2">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleQuestionSelection(index)}
                              className="mr-3"
                            />
                            <AccordionTrigger className="flex-1 hover:no-underline">
                              <div className="flex items-center gap-3 text-left">
                                <Badge variant="secondary">
                                  Q{question.question_number || index + 1}
                                </Badge>
                                {getSectionIcon(section)}
                                <span className="text-sm truncate max-w-md">
                                  {question.question_text.slice(0, 60)}...
                                </span>
                                {status.icon}
                                {status.score !== null && (
                                  <Badge
                                    variant={status.score >= 80 ? "default" : status.score >= 60 ? "secondary" : "destructive"}
                                    className="text-xs"
                                  >
                                    {status.score}점
                                  </Badge>
                                )}
                              </div>
                            </AccordionTrigger>
                          </div>
                          <AccordionContent className="px-4 pb-4">
                            <div className="space-y-4">
                              {/* Question Text */}
                              <div className="p-3 bg-muted rounded-lg">
                                <Label className="text-xs text-muted-foreground">문제</Label>
                                <p className="mt-1 whitespace-pre-wrap">{question.question_text}</p>
                              </div>

                              {/* Options */}
                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">보기</Label>
                                {question.options.map((opt, oi) => (
                                  <div
                                    key={oi}
                                    className={`p-2 rounded ${oi + 1 === question.correct_answer ? 'bg-green-100 dark:bg-green-900/30 border border-green-500' : 'bg-muted/50'}`}
                                  >
                                    {opt}
                                    {oi + 1 === question.correct_answer && (
                                      <Badge className="ml-2 bg-green-500">정답</Badge>
                                    )}
                                  </div>
                                ))}
                              </div>

                              {/* Explanation */}
                              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <Label className="text-xs text-muted-foreground">해설 (한국어)</Label>
                                <p className="mt-1 text-sm">{question.explanation_ko}</p>
                              </div>

                              {/* Grammar & Vocabulary */}
                              <div className="flex flex-wrap gap-2">
                                {question.grammar_points?.map((g, gi) => (
                                  <Badge key={gi} variant="outline" className="text-xs">
                                    📚 {g}
                                  </Badge>
                                ))}
                                {question.vocabulary?.map((v, vi) => (
                                  <Badge key={vi} variant="secondary" className="text-xs">
                                    📝 {v}
                                  </Badge>
                                ))}
                              </div>

                              {/* Validation Issues */}
                              {validation && validation.issues?.length > 0 && (
                                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                                  <Label className="text-xs text-yellow-600 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    검증 이슈
                                  </Label>
                                  <ul className="mt-1 text-sm list-disc list-inside">
                                    {validation.issues.map((issue, ii) => (
                                      <li key={ii}>{issue}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </ScrollArea>

                {/* Save Button */}
                <div className="mt-6 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setGeneratedQuestions([]);
                      setValidationResults([]);
                      setSelectedQuestions(new Set());
                      setGenState({ step: "idle", progress: 0, message: "" });
                    }}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    다시 생성
                  </Button>
                  <Button
                    onClick={handleSaveApproved}
                    disabled={selectedQuestions.size === 0 || genState.step === "saving"}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {genState.step === "saving" ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <ThumbsUp className="w-4 h-4 mr-2" />
                    )}
                    선택된 {selectedQuestions.size}개 문제 승인 & 저장
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MockExamGenerator;
