import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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

  const handleExportPDF = () => {
    if (!result) return;
    
    const content = `
      TOPIK Writing Correction Report
      ================================
      
      Overall Score: ${result.overall_score}/100
      
      Score Breakdown:
      - Grammar: ${result.grammar_score}/25
      - Vocabulary: ${result.vocabulary_score}/25
      - Structure: ${result.structure_score}/25
      - Content: ${result.content_score}/25
      
      Strengths:
      ${result.strengths.map(s => `• ${s}`).join('\n')}
      
      Areas for Improvement:
      ${result.improvements.map(i => `• ${i}`).join('\n')}
      
      Corrections:
      ${result.corrections.map(c => `
      Original: ${c.original}
      Corrected: ${c.corrected}
      Explanation: ${c.explanation}
      `).join('\n')}
      
      Model Answer:
      ${result.model_answer}
      
      Detailed Feedback:
      ${result.detailed_feedback}
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TOPIK_Writing_Report_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Đã xuất báo cáo!",
      description: "File đã được tải xuống"
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
      
      <main className="flex-1 pb-8 px-4 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
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
          <div className="flex items-center justify-between gap-2">
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
            <div>
              {result ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  {/* Score Card */}
                  <Card className="p-6 bg-gradient-to-br from-primary/10 to-korean-purple/10 border-primary/20">
                    <div className="text-center mb-6">
                      <div className="text-6xl font-bold text-primary mb-2">
                        {result.overall_score}
                      </div>
                      <p className="text-muted-foreground">/ 100 điểm</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: "Ngữ pháp", score: result.grammar_score },
                        { label: "Từ vựng", score: result.vocabulary_score },
                        { label: "Cấu trúc", score: result.structure_score },
                        { label: "Nội dung", score: result.content_score },
                      ].map((item) => (
                        <div key={item.label} className="bg-background/50 rounded-lg p-3">
                          <p className="text-sm text-muted-foreground">{item.label}</p>
                          <p className="text-xl font-bold text-foreground">{item.score}/25</p>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* SWOT Analysis */}
                  {result.swot_analysis && (
                    <Card className="p-4 bg-card border-border">
                      <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                        📊 SWOT 분석
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Strengths */}
                        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                          <h5 className="font-medium text-green-600 dark:text-green-400 mb-2 flex items-center gap-1.5 text-sm">
                            ✅ Strengths (강점)
                          </h5>
                          <div className="space-y-2">
                            {result.swot_analysis.strengths?.map((s: any, i: number) => (
                              <div key={i} className="text-xs">
                                <p className="font-medium text-foreground">{s.title}</p>
                                {s.evidence && <p className="text-muted-foreground italic">"{s.evidence}"</p>}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Weaknesses */}
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                          <h5 className="font-medium text-red-600 dark:text-red-400 mb-2 flex items-center gap-1.5 text-sm">
                            ⚠️ Weaknesses (약점)
                          </h5>
                          <div className="space-y-2">
                            {result.swot_analysis.weaknesses?.map((w: any, i: number) => (
                              <div key={i} className="text-xs">
                                <p className="font-medium text-foreground">{w.title}</p>
                                {w.impact && <p className="text-muted-foreground">{w.impact}</p>}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Opportunities */}
                        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                          <h5 className="font-medium text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1.5 text-sm">
                            🌟 Opportunities (기회)
                          </h5>
                          <div className="space-y-2">
                            {result.swot_analysis.opportunities?.map((o: any, i: number) => (
                              <div key={i} className="text-xs">
                                <p className="font-medium text-foreground">{o.title}</p>
                                {o.action && <p className="text-muted-foreground">{o.action}</p>}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Threats */}
                        <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                          <h5 className="font-medium text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-1.5 text-sm">
                            🚧 Threats (위협)
                          </h5>
                          <div className="space-y-2">
                            {result.swot_analysis.threats?.map((t: any, i: number) => (
                              <div key={i} className="text-xs">
                                <p className="font-medium text-foreground">{t.title}</p>
                                {t.risk_level && (
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                    t.risk_level === '상' ? 'bg-red-500/20 text-red-600' :
                                    t.risk_level === '중' ? 'bg-orange-500/20 text-orange-600' :
                                    'bg-green-500/20 text-green-600'
                                  }`}>
                                    위험도: {t.risk_level}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
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

                  {/* Corrections */}
                  {result.corrections.length > 0 && (
                    <Card className="p-4 bg-card border-border">
                      <h4 className="font-semibold text-foreground mb-3">📝 Chi tiết sửa lỗi</h4>
                      <div className="space-y-3 max-h-[300px] overflow-y-auto">
                        {result.corrections.map((c, i) => (
                          <div key={i} className="p-3 bg-muted rounded-lg">
                            <div className="flex gap-2 items-start mb-2">
                              <span className="text-destructive line-through">{c.original}</span>
                              <span>→</span>
                              <span className="text-green-600 dark:text-green-400 font-medium">{c.corrected}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{c.explanation}</p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Model Answer */}
                  <Card className="p-4 bg-card border-border">
                    <h4 className="font-semibold text-foreground mb-3">✨ Bài mẫu tham khảo</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {result.model_answer}
                    </p>
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
