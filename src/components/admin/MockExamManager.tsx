import { useState, useEffect } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, Plus, Search, Trash2, Edit, Eye, Upload, 
  FileText, CheckCircle, AlertTriangle, RefreshCw,
  BookOpen, Headphones, PenLine
} from "lucide-react";
import { motion } from "framer-motion";

interface MockQuestion {
  id: string;
  exam_type: string;
  section: string;
  part_number: number;
  question_number: number | null;
  question_text: string;
  question_audio_url: string | null;
  question_image_url: string | null;
  options: unknown; // JSON type from Supabase
  correct_answer: number;
  explanation_ko: string | null;
  explanation_vi: string | null;
  explanation_en: string | null;
  difficulty: string | null;
  is_active: boolean;
  created_at: string;
}

// Helper to safely get options as string array
const getOptionsArray = (options: unknown): string[] => {
  if (Array.isArray(options)) {
    return options.map(String);
  }
  return [];
};

interface ParsedQuestion {
  question_text: string;
  options: string[];
  correct_answer: number;
  explanation: string;
  part_number: number;
  question_number: number;
}

const MockExamManager = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("input");
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [questions, setQuestions] = useState<MockQuestion[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Input form state
  const [examType, setExamType] = useState<string>("topik1");
  const [section, setSection] = useState<string>("reading");
  const [questionText, setQuestionText] = useState("");
  const [explanationText, setExplanationText] = useState("");
  
  // Preview state
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [savingQuestions, setSavingQuestions] = useState(false);
  
  // Edit state
  const [editingQuestion, setEditingQuestion] = useState<MockQuestion | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("mock_question_bank")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setQuestions(data || []);
    } catch (error: any) {
      console.error("Load questions error:", error);
      toast({
        title: "문제 로드 실패",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleParseQuestions = async () => {
    if (!questionText.trim()) {
      toast({
        title: "입력 오류",
        description: "문제 텍스트를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setParsing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mock-exam-parse`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            examType,
            section,
            questionText: questionText.trim(),
            explanationText: explanationText.trim(),
          }),
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "파싱 실패");
      }

      if (result.questions && result.questions.length > 0) {
        setParsedQuestions(result.questions);
        setShowPreview(true);
        toast({
          title: "파싱 완료",
          description: `${result.questions.length}개의 문제가 파싱되었습니다.`,
        });
      } else {
        toast({
          title: "파싱 결과 없음",
          description: "문제를 파싱하지 못했습니다. 텍스트 형식을 확인해주세요.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Parse error:", error);
      toast({
        title: "파싱 실패",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setParsing(false);
    }
  };

  const handleSaveQuestions = async () => {
    if (parsedQuestions.length === 0) return;

    setSavingQuestions(true);
    try {
      const questionsToInsert = parsedQuestions.map((q) => ({
        exam_type: examType,
        section,
        part_number: q.part_number,
        question_number: q.question_number,
        question_text: q.question_text,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation_ko: q.explanation,
        is_active: true,
      }));

      const { error } = await supabase
        .from("mock_question_bank")
        .insert(questionsToInsert);

      if (error) throw error;

      toast({
        title: "저장 완료",
        description: `${parsedQuestions.length}개의 문제가 저장되었습니다.`,
      });

      // Reset form
      setQuestionText("");
      setExplanationText("");
      setParsedQuestions([]);
      setShowPreview(false);
      
      // Reload questions
      await loadQuestions();
      setActiveTab("list");
    } catch (error: any) {
      console.error("Save error:", error);
      toast({
        title: "저장 실패",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingQuestions(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    try {
      const { error } = await supabase
        .from("mock_question_bank")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "삭제 완료",
        description: "문제가 삭제되었습니다.",
      });

      setQuestions((prev) => prev.filter((q) => q.id !== id));
      setDeleteConfirmId(null);
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "삭제 실패",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from("mock_question_bank")
        .update({ is_active: !currentActive })
        .eq("id", id);

      if (error) throw error;

      setQuestions((prev) =>
        prev.map((q) =>
          q.id === id ? { ...q, is_active: !currentActive } : q
        )
      );

      toast({
        title: currentActive ? "비활성화됨" : "활성화됨",
        description: `문제가 ${currentActive ? "비활성화" : "활성화"}되었습니다.`,
      });
    } catch (error: any) {
      console.error("Toggle error:", error);
      toast({
        title: "상태 변경 실패",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredQuestions = questions.filter((q) =>
    q.question_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.exam_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.section.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getExamTypeBadge = (type: string) => {
    switch (type) {
      case "topik1":
        return <Badge className="bg-blue-500">TOPIK I</Badge>;
      case "topik2":
        return <Badge className="bg-purple-500">TOPIK II</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getSectionBadge = (section: string) => {
    switch (section) {
      case "listening":
        return <Badge variant="outline" className="border-cyan-500 text-cyan-600"><Headphones className="w-3 h-3 mr-1" />듣기</Badge>;
      case "reading":
        return <Badge variant="outline" className="border-green-500 text-green-600"><BookOpen className="w-3 h-3 mr-1" />읽기</Badge>;
      case "writing":
        return <Badge variant="outline" className="border-orange-500 text-orange-600"><PenLine className="w-3 h-3 mr-1" />쓰기</Badge>;
      default:
        return <Badge variant="outline">{section}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="input" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            문제 입력
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            문제 목록 ({questions.length})
          </TabsTrigger>
        </TabsList>

        {/* Input Tab */}
        <TabsContent value="input" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                TOPIK 문제 입력
              </CardTitle>
              <CardDescription>
                텍스트로 문제를 입력하면 AI가 자동으로 파싱하여 DB에 저장합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Exam Type & Section Selection */}
              <div className="grid sm:grid-cols-2 gap-4">
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
                      <SelectItem value="listening">듣기</SelectItem>
                      <SelectItem value="reading">읽기</SelectItem>
                      {examType === "topik2" && (
                        <SelectItem value="writing">쓰기</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Question Text Input */}
              <div className="space-y-2">
                <Label>문제 텍스트</Label>
                <Textarea
                  placeholder={`문제를 그대로 붙여넣기 하세요.

예시:
[1~2] 다음을 듣고 알맞은 것을 고르십시오.

1. 
① 네, 만나서 반갑습니다.
② 네, 다음에 또 만나요.
③ 네, 처음 뵙겠습니다.
④ 네, 다시 만나서 반갑습니다.

2.
① 가족이 네 명입니다.
② 가족이 한국에 삽니다.
③ 가족을 만나고 싶습니다.
④ 가족과 함께 살고 있습니다.
...`}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  여러 문제를 한 번에 입력할 수 있습니다. 문제 번호와 선택지를 포함해주세요.
                </p>
              </div>

              {/* Explanation Text Input */}
              <div className="space-y-2">
                <Label>해설 텍스트 (선택)</Label>
                <Textarea
                  placeholder={`해설을 붙여넣기 하세요. (선택사항)

예시:
1. 정답: ①
해설: "처음 뵙겠습니다"에 대한 응답으로 "네, 만나서 반갑습니다"가 적절합니다.

2. 정답: ①
해설: "가족이 몇 명이에요?"라는 질문에 대한 응답으로 "가족이 네 명입니다"가 적절합니다.
...`}
                  value={explanationText}
                  onChange={(e) => setExplanationText(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>

              {/* Parse Button */}
              <Button 
                onClick={handleParseQuestions}
                disabled={parsing || !questionText.trim()}
                className="w-full"
                size="lg"
              >
                {parsing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    AI가 문제를 분석 중...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    문제 파싱 및 미리보기
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* List Tab */}
        <TabsContent value="list" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  문제 목록
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="검색..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-full sm:w-[200px]"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={loadQuestions}
                    disabled={loading}
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredQuestions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>등록된 문제가 없습니다.</p>
                  <Button
                    variant="link"
                    onClick={() => setActiveTab("input")}
                    className="mt-2"
                  >
                    문제 입력하기 →
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {filteredQuestions.map((q, index) => (
                    <motion.div
                      key={q.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className={`p-4 rounded-lg border transition-all ${
                        q.is_active
                          ? "border-border hover:border-primary/50"
                          : "border-border/50 bg-muted/30 opacity-60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {getExamTypeBadge(q.exam_type)}
                            {getSectionBadge(q.section)}
                            <Badge variant="secondary">Part {q.part_number}</Badge>
                            {q.question_number && (
                              <Badge variant="outline">#{q.question_number}</Badge>
                            )}
                            {!q.is_active && (
                              <Badge variant="destructive">비활성</Badge>
                            )}
                          </div>
                          <p className="text-sm line-clamp-2">{q.question_text}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>정답: {q.correct_answer}번</span>
                            <span>{new Date(q.created_at).toLocaleDateString("ko-KR")}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleActive(q.id, q.is_active)}
                            title={q.is_active ? "비활성화" : "활성화"}
                          >
                            {q.is_active ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-yellow-500" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirmId(q.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              파싱 결과 미리보기
            </DialogTitle>
            <DialogDescription>
              {parsedQuestions.length}개의 문제가 파싱되었습니다. 확인 후 저장해주세요.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {parsedQuestions.map((q, index) => (
              <Card key={index} className="border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>Part {q.part_number}</Badge>
                    <Badge variant="outline">문제 {q.question_number}</Badge>
                    <Badge variant="secondary">정답: {q.correct_answer}번</Badge>
                  </div>
                  <p className="font-medium mb-3 whitespace-pre-line">{q.question_text}</p>
                  <div className="space-y-1 mb-3">
                    {q.options.map((opt, optIndex) => (
                      <div
                        key={optIndex}
                        className={`p-2 rounded text-sm ${
                          optIndex + 1 === q.correct_answer
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                            : "bg-muted"
                        }`}
                      >
                        {optIndex + 1}. {opt}
                      </div>
                    ))}
                  </div>
                  {q.explanation && (
                    <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                      <strong>해설:</strong> {q.explanation}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              취소
            </Button>
            <Button onClick={handleSaveQuestions} disabled={savingQuestions}>
              {savingQuestions ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {parsedQuestions.length}개 문제 저장
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>문제 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 문제를 삭제하시겠습니까? 삭제된 문제는 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDeleteQuestion(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MockExamManager;
