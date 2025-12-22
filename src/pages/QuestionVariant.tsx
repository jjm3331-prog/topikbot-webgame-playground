import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Sparkles, Upload, Wand2, Loader2, Crown, ImageIcon, RefreshCw, BookOpen, Lightbulb, CheckCircle2, XCircle, Target, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
const usageExamples = [
  { subject: "Toán", example: "Chụp bài toán hàm số → AI tạo bài tương tự với số khác" },
  { subject: "Lý", example: "Chụp bài động lực học → AI tạo bài với giá trị khác, thêm/bớt điều kiện" },
  { subject: "Hóa", example: "Chụp bài cân bằng phương trình → AI tạo phương trình mới cùng dạng" },
  { subject: "Anh", example: "Chụp bài điền từ → AI tạo đoạn văn khác với cấu trúc ngữ pháp tương tự" },
];

interface ParsedResult {
  originalAnalysis?: {
    ko: string;
    vi: string;
  };
  variantQuestion?: {
    ko: string;
    vi: string;
  };
  answer?: {
    ko: string;
    vi: string;
  };
  explanation?: {
    ko: string;
    vi: string;
  };
  learningPoints?: {
    ko: string;
    vi: string;
  };
}

export default function QuestionVariant() {
  const { isPremium, loading: subscriptionLoading } = useSubscription();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<ParsedResult | null>(null);
  const [rawContent, setRawContent] = useState<string | null>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Kích thước ảnh tối đa 10MB");
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
        setImageFile(file);
        setGeneratedContent(null);
        setRawContent(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChangeImage = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const parseGeneratedContent = (content: string): ParsedResult => {
    const result: ParsedResult = {};
    
    // Parse sections using regex
    const sections = {
      originalAnalysis: /##\s*📋\s*원본\s*문제\s*분석\s*[\s\S]*?(?=##|$)/i,
      variantQuestion: /##\s*✨\s*변형\s*문제\s*[\s\S]*?(?=##|$)/i,
      answer: /##\s*✅\s*정답\s*[\s\S]*?(?=##|$)/i,
      explanation: /##\s*📝\s*해설\s*[\s\S]*?(?=##|$)/i,
      learningPoints: /##\s*💡\s*학습\s*포인트\s*[\s\S]*?(?=##|$)/i,
    };

    for (const [key, regex] of Object.entries(sections)) {
      const match = content.match(regex);
      if (match) {
        let text = match[0].replace(/^##\s*[📋✨✅📝💡]\s*[^\n]+\n?/, '').trim();
        result[key as keyof ParsedResult] = {
          ko: text,
          vi: '' // Will be filled by Vietnamese translation in edge function
        };
      }
    }

    return result;
  };

  const handleDownloadPDF = () => {
    if (!generatedContent && !rawContent) {
      toast.error("다운로드할 내용이 없습니다");
      return;
    }

    try {
      // Create printable HTML content
      const printContent = `
        <!DOCTYPE html>
        <html lang="ko">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>TOPIK 변형 문제 - ${new Date().toLocaleDateString()}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700&family=Noto+Sans:wght@400;600;700&display=swap');
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Noto Sans KR', 'Noto Sans', sans-serif;
              line-height: 1.6;
              color: #1a1a1a;
              padding: 40px;
              background: white;
            }
            
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 3px solid #f59e0b;
            }
            
            .header h1 {
              font-size: 24px;
              color: #f59e0b;
              margin-bottom: 8px;
            }
            
            .header .date {
              font-size: 12px;
              color: #666;
            }
            
            .section {
              margin-bottom: 25px;
              break-inside: avoid;
            }
            
            .section-title {
              font-size: 14px;
              font-weight: 700;
              color: white;
              padding: 10px 15px;
              margin-bottom: 15px;
              border-radius: 6px;
            }
            
            .section-1 .section-title { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
            .section-2 .section-title { background: linear-gradient(135deg, #f59e0b, #d97706); }
            .section-3 .section-title { background: linear-gradient(135deg, #10b981, #059669); }
            .section-4 .section-title { background: linear-gradient(135deg, #8b5cf6, #6d28d9); }
            .section-5 .section-title { background: linear-gradient(135deg, #ec4899, #be185d); }
            
            .content-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
            }
            
            .lang-block {
              padding: 15px;
              border-radius: 8px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
            }
            
            .lang-label {
              font-size: 11px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 10px;
              padding-bottom: 8px;
              border-bottom: 2px solid;
            }
            
            .lang-ko .lang-label {
              color: #3b82f6;
              border-color: #3b82f6;
            }
            
            .lang-vi .lang-label {
              color: #10b981;
              border-color: #10b981;
            }
            
            .lang-content {
              font-size: 13px;
              line-height: 1.8;
              white-space: pre-wrap;
            }
            
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              text-align: center;
              font-size: 11px;
              color: #999;
            }
            
            @media print {
              body {
                padding: 20px;
              }
              .section {
                break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>✨ TOPIK 변형 문제 / Biến thể đề thi</h1>
            <div class="date">생성일: ${new Date().toLocaleString('ko-KR')} | Ngày tạo: ${new Date().toLocaleString('vi-VN')}</div>
          </div>
          
          ${generatedContent ? `
            ${generatedContent.originalAnalysis ? `
              <div class="section section-1">
                <div class="section-title">📋 원문 분석 | Phân tích đề gốc</div>
                <div class="content-grid">
                  <div class="lang-block lang-ko">
                    <div class="lang-label">🇰🇷 한국어</div>
                    <div class="lang-content">${generatedContent.originalAnalysis.ko || '-'}</div>
                  </div>
                  <div class="lang-block lang-vi">
                    <div class="lang-label">🇻🇳 Tiếng Việt</div>
                    <div class="lang-content">${generatedContent.originalAnalysis.vi || '-'}</div>
                  </div>
                </div>
              </div>
            ` : ''}
            
            ${generatedContent.variantQuestion ? `
              <div class="section section-2">
                <div class="section-title">📝 변형 문제 | Câu hỏi biến thể</div>
                <div class="content-grid">
                  <div class="lang-block lang-ko">
                    <div class="lang-label">🇰🇷 한국어</div>
                    <div class="lang-content">${generatedContent.variantQuestion.ko || '-'}</div>
                  </div>
                  <div class="lang-block lang-vi">
                    <div class="lang-label">🇻🇳 Tiếng Việt</div>
                    <div class="lang-content">${generatedContent.variantQuestion.vi || '-'}</div>
                  </div>
                </div>
              </div>
            ` : ''}
            
            ${generatedContent.answer ? `
              <div class="section section-3">
                <div class="section-title">✅ 정답 | Đáp án</div>
                <div class="content-grid">
                  <div class="lang-block lang-ko">
                    <div class="lang-label">🇰🇷 한국어</div>
                    <div class="lang-content">${generatedContent.answer.ko || '-'}</div>
                  </div>
                  <div class="lang-block lang-vi">
                    <div class="lang-label">🇻🇳 Tiếng Việt</div>
                    <div class="lang-content">${generatedContent.answer.vi || '-'}</div>
                  </div>
                </div>
              </div>
            ` : ''}
            
            ${generatedContent.explanation ? `
              <div class="section section-4">
                <div class="section-title">💡 해설 | Giải thích chi tiết</div>
                <div class="content-grid">
                  <div class="lang-block lang-ko">
                    <div class="lang-label">🇰🇷 한국어</div>
                    <div class="lang-content">${generatedContent.explanation.ko || '-'}</div>
                  </div>
                  <div class="lang-block lang-vi">
                    <div class="lang-label">🇻🇳 Tiếng Việt</div>
                    <div class="lang-content">${generatedContent.explanation.vi || '-'}</div>
                  </div>
                </div>
              </div>
            ` : ''}
            
            ${generatedContent.learningPoints ? `
              <div class="section section-5">
                <div class="section-title">🎯 학습 포인트 | Điểm học tập</div>
                <div class="content-grid">
                  <div class="lang-block lang-ko">
                    <div class="lang-label">🇰🇷 한국어</div>
                    <div class="lang-content">${generatedContent.learningPoints.ko || '-'}</div>
                  </div>
                  <div class="lang-block lang-vi">
                    <div class="lang-label">🇻🇳 Tiếng Việt</div>
                    <div class="lang-content">${generatedContent.learningPoints.vi || '-'}</div>
                  </div>
                </div>
              </div>
            ` : ''}
          ` : `
            <div class="section">
              <div class="section-title" style="background: linear-gradient(135deg, #6b7280, #4b5563);">결과 / Kết quả</div>
              <div class="lang-block">
                <div class="lang-content">${rawContent || '-'}</div>
              </div>
            </div>
          `}
          
          <div class="footer">
            LUKATO AI - TOPIK Question Variant Generator | © ${new Date().getFullYear()}
          </div>
        </body>
        </html>
      `;

      // Open print window
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // Wait for fonts to load then print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        };
        
        toast.success("PDF 인쇄 창이 열렸습니다!");
      } else {
        toast.error("팝업이 차단되었습니다. 팝업을 허용해주세요.");
      }
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("PDF 생성 중 오류가 발생했습니다");
    }
  };

  const handleGenerate = async () => {
    if (!selectedImage || !imageFile) {
      toast.error("Vui lòng chọn ảnh câu hỏi");
      return;
    }

    if (!isPremium) {
      toast.error("Tính năng dành cho thành viên Premium");
      return;
    }

    setIsGenerating(true);
    setGeneratedContent(null);
    setRawContent(null);

    try {
      const base64Data = selectedImage.split(",")[1];
      const mimeType = imageFile.type;

      const { data, error } = await supabase.functions.invoke("question-variant", {
        body: {
          imageBase64: base64Data,
          imageMimeType: mimeType,
          difficulty: "similar",
        },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Lỗi khi gọi API");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Store raw content for fallback
      setRawContent(data.response);
      
      // Try to parse the structured response
      if (data.parsed) {
        setGeneratedContent(data.parsed);
      } else {
        // Fallback to parsing the raw markdown
        setGeneratedContent(parseGeneratedContent(data.response));
      }
      
      toast.success("Tạo câu hỏi biến thể thành công!");
    } catch (error) {
      console.error("Error generating variant:", error);
      toast.error(error instanceof Error ? error.message : "Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setIsGenerating(false);
    }
  };

  if (subscriptionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CleanHeader />
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
        disabled={!isPremium}
      />
      
      <main className="container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-foreground flex items-center justify-center gap-3 mb-3">
            <Sparkles className="w-8 h-8 text-yellow-500" />
            Biến thể đề thi
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-medium">
              <Crown className="w-4 h-4" />
              Premium
            </span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Chụp ảnh câu hỏi → AI tạo câu hỏi tương tự + giải thích chi tiết
          </p>
        </motion.div>

        {/* Premium Gate */}
        {!isPremium && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto mb-8"
          >
            <Card className="border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-orange-500/10">
              <CardContent className="p-6 text-center">
                <Crown className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">
                  Tính năng Premium
                </h3>
                <p className="text-muted-foreground mb-4">
                  Nâng cấp lên Premium để sử dụng tính năng biến thể đề thi không giới hạn
                </p>
                <Button 
                  onClick={() => navigate("/pricing")}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                >
                  Nâng cấp Premium
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Instructions Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-4xl mx-auto mb-8"
        >
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <span className="text-amber-500 text-sm">💡</span>
                </div>
                <h3 className="font-semibold text-amber-500">Hướng dẫn sử dụng (Rất đơn giản!)</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {[
                  { step: 1, title: "Chụp ảnh câu hỏi", desc: "Chụp màn hình hoặc chụp ảnh câu hỏi từ đề thi/sách" },
                  { step: 2, title: "Nhận kết quả", desc: "AI tạo câu hỏi mới + giải thích chi tiết bằng 2 ngôn ngữ" },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold">{item.step}</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-amber-500/10 rounded-lg p-4">
                <h4 className="font-medium text-amber-500 mb-2 flex items-center gap-2">
                  💡 Ví dụ cách sử dụng:
                </h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {usageExamples.map((ex, i) => (
                    <li key={i}>
                      <span className="text-amber-400 font-medium">• {ex.subject}:</span> {ex.example}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-4xl mx-auto"
        >
          {/* Image Upload Area */}
          <Card className="mb-6 overflow-hidden">
            <CardContent className="p-0">
              {selectedImage ? (
                <div className="relative">
                  <img 
                    src={selectedImage} 
                    alt="Uploaded question" 
                    className="w-full max-h-[500px] object-contain bg-black/50"
                  />
                  <Button
                    onClick={handleChangeImage}
                    className="absolute top-4 right-4 bg-background/90 hover:bg-background text-foreground border border-border"
                    size="sm"
                    disabled={!isPremium}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Đổi ảnh
                  </Button>
                </div>
              ) : (
                <div 
                  onClick={() => isPremium && fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center min-h-[300px] cursor-pointer border-2 border-dashed border-border/50 hover:border-primary/50 transition-colors ${!isPremium ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <ImageIcon className="w-16 h-16 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-foreground mb-2">
                    Tải ảnh câu hỏi lên
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Nhấn hoặc kéo thả ảnh vào đây (tối đa 10MB)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={!selectedImage || !isPremium || isGenerating}
            className="w-full py-6 text-lg font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-50"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Đang phân tích và tạo câu hỏi biến thể...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5 mr-2" />
                Tạo câu hỏi biến thể
              </>
            )}
          </Button>

          {/* Generated Result - Production Quality */}
          {(generatedContent || rawContent) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 space-y-6"
            >
              {/* Download Button */}
              <div className="flex justify-end">
                <Button
                  onClick={handleDownloadPDF}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  PDF 다운로드 / Tải PDF
                </Button>
              </div>
              {/* Section 1: Original Analysis */}
              {generatedContent?.originalAnalysis && (
                <Card className="overflow-hidden border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-indigo-500/5">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-3">
                      <BookOpen className="w-6 h-6" />
                      <span>원본 문제 분석</span>
                      <span className="text-white/70">|</span>
                      <span className="text-white/90">Phân tích đề gốc</span>
                    </h3>
                  </div>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Korean */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b border-blue-500/20">
                          <span className="text-lg">🇰🇷</span>
                          <span className="font-bold text-blue-400">한국어</span>
                        </div>
                        <div className="text-foreground leading-relaxed whitespace-pre-wrap">
                          {generatedContent.originalAnalysis.ko}
                        </div>
                      </div>
                      {/* Vietnamese */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b border-indigo-500/20">
                          <span className="text-lg">🇻🇳</span>
                          <span className="font-bold text-indigo-400">Tiếng Việt</span>
                        </div>
                        <div className="text-foreground leading-relaxed whitespace-pre-wrap">
                          {generatedContent.originalAnalysis.vi || generatedContent.originalAnalysis.ko}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Section 2: Variant Question */}
              {generatedContent?.variantQuestion && (
                <Card className="overflow-hidden border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
                  <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-3">
                      <Sparkles className="w-6 h-6" />
                      <span>변형 문제</span>
                      <span className="text-white/70">|</span>
                      <span className="text-white/90">Câu hỏi biến thể</span>
                    </h3>
                  </div>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Korean */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b border-amber-500/20">
                          <span className="text-lg">🇰🇷</span>
                          <span className="font-bold text-amber-400">한국어</span>
                        </div>
                        <div className="text-foreground leading-relaxed whitespace-pre-wrap bg-amber-500/10 p-4 rounded-lg border border-amber-500/20">
                          {generatedContent.variantQuestion.ko}
                        </div>
                      </div>
                      {/* Vietnamese */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b border-orange-500/20">
                          <span className="text-lg">🇻🇳</span>
                          <span className="font-bold text-orange-400">Tiếng Việt</span>
                        </div>
                        <div className="text-foreground leading-relaxed whitespace-pre-wrap bg-orange-500/10 p-4 rounded-lg border border-orange-500/20">
                          {generatedContent.variantQuestion.vi || generatedContent.variantQuestion.ko}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Section 3: Answer */}
              {generatedContent?.answer && (
                <Card className="overflow-hidden border-2 border-green-500/30 bg-gradient-to-br from-green-500/5 to-emerald-500/5">
                  <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6" />
                      <span>정답</span>
                      <span className="text-white/70">|</span>
                      <span className="text-white/90">Đáp án</span>
                    </h3>
                  </div>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Korean */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b border-green-500/20">
                          <span className="text-lg">🇰🇷</span>
                          <span className="font-bold text-green-400">한국어</span>
                        </div>
                        <div className="text-foreground leading-relaxed whitespace-pre-wrap text-lg font-semibold bg-green-500/10 p-4 rounded-lg border border-green-500/20">
                          {generatedContent.answer.ko}
                        </div>
                      </div>
                      {/* Vietnamese */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b border-emerald-500/20">
                          <span className="text-lg">🇻🇳</span>
                          <span className="font-bold text-emerald-400">Tiếng Việt</span>
                        </div>
                        <div className="text-foreground leading-relaxed whitespace-pre-wrap text-lg font-semibold bg-emerald-500/10 p-4 rounded-lg border border-emerald-500/20">
                          {generatedContent.answer.vi || generatedContent.answer.ko}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Section 4: Explanation */}
              {generatedContent?.explanation && (
                <Card className="overflow-hidden border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-violet-500/5">
                  <div className="bg-gradient-to-r from-purple-600 to-violet-600 px-6 py-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-3">
                      <Target className="w-6 h-6" />
                      <span>해설</span>
                      <span className="text-white/70">|</span>
                      <span className="text-white/90">Giải thích chi tiết</span>
                    </h3>
                  </div>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Korean */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b border-purple-500/20">
                          <span className="text-lg">🇰🇷</span>
                          <span className="font-bold text-purple-400">한국어</span>
                        </div>
                        <div className="text-foreground leading-relaxed whitespace-pre-wrap">
                          {generatedContent.explanation.ko}
                        </div>
                      </div>
                      {/* Vietnamese */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b border-violet-500/20">
                          <span className="text-lg">🇻🇳</span>
                          <span className="font-bold text-violet-400">Tiếng Việt</span>
                        </div>
                        <div className="text-foreground leading-relaxed whitespace-pre-wrap">
                          {generatedContent.explanation.vi || generatedContent.explanation.ko}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Section 5: Learning Points */}
              {generatedContent?.learningPoints && (
                <Card className="overflow-hidden border-2 border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-teal-500/5">
                  <div className="bg-gradient-to-r from-cyan-600 to-teal-600 px-6 py-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-3">
                      <Lightbulb className="w-6 h-6" />
                      <span>학습 포인트</span>
                      <span className="text-white/70">|</span>
                      <span className="text-white/90">Điểm học tập</span>
                    </h3>
                  </div>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Korean */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b border-cyan-500/20">
                          <span className="text-lg">🇰🇷</span>
                          <span className="font-bold text-cyan-400">한국어</span>
                        </div>
                        <div className="text-foreground leading-relaxed whitespace-pre-wrap">
                          {generatedContent.learningPoints.ko}
                        </div>
                      </div>
                      {/* Vietnamese */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b border-teal-500/20">
                          <span className="text-lg">🇻🇳</span>
                          <span className="font-bold text-teal-400">Tiếng Việt</span>
                        </div>
                        <div className="text-foreground leading-relaxed whitespace-pre-wrap">
                          {generatedContent.learningPoints.vi || generatedContent.learningPoints.ko}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Fallback: Raw Content if parsing failed */}
              {rawContent && !generatedContent?.variantQuestion && (
                <Card className="overflow-hidden border-2 border-primary/30">
                  <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-3">
                      <Sparkles className="w-6 h-6" />
                      Kết quả biến thể
                    </h3>
                  </div>
                  <CardContent className="p-6">
                    <div className="prose prose-invert max-w-none text-foreground leading-relaxed whitespace-pre-wrap">
                      {rawContent}
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}
        </motion.div>
      </main>

      <AppFooter />
    </div>
  );
}
