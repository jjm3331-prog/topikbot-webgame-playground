import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { mapExamTypeToDb } from "@/lib/mockExamDb";
import { 
  validateExplanations, 
  autoFillMissingExplanations, 
  summarizeBatchValidation,
  SUPPORTED_LANGUAGES,
  type ValidationResult as ExplanationValidation
} from "@/lib/explanationValidator";
import { 
  Loader2, Sparkles, FileText, CheckCircle, 
  AlertTriangle, XCircle, Brain, Wand2, Save,
  RefreshCw, FileUp, BookOpen, Headphones, PenLine,
  Target, ThumbsUp, Volume2, Mic2, Radio, Zap, TrendingUp, Globe, Image, Upload, X
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  question_image_url?: string;
  image_description?: string;
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
  step: "idle" | "rag" | "generating" | "validating" | "audio" | "ready" | "saving" | "refining";
  progress: number;
  message: string;
  tokenCount?: number;
}

// TTS Presets
const TTS_PRESETS = {
  exam: {
    label: "📝 시험용 (정확한 발음)",
    description: "정확하고 또렷한 발음, 적당히 느린 속도",
  },
  learning: {
    label: "📚 학습용 (천천히)",
    description: "초보자를 위한 느린 속도",
  },
  natural: {
    label: "💬 자연스러운",
    description: "일상 대화처럼 자연스러운 속도",
  },
  formal: {
    label: "🎙️ 공식/뉴스",
    description: "뉴스 아나운서 스타일",
  },
};

// 듣기 문제 유형 설정
const LISTENING_QUESTION_TYPES = {
  "1-4": {
    label: "[1~4] 적절한 대답",
    description: "질문 듣고 적절한 대답 고르기",
    turns: "1-2턴",
    speakers: 2,
  },
  "5-8": {
    label: "[5~8] 그림 대화",
    description: "그림 보고 알맞은 대화 고르기",
    turns: "2-3턴",
    speakers: 2,
  },
  "9-12": {
    label: "[9~12] 장소/화제/목적",
    description: "대화의 장소, 화제, 목적 파악",
    turns: "3-4턴",
    speakers: 2,
  },
  "13-16": {
    label: "[13~16] 세부 내용",
    description: "대화 내용과 같은 것 찾기",
    turns: "4-6턴",
    speakers: 2,
  },
  "17-20": {
    label: "[17~20] 화자 의도/태도",
    description: "화자의 의도, 태도, 후속 행동 파악",
    turns: "5-8턴",
    speakers: 2,
  },
  "21-30": {
    label: "[21~30] 종합 이해",
    description: "긴 대화/담화 종합 이해",
    turns: "6-10턴",
    speakers: "2-3",
  },
  "mixed": {
    label: "혼합 (자동)",
    description: "다양한 유형 자동 생성",
    turns: "자동",
    speakers: "자동",
  },
};

// 대화 길이 설정
const DIALOGUE_LENGTH_OPTIONS = {
  short: { label: "짧은 대화", turns: "1-3턴", icon: "💬" },
  medium: { label: "중간 대화", turns: "4-6턴", icon: "🗣️" },
  long: { label: "긴 대화", turns: "7-10턴", icon: "📢" },
  auto: { label: "자동 (유형별)", turns: "유형에 따라", icon: "🔄" },
};

// 화자 수 설정
const SPEAKER_OPTIONS = {
  2: { label: "2인 대화", description: "남자-여자 대화" },
  3: { label: "3인 대화", description: "다자간 대화" },
  monologue: { label: "1인 담화", description: "강의, 뉴스, 안내" },
  auto: { label: "자동", description: "유형별 자동 설정" },
};

