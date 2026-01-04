import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Loader2, Upload, Headphones, PenLine, BookOpen, 
  Save, Image, Volume2, CheckCircle, Languages
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type SectionType = "listening" | "writing" | "reading";
type WritingType = "51" | "52" | "53" | "54";

// ============ 파싱 유틸리티 ============

interface ParsedListeningQuestion {
  questionText: string;
  options: string[];
  correctAnswer: number;
  explanationKo: string;
}

function parseListeningRawText(rawText: string): ParsedListeningQuestion | null {
  const lines = rawText.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 5) return null;

  let questionText = "";
  const options: string[] = [];
  let correctAnswer = 1;
  let explanationKo = "";
  let explanationStartIdx = -1;

  // 문제 텍스트 추출 (첫 번째 줄 또는 [문제] 이후)
  let questionStartIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('[문제]') || lines[i].includes('【문제】')) {
      questionStartIdx = i;
      break;
    }
  }

  // 선택지 시작 전까지가 문제
  for (let i = questionStartIdx; i < lines.length; i++) {
    const line = lines[i];
    const optionMatch = line.match(/^[①②③④⑤]|^[1-5][.)]\s/);
    
    if (optionMatch) {
      if (!questionText) {
        questionText = lines.slice(questionStartIdx, i).join('\n').replace(/^\[문제\]\s*/i, '').replace(/^【문제】\s*/i, '').trim();
      }
      
      // 정답 마킹 체크
      if (line.includes('★') || line.includes('(정답)') || line.includes('[정답]') || line.includes('✓') || line.includes('●')) {
        correctAnswer = options.length + 1;
      }
      
      const cleanOption = line
        .replace(/^[①②③④⑤1-5][.)]\s*/, '')
        .replace(/[★✓●]/g, '')
        .replace(/\(정답\)|\[정답\]/g, '')
        .trim();
      
      if (options.length < 4) {
        options.push(cleanOption);
      }
      continue;
    }
    
    // 해설 시작점
    if (line.includes('해설') || line.includes('[해설]') || line.includes('【해설】') || line.includes('정답:') || line.includes('풀이')) {
      explanationStartIdx = i;
      break;
    }
  }

  // 문제 텍스트가 없으면 첫 줄 사용
  if (!questionText) {
    questionText = lines[0];
  }

  // 해설 추출
  if (explanationStartIdx > 0) {
    explanationKo = lines.slice(explanationStartIdx)
      .join('\n')
      .replace(/^\[해설\]\s*/i, '')
      .replace(/^【해설】\s*/i, '')
      .replace(/^해설[:\s]*/i, '')
      .replace(/^정답[:\s]*/i, '')
      .replace(/^풀이[:\s]*/i, '')
      .trim();
  }

  // 옵션이 4개 미만이면 실패
  if (options.length < 4) {
    // 기본 줄 기반 추출 시도
    for (let i = 1; i < Math.min(5, lines.length); i++) {
      if (options.length < 4 && !lines[i].includes('해설')) {
        options.push(lines[i].replace(/^[①②③④⑤1-5][.)]\s*/, '').trim());
      }
    }
  }

  return {
    questionText,
    options: options.slice(0, 4),
    correctAnswer,
    explanationKo
  };
}

interface ParsedReadingQuestion {
  passage: string;
  questionText: string;
  options: string[];
  correctAnswer: number;
  explanationKo: string;
}

