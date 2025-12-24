import { useState, useEffect } from "react";
import { FileText, Trash2, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface DocumentWithChunks {
  id: string;
  title: string;
  content: string;
  created_at: string;
  file_type: string;
  chunk_count: number;
}

interface DocumentListProps {
  refreshTrigger: number;
}

const DOCS_PER_PAGE = 20;

const DocumentList = ({ refreshTrigger }: DocumentListProps) => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<DocumentWithChunks[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const totalPages = Math.ceil(totalCount / DOCS_PER_PAGE);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      // Get total count
      const { count } = await supabase
        .from("knowledge_documents")
        .select("*", { count: "exact", head: true });
      
      setTotalCount(count || 0);

      // Get paginated documents
      const from = (currentPage - 1) * DOCS_PER_PAGE;
      const to = from + DOCS_PER_PAGE - 1;

      const { data: docsData, error: docsError } = await supabase
        .from("knowledge_documents")
        .select("id, title, content, created_at, file_type")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (docsError) throw docsError;

      // Get chunk counts for each document
      const docsWithChunks: DocumentWithChunks[] = [];
      
      for (const doc of docsData || []) {
        const { count: chunkCount } = await supabase
          .from("knowledge_chunks")
          .select("*", { count: "exact", head: true })
          .eq("document_id", doc.id);
        
        docsWithChunks.push({
          ...doc,
          chunk_count: chunkCount || 0,
        });
      }

      setDocuments(docsWithChunks);
    } catch (error) {
      console.error("Load documents error:", error);
      toast({
        title: "문서 로드 실패",
        description: "문서 목록을 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [currentPage, refreshTrigger]);

  const handleDelete = async (docId: string, title: string) => {
    if (!confirm(`"${title}" 문서를 삭제하시겠습니까?`)) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag-delete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ document_id: docId }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "삭제 실패");
      }

      toast({
        title: "삭제 완료",
        description: `"${title}" 문서가 삭제되었습니다.`,
      });

      loadDocuments();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "삭제 실패",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getFileTypeColor = (fileType: string) => {
    const colors: Record<string, string> = {
      md: "bg-blue-500/20 text-blue-400",
      txt: "bg-gray-500/20 text-gray-400",
      docx: "bg-indigo-500/20 text-indigo-400",
      doc: "bg-indigo-500/20 text-indigo-400",
      html: "bg-orange-500/20 text-orange-400",
      json: "bg-green-500/20 text-green-400",
      csv: "bg-yellow-500/20 text-yellow-400",
      text: "bg-gray-500/20 text-gray-400",
    };
    return colors[fileType] || "bg-muted text-muted-foreground";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            업로드된 문서
            <Badge variant="secondary" className="ml-2">
              {totalCount}개
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadDocuments}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            새로고침
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          임베딩된 문서 목록입니다. 총 {totalCount}개 문서
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              문서 로딩 중...
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              등록된 문서가 없습니다. 첫 번째 지식문서를 업로드해보세요!
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <FileText className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{doc.title}</p>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getFileTypeColor(doc.file_type)}`}
                      >
                        .{doc.file_type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {doc.chunk_count}개 청크 • {new Date(doc.created_at).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                  onClick={() => handleDelete(doc.id, doc.title)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {totalCount}개 중 {(currentPage - 1) * DOCS_PER_PAGE + 1}-{Math.min(currentPage * DOCS_PER_PAGE, totalCount)}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                이전
              </Button>
              <span className="text-sm px-2">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                다음
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentList;
