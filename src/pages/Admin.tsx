import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, FileText, BarChart3, Bell, Settings, Upload, 
  Trash2, Loader2, ChevronLeft, Search, RefreshCw,
  TrendingUp, BookOpen, Gamepad2, MessageSquare, PenTool, Star
} from "lucide-react";
import { motion } from "framer-motion";

interface StatCard {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: string;
  color: string;
}

interface Document {
  id: string;
  title: string;
  content: string;
  created_at: string;
  file_type: string;
}

interface UserProfile {
  id: string;
  username: string;
  points: number;
  money: number;
  hp: number;
  created_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Stats
  const [stats, setStats] = useState<StatCard[]>([]);
  
  // Users
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState("");
  
  // Documents
  const [documents, setDocuments] = useState<Document[]>([]);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocContent, setNewDocContent] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (!roleData) {
        toast({
          title: "접근 거부",
          description: "관리자 권한이 필요합니다.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);
      await loadDashboardData();
    } catch (error) {
      console.error("Admin check error:", error);
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      // Load stats
      const [
        { count: totalUsers },
        { count: totalQuizHistory },
        { count: totalWritingCorrections },
        { count: totalReviews },
        { count: totalDocuments },
        { count: totalAIQuestions },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("quiz_history").select("*", { count: "exact", head: true }),
        supabase.from("writing_corrections").select("*", { count: "exact", head: true }),
        supabase.from("reviews").select("*", { count: "exact", head: true }),
        supabase.from("knowledge_documents").select("*", { count: "exact", head: true }),
        supabase.from("ai_question_usage").select("*", { count: "exact", head: true }),
      ]);

      setStats([
        { title: "총 사용자", value: totalUsers || 0, icon: <Users className="w-5 h-5" />, color: "text-blue-500" },
        { title: "퀴즈 플레이", value: totalQuizHistory || 0, icon: <Gamepad2 className="w-5 h-5" />, color: "text-green-500" },
        { title: "작문 교정", value: totalWritingCorrections || 0, icon: <PenTool className="w-5 h-5" />, color: "text-purple-500" },
        { title: "AI 튜터 질문", value: totalAIQuestions || 0, icon: <MessageSquare className="w-5 h-5" />, color: "text-orange-500" },
        { title: "지식 문서", value: totalDocuments || 0, icon: <BookOpen className="w-5 h-5" />, color: "text-cyan-500" },
        { title: "리뷰", value: totalReviews || 0, icon: <Star className="w-5 h-5" />, color: "text-yellow-500" },
      ]);

      // Load users
      const { data: usersData } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      setUsers(usersData || []);

      // Load documents
      const { data: docsData } = await supabase
        .from("knowledge_documents")
        .select("id, title, content, created_at, file_type")
        .order("created_at", { ascending: false });
      setDocuments(docsData || []);

    } catch (error) {
      console.error("Load data error:", error);
      toast({
        title: "데이터 로드 실패",
        description: "데이터를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleUploadDocument = async () => {
    if (!newDocTitle.trim() || !newDocContent.trim()) {
      toast({
        title: "입력 오류",
        description: "제목과 내용을 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setUploadingDoc(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag-embed`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            title: newDocTitle,
            content: newDocContent,
            file_type: "text",
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Upload failed");
      }

      toast({
        title: "업로드 성공",
        description: `"${newDocTitle}" 문서가 ${result.chunks_created}개의 청크로 임베딩되었습니다.`,
      });

      setNewDocTitle("");
      setNewDocContent("");
      await loadDashboardData();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "업로드 실패",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId: string, title: string) => {
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

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Delete failed");
      }

      toast({
        title: "삭제 완료",
        description: `"${title}" 문서가 삭제되었습니다.`,
      });

      await loadDashboardData();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "삭제 실패",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.id.toLowerCase().includes(userSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-korean-purple flex items-center justify-center">
                <Settings className="w-4 h-4 text-white" />
              </div>
              <h1 className="font-heading font-bold text-xl">관리자 대시보드</h1>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadDashboardData()}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">대시보드</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">사용자</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">지식문서</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">알림</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className={`${stat.color} mb-2`}>{stat.icon}</div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <div className="mt-8 grid md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    최근 활동
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    활동 그래프는 추후 추가 예정입니다.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    최근 등록 문서
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {documents.slice(0, 5).map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <span className="text-sm font-medium truncate max-w-[200px]">{doc.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(doc.created_at).toLocaleDateString("ko-KR")}
                        </span>
                      </div>
                    ))}
                    {documents.length === 0 && (
                      <p className="text-muted-foreground text-sm">등록된 문서가 없습니다.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <CardTitle>사용자 관리</CardTitle>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="사용자 검색..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-10 w-full sm:w-[300px]"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">사용자명</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">포인트</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">머니</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">HP</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">가입일</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="border-b border-border/50 hover:bg-muted/50">
                          <td className="py-3 px-4 text-sm font-medium">{user.username}</td>
                          <td className="py-3 px-4 text-sm">{user.points.toLocaleString()}</td>
                          <td className="py-3 px-4 text-sm">{user.money.toLocaleString()}₩</td>
                          <td className="py-3 px-4 text-sm">{user.hp}</td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">
                            {new Date(user.created_at).toLocaleDateString("ko-KR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredUsers.length === 0 && (
                    <p className="text-center py-8 text-muted-foreground">검색 결과가 없습니다.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Upload Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    지식문서 업로드
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">문서 제목</label>
                    <Input
                      placeholder="예: TOPIK II 문법 총정리"
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">문서 내용</label>
                    <Textarea
                      placeholder="문서 내용을 입력하세요. 자동으로 의미 기반 청킹 및 임베딩이 수행됩니다."
                      value={newDocContent}
                      onChange={(e) => setNewDocContent(e.target.value)}
                      rows={10}
                    />
                  </div>
                  <Button
                    onClick={handleUploadDocument}
                    disabled={uploadingDoc}
                    className="w-full"
                  >
                    {uploadingDoc ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        임베딩 처리 중...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        업로드 및 임베딩
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Documents List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    등록된 문서 ({documents.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-4 bg-muted/50 rounded-lg flex items-start justify-between gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{doc.title}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {doc.content.substring(0, 100)}...
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(doc.created_at).toLocaleString("ko-KR")}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteDocument(doc.id, doc.title)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    {documents.length === 0 && (
                      <p className="text-center py-8 text-muted-foreground">
                        등록된 문서가 없습니다. 첫 번째 지식문서를 업로드해보세요!
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  알림 관리
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  알림 발송 기능은 추후 추가 예정입니다.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
