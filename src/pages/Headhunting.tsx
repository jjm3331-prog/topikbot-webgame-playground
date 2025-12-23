import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { motion } from "framer-motion";

import { 
  Briefcase, 
  Crown, 
  CheckCircle2, 
  Building2, 
  Globe, 
  Users, 
  Rocket,
  Shield,
  Star,
  ArrowRight,
  Loader2,
  Upload,
  FileText,
  X,
  Lock
} from "lucide-react";
import { PremiumPreviewBanner } from "@/components/PremiumPreviewBanner";
import { useSubscription } from "@/hooks/useSubscription";

const benefits = [
  { icon: Crown, title: "Đội ngũ Headhunter chuyên nghiệp", desc: "Kết nối trực tiếp với doanh nghiệp Hàn Quốc" },
  { icon: Building2, title: "500+ công ty đối tác", desc: "Từ Samsung, LG, Hyundai đến các startup" },
  { icon: Globe, title: "Hỗ trợ làm việc tại Hàn", desc: "Tư vấn visa, chỗ ở, cuộc sống" },
  { icon: Shield, title: "MIỄN PHÍ 100%", desc: "Hoàn toàn miễn phí cho thành viên Premium" },
];

interface FileUploadState {
  file: File | null;
  uploading: boolean;
  url: string | null;
  error: string | null;
}

