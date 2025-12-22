import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Languages, 
  ArrowRightLeft, 
  Volume2, 
  Mic, 
  MicOff,
  Copy, 
  Check, 
  Sparkles,
  BookOpen,
  GraduationCap,
  Loader2,
  ChevronDown,
  MessageCircle,
  Lightbulb
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";

interface TranslationResult {
  translation: string;
  pronunciation: string;
  romanization: string;
  grammar_notes: Array<{
    pattern: string;
    explanation: string;
    level: string;
  }>;
  vocabulary: Array<{
    word: string;
    meaning: string;
    example: string;
  }>;
  alternative_translations: string[];
  usage_context: string;
  formality_level: string;
  source_language: string;
  target_language: string;
}

export default function Translate() {
  const [sourceText, setSourceText] = useState("");
  const [sourceLang, setSourceLang] = useState<"ko" | "vi">("ko");
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showGrammar, setShowGrammar] = useState(false);
  const [showVocab, setShowVocab] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const targetLang = sourceLang === "ko" ? "vi" : "ko";

  const handleSwapLanguages = () => {
    setSourceLang(targetLang as "ko" | "vi");
    if (result) {
      setSourceText(result.translation);
      setResult(null);
    }
  };

  const handleTranslate = async () => {
    if (!sourceText.trim()) {
      toast.error("Vui lòng nhập văn bản cần dịch");
      return;
    }

    setIsTranslating(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("translate-ko-vi", {
        body: {
          text: sourceText.trim(),
          sourceLanguage: sourceLang,
          targetLanguage: targetLang,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setResult(data);
    } catch (error: any) {
      console.error("Translation error:", error);
      toast.error(error.message || "Lỗi dịch thuật. Vui lòng thử lại.");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSpeak = async (text: string, lang: "ko" | "vi") => {
    if (!text.trim() || isSpeaking) return;

    setIsSpeaking(true);

    try {
      // Use korean-tts for Korean text
      if (lang === "ko") {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/korean-tts`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ text, voice: "nova", speed: 0.9 }),
          }
        );

        if (!response.ok) throw new Error("TTS request failed");

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        if (audioRef.current) {
          audioRef.current.pause();
        }
        
        audioRef.current = new Audio(audioUrl);
        audioRef.current.onended = () => setIsSpeaking(false);
        audioRef.current.onerror = () => {
          setIsSpeaking(false);
          toast.error("Lỗi phát âm thanh");
        };
        await audioRef.current.play();
      } else {
        // Use browser TTS for Vietnamese
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "vi-VN";
        utterance.rate = 0.9;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => {
          setIsSpeaking(false);
          toast.error("Trình duyệt không hỗ trợ TTS tiếng Việt");
        };
        speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error("TTS error:", error);
      setIsSpeaking(false);
      toast.error("Lỗi phát âm thanh. Vui lòng thử lại.");
    }
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        
        // Convert to base64 and send to STT
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(",")[1];
          
          try {
            const { data, error } = await supabase.functions.invoke("korean-stt", {
              body: { audio: base64, language: sourceLang === "ko" ? "ko" : "vi" },
            });

            if (error) throw error;
            if (data.text) {
              setSourceText(data.text);
              toast.success("Đã nhận diện giọng nói!");
            }
          } catch (err: any) {
            console.error("STT error:", err);
            toast.error("Lỗi nhận diện giọng nói");
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.info("Đang ghi âm... Nhấn lần nữa để dừng");
    } catch (error) {
      console.error("Recording error:", error);
      toast.error("Không thể truy cập microphone");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleCopy = () => {
    if (result?.translation) {
      navigator.clipboard.writeText(result.translation);
      setCopied(true);
      toast.success("Đã sao chép!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getFormalityBadge = (level: string) => {
    switch (level) {
      case "formal":
        return { label: "Trang trọng", color: "bg-korean-blue/20 text-korean-blue" };
      case "informal":
        return { label: "Thân mật", color: "bg-korean-pink/20 text-korean-pink" };
      default:
        return { label: "Trung tính", color: "bg-korean-teal/20 text-korean-teal" };
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CleanHeader />
      
      <main className="flex-1 pb-24">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-12 lg:py-16">
          {/* Background decorations */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="blob-primary w-96 h-96 -top-48 -left-48 opacity-20" />
            <div className="blob-secondary w-80 h-80 -bottom-40 -right-40 opacity-15" />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
                <Languages className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">AI Translator</span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold mb-3">
                Dịch <span className="text-gradient-primary">Hàn-Việt</span> Thông Minh
              </h1>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Dịch chính xác với phân tích ngữ pháp TOPIK, phát âm chuẩn, và luyện nói trực tiếp
              </p>
            </motion.div>

            {/* Main Translator Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="max-w-5xl mx-auto"
            >
              <Card className="premium-card p-0 overflow-hidden">
                <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
                  {/* Source Panel */}
                  <div className="p-6">
                    {/* Language Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{sourceLang === "ko" ? "🇰🇷" : "🇻🇳"}</span>
                        <span className="font-semibold">
                          {sourceLang === "ko" ? "Tiếng Hàn" : "Tiếng Việt"}
                        </span>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={isRecording ? handleStopRecording : handleStartRecording}
                        className={isRecording ? "text-destructive animate-pulse" : ""}
                      >
                        {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                      </Button>
                    </div>

                    {/* Source Input */}
                    <div className="relative">
                      <Textarea
                        value={sourceText}
                        onChange={(e) => setSourceText(e.target.value)}
                        placeholder={sourceLang === "ko" ? "한국어를 입력하세요..." : "Nhập tiếng Việt..."}
                        className="min-h-[200px] resize-none text-lg border-0 bg-transparent focus-visible:ring-0 p-0"
                      />
                      
                      {/* Character count */}
                      <div className="absolute bottom-0 right-0 text-xs text-muted-foreground">
                        {sourceText.length}/2000
                      </div>
                    </div>

                    {/* Source Actions */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSpeak(sourceText, sourceLang)}
                        disabled={!sourceText.trim() || isSpeaking}
                      >
                        <Volume2 className={`w-4 h-4 mr-2 ${isSpeaking ? "animate-pulse" : ""}`} />
                        Nghe
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSourceText("");
                          setResult(null);
                        }}
                      >
                        Xóa
                      </Button>
                    </div>
                  </div>

                  {/* Swap Button (Mobile) */}
                  <div className="lg:hidden flex justify-center -my-5 relative z-10">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleSwapLanguages}
                      className="rounded-full bg-background shadow-lg border-2"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Target Panel */}
                  <div className="p-6 bg-muted/30">
                    {/* Language Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{targetLang === "ko" ? "🇰🇷" : "🇻🇳"}</span>
                        <span className="font-semibold">
                          {targetLang === "ko" ? "Tiếng Hàn" : "Tiếng Việt"}
                        </span>
                      </div>
                      
                      {/* Swap Button (Desktop) */}
                      <div className="hidden lg:block">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleSwapLanguages}
                        >
                          <ArrowRightLeft className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>

                    {/* Translation Result */}
                    <div className="min-h-[200px]">
                      <AnimatePresence mode="wait">
                        {isTranslating ? (
                          <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center justify-center h-[200px]"
                          >
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                          </motion.div>
                        ) : result ? (
                          <motion.div
                            key="result"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                          >
                            <p className="text-lg leading-relaxed">{result.translation}</p>
                            
                            {/* Pronunciation & Romanization */}
                            {(result.pronunciation || result.romanization) && (
                              <div className="mt-3 space-y-1">
                                {result.pronunciation && (
                                  <p className="text-sm text-muted-foreground">
                                    <span className="font-medium">발음:</span> {result.pronunciation}
                                  </p>
                                )}
                                {result.romanization && (
                                  <p className="text-sm text-muted-foreground">
                                    <span className="font-medium">Romanization:</span> {result.romanization}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Formality & Context */}
                            <div className="flex flex-wrap gap-2 mt-4">
                              {result.formality_level && (
                                <Badge className={getFormalityBadge(result.formality_level).color}>
                                  {getFormalityBadge(result.formality_level).label}
                                </Badge>
                              )}
                              {result.usage_context && (
                                <Badge variant="outline" className="text-xs">
                                  {result.usage_context}
                                </Badge>
                              )}
                            </div>

                            {/* Alternative Translations */}
                            {result.alternative_translations?.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-border/50">
                                <p className="text-xs text-muted-foreground mb-2">Cách dịch khác:</p>
                                <div className="flex flex-wrap gap-2">
                                  {result.alternative_translations.map((alt, i) => (
                                    <Badge key={i} variant="secondary" className="font-normal">
                                      {alt}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        ) : (
                          <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="h-[200px] flex items-center justify-center text-muted-foreground"
                          >
                            <p>Bản dịch sẽ xuất hiện ở đây</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Target Actions */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => result && handleSpeak(result.translation, targetLang as "ko" | "vi")}
                        disabled={!result || isSpeaking}
                      >
                        <Volume2 className={`w-4 h-4 mr-2 ${isSpeaking ? "animate-pulse" : ""}`} />
                        Nghe
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopy}
                        disabled={!result}
                      >
                        {copied ? (
                          <Check className="w-4 h-4 mr-2 text-korean-green" />
                        ) : (
                          <Copy className="w-4 h-4 mr-2" />
                        )}
                        {copied ? "Đã sao chép" : "Sao chép"}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Translate Button */}
                <div className="p-6 border-t border-border bg-muted/20">
                  <Button
                    onClick={handleTranslate}
                    disabled={!sourceText.trim() || isTranslating}
                    className="w-full btn-primary text-white py-6 text-lg font-semibold"
                  >
                    {isTranslating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Đang dịch...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Dịch với AI
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            </motion.div>

            {/* Learning Sections */}
            {result && (result.grammar_notes?.length > 0 || result.vocabulary?.length > 0) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="max-w-5xl mx-auto mt-6 space-y-4"
              >
                {/* Grammar Notes */}
                {result.grammar_notes?.length > 0 && (
                  <Card className="overflow-hidden">
                    <button
                      onClick={() => setShowGrammar(!showGrammar)}
                      className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-korean-purple/20 flex items-center justify-center">
                          <GraduationCap className="w-5 h-5 text-korean-purple" />
                        </div>
                        <div className="text-left">
                          <h3 className="font-semibold">Ngữ pháp TOPIK</h3>
                          <p className="text-sm text-muted-foreground">
                            {result.grammar_notes.length} cấu trúc được phân tích
                          </p>
                        </div>
                      </div>
                      <ChevronDown className={`w-5 h-5 transition-transform ${showGrammar ? "rotate-180" : ""}`} />
                    </button>
                    
                    <AnimatePresence>
                      {showGrammar && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 pt-0 space-y-3">
                            {result.grammar_notes.map((note, i) => (
                              <div key={i} className="p-4 rounded-xl bg-muted/50 border border-border/50">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className="bg-korean-purple/20 text-korean-purple">
                                    {note.level}
                                  </Badge>
                                  <span className="font-medium text-primary">{note.pattern}</span>
                                </div>
                                <p className="text-sm text-muted-foreground">{note.explanation}</p>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                )}

                {/* Vocabulary */}
                {result.vocabulary?.length > 0 && (
                  <Card className="overflow-hidden">
                    <button
                      onClick={() => setShowVocab(!showVocab)}
                      className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-korean-teal/20 flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-korean-teal" />
                        </div>
                        <div className="text-left">
                          <h3 className="font-semibold">Từ vựng quan trọng</h3>
                          <p className="text-sm text-muted-foreground">
                            {result.vocabulary.length} từ cần ghi nhớ
                          </p>
                        </div>
                      </div>
                      <ChevronDown className={`w-5 h-5 transition-transform ${showVocab ? "rotate-180" : ""}`} />
                    </button>
                    
                    <AnimatePresence>
                      {showVocab && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 pt-0 grid gap-3 sm:grid-cols-2">
                            {result.vocabulary.map((vocab, i) => (
                              <div key={i} className="p-4 rounded-xl bg-muted/50 border border-border/50">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-semibold text-primary">{vocab.word}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleSpeak(vocab.word, "ko")}
                                  >
                                    <Volume2 className="w-4 h-4" />
                                  </Button>
                                </div>
                                <p className="text-sm">{vocab.meaning}</p>
                                {vocab.example && (
                                  <p className="text-xs text-muted-foreground mt-1 italic">
                                    예) {vocab.example}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                )}
              </motion.div>
            )}

            {/* Speaking Practice Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="max-w-5xl mx-auto mt-8"
            >
              <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">Luyện nói tiếng Hàn</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Nhấn nút <Mic className="w-4 h-4 inline mx-1" /> để nói tiếng Hàn. 
                      Hệ thống sẽ nhận diện và dịch sang tiếng Việt để bạn kiểm tra độ chính xác.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">
                        <Lightbulb className="w-3 h-3 mr-1" />
                        Mẹo: Nói chậm và rõ ràng
                      </Badge>
                      <Badge variant="outline">
                        Hỗ trợ TOPIK I & II
                      </Badge>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Features */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="max-w-5xl mx-auto mt-8 grid sm:grid-cols-3 gap-4"
            >
              {[
                { icon: Sparkles, title: "AI Gemini 2.5", desc: "Dịch chính xác nhất" },
                { icon: Volume2, title: "TTS Chuẩn", desc: "Phát âm bản ngữ" },
                { icon: GraduationCap, title: "Học TOPIK", desc: "Ngữ pháp & từ vựng" },
              ].map((feature, i) => (
                <Card key={i} className="p-4 text-center">
                  <feature.icon className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <h4 className="font-semibold">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </Card>
              ))}
            </motion.div>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
