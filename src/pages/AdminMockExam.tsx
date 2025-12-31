import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Upload, 
  FileJson, 
  CheckCircle2, 
  AlertCircle, 
  Trash2,
  Plus,
  Download,
  RefreshCw,
  Database,
  FileText,
  ChevronDown,
  Eye,
  BookOpen,
  Headphones
} from "lucide-react";
import CleanHeader from "@/components/CleanHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface QuestionTemplate {
  id: string;
  exam_type: string;
  section: string;
  part_number: number;
  part_name: string;
  part_name_ko: string | null;
  question_count: number;
  is_active: boolean;
  display_order: number;
}

interface QuestionBankItem {
  id: string;
  exam_type: string;
  section: string;
  part_number: number;
  question_text: string;
  options: string[];
  correct_answer: number;
  difficulty: string | null;
  usage_count: number;
  is_active: boolean;
}

const AdminMockExam = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<'templates' | 'questions'>('templates');
  const [selectedExamType, setSelectedExamType] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<'all' | 'reading' | 'listening' | 'writing'>('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 100;
  const [jsonPreview, setJsonPreview] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch templates
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['mock-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mock_question_templates')
        .select('*')
        .order('exam_type')
        .order('section')
        .order('part_number');
      if (error) throw error;
      return data as QuestionTemplate[];
    }
  });

  // Fetch question counts (accurate, not affected by pagination)
  const { data: questionCounts, isLoading: countsLoading } = useQuery({
    queryKey: ['mock-question-counts', selectedExamType],
    queryFn: async () => {
      const applyExamType = (q: any) =>
        selectedExamType === 'all' ? q : q.eq('exam_type', selectedExamType);

      const [total, reading, listening, writing] = await Promise.all([
        applyExamType(
          supabase
            .from('mock_question_bank')
            .select('id', { count: 'exact', head: true })
        ),
        applyExamType(
          supabase
            .from('mock_question_bank')
            .select('id', { count: 'exact', head: true })
            .eq('section', 'reading')
        ),
        applyExamType(
          supabase
            .from('mock_question_bank')
            .select('id', { count: 'exact', head: true })
            .eq('section', 'listening')
        ),
        applyExamType(
          supabase
            .from('mock_question_bank')
            .select('id', { count: 'exact', head: true })
            .eq('section', 'writing')
        ),
      ]);

      const anyError = total.error || reading.error || listening.error || writing.error;
      if (anyError) throw anyError;

      return {
        total: total.count ?? 0,
        reading: reading.count ?? 0,
        listening: listening.count ?? 0,
        writing: writing.count ?? 0,
      };
    }
  });

  // Fetch questions (paged)
  const { data: questions, isLoading: questionsLoading } = useQuery({
    queryKey: ['mock-questions', selectedExamType, sectionFilter, page],
    queryFn: async () => {
      let query = supabase
        .from('mock_question_bank')
        .select('*')
        .order('exam_type')
        .order('section')
        .order('part_number')
        .order('question_number')
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (selectedExamType !== 'all') {
        query = query.eq('exam_type', selectedExamType);
      }

      if (sectionFilter !== 'all') {
        query = query.eq('section', sectionFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as QuestionBankItem[];
    }
  });

  // Upload templates mutation
  const uploadTemplatesMutation = useMutation({
    mutationFn: async (templates: any[]) => {
      const { error } = await supabase
        .from('mock_question_templates')
        .insert(templates);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('템플릿 업로드 완료!');
      queryClient.invalidateQueries({ queryKey: ['mock-templates'] });
      setJsonPreview(null);
    },
    onError: (error: any) => {
      toast.error(`업로드 실패: ${error.message}`);
    }
  });

  // Upload questions mutation
  const uploadQuestionsMutation = useMutation({
    mutationFn: async (questions: any[]) => {
      const { error } = await supabase
        .from('mock_question_bank')
        .insert(questions);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('문제 업로드 완료!');
      queryClient.invalidateQueries({ queryKey: ['mock-questions'] });
      setJsonPreview(null);
    },
    onError: (error: any) => {
      toast.error(`업로드 실패: ${error.message}`);
    }
  });

  // Handle file upload
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('JSON 파일만 업로드 가능합니다.');
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      
      // Validate structure
      if (!Array.isArray(parsed)) {
        toast.error('JSON 파일은 배열 형식이어야 합니다.');
        return;
      }

      if (parsed.length === 0) {
        toast.error('빈 배열입니다.');
        return;
      }

      // Validate based on upload type
      if (uploadType === 'templates') {
        const requiredFields = ['exam_type', 'section', 'part_number', 'part_name'];
        const missing = requiredFields.filter(f => !(f in parsed[0]));
        if (missing.length > 0) {
          toast.error(`필수 필드 누락: ${missing.join(', ')}`);
          return;
        }
      } else {
        const requiredFields = ['exam_type', 'section', 'part_number', 'question_text', 'options', 'correct_answer'];
        const missing = requiredFields.filter(f => !(f in parsed[0]));
        if (missing.length > 0) {
          toast.error(`필수 필드 누락: ${missing.join(', ')}`);
          return;
        }
      }

      setJsonPreview(parsed);
      toast.success(`${parsed.length}개 항목 검증 완료`);
    } catch (error) {
      toast.error('JSON 파싱 오류: 올바른 JSON 형식인지 확인하세요.');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle upload confirm
  const handleUploadConfirm = async () => {
    if (!jsonPreview) return;
    
    setIsUploading(true);
    try {
      if (uploadType === 'templates') {
        await uploadTemplatesMutation.mutateAsync(jsonPreview);
      } else {
        await uploadQuestionsMutation.mutateAsync(jsonPreview);
      }
    } finally {
      setIsUploading(false);
    }
  };

  // Download sample JSON
  const downloadSampleJson = () => {
    const sampleTemplate = [
      {
        exam_type: "TOPIK_I",
        section: "reading",
        part_number: 1,
        part_name: "Fill in the blank (Grammar)",
        part_name_ko: "빈칸 채우기 (문법)",
        part_name_vi: "Điền vào chỗ trống (Ngữ pháp)",
        question_count: 4,
        time_limit_minutes: 5,
        difficulty: "beginner",
        description: "Choose the correct grammar form for the blank",
        description_ko: "빈칸에 알맞은 문법 형태를 고르세요",
        examples: [],
        generation_hints: ["N+입니다/이에요", "V+아요/어요"]
      }
    ];

    const sampleQuestion = [
      {
        exam_type: "TOPIK_I",
        section: "reading",
        part_number: 1,
        question_number: 1,
        question_text: "저는 의사___. 병원에 다닙니다.",
        options: ["이에요", "입니다", "있어요", "해요"],
        correct_answer: 1,
        explanation_ko: "직업을 말할 때 '입니다'를 사용합니다.",
        explanation_vi: "Khi nói về nghề nghiệp, dùng '입니다'.",
        explanation_en: "Use '입니다' when talking about professions.",
        grammar_points: ["N+입니다"],
        vocabulary: ["의사", "병원", "다니다"],
        difficulty: "easy"
      }
    ];

    const sample = uploadType === 'templates' ? sampleTemplate : sampleQuestion;
    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = uploadType === 'templates' ? 'sample_templates.json' : 'sample_questions.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getExamTypeColor = (type: string) => {
    switch (type) {
      case 'TOPIK_I': return 'bg-emerald-500';
      case 'TOPIK_II': return 'bg-blue-500';
      case 'TOPIK_EPS': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <CleanHeader />
      
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">모의고사 관리</h1>
              <p className="text-muted-foreground">문제 템플릿 및 문제 은행 관리</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/admin')}>
              ← Admin으로 돌아가기
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-emerald-500/10">
                  <FileText className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{templates?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">템플릿</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Database className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{countsLoading ? '—' : (questionCounts?.total ?? 0)}</p>
                  <p className="text-sm text-muted-foreground">문제 ({selectedExamType === 'all' ? '전체' : selectedExamType.replace('_', ' ')})</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-purple-500/10">
                  <BookOpen className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{countsLoading ? '—' : (questionCounts?.reading ?? 0)}</p>
                  <p className="text-sm text-muted-foreground">읽기 문제</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-amber-500/10">
                  <Headphones className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{countsLoading ? '—' : (questionCounts?.listening ?? 0)}</p>
                  <p className="text-sm text-muted-foreground">듣기 문제</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upload Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              JSON 업로드
            </CardTitle>
            <CardDescription>
              구조화된 JSON 파일로 템플릿 또는 문제를 일괄 업로드합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Upload Type Selection */}
              <div className="flex gap-4">
                <Button
                  variant={uploadType === 'templates' ? 'default' : 'outline'}
                  onClick={() => setUploadType('templates')}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  템플릿 업로드
                </Button>
                <Button
                  variant={uploadType === 'questions' ? 'default' : 'outline'}
                  onClick={() => setUploadType('questions')}
                >
                  <Database className="w-4 h-4 mr-2" />
                  문제 업로드
                </Button>
              </div>

              {/* File Input */}
              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1"
                >
                  <FileJson className="w-4 h-4 mr-2" />
                  JSON 파일 선택
                </Button>
                <Button variant="ghost" onClick={downloadSampleJson}>
                  <Download className="w-4 h-4 mr-2" />
                  샘플 다운로드
                </Button>
              </div>

              {/* JSON Preview */}
              {jsonPreview && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <span className="font-medium">{jsonPreview.length}개 항목 검증됨</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setJsonPreview(null)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        취소
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleUploadConfirm}
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4 mr-1" />
                        )}
                        업로드 확인
                      </Button>
                    </div>
                  </div>
                  
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full">
                        <Eye className="w-4 h-4 mr-2" />
                        미리보기
                        <ChevronDown className="w-4 h-4 ml-2" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <pre className="mt-2 p-4 bg-muted rounded-lg text-xs overflow-auto max-h-60">
                        {JSON.stringify(jsonPreview.slice(0, 3), null, 2)}
                        {jsonPreview.length > 3 && `\n\n... and ${jsonPreview.length - 3} more items`}
                      </pre>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Data Tables */}
        <Tabs defaultValue="templates" className="space-y-4">
          <TabsList>
            <TabsTrigger value="templates">템플릿 목록</TabsTrigger>
            <TabsTrigger value="questions">문제 은행</TabsTrigger>
          </TabsList>

          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <CardTitle>문제 유형 템플릿</CardTitle>
                <CardDescription>
                  시험 유형별 문제 구조 정의
                </CardDescription>
              </CardHeader>
              <CardContent>
                {templatesLoading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : templates && templates.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>시험</TableHead>
                        <TableHead>영역</TableHead>
                        <TableHead>Part</TableHead>
                        <TableHead>유형명</TableHead>
                        <TableHead>문항수</TableHead>
                        <TableHead>상태</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templates.map((template) => (
                        <TableRow key={template.id}>
                          <TableCell>
                            <Badge className={`${getExamTypeColor(template.exam_type)} text-white`}>
                              {template.exam_type.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {template.section === 'listening' ? (
                              <div className="flex items-center gap-1">
                                <Headphones className="w-4 h-4" />
                                듣기
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <BookOpen className="w-4 h-4" />
                                읽기
                              </div>
                            )}
                          </TableCell>
                          <TableCell>Part {template.part_number}</TableCell>
                          <TableCell>
                            {template.part_name_ko || template.part_name}
                          </TableCell>
                          <TableCell>{template.question_count}</TableCell>
                          <TableCell>
                            <Badge variant={template.is_active ? 'default' : 'secondary'}>
                              {template.is_active ? '활성' : '비활성'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>등록된 템플릿이 없습니다.</p>
                    <p className="text-sm">JSON 파일을 업로드하여 템플릿을 추가하세요.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="questions">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle>문제 은행</CardTitle>
                    <CardDescription>
                      등록된 모의고사 문제 목록 (페이지당 {PAGE_SIZE}개)
                    </CardDescription>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Select
                      value={selectedExamType}
                      onValueChange={(v) => {
                        setSelectedExamType(v);
                        setPage(0);
                      }}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="시험 유형" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체</SelectItem>
                        <SelectItem value="TOPIK_I">TOPIK I</SelectItem>
                        <SelectItem value="TOPIK_II">TOPIK II</SelectItem>
                        <SelectItem value="TOPIK_EPS">EPS-TOPIK</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select
                      value={sectionFilter}
                      onValueChange={(v) => {
                        setSectionFilter(v as any);
                        setPage(0);
                      }}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="영역" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체</SelectItem>
                        <SelectItem value="listening">듣기</SelectItem>
                        <SelectItem value="reading">읽기</SelectItem>
                        <SelectItem value="writing">쓰기</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                      >
                        이전
                      </Button>
                      <div className="text-sm text-muted-foreground min-w-16 text-center">
                        {page + 1}p
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={questionsLoading || (questions?.length ?? 0) < PAGE_SIZE}
                      >
                        다음
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {questionsLoading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : questions && questions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>시험</TableHead>
                        <TableHead>영역</TableHead>
                        <TableHead>Part</TableHead>
                        <TableHead className="max-w-md">문제</TableHead>
                        <TableHead>난이도</TableHead>
                        <TableHead>사용횟수</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {questions.map((question) => (
                        <TableRow key={question.id}>
                          <TableCell>
                            <Badge className={`${getExamTypeColor(question.exam_type)} text-white`}>
                              {question.exam_type.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {question.section === 'listening' ? '듣기' : question.section === 'writing' ? '쓰기' : '읽기'}
                          </TableCell>
                          <TableCell>Part {question.part_number}</TableCell>
                          <TableCell className="max-w-md truncate">
                            {question.question_text}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {question.difficulty || 'medium'}
                            </Badge>
                          </TableCell>
                          <TableCell>{question.usage_count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>등록된 문제가 없습니다.</p>
                    <p className="text-sm">JSON 파일을 업로드하여 문제를 추가하세요.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminMockExam;
