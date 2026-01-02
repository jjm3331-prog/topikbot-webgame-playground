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
  Crown, UserCheck, ChevronRight, Shield, Send, Globe, User, AlertTriangle, Info, Languages,
  ClipboardList, Sparkles
} from "lucide-react";
import DocumentUploader from "@/components/admin/DocumentUploader";
import DocumentList from "@/components/admin/DocumentList";
import TestimonialsManager from "@/components/admin/TestimonialsManager";
import VocabTranslationManager from "@/components/admin/VocabTranslationManager";
import MockExamManager from "@/components/admin/MockExamManager";
import MockExamGenerator from "@/components/admin/MockExamGenerator";
import HanjaImporter from "@/components/admin/HanjaImporter";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { motion } from "framer-motion";

interface StatCard {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: string;
  color: string;
}

// Document interface moved to DocumentList component

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
  admin_notes: string | null;
}

const ADMIN_EMAIL = "lukas@tam9.me";

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
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const usersPerPage = 20;
  const [updatingSubscription, setUpdatingSubscription] = useState(false);
  
  // Documents
  const [documentRefreshTrigger, setDocumentRefreshTrigger] = useState(0);
  
  // Headhunting
  const [headhuntingApplications, setHeadhuntingApplications] = useState<HeadhuntingApplication[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<HeadhuntingApplication | null>(null);
  const [headhuntingSearch, setHeadhuntingSearch] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  // Notifications
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState<"info" | "success" | "warning" | "error">("info");
  const [isGlobalNotification, setIsGlobalNotification] = useState(true);
  const [targetUserId, setTargetUserId] = useState("");
  const [sendingNotification, setSendingNotification] = useState(false);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    is_global: boolean;
    target_user_id: string | null;
    created_at: string;
  }>>([]);
  
  // Quick notification for selected user
  const [quickNotificationOpen, setQuickNotificationOpen] = useState(false);
  const [quickNotificationTitle, setQuickNotificationTitle] = useState("");
  const [quickNotificationMessage, setQuickNotificationMessage] = useState("");
  const [quickNotificationType, setQuickNotificationType] = useState<"info" | "success" | "warning" | "error">("info");
  const [loadingNotifications, setLoadingNotifications] = useState(false);

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

      // CRITICAL: Only allow lukas@tam9.me to access admin
      if (user.email !== ADMIN_EMAIL) {
        toast({
          title: "접근 거부",
          description: "관리자 권한이 없습니다.",
          variant: "destructive",
        });
        navigate("/dashboard");
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
        { count: totalDocuments },
        { count: totalHeadhunting },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("quiz_history").select("*", { count: "exact", head: true }),
        supabase.from("writing_corrections").select("*", { count: "exact", head: true }),
        supabase.from("knowledge_documents").select("*", { count: "exact", head: true }),
        supabase.from("headhunting_applications").select("*", { count: "exact", head: true }),
      ]);

      setStats([
        { title: "총 사용자", value: totalUsers || 0, icon: <Users className="w-5 h-5" />, color: "text-blue-500" },
        { title: "헤드헌팅 신청", value: totalHeadhunting || 0, icon: <Briefcase className="w-5 h-5" />, color: "text-korean-purple" },
        { title: "작문 교정", value: totalWritingCorrections || 0, icon: <PenTool className="w-5 h-5" />, color: "text-purple-500" },
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

      // Documents are now handled by DocumentList component

      // Load headhunting applications
      const { data: headhuntingData } = await supabase
        .from("headhunting_applications")
        .select("*")
        .order("created_at", { ascending: false });
      setHeadhuntingApplications(headhuntingData || []);

      // Load notifications
      await loadNotifications();

    } catch (error) {
      console.error("Load data error:", error);
      toast({
        title: "데이터 로드 실패",
        description: "데이터를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const loadNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error("Load notifications error:", error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleSendNotification = async () => {
    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      toast({
        title: "입력 오류",
        description: "제목과 내용을 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!isGlobalNotification && !targetUserId.trim()) {
      toast({
        title: "입력 오류",
        description: "특정 사용자에게 보내려면 사용자 ID를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setSendingNotification(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("notifications").insert({
        title: notificationTitle.trim(),
        message: notificationMessage.trim(),
        type: notificationType,
        is_global: isGlobalNotification,
        target_user_id: isGlobalNotification ? null : targetUserId.trim(),
        created_by: user?.id,
      });

      if (error) throw error;

      toast({
        title: "알림 발송 완료",
        description: isGlobalNotification 
          ? "모든 사용자에게 알림이 발송되었습니다." 
          : "특정 사용자에게 알림이 발송되었습니다.",
      });

      // Reset form
      setNotificationTitle("");
      setNotificationMessage("");
      setNotificationType("info");
      setIsGlobalNotification(true);
      setTargetUserId("");

      // Reload notifications
      await loadNotifications();
    } catch (error) {
      console.error("Send notification error:", error);
      toast({
        title: "알림 발송 실패",
        description: "알림을 발송하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setSendingNotification(false);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;

      toast({
        title: "알림 삭제 완료",
        description: "알림이 삭제되었습니다.",
      });

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error("Delete notification error:", error);
      toast({
        title: "알림 삭제 실패",
        description: "알림을 삭제하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleQuickNotification = async () => {
    if (!selectedUser) return;
    
    if (!quickNotificationTitle.trim() || !quickNotificationMessage.trim()) {
      toast({
        title: "입력 오류",
        description: "제목과 내용을 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setSendingNotification(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("notifications").insert({
        title: quickNotificationTitle.trim(),
        message: quickNotificationMessage.trim(),
        type: quickNotificationType,
        is_global: false,
        target_user_id: selectedUser.id,
        created_by: user?.id,
      });

      if (error) throw error;

      toast({
        title: "알림 발송 완료",
        description: `${selectedUser.username}님에게 알림이 발송되었습니다.`,
      });

      // Reset form and close dialog
      setQuickNotificationTitle("");
      setQuickNotificationMessage("");
      setQuickNotificationType("info");
      setQuickNotificationOpen(false);

      // Reload notifications
      await loadNotifications();
    } catch (error) {
      console.error("Send quick notification error:", error);
      toast({
        title: "알림 발송 실패",
        description: "알림을 발송하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setSendingNotification(false);
    }
  };

  // Document upload/delete handlers are now in separate components

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

  const handleSendMessageToApplicant = async () => {
    if (!selectedApplication || !adminMessage.trim()) {
      toast({
        title: "메시지 입력 필요",
        description: "전송할 메시지를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setSendingMessage(true);
    try {
      // Update admin_notes in application
      const { error: updateError } = await supabase
        .from("headhunting_applications")
        .update({ 
          admin_notes: adminMessage,
          updated_at: new Date().toISOString() 
        })
        .eq("id", selectedApplication.id);

      if (updateError) throw updateError;

      // Send notification to user
      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          title: "📩 Headhunting: Tin nhắn mới từ tư vấn viên",
          message: adminMessage,
          type: "info",
          target_user_id: selectedApplication.user_id,
          is_global: false,
        });

      if (notifError) throw notifError;

      toast({
        title: "메시지 전송 완료",
        description: `${selectedApplication.full_name}님에게 메시지가 전송되었습니다.`,
      });

      setAdminMessage("");
      await loadDashboardData();
    } catch (error: any) {
      console.error("Send message error:", error);
      toast({
        title: "전송 실패",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.id.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase()))
  );

  // Pagination calculations
  const totalUserPages = Math.ceil(filteredUsers.length / usersPerPage);
  const paginatedUsers = filteredUsers.slice(
    (userCurrentPage - 1) * usersPerPage,
    userCurrentPage * usersPerPage
  );

  // Reset page when search changes
  useEffect(() => {
    setUserCurrentPage(1);
  }, [userSearch]);

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
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-10 mb-8">
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
            <TabsTrigger value="mockexam" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">모의고사</span>
            </TabsTrigger>
            <TabsTrigger value="ai-generate" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">AI생성</span>
            </TabsTrigger>
            <TabsTrigger value="hanja" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">한자어</span>
            </TabsTrigger>
            <TabsTrigger value="vocabulary" className="flex items-center gap-2">
              <Languages className="w-4 h-4" />
              <span className="hidden sm:inline">어휘</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">지식문서</span>
            </TabsTrigger>
            <TabsTrigger value="testimonials" className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              <span className="hidden sm:inline">후기</span>
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

            {/* Quick Access Cards */}
            <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card 
                className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-pink-500/50 bg-gradient-to-br from-pink-500/10 to-rose-500/10"
                onClick={() => navigate('/admin/shorts')}
              >
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold">숏츠 관리</h3>
                    <p className="text-sm text-muted-foreground">YouTube Shorts 등록</p>
                  </div>
                  <ChevronRight className="w-5 h-5 ml-auto text-muted-foreground" />
                </CardContent>
              </Card>


              <Card className="cursor-pointer hover:shadow-lg transition-all">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-korean-purple/10 flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-korean-purple" />
                  </div>
                  <div>
                    <h3 className="font-bold">지식문서</h3>
                    <p className="text-sm text-muted-foreground">RAG 문서 관리</p>
                  </div>
                  <ChevronRight className="w-5 h-5 ml-auto text-muted-foreground" />
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-all">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-korean-orange/10 flex items-center justify-center">
                    <Star className="w-6 h-6 text-korean-orange" />
                  </div>
                  <div>
                    <h3 className="font-bold">후기 관리</h3>
                    <p className="text-sm text-muted-foreground">사용자 후기 관리</p>
                  </div>
                  <ChevronRight className="w-5 h-5 ml-auto text-muted-foreground" />
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
                        {/* Message to Applicant */}
                        <div className="pt-4 border-t space-y-2">
                          <p className="text-muted-foreground text-xs mb-2 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" /> 지원자에게 메시지 보내기
                          </p>
                          {selectedApplication.admin_notes && (
                            <div className="p-2 bg-muted/50 rounded-lg text-xs mb-2">
                              <p className="text-muted-foreground mb-1">이전 메시지:</p>
                              <p className="text-foreground">{selectedApplication.admin_notes}</p>
                            </div>
                          )}
                          <Textarea
                            placeholder="지원자에게 전송할 메시지를 입력하세요..."
                            value={adminMessage}
                            onChange={(e) => setAdminMessage(e.target.value)}
                            className="min-h-[80px] text-sm"
                          />
                          <Button 
                            size="sm" 
                            className="w-full"
                            onClick={handleSendMessageToApplicant}
                            disabled={sendingMessage || !adminMessage.trim()}
                          >
                            {sendingMessage ? (
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                              <Bell className="w-3 h-3 mr-1" />
                            )}
                            알림 메시지 전송
                          </Button>
                        </div>

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
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {paginatedUsers.map((user) => (
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
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h4 className="font-semibold truncate">{user.username}</h4>
                                {user.email === ADMIN_EMAIL && (
                                  <span className="px-2 py-0.5 text-xs rounded-full bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold flex items-center gap-1">
                                    <Shield className="w-3 h-3" /> ADMIN
                                  </span>
                                )}
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
                    
                    {/* Pagination */}
                    {totalUserPages > 1 && (
                      <div className="flex items-center justify-between pt-4 border-t mt-4">
                        <p className="text-sm text-muted-foreground">
                          {filteredUsers.length}명 중 {(userCurrentPage - 1) * usersPerPage + 1}-{Math.min(userCurrentPage * usersPerPage, filteredUsers.length)}명
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={userCurrentPage === 1}
                            onClick={() => setUserCurrentPage(p => p - 1)}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalUserPages) }, (_, i) => {
                              let pageNum: number;
                              if (totalUserPages <= 5) {
                                pageNum = i + 1;
                              } else if (userCurrentPage <= 3) {
                                pageNum = i + 1;
                              } else if (userCurrentPage >= totalUserPages - 2) {
                                pageNum = totalUserPages - 4 + i;
                              } else {
                                pageNum = userCurrentPage - 2 + i;
                              }
                              return (
                                <Button
                                  key={pageNum}
                                  variant={userCurrentPage === pageNum ? "default" : "outline"}
                                  size="sm"
                                  className="w-8 h-8 p-0"
                                  onClick={() => setUserCurrentPage(pageNum)}
                                >
                                  {pageNum}
                                </Button>
                              );
                            })}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={userCurrentPage === totalUserPages}
                            onClick={() => setUserCurrentPage(p => p + 1)}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
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
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{selectedUser.username}</p>
                            {selectedUser.email === ADMIN_EMAIL && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold flex items-center gap-1">
                                <Shield className="w-3 h-3" /> ADMIN
                              </span>
                            )}
                          </div>
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
                              disabled={updatingSubscription || selectedUser.subscription_plan === 'free' || !selectedUser.subscription_plan}
                              onClick={() => handleUpdateSubscription(selectedUser.id, 'free')}
                            >
                              {updatingSubscription ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                              Free
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
                        
                        {/* Quick Notification Button */}
                        <div className="pt-4 border-t space-y-2">
                          <p className="text-muted-foreground text-xs mb-2 flex items-center gap-1">
                            <Bell className="w-3 h-3" /> 알림 발송
                          </p>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="w-full"
                            onClick={() => setQuickNotificationOpen(true)}
                          >
                            <Send className="w-3 h-3 mr-2" />
                            이 사용자에게 알림 보내기
                          </Button>
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

          {/* Quick Notification Dialog */}
          <Dialog open={quickNotificationOpen} onOpenChange={setQuickNotificationOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  알림 발송
                </DialogTitle>
                <DialogDescription>
                  {selectedUser?.username}님에게 알림을 보냅니다.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>알림 유형</Label>
                  <Select
                    value={quickNotificationType}
                    onValueChange={(v) => setQuickNotificationType(v as typeof quickNotificationType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">
                        <span className="flex items-center gap-2">
                          <Info className="w-4 h-4 text-blue-500" /> 정보
                        </span>
                      </SelectItem>
                      <SelectItem value="success">
                        <span className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" /> 성공
                        </span>
                      </SelectItem>
                      <SelectItem value="warning">
                        <span className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-500" /> 경고
                        </span>
                      </SelectItem>
                      <SelectItem value="error">
                        <span className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-red-500" /> 오류
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>제목</Label>
                  <Input
                    placeholder="알림 제목을 입력하세요"
                    value={quickNotificationTitle}
                    onChange={(e) => setQuickNotificationTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>내용</Label>
                  <Textarea
                    placeholder="알림 내용을 입력하세요"
                    value={quickNotificationMessage}
                    onChange={(e) => setQuickNotificationMessage(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setQuickNotificationOpen(false)}
                >
                  취소
                </Button>
                <Button
                  onClick={handleQuickNotification}
                  disabled={sendingNotification || !quickNotificationTitle.trim() || !quickNotificationMessage.trim()}
                >
                  {sendingNotification ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  발송
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Mock Exam Tab */}
          <TabsContent value="mockexam">
            <MockExamManager />
          </TabsContent>

          {/* Hanja Tab */}
          <TabsContent value="hanja">
            <HanjaImporter />
          </TabsContent>

          {/* Vocabulary Tab */}
          <TabsContent value="vocabulary">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Languages className="w-5 h-5 text-primary" />
                  어휘 7개국 번역 관리
                </CardTitle>
              </CardHeader>
              <CardContent>
                <VocabTranslationManager />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <div className="grid lg:grid-cols-2 gap-8">
              <DocumentUploader onUploadComplete={() => setDocumentRefreshTrigger(t => t + 1)} />
              <DocumentList refreshTrigger={documentRefreshTrigger} />
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Send Notification Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="w-5 h-5" />
                    새 알림 발송
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="notification-title">알림 제목</Label>
                    <Input
                      id="notification-title"
                      placeholder="알림 제목을 입력하세요"
                      value={notificationTitle}
                      onChange={(e) => setNotificationTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notification-message">알림 내용</Label>
                    <Textarea
                      id="notification-message"
                      placeholder="알림 내용을 입력하세요"
                      value={notificationMessage}
                      onChange={(e) => setNotificationMessage(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>알림 유형</Label>
                    <Select value={notificationType} onValueChange={(value: "info" | "success" | "warning" | "error") => setNotificationType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">
                          <div className="flex items-center gap-2">
                            <Info className="w-4 h-4 text-blue-500" />
                            정보
                          </div>
                        </SelectItem>
                        <SelectItem value="success">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            성공
                          </div>
                        </SelectItem>
                        <SelectItem value="warning">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                            경고
                          </div>
                        </SelectItem>
                        <SelectItem value="error">
                          <div className="flex items-center gap-2">
                            <XCircle className="w-4 h-4 text-red-500" />
                            오류
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>발송 대상</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={isGlobalNotification ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIsGlobalNotification(true)}
                        className="flex-1"
                      >
                        <Globe className="w-4 h-4 mr-2" />
                        전체 사용자
                      </Button>
                      <Button
                        type="button"
                        variant={!isGlobalNotification ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIsGlobalNotification(false)}
                        className="flex-1"
                      >
                        <User className="w-4 h-4 mr-2" />
                        특정 사용자
                      </Button>
                    </div>
                  </div>

                  {!isGlobalNotification && (
                    <div className="space-y-2">
                      <Label htmlFor="target-user">대상 사용자 ID</Label>
                      <Input
                        id="target-user"
                        placeholder="사용자 ID (UUID)"
                        value={targetUserId}
                        onChange={(e) => setTargetUserId(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        사용자 탭에서 사용자 ID를 확인할 수 있습니다.
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={handleSendNotification}
                    disabled={sendingNotification}
                    className="w-full"
                  >
                    {sendingNotification ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        발송 중...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        알림 발송
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Notifications List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-5 h-5" />
                      발송된 알림 ({notifications.length})
                    </div>
                    <Button variant="ghost" size="icon" onClick={loadNotifications}>
                      <RefreshCw className={`w-4 h-4 ${loadingNotifications ? "animate-spin" : ""}`} />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {loadingNotifications ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">
                        발송된 알림이 없습니다.
                      </p>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="p-4 bg-muted/50 rounded-lg flex items-start justify-between gap-4"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-medium truncate">{notification.title}</h4>
                              <Badge variant={
                                notification.type === "success" ? "default" :
                                notification.type === "warning" ? "secondary" :
                                notification.type === "error" ? "destructive" : "outline"
                              }>
                                {notification.type === "info" && "정보"}
                                {notification.type === "success" && "성공"}
                                {notification.type === "warning" && "경고"}
                                {notification.type === "error" && "오류"}
                              </Badge>
                              <Badge variant="outline">
                                {notification.is_global ? (
                                  <><Globe className="w-3 h-3 mr-1" />전체</>
                                ) : (
                                  <><User className="w-3 h-3 mr-1" />개인</>
                                )}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(notification.created_at).toLocaleString("ko-KR")}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteNotification(notification.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* AI Generate Tab */}
          <TabsContent value="ai-generate">
            <MockExamGenerator />
          </TabsContent>

          {/* Testimonials Tab */}
          <TabsContent value="testimonials">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-korean-yellow" />
                  랜딩 페이지 후기 관리
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TestimonialsManager />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
