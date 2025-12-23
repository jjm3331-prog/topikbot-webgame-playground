import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import jsPDF from "jspdf";
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
}

interface SavedCorrection {
  id: string;
  created_at: string;
  score: number;
  correction_report: CorrectionResult;
}

const WritingCorrection = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isPremium } = useSubscription();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [questionImage, setQuestionImage] = useState<File | null>(null);
  const [questionImagePreview, setQuestionImagePreview] = useState<string | null>(null);
  const [answerMethod, setAnswerMethod] = useState<"image" | "text">("text");
  const [answerImage, setAnswerImage] = useState<File | null>(null);
  const [answerImagePreview, setAnswerImagePreview] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  
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
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      if (type === "question") {
        setQuestionImage(file);
        setQuestionImagePreview(preview);
      } else {
        setAnswerImage(file);
        setAnswerImagePreview(preview);
        // When answer image is uploaded, offer OCR editing
        setOcrEditingType("answer");
        performOCR(preview, "answer");
      }
    };
    reader.readAsDataURL(file);
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
    if (!questionImage) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng upload hình ảnh đề bài",
        variant: "destructive"
      });
      return;
    }

    if (answerMethod === "image" && !answerImage) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng upload hình ảnh bài làm",
        variant: "destructive"
      });
      return;
    }

    if (answerMethod === "text" && !answerText.trim()) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập nội dung bài làm",
        variant: "destructive"
      });
      return;
    }

    setProcessing(true);
    setResult(null);

    try {
      const timestamp = Date.now();
      const questionImageUrl = await uploadImage(
        questionImage,
        `${user.id}/question-${timestamp}.jpg`
      );

      let answerImageUrl: string | null = null;
      if (answerMethod === "image" && answerImage) {
        answerImageUrl = await uploadImage(
          answerImage,
          `${user.id}/answer-${timestamp}.jpg`
        );
      }

      const response = await supabase.functions.invoke("writing-correction", {
        body: {
          questionImageUrl,
          answerImageUrl,
          answerText: answerMethod === "text" ? answerText : null
        }
      });

      if (response.error) throw response.error;

      setResult(response.data);
      
      // If using free usage, record it
      if (!isPremium && canUseFreeToday) {
        await recordFreeUsage(user.id);
      }
      
      toast({
        title: "Chấm điểm hoàn tất!",
        description: `Điểm số: ${response.data.overall_score}/100`
      });
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Lỗi",
        description: "Không thể chấm điểm. Vui lòng thử lại.",
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
        question_image_url: questionImagePreview,
        answer_image_url: answerImagePreview,
        answer_text: answerText || null,
        correction_report: JSON.parse(JSON.stringify(result)),
        score: result.overall_score
      }]);

      if (error) throw error;

      await loadHistory(user.id);
      toast({
        title: "Đã lưu!",
        description: "Bài chấm đã được lưu vào lịch sử"
      });
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Lỗi",
        description: "Không thể lưu. Vui lòng thử lại.",
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

  const handleExportPDF = () => {
    if (!result) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let yPos = 20;
    
    // Helper function to add text with word wrap
    const addText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10) => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(cleanMarkdown(text), maxWidth);
      doc.text(lines, x, y);
      return y + (lines.length * fontSize * 0.4);
    };

    // Helper to check and add new page
    const checkNewPage = (requiredSpace: number) => {
      if (yPos + requiredSpace > 280) {
        doc.addPage();
        yPos = 20;
      }
    };

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("TOPIK Writing Correction Report", pageWidth / 2, yPos, { align: "center" });
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("LUKATO AI - topikbot.kr", pageWidth / 2, yPos, { align: "center" });
    yPos += 15;

    // Score Section
    doc.setDrawColor(200, 200, 200);
    doc.rect(margin, yPos, contentWidth, 45);
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Overall Score: ${result.overall_score}/100`, pageWidth / 2, yPos + 12, { align: "center" });
    
    yPos += 22;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    // Score table
    const scores = [
      { label: "Grammar", score: result.grammar_score },
      { label: "Vocabulary", score: result.vocabulary_score },
      { label: "Structure", score: result.structure_score },
      { label: "Content", score: result.content_score },
    ];
    
    const colWidth = contentWidth / 4;
    scores.forEach((s, i) => {
      const x = margin + (i * colWidth) + colWidth / 2;
      doc.text(s.label, x, yPos, { align: "center" });
      doc.setFont("helvetica", "bold");
      doc.text(`${s.score}/25`, x, yPos + 6, { align: "center" });
      doc.setFont("helvetica", "normal");
    });
    
    yPos += 30;

    // Strengths
    checkNewPage(40);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Strengths", margin, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    result.strengths.forEach(s => {
      checkNewPage(10);
      yPos = addText(`- ${s}`, margin + 5, yPos, contentWidth - 10, 10);
      yPos += 2;
    });
    yPos += 5;

    // Improvements
    checkNewPage(40);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Areas for Improvement", margin, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    result.improvements.forEach(i => {
      checkNewPage(10);
      yPos = addText(`- ${i}`, margin + 5, yPos, contentWidth - 10, 10);
      yPos += 2;
    });
    yPos += 10;

    // Corrections
    if (result.corrections.length > 0) {
      checkNewPage(40);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Corrections", margin, yPos);
      yPos += 8;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      result.corrections.slice(0, 10).forEach(c => {
        checkNewPage(20);
        doc.setTextColor(200, 0, 0);
        yPos = addText(`Original: ${c.original}`, margin + 5, yPos, contentWidth - 10, 9);
        doc.setTextColor(0, 150, 0);
        yPos = addText(`Corrected: ${c.corrected}`, margin + 5, yPos + 2, contentWidth - 10, 9);
        doc.setTextColor(100, 100, 100);
        yPos = addText(`${c.explanation}`, margin + 5, yPos + 2, contentWidth - 10, 8);
        doc.setTextColor(0, 0, 0);
        yPos += 5;
      });
      yPos += 5;
    }

    // Model Answer
    checkNewPage(50);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Model Answer", margin, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    yPos = addText(result.model_answer, margin + 5, yPos, contentWidth - 10, 10);
    yPos += 10;

    // Detailed Feedback
    if (result.detailed_feedback) {
      checkNewPage(50);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Detailed Feedback", margin, yPos);
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      yPos = addText(result.detailed_feedback, margin + 5, yPos, contentWidth - 10, 10);
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Generated by LUKATO AI | Page ${i} of ${pageCount}`, pageWidth / 2, 290, { align: "center" });
      doc.setTextColor(0, 0, 0);
    }

    doc.save(`TOPIK_Writing_Report_${Date.now()}.pdf`);

    toast({
      title: "PDF 다운로드 완료!",
      description: "파일이 다운로드되었습니다"
    });
  };

  const formatTimeRemaining = (targetDate: Date) => {
    const now = new Date();
    const diff = targetDate.getTime() - now.getTime();
    if (diff <= 0) return "Có thể sử dụng ngay";
    
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
          {!isPremium && <PremiumPreviewBanner featureName="chấm bài viết AI" />}
          
          {/* Daily Free Usage Banner for non-premium users */}
          {!isPremium && !checkingFreeUsage && (
            <Card className={`p-4 ${canUseFreeToday ? 'bg-green-500/10 border-green-500/30' : 'bg-blue-500/10 border-blue-500/30'}`}>
              <div className="flex items-center gap-3">
                <Clock className={`w-5 h-5 ${canUseFreeToday ? 'text-green-500' : 'text-blue-500'} shrink-0`} />
                <div className="flex-1">
                  {canUseFreeToday ? (
                    <>
                      <p className="font-medium text-green-600 dark:text-green-400">🎁 Bạn có 1 lượt chấm miễn phí hôm nay!</p>
                      <p className="text-sm text-muted-foreground">
                        Mỗi ngày bạn được sử dụng 1 lần miễn phí. Nâng cấp Premium để không giới hạn.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-blue-600 dark:text-blue-400">⏰ Đã sử dụng lượt miễn phí hôm nay</p>
                      <p className="text-sm text-muted-foreground">
                        Lượt miễn phí tiếp theo: {nextFreeTime ? formatTimeRemaining(nextFreeTime) : 'N/A'}. 
                        Nâng cấp Premium để không giới hạn.
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
                ✍️ Chấm Writing TOPIK II (51~54)
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                AI chấm điểm và phân tích chi tiết bài viết của bạn
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="shrink-0"
            >
              <History className="w-4 h-4 mr-2" />
              Lịch sử ({savedCorrections.length})
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
                      🎁 Bạn có 1 lượt chấm miễn phí hôm nay!
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      ⏰ Lượt miễn phí tiếp theo: {nextFreeTime ? formatTimeRemaining(nextFreeTime) : 'N/A'}
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
                <p className="font-medium text-foreground">Lưu ý quan trọng</p>
                <p className="text-sm text-muted-foreground">
                  Chữ viết tay tiếng Hàn khó nhận dạng có thể ảnh hưởng đến kết quả. 
                  Khuyến nghị sử dụng phương thức <strong>nhập văn bản</strong> để có kết quả chính xác nhất.
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
                  1. Upload đề bài gốc
                </h3>
                
                {/* File upload input (no capture - for file selection) */}
                <input
                  ref={questionInputRef}
                  type="file"
                  accept="image/*"
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

                {questionImagePreview ? (
                  <div className="relative">
                    <img 
                      src={questionImagePreview} 
                      alt="Question" 
                      className="w-full rounded-lg border border-border"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setQuestionImage(null);
                        setQuestionImagePreview(null);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => questionInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload ảnh
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => questionCameraRef.current?.click()}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Chụp ảnh
                    </Button>
                  </div>
                )}
              </Card>

              {/* Answer Input */}
              <Card className="p-6 bg-card border-border">
                <h3 className="font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
                  <PenTool className="w-5 h-5 text-primary" />
                  2. Bài làm của bạn
                </h3>

                <Tabs value={answerMethod} onValueChange={(v) => setAnswerMethod(v as "image" | "text")}>
                  <TabsList className="w-full mb-4">
                    <TabsTrigger value="text" className="flex-1">
                      <FileText className="w-4 h-4 mr-2" />
                      Nhập văn bản
                    </TabsTrigger>
                    <TabsTrigger value="image" className="flex-1">
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Upload ảnh
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="text">
                    <Textarea
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      placeholder="Dán hoặc nhập bài viết của bạn tại đây..."
                      className="min-h-[200px] resize-none"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      💡 Tip: Copy & Paste văn bản từ file Word hoặc ghi chú
                    </p>
                  </TabsContent>

                  <TabsContent value="image">
                    {/* File upload input (no capture - for file selection) */}
                    <input
                      ref={answerInputRef}
                      type="file"
                      accept="image/*"
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

                    {answerImagePreview ? (
                      <div className="relative">
                        <img 
                          src={answerImagePreview} 
                          alt="Answer" 
                          className="w-full rounded-lg border border-border"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            setAnswerImage(null);
                            setAnswerImagePreview(null);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        {ocrProcessing && (
                          <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                            <div className="text-center">
                              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                              <p className="text-sm">Đang nhận dạng văn bản...</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => answerInputRef.current?.click()}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload ảnh
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => answerCameraRef.current?.click()}
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Chụp ảnh
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </Card>

              {/* Submit Button */}
              {canSubmit ? (
                <Button
                  onClick={handleSubmit}
                  disabled={processing || !questionImage}
                  className="w-full btn-primary text-primary-foreground h-14 text-lg"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Đang chấm điểm...
                    </>
                  ) : (
                    <>
                      <PenTool className="w-5 h-5 mr-2" />
                      {isPremium ? 'Chấm điểm AI' : '🎁 Chấm điểm miễn phí (1/ngày)'}
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={() => navigate("/pricing")}
                  className="w-full bg-gradient-to-r from-korean-orange to-korean-pink hover:opacity-90 text-white h-14 text-lg"
                >
                  <Lock className="w-5 h-5 mr-2" />
                  Nâng cấp Premium để chấm điểm
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
                            {selectedScoreArea === "grammar" && "🔴 문법 (Ngữ pháp) 상세 분석"}
                            {selectedScoreArea === "vocabulary" && "🟡 어휘 (Từ vựng) 상세 분석"}
                            {selectedScoreArea === "structure" && "🟢 구조 (Cấu trúc) 상세 분석"}
                            {selectedScoreArea === "content" && "🔵 내용 (Nội dung) 상세 분석"}
                          </h5>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedScoreArea(null)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        {/* Grammar Detail */}
                        {selectedScoreArea === "grammar" && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-foreground">점수:</span>
                              <span className={`font-bold ${result.grammar_score >= 20 ? 'text-green-500' : result.grammar_score >= 15 ? 'text-yellow-500' : 'text-red-500'}`}>
                                {result.grammar_score}/25
                              </span>
                              <span className="text-muted-foreground">
                                ({result.grammar_score >= 20 ? '우수' : result.grammar_score >= 15 ? '보통' : '개선 필요'})
                              </span>
                            </div>
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">발견된 문법 오류:</p>
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
                                <p className="text-xs text-green-500">문법 오류가 발견되지 않았습니다! ✨</p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Vocabulary Detail */}
                        {selectedScoreArea === "vocabulary" && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-foreground">점수:</span>
                              <span className={`font-bold ${result.vocabulary_score >= 20 ? 'text-green-500' : result.vocabulary_score >= 15 ? 'text-yellow-500' : 'text-red-500'}`}>
                                {result.vocabulary_score}/25
                              </span>
                              <span className="text-muted-foreground">
                                ({result.vocabulary_score >= 20 ? '우수' : result.vocabulary_score >= 15 ? '보통' : '개선 필요'})
                              </span>
                            </div>
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">어휘 개선 제안:</p>
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
                                <p className="text-xs text-green-500">어휘 사용이 적절합니다! ✨</p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Structure Detail */}
                        {selectedScoreArea === "structure" && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-foreground">점수:</span>
                              <span className={`font-bold ${result.structure_score >= 20 ? 'text-green-500' : result.structure_score >= 15 ? 'text-yellow-500' : 'text-red-500'}`}>
                                {result.structure_score}/25
                              </span>
                              <span className="text-muted-foreground">
                                ({result.structure_score >= 20 ? '우수' : result.structure_score >= 15 ? '보통' : '개선 필요'})
                              </span>
                            </div>
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">구조 개선 제안:</p>
                              {result.structure_improvements && result.structure_improvements.length > 0 ? (
                                result.structure_improvements.slice(0, 2).map((s, i) => (
                                  <div key={i} className="text-xs p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                                    <p className="text-muted-foreground mb-1">현재: {s.current}</p>
                                    <p className="text-green-500 font-medium">개선: {s.improved}</p>
                                    <p className="text-muted-foreground mt-1 italic">{s.reason}</p>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-green-500">글의 구조가 잘 짜여져 있습니다! ✨</p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Content Detail */}
                        {selectedScoreArea === "content" && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-foreground">점수:</span>
                              <span className={`font-bold ${result.content_score >= 20 ? 'text-green-500' : result.content_score >= 15 ? 'text-yellow-500' : 'text-red-500'}`}>
                                {result.content_score}/25
                              </span>
                              <span className="text-muted-foreground">
                                ({result.content_score >= 20 ? '우수' : result.content_score >= 15 ? '보통' : '개선 필요'})
                              </span>
                            </div>
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">내용 분석:</p>
                              {result.swot_analysis?.strengths && result.swot_analysis.strengths.length > 0 && (
                                <div className="text-xs p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                  <p className="font-medium text-blue-500 mb-1">✅ 잘된 점:</p>
                                  {result.swot_analysis.strengths.slice(0, 2).map((s, i) => (
                                    <p key={i} className="text-muted-foreground">• {s.title}</p>
                                  ))}
                                </div>
                              )}
                              {result.swot_analysis?.weaknesses && result.swot_analysis.weaknesses.length > 0 && (
                                <div className="text-xs p-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
                                  <p className="font-medium text-orange-500 mb-1">⚠️ 개선할 점:</p>
                                  {result.swot_analysis.weaknesses.slice(0, 2).map((w, i) => (
                                    <p key={i} className="text-muted-foreground">• {w.title}</p>
                                  ))}
                                </div>
                              )}
                              {!result.swot_analysis?.strengths?.length && !result.swot_analysis?.weaknesses?.length && (
                                <p className="text-xs text-muted-foreground">상세 피드백을 참고해 주세요.</p>
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
                        📊 SWOT 분석
                      </h4>
                      <Accordion type="multiple" defaultValue={["strengths"]} className="space-y-3">
                        {/* Strengths */}
                        <AccordionItem value="strengths" className="border rounded-lg bg-green-500/10 border-green-500/30 px-3">
                          <AccordionTrigger className="text-sm font-medium text-green-600 dark:text-green-400 hover:no-underline py-3">
                            ✅ Strengths (강점) ({result.swot_analysis.strengths?.length || 0})
                          </AccordionTrigger>
                          <AccordionContent className="pb-3">
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs border-collapse">
                                <thead>
                                  <tr className="bg-green-500/20">
                                    <th className="py-2 px-2 text-left font-medium text-green-700 dark:text-green-300 border-b border-green-500/30">💡 포인트</th>
                                    <th className="py-2 px-2 text-left font-medium text-green-700 dark:text-green-300 border-b border-green-500/30">📝 근거/분석</th>
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
                            ⚠️ Weaknesses (약점) ({result.swot_analysis.weaknesses?.length || 0})
                          </AccordionTrigger>
                          <AccordionContent className="pb-3">
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs border-collapse">
                                <thead>
                                  <tr className="bg-red-500/20">
                                    <th className="py-2 px-2 text-left font-medium text-red-700 dark:text-red-300 border-b border-red-500/30">❌ 문제점</th>
                                    <th className="py-2 px-2 text-left font-medium text-red-700 dark:text-red-300 border-b border-red-500/30">⚡ 영향</th>
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
                            🌟 Opportunities (기회) ({result.swot_analysis.opportunities?.length || 0})
                          </AccordionTrigger>
                          <AccordionContent className="pb-3">
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs border-collapse">
                                <thead>
                                  <tr className="bg-blue-500/20">
                                    <th className="py-2 px-2 text-left font-medium text-blue-700 dark:text-blue-300 border-b border-blue-500/30">🎯 기회</th>
                                    <th className="py-2 px-2 text-left font-medium text-blue-700 dark:text-blue-300 border-b border-blue-500/30">🚀 방법</th>
                                    <th className="py-2 px-2 text-left font-medium text-blue-700 dark:text-blue-300 border-b border-blue-500/30">✨ 효과</th>
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
                            🚧 Threats (위협) ({result.swot_analysis.threats?.length || 0})
                          </AccordionTrigger>
                          <AccordionContent className="pb-3">
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs border-collapse">
                                <thead>
                                  <tr className="bg-orange-500/20">
                                    <th className="py-2 px-2 text-left font-medium text-orange-700 dark:text-orange-300 border-b border-orange-500/30">⚠️ 위협</th>
                                    <th className="py-2 px-2 text-left font-medium text-orange-700 dark:text-orange-300 border-b border-orange-500/30 w-20">🔥 위험도</th>
                                    <th className="py-2 px-2 text-left font-medium text-orange-700 dark:text-orange-300 border-b border-orange-500/30">🛡️ 예방법</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {result.swot_analysis.threats?.map((t, i) => (
                                    <tr key={i} className={i % 2 === 0 ? 'bg-background/50' : 'bg-background/30'}>
                                      <td className="py-2 px-2 font-medium text-foreground border-r border-orange-500/20">{cleanMarkdown(t.title)}</td>
                                      <td className="py-2 px-2 border-r border-orange-500/20">
                                        {t.risk_level && (
                                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                            t.risk_level === '상' ? 'bg-red-500/20 text-red-600' :
                                            t.risk_level === '중' ? 'bg-orange-500/20 text-orange-600' :
                                            'bg-green-500/20 text-green-600'
                                          }`}>
                                            {t.risk_level}
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-2 px-2 text-muted-foreground">{t.prevention && cleanMarkdown(t.prevention)}</td>
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
                      Lưu kết quả
                    </Button>
                    <Button
                      onClick={handleExportPDF}
                      className="flex-1 btn-primary text-primary-foreground"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Xuất PDF
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
                      <p className="font-semibold text-foreground">Kết quả chấm điểm</p>
                      <p className="text-sm text-muted-foreground">
                        Upload đề bài và bài làm để nhận phân tích chi tiết
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
                  <h3 className="font-semibold text-lg text-foreground">📚 Lịch sử chấm điểm</h3>
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
                          Điểm: {item.score}/100
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString("vi-VN", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        Xem lại
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
                    Chỉnh sửa văn bản nhận dạng
                  </h3>
                  <Button variant="ghost" size="sm" onClick={handleOcrCancel}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                <p className="text-sm text-muted-foreground mb-4">
                  AI đã nhận dạng văn bản từ hình ảnh. Vui lòng kiểm tra và chỉnh sửa nếu có lỗi:
                </p>
                
                <Textarea
                  value={ocrRecognizedText}
                  onChange={(e) => setOcrRecognizedText(e.target.value)}
                  placeholder="Văn bản nhận dạng từ hình ảnh..."
                  className="min-h-[200px] resize-none mb-4"
                />
                
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleOcrCancel}
                  >
                    Bỏ qua, dùng ảnh gốc
                  </Button>
                  <Button
                    className="flex-1 btn-primary text-primary-foreground"
                    onClick={handleOcrConfirm}
                    disabled={!ocrRecognizedText.trim()}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Xác nhận văn bản
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </main>
      <AppFooter />
    </div>
  );
};

export default WritingCorrection;
