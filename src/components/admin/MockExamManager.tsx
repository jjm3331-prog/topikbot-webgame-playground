import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Search,
  Trash2,
  RefreshCw,
  BookOpen,
  Headphones,
  PenLine,
  CheckCircle,
  XCircle,
  Database,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Volume2,
  Image as ImageIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MockQuestion {
  id: string;
  exam_type: string;
  section: string;
  part_number: number;
  question_number: number | null;
  question_text: string;
  question_audio_url: string | null;
  question_image_url: string | null;
  options: unknown;
  correct_answer: number;
  explanation_ko: string | null;
  explanation_vi: string | null;
  explanation_en: string | null;
  difficulty: string | null;
  is_active: boolean;
  created_at: string;
  exam_round: number | null;
}

const MockExamManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<MockQuestion[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Accurate counts
  const [questionCounts, setQuestionCounts] = useState({
    all: 0,
    listening: 0,
    reading: 0,
    writing: 0,
  });
  const [filteredTotalCount, setFilteredTotalCount] = useState(0);

  // Filters & Pagination
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [examTypeFilter, setExamTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 30;

  // Delete state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [sectionFilter, examTypeFilter, searchQuery]);

  useEffect(() => {
    loadQuestions();
  }, [currentPage, sectionFilter, examTypeFilter, searchQuery]);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const q = searchQuery.trim();
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // Global counts
      const [total, listening, reading, writing] = await Promise.all([
        supabase.from("mock_question_bank").select("id", { count: "exact", head: true }),
        supabase.from("mock_question_bank").select("id", { count: "exact", head: true }).eq("section", "listening"),
        supabase.from("mock_question_bank").select("id", { count: "exact", head: true }).eq("section", "reading"),
        supabase.from("mock_question_bank").select("id", { count: "exact", head: true }).eq("section", "writing"),
      ]);

      const countsError = total.error || listening.error || reading.error || writing.error;
      if (countsError) throw countsError;

      setQuestionCounts({
        all: total.count ?? 0,
        listening: listening.count ?? 0,
        reading: reading.count ?? 0,
        writing: writing.count ?? 0,
      });

      // List query with filters
      let listCountQuery = supabase.from("mock_question_bank").select("id", { count: "exact", head: true });
      let listQuery = supabase
        .from("mock_question_bank")
        .select("*")
        .order("exam_type", { ascending: true })
        .order("section", { ascending: true })
        .order("part_number", { ascending: true })
        .order("question_number", { ascending: true })
        .range(from, to);

      if (sectionFilter !== "all") {
        listCountQuery = listCountQuery.eq("section", sectionFilter);
        listQuery = listQuery.eq("section", sectionFilter);
      }

      if (examTypeFilter !== "all") {
        listCountQuery = listCountQuery.eq("exam_type", examTypeFilter);
        listQuery = listQuery.eq("exam_type", examTypeFilter);
      }

      if (q) {
        const orExpr = `question_text.ilike.%${q}%,exam_type.ilike.%${q}%`;
        listCountQuery = listCountQuery.or(orExpr);
        listQuery = listQuery.or(orExpr);
      }

      const [{ count: filteredCount, error: filteredCountError }, { data, error }] =
        await Promise.all([listCountQuery, listQuery]);

      if (filteredCountError) throw filteredCountError;
      if (error) throw error;

      setFilteredTotalCount(filteredCount ?? 0);
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

  const handleDeleteQuestion = async (id: string) => {
    try {
      const { error } = await supabase.from("mock_question_bank").delete().eq("id", id);
      if (error) throw error;

      toast({ title: "삭제 완료", description: "문제가 삭제되었습니다." });
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      setDeleteConfirmId(null);
      // Refresh counts
      loadQuestions();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({ title: "삭제 실패", description: error.message, variant: "destructive" });
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase.from("mock_question_bank").update({ is_active: !currentActive }).eq("id", id);
      if (error) throw error;

      setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, is_active: !currentActive } : q)));
      toast({
        title: currentActive ? "비활성화됨" : "활성화됨",
        description: `문제가 ${currentActive ? "비활성화" : "활성화"}되었습니다.`,
      });
    } catch (error: any) {
      console.error("Toggle error:", error);
      toast({ title: "상태 변경 실패", description: error.message, variant: "destructive" });
    }
  };

  const totalPages = Math.ceil(filteredTotalCount / ITEMS_PER_PAGE);

  const getSectionIcon = (section: string) => {
    switch (section) {
      case "listening":
        return <Headphones className="w-4 h-4" />;
      case "reading":
        return <BookOpen className="w-4 h-4" />;
      case "writing":
        return <PenLine className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getSectionColor = (section: string) => {
    switch (section) {
      case "listening":
        return "text-cyan-400";
      case "reading":
        return "text-emerald-400";
      case "writing":
        return "text-amber-400";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/20">
                <Database className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{questionCounts.all.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">전체 문제</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/20">
                <Headphones className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{questionCounts.listening.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">듣기</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20">
                <BookOpen className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{questionCounts.reading.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">읽기</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20">
                <PenLine className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{questionCounts.writing.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">쓰기</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card className="border-border/60">
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                문제 목록
                <Badge variant="secondary" className="ml-2 font-mono">
                  {filteredTotalCount.toLocaleString()}
                </Badge>
              </CardTitle>
              <CardDescription className="mt-1">
                TOPIK 모의고사 문제 데이터베이스
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Section Filter */}
              <Select value={sectionFilter} onValueChange={setSectionFilter}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder="영역" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 영역</SelectItem>
                  <SelectItem value="listening">듣기</SelectItem>
                  <SelectItem value="reading">읽기</SelectItem>
                  <SelectItem value="writing">쓰기</SelectItem>
                </SelectContent>
              </Select>

              {/* Exam Type Filter */}
              <Select value={examTypeFilter} onValueChange={setExamTypeFilter}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder="시험유형" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 유형</SelectItem>
                  <SelectItem value="TOPIK_I">TOPIK I</SelectItem>
                  <SelectItem value="TOPIK_II">TOPIK II</SelectItem>
                </SelectContent>
              </Select>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="문제 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[200px] h-9"
                />
              </div>

              {/* Refresh */}
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={loadQuestions} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredTotalCount === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Database className="w-12 h-12 mx-auto mb-4 opacity-40" />
              <p className="text-sm">등록된 문제가 없습니다.</p>
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="w-[100px]">시험</TableHead>
                      <TableHead className="w-[80px]">영역</TableHead>
                      <TableHead className="w-[70px]">Part</TableHead>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>문제</TableHead>
                      <TableHead className="w-[60px] text-center">정답</TableHead>
                      <TableHead className="w-[70px] text-center">미디어</TableHead>
                      <TableHead className="w-[70px] text-center">상태</TableHead>
                      <TableHead className="w-[90px] text-center">액션</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence mode="popLayout">
                      {questions.map((q, idx) => (
                        <motion.tr
                          key={q.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ delay: idx * 0.015 }}
                          className={`border-b border-border/40 hover:bg-muted/20 transition-colors ${
                            !q.is_active ? "opacity-50" : ""
                          }`}
                        >
                          <TableCell>
                            <Badge
                              className={`${
                                q.exam_type?.includes("I") && !q.exam_type?.includes("II")
                                  ? "bg-indigo-600 hover:bg-indigo-700"
                                  : "bg-purple-600 hover:bg-purple-700"
                              } text-white text-xs`}
                            >
                              {q.exam_type?.replace("_", " ") || "N/A"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className={`flex items-center gap-1.5 ${getSectionColor(q.section)}`}>
                              {getSectionIcon(q.section)}
                              <span className="text-xs font-medium">
                                {q.section === "listening" ? "듣기" : q.section === "reading" ? "읽기" : "쓰기"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">Part {q.part_number}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-xs">{q.question_number ?? "-"}</span>
                          </TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="text-sm line-clamp-1 max-w-[300px] cursor-help">
                                    {q.question_text}
                                  </p>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="max-w-md">
                                  <p className="text-sm whitespace-pre-wrap">{q.question_text}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="font-mono text-xs">
                              {q.correct_answer}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              {q.question_audio_url && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Volume2 className="w-4 h-4 text-cyan-400" />
                                    </TooltipTrigger>
                                    <TooltipContent>음원 있음</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              {q.question_image_url && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <ImageIcon className="w-4 h-4 text-amber-400" />
                                    </TooltipTrigger>
                                    <TooltipContent>이미지 있음</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              {!q.question_audio_url && !q.question_image_url && (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleToggleActive(q.id, q.is_active)}
                            >
                              {q.is_active ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-400" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirmId(q.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-border/40">
                  <p className="text-sm text-muted-foreground">
                    {filteredTotalCount.toLocaleString()}개 중{" "}
                    {((currentPage - 1) * ITEMS_PER_PAGE + 1).toLocaleString()}–
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredTotalCount).toLocaleString()}개
                  </p>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>

                    <div className="flex items-center gap-1 mx-2">
                      {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 7) {
                          pageNum = i + 1;
                        } else if (currentPage <= 4) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 3) {
                          pageNum = totalPages - 6 + i;
                        } else {
                          pageNum = currentPage - 3 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "ghost"}
                            size="sm"
                            className="h-8 w-8 p-0 text-xs"
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

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
