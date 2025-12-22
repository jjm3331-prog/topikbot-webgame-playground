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
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import CleanHeader from "@/components/CleanHeader";
import { PremiumPreviewBanner } from "@/components/PremiumPreviewBanner";
import { useSubscription } from "@/hooks/useSubscription";

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
  
  const questionInputRef = useRef<HTMLInputElement>(null);
  const answerInputRef = useRef<HTMLInputElement>(null);

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
    await loadHistory(session.user.id);
    setLoading(false);
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
      }
    };
    reader.readAsDataURL(file);
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
    
    // Create printable content
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CleanHeader isLoggedIn={!!user} username={user?.email?.split('@')[0]} />
      
      <main className="pt-[76px] pb-8 px-4 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Premium Preview Banner */}
          {!isPremium && <PremiumPreviewBanner featureName="chấm bài viết AI" />}
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <h1 className="text-3xl font-heading font-bold text-foreground">
                ✍️ Chấm Writing TOPIK II (51~54)
              </h1>
              <p className="text-muted-foreground mt-2">
                AI chấm điểm và phân tích chi tiết bài viết của bạn
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowHistory(!showHistory)}
              className="shrink-0"
            >
              <History className="w-4 h-4 mr-2" />
              Lịch sử ({savedCorrections.length})
            </Button>
          </div>

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
                
                <input
                  ref={questionInputRef}
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
                      onClick={() => {
                        if (questionInputRef.current) {
                          questionInputRef.current.capture = "environment";
                          questionInputRef.current.click();
                        }
                      }}
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
                    <input
                      ref={answerInputRef}
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
                          onClick={() => {
                            if (answerInputRef.current) {
                              answerInputRef.current.capture = "environment";
                              answerInputRef.current.click();
                            }
                          }}
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
              {isPremium ? (
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
                      Chấm điểm AI
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

                  {/* Strengths & Improvements */}
                  <div className="grid gap-4">
                    <Card className="p-4 bg-green-500/10 border-green-500/30">
                      <h4 className="font-semibold text-green-600 dark:text-green-400 mb-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Điểm mạnh
                      </h4>
                      <ul className="space-y-1">
                        {result.strengths.map((s, i) => (
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
                        {result.improvements.map((s, i) => (
                          <li key={i} className="text-sm text-foreground">• {s}</li>
                        ))}
                      </ul>
                    </Card>
                  </div>

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
        </motion.div>
      </main>
    </div>
  );
};

export default WritingCorrection;