function parseReadingRawText(rawText: string): ParsedReadingQuestion | null {
  // 지문과 문제 분리 (빈 줄 또는 [지문], [문제] 태그로)
  let passage = "";
  let questionText = "";
  const options: string[] = [];
  let correctAnswer = 1;
  let explanationKo = "";

  // [지문], [문제], [해설] 태그 기반 파싱
  const passageMatch = rawText.match(/\[지문\]([\s\S]*?)(?=\[문제\]|\[선택지\]|①|❶|1\))/i);
  const questionMatch = rawText.match(/\[문제\]([\s\S]*?)(?=①|❶|1\)|$)/i);
  
  if (passageMatch) {
    passage = passageMatch[1].trim();
  }
  
  if (questionMatch) {
    questionText = questionMatch[1].trim();
  }

  // 태그 없으면 빈 줄로 분리
  if (!passage && !questionText) {
    const sections = rawText.split(/\n{2,}/);
    if (sections.length >= 2) {
      passage = sections[0].trim();
      const restText = sections.slice(1).join('\n');
      const lines = restText.split('\n').filter(l => l.trim());
      questionText = lines[0] || "";
    }
  }

  // 선택지 및 정답 추출
  const lines = rawText.split('\n').map(l => l.trim());
  let explanationStartIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const optionMatch = line.match(/^[①②③④⑤]|^[1-5][.)]\s/);
    
    if (optionMatch && options.length < 4) {
      if (line.includes('★') || line.includes('(정답)') || line.includes('[정답]') || line.includes('✓') || line.includes('●')) {
        correctAnswer = options.length + 1;
      }
      
      const cleanOption = line
        .replace(/^[①②③④⑤1-5][.)]\s*/, '')
        .replace(/[★✓●]/g, '')
        .replace(/\(정답\)|\[정답\]/g, '')
        .trim();
      options.push(cleanOption);
    }
    
    if (line.includes('[해설]') || line.includes('【해설】') || line.includes('해설:')) {
      explanationStartIdx = i;
    }
  }

  // 해설 추출
  if (explanationStartIdx > 0) {
    explanationKo = lines.slice(explanationStartIdx)
      .join('\n')
      .replace(/^\[해설\]\s*/i, '')
      .replace(/^【해설】\s*/i, '')
      .replace(/^해설[:\s]*/i, '')
      .trim();
  }

  // questionText 없으면 지문 다음 줄에서 추출
  if (!questionText && passage) {
    const passageEndIdx = rawText.indexOf(passage) + passage.length;
    const afterPassage = rawText.slice(passageEndIdx).trim();
    const firstLine = afterPassage.split('\n').find(l => l.trim() && !l.match(/^[①②③④⑤1-5]/));
    questionText = firstLine?.replace(/^\[문제\]\s*/i, '').trim() || "다음 글을 읽고 물음에 답하십시오.";
  }

  return {
    passage,
    questionText,
    options: options.slice(0, 4),
    correctAnswer,
    explanationKo
  };
}

interface ParsedWritingQuestion {
  questionText: string;
  modelAnswer: string;
  expertTip: string;
}