const Headhunting = () => {
  const navigate = useNavigate();
  const { isPremium } = useSubscription();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [applications, setApplications] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const coverLetterInputRef = useRef<HTMLInputElement>(null);
  const portfolioInputRef = useRef<HTMLInputElement>(null);
  
  const [resumeUpload, setResumeUpload] = useState<FileUploadState>({ file: null, uploading: false, url: null, error: null });
  const [coverLetterUpload, setCoverLetterUpload] = useState<FileUploadState>({ file: null, uploading: false, url: null, error: null });
  const [portfolioUpload, setPortfolioUpload] = useState<FileUploadState>({ file: null, uploading: false, url: null, error: null });
  
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    birth_year: "",
    education_level: "",
    university_name: "",
    major: "",
    graduation_year: "",
    topik_level: "",
    work_experience_years: "",
    current_job_title: "",
    current_company: "",
    work_experience_details: "",
    desired_job_type: "",
    desired_industry: "",
    desired_location: "",
    desired_salary_range: "",
    introduction: "",
    strengths: "",
    career_goals: "",
    additional_skills: "",
  });

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Vui lòng đăng nhập để tiếp tục");
      navigate("/auth");
      return;
    }
    setUser(session.user);
    setFormData(prev => ({ ...prev, email: session.user.email || "" }));
    
    // Fetch all applications for this user
    const { data } = await supabase
      .from("headhunting_applications")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });
    
    if (data && data.length > 0) {
      setApplications(data);
    } else {
      setShowForm(true); // No applications, show form directly
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'Đang chờ xét duyệt', color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/50', icon: '⏳' };
      case 'reviewing':
        return { label: 'Đang xem xét', color: 'bg-blue-500/20 text-blue-600 border-blue-500/50', icon: '🔍' };
      case 'matched':
        return { label: 'Đã kết nối công ty', color: 'bg-green-500/20 text-green-600 border-green-500/50', icon: '🤝' };
      case 'rejected':
        return { label: 'Không phù hợp', color: 'bg-red-500/20 text-red-600 border-red-500/50', icon: '❌' };
      case 'hired':
        return { label: 'Đã được tuyển dụng', color: 'bg-purple-500/20 text-purple-600 border-purple-500/50', icon: '🎉' };
      default:
        return { label: status, color: 'bg-muted text-muted-foreground border-border', icon: '📋' };
    }
  };

  const handleNewApplication = () => {
    setShowForm(true);
    setSubmitted(false);
    // Reset form
    setFormData({
      full_name: "",
      email: user?.email || "",
      phone: "",
      birth_year: "",
      education_level: "",
      university_name: "",
      major: "",
      graduation_year: "",
      topik_level: "",
      work_experience_years: "",
      current_job_title: "",
      current_company: "",
      work_experience_details: "",
      desired_job_type: "",
      desired_industry: "",
      desired_location: "",
      desired_salary_range: "",
      introduction: "",
      strengths: "",
      career_goals: "",
      additional_skills: "",
    });
    setResumeUpload({ file: null, uploading: false, url: null, error: null });
    setCoverLetterUpload({ file: null, uploading: false, url: null, error: null });
    setPortfolioUpload({ file: null, uploading: false, url: null, error: null });
  };

  const uploadFile = async (
    file: File,
    type: 'resume' | 'cover_letter' | 'portfolio',
    setUploadState: React.Dispatch<React.SetStateAction<FileUploadState>>
  ): Promise<string | null> => {
    if (!user) return null;
    
    setUploadState(prev => ({ ...prev, uploading: true, error: null }));
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${type}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(fileName, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('resumes')
        .getPublicUrl(fileName);
      
      setUploadState({ file, uploading: false, url: fileName, error: null });
      toast.success(`${type === 'resume' ? 'CV' : type === 'cover_letter' ? 'Thư xin việc' : 'Portfolio'} đã tải lên thành công!`);
      return fileName;
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadState(prev => ({ ...prev, uploading: false, error: 'Tải lên thất bại' }));
      toast.error('Không thể tải file lên');
      return null;
    }
  };

  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'resume' | 'cover_letter' | 'portfolio',
    setUploadState: React.Dispatch<React.SetStateAction<FileUploadState>>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Kích thước file tối đa là 10MB');
      return;
    }
    
    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Chỉ chấp nhận file PDF hoặc Word');
      return;
    }
    
    await uploadFile(file, type, setUploadState);
  };

  const removeFile = (
    setUploadState: React.Dispatch<React.SetStateAction<FileUploadState>>,
    inputRef: React.RefObject<HTMLInputElement>
  ) => {
    setUploadState({ file: null, uploading: false, url: null, error: null });
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("headhunting_applications").insert({
        user_id: user.id,
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone || null,
        birth_year: formData.birth_year ? parseInt(formData.birth_year) : null,
        education_level: formData.education_level || null,
        university_name: formData.university_name || null,
        major: formData.major || null,
        graduation_year: formData.graduation_year ? parseInt(formData.graduation_year) : null,
        topik_level: formData.topik_level ? parseInt(formData.topik_level) : null,
        work_experience_years: formData.work_experience_years ? parseInt(formData.work_experience_years) : 0,
        current_job_title: formData.current_job_title || null,
        current_company: formData.current_company || null,
        work_experience_details: formData.work_experience_details || null,
        desired_job_type: formData.desired_job_type || null,
        desired_industry: formData.desired_industry || null,
        desired_location: formData.desired_location || null,
        desired_salary_range: formData.desired_salary_range || null,
        introduction: formData.introduction || null,
        strengths: formData.strengths || null,
        career_goals: formData.career_goals || null,
        additional_skills: formData.additional_skills || null,
        resume_url: resumeUpload.url || null,
        cover_letter_url: coverLetterUpload.url || null,
        portfolio_url: portfolioUpload.url || null,
        status: "pending",
      });

      if (error) throw error;

      // Send notification to user
      await supabase.from("notifications").insert({
        title: "🎉 헤드헌팅 서비스 신청 완료!",
        message: `${formData.full_name}님의 헤드헌팅 서비스 신청이 접수되었습니다. 전문 헤드헌터가 3-5일 내에 검토 후 연락드리겠습니다.`,
        type: "success",
        target_user_id: user.id,
        is_global: false,
      });

      setSubmitted(true);
      toast.success("Đăng ký dịch vụ Headhunting thành công!");
    } catch (error: any) {
      console.error("Submit error:", error);
      toast.error("Có lỗi xảy ra khi đăng ký");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Show application history if user has applications and not showing form
  if (applications.length > 0 && !showForm) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col">
        <CleanHeader />
        <main className="flex-1 pt-24 pb-20 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-korean-purple flex items-center justify-center">
                <Briefcase className="w-8 h-8 text-white" />
              </div>
              <h1 className="font-heading font-bold text-2xl sm:text-3xl text-foreground mb-2">
                Lịch sử đăng ký Headhunting
              </h1>
              <p className="text-muted-foreground">
                Bạn đã gửi {applications.length} đơn đăng ký
              </p>
            </motion.div>

            {/* Applications List */}
            <div className="space-y-4 mb-8">
              {applications.map((app, idx) => {
                const statusInfo = getStatusInfo(app.status);
                return (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card className="p-5 hover:shadow-lg transition-shadow">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl">{statusInfo.icon}</span>
                            <div>
                              <h3 className="font-semibold text-foreground">{app.full_name}</h3>
                              <p className="text-xs text-muted-foreground">
                                {new Date(app.created_at).toLocaleDateString('vi-VN', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {app.desired_job_type && (
                              <span className="px-2 py-0.5 bg-muted rounded-full">{app.desired_job_type}</span>
                            )}
                            {app.desired_industry && (
                              <span className="px-2 py-0.5 bg-muted rounded-full">{app.desired_industry}</span>
                            )}
                            {app.topik_level && (
                              <span className="px-2 py-0.5 bg-muted rounded-full">TOPIK {app.topik_level}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1.5 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>
                      {app.admin_notes && (
                        <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border/50">
                          <p className="text-xs text-muted-foreground font-medium mb-1">💬 Phản hồi từ Headhunter:</p>
                          <p className="text-sm text-foreground">{app.admin_notes}</p>
                        </div>
                      )}
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-3 justify-center"
            >
              <Button 
                onClick={handleNewApplication}
                className="btn-primary text-primary-foreground gap-2"
              >
                <Rocket className="w-4 h-4" />
                Tạo đơn đăng ký mới
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate("/dashboard")}
              >
                Quay về Dashboard
              </Button>
            </motion.div>

            {/* Info Note */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center text-xs text-muted-foreground mt-6"
            >
              💡 Bạn có thể gửi nhiều đơn đăng ký với các vị trí hoặc ngành nghề khác nhau
            </motion.p>
          </div>
        </main>
        <AppFooter />
      </div>
    );
  }

  // Show success message after submission
  if (submitted) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col">
        <CleanHeader />
        <main className="flex-1 pt-24 pb-20 px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-korean-green to-korean-teal flex items-center justify-center"
            >
              <CheckCircle2 className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="font-heading font-bold text-3xl sm:text-4xl text-foreground mb-4">
              🎉 Đăng ký thành công!
            </h1>
            <p className="text-muted-foreground text-lg mb-8">
              Đội ngũ Headhunter sẽ liên hệ với bạn sớm.<br />
              Bạn sẽ nhận được phản hồi trong 3-5 ngày làm việc.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={() => {
                  setSubmitted(false);
                  setShowForm(false);
                  checkUser(); // Refresh applications
                }}
                variant="outline"
              >
                Xem lịch sử đăng ký
              </Button>
              <Button 
                onClick={() => navigate("/dashboard")} 
                className="btn-primary text-primary-foreground"
              >
                Quay về Dashboard
              </Button>
            </div>
          </div>
        </main>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <CleanHeader />
      
      {/* Hero Section */}

      <section className="pt-24 pb-12 px-4 sm:px-6 relative overflow-hidden">
        {/* Premium Preview Banner */}
        {!isPremium && (
          <div className="max-w-4xl mx-auto mb-6">
            <PremiumPreviewBanner featureName="dịch vụ Headhunting" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-korean-purple/10 via-background to-korean-blue/10" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-korean-purple via-korean-blue to-korean-cyan" />
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6"
          >
            <Crown className="w-4 h-4 text-korean-yellow" />
            Dịch vụ dành cho Premium
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-heading font-black text-3xl sm:text-4xl md:text-5xl text-foreground mb-4"
          >
            Dịch vụ <span className="text-gradient-primary">Headhunting</span> doanh nghiệp Hàn Quốc
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto mb-8"
          >
            Đội ngũ Headhunter chuyên nghiệp của LUKATO hỗ trợ bạn xin việc tại doanh nghiệp Hàn Quốc.
            <br />
            <span className="text-foreground font-semibold">Từ công ty Hàn Quốc tại Việt Nam đến cơ hội làm việc tại Hàn Quốc!</span>
          </motion.p>

          {/* Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8"
          >
            {benefits.map((benefit, i) => (
              <div key={benefit.title} className="p-4 rounded-xl bg-card/80 border border-border/50">
                <benefit.icon className="w-6 h-6 mx-auto mb-2 text-primary" />
                <h3 className="font-bold text-sm text-foreground">{benefit.title}</h3>
                <p className="text-xs text-muted-foreground">{benefit.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Application Form */}
      <section className="py-12 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Thông tin cơ bản */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Thông tin cơ bản
                </CardTitle>
                <CardDescription>Vui lòng điền thông tin chính xác</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Họ và tên *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleChange("full_name", e.target.value)}
                    placeholder="Nguyen Van A"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Số điện thoại</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="+84 xxx xxx xxx"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birth_year">Năm sinh</Label>
                  <Input
                    id="birth_year"
                    type="number"
                    value={formData.birth_year}
                    onChange={(e) => handleChange("birth_year", e.target.value)}
                    placeholder="1995"
                    min="1970"
                    max="2010"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Học vấn */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-korean-yellow" />
                  Học vấn & Trình độ tiếng Hàn
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Trình độ học vấn</Label>
                  <Select value={formData.education_level} onValueChange={(v) => handleChange("education_level", v)}>
                    <SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high_school">Tốt nghiệp THPT</SelectItem>
                      <SelectItem value="college">Tốt nghiệp Cao đẳng</SelectItem>
                      <SelectItem value="bachelor">Tốt nghiệp Đại học</SelectItem>
                      <SelectItem value="master">Thạc sĩ</SelectItem>
                      <SelectItem value="phd">Tiến sĩ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="university_name">Tên trường</Label>
                  <Input
                    id="university_name"
                    value={formData.university_name}
                    onChange={(e) => handleChange("university_name", e.target.value)}
                    placeholder="Đại học..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="major">Chuyên ngành</Label>
                  <Input
                    id="major"
                    value={formData.major}
                    onChange={(e) => handleChange("major", e.target.value)}
                    placeholder="Ngôn ngữ Hàn, CNTT, Kinh doanh..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Trình độ TOPIK</Label>
                  <Select value={formData.topik_level} onValueChange={(v) => handleChange("topik_level", v)}>
                    <SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Chưa có / Đang chuẩn bị</SelectItem>
                      <SelectItem value="1">TOPIK 1</SelectItem>
                      <SelectItem value="2">TOPIK 2</SelectItem>
                      <SelectItem value="3">TOPIK 3</SelectItem>
                      <SelectItem value="4">TOPIK 4</SelectItem>
                      <SelectItem value="5">TOPIK 5</SelectItem>
                      <SelectItem value="6">TOPIK 6</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Kinh nghiệm làm việc */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-korean-blue" />
                  Kinh nghiệm làm việc
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Số năm kinh nghiệm</Label>
                    <Select value={formData.work_experience_years} onValueChange={(v) => handleChange("work_experience_years", v)}>
                      <SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Sinh viên mới ra trường</SelectItem>
                        <SelectItem value="1">Dưới 1 năm</SelectItem>
                        <SelectItem value="2">1-2 năm</SelectItem>
                        <SelectItem value="3">3-5 năm</SelectItem>
                        <SelectItem value="5">5-10 năm</SelectItem>
                        <SelectItem value="10">Trên 10 năm</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="current_company">Công ty hiện tại/gần nhất</Label>
                    <Input
                      id="current_company"
                      value={formData.current_company}
                      onChange={(e) => handleChange("current_company", e.target.value)}
                      placeholder="Samsung Vietnam..."
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="work_experience_details">Chi tiết kinh nghiệm (tùy chọn)</Label>
                  <Textarea
                    id="work_experience_details"
                    value={formData.work_experience_details}
                    onChange={(e) => handleChange("work_experience_details", e.target.value)}
                    placeholder="Công việc chính, thành tích, dự án đã tham gia..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Yêu cầu công việc */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-korean-orange" />
                  Yêu cầu công việc mong muốn
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Hình thức làm việc</Label>
                  <Select value={formData.desired_job_type} onValueChange={(v) => handleChange("desired_job_type", v)}>
                    <SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fulltime">Toàn thời gian</SelectItem>
                      <SelectItem value="contract">Hợp đồng</SelectItem>
                      <SelectItem value="intern">Thực tập sinh</SelectItem>
                      <SelectItem value="any">Không giới hạn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ngành nghề mong muốn</Label>
                  <Select value={formData.desired_industry} onValueChange={(v) => handleChange("desired_industry", v)}>
                    <SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="it">IT / Phần mềm</SelectItem>
                      <SelectItem value="manufacturing">Sản xuất</SelectItem>
                      <SelectItem value="trading">Thương mại / Xuất nhập khẩu</SelectItem>
                      <SelectItem value="service">Dịch vụ</SelectItem>
                      <SelectItem value="education">Giáo dục</SelectItem>
                      <SelectItem value="finance">Tài chính</SelectItem>
                      <SelectItem value="any">Không giới hạn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Địa điểm làm việc</Label>
                  <Select value={formData.desired_location} onValueChange={(v) => handleChange("desired_location", v)}>
                    <SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vietnam_korean">Công ty Hàn Quốc tại Việt Nam</SelectItem>
                      <SelectItem value="korea">Hàn Quốc</SelectItem>
                      <SelectItem value="both">Cả hai đều được</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Mức lương mong muốn</Label>
                  <Select value={formData.desired_salary_range} onValueChange={(v) => handleChange("desired_salary_range", v)}>
                    <SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="negotiable">Thỏa thuận</SelectItem>
                      <SelectItem value="10-15m">10-15 triệu VND</SelectItem>
                      <SelectItem value="15-25m">15-25 triệu VND</SelectItem>
                      <SelectItem value="25-40m">25-40 triệu VND</SelectItem>
                      <SelectItem value="40m+">Trên 40 triệu VND</SelectItem>
                      <SelectItem value="korea_standard">Mức lương tại Hàn Quốc</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Tải file lên */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-korean-purple" />
                  Tải file đính kèm
                </CardTitle>
                <CardDescription>Tải CV, thư xin việc, portfolio dưới dạng PDF hoặc Word (tối đa 10MB)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Resume Upload */}
                <div className="space-y-2">
                  <Label>CV (Resume)</Label>
                  <input
                    ref={resumeInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => handleFileSelect(e, 'resume', setResumeUpload)}
                    className="hidden"
                  />
                  {resumeUpload.url ? (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-korean-green/10 border border-korean-green/30">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-korean-green" />
                        <span className="text-sm text-foreground">{resumeUpload.file?.name || 'CV đã tải lên'}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(setResumeUpload, resumeInputRef)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-20 border-dashed"
                      onClick={() => resumeInputRef.current?.click()}
                      disabled={resumeUpload.uploading}
                    >
                      {resumeUpload.uploading ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-5 h-5 mr-2" />
                      )}
                      {resumeUpload.uploading ? 'Đang tải lên...' : 'Tải CV lên (PDF/Word)'}
                    </Button>
                  )}
                </div>

                {/* Cover Letter Upload */}
                <div className="space-y-2">
                  <Label>Thư xin việc (Cover Letter)</Label>
                  <input
                    ref={coverLetterInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => handleFileSelect(e, 'cover_letter', setCoverLetterUpload)}
                    className="hidden"
                  />
                  {coverLetterUpload.url ? (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-korean-green/10 border border-korean-green/30">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-korean-green" />
                        <span className="text-sm text-foreground">{coverLetterUpload.file?.name || 'Thư xin việc đã tải lên'}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(setCoverLetterUpload, coverLetterInputRef)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-20 border-dashed"
                      onClick={() => coverLetterInputRef.current?.click()}
                      disabled={coverLetterUpload.uploading}
                    >
                      {coverLetterUpload.uploading ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-5 h-5 mr-2" />
                      )}
                      {coverLetterUpload.uploading ? 'Đang tải lên...' : 'Tải thư xin việc lên (PDF/Word)'}
                    </Button>
                  )}
                </div>

                {/* Portfolio Upload */}
                <div className="space-y-2">
                  <Label>Portfolio (tùy chọn)</Label>
                  <input
                    ref={portfolioInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => handleFileSelect(e, 'portfolio', setPortfolioUpload)}
                    className="hidden"
                  />
                  {portfolioUpload.url ? (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-korean-green/10 border border-korean-green/30">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-korean-green" />
                        <span className="text-sm text-foreground">{portfolioUpload.file?.name || 'Portfolio đã tải lên'}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(setPortfolioUpload, portfolioInputRef)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-20 border-dashed"
                      onClick={() => portfolioInputRef.current?.click()}
                      disabled={portfolioUpload.uploading}
                    >
                      {portfolioUpload.uploading ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-5 h-5 mr-2" />
                      )}
                      {portfolioUpload.uploading ? 'Đang tải lên...' : 'Tải portfolio lên (PDF/Word)'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Giới thiệu bản thân */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-korean-teal" />
                  Giới thiệu bản thân
                </CardTitle>
                <CardDescription>Hãy viết để headhunter hiểu bạn hơn</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="introduction">Giới thiệu bản thân</Label>
                  <Textarea
                    id="introduction"
                    value={formData.introduction}
                    onChange={(e) => handleChange("introduction", e.target.value)}
                    placeholder="Viết vài dòng giới thiệu về bản thân..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="strengths">Điểm mạnh & Kỹ năng</Label>
                  <Textarea
                    id="strengths"
                    value={formData.strengths}
                    onChange={(e) => handleChange("strengths", e.target.value)}
                    placeholder="Điểm mạnh, kỹ năng, chứng chỉ của bạn..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="career_goals">Mục tiêu nghề nghiệp</Label>
                  <Textarea
                    id="career_goals"
                    value={formData.career_goals}
                    onChange={(e) => handleChange("career_goals", e.target.value)}
                    placeholder="Mục tiêu và tầm nhìn nghề nghiệp trong tương lai..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex flex-col items-center gap-4">
              {isPremium ? (
                <Button
                  type="submit"
                  size="lg"
                  disabled={loading || !formData.full_name || !formData.email}
                  className="w-full sm:w-auto h-14 px-10 btn-primary text-primary-foreground text-lg font-bold rounded-2xl"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      Đăng ký dịch vụ Headhunting
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  size="lg"
                  onClick={() => navigate("/pricing")}
                  className="w-full sm:w-auto h-14 px-10 bg-gradient-to-r from-korean-orange to-korean-pink text-white text-lg font-bold rounded-2xl"
                >
                  <Lock className="w-5 h-5 mr-2" />
                  Nâng cấp Premium để đăng ký
                </Button>
              )}
              <p className="text-xs text-muted-foreground text-center">
                Thông tin của bạn chỉ được sử dụng cho mục đích headhunting và được bảo mật an toàn.
              </p>
            </div>
          </form>
        </div>
      </section>

      <AppFooter />
    </div>
  );
};

export default Headhunting;
