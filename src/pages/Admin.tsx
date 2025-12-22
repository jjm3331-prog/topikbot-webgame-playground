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
  TrendingUp, BookOpen, Gamepad2, MessageSquare, PenTool, Star,
  Briefcase, Eye, CheckCircle, XCircle, Clock, Download, FileDown,
  Crown, UserCheck
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
  email?: string;
  points: number;
  money: number;
  hp: number;
  created_at: string;
  subscription_plan?: string;
  subscription_expires?: string;
}

interface HeadhuntingApplication {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  birth_year: number | null;
  education_level: string | null;
  university_name: string | null;
  major: string | null;
  topik_level: number | null;
  work_experience_years: number;
  current_company: string | null;
  desired_job_type: string | null;
  desired_industry: string | null;
  desired_location: string | null;
  introduction: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  resume_url: string | null;
  cover_letter_url: string | null;
  portfolio_url: string | null;
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
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [updatingSubscription, setUpdatingSubscription] = useState(false);
  
  // Documents
  const [documents, setDocuments] = useState<Document[]>([]);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocContent, setNewDocContent] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  
  // Headhunting
  const [headhuntingApplications, setHeadhuntingApplications] = useState<HeadhuntingApplication[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<HeadhuntingApplication | null>(null);
  const [headhuntingSearch, setHeadhuntingSearch] = useState("");

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
        { count: totalHeadhunting },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("quiz_history").select("*", { count: "exact", head: true }),
        supabase.from("writing_corrections").select("*", { count: "exact", head: true }),
        supabase.from("reviews").select("*", { count: "exact", head: true }),
        supabase.from("knowledge_documents").select("*", { count: "exact", head: true }),
        supabase.from("ai_question_usage").select("*", { count: "exact", head: true }),
        supabase.from("headhunting_applications").select("*", { count: "exact", head: true }),
      ]);

      setStats([
        { title: "총 사용자", value: totalUsers || 0, icon: <Users className="w-5 h-5" />, color: "text-blue-500" },
        { title: "헤드헌팅 신청", value: totalHeadhunting || 0, icon: <Briefcase className="w-5 h-5" />, color: "text-korean-purple" },
        { title: "작문 교정", value: totalWritingCorrections || 0, icon: <PenTool className="w-5 h-5" />, color: "text-purple-500" },
        { title: "AI 튜터 질문", value: totalAIQuestions || 0, icon: <MessageSquare className="w-5 h-5" />, color: "text-orange-500" },
        { title: "지식 문서", value: totalDocuments || 0, icon: <BookOpen className="w-5 h-5" />, color: "text-cyan-500" },
        { title: "퀴즈 플레이", value: totalQuizHistory || 0, icon: <Gamepad2 className="w-5 h-5" />, color: "text-green-500" },
      ]);

      // Load users via edge function to get emails
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({ action: "list" }),
          }
        );
        const result = await response.json();
        if (response.ok && result.users) {
          setUsers(result.users);
        }
      } catch (error) {
        console.error("Load users error:", error);
      }

      // Load documents
      const { data: docsData } = await supabase
        .from("knowledge_documents")
        .select("id, title, content, created_at, file_type")
        .order("created_at", { ascending: false });
      setDocuments(docsData || []);

      // Load headhunting applications
      const { data: headhuntingData } = await supabase
        .from("headhunting_applications")
        .select("*")
        .order("created_at", { ascending: false });
      setHeadhuntingApplications(headhuntingData || []);

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

  const handleUpdateApplicationStatus = async (appId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("headhunting_applications")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", appId);

      if (error) throw error;

      toast({
        title: "상태 업데이트",
        description: `신청서 상태가 "${newStatus}"로 변경되었습니다.`,
      });

      await loadDashboardData();
      setSelectedApplication(null);
    } catch (error: any) {
      console.error("Update status error:", error);
      toast({
        title: "업데이트 실패",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.id.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const handleUpdateSubscription = async (userId: string, plan: string) => {
    setUpdatingSubscription(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ action: "update_subscription", userId, plan }),
        }
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to update subscription");
      }
      toast({
        title: "구독 변경 완료",
        description: `사용자의 구독이 ${plan === 'premium' ? 'Premium' : plan === 'plus' ? 'Plus' : 'Free'}로 변경되었습니다.`,
      });
      await loadDashboardData();
      setSelectedUser(null);
    } catch (error: any) {
      console.error("Update subscription error:", error);
      toast({
        title: "구독 변경 실패",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdatingSubscription(false);
    }
  };

  const getSubscriptionBadge = (plan?: string) => {
    switch (plan) {
      case 'premium':
        return <span className="px-2 py-1 text-xs rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 text-white font-bold">Premium</span>;
      case 'plus':
        return <span className="px-2 py-1 text-xs rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold">Plus</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground">Free</span>;
    }
  };

  const filteredHeadhunting = headhuntingApplications.filter(
    (app) =>
      app.full_name.toLowerCase().includes(headhuntingSearch.toLowerCase()) ||
      app.email.toLowerCase().includes(headhuntingSearch.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">대기중</span>;
      case 'reviewing':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">검토중</span>;
      case 'matched':
        return <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">매칭중</span>;
      case 'hired':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">채용완료</span>;
      case 'rejected':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">거절</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground">{status}</span>;
    }
  };

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
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">대시보드</span>
            </TabsTrigger>
            <TabsTrigger value="headhunting" className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              <span className="hidden sm:inline">헤드헌팅</span>
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

          {/* Headhunting Tab */}
          <TabsContent value="headhunting">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Applications List */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <CardTitle className="flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-korean-purple" />
                        헤드헌팅 신청 ({headhuntingApplications.length})
                      </CardTitle>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="이름, 이메일 검색..."
                          value={headhuntingSearch}
                          onChange={(e) => setHeadhuntingSearch(e.target.value)}
                          className="pl-10 w-full sm:w-[250px]"
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {filteredHeadhunting.map((app) => (
                        <div
                          key={app.id}
                          onClick={() => setSelectedApplication(app)}
                          className={`p-4 rounded-lg border cursor-pointer transition-all ${
                            selectedApplication?.id === app.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50 hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold truncate">{app.full_name}</h4>
                                {getStatusBadge(app.status)}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">{app.email}</p>
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                {app.topik_level && <span>TOPIK {app.topik_level}급</span>}
                                {app.desired_location && (
                                  <span>{app.desired_location === 'korea' ? '🇰🇷 한국' : app.desired_location === 'vietnam_korean' ? '🇻🇳 베트남 내 한국기업' : '양쪽 가능'}</span>
                                )}
                              </div>
                            </div>
                            <Eye className="w-4 h-4 text-muted-foreground shrink-0" />
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(app.created_at).toLocaleDateString("ko-KR")} 신청
                          </p>
                        </div>
                      ))}
                      {filteredHeadhunting.length === 0 && (
                        <p className="text-center py-8 text-muted-foreground">
                          {headhuntingSearch ? '검색 결과가 없습니다.' : '신청 내역이 없습니다.'}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Application Detail */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">신청서 상세</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedApplication ? (
                      <div className="space-y-4 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">이름</p>
                          <p className="font-medium">{selectedApplication.full_name}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">이메일</p>
                          <p>{selectedApplication.email}</p>
                        </div>
                        {selectedApplication.phone && (
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">전화번호</p>
                            <p>{selectedApplication.phone}</p>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">TOPIK</p>
                            <p>{selectedApplication.topik_level ? `${selectedApplication.topik_level}급` : '-'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">경력</p>
                            <p>{selectedApplication.work_experience_years}년</p>
                          </div>
                        </div>
                        {selectedApplication.introduction && (
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">자기소개</p>
                            <p className="text-xs leading-relaxed">{selectedApplication.introduction}</p>
                          </div>
                        )}
                        
                        {/* File Downloads Section */}
                        {(selectedApplication.resume_url || selectedApplication.cover_letter_url || selectedApplication.portfolio_url) && (
                          <div className="pt-3 border-t">
                            <p className="text-muted-foreground text-xs mb-2 flex items-center gap-1">
                              <FileDown className="w-3 h-3" /> 첨부 파일
                            </p>
                            <div className="space-y-2">
                              {selectedApplication.resume_url && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full justify-start gap-2"
                                  onClick={async () => {
                                    const { data } = await supabase.storage
                                      .from('resumes')
                                      .createSignedUrl(selectedApplication.resume_url!, 60);
                                    if (data?.signedUrl) {
                                      window.open(data.signedUrl, '_blank');
                                    }
                                  }}
                                >
                                  <Download className="w-3 h-3" />
                                  이력서 다운로드
                                </Button>
                              )}
                              {selectedApplication.cover_letter_url && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full justify-start gap-2"
                                  onClick={async () => {
                                    const { data } = await supabase.storage
                                      .from('resumes')
                                      .createSignedUrl(selectedApplication.cover_letter_url!, 60);
                                    if (data?.signedUrl) {
                                      window.open(data.signedUrl, '_blank');
                                    }
                                  }}
                                >
                                  <Download className="w-3 h-3" />
                                  자기소개서 다운로드
                                </Button>
                              )}
                              {selectedApplication.portfolio_url && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full justify-start gap-2"
                                  onClick={async () => {
                                    const { data } = await supabase.storage
                                      .from('resumes')
                                      .createSignedUrl(selectedApplication.portfolio_url!, 60);
                                    if (data?.signedUrl) {
                                      window.open(data.signedUrl, '_blank');
                                    }
                                  }}
                                >
                                  <Download className="w-3 h-3" />
                                  포트폴리오 다운로드
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                        <div className="pt-4 border-t space-y-2">
                          <p className="text-muted-foreground text-xs mb-2">상태 변경</p>
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleUpdateApplicationStatus(selectedApplication.id, 'reviewing')}>
                              <Clock className="w-3 h-3 mr-1" /> 검토중
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleUpdateApplicationStatus(selectedApplication.id, 'matched')}>
                              <CheckCircle className="w-3 h-3 mr-1" /> 매칭중
                            </Button>
                            <Button size="sm" variant="default" onClick={() => handleUpdateApplicationStatus(selectedApplication.id, 'hired')}>
                              <CheckCircle className="w-3 h-3 mr-1" /> 채용완료
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleUpdateApplicationStatus(selectedApplication.id, 'rejected')}>
                              <XCircle className="w-3 h-3 mr-1" /> 거절
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm text-center py-8">
                        왼쪽에서 신청서를 선택하세요
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Users List */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-500" />
                        사용자 관리 ({users.length})
                      </CardTitle>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="이름, 이메일 검색..."
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          className="pl-10 w-full sm:w-[250px]"
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                      {filteredUsers.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => setSelectedUser(user)}
                          className={`p-4 rounded-lg border cursor-pointer transition-all ${
                            selectedUser?.id === user.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50 hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold truncate">{user.username}</h4>
                                {getSubscriptionBadge(user.subscription_plan)}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">{user.email || 'No email'}</p>
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                <span>포인트: {user.points.toLocaleString()}</span>
                                <span>머니: {user.money.toLocaleString()}₩</span>
                              </div>
                            </div>
                            <Eye className="w-4 h-4 text-muted-foreground shrink-0" />
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(user.created_at).toLocaleDateString("ko-KR")} 가입
                          </p>
                        </div>
                      ))}
                      {filteredUsers.length === 0 && (
                        <p className="text-center py-8 text-muted-foreground">
                          {userSearch ? '검색 결과가 없습니다.' : '사용자가 없습니다.'}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* User Detail */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <UserCheck className="w-4 h-4" />
                      사용자 상세
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedUser ? (
                      <div className="space-y-4 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">사용자명</p>
                          <p className="font-medium">{selectedUser.username}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">이메일</p>
                          <p className="break-all">{selectedUser.email || '-'}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">포인트</p>
                            <p>{selectedUser.points.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">머니</p>
                            <p>{selectedUser.money.toLocaleString()}₩</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">HP</p>
                            <p>{selectedUser.hp}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">현재 구독</p>
                          <div className="mt-1">{getSubscriptionBadge(selectedUser.subscription_plan)}</div>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">가입일</p>
                          <p>{new Date(selectedUser.created_at).toLocaleDateString("ko-KR")}</p>
                        </div>
                        
                        <div className="pt-4 border-t space-y-2">
                          <p className="text-muted-foreground text-xs mb-2 flex items-center gap-1">
                            <Crown className="w-3 h-3" /> 구독 권한 변경
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              disabled={updatingSubscription || selectedUser.subscription_plan === 'free'}
                              onClick={() => handleUpdateSubscription(selectedUser.id, 'free')}
                            >
                              {updatingSubscription ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                              Free
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="border-blue-500/50 text-blue-500 hover:bg-blue-500/10"
                              disabled={updatingSubscription || selectedUser.subscription_plan === 'plus'}
                              onClick={() => handleUpdateSubscription(selectedUser.id, 'plus')}
                            >
                              {updatingSubscription ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                              Plus
                            </Button>
                            <Button 
                              size="sm" 
                              className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white hover:from-yellow-600 hover:to-amber-600"
                              disabled={updatingSubscription || selectedUser.subscription_plan === 'premium'}
                              onClick={() => handleUpdateSubscription(selectedUser.id, 'premium')}
                            >
                              {updatingSubscription ? <Loader2 className="w-3 h-3 animate-spin" /> : <Crown className="w-3 h-3 mr-1" />}
                              Premium
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm text-center py-8">
                        왼쪽에서 사용자를 선택하세요
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
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