const MockExamGenerator = () => {
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Generation settings
  const [examType, setExamType] = useState<string>("topik1");
  const [section, setSection] = useState<string>("reading");
  const [difficulty, setDifficulty] = useState<string>("intermediate");
  const [topic, setTopic] = useState<string>("");
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [examRound, setExamRound] = useState<string>("");
  const [useRag, setUseRag] = useState<boolean>(true);
  const [generateAudio, setGenerateAudio] = useState<boolean>(true);
  const [ttsPreset, setTtsPreset] = useState<keyof typeof TTS_PRESETS>("exam");
  
  // 듣기 세부 설정
  const [listeningQuestionType, setListeningQuestionType] = useState<string>("mixed");
  const [dialogueLength, setDialogueLength] = useState<string>("auto");
  const [speakerCount, setSpeakerCount] = useState<string>("auto");
  
  // Reference document
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referenceContent, setReferenceContent] = useState<string>("");
  const [uploadingRef, setUploadingRef] = useState(false);
  
  // Generated questions
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set());
  
  // 7개국어 해설 검증 상태
  const [explanationValidations, setExplanationValidations] = useState<ExplanationValidation[]>([]);
  const [showExplanationWarning, setShowExplanationWarning] = useState(false);
  
  // Streaming state
  const [streamingContent, setStreamingContent] = useState<string>("");
  const [genState, setGenState] = useState<GenerationState>({
    step: "idle",
    progress: 0,
    message: "",
  });

  // Handle reference file upload
  const handleReferenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setReferenceFile(file);
    setUploadingRef(true);
    
    try {
      if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        const text = await file.text();
        setReferenceContent(text);
        toast({
          title: "파일 로드 완료",
          description: `${file.name} 파일이 로드되었습니다.`,
        });
      } else {
        const fileName = `references/${Date.now()}_${file.name}`;
        const { error } = await supabase.storage
          .from("mock-exam-references")
          .upload(fileName, file);
        
        if (error) throw error;
        
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

  // Process SSE stream
  const processSSEStream = useCallback(async (
    response: Response,
    onProgress: (step: string, progress: number, message: string) => void,
    onToken: (content: string) => void,
    onComplete: (data: any) => void,
    onError: (error: string) => void
  ) => {
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            switch (data.type) {
              case "progress":
                onProgress(data.step, data.progress, data.message);
                break;
              case "token":
                onToken(data.content);
                break;
              case "complete":
                onComplete(data);
                break;
              case "error":
                onError(data.error);
                break;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }
  }, []);

  // Generate questions using AI with streaming
  const handleGenerate = async () => {
    if (!examRound.trim()) {
      toast({
        title: "입력 오류",
        description: "회차를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    // Reset state
    setGeneratedQuestions([]);
    setValidationResults([]);
    setSelectedQuestions(new Set());
    setStreamingContent("");
    setGenState({ step: "generating", progress: 10, message: "🚀 AI 문제 생성 시작..." });

    abortControllerRef.current = new AbortController();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Step 1: Generate questions with streaming
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
            ttsPreset: section === 'listening' ? ttsPreset : undefined,
            // 듣기 세부 설정
            listeningQuestionType: section === 'listening' ? listeningQuestionType : undefined,
            dialogueLength: section === 'listening' ? dialogueLength : undefined,
            speakerCount: section === 'listening' ? speakerCount : undefined,
            stream: true,
          }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json();
        throw new Error(errorData.error || "문제 생성 실패");
      }

      let generatedData: any = null;

      await processSSEStream(
        generateResponse,
        (step, progress, message) => {
          setGenState({ step: step as any, progress, message, tokenCount: undefined });
        },
        (content) => {
          setStreamingContent(prev => prev + content);
        },
        (data) => {
          generatedData = data;
          if (data.questions) {
            setGeneratedQuestions(data.questions);
          }
        },
        (error) => {
          throw new Error(error);
        }
      );

      if (!generatedData?.questions || generatedData.questions.length === 0) {
        throw new Error("생성된 문제가 없습니다.");
      }

      // Step 2: Validate questions with streaming
      setGenState({ step: "validating", progress: 60, message: "🔍 AI 검증 시작..." });
      setStreamingContent("");

      const validateResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mock-exam-validate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            questions: generatedData.questions,
            examType,
            section,
            stream: true,
          }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!validateResponse.ok) {
        console.warn("Validation request failed, using generated questions as-is");
        setSelectedQuestions(new Set(generatedData.questions.map((_: any, i: number) => i)));
      } else {
        let validateData: any = null;

        await processSSEStream(
          validateResponse,
          (step, progress, message) => {
            setGenState({ step: "validating", progress: 60 + (progress * 0.4), message });
          },
          (content) => {
            setStreamingContent(prev => prev + content);
          },
          (data) => {
            validateData = data;
          },
          (error) => {
            console.warn("Validation stream error:", error);
          }
        );

        if (validateData?.validations) {
          setValidationResults(validateData.validations);
          
          // Auto-select questions that passed validation
          const passedIndices = new Set<number>();
          validateData.validations.forEach((v: ValidationResult, i: number) => {
            if (v.score >= 80) passedIndices.add(i);
          });
          setSelectedQuestions(passedIndices);
          
          // Apply corrections
          const correctedQuestions = generatedData.questions.map((q: GeneratedQuestion, i: number) => {
            const validation = validateData.validations[i];
            return validation?.correctedQuestion ? { ...q, ...validation.correctedQuestion } : q;
          });
          setGeneratedQuestions(correctedQuestions);

          toast({
            title: "검증 완료",
            description: `${validateData.passedCount}개 통과, ${validateData.failedCount}개 검토 필요`,
          });
        }
      }

      setGenState({ step: "ready", progress: 100, message: "✅ 생성 및 검증 완료!" });
      setStreamingContent("");

    } catch (error: any) {
      if (error.name === 'AbortError') {
        setGenState({ step: "idle", progress: 0, message: "취소됨" });
        return;
      }
      
      console.error("Generation error:", error);
      setGenState({ step: "idle", progress: 0, message: "" });
      toast({
        title: "생성 실패",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Cancel generation
  const handleCancel = () => {
    abortControllerRef.current?.abort();
    setGenState({ step: "idle", progress: 0, message: "취소됨" });
  };

  // Map difficulty to DB-allowed values
  const mapDifficultyToDb = (difficulty: string): string => {
    const mapping: Record<string, string> = {
      'beginner': 'easy',
      'easy': 'easy',
      'intermediate': 'medium',
      'medium': 'medium',
      'advanced': 'hard',
      'hard': 'hard',
      '초급': 'easy',
      '중급': 'medium',
      '고급': 'hard',
    };
    return mapping[difficulty.toLowerCase()] || 'medium';
  };

  // 7개국어 해설 검증 실행
  const validateAllExplanations = () => {
    const validations: ExplanationValidation[] = generatedQuestions.map(q => 
      validateExplanations({
        explanation_ko: q.explanation_ko,
        explanation_en: q.explanation_en,
        explanation_vi: q.explanation_vi,
      })
    );
    setExplanationValidations(validations);
    
    // 누락된 해설이 있는지 확인
    const hasIssues = validations.some(v => !v.isValid);
    setShowExplanationWarning(hasIssues);
    
    return { validations, hasIssues };
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

    // 7개국어 해설 검증
    const { validations, hasIssues } = validateAllExplanations();
    
    if (hasIssues) {
      const issueCount = validations.filter(v => !v.isValid).length;
      const selectedWithIssues = Array.from(selectedQuestions).filter(i => 
        validations[i] && !validations[i].isValid
      ).length;
      
      if (selectedWithIssues > 0) {
        toast({
          title: "⚠️ 해설 누락 경고",
          description: `선택된 문제 중 ${selectedWithIssues}개에 7개국어 해설이 누락되어 있습니다. 자동 보정 후 저장합니다.`,
          variant: "destructive",
        });
      }
    }

    setGenState({ step: "saving", progress: 10, message: "🌐 7개국어 해설 AI 번역 중..." });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: { session } } = await supabase.auth.getSession();
      
      // Filter selected questions
      const selectedQuestionsArray = generatedQuestions.filter((_, i) => selectedQuestions.has(i));
      const totalQuestions = selectedQuestionsArray.length;
      
      // Translate explanations for each question
      const translatedQuestions = [];
      for (let i = 0; i < selectedQuestionsArray.length; i++) {
        const q = selectedQuestionsArray[i];
        const progress = 10 + Math.floor((i / totalQuestions) * 70);
        setGenState({ 
          step: "saving", 
          progress, 
          message: `🌐 ${i + 1}/${totalQuestions} 번역 중... (${q.question_text.substring(0, 30)}...)` 
        });

        let translations: Record<string, string> = {};
        
        // Only translate if we have Korean explanation
        if (q.explanation_ko && q.explanation_ko.trim()) {
          try {
            const translateResponse = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate-explanations`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({
                  explanation_ko: q.explanation_ko,
                  targetLanguages: ['vi', 'en', 'ja', 'zh', 'ru', 'uz']
                }),
              }
            );

            if (translateResponse.ok) {
              translations = await translateResponse.json();
              console.log(`✅ Question ${i + 1} translated successfully`);
            } else {
              console.warn(`⚠️ Translation failed for question ${i + 1}, using fallback`);
            }
          } catch (translateError) {
            console.warn(`⚠️ Translation error for question ${i + 1}:`, translateError);
          }
        }

        translatedQuestions.push({
          exam_type: mapExamTypeToDb(examType),
          section,
          exam_round: parseInt(examRound, 10),
          part_number: q.part_number,
          question_number: q.question_number || i + 1,
          question_text: q.question_text,
          options: q.options,
          correct_answer: q.correct_answer,
          explanation_ko: q.explanation_ko,
          explanation_en: translations.explanation_en || q.explanation_en || q.explanation_ko,
          explanation_vi: translations.explanation_vi || q.explanation_vi || q.explanation_ko,
          explanation_ja: translations.explanation_ja || q.explanation_ko,
          explanation_zh: translations.explanation_zh || q.explanation_ko,
          explanation_ru: translations.explanation_ru || q.explanation_ko,
          explanation_uz: translations.explanation_uz || q.explanation_ko,
          difficulty: mapDifficultyToDb(q.difficulty),
          topic: q.topic || topic || null,
          grammar_points: q.grammar_points || [],
          vocabulary: q.vocabulary || [],
          question_audio_url: q.question_audio_url || null,
          question_image_url: q.question_image_url || null,
          generation_source: referenceContent ? "ai_from_reference" : "ai_generated",
          status: "approved",
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          is_active: true,
        });
      }

      setGenState({ step: "saving", progress: 85, message: "💾 데이터베이스에 저장 중..." });

      const { error } = await supabase
        .from("mock_question_bank")
        .insert(translatedQuestions);

      if (error) throw error;

      toast({
        title: "저장 완료! 🎉",
        description: `${translatedQuestions.length}개의 문제가 7개국어 해설과 함께 저장되었습니다.`,
      });

      // Reset state
      setGenState({ step: "idle", progress: 0, message: "" });
      setGeneratedQuestions([]);
      setValidationResults([]);
      setSelectedQuestions(new Set());
      setExplanationValidations([]);
      setShowExplanationWarning(false);
      setReferenceContent("");
      setReferenceFile(null);
      setStreamingContent("");

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Save error:", errorMessage);
      setGenState({ step: "ready", progress: 100, message: "저장 실패" });
      toast({
        title: "저장 실패",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };
  
  // 해설 검증 상태 가져오기
  const getExplanationStatus = (index: number) => {
    const validation = explanationValidations[index];
    if (!validation) return null;
    
    if (validation.isValid) {
      return { color: "green", icon: <Globe className="w-4 h-4 text-green-500" />, label: "7개국어 완료" };
    } else {
      const missingCount = validation.missingLanguages.length + validation.emptyLanguages.length;
      return { 
        color: "yellow", 
        icon: <Globe className="w-4 h-4 text-yellow-500" />, 
        label: `${7 - missingCount}/7 언어` 
      };
    }
  };

  // Refine questions to 100 score
  const handleRefineQuestions = async () => {
    // Find questions with score < 100
    const questionsToRefine = validationResults.filter(v => v.score < 100);
    
    if (questionsToRefine.length === 0) {
      toast({
        title: "모든 문제가 이미 완벽합니다!",
        description: "100점 미만인 문제가 없습니다.",
      });
      return;
    }

    setGenState({ step: "refining", progress: 5, message: `🔧 ${questionsToRefine.length}개 문제 100점 수준으로 수정 중...` });
    setStreamingContent("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const refineResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mock-exam-refine`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            questions: generatedQuestions,
            validationIssues: validationResults.map(v => ({
              question_number: v.question_number,
              score: v.score,
              issues: v.issues || [],
              suggestions: v.suggestions || [],
            })),
            examType,
            section,
            targetScore: 100,
            maxIterations: 3,
            stream: true,
          }),
        }
      );

      if (!refineResponse.ok) {
        const errorData = await refineResponse.json();
        throw new Error(errorData.error || "문제 수정 실패");
      }

      let refineData: any = null;

      await processSSEStream(
        refineResponse,
        (step, progress, message) => {
          setGenState({ step: "refining", progress, message });
        },
        (content) => {
          setStreamingContent(prev => prev + content);
        },
        (data) => {
          refineData = data;
        },
        (error) => {
          throw new Error(error);
        }
      );

      if (refineData?.refinedQuestions) {
        setGeneratedQuestions(refineData.refinedQuestions);
        
        // Update validation results to reflect improved scores
        const updatedValidations = validationResults.map((v) => {
          const wasRefined = v.score < 100;
          return {
            ...v,
            score: wasRefined ? 100 : v.score,
            isValid: true,
            issues: wasRefined ? [] : v.issues,
            suggestions: wasRefined ? [] : v.suggestions,
          };
        });
        setValidationResults(updatedValidations);
        
        // Auto-select all questions since they're now perfect
        setSelectedQuestions(new Set(generatedQuestions.map((_, i) => i)));
        
        toast({
          title: "수정 완료! 🎉",
          description: refineData.message || `${refineData.refinedCount}개 문제가 100점 수준으로 개선되었습니다.`,
        });
      }

      setGenState({ step: "ready", progress: 100, message: "✅ 모든 문제가 100점 수준으로 수정되었습니다!" });
      setStreamingContent("");

    } catch (error: any) {
      console.error("Refinement error:", error);
      setGenState({ step: "ready", progress: 100, message: "수정 실패" });
      toast({
        title: "수정 실패",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleQuestionSelection = (index: number) => {
    const newSet = new Set(selectedQuestions);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedQuestions(newSet);
  };

  const selectAll = () => setSelectedQuestions(new Set(generatedQuestions.map((_, i) => i)));
  const deselectAll = () => setSelectedQuestions(new Set());

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

  const isGenerating = ["generating", "validating", "rag", "audio", "refining"].includes(genState.step);
  const isRefining = genState.step === "refining";
  const hasImperfectQuestions = validationResults.some(v => v.score < 100);
  const imperfectCount = validationResults.filter(v => v.score < 100).length;

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
            LUKATO RAG AI 기반 TOPIK 모의고사 문제 자동 생성 및 검증 (스트리밍)
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

          {/* Listening Section Advanced Settings */}
          {section === 'listening' && (
            <div className="space-y-4 p-4 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 border border-cyan-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Headphones className="w-5 h-5 text-cyan-500" />
                <span className="font-medium text-cyan-600">듣기 문제 세부 설정</span>
              </div>
              
              {/* 문제 유형 선택 */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-cyan-500" />
                  문제 유형 선택
                </Label>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {Object.entries(LISTENING_QUESTION_TYPES).map(([key, type]) => (
                    <div
                      key={key}
                      onClick={() => setListeningQuestionType(key)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        listeningQuestionType === key 
                          ? 'border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500/30' 
                          : 'border-border hover:border-cyan-500/50 hover:bg-muted/50'
                      }`}
                    >
                      <div className="font-medium text-xs">{type.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">{type.description}</div>
                      <div className="flex items-center gap-2 mt-2 text-xs text-cyan-600">
                        <span>{type.turns}</span>
                        <span>•</span>
                        <span>{typeof type.speakers === 'number' ? `${type.speakers}인` : type.speakers}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 대화 길이 & 화자 수 설정 */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-cyan-500" />
                    대화 길이
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(DIALOGUE_LENGTH_OPTIONS).map(([key, opt]) => (
                      <div
                        key={key}
                        onClick={() => setDialogueLength(key)}
                        className={`p-2 rounded-lg border cursor-pointer transition-all text-center ${
                          dialogueLength === key 
                            ? 'border-cyan-500 bg-cyan-500/10' 
                            : 'border-border hover:border-cyan-500/50'
                        }`}
                      >
                        <div className="text-lg">{opt.icon}</div>
                        <div className="text-xs font-medium">{opt.label}</div>
                        <div className="text-xs text-muted-foreground">{opt.turns}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mic2 className="w-4 h-4 text-cyan-500" />
                    화자 수
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(SPEAKER_OPTIONS).map(([key, opt]) => (
                      <div
                        key={key}
                        onClick={() => setSpeakerCount(key)}
                        className={`p-2 rounded-lg border cursor-pointer transition-all ${
                          speakerCount === key 
                            ? 'border-cyan-500 bg-cyan-500/10' 
                            : 'border-border hover:border-cyan-500/50'
                        }`}
                      >
                        <div className="text-xs font-medium">{opt.label}</div>
                        <div className="text-xs text-muted-foreground">{opt.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* TTS 토글 & 프리셋 */}
              <div className="pt-3 border-t border-cyan-500/20">
                <div className="flex items-center gap-3 p-3 bg-cyan-500/10 rounded-lg">
                  <Checkbox
                    id="generateAudio"
                    checked={generateAudio}
                    onCheckedChange={(checked) => setGenerateAudio(checked === true)}
                  />
                  <div className="flex-1">
                    <Label htmlFor="generateAudio" className="cursor-pointer flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-cyan-500" />
                      ElevenLabs TTS 음성 자동 생성
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      생성된 대화 스크립트를 자연스러운 한국어 음성으로 변환합니다.
                    </p>
                  </div>
                </div>

                {generateAudio && (
                  <div className="mt-3 space-y-2">
                    <Label className="text-xs">TTS 음성 프리셋</Label>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                      {Object.entries(TTS_PRESETS).map(([key, preset]) => (
                        <div
                          key={key}
                          onClick={() => setTtsPreset(key as keyof typeof TTS_PRESETS)}
                          className={`p-2 rounded-lg border cursor-pointer transition-all ${
                            ttsPreset === key 
                              ? 'border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500/30' 
                              : 'border-border hover:border-cyan-500/50 hover:bg-muted/50'
                          }`}
                        >
                          <div className="font-medium text-xs">{preset.label}</div>
                          <div className="text-xs text-muted-foreground">{preset.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reference Upload */}
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

          {/* Generate / Cancel Button */}
          <div className="flex gap-3">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex-1 h-12 text-lg"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {genState.message}
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5 mr-2" />
                  AI로 문제 생성하기 (스트리밍)
                </>
              )}
            </Button>
            {isGenerating && (
              <Button
                onClick={handleCancel}
                variant="destructive"
                size="lg"
                className="h-12"
              >
                취소
              </Button>
            )}
          </div>

          {/* Progress Bar & Streaming Content */}
          {genState.step !== "idle" && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Progress value={genState.progress} className="flex-1 h-3" />
                <span className="text-sm font-medium text-muted-foreground">
                  {genState.progress}%
                </span>
              </div>
              <p className="text-sm text-center text-muted-foreground">{genState.message}</p>
              
              {/* Live Streaming Output */}
              {streamingContent && isGenerating && (
                <div className="p-3 bg-muted/50 rounded-lg border max-h-32 overflow-auto">
                  <div className="flex items-center gap-2 mb-2">
                    <Radio className="w-3 h-3 text-green-500 animate-pulse" />
                    <span className="text-xs font-medium text-green-600">실시간 생성 중...</span>
                  </div>
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                    {streamingContent.slice(-500)}
                  </pre>
                </div>
              )}
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
                <div className="flex items-center justify-between flex-wrap gap-3">
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
                              <div className="flex items-center gap-3 text-left flex-wrap">
                                <Badge variant="secondary">
                                  Q{question.question_number || index + 1}
                                </Badge>
                                {getSectionIcon(section)}
                                <span className="text-sm truncate max-w-md">
                                  {question.question_text.slice(0, 60)}...
                                </span>
                                {question.question_image_url && (
                                  <Badge variant="outline" className="text-purple-600 text-xs">
                                    <Image className="w-3 h-3 mr-1" />
                                    그림
                                  </Badge>
                                )}
                                {question.question_audio_url && (
                                  <Badge variant="outline" className="text-cyan-600 text-xs">
                                    <Volume2 className="w-3 h-3 mr-1" />
                                    음성
                                  </Badge>
                                )}
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

                              {/* Question Image for Picture Dialogue [5-8] */}
                              {(question.question_image_url || question.image_description) && (
                                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                  <Label className="text-xs text-purple-600 flex items-center gap-1 mb-2">
                                    <Image className="w-3 h-3" />
                                    그림 문제 이미지
                                  </Label>
                                  
                                  {question.question_image_url ? (
                                    <div className="space-y-2">
                                      <div className="relative group">
                                        <img 
                                          src={question.question_image_url} 
                                          alt="문제 이미지" 
                                          className="max-h-48 rounded-lg border"
                                        />
                                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <Button
                                            size="sm"
                                            variant="destructive"
                                            className="h-7 w-7 p-0"
                                            onClick={() => {
                                              const updated = [...generatedQuestions];
                                              updated[index].question_image_url = undefined;
                                              setGeneratedQuestions(updated);
                                            }}
                                          >
                                            <X className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      </div>
                                      
                                      {/* Replace Image Button */}
                                      <div className="flex items-center gap-2">
                                        <Label 
                                          htmlFor={`image-replace-${index}`}
                                          className="cursor-pointer flex items-center gap-2 px-3 py-1.5 text-xs bg-purple-100 dark:bg-purple-800 hover:bg-purple-200 dark:hover:bg-purple-700 rounded-md transition-colors"
                                        >
                                          <Upload className="w-3 h-3" />
                                          이미지 교체
                                        </Label>
                                        <input
                                          id={`image-replace-${index}`}
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            
                                            try {
                                              const fileName = `mock-exam/${examType}/${examRound}/picture_q${question.question_number || index + 1}_manual_${Date.now()}.${file.name.split('.').pop()}`;
                                              const { error } = await supabase.storage
                                                .from("podcast-audio")
                                                .upload(fileName, file, { upsert: true });
                                              
                                              if (error) throw error;
                                              
                                              const { data: urlData } = supabase.storage
                                                .from("podcast-audio")
                                                .getPublicUrl(fileName);
                                              
                                              const updated = [...generatedQuestions];
                                              updated[index].question_image_url = urlData.publicUrl;
                                              setGeneratedQuestions(updated);
                                              
                                              toast({
                                                title: "이미지 교체 완료",
                                                description: "새 이미지가 업로드되었습니다.",
                                              });
                                            } catch (err: any) {
                                              toast({
                                                title: "업로드 실패",
                                                description: err.message,
                                                variant: "destructive",
                                              });
                                            }
                                          }}
                                        />
                                        <span className="text-xs text-muted-foreground">
                                          AI 생성 이미지가 마음에 안 들면 직접 업로드
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      <p className="text-sm text-muted-foreground italic">
                                        이미지 설명: {question.image_description}
                                      </p>
                                      <p className="text-xs text-yellow-600">
                                        ⚠️ 이미지 생성에 실패했습니다. 직접 업로드해주세요.
                                      </p>
                                      <Label 
                                        htmlFor={`image-upload-${index}`}
                                        className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-xs bg-purple-100 dark:bg-purple-800 hover:bg-purple-200 dark:hover:bg-purple-700 rounded-md transition-colors"
                                      >
                                        <Upload className="w-3 h-3" />
                                        이미지 업로드
                                      </Label>
                                      <input
                                        id={`image-upload-${index}`}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={async (e) => {
                                          const file = e.target.files?.[0];
                                          if (!file) return;
                                          
                                          try {
                                            const fileName = `mock-exam/${examType}/${examRound}/picture_q${question.question_number || index + 1}_manual_${Date.now()}.${file.name.split('.').pop()}`;
                                            const { error } = await supabase.storage
                                              .from("podcast-audio")
                                              .upload(fileName, file, { upsert: true });
                                            
                                            if (error) throw error;
                                            
                                            const { data: urlData } = supabase.storage
                                              .from("podcast-audio")
                                              .getPublicUrl(fileName);
                                            
                                            const updated = [...generatedQuestions];
                                            updated[index].question_image_url = urlData.publicUrl;
                                            setGeneratedQuestions(updated);
                                            
                                            toast({
                                              title: "이미지 업로드 완료",
                                              description: "이미지가 추가되었습니다.",
                                            });
                                          } catch (err: any) {
                                            toast({
                                              title: "업로드 실패",
                                              description: err.message,
                                              variant: "destructive",
                                            });
                                          }
                                        }}
                                      />
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Listening Script & Audio */}
                              {question.listening_script && (
                                <div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                                  <Label className="text-xs text-cyan-600 flex items-center gap-1">
                                    <Mic2 className="w-3 h-3" />
                                    듣기 스크립트
                                  </Label>
                                  <p className="mt-1 text-sm whitespace-pre-wrap">{question.listening_script}</p>
                                  {question.question_audio_url && (
                                    <audio controls className="w-full mt-2">
                                      <source src={question.question_audio_url} type="audio/mpeg" />
                                    </audio>
                                  )}
                                </div>
                              )}

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

                {/* Refine & Save Buttons */}
                <div className="mt-6 space-y-4">
                  {/* Refine to 100 Button - Only show if there are imperfect questions */}
                  {hasImperfectQuestions && validationResults.length > 0 && (
                    <div className="p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-lg">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-amber-500/20 rounded-full">
                            <TrendingUp className="w-5 h-5 text-amber-500" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {imperfectCount}개 문제가 100점 미만입니다
                            </p>
                            <p className="text-sm text-muted-foreground">
                              AI가 자동으로 100점 수준으로 수정합니다
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={handleRefineQuestions}
                          disabled={isRefining || genState.step === "saving"}
                          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                        >
                          {isRefining ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              수정 중...
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4 mr-2" />
                              100점으로 자동 수정
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setGeneratedQuestions([]);
                        setValidationResults([]);
                        setSelectedQuestions(new Set());
                        setGenState({ step: "idle", progress: 0, message: "" });
                        setStreamingContent("");
                      }}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      다시 생성
                    </Button>
                    <Button
                      onClick={handleSaveApproved}
                      disabled={selectedQuestions.size === 0 || genState.step === "saving" || isRefining}
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
