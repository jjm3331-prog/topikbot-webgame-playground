import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useTranslation } from "react-i18next";
import { 
  PenTool, 
  Upload, 
  Camera, 
  FileText, 
  Loader2, 
  Download, 
  Save, 
  History,
  AlertCircle,
  CheckCircle,
  X,
  Image as ImageIcon,
  Lock,
  Edit3,
  Clock,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { PremiumPreviewBanner } from "@/components/PremiumPreviewBanner";
import { useSubscription } from "@/hooks/useSubscription";

interface SwotItem {
  title: string;
  evidence?: string;
  analysis?: string;
  issue?: string;
  impact?: string;
  action?: string;
  benefit?: string;
  risk_level?: string;
  prevention?: string;
}

interface SwotAnalysis {
  strengths?: SwotItem[];
  weaknesses?: SwotItem[];
  opportunities?: SwotItem[];
  threats?: SwotItem[];
}

interface CorrectionResult {
  overall_score: number;
  grammar_score: number;
  vocabulary_score: number;
  structure_score: number;
  content_score: number;
  corrections: {
    original: string;
    corrected: string;
    explanation: string;
    type: string;
  }[];
  strengths: string[];
  improvements: string[];
  model_answer: string;
  detailed_feedback: string;
  swot_analysis?: SwotAnalysis;
  vocabulary_upgrades?: { basic: string; advanced: string; difference: string }[];
  structure_improvements?: { current: string; improved: string; reason: string }[];
  next_priority?: string[];
  is_cached?: boolean;
  cache_message?: string;
}

interface SavedCorrection {
  id: string;
  created_at: string;
  score: number;
  correction_report: CorrectionResult;
}

const WritingCorrection = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isPremium } = useSubscription();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [questionImages, setQuestionImages] = useState<File[]>([]);
  const [questionImagePreviews, setQuestionImagePreviews] = useState<string[]>([]);
  const [answerMethod, setAnswerMethod] = useState<"image" | "text">("text");
  const [answerImages, setAnswerImages] = useState<File[]>([]);
  const [answerImagePreviews, setAnswerImagePreviews] = useState<string[]>([]);
  const [answerText, setAnswerText] = useState("");
  
  const MAX_IMAGES = 10;
  
  const [result, setResult] = useState<CorrectionResult | null>(null);
  const [savedCorrections, setSavedCorrections] = useState<SavedCorrection[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Daily free usage state
  const [canUseFreeToday, setCanUseFreeToday] = useState(false);
  const [nextFreeTime, setNextFreeTime] = useState<Date | null>(null);
  const [checkingFreeUsage, setCheckingFreeUsage] = useState(true);
  
  // OCR text editing state
  const [ocrRecognizedText, setOcrRecognizedText] = useState<string>("");
  const [showOcrEditModal, setShowOcrEditModal] = useState(false);
  const [ocrEditingType, setOcrEditingType] = useState<"question" | "answer" | null>(null);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  
  // Score detail view state
  const [selectedScoreArea, setSelectedScoreArea] = useState<"grammar" | "vocabulary" | "structure" | "content" | null>(null);

  const questionInputRef = useRef<HTMLInputElement>(null);
  const questionCameraRef = useRef<HTMLInputElement>(null);
  const answerInputRef = useRef<HTMLInputElement>(null);
  const answerCameraRef = useRef<HTMLInputElement>(null);
  const pdfContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
    await Promise.all([
      loadHistory(session.user.id),
      checkDailyFreeUsage(session.user.id)
    ]);
    setLoading(false);
  };

  const checkDailyFreeUsage = async (userId: string) => {
    setCheckingFreeUsage(true);
    try {
      const { data, error } = await supabase
        .from("writing_free_usage")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("Error checking free usage:", error);
        setCanUseFreeToday(true); // Default to allowing if error
        return;
      }

      if (!data) {
        // No usage record, user can use for free
        setCanUseFreeToday(true);
        setNextFreeTime(null);
      } else {
        const lastUsed = new Date(data.last_used_at);
        const now = new Date();
        const hoursSinceLastUse = (now.getTime() - lastUsed.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceLastUse >= 24) {
          setCanUseFreeToday(true);
          setNextFreeTime(null);
        } else {
          setCanUseFreeToday(false);
          const nextAvailable = new Date(lastUsed.getTime() + 24 * 60 * 60 * 1000);
          setNextFreeTime(nextAvailable);
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setCanUseFreeToday(true);
    } finally {
      setCheckingFreeUsage(false);
    }
  };

  const recordFreeUsage = async (userId: string) => {
    const { data: existing } = await supabase
      .from("writing_free_usage")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("writing_free_usage")
        .update({ last_used_at: new Date().toISOString() })
        .eq("user_id", userId);
    } else {
      await supabase
        .from("writing_free_usage")
        .insert({ user_id: userId, last_used_at: new Date().toISOString() });
    }
    
    setCanUseFreeToday(false);
    setNextFreeTime(new Date(Date.now() + 24 * 60 * 60 * 1000));
  };

  const loadHistory = async (userId: string) => {
    const { data, error } = await supabase
      .from("writing_corrections")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      setSavedCorrections(data.map(d => ({
        id: d.id,
        created_at: d.created_at,
        score: d.score || 0,
        correction_report: d.correction_report as unknown as CorrectionResult
      })));
    }
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "question" | "answer"
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentCount = type === "question" ? questionImages.length : answerImages.length;
    const remainingSlots = MAX_IMAGES - currentCount;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    if (filesToProcess.length === 0) {
      toast({
        title: t('writing.limitReached'),
        description: t('writing.maxImagesLimit', { count: MAX_IMAGES }),
        variant: "destructive"
      });
      return;
    }

    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const preview = event.target?.result as string;
        if (type === "question") {
          setQuestionImages(prev => [...prev, file]);
          setQuestionImagePreviews(prev => [...prev, preview]);
        } else {
          setAnswerImages(prev => [...prev, file]);
          setAnswerImagePreviews(prev => [...prev, preview]);
        }
      };
      reader.readAsDataURL(file);
    });

    // Show toast if some files were skipped
    if (files.length > remainingSlots) {
      toast({
        title: t('writing.someImagesSkipped'),
        description: t('writing.onlyImagesAdded', { added: filesToProcess.length, max: MAX_IMAGES }),
      });
    }
  };

  const removeImage = (type: "question" | "answer", index: number) => {
    if (type === "question") {
      setQuestionImages(prev => prev.filter((_, i) => i !== index));
      setQuestionImagePreviews(prev => prev.filter((_, i) => i !== index));
    } else {
      setAnswerImages(prev => prev.filter((_, i) => i !== index));
      setAnswerImagePreviews(prev => prev.filter((_, i) => i !== index));
    }
  };

  const performOCR = async (imageBase64: string, type: "question" | "answer") => {
    if (type !== "answer") return; // Only OCR for answer images
    
    setOcrProcessing(true);
    try {
      // Use Gemini to extract text from image
      const response = await supabase.functions.invoke("writing-correction", {
        body: {
          ocrOnly: true,
          answerImageUrl: imageBase64
        }
      });

      if (response.data?.extractedText) {
        setOcrRecognizedText(response.data.extractedText);
        setShowOcrEditModal(true);
      }
    } catch (error) {
      console.error("OCR error:", error);
      // If OCR fails, just continue without it
    } finally {
      setOcrProcessing(false);
    }
  };

  const handleOcrConfirm = () => {
    if (ocrRecognizedText.trim()) {
      setAnswerText(ocrRecognizedText);
      setAnswerMethod("text"); // Switch to text mode with edited text
    }
    setShowOcrEditModal(false);
    setOcrRecognizedText("");
  };

  const handleOcrCancel = () => {
    setShowOcrEditModal(false);
    setOcrRecognizedText("");
    // Keep using image mode
  };

  const uploadImage = async (file: File, path: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from("writing-images")
      .upload(path, file);

    if (error) {
      console.error("Upload error:", error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("writing-images")
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  const handleSubmit = async () => {
    if (questionImages.length === 0) {
      toast({
        title: t('writing.missingInfo'),
        description: t('writing.uploadQuestionImage'),
        variant: "destructive"
      });
      return;
    }

    if (answerMethod === "image" && answerImages.length === 0) {
      toast({
        title: t('writing.missingInfo'),
        description: t('writing.uploadAnswerImage'),
        variant: "destructive"
      });
      return;
    }

    if (answerMethod === "text" && !answerText.trim()) {
      toast({
        title: t('writing.missingInfo'),
        description: t('writing.enterAnswerContent'),
        variant: "destructive"
      });
      return;
    }

    setProcessing(true);
    setResult(null);

    try {
      const timestamp = Date.now();
      
      // Upload all question images
      const questionImageUrls: string[] = [];
      for (let i = 0; i < questionImages.length; i++) {
        const url = await uploadImage(
          questionImages[i],
          `${user.id}/question-${timestamp}-${i}.jpg`
        );
        if (url) questionImageUrls.push(url);
      }
      const questionImageUrl = questionImageUrls[0] || null;

      // Upload all answer images
      let answerImageUrl: string | null = null;
      const answerImageUrls: string[] = [];
      if (answerMethod === "image" && answerImages.length > 0) {
        for (let i = 0; i < answerImages.length; i++) {
          const url = await uploadImage(
            answerImages[i],
            `${user.id}/answer-${timestamp}-${i}.jpg`
          );
          if (url) answerImageUrls.push(url);
        }
        answerImageUrl = answerImageUrls[0] || null;
      }

      const response = await supabase.functions.invoke("writing-correction", {
        body: {
          questionImageUrl,
          answerImageUrl,
          answerText: answerMethod === "text" ? answerText : null,
          userId: user.id // 캐싱을 위한 사용자 ID 전달
        }
      });

      if (response.error) throw response.error;

      setResult(response.data);
      
      // If using free usage, record it (only for non-cached results)
      if (!isPremium && canUseFreeToday && !response.data.is_cached) {
        await recordFreeUsage(user.id);
      }
      
      // 캐시 히트 여부에 따른 토스트 메시지
      if (response.data.is_cached) {
        toast({
          title: t('writing.resultFromHistory'),
          description: t('writing.cachedResult', { score: response.data.overall_score })
        });
      } else {
        toast({
          title: t('writing.gradingComplete'),
          description: t('writing.scoreResult', { score: response.data.overall_score })
        });
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: t('common.error'),
        description: t('writing.gradingError'),
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!result || !user) return;

    setSaving(true);
    try {
      const { error } = await supabase.from("writing_corrections").insert([{
        user_id: user.id,
        question_image_url: questionImagePreviews[0] || null,
        answer_image_url: answerImagePreviews[0] || null,
        answer_text: answerText || null,
        correction_report: JSON.parse(JSON.stringify(result)),
        score: result.overall_score
      }]);

      if (error) throw error;

      await loadHistory(user.id);
      toast({
        title: t('writing.saved'),
        description: t('writing.savedToHistory')
      });
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: t('common.error'),
        description: t('writing.saveError'),
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Helper function to clean markdown (remove ** marks)
  const cleanMarkdown = (text: string): string => {
    if (!text) return '';
    return text
      .replace(/\*\*/g, '') // Remove **
      .replace(/\*/g, '')   // Remove single *
      .replace(/##/g, '')   // Remove ##
      .replace(/#/g, '')    // Remove #
      .replace(/`/g, '')    // Remove backticks
      .trim();
  };

  const handleExportPDF = async () => {
    if (!result || !pdfContentRef.current) return;

    toast({
      title: t("writingPage.pdf.generatingTitle"),
      description: t("writingPage.pdf.generatingDesc"),
    });

    try {
      // Make the hidden content visible temporarily
      const pdfElement = pdfContentRef.current;
      pdfElement.style.display = 'block';
      pdfElement.style.position = 'absolute';
      pdfElement.style.left = '-9999px';
      pdfElement.style.top = '0';
      
      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Capture with html2canvas
      const canvas = await html2canvas(pdfElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      // Hide the element again
      pdfElement.style.display = 'none';
      
      // Create PDF from canvas
      const imgData = canvas.toDataURL('image/png');
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Calculate dimensions
      const imgWidth = pageWidth - 20; // 10mm margin on each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 10; // Top margin
      
      // Add first page
      doc.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - 20);
      
      // Add additional pages if content is longer
      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        doc.addPage();
        doc.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - 20);
      }
      
      doc.save(`TOPIK_Writing_Report_${Date.now()}.pdf`);

      toast({
        title: t("writingPage.pdf.downloadComplete"),
        description: t("writingPage.pdf.fileDownloaded")
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: t("writingPage.pdf.failedTitle"),
        description: t("writingPage.pdf.failedDesc"),
        variant: "destructive",
      });
    }
  };

  const formatTimeRemaining = (targetDate: Date) => {
    const now = new Date();
    const diff = targetDate.getTime() - now.getTime();
    if (diff <= 0) return t("writingPage.freeUsage.availableNow");
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const canSubmit = isPremium || canUseFreeToday;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CleanHeader />
      
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Premium Preview Banner */}
          {!isPremium && <PremiumPreviewBanner featureName={t("writingPage.featureName")} />}
          
          {/* Daily Free Usage Banner for non-premium users */}
          {!isPremium && !checkingFreeUsage && (
            <Card className={`p-4 ${canUseFreeToday ? 'bg-green-500/10 border-green-500/30' : 'bg-blue-500/10 border-blue-500/30'}`}>
              <div className="flex items-center gap-3">
                <Clock className={`w-5 h-5 ${canUseFreeToday ? 'text-green-500' : 'text-blue-500'} shrink-0`} />
                <div className="flex-1">
                  {canUseFreeToday ? (
                    <>
                      <p className="font-medium text-green-600 dark:text-green-400">🎁 {t("writingPage.freeUsage.hasFreeTry")}</p>
                      <p className="text-sm text-muted-foreground">
                        {t("writingPage.freeUsage.freeOnceDaily")}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-blue-600 dark:text-blue-400">⏰ {t("writingPage.freeUsage.usedToday")}</p>
                      <p className="text-sm text-muted-foreground">
                        {t("writingPage.freeUsage.nextFreeAt", { time: nextFreeTime ? formatTimeRemaining(nextFreeTime) : 'N/A' })}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </Card>
          )}
          
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mt-6 pt-4">
            <div className="text-center flex-1">
              <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground">
                ✍️ {t("writingPage.header.title")}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {t("writingPage.header.subtitle")}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="shrink-0"
            >
              <History className="w-4 h-4 mr-2" />
              {t("writingPage.header.history")} ({savedCorrections.length})
            </Button>
          </div>

          {/* Daily Free Usage Info */}
          {user && (
            <Card className="p-3 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  {canUseFreeToday ? (
                    <p className="text-sm font-medium text-primary">
                      🎁 {t("writingPage.freeUsage.hasFreeTry")}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      ⏰ {t("writingPage.freeUsage.nextFreeSimple", { time: nextFreeTime ? formatTimeRemaining(nextFreeTime) : 'N/A' })}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Warning */}
          <Card className="p-4 bg-yellow-500/10 border-yellow-500/30">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">{t("writingPage.notice.title")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("writingPage.notice.handwritingWarning")}
                </p>
              </div>
            </div>
          </Card>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Input Section */}
            <div className="space-y-6">
              {/* Question Image Upload */}
              <Card className="p-6 bg-card border-border">
                <h3 className="font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-primary" />
                  1. {t("writingPage.steps.question")}
                </h3>
                
                {/* File upload input (no capture - for file selection) */}
                <input
                  ref={questionInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleImageUpload(e, "question")}
                  className="hidden"
                />
                {/* Camera input (with capture - for camera) */}
                <input
                  ref={questionCameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleImageUpload(e, "question")}
                  className="hidden"
                />

                {questionImagePreviews.length > 0 ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {questionImagePreviews.map((preview, index) => (
                        <div key={index} className="relative aspect-square">
                          <img 
                            src={preview} 
                            alt={`Question ${index + 1}`} 
                            className="w-full h-full object-cover rounded-lg border border-border"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6"
                            onClick={() => removeImage("question", index)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                          <span className="absolute bottom-1 left-1 bg-background/80 text-xs px-1.5 py-0.5 rounded">
                            {index + 1}/{questionImagePreviews.length}
                          </span>
                        </div>
                      ))}
                    </div>
                    {questionImagePreviews.length < MAX_IMAGES && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => questionInputRef.current?.click()}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {t("writingPage.buttons.addImage")} ({questionImagePreviews.length}/{MAX_IMAGES})
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setQuestionImages([]);
                            setQuestionImagePreviews([]);
                          }}
                        >
                          {t("writingPage.buttons.deleteAll")}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center bg-muted/20">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">📷 {t("writingPage.upload.maxQuestionImages", { max: MAX_IMAGES })}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t("writingPage.upload.multipleSupport")}</p>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => questionInputRef.current?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {t("writingPage.buttons.uploadImage")}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => questionCameraRef.current?.click()}
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        {t("writingPage.buttons.takePhoto")}
                      </Button>
                    </div>
                  </div>
                )}
              </Card>

              {/* Answer Input */}
              <Card className="p-6 bg-card border-border">
                <h3 className="font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
                  <PenTool className="w-5 h-5 text-primary" />
                  2. {t("writingPage.steps.answer")}
                </h3>

                <Tabs value={answerMethod} onValueChange={(v) => setAnswerMethod(v as "image" | "text")}>
                  <TabsList className="w-full mb-4">
                    <TabsTrigger value="text" className="flex-1">
                      <FileText className="w-4 h-4 mr-2" />
                      {t("writingPage.answerMode.text")}
                    </TabsTrigger>
                    <TabsTrigger value="image" className="flex-1">
                      <ImageIcon className="w-4 h-4 mr-2" />
                      {t("writingPage.answerMode.image")}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="text">
                      <Textarea
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        placeholder={t("writingPage.placeholders.answerText")}
                        className="min-h-[200px] resize-none"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        💡 {t("writingPage.tip.copyPaste")}
                      </p>
                  </TabsContent>

                  <TabsContent value="image">
                    {/* File upload input (no capture - for file selection) */}
                    <input
                      ref={answerInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleImageUpload(e, "answer")}
                      className="hidden"
                    />
                    {/* Camera input (with capture - for camera) */}
                    <input
                      ref={answerCameraRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handleImageUpload(e, "answer")}
                      className="hidden"
                    />

                    {answerImagePreviews.length > 0 ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {answerImagePreviews.map((preview, index) => (
                            <div key={index} className="relative aspect-square">
                              <img 
                                src={preview} 
                                alt={`Answer ${index + 1}`} 
                                className="w-full h-full object-cover rounded-lg border border-border"
                              />
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-1 right-1 h-6 w-6"
                                onClick={() => removeImage("answer", index)}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                              <span className="absolute bottom-1 left-1 bg-background/80 text-xs px-1.5 py-0.5 rounded">
                                {index + 1}/{answerImagePreviews.length}
                              </span>
                              {ocrProcessing && index === answerImagePreviews.length - 1 && (
                                <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                                  <div className="text-center">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                    <p className="text-xs">OCR...</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        {answerImagePreviews.length < MAX_IMAGES && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => answerInputRef.current?.click()}
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              {t("writingPage.buttons.addImage")} ({answerImagePreviews.length}/{MAX_IMAGES})
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setAnswerImages([]);
                                setAnswerImagePreviews([]);
                              }}
                            >
                              {t("writingPage.buttons.deleteAll")}
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center bg-muted/20">
                          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm font-medium text-foreground">📷 {t("writingPage.upload.maxAnswerImages", { max: MAX_IMAGES })}</p>
                          <p className="text-xs text-muted-foreground mt-1">{t("writingPage.upload.multipleSupport")}</p>
                        </div>
                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => answerInputRef.current?.click()}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {t("writingPage.buttons.uploadImage")}
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => answerCameraRef.current?.click()}
                          >
                            <Camera className="w-4 h-4 mr-2" />
                            {t("writingPage.buttons.takePhoto")}
                          </Button>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </Card>

              {/* Submit Button */}
              {canSubmit ? (
                <Button
                  onClick={handleSubmit}
                  disabled={processing || questionImages.length === 0}
                  className="w-full btn-primary text-primary-foreground h-14 text-lg"
                >
                      {processing ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          {t("writingPage.actions.grading")}
                        </>
                      ) : (
                        <>
                          <PenTool className="w-5 h-5 mr-2" />
                          {isPremium ? t("writingPage.actions.grade") : t("writingPage.actions.freeGrade")}
                        </>
                      )}
                </Button>
              ) : (
                  <Button
                    onClick={() => navigate("/pricing")}
                    className="w-full bg-gradient-to-r from-korean-orange to-korean-pink hover:opacity-90 text-white h-14 text-lg"
                  >
                    <Lock className="w-5 h-5 mr-2" />
                    {t("writingPage.actions.upgradeToGrade")}
                  </Button>
              )}
            </div>

            {/* Result Section */}
            <div className="lg:sticky lg:top-4">
              {result ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-5"
                >
                  {/* Score Card */}
                  <Card className="p-6 bg-gradient-to-br from-primary/10 via-korean-purple/10 to-korean-pink/10 border-primary/20 shadow-lg">
                    <div className="text-center mb-6">
                      <div className="text-7xl font-bold text-primary mb-2 drop-shadow-sm">
                        {result.overall_score}
                      </div>
                      <p className="text-muted-foreground text-sm">/ 100 điểm</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: "grammar" as const, label: "Ngữ pháp", labelKr: "문법", score: result.grammar_score, color: "from-red-500/20 to-red-500/5", activeColor: "ring-red-500", icon: "🔴" },
                        { key: "vocabulary" as const, label: "Từ vựng", labelKr: "어휘", score: result.vocabulary_score, color: "from-yellow-500/20 to-yellow-500/5", activeColor: "ring-yellow-500", icon: "🟡" },
                        { key: "structure" as const, label: "Cấu trúc", labelKr: "구조", score: result.structure_score, color: "from-green-500/20 to-green-500/5", activeColor: "ring-green-500", icon: "🟢" },
                        { key: "content" as const, label: "Nội dung", labelKr: "내용", score: result.content_score, color: "from-blue-500/20 to-blue-500/5", activeColor: "ring-blue-500", icon: "🔵" },
                      ].map((item) => (
                        <div 
                          key={item.key} 
                          className={`bg-gradient-to-br ${item.color} rounded-xl p-4 border border-border/50 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md ${selectedScoreArea === item.key ? `ring-2 ${item.activeColor} shadow-lg` : ''}`}
                          onClick={() => setSelectedScoreArea(selectedScoreArea === item.key ? null : item.key)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-muted-foreground">{item.label}</p>
                              <p className="text-[10px] text-muted-foreground/70">{item.labelKr}</p>
                            </div>
                            <span className="text-lg">{item.icon}</span>
                          </div>
                          <p className="text-2xl font-bold text-foreground mt-1">{item.score}<span className="text-sm font-normal text-muted-foreground">/25</span></p>
                          <p className="text-[10px] text-muted-foreground mt-1">클릭하여 상세 보기</p>
                        </div>
                      ))}
                    </div>

                    {/* Score Detail Panel */}
                    {selectedScoreArea && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 p-4 bg-background/60 rounded-xl border border-border"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-semibold text-foreground flex items-center gap-2">
                            {selectedScoreArea === "grammar" && `🔴 ${t("writingPage.scoreDetail.grammar.title")}`}
                            {selectedScoreArea === "vocabulary" && `🟡 ${t("writingPage.scoreDetail.vocabulary.title")}`}
                            {selectedScoreArea === "structure" && `🟢 ${t("writingPage.scoreDetail.structure.title")}`}
                            {selectedScoreArea === "content" && `🔵 ${t("writingPage.scoreDetail.content.title")}`}
                          </h5>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedScoreArea(null)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        {/* Grammar Detail */}
                        {selectedScoreArea === "grammar" && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-foreground">{t("writingPage.scoreDetail.score")}:</span>
                              <span className={`font-bold ${result.grammar_score >= 20 ? 'text-green-500' : result.grammar_score >= 15 ? 'text-yellow-500' : 'text-red-500'}`}>
                                {result.grammar_score}/25
                              </span>
                              <span className="text-muted-foreground">
                                ({result.grammar_score >= 20 ? t("writingPage.scoreDetail.excellent") : result.grammar_score >= 15 ? t("writingPage.scoreDetail.average") : t("writingPage.scoreDetail.needsImprovement")})
                              </span>
                            </div>
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">{t("writingPage.scoreDetail.grammar.errorsFound")}:</p>
                              {result.corrections.filter(c => c.type === 'grammar' || c.type === 'spelling').length > 0 ? (
                                result.corrections.filter(c => c.type === 'grammar' || c.type === 'spelling').slice(0, 3).map((c, i) => (
                                  <div key={i} className="text-xs p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                                    <div className="flex gap-2 flex-wrap">
                                      <span className="line-through text-red-500">{c.original}</span>
                                      <span className="text-muted-foreground">→</span>
                                      <span className="text-green-500 font-medium">{c.corrected}</span>
                                    </div>
                                    <p className="text-muted-foreground mt-1">{c.explanation}</p>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-green-500">{t("writingPage.scoreDetail.grammar.noErrors")} ✨</p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Vocabulary Detail */}
                        {selectedScoreArea === "vocabulary" && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-foreground">{t("writingPage.scoreDetail.score")}:</span>
                              <span className={`font-bold ${result.vocabulary_score >= 20 ? 'text-green-500' : result.vocabulary_score >= 15 ? 'text-yellow-500' : 'text-red-500'}`}>
                                {result.vocabulary_score}/25
                              </span>
                              <span className="text-muted-foreground">
                                ({result.vocabulary_score >= 20 ? t("writingPage.scoreDetail.excellent") : result.vocabulary_score >= 15 ? t("writingPage.scoreDetail.average") : t("writingPage.scoreDetail.needsImprovement")})
                              </span>
                            </div>
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">{t("writingPage.scoreDetail.vocabulary.suggestions")}:</p>
                              {result.vocabulary_upgrades && result.vocabulary_upgrades.length > 0 ? (
                                result.vocabulary_upgrades.slice(0, 3).map((v, i) => (
                                  <div key={i} className="text-xs p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                                    <div className="flex gap-2 flex-wrap">
                                      <span className="text-muted-foreground">😐 {v.basic}</span>
                                      <span className="text-muted-foreground">→</span>
                                      <span className="text-yellow-500 font-medium">⭐ {v.advanced}</span>
                                    </div>
                                    <p className="text-muted-foreground mt-1">{v.difference}</p>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-green-500">{t("writingPage.scoreDetail.vocabulary.appropriate")} ✨</p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Structure Detail */}
                        {selectedScoreArea === "structure" && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-foreground">{t("writingPage.scoreDetail.score")}:</span>
                              <span className={`font-bold ${result.structure_score >= 20 ? 'text-green-500' : result.structure_score >= 15 ? 'text-yellow-500' : 'text-red-500'}`}>
                                {result.structure_score}/25
                              </span>
                              <span className="text-muted-foreground">
                                ({result.structure_score >= 20 ? t("writingPage.scoreDetail.excellent") : result.structure_score >= 15 ? t("writingPage.scoreDetail.average") : t("writingPage.scoreDetail.needsImprovement")})
                              </span>
                            </div>
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">{t("writingPage.scoreDetail.structure.suggestions")}:</p>
                              {result.structure_improvements && result.structure_improvements.length > 0 ? (
                                result.structure_improvements.slice(0, 2).map((s, i) => (
                                  <div key={i} className="text-xs p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                                    <p className="text-muted-foreground mb-1">{t("writingPage.scoreDetail.structure.current")}: {s.current}</p>
                                    <p className="text-green-500 font-medium">{t("writingPage.scoreDetail.structure.improved")}: {s.improved}</p>
                                    <p className="text-muted-foreground mt-1 italic">{s.reason}</p>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-green-500">{t("writingPage.scoreDetail.structure.wellStructured")} ✨</p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Content Detail */}
                        {selectedScoreArea === "content" && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-foreground">{t("writingPage.scoreDetail.score")}:</span>
                              <span className={`font-bold ${result.content_score >= 20 ? 'text-green-500' : result.content_score >= 15 ? 'text-yellow-500' : 'text-red-500'}`}>
                                {result.content_score}/25
                              </span>
                              <span className="text-muted-foreground">
                                ({result.content_score >= 20 ? t("writingPage.scoreDetail.excellent") : result.content_score >= 15 ? t("writingPage.scoreDetail.average") : t("writingPage.scoreDetail.needsImprovement")})
                              </span>
                            </div>
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">{t("writingPage.scoreDetail.content.analysis")}:</p>
                              {result.swot_analysis?.strengths && result.swot_analysis.strengths.length > 0 && (
                                <div className="text-xs p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                  <p className="font-medium text-blue-500 mb-1">✅ {t("writingPage.scoreDetail.content.doneWell")}:</p>
                                  {result.swot_analysis.strengths.slice(0, 2).map((s, i) => (
                                    <p key={i} className="text-muted-foreground">• {s.title}</p>
                                  ))}
                                </div>
                              )}
                              {result.swot_analysis?.weaknesses && result.swot_analysis.weaknesses.length > 0 && (
                                <div className="text-xs p-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
                                  <p className="font-medium text-orange-500 mb-1">⚠️ {t("writingPage.scoreDetail.content.toImprove")}:</p>
                                  {result.swot_analysis.weaknesses.slice(0, 2).map((w, i) => (
                                    <p key={i} className="text-muted-foreground">• {w.title}</p>
                                  ))}
                                </div>
                              )}
                              {!result.swot_analysis?.strengths?.length && !result.swot_analysis?.weaknesses?.length && (
                                <p className="text-xs text-muted-foreground">{t("writingPage.scoreDetail.content.seeDetailedFeedback")}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </Card>

                  {/* SWOT Analysis - Accordion */}
                  {result.swot_analysis && (
                    <Card className="p-5 bg-card border-border shadow-sm">
                      <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2 text-base">
                        📊 {t("writingPage.swot.title")}
                      </h4>
                      <Accordion type="multiple" defaultValue={["strengths"]} className="space-y-3">
                        {/* Strengths */}
                        <AccordionItem value="strengths" className="border rounded-lg bg-green-500/10 border-green-500/30 px-3">
                          <AccordionTrigger className="text-sm font-medium text-green-600 dark:text-green-400 hover:no-underline py-3">
                            ✅ {t("writingPage.swot.strengths")} ({result.swot_analysis.strengths?.length || 0})
                          </AccordionTrigger>
                          <AccordionContent className="pb-3">
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs border-collapse">
                                <thead>
                                  <tr className="bg-green-500/20">
                                    <th className="py-2 px-2 text-left font-medium text-green-700 dark:text-green-300 border-b border-green-500/30">💡 {t("writingPage.swot.point")}</th>
                                    <th className="py-2 px-2 text-left font-medium text-green-700 dark:text-green-300 border-b border-green-500/30">📝 {t("writingPage.swot.evidence")}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {result.swot_analysis.strengths?.map((s, i) => (
                                    <tr key={i} className={i % 2 === 0 ? 'bg-background/50' : 'bg-background/30'}>
                                      <td className="py-2 px-2 font-medium text-foreground border-r border-green-500/20">{cleanMarkdown(s.title)}</td>
                                      <td className="py-2 px-2 text-muted-foreground">
                                        {s.evidence && <span className="italic">"{cleanMarkdown(s.evidence)}"</span>}
                                        {s.analysis && <span className="block mt-1">{cleanMarkdown(s.analysis)}</span>}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        {/* Weaknesses */}
                        <AccordionItem value="weaknesses" className="border rounded-lg bg-red-500/10 border-red-500/30 px-3">
                          <AccordionTrigger className="text-sm font-medium text-red-600 dark:text-red-400 hover:no-underline py-3">
                            ⚠️ {t("writingPage.swot.weaknesses")} ({result.swot_analysis.weaknesses?.length || 0})
                          </AccordionTrigger>
                          <AccordionContent className="pb-3">
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs border-collapse">
                                <thead>
                                  <tr className="bg-red-500/20">
                                    <th className="py-2 px-2 text-left font-medium text-red-700 dark:text-red-300 border-b border-red-500/30">❌ {t("writingPage.swot.issue")}</th>
                                    <th className="py-2 px-2 text-left font-medium text-red-700 dark:text-red-300 border-b border-red-500/30">⚡ {t("writingPage.swot.impact")}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {result.swot_analysis.weaknesses?.map((w, i) => (
                                    <tr key={i} className={i % 2 === 0 ? 'bg-background/50' : 'bg-background/30'}>
                                      <td className="py-2 px-2 font-medium text-foreground border-r border-red-500/20">
                                        {cleanMarkdown(w.title)}
                                        {w.issue && <span className="block text-muted-foreground mt-1">{cleanMarkdown(w.issue)}</span>}
                                      </td>
                                      <td className="py-2 px-2 text-muted-foreground">{w.impact && cleanMarkdown(w.impact)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        {/* Opportunities */}
                        <AccordionItem value="opportunities" className="border rounded-lg bg-blue-500/10 border-blue-500/30 px-3">
                          <AccordionTrigger className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:no-underline py-3">
                            🌟 {t("writingPage.swot.opportunities")} ({result.swot_analysis.opportunities?.length || 0})
                          </AccordionTrigger>
                          <AccordionContent className="pb-3">
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs border-collapse">
                                <thead>
                                  <tr className="bg-blue-500/20">
                                    <th className="py-2 px-2 text-left font-medium text-blue-700 dark:text-blue-300 border-b border-blue-500/30">🎯 {t("writingPage.swot.opportunity")}</th>
                                    <th className="py-2 px-2 text-left font-medium text-blue-700 dark:text-blue-300 border-b border-blue-500/30">🚀 {t("writingPage.swot.action")}</th>
                                    <th className="py-2 px-2 text-left font-medium text-blue-700 dark:text-blue-300 border-b border-blue-500/30">✨ {t("writingPage.swot.benefit")}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {result.swot_analysis.opportunities?.map((o, i) => (
                                    <tr key={i} className={i % 2 === 0 ? 'bg-background/50' : 'bg-background/30'}>
                                      <td className="py-2 px-2 font-medium text-foreground border-r border-blue-500/20">{cleanMarkdown(o.title)}</td>
                                      <td className="py-2 px-2 text-muted-foreground border-r border-blue-500/20">{o.action && cleanMarkdown(o.action)}</td>
                                      <td className="py-2 px-2 text-green-600 dark:text-green-400">{o.benefit && cleanMarkdown(o.benefit)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        {/* Threats */}
                        <AccordionItem value="threats" className="border rounded-lg bg-orange-500/10 border-orange-500/30 px-3">
                          <AccordionTrigger className="text-sm font-medium text-orange-600 dark:text-orange-400 hover:no-underline py-3">
                            🚧 {t("writingPage.swot.threats")} ({result.swot_analysis.threats?.length || 0})
                          </AccordionTrigger>
                          <AccordionContent className="pb-3">
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs border-collapse">
                                <thead>
                                  <tr className="bg-orange-500/20">
                                    <th className="py-2 px-2 text-left font-medium text-orange-700 dark:text-orange-300 border-b border-orange-500/30">⚠️ {t("writingPage.swot.threat")}</th>
                                    <th className="py-2 px-2 text-left font-medium text-orange-700 dark:text-orange-300 border-b border-orange-500/30 w-20">🔥 {t("writingPage.swot.riskLevel")}</th>
                                    <th className="py-2 px-2 text-left font-medium text-orange-700 dark:text-orange-300 border-b border-orange-500/30">🛡️ {t("writingPage.swot.prevention")}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {result.swot_analysis.threats?.map((th, i) => (
                                    <tr key={i} className={i % 2 === 0 ? 'bg-background/50' : 'bg-background/30'}>
                                      <td className="py-2 px-2 font-medium text-foreground border-r border-orange-500/20">{cleanMarkdown(th.title)}</td>
                                      <td className="py-2 px-2 text-center">
                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                          th.risk_level === 'high' ? 'bg-red-500/20 text-red-600 dark:text-red-400' :
                                          th.risk_level === 'medium' ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' :
                                          'bg-green-500/20 text-green-600 dark:text-green-400'
                                        }`}>
                                          {th.risk_level === 'high' ? t("writingPage.swot.riskHigh") : th.risk_level === 'medium' ? t("writingPage.swot.riskMedium") : t("writingPage.swot.riskLow")}
                                        </span>
                                      </td>
                                      <td className="py-2 px-2 text-muted-foreground">{th.prevention && cleanMarkdown(th.prevention)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </Card>
                  )}

                  {/* Strengths & Improvements (Fallback) */}
                  {!result.swot_analysis && (
                    <div className="grid gap-4">
                      <Card className="p-4 bg-green-500/10 border-green-500/30">
                        <h4 className="font-semibold text-green-600 dark:text-green-400 mb-2 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Điểm mạnh
                        </h4>
                        <ul className="space-y-1">
                          {result.strengths.map((s: string, i: number) => (
                            <li key={i} className="text-sm text-foreground">• {s}</li>
                          ))}
                        </ul>
                      </Card>

                      <Card className="p-4 bg-orange-500/10 border-orange-500/30">
                        <h4 className="font-semibold text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          Cần cải thiện
                        </h4>
                        <ul className="space-y-1">
                          {result.improvements.map((s: string, i: number) => (
                            <li key={i} className="text-sm text-foreground">• {s}</li>
                          ))}
                        </ul>
                      </Card>
                    </div>
                  )}

                  {/* First Aid - Tabbed */}
                  {(result.corrections.length > 0 || result.vocabulary_upgrades?.length || result.structure_improvements?.length) && (
                    <Card className="p-5 bg-card border-border shadow-sm">
                      <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2 text-base">
                        🚑 First Aid (응급 처치)
                      </h4>
                      <Tabs defaultValue="grammar" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 h-10 mb-2">
                          <TabsTrigger value="grammar" className="text-xs">
                            🔴 문법 ({result.corrections.filter(c => c.type === 'grammar' || c.type === 'spelling').length || result.corrections.length})
                          </TabsTrigger>
                          <TabsTrigger value="vocabulary" className="text-xs">
                            🟡 어휘 ({result.vocabulary_upgrades?.length || result.corrections.filter(c => c.type === 'vocabulary').length || 0})
                          </TabsTrigger>
                          <TabsTrigger value="structure" className="text-xs">
                            🟢 구조 ({result.structure_improvements?.length || result.corrections.filter(c => c.type === 'structure').length || 0})
                          </TabsTrigger>
                        </TabsList>

                        {/* Grammar Tab */}
                        <TabsContent value="grammar" className="mt-3">
                          <div className="space-y-2 max-h-[250px] overflow-y-auto">
                            {result.corrections
                              .filter(c => c.type === 'grammar' || c.type === 'spelling' || !['vocabulary', 'structure'].includes(c.type))
                              .map((c, i) => (
                              <div key={i} className="p-2.5 bg-red-500/5 border border-red-500/20 rounded-lg">
                                <div className="flex flex-wrap gap-1.5 items-start mb-1.5">
                                  <span className="text-destructive line-through text-sm">{c.original}</span>
                                  <span className="text-muted-foreground">→</span>
                                  <span className="text-green-600 dark:text-green-400 font-medium text-sm">{c.corrected}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">{c.explanation}</p>
                              </div>
                            ))}
                            {result.corrections.filter(c => c.type === 'grammar' || c.type === 'spelling' || !['vocabulary', 'structure'].includes(c.type)).length === 0 && (
                              <p className="text-sm text-muted-foreground text-center py-4">문법 오류 없음 ✨</p>
                            )}
                          </div>
                        </TabsContent>

                        {/* Vocabulary Tab */}
                        <TabsContent value="vocabulary" className="mt-3">
                          <div className="space-y-2 max-h-[250px] overflow-y-auto">
                            {result.vocabulary_upgrades?.map((v, i) => (
                              <div key={i} className="p-2.5 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                                <div className="flex flex-wrap gap-1.5 items-start mb-1.5">
                                  <span className="text-muted-foreground text-sm">😐 {v.basic}</span>
                                  <span className="text-muted-foreground">→</span>
                                  <span className="text-yellow-600 dark:text-yellow-400 font-medium text-sm">⭐ {v.advanced}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">{v.difference}</p>
                              </div>
                            ))}
                            {result.corrections.filter(c => c.type === 'vocabulary').map((c, i) => (
                              <div key={`vocab-${i}`} className="p-2.5 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                                <div className="flex flex-wrap gap-1.5 items-start mb-1.5">
                                  <span className="text-muted-foreground text-sm">😐 {c.original}</span>
                                  <span className="text-muted-foreground">→</span>
                                  <span className="text-yellow-600 dark:text-yellow-400 font-medium text-sm">⭐ {c.corrected}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">{c.explanation}</p>
                              </div>
                            ))}
                            {!result.vocabulary_upgrades?.length && result.corrections.filter(c => c.type === 'vocabulary').length === 0 && (
                              <p className="text-sm text-muted-foreground text-center py-4">어휘 개선 제안 없음</p>
                            )}
                          </div>
                        </TabsContent>

                        {/* Structure Tab */}
                        <TabsContent value="structure" className="mt-3">
                          <div className="space-y-2 max-h-[250px] overflow-y-auto">
                            {result.structure_improvements?.map((s, i) => (
                              <div key={i} className="p-2.5 bg-green-500/5 border border-green-500/20 rounded-lg">
                                <div className="mb-1.5">
                                  <p className="text-xs text-muted-foreground mb-1">현재:</p>
                                  <p className="text-sm text-foreground">{s.current}</p>
                                </div>
                                <div className="mb-1.5">
                                  <p className="text-xs text-green-600 dark:text-green-400 mb-1">개선안:</p>
                                  <p className="text-sm font-medium text-green-600 dark:text-green-400">{s.improved}</p>
                                </div>
                                <p className="text-xs text-muted-foreground">{s.reason}</p>
                              </div>
                            ))}
                            {result.corrections.filter(c => c.type === 'structure').map((c, i) => (
                              <div key={`struct-${i}`} className="p-2.5 bg-green-500/5 border border-green-500/20 rounded-lg">
                                <div className="flex flex-wrap gap-1.5 items-start mb-1.5">
                                  <span className="text-muted-foreground text-sm">{c.original}</span>
                                  <span className="text-muted-foreground">→</span>
                                  <span className="text-green-600 dark:text-green-400 font-medium text-sm">{c.corrected}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">{c.explanation}</p>
                              </div>
                            ))}
                            {!result.structure_improvements?.length && result.corrections.filter(c => c.type === 'structure').length === 0 && (
                              <p className="text-sm text-muted-foreground text-center py-4">구조 개선 제안 없음</p>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </Card>
                  )}

                  {/* Next Priority */}
                  {result.next_priority && result.next_priority.length > 0 && (
                    <Card className="p-5 bg-gradient-to-r from-primary/10 via-korean-purple/10 to-korean-pink/10 border-primary/20 shadow-sm">
                      <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2 text-base">
                        🎯 다음 과제 (Next Priority)
                      </h4>
                      <div className="space-y-2">
                        {result.next_priority.map((priority, i) => (
                          <div key={i} className="flex items-start gap-3 p-2 bg-background/50 rounded-lg">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                            }`}>
                              {i + 1}
                            </span>
                            <p className="text-sm text-foreground">{priority}</p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Detailed Feedback - Table Format */}
                  {result.detailed_feedback && (
                    <Card className="p-5 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 border-primary/20">
                      <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2 text-base">
                        💬 상세 피드백 (Chi tiết đánh giá)
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <tbody>
                            {cleanMarkdown(result.detailed_feedback)
                              .split('\n')
                              .filter(line => line.trim())
                              .map((line, i) => {
                                // Check if line looks like a header/category
                                const isHeader = line.includes(':') && line.indexOf(':') < 30;
                                const parts = isHeader ? line.split(':') : [null, line];
                                
                                return (
                                  <tr key={i} className={i % 2 === 0 ? 'bg-background/30' : 'bg-background/10'}>
                                    {isHeader && parts[0] ? (
                                      <>
                                        <td className="py-2 px-3 font-medium text-primary whitespace-nowrap border-r border-border/30 w-1/4">
                                          {i === 0 && '📌 '}{parts[0].trim()}
                                        </td>
                                        <td className="py-2 px-3 text-foreground/90">
                                          {parts.slice(1).join(':').trim()}
                                        </td>
                                      </>
                                    ) : (
                                      <td colSpan={2} className="py-2 px-3 text-foreground/90">
                                        {line.startsWith('•') || line.startsWith('-') ? (
                                          <span className="flex items-start gap-2">
                                            <span className="text-primary">✦</span>
                                            {line.replace(/^[•\-]\s*/, '')}
                                          </span>
                                        ) : (
                                          line
                                        )}
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  )}

                  {/* Model Answer */}
                  <Card className="p-5 bg-card border-border">
                    <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2 text-base">
                      ✨ Bài mẫu tham khảo (모범 답안)
                    </h4>
                    <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                      <div className="space-y-3">
                        {cleanMarkdown(result.model_answer)
                          .split('\n\n')
                          .filter(para => para.trim())
                          .map((paragraph, i) => (
                            <p key={i} className="text-sm text-foreground/90 leading-relaxed">
                              {i === 0 && <span className="text-primary font-medium">📝 </span>}
                              {paragraph.trim()}
                            </p>
                          ))}
                      </div>
                    </div>
                  </Card>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1"
                      variant="outline"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      {t("writingPage.result.saveResult")}
                    </Button>
                    <Button
                      onClick={handleExportPDF}
                      className="flex-1 btn-primary text-primary-foreground"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {t("writingPage.result.exportPdf")}
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <Card className="p-8 bg-card border-border h-full flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                      <PenTool className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{t("writingPage.result.title")}</p>
                      <p className="text-sm text-muted-foreground">
                        {t("writingPage.result.uploadPrompt")}
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* History Modal */}
          {showHistory && savedCorrections.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-6 bg-card border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg text-foreground">📚 {t("writingPage.history.title")}</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid gap-3 max-h-[300px] overflow-y-auto">
                  {savedCorrections.map((item) => (
                    <div 
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80"
                      onClick={() => {
                        setResult(item.correction_report);
                        setShowHistory(false);
                      }}
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {t("writingPage.history.score")}: {item.score}/100
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString(t("common.locale"), {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        {t("writingPage.history.viewAgain")}
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {/* OCR Edit Modal */}
          {showOcrEditModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowOcrEditModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-card border border-border rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-primary" />
                    {t("writingPage.ocr.title")}
                  </h3>
                  <Button variant="ghost" size="sm" onClick={handleOcrCancel}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                <p className="text-sm text-muted-foreground mb-4">
                  {t("writingPage.ocr.description")}
                </p>
                
                <Textarea
                  value={ocrRecognizedText}
                  onChange={(e) => setOcrRecognizedText(e.target.value)}
                  placeholder={t("writingPage.ocr.placeholder")}
                  className="min-h-[200px] resize-none mb-4"
                />
                
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleOcrCancel}
                  >
                    {t("writingPage.ocr.skipUseImage")}
                  </Button>
                  <Button
                    className="flex-1 btn-primary text-primary-foreground"
                    onClick={handleOcrConfirm}
                    disabled={!ocrRecognizedText.trim()}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {t("writingPage.ocr.confirmText")}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </main>
      
      {/* Hidden PDF Content for Export */}
      {result && (
        <div
          ref={pdfContentRef}
          style={{ display: 'none', width: '800px', fontFamily: 'sans-serif' }}
          className="bg-white text-black p-8"
        >
          {/* Header */}
          <div className="text-center mb-8 border-b-2 border-gray-200 pb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              TOPIK Writing Correction Report
            </h1>
            <p className="text-gray-600">LUKATO AI - topikbot.kr</p>
          </div>
          
          {/* Score Section */}
          <div className="border-2 border-gray-300 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-4">
              Overall Score: {result.overall_score}/100
            </h2>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-gray-600 text-sm">Grammar</p>
                <p className="text-xl font-bold text-gray-900">{result.grammar_score}/25</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Vocabulary</p>
                <p className="text-xl font-bold text-gray-900">{result.vocabulary_score}/25</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Structure</p>
                <p className="text-xl font-bold text-gray-900">{result.structure_score}/25</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Content</p>
                <p className="text-xl font-bold text-gray-900">{result.content_score}/25</p>
              </div>
            </div>
          </div>
          
          {/* Strengths */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">
              Strengths
            </h3>
            <ul className="space-y-2">
              {result.strengths.map((s, i) => (
                <li key={i} className="text-gray-700 pl-4 relative">
                  <span className="absolute left-0">-</span> {cleanMarkdown(s)}
                </li>
              ))}
            </ul>
          </div>
          
          {/* Areas for Improvement */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">
              Areas for Improvement
            </h3>
            <ul className="space-y-2">
              {result.improvements.map((imp, i) => (
                <li key={i} className="text-gray-700 pl-4 relative">
                  <span className="absolute left-0">-</span> {cleanMarkdown(imp)}
                </li>
              ))}
            </ul>
          </div>
          
          {/* Corrections */}
          {result.corrections.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">
                Corrections
              </h3>
              <div className="space-y-4">
                {result.corrections.slice(0, 10).map((c, i) => (
                  <div key={i} className="bg-gray-50 p-3 rounded">
                    <p className="text-red-600 mb-1">
                      <span className="font-medium">Original:</span> {cleanMarkdown(c.original)}
                    </p>
                    <p className="text-green-600 mb-1">
                      <span className="font-medium">Corrected:</span> {cleanMarkdown(c.corrected)}
                    </p>
                    <p className="text-gray-500 text-sm">{cleanMarkdown(c.explanation)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Model Answer */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">
              Model Answer
            </h3>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
              {cleanMarkdown(result.model_answer)}
            </p>
          </div>
          
          {/* Detailed Feedback */}
          {result.detailed_feedback && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">
                Detailed Feedback
              </h3>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {cleanMarkdown(result.detailed_feedback)}
              </p>
            </div>
          )}
          
          {/* Footer */}
          <div className="text-center text-gray-400 text-sm mt-8 pt-4 border-t border-gray-200">
            Generated by LUKATO AI | topikbot.kr
          </div>
        </div>
      )}
      
      <AppFooter />
    </div>
  );
};

export default WritingCorrection;
