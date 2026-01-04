import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, Upload, Headphones, PenLine, BookOpen, 
  Save, Trash2, Plus, Image, Volume2, CheckCircle,
  FileText, Lightbulb
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type SectionType = "listening" | "writing" | "reading";
type WritingType = "51" | "52" | "53" | "54";

interface ListeningQuestion {
  examType: string;
  partNumber: number;
  questionText: string;
  options: string[];
  correctAnswer: number;
  explanationKo: string;
  explanationVi: string;
  explanationEn: string;
  audioFile: File | null;
  audioUrl: string;
}

interface WritingQuestion {
  examType: string;
  questionType: WritingType;
  questionText: string;
  modelAnswer: string;
  expertTip: string;
  imageFile: File | null;
  imageUrl: string;
  explanationKo: string;
  explanationVi: string;
  explanationEn: string;
}

interface ReadingQuestion {
  examType: string;
  partNumber: number;
  passage: string;
  questionText: string;
  options: string[];
  correctAnswer: number;
  explanationKo: string;
  explanationVi: string;
  explanationEn: string;
}

const MockExamManualUpload = () => {
  const { toast } = useToast();
  const [section, setSection] = useState<SectionType>("listening");
  const [saving, setSaving] = useState(false);
  
  // Listening state
  const [listeningData, setListeningData] = useState<ListeningQuestion>({
    examType: "TOPIK_I",
    partNumber: 1,
    questionText: "",
    options: ["", "", "", ""],
    correctAnswer: 1,
    explanationKo: "",
    explanationVi: "",
    explanationEn: "",
    audioFile: null,
    audioUrl: "",
  });
  
  // Writing state
  const [writingType, setWritingType] = useState<WritingType>("51");
  const [writingData, setWritingData] = useState<WritingQuestion>({
    examType: "TOPIK_II",
    questionType: "51",
    questionText: "",
    modelAnswer: "",
    expertTip: "",
    imageFile: null,
    imageUrl: "",
    explanationKo: "",
    explanationVi: "",
    explanationEn: "",
  });
  
  // Reading state
  const [readingData, setReadingData] = useState<ReadingQuestion>({
    examType: "TOPIK_I",
    partNumber: 1,
    passage: "",
    questionText: "",
    options: ["", "", "", ""],
    correctAnswer: 1,
    explanationKo: "",
    explanationVi: "",
    explanationEn: "",
  });

  // Handle audio file upload
  const handleAudioUpload = async (file: File) => {
    try {
      const fileName = `listening/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from("mock-exam-audio")
        .upload(fileName, file);
      
      if (error) throw error;
      
      const { data: urlData } = supabase.storage
        .from("mock-exam-audio")
        .getPublicUrl(fileName);
      
      setListeningData(prev => ({
        ...prev,
        audioFile: file,
        audioUrl: urlData.publicUrl,
      }));
      
      toast({
        title: "음성 파일 업로드 완료",
        description: file.name,
      });
    } catch (error: any) {
      console.error("Audio upload error:", error);
      toast({
        title: "업로드 실패",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Handle image file upload (for Q53)
  const handleImageUpload = async (file: File) => {
    try {
      const fileName = `writing/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from("mock-exam-images")
        .upload(fileName, file);
      
      if (error) throw error;
      
      const { data: urlData } = supabase.storage
        .from("mock-exam-images")
        .getPublicUrl(fileName);
      
      setWritingData(prev => ({
        ...prev,
        imageFile: file,
        imageUrl: urlData.publicUrl,
      }));
      
      toast({
        title: "이미지 업로드 완료",
        description: file.name,
      });
    } catch (error: any) {
      console.error("Image upload error:", error);
      toast({
        title: "업로드 실패",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Save listening question
  const saveListeningQuestion = async () => {
    if (!listeningData.questionText.trim()) {
      toast({ title: "문제를 입력해주세요", variant: "destructive" });
      return;
    }
    if (listeningData.options.some(o => !o.trim())) {
      toast({ title: "모든 선택지를 입력해주세요", variant: "destructive" });
      return;
    }
    
    setSaving(true);
    try {
      const { error } = await supabase.from("mock_question_bank").insert({
        exam_type: listeningData.examType,
        section: "listening",
        part_number: listeningData.partNumber,
        question_text: listeningData.questionText,
        options: listeningData.options,
        correct_answer: listeningData.correctAnswer,
        explanation_ko: listeningData.explanationKo || null,
        explanation_vi: listeningData.explanationVi || null,
        explanation_en: listeningData.explanationEn || null,
        question_audio_url: listeningData.audioUrl || null,
        is_active: true,
        generation_source: "manual",
      });
      
      if (error) throw error;
      
      toast({
        title: "✅ 듣기 문제 저장 완료",
        description: "문제가 성공적으로 저장되었습니다.",
      });
      
      // Reset form
      setListeningData({
        examType: "TOPIK_I",
        partNumber: 1,
        questionText: "",
        options: ["", "", "", ""],
        correctAnswer: 1,
        explanationKo: "",
        explanationVi: "",
        explanationEn: "",
        audioFile: null,
        audioUrl: "",
      });
    } catch (error: any) {
      console.error("Save error:", error);
      toast({
        title: "저장 실패",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Save writing question
  const saveWritingQuestion = async () => {
    if (!writingData.questionText.trim()) {
      toast({ title: "문제를 입력해주세요", variant: "destructive" });
      return;
    }
    if (!writingData.modelAnswer.trim()) {
      toast({ title: "모범답안을 입력해주세요", variant: "destructive" });
      return;
    }
    
    setSaving(true);
    try {
      const partNumber = parseInt(writingData.questionType);
      
      const { error } = await supabase.from("mock_question_bank").insert({
        exam_type: "TOPIK_II",
        section: "writing",
        part_number: partNumber,
        question_text: writingData.questionText,
        options: [writingData.modelAnswer], // Store model answer in options
        correct_answer: 0, // Not applicable for writing
        explanation_ko: writingData.expertTip || writingData.explanationKo || null,
        explanation_vi: writingData.explanationVi || null,
        explanation_en: writingData.explanationEn || null,
        question_image_url: writingData.imageUrl || null,
        is_active: true,
        generation_source: "manual",
        topic: `writing_${partNumber}`,
      });
      
      if (error) throw error;
      
      toast({
        title: `✅ 쓰기 ${partNumber}번 문제 저장 완료`,
        description: "문제가 성공적으로 저장되었습니다.",
      });
      
      // Reset form
      setWritingData({
        examType: "TOPIK_II",
        questionType: writingType,
        questionText: "",
        modelAnswer: "",
        expertTip: "",
        imageFile: null,
        imageUrl: "",
        explanationKo: "",
        explanationVi: "",
        explanationEn: "",
      });
    } catch (error: any) {
      console.error("Save error:", error);
      toast({
        title: "저장 실패",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Save reading question
  const saveReadingQuestion = async () => {
    if (!readingData.questionText.trim()) {
      toast({ title: "문제를 입력해주세요", variant: "destructive" });
      return;
    }
    if (readingData.options.some(o => !o.trim())) {
      toast({ title: "모든 선택지를 입력해주세요", variant: "destructive" });
      return;
    }
    
    setSaving(true);
    try {
      // Combine passage + question into question_text
      const fullQuestion = readingData.passage 
        ? `[지문]\n${readingData.passage}\n\n[문제]\n${readingData.questionText}`
        : readingData.questionText;
      
      const { error } = await supabase.from("mock_question_bank").insert({
        exam_type: readingData.examType,
        section: "reading",
        part_number: readingData.partNumber,
        question_text: fullQuestion,
        options: readingData.options,
        correct_answer: readingData.correctAnswer,
        explanation_ko: readingData.explanationKo || null,
        explanation_vi: readingData.explanationVi || null,
        explanation_en: readingData.explanationEn || null,
        is_active: true,
        generation_source: "manual",
      });
      
      if (error) throw error;
      
      toast({
        title: "✅ 읽기 문제 저장 완료",
        description: "문제가 성공적으로 저장되었습니다.",
      });
      
      // Reset form
      setReadingData({
        examType: "TOPIK_I",
        partNumber: 1,
        passage: "",
        questionText: "",
        options: ["", "", "", ""],
        correctAnswer: 1,
        explanationKo: "",
        explanationVi: "",
        explanationEn: "",
      });
    } catch (error: any) {
      console.error("Save error:", error);
      toast({
        title: "저장 실패",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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
          <CardDescription>
            듣기, 쓰기, 읽기 문제를 직접 입력하여 업로드합니다.
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

            {/* ===== LISTENING TAB ===== */}
            <TabsContent value="listening">
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>시험 유형</Label>
                    <Select 
                      value={listeningData.examType} 
                      onValueChange={(v) => setListeningData(p => ({ ...p, examType: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TOPIK_I">TOPIK I (1-2급)</SelectItem>
                        <SelectItem value="TOPIK_II">TOPIK II (3-6급)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>파트 번호</Label>
                    <Select 
                      value={listeningData.partNumber.toString()} 
                      onValueChange={(v) => setListeningData(p => ({ ...p, partNumber: parseInt(v) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 30 }, (_, i) => i + 1).map(n => (
                          <SelectItem key={n} value={n.toString()}>파트 {n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Audio Upload */}
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
                    {listeningData.audioUrl && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <audio src={listeningData.audioUrl} controls className="h-8" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Question Text */}
                <div className="space-y-2">
                  <Label>문제</Label>
                  <Textarea
                    placeholder="문제 내용을 입력하세요..."
                    value={listeningData.questionText}
                    onChange={(e) => setListeningData(p => ({ ...p, questionText: e.target.value }))}
                    rows={4}
                  />
                </div>

                {/* Options */}
                <div className="space-y-3">
                  <Label>선택지</Label>
                  {listeningData.options.map((option, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <Badge 
                        variant={listeningData.correctAnswer === idx + 1 ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setListeningData(p => ({ ...p, correctAnswer: idx + 1 }))}
                      >
                        {idx + 1}
                      </Badge>
                      <Input
                        placeholder={`선택지 ${idx + 1}`}
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...listeningData.options];
                          newOptions[idx] = e.target.value;
                          setListeningData(p => ({ ...p, options: newOptions }));
                        }}
                      />
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    * 정답 번호를 클릭하여 선택하세요
                  </p>
                </div>

                {/* Explanations */}
                <div className="space-y-4 border-t pt-4">
                  <Label className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    해설
                  </Label>
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm">🇰🇷 한국어</Label>
                      <Textarea
                        placeholder="한국어 해설..."
                        value={listeningData.explanationKo}
                        onChange={(e) => setListeningData(p => ({ ...p, explanationKo: e.target.value }))}
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">🇻🇳 Tiếng Việt</Label>
                      <Textarea
                        placeholder="Giải thích tiếng Việt..."
                        value={listeningData.explanationVi}
                        onChange={(e) => setListeningData(p => ({ ...p, explanationVi: e.target.value }))}
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">🇺🇸 English</Label>
                      <Textarea
                        placeholder="English explanation..."
                        value={listeningData.explanationEn}
                        onChange={(e) => setListeningData(p => ({ ...p, explanationEn: e.target.value }))}
                        rows={2}
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={saveListeningQuestion} 
                  disabled={saving}
                  className="w-full"
                  size="lg"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      저장 중...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      듣기 문제 저장
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            {/* ===== WRITING TAB ===== */}
            <TabsContent value="writing">
              <div className="space-y-6">
                {/* Writing Type Selection */}
                <div className="space-y-2">
                  <Label>문제 유형</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {(["51", "52", "53", "54"] as WritingType[]).map((type) => (
                      <Button
                        key={type}
                        variant={writingType === type ? "default" : "outline"}
                        onClick={() => {
                          setWritingType(type);
                          setWritingData(p => ({ ...p, questionType: type }));
                        }}
                        className="flex flex-col items-center py-4 h-auto"
                      >
                        <span className="text-lg font-bold">{type}번</span>
                        <span className="text-xs opacity-70">
                          {type === "51" && "실용문"}
                          {type === "52" && "설명문"}
                          {type === "53" && "도표 설명"}
                          {type === "54" && "논술형"}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Question Text */}
                <div className="space-y-2">
                  <Label>문제</Label>
                  <Textarea
                    placeholder="문제 내용을 입력하세요..."
                    value={writingData.questionText}
                    onChange={(e) => setWritingData(p => ({ ...p, questionText: e.target.value }))}
                    rows={6}
                  />
                </div>

                {/* Image Upload (Q53 only) */}
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
                        {writingData.imageUrl && (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <img 
                              src={writingData.imageUrl} 
                              alt="Preview" 
                              className="h-16 rounded border"
                            />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Model Answer */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    모범답안
                  </Label>
                  <Textarea
                    placeholder="모범 답안을 입력하세요..."
                    value={writingData.modelAnswer}
                    onChange={(e) => setWritingData(p => ({ ...p, modelAnswer: e.target.value }))}
                    rows={8}
                  />
                </div>

                {/* Expert Tip */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    전문가 TIP
                  </Label>
                  <Textarea
                    placeholder="작성 요령, 주의사항, 고득점 전략 등..."
                    value={writingData.expertTip}
                    onChange={(e) => setWritingData(p => ({ ...p, expertTip: e.target.value }))}
                    rows={4}
                  />
                </div>

                {/* Multilang Explanations */}
                <div className="space-y-4 border-t pt-4">
                  <Label>다국어 해설 (선택)</Label>
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm">🇻🇳 Tiếng Việt</Label>
                      <Textarea
                        placeholder="Hướng dẫn tiếng Việt..."
                        value={writingData.explanationVi}
                        onChange={(e) => setWritingData(p => ({ ...p, explanationVi: e.target.value }))}
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">🇺🇸 English</Label>
                      <Textarea
                        placeholder="English guide..."
                        value={writingData.explanationEn}
                        onChange={(e) => setWritingData(p => ({ ...p, explanationEn: e.target.value }))}
                        rows={2}
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={saveWritingQuestion} 
                  disabled={saving}
                  className="w-full"
                  size="lg"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      저장 중...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      쓰기 {writingType}번 문제 저장
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            {/* ===== READING TAB ===== */}
            <TabsContent value="reading">
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>시험 유형</Label>
                    <Select 
                      value={readingData.examType} 
                      onValueChange={(v) => setReadingData(p => ({ ...p, examType: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TOPIK_I">TOPIK I (1-2급)</SelectItem>
                        <SelectItem value="TOPIK_II">TOPIK II (3-6급)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>파트 번호</Label>
                    <Select 
                      value={readingData.partNumber.toString()} 
                      onValueChange={(v) => setReadingData(p => ({ ...p, partNumber: parseInt(v) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 50 }, (_, i) => i + 1).map(n => (
                          <SelectItem key={n} value={n.toString()}>파트 {n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Passage */}
                <div className="space-y-2">
                  <Label>지문 (선택)</Label>
                  <Textarea
                    placeholder="읽기 지문을 입력하세요... (없으면 비워두세요)"
                    value={readingData.passage}
                    onChange={(e) => setReadingData(p => ({ ...p, passage: e.target.value }))}
                    rows={6}
                  />
                </div>

                {/* Question Text */}
                <div className="space-y-2">
                  <Label>문제</Label>
                  <Textarea
                    placeholder="문제 내용을 입력하세요..."
                    value={readingData.questionText}
                    onChange={(e) => setReadingData(p => ({ ...p, questionText: e.target.value }))}
                    rows={3}
                  />
                </div>

                {/* Options */}
                <div className="space-y-3">
                  <Label>선택지</Label>
                  {readingData.options.map((option, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <Badge 
                        variant={readingData.correctAnswer === idx + 1 ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setReadingData(p => ({ ...p, correctAnswer: idx + 1 }))}
                      >
                        {idx + 1}
                      </Badge>
                      <Input
                        placeholder={`선택지 ${idx + 1}`}
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...readingData.options];
                          newOptions[idx] = e.target.value;
                          setReadingData(p => ({ ...p, options: newOptions }));
                        }}
                      />
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    * 정답 번호를 클릭하여 선택하세요
                  </p>
                </div>

                {/* Explanations */}
                <div className="space-y-4 border-t pt-4">
                  <Label className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    해설
                  </Label>
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm">🇰🇷 한국어</Label>
                      <Textarea
                        placeholder="한국어 해설..."
                        value={readingData.explanationKo}
                        onChange={(e) => setReadingData(p => ({ ...p, explanationKo: e.target.value }))}
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">🇻🇳 Tiếng Việt</Label>
                      <Textarea
                        placeholder="Giải thích tiếng Việt..."
                        value={readingData.explanationVi}
                        onChange={(e) => setReadingData(p => ({ ...p, explanationVi: e.target.value }))}
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">🇺🇸 English</Label>
                      <Textarea
                        placeholder="English explanation..."
                        value={readingData.explanationEn}
                        onChange={(e) => setReadingData(p => ({ ...p, explanationEn: e.target.value }))}
                        rows={2}
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={saveReadingQuestion} 
                  disabled={saving}
                  className="w-full"
                  size="lg"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      저장 중...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      읽기 문제 저장
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
