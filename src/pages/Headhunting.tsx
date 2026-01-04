import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  Lock,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { PremiumPreviewBanner } from "@/components/PremiumPreviewBanner";
import { useSubscription } from "@/hooks/useSubscription";

const getBenefits = (t: any) => [
  { icon: Crown, title: t('headhunting.benefits.headhunter'), desc: t('headhunting.benefits.headhunterDesc') },
  { icon: Building2, title: t('headhunting.benefits.companies'), desc: t('headhunting.benefits.companiesDesc') },
  { icon: Globe, title: t('headhunting.benefits.support'), desc: t('headhunting.benefits.supportDesc') },
  { icon: Shield, title: t('headhunting.benefits.free'), desc: t('headhunting.benefits.freeDesc') },
];

interface FileUploadState {
  file: File | null;
  uploading: boolean;
  url: string | null;
  error: string | null;
}

const Headhunting = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isPremium } = useSubscription();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [applications, setApplications] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingApplication, setEditingApplication] = useState<any | null>(null);
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
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
    // Auth check disabled for testing - allow access without login
    if (session) {
      setUser(session.user);
      setFormData(prev => ({ ...prev, email: session.user.email || "" }));
    }
    
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
        return { label: t('headhunting.status.pending'), color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/50', icon: '⏳' };
      case 'reviewing':
        return { label: t('headhunting.status.reviewing'), color: 'bg-blue-500/20 text-blue-600 border-blue-500/50', icon: '🔍' };
      case 'matched':
        return { label: t('headhunting.status.matched'), color: 'bg-green-500/20 text-green-600 border-green-500/50', icon: '🤝' };
      case 'rejected':
        return { label: t('headhunting.status.rejected'), color: 'bg-red-500/20 text-red-600 border-red-500/50', icon: '❌' };
      case 'hired':
        return { label: t('headhunting.status.hired'), color: 'bg-purple-500/20 text-purple-600 border-purple-500/50', icon: '🎉' };
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
    setEditingApplication(null);
  };

  const handleEditApplication = (app: any) => {
    setEditingApplication(app);
    setFormData({
      full_name: app.full_name || "",
      email: app.email || "",
      phone: app.phone || "",
      birth_year: app.birth_year?.toString() || "",
      education_level: app.education_level || "",
      university_name: app.university_name || "",
      major: app.major || "",
      graduation_year: app.graduation_year?.toString() || "",
      topik_level: app.topik_level?.toString() || "",
      work_experience_years: app.work_experience_years?.toString() || "",
      current_job_title: app.current_job_title || "",
      current_company: app.current_company || "",
      work_experience_details: app.work_experience_details || "",
      desired_job_type: app.desired_job_type || "",
      desired_industry: app.desired_industry || "",
      desired_location: app.desired_location || "",
      desired_salary_range: app.desired_salary_range || "",
      introduction: app.introduction || "",
      strengths: app.strengths || "",
      career_goals: app.career_goals || "",
      additional_skills: app.additional_skills || "",
    });
    setShowForm(true);
  };

  const handleDeleteApplication = async (appId: string) => {
    if (!confirm(t("headhunting.confirmDelete"))) {
      return;
    }

    setDeletingId(appId);
    try {
      const { error } = await supabase
        .from("headhunting_applications")
        .delete()
        .eq("id", appId);

      if (error) throw error;

      toast.success(t("headhunting.deleteSuccess"));
      await checkUser();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(t("headhunting.deleteError"));
    } finally {
      setDeletingId(null);
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
      toast.success(t("headhunting.uploadSuccess", { type: type === 'resume' ? 'CV' : type === 'cover_letter' ? t("headhunting.coverLetter") : 'Portfolio' }));
      return fileName;
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadState(prev => ({ ...prev, uploading: false, error: t("headhunting.uploadFailed") }));
      toast.error(t("headhunting.uploadError"));
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
      toast.error(t("headhunting.fileSizeError"));
      return;
    }
    
    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(t("headhunting.fileTypeError"));
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
      const applicationData = {
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
        resume_url: resumeUpload.url || editingApplication?.resume_url || null,
        cover_letter_url: coverLetterUpload.url || editingApplication?.cover_letter_url || null,
        portfolio_url: portfolioUpload.url || editingApplication?.portfolio_url || null,
        updated_at: new Date().toISOString(),
      };

      if (editingApplication) {
        // Update existing application
        const { error } = await supabase
          .from("headhunting_applications")
          .update(applicationData)
          .eq("id", editingApplication.id);

        if (error) throw error;
        toast.success(t("headhunting.updateSuccess"));
      } else {
        // Create new application
        const { error } = await supabase.from("headhunting_applications").insert({
          user_id: user.id,
          ...applicationData,
          status: "pending",
        });

        if (error) throw error;

        // Send notification to user
        await supabase.from("notifications").insert({
          title: t("headhunting.notificationTitle"),
          message: t("headhunting.notificationMessage", { name: formData.full_name }),
          type: "success",
          target_user_id: user.id,
          is_global: false,
        });

        toast.success(t("headhunting.submitSuccess"));
      }

      setSubmitted(true);
      setEditingApplication(null);
    } catch (error: any) {
      console.error("Submit error:", error);
      toast.error(t("headhunting.submitError"));
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
              <h1 className="text-title text-foreground mb-2">
                {t('headhunting.applicationHistory')}
              </h1>
              <p className="text-body text-muted-foreground">
                {t('headhunting.historySubtitle', { count: applications.length })}
              </p>
            </motion.div>

            {/* Applications List */}
            <div className="space-y-4 mb-8">
              {applications.map((app, idx) => {
                const statusInfo = getStatusInfo(app.status);
                const isExpanded = expandedAppId === app.id;
                const canEdit = app.status === 'pending' || app.status === 'rejected';
                
                return (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-2xl">{statusInfo.icon}</span>
                              <div>
                                <h3 className="text-card-title-lg text-foreground">{app.full_name}</h3>
                                <p className="text-card-caption text-muted-foreground">
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
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1.5 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="shrink-0"
                              onClick={() => setExpandedAppId(isExpanded ? null : app.id)}
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                        
                        {app.admin_notes && (
                          <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border/50">
                            <p className="text-xs text-muted-foreground font-medium mb-1">💬 {t('headhunting.headhunterFeedback')}:</p>
                            <p className="text-sm text-foreground">{app.admin_notes}</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Expanded Actions */}
                      {isExpanded && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="border-t border-border bg-muted/30 px-5 py-4"
                        >
                          <div className="flex flex-wrap gap-3">
                            {canEdit && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditApplication(app)}
                                className="gap-2"
                              >
                                <Pencil className="w-4 h-4" />
                                {t('headhunting.edit')}
                              </Button>
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteApplication(app.id)}
                              disabled={deletingId === app.id}
                              className="gap-2"
                            >
                              {deletingId === app.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                              {t('headhunting.delete')}
                            </Button>
                          </div>
                          {!canEdit && (
                            <p className="text-xs text-muted-foreground mt-2">
                              ⚠️ {t('headhunting.cannotEditProcessed')}
                            </p>
                          )}
                        </motion.div>
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
                {t('headhunting.newApplication')}
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate("/dashboard")}
              >
                {t('headhunting.backToDashboard')}
              </Button>
            </motion.div>

            {/* Info Note */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center text-xs text-muted-foreground mt-6"
            >
              💡 {t('headhunting.infoTip')}
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
            <h1 className="text-headline text-foreground mb-4">
              {t('headhunting.successTitle')}
            </h1>
            <p className="text-body text-muted-foreground mb-8">
              {t('headhunting.successMessage')}<br />
              {t('headhunting.successSubMessage')}
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
                {t('headhunting.viewHistory')}
              </Button>
              <Button 
                onClick={() => navigate("/dashboard")} 
                className="btn-primary text-primary-foreground"
              >
                {t('headhunting.backToDashboard')}
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
            <PremiumPreviewBanner featureName={t('headhunting.featureName')} />
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
            {editingApplication ? (
              <>
                <Pencil className="w-4 h-4" />
                {t('headhunting.editApplication')}
              </>
            ) : (
              <>
                <Crown className="w-4 h-4 text-korean-yellow" />
                {t('headhunting.premiumService')}
              </>
            )}
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-headline text-foreground mb-4"
          >
          {editingApplication ? (
              <>{t('headhunting.heroTitleEdit')}</>
            ) : (
              <>{t('headhunting.heroTitle')}</>
            )}
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-body text-muted-foreground max-w-2xl mx-auto mb-8"
          >
            {t('headhunting.heroDescription')}
            <br />
            <span className="text-foreground font-semibold">{t('headhunting.heroSubtitle')}</span>
          </motion.p>

          {/* Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8"
          >
            {getBenefits(t).map((benefit, i) => (
              <div key={benefit.title} className="p-4 rounded-xl bg-card/80 border border-border/50">
                <benefit.icon className="w-6 h-6 mx-auto mb-2 text-primary" />
                <h3 className="text-card-title text-foreground">{benefit.title}</h3>
                <p className="text-card-caption text-muted-foreground">{benefit.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Application Form */}
      <section className="py-12 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  {t('headhunting.sections.basicInfo')}
                </CardTitle>
                <CardDescription>{t('headhunting.sections.basicInfoDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full_name">{t('headhunting.form.fullName')} *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleChange("full_name", e.target.value)}
                    placeholder={t('headhunting.form.fullNamePlaceholder')}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t('headhunting.form.email')} *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('headhunting.form.phone')}</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder={t('headhunting.form.phonePlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birth_year">{t('headhunting.form.birthYear')}</Label>
                  <Input
                    id="birth_year"
                    type="number"
                    value={formData.birth_year}
                    onChange={(e) => handleChange("birth_year", e.target.value)}
                    placeholder={t('headhunting.form.birthYearPlaceholder')}
                    min="1970"
                    max="2010"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Education */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-korean-yellow" />
                  {t('headhunting.sections.education')}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('headhunting.form.educationLevel')}</Label>
                  <Select value={formData.education_level} onValueChange={(v) => handleChange("education_level", v)}>
                    <SelectTrigger><SelectValue placeholder={t('headhunting.form.educationLevelPlaceholder')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high_school">{t('headhunting.form.educationOptions.highSchool')}</SelectItem>
                      <SelectItem value="college">{t('headhunting.form.educationOptions.college')}</SelectItem>
                      <SelectItem value="bachelor">{t('headhunting.form.educationOptions.bachelor')}</SelectItem>
                      <SelectItem value="master">{t('headhunting.form.educationOptions.master')}</SelectItem>
                      <SelectItem value="phd">{t('headhunting.form.educationOptions.phd')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="university_name">{t('headhunting.form.university')}</Label>
                  <Input
                    id="university_name"
                    value={formData.university_name}
                    onChange={(e) => handleChange("university_name", e.target.value)}
                    placeholder={t('headhunting.form.universityPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="major">{t('headhunting.form.major')}</Label>
                  <Input
                    id="major"
                    value={formData.major}
                    onChange={(e) => handleChange("major", e.target.value)}
                    placeholder={t('headhunting.form.majorPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('headhunting.form.topikLevel')}</Label>
                  <Select value={formData.topik_level} onValueChange={(v) => handleChange("topik_level", v)}>
                    <SelectTrigger><SelectValue placeholder={t('headhunting.form.educationLevelPlaceholder')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">{t('headhunting.form.topikOptions.none')}</SelectItem>
                      <SelectItem value="1">{t('headhunting.form.topikOptions.level1')}</SelectItem>
                      <SelectItem value="2">{t('headhunting.form.topikOptions.level2')}</SelectItem>
                      <SelectItem value="3">{t('headhunting.form.topikOptions.level3')}</SelectItem>
                      <SelectItem value="4">{t('headhunting.form.topikOptions.level4')}</SelectItem>
                      <SelectItem value="5">{t('headhunting.form.topikOptions.level5')}</SelectItem>
                      <SelectItem value="6">{t('headhunting.form.topikOptions.level6')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Work Experience */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-korean-blue" />
                  {t('headhunting.sections.workExperience')}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t('headhunting.form.experienceYears')}</Label>
                    <Select value={formData.work_experience_years} onValueChange={(v) => handleChange("work_experience_years", v)}>
                      <SelectTrigger><SelectValue placeholder={t('headhunting.form.educationLevelPlaceholder')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">{t('headhunting.form.experienceOptions.fresh')}</SelectItem>
                        <SelectItem value="1">{t('headhunting.form.experienceOptions.less1')}</SelectItem>
                        <SelectItem value="2">{t('headhunting.form.experienceOptions.1to2')}</SelectItem>
                        <SelectItem value="3">{t('headhunting.form.experienceOptions.3to5')}</SelectItem>
                        <SelectItem value="5">{t('headhunting.form.experienceOptions.5to10')}</SelectItem>
                        <SelectItem value="10">{t('headhunting.form.experienceOptions.over10')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="current_company">{t('headhunting.form.currentCompany')}</Label>
                    <Input
                      id="current_company"
                      value={formData.current_company}
                      onChange={(e) => handleChange("current_company", e.target.value)}
                      placeholder={t('headhunting.form.currentCompanyPlaceholder')}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="work_experience_details">{t('headhunting.form.experienceDetails')}</Label>
                  <Textarea
                    id="work_experience_details"
                    value={formData.work_experience_details}
                    onChange={(e) => handleChange("work_experience_details", e.target.value)}
                    placeholder={t('headhunting.form.experienceDetailsPlaceholder')}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Job Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-korean-orange" />
                  {t('headhunting.sections.jobPreferences')}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('headhunting.form.desiredJobType')}</Label>
                  <Select value={formData.desired_job_type} onValueChange={(v) => handleChange("desired_job_type", v)}>
                    <SelectTrigger><SelectValue placeholder={t('headhunting.form.educationLevelPlaceholder')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fulltime">{t('headhunting.form.jobTypeOptions.fulltime')}</SelectItem>
                      <SelectItem value="contract">{t('headhunting.form.jobTypeOptions.contract')}</SelectItem>
                      <SelectItem value="intern">{t('headhunting.form.jobTypeOptions.intern')}</SelectItem>
                      <SelectItem value="any">{t('headhunting.form.jobTypeOptions.any')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('headhunting.form.desiredIndustry')}</Label>
                  <Select value={formData.desired_industry} onValueChange={(v) => handleChange("desired_industry", v)}>
                    <SelectTrigger><SelectValue placeholder={t('headhunting.form.educationLevelPlaceholder')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="it">{t('headhunting.form.industryOptions.it')}</SelectItem>
                      <SelectItem value="manufacturing">{t('headhunting.form.industryOptions.manufacturing')}</SelectItem>
                      <SelectItem value="trading">{t('headhunting.form.industryOptions.trading')}</SelectItem>
                      <SelectItem value="service">{t('headhunting.form.industryOptions.service')}</SelectItem>
                      <SelectItem value="education">{t('headhunting.form.industryOptions.education')}</SelectItem>
                      <SelectItem value="finance">{t('headhunting.form.industryOptions.finance')}</SelectItem>
                      <SelectItem value="any">{t('headhunting.form.industryOptions.any')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('headhunting.form.desiredLocation')}</Label>
                  <Select value={formData.desired_location} onValueChange={(v) => handleChange("desired_location", v)}>
                    <SelectTrigger><SelectValue placeholder={t('headhunting.form.educationLevelPlaceholder')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vietnam_korean">{t('headhunting.form.locationOptions.vietnamKorean')}</SelectItem>
                      <SelectItem value="korea">{t('headhunting.form.locationOptions.korea')}</SelectItem>
                      <SelectItem value="both">{t('headhunting.form.locationOptions.both')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('headhunting.form.desiredSalary')}</Label>
                  <Select value={formData.desired_salary_range} onValueChange={(v) => handleChange("desired_salary_range", v)}>
                    <SelectTrigger><SelectValue placeholder={t('headhunting.form.educationLevelPlaceholder')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="negotiable">{t('headhunting.form.salaryOptions.negotiable')}</SelectItem>
                      <SelectItem value="10-15m">{t('headhunting.form.salaryOptions.10to15m')}</SelectItem>
                      <SelectItem value="15-25m">{t('headhunting.form.salaryOptions.15to25m')}</SelectItem>
                      <SelectItem value="25-40m">{t('headhunting.form.salaryOptions.25to40m')}</SelectItem>
                      <SelectItem value="40m+">{t('headhunting.form.salaryOptions.over40m')}</SelectItem>
                      <SelectItem value="korea_standard">{t('headhunting.form.salaryOptions.koreaStandard')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-korean-purple" />
                  {t('headhunting.sections.documents')}
                </CardTitle>
                <CardDescription>{t('headhunting.sections.documentsDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Resume Upload */}
                <div className="space-y-2">
                  <Label>{t('headhunting.form.resume')}</Label>
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
                        <span className="text-sm text-foreground">{resumeUpload.file?.name || t('headhunting.form.resumeUploaded')}</span>
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
                      {resumeUpload.uploading ? t('headhunting.form.uploading') : t('headhunting.form.uploadResume')}
                    </Button>
                  )}
                </div>

                {/* Cover Letter Upload */}
                <div className="space-y-2">
                  <Label>{t('headhunting.form.coverLetter')}</Label>
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
                        <span className="text-sm text-foreground">{coverLetterUpload.file?.name || t('headhunting.form.coverLetterUploaded')}</span>
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
                      {coverLetterUpload.uploading ? t('headhunting.form.uploading') : t('headhunting.form.uploadCoverLetter')}
                    </Button>
                  )}
                </div>

                {/* Portfolio Upload */}
                <div className="space-y-2">
                  <Label>{t('headhunting.form.portfolio')}</Label>
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
                        <span className="text-sm text-foreground">{portfolioUpload.file?.name || t('headhunting.form.portfolioUploaded')}</span>
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
                      {portfolioUpload.uploading ? t('headhunting.form.uploading') : t('headhunting.form.uploadPortfolio')}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Introduction */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-korean-teal" />
                  {t('headhunting.sections.introduction')}
                </CardTitle>
                <CardDescription>{t('headhunting.sections.introductionDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="introduction">{t('headhunting.form.introduction')}</Label>
                  <Textarea
                    id="introduction"
                    value={formData.introduction}
                    onChange={(e) => handleChange("introduction", e.target.value)}
                    placeholder={t('headhunting.form.introductionPlaceholder')}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="strengths">{t('headhunting.form.strengths')}</Label>
                  <Textarea
                    id="strengths"
                    value={formData.strengths}
                    onChange={(e) => handleChange("strengths", e.target.value)}
                    placeholder={t('headhunting.form.strengthsPlaceholder')}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="career_goals">{t('headhunting.form.careerGoals')}</Label>
                  <Textarea
                    id="career_goals"
                    value={formData.career_goals}
                    onChange={(e) => handleChange("career_goals", e.target.value)}
                    placeholder={t('headhunting.form.careerGoalsPlaceholder')}
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
                      {t('headhunting.submitting')}
                    </>
                  ) : (
                    <>
                      {t('headhunting.submit')}
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
                  {t('headhunting.upgradeToPremium')}
                </Button>
              )}
              <p className="text-xs text-muted-foreground text-center">
                {t('headhunting.privacyNote')}
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
