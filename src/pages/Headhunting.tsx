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
import CommonFooter from "@/components/CommonFooter";
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
  X
} from "lucide-react";

const benefits = [
  { icon: Crown, title: "전문 헤드헌팅 팀", desc: "한국 기업 전문 헤드헌터가 직접 매칭" },
  { icon: Building2, title: "500+ 파트너 기업", desc: "삼성, LG, 현대 등 대기업부터 스타트업까지" },
  { icon: Globe, title: "한국 취업 지원", desc: "비자, 거주, 생활 정보 종합 컨설팅" },
  { icon: Shield, title: "100% 무료", desc: "프리미엄 회원 대상 완전 무료 서비스" },
];

interface FileUploadState {
  file: File | null;
  uploading: boolean;
  url: string | null;
  error: string | null;
}

const Headhunting = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingApplication, setExistingApplication] = useState<any>(null);
  
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
      toast.error("로그인이 필요합니다");
      navigate("/auth");
      return;
    }
    setUser(session.user);
    setFormData(prev => ({ ...prev, email: session.user.email || "" }));
    
    // Check for existing application
    const { data } = await supabase
      .from("headhunting_applications")
      .select("*")
      .eq("user_id", session.user.id)
      .single();
    
    if (data) {
      setExistingApplication(data);
    }
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
      toast.success(`${type === 'resume' ? '이력서' : type === 'cover_letter' ? '자기소개서' : '포트폴리오'} 업로드 완료!`);
      return fileName;
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadState(prev => ({ ...prev, uploading: false, error: '업로드 실패' }));
      toast.error('파일 업로드에 실패했습니다');
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
      toast.error('파일 크기는 10MB 이하여야 합니다');
      return;
    }
    
    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('PDF 또는 Word 파일만 업로드 가능합니다');
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
      toast.success("헤드헌팅 서비스 신청이 완료되었습니다!");
    } catch (error: any) {
      console.error("Submit error:", error);
      toast.error("신청 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (submitted || existingApplication) {
    return (
      <div className="min-h-[100dvh] bg-background">
        <CleanHeader />
        <main className="pt-24 pb-20 px-4 sm:px-6">
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
              {existingApplication && !submitted ? "이미 신청하셨습니다" : "신청 완료!"}
            </h1>
            <p className="text-muted-foreground text-lg mb-8">
              {existingApplication && !submitted 
                ? `현재 상태: ${existingApplication.status === 'pending' ? '검토 대기중' : existingApplication.status === 'reviewing' ? '검토 중' : existingApplication.status === 'matched' ? '매칭 진행중' : existingApplication.status}`
                : "헤드헌팅 팀이 곧 연락드리겠습니다. 평균 3-5일 내 피드백을 받으실 수 있습니다."
              }
            </p>
            <Button onClick={() => navigate("/dashboard")} className="btn-primary text-primary-foreground">
              대시보드로 돌아가기
            </Button>
          </div>
        </main>
        <CommonFooter />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <CleanHeader />
      
      {/* Hero Section */}
      <section className="pt-24 pb-12 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-korean-purple/10 via-background to-korean-blue/10" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-korean-purple via-korean-blue to-korean-cyan" />
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6"
          >
            <Crown className="w-4 h-4 text-korean-yellow" />
            프리미엄 전용 서비스
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-heading font-black text-3xl sm:text-4xl md:text-5xl text-foreground mb-4"
          >
            한국 기업 <span className="text-gradient-primary">헤드헌팅</span> 서비스
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto mb-8"
          >
            LUKATO 전문 헤드헌팅 팀이 한국 기업 취업을 도와드립니다.
            <br />
            <span className="text-foreground font-semibold">베트남 내 한국 기업부터 한국 현지 취업까지</span>
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
            {/* 기본 정보 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  기본 정보
                </CardTitle>
                <CardDescription>정확한 정보를 입력해주세요</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full_name">이름 (Full Name) *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleChange("full_name", e.target.value)}
                    placeholder="Nguyen Van A"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">이메일 *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">전화번호</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="+84 xxx xxx xxx"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birth_year">출생연도</Label>
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

            {/* 학력 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-korean-yellow" />
                  학력 & 한국어 능력
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>최종 학력</Label>
                  <Select value={formData.education_level} onValueChange={(v) => handleChange("education_level", v)}>
                    <SelectTrigger><SelectValue placeholder="선택하세요" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high_school">고등학교 졸업</SelectItem>
                      <SelectItem value="college">전문대 졸업</SelectItem>
                      <SelectItem value="bachelor">대학교 졸업</SelectItem>
                      <SelectItem value="master">석사</SelectItem>
                      <SelectItem value="phd">박사</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="university_name">학교명</Label>
                  <Input
                    id="university_name"
                    value={formData.university_name}
                    onChange={(e) => handleChange("university_name", e.target.value)}
                    placeholder="University of..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="major">전공</Label>
                  <Input
                    id="major"
                    value={formData.major}
                    onChange={(e) => handleChange("major", e.target.value)}
                    placeholder="Korean Language, IT, Business..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>TOPIK 등급</Label>
                  <Select value={formData.topik_level} onValueChange={(v) => handleChange("topik_level", v)}>
                    <SelectTrigger><SelectValue placeholder="선택하세요" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">없음 / 준비중</SelectItem>
                      <SelectItem value="1">TOPIK 1급</SelectItem>
                      <SelectItem value="2">TOPIK 2급</SelectItem>
                      <SelectItem value="3">TOPIK 3급</SelectItem>
                      <SelectItem value="4">TOPIK 4급</SelectItem>
                      <SelectItem value="5">TOPIK 5급</SelectItem>
                      <SelectItem value="6">TOPIK 6급</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* 경력 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-korean-blue" />
                  경력 사항
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>경력 연수</Label>
                    <Select value={formData.work_experience_years} onValueChange={(v) => handleChange("work_experience_years", v)}>
                      <SelectTrigger><SelectValue placeholder="선택하세요" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">신입 (경력 없음)</SelectItem>
                        <SelectItem value="1">1년 미만</SelectItem>
                        <SelectItem value="2">1-2년</SelectItem>
                        <SelectItem value="3">3-5년</SelectItem>
                        <SelectItem value="5">5-10년</SelectItem>
                        <SelectItem value="10">10년 이상</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="current_company">현재/최근 회사</Label>
                    <Input
                      id="current_company"
                      value={formData.current_company}
                      onChange={(e) => handleChange("current_company", e.target.value)}
                      placeholder="Samsung Vietnam..."
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="work_experience_details">경력 상세 (선택)</Label>
                  <Textarea
                    id="work_experience_details"
                    value={formData.work_experience_details}
                    onChange={(e) => handleChange("work_experience_details", e.target.value)}
                    placeholder="주요 업무, 성과, 프로젝트 경험 등..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 희망 조건 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-korean-orange" />
                  희망 조건
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>희망 고용 형태</Label>
                  <Select value={formData.desired_job_type} onValueChange={(v) => handleChange("desired_job_type", v)}>
                    <SelectTrigger><SelectValue placeholder="선택하세요" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fulltime">정규직</SelectItem>
                      <SelectItem value="contract">계약직</SelectItem>
                      <SelectItem value="intern">인턴</SelectItem>
                      <SelectItem value="any">무관</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>희망 산업</Label>
                  <Select value={formData.desired_industry} onValueChange={(v) => handleChange("desired_industry", v)}>
                    <SelectTrigger><SelectValue placeholder="선택하세요" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="it">IT / 소프트웨어</SelectItem>
                      <SelectItem value="manufacturing">제조업</SelectItem>
                      <SelectItem value="trading">무역 / 수출입</SelectItem>
                      <SelectItem value="service">서비스업</SelectItem>
                      <SelectItem value="education">교육</SelectItem>
                      <SelectItem value="finance">금융</SelectItem>
                      <SelectItem value="any">무관</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>희망 근무지</Label>
                  <Select value={formData.desired_location} onValueChange={(v) => handleChange("desired_location", v)}>
                    <SelectTrigger><SelectValue placeholder="선택하세요" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vietnam_korean">베트남 내 한국 기업</SelectItem>
                      <SelectItem value="korea">한국 현지</SelectItem>
                      <SelectItem value="both">둘 다 가능</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>희망 연봉</Label>
                  <Select value={formData.desired_salary_range} onValueChange={(v) => handleChange("desired_salary_range", v)}>
                    <SelectTrigger><SelectValue placeholder="선택하세요" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="negotiable">협의 가능</SelectItem>
                      <SelectItem value="10-15m">10-15백만 VND</SelectItem>
                      <SelectItem value="15-25m">15-25백만 VND</SelectItem>
                      <SelectItem value="25-40m">25-40백만 VND</SelectItem>
                      <SelectItem value="40m+">40백만 VND 이상</SelectItem>
                      <SelectItem value="korea_standard">한국 현지 수준</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* 파일 업로드 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-korean-purple" />
                  파일 첨부
                </CardTitle>
                <CardDescription>이력서, 자기소개서, 포트폴리오를 PDF 또는 Word 파일로 업로드하세요 (최대 10MB)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Resume Upload */}
                <div className="space-y-2">
                  <Label>이력서 (Resume)</Label>
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
                        <span className="text-sm text-foreground">{resumeUpload.file?.name || '이력서 업로드 완료'}</span>
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
                      {resumeUpload.uploading ? '업로드 중...' : '이력서 업로드 (PDF/Word)'}
                    </Button>
                  )}
                </div>

                {/* Cover Letter Upload */}
                <div className="space-y-2">
                  <Label>자기소개서 (Cover Letter)</Label>
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
                        <span className="text-sm text-foreground">{coverLetterUpload.file?.name || '자기소개서 업로드 완료'}</span>
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
                      {coverLetterUpload.uploading ? '업로드 중...' : '자기소개서 업로드 (PDF/Word)'}
                    </Button>
                  )}
                </div>

                {/* Portfolio Upload */}
                <div className="space-y-2">
                  <Label>포트폴리오 (선택)</Label>
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
                        <span className="text-sm text-foreground">{portfolioUpload.file?.name || '포트폴리오 업로드 완료'}</span>
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
                      {portfolioUpload.uploading ? '업로드 중...' : '포트폴리오 업로드 (PDF/Word)'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 자기소개 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-korean-teal" />
                  자기소개
                </CardTitle>
                <CardDescription>헤드헌터가 당신을 더 잘 이해할 수 있도록 작성해주세요</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="introduction">자기소개</Label>
                  <Textarea
                    id="introduction"
                    value={formData.introduction}
                    onChange={(e) => handleChange("introduction", e.target.value)}
                    placeholder="간단한 자기소개를 작성해주세요..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="strengths">강점 및 특기</Label>
                  <Textarea
                    id="strengths"
                    value={formData.strengths}
                    onChange={(e) => handleChange("strengths", e.target.value)}
                    placeholder="본인의 강점, 특기, 자격증 등..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="career_goals">커리어 목표</Label>
                  <Textarea
                    id="career_goals"
                    value={formData.career_goals}
                    onChange={(e) => handleChange("career_goals", e.target.value)}
                    placeholder="향후 커리어 목표와 비전..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex flex-col items-center gap-4">
              <Button
                type="submit"
                size="lg"
                disabled={loading || !formData.full_name || !formData.email}
                className="w-full sm:w-auto h-14 px-10 btn-primary text-primary-foreground text-lg font-bold rounded-2xl"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    신청 중...
                  </>
                ) : (
                  <>
                    헤드헌팅 서비스 신청하기
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                제출된 정보는 헤드헌팅 목적으로만 사용되며 안전하게 보호됩니다.
              </p>
            </div>
          </form>
        </div>
      </section>

      <CommonFooter />
    </div>
  );
};

export default Headhunting;