function parseWritingRawText(rawText: string): ParsedWritingQuestion {
  let questionText = "";
  let modelAnswer = "";
  let expertTip = "";

  // [문제], [모범답안], [전문가TIP] 태그 기반 파싱
  const questionMatch = rawText.match(/\[문제\]([\s\S]*?)(?=\[모범답안\]|\[답안\]|\[전문가|$)/i);
  const answerMatch = rawText.match(/\[모범답안\]|\[답안\]([\s\S]*?)(?=\[전문가|$)/i);
  const tipMatch = rawText.match(/\[전문가\s*TIP\]|\[TIP\]([\s\S]*?)$/i);

  if (questionMatch) {
    questionText = questionMatch[1]?.trim() || "";
  }
  
  // 모범답안 추출 개선
  const answerStart = rawText.indexOf('[모범답안]');
  const answerStart2 = rawText.indexOf('[답안]');
  const startIdx = answerStart !== -1 ? answerStart : answerStart2;
  
  if (startIdx !== -1) {
    const afterStart = rawText.slice(startIdx);
    const tipIdx = afterStart.search(/\[전문가\s*TIP\]|\[TIP\]/i);
    const answerSection = tipIdx !== -1 ? afterStart.slice(0, tipIdx) : afterStart;
    modelAnswer = answerSection.replace(/^\[모범답안\]\s*|\[답안\]\s*/i, '').trim();
  }

  // 전문가 TIP 추출
  const tipStart = rawText.search(/\[전문가\s*TIP\]|\[TIP\]/i);
  if (tipStart !== -1) {
    expertTip = rawText.slice(tipStart).replace(/^\[전문가\s*TIP\]\s*|\[TIP\]\s*/i, '').trim();
  }

  // 태그 없으면 빈 줄로 분리
  if (!questionText) {
    const sections = rawText.split(/\n{2,}/);
    questionText = sections[0]?.trim() || rawText.trim();
    if (sections.length > 1) modelAnswer = sections[1]?.trim() || "";
    if (sections.length > 2) expertTip = sections[2]?.trim() || "";
  }

  return { questionText, modelAnswer, expertTip };
}

// ============ 7개국어 자동 번역 ============
async function translateToAllLanguages(koreanText: string): Promise<Record<string, string>> {
  const defaultResult = { ko: koreanText, vi: "", en: "", ja: "", zh: "", ru: "", uz: "" };
  
  if (!koreanText.trim()) return defaultResult;

  try {
    const { data, error } = await supabase.functions.invoke('translate-all-languages', {
      body: { text: koreanText }
    });

    if (error) {
      console.error('Translation error:', error);
      return defaultResult;
    }

    return {
      ko: koreanText,
      vi: data?.vi || "",
      en: data?.en || "",
      ja: data?.ja || "",
      zh: data?.zh || "",
      ru: data?.ru || "",
      uz: data?.uz || "",
    };
  } catch (err) {
    console.error('Translation failed:', err);
    return defaultResult;
  }
}

// ============ 메인 컴포넌트 ============
const MockExamManualUpload = () => {
  const [section, setSection] = useState<SectionType>("listening");
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  
  // 공통 설정
  const [examType, setExamType] = useState("TOPIK_I");
  const [partNumber, setPartNumber] = useState(1);
  const [writingType, setWritingType] = useState<WritingType>("51");
  
  // 통합 텍스트 입력
  const [listeningRawText, setListeningRawText] = useState("");
  const [listeningAudioUrl, setListeningAudioUrl] = useState("");
  const [listeningAudioFile, setListeningAudioFile] = useState<File | null>(null);
  
  const [writingRawText, setWritingRawText] = useState("");
  const [writingImageUrl, setWritingImageUrl] = useState("");
  const [writingImageFile, setWritingImageFile] = useState<File | null>(null);
  
  const [readingRawText, setReadingRawText] = useState("");

  // 오디오 업로드
  const handleAudioUpload = async (file: File) => {
    try {
      const fileName = `listening/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage
        .from("mock-exam-audio")
        .upload(fileName, file);
      
      if (error) throw error;
      
      const { data: urlData } = supabase.storage
        .from("mock-exam-audio")
        .getPublicUrl(fileName);
      
      setListeningAudioFile(file);
      setListeningAudioUrl(urlData.publicUrl);
      toast.success("음성 파일 업로드 완료");
    } catch (error: any) {
      console.error("Audio upload error:", error);
      toast.error("업로드 실패: " + error.message);
    }
  };

  // 이미지 업로드 (53번용)
  const handleImageUpload = async (file: File) => {
    try {
      const fileName = `writing/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage
        .from("mock-exam-images")
        .upload(fileName, file);
      
      if (error) throw error;
      
      const { data: urlData } = supabase.storage
        .from("mock-exam-images")
        .getPublicUrl(fileName);
      
      setWritingImageFile(file);
      setWritingImageUrl(urlData.publicUrl);
      toast.success("이미지 업로드 완료");
    } catch (error: any) {
      console.error("Image upload error:", error);
      toast.error("업로드 실패: " + error.message);
    }
  };

  // ============ 듣기 문제 저장 ============
  const saveListeningQuestion = async () => {
    const parsed = parseListeningRawText(listeningRawText);
    
    if (!parsed || parsed.options.length < 4) {
      toast.error("문제 형식을 확인해주세요. 문제, 4개 선택지가 필요합니다.");
      return;
    }

    setSaving(true);
    setTranslating(true);

    try {
      // ========== 중복 검사 (저장 전) ==========
      toast.info("중복 검사 중...");
      const { data: existingQuestions, error: fetchError } = await supabase
        .from("mock_question_bank")
        .select("id, instruction_text, question_text, options, correct_answer")
        .eq("section", "listening")
        .eq("exam_type", examType)
        .eq("is_active", true);

      if (fetchError) {
        console.warn("기존 문제 조회 실패 (중복 검사 스킵):", fetchError.message);
      }

      // 현재 문제의 정규화 키 생성
      const newKey = [
        '', // instruction_text (manual upload에서는 비어있음)
        String(parsed.questionText ?? '').replace(/\s+/g, ' ').trim().toLowerCase(),
        JSON.stringify(parsed.options ?? []),
        String(parsed.correctAnswer ?? ''),
      ].join('|||');

      // 기존 문제와 비교
      if (existingQuestions) {
        for (const eq of existingQuestions) {
          const existingKey = [
            String(eq.instruction_text ?? '').replace(/\s+/g, ' ').trim().toLowerCase(),
            String(eq.question_text ?? '').replace(/\s+/g, ' ').trim().toLowerCase(),
            JSON.stringify(eq.options ?? []),
            String(eq.correct_answer ?? ''),
          ].join('|||');

          if (existingKey === newKey) {
            setSaving(false);
            setTranslating(false);
            toast.error("❌ 이미 동일한 문제가 DB에 존재합니다. 저장을 취소합니다.");
            return;
          }
        }
      }

      // 7개국어 번역
      toast.info("해설을 7개국어로 번역 중...");
      const translations = await translateToAllLanguages(parsed.explanationKo);
      setTranslating(false);

      const { error } = await supabase.from("mock_question_bank").insert({
        exam_type: examType,
        section: "listening",
        part_number: partNumber,
        question_text: parsed.questionText,
        options: parsed.options,
        correct_answer: parsed.correctAnswer,
        question_audio_url: listeningAudioUrl || null,
        explanation_ko: translations.ko || null,
        explanation_vi: translations.vi || null,
        explanation_en: translations.en || null,
        explanation_ja: translations.ja || null,
        explanation_zh: translations.zh || null,
        explanation_ru: translations.ru || null,
        explanation_uz: translations.uz || null,
        is_active: true,
        status: "approved",
        generation_source: "manual",
      });
      
      if (error) throw error;
      
      toast.success("✅ 듣기 문제 저장 완료 (7개국어 번역됨)");
      setListeningRawText("");
      setListeningAudioUrl("");
      setListeningAudioFile(null);
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("저장 실패: " + error.message);
    } finally {
      setSaving(false);
      setTranslating(false);
    }
  };

  // ============ 쓰기 문제 저장 ============
  const saveWritingQuestion = async () => {
    const parsed = parseWritingRawText(writingRawText);
    
    if (!parsed.questionText) {
      toast.error("문제 내용을 입력해주세요.");
      return;
    }

    setSaving(true);
    setTranslating(true);

    try {
      // ========== 중복 검사 (저장 전) ==========
      toast.info("중복 검사 중...");
      const { data: existingQuestions, error: fetchError } = await supabase
        .from("mock_question_bank")
        .select("id, instruction_text, question_text, options, correct_answer")
        .eq("section", "writing")
        .eq("exam_type", "TOPIK_II")
        .eq("is_active", true);

      if (fetchError) {
        console.warn("기존 문제 조회 실패 (중복 검사 스킵):", fetchError.message);
      }

      // 현재 문제의 정규화 키 생성
      const newKey = [
        '',
        String(parsed.questionText ?? '').replace(/\s+/g, ' ').trim().toLowerCase(),
        JSON.stringify(parsed.modelAnswer ? [parsed.modelAnswer] : []),
        '0',
      ].join('|||');

      // 기존 문제와 비교
      if (existingQuestions) {
        for (const eq of existingQuestions) {
          const existingKey = [
            String(eq.instruction_text ?? '').replace(/\s+/g, ' ').trim().toLowerCase(),
            String(eq.question_text ?? '').replace(/\s+/g, ' ').trim().toLowerCase(),
            JSON.stringify(eq.options ?? []),
            String(eq.correct_answer ?? ''),
          ].join('|||');

          if (existingKey === newKey) {
            setSaving(false);
            setTranslating(false);
            toast.error("❌ 이미 동일한 쓰기 문제가 DB에 존재합니다. 저장을 취소합니다.");
            return;
          }
        }
      }

      // 모범답안 + 전문가TIP을 해설로 합침
      const fullExplanation = [
        parsed.modelAnswer ? `[모범답안]\n${parsed.modelAnswer}` : '',
        parsed.expertTip ? `[전문가 TIP]\n${parsed.expertTip}` : '',
      ].filter(Boolean).join('\n\n');

      toast.info("해설을 7개국어로 번역 중...");
      const translations = await translateToAllLanguages(fullExplanation);
      setTranslating(false);

      const { error } = await supabase.from("mock_question_bank").insert({
        exam_type: "TOPIK_II",
        section: "writing",
        part_number: parseInt(writingType),
        question_text: parsed.questionText,
        options: parsed.modelAnswer ? [parsed.modelAnswer] : [],
        correct_answer: 0,
        question_image_url: writingType === "53" ? writingImageUrl || null : null,
        explanation_ko: translations.ko || null,
        explanation_vi: translations.vi || null,
        explanation_en: translations.en || null,
        explanation_ja: translations.ja || null,
        explanation_zh: translations.zh || null,
        explanation_ru: translations.ru || null,
        explanation_uz: translations.uz || null,
        is_active: true,
        status: "approved",
        generation_source: "manual",
        topic: `writing_${writingType}`,
      });
      
      if (error) throw error;
      
      toast.success(`✅ 쓰기 ${writingType}번 저장 완료 (7개국어 번역됨)`);
      setWritingRawText("");
      setWritingImageUrl("");
      setWritingImageFile(null);
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("저장 실패: " + error.message);
    } finally {
      setSaving(false);
      setTranslating(false);
    }
  };

  // ============ 읽기 문제 저장 ============
  const saveReadingQuestion = async () => {
    const parsed = parseReadingRawText(readingRawText);
    
    if (!parsed || parsed.options.length < 4) {
      toast.error("문제 형식을 확인해주세요. 지문, 문제, 4개 선택지가 필요합니다.");
      return;
    }

    setSaving(true);
    setTranslating(true);

    try {
      // 지문 + 문제 합침 (중복 검사용)
      const fullQuestion = parsed.passage 
        ? `[지문]\n${parsed.passage}\n\n[문제]\n${parsed.questionText}`
        : parsed.questionText;

      // ========== 중복 검사 (저장 전) ==========
      toast.info("중복 검사 중...");
      const { data: existingQuestions, error: fetchError } = await supabase
        .from("mock_question_bank")
        .select("id, instruction_text, question_text, options, correct_answer")
        .eq("section", "reading")
        .eq("exam_type", examType)
        .eq("is_active", true);

      if (fetchError) {
        console.warn("기존 문제 조회 실패 (중복 검사 스킵):", fetchError.message);
      }

      // 현재 문제의 정규화 키 생성
      const newKey = [
        '',
        String(fullQuestion ?? '').replace(/\s+/g, ' ').trim().toLowerCase(),
        JSON.stringify(parsed.options ?? []),
        String(parsed.correctAnswer ?? ''),
      ].join('|||');

      // 기존 문제와 비교
      if (existingQuestions) {
        for (const eq of existingQuestions) {
          const existingKey = [
            String(eq.instruction_text ?? '').replace(/\s+/g, ' ').trim().toLowerCase(),
            String(eq.question_text ?? '').replace(/\s+/g, ' ').trim().toLowerCase(),
            JSON.stringify(eq.options ?? []),
            String(eq.correct_answer ?? ''),
          ].join('|||');

          if (existingKey === newKey) {
            setSaving(false);
            setTranslating(false);
            toast.error("❌ 이미 동일한 읽기 문제가 DB에 존재합니다. 저장을 취소합니다.");
            return;
          }
        }
      }

      toast.info("해설을 7개국어로 번역 중...");
      const translations = await translateToAllLanguages(parsed.explanationKo);
      setTranslating(false);

      const { error } = await supabase.from("mock_question_bank").insert({
        exam_type: examType,
        section: "reading",
        part_number: partNumber,
        question_text: fullQuestion,
        options: parsed.options,
        correct_answer: parsed.correctAnswer,
        explanation_ko: translations.ko || null,
        explanation_vi: translations.vi || null,
        explanation_en: translations.en || null,
        explanation_ja: translations.ja || null,
        explanation_zh: translations.zh || null,
        explanation_ru: translations.ru || null,
        explanation_uz: translations.uz || null,
        is_active: true,
        status: "approved",
        generation_source: "manual",
      });
      
      if (error) throw error;
      
      toast.success("✅ 읽기 문제 저장 완료 (7개국어 번역됨)");
      setReadingRawText("");
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("저장 실패: " + error.message);
    } finally {
      setSaving(false);
      setTranslating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            모의고사 수동 업로드
          </CardTitle>
          <CardDescription className="space-y-1">
            <p>문제+선택지+해설을 한 번에 복붙하세요.</p>
            <p className="text-primary flex items-center gap-1">
              <Languages className="w-4 h-4" />
              한국어 해설만 입력하면 7개국어 자동 번역됩니다.
            </p>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={section} onValueChange={(v) => setSection(v as SectionType)}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="listening" className="flex items-center gap-2">
                <Headphones className="w-4 h-4" />
                듣기
              </TabsTrigger>
              <TabsTrigger value="writing" className="flex items-center gap-2">
                <PenLine className="w-4 h-4" />
                쓰기
              </TabsTrigger>
              <TabsTrigger value="reading" className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                읽기
              </TabsTrigger>
            </TabsList>

            {/* ===== 듣기 탭 ===== */}
            <TabsContent value="listening">
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>시험 유형</Label>
                    <Select value={examType} onValueChange={setExamType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TOPIK_I">TOPIK I (1-2급)</SelectItem>
                        <SelectItem value="TOPIK_II">TOPIK II (3-6급)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>파트 번호</Label>
                    <Select value={partNumber.toString()} onValueChange={(v) => setPartNumber(parseInt(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 30 }, (_, i) => i + 1).map(n => (
                          <SelectItem key={n} value={n.toString()}>파트 {n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 음성 파일 */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4" />
                    음성 파일
                  </Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleAudioUpload(file);
                      }}
                      className="flex-1"
                    />
                    {listeningAudioUrl && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <audio src={listeningAudioUrl} controls className="h-8" />
                      </div>
                    )}
                  </div>
                </div>

                {/* 통합 입력 */}
                <div className="space-y-2">
                  <Label>📝 문제 + 선택지 + 해설 (한 번에 복붙)</Label>
                  <Textarea
                    placeholder={`예시 형식:

다음을 듣고 알맞은 것을 고르십시오.

① 학교에 갑니다
② 집에 갑니다 ★
③ 회사에 갑니다
④ 시장에 갑니다

[해설]
대화에서 "집에 가요"라고 했으므로 정답은 ②번입니다.

---
★ 또는 (정답)으로 정답 표시
해설은 한국어로만 작성 → 7개국어 자동 번역`}
                    value={listeningRawText}
                    onChange={(e) => setListeningRawText(e.target.value)}
                    className="min-h-[350px] font-mono text-sm"
                  />
                </div>

                <Button 
                  onClick={saveListeningQuestion} 
                  disabled={saving || !listeningRawText.trim()}
                  className="w-full"
                  size="lg"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {translating ? "7개국어 번역 중..." : "저장 중..."}
                    </>
                  ) : (
                    <>
                      <Languages className="w-4 h-4 mr-2" />
                      듣기 문제 저장 (7개국어 자동번역)
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            {/* ===== 쓰기 탭 ===== */}
            <TabsContent value="writing">
              <div className="space-y-6">
                {/* 문제 유형 선택 */}
                <div className="space-y-2">
                  <Label>문제 유형</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {(["51", "52", "53", "54"] as WritingType[]).map((type) => (
                      <Button
                        key={type}
                        variant={writingType === type ? "default" : "outline"}
                        onClick={() => setWritingType(type)}
                        className="flex flex-col items-center py-4 h-auto"
                      >
                        <span className="text-lg font-bold">{type}번</span>
                        <span className="text-xs opacity-70">
                          {type === "51" && "빈칸 완성"}
                          {type === "52" && "빈칸 완성"}
                          {type === "53" && "도표 설명"}
                          {type === "54" && "논술형"}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* 53번 이미지 업로드 */}
                <AnimatePresence>
                  {writingType === "53" && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2"
                    >
                      <Label className="flex items-center gap-2">
                        <Image className="w-4 h-4" />
                        도표/그래프 이미지 (53번 전용)
                      </Label>
                      <div className="flex items-center gap-4">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file);
                          }}
                          className="flex-1"
                        />
                        {writingImageUrl && (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <img src={writingImageUrl} alt="Preview" className="h-16 rounded border" />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 통합 입력 */}
                <div className="space-y-2">
                  <Label>📝 문제 + 모범답안 + 전문가TIP (한 번에 복붙)</Label>
                  <Textarea
                    placeholder={`예시 형식:

[문제]
다음 그래프를 보고 한국인의 여가 활동 변화에 대해 200~300자로 쓰십시오.

[모범답안]
위 그래프는 2020년과 2024년의 한국인 여가 활동 변화를 보여줍니다. 
2020년에는 영화 감상이 35%로 가장 높았으나...

[전문가 TIP]
- 도입부에서 그래프의 주제를 명확히 제시하세요.
- 수치 변화를 구체적으로 언급하세요.
- 결론에서 전체적인 추이를 요약하세요.

---
한국어로만 작성 → 7개국어 자동 번역`}
                    value={writingRawText}
                    onChange={(e) => setWritingRawText(e.target.value)}
                    className="min-h-[400px] font-mono text-sm"
                  />
                </div>

                <Button 
                  onClick={saveWritingQuestion} 
                  disabled={saving || !writingRawText.trim()}
                  className="w-full"
                  size="lg"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {translating ? "7개국어 번역 중..." : "저장 중..."}
                    </>
                  ) : (
                    <>
                      <Languages className="w-4 h-4 mr-2" />
                      쓰기 {writingType}번 저장 (7개국어 자동번역)
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            {/* ===== 읽기 탭 ===== */}
            <TabsContent value="reading">
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>시험 유형</Label>
                    <Select value={examType} onValueChange={setExamType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TOPIK_I">TOPIK I (1-2급)</SelectItem>
                        <SelectItem value="TOPIK_II">TOPIK II (3-6급)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>파트 번호</Label>
                    <Select value={partNumber.toString()} onValueChange={(v) => setPartNumber(parseInt(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 50 }, (_, i) => i + 1).map(n => (
                          <SelectItem key={n} value={n.toString()}>파트 {n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 통합 입력 */}
                <div className="space-y-2">
                  <Label>📝 지문 + 문제 + 선택지 + 해설 (한 번에 복붙)</Label>
                  <Textarea
                    placeholder={`예시 형식:

[지문]
한국어 수업이 끝난 후 친구들과 함께 학교 앞 식당에 갔습니다. 
우리는 비빔밥과 된장찌개를 주문했습니다. 
음식이 맛있어서 모두 기분이 좋았습니다.

[문제]
이 글의 내용과 같은 것을 고르십시오.

① 혼자서 식당에 갔습니다
② 친구들과 함께 식당에 갔습니다 ★
③ 학교에서 점심을 먹었습니다
④ 음식이 맛이 없었습니다

[해설]
지문에서 "친구들과 함께 학교 앞 식당에 갔습니다"라고 했으므로 정답은 ②번입니다.

---
지문과 문제 사이에 빈 줄 넣기. ★로 정답 표시.
해설은 한국어 → 7개국어 자동 번역`}
                    value={readingRawText}
                    onChange={(e) => setReadingRawText(e.target.value)}
                    className="min-h-[450px] font-mono text-sm"
                  />
                </div>

                <Button 
                  onClick={saveReadingQuestion} 
                  disabled={saving || !readingRawText.trim()}
                  className="w-full"
                  size="lg"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {translating ? "7개국어 번역 중..." : "저장 중..."}
                    </>
                  ) : (
                    <>
                      <Languages className="w-4 h-4 mr-2" />
                      읽기 문제 저장 (7개국어 자동번역)
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default MockExamManualUpload;
