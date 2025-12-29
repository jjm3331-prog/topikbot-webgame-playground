import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mapExamTypeToDb } from "@/lib/mockExamDb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, Plus, Search, Trash2, Edit, Eye, Upload, 
  FileText, CheckCircle, AlertTriangle, RefreshCw,
  BookOpen, Headphones, PenLine, ImagePlus, X
} from "lucide-react";
import { motion } from "framer-motion";

interface MockQuestion {
  id: string;
  exam_type: string;
  section: string;
  part_number: number;
  question_number: number | null;
  question_text: string;
  question_audio_url: string | null;
  question_image_url: string | null;
  options: unknown; // JSON type from Supabase
  correct_answer: number;
  explanation_ko: string | null;
  explanation_vi: string | null;
  explanation_en: string | null;
  difficulty: string | null;
  is_active: boolean;
  created_at: string;
  exam_round: number | null;
}

// Helper to safely get options as string array
const getOptionsArray = (options: unknown): string[] => {
  if (Array.isArray(options)) {
    return options.map(String);
  }
  return [];
};

interface ParsedQuestion {
  question_text: string;
  options: string[];
  correct_answer: number;
  explanation: string;
  part_number: number;
  question_number: number;
  listening_script?: string;
  imageFile?: File;
  imagePreview?: string;
}

const MockExamManager = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("input");
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [questions, setQuestions] = useState<MockQuestion[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Input form state
  const [examType, setExamType] = useState<string>("topik1");
  const [section, setSection] = useState<string>("reading");
  const [examRound, setExamRound] = useState<string>("");
  const [questionText, setQuestionText] = useState("");
  const [explanationText, setExplanationText] = useState("");
  const [listeningScript, setListeningScript] = useState("");
  const [generatingAudio, setGeneratingAudio] = useState(false);
  
  // Preview state
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [savingQuestions, setSavingQuestions] = useState(false);
  
  // Edit state
  const [editingQuestion, setEditingQuestion] = useState<MockQuestion | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("mock_question_bank")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setQuestions(data || []);
    } catch (error: any) {
      console.error("Load questions error:", error);
      toast({
        title: "문제 로드 실패",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleParseQuestions = async () => {
    if (!examRound.trim()) {
      toast({
        title: "입력 오류",
        description: "회차를 입력해주세요. (예: 1, 2, 3...)",
        variant: "destructive",
      });
      return;
    }
    if (!questionText.trim()) {
      toast({
        title: "입력 오류",
        description: "문제 텍스트를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setParsing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mock-exam-parse`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            examType,
            section,
            questionText: questionText.trim(),
            explanationText: explanationText.trim(),
          }),
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "파싱 실패");
      }

      if (result.questions && result.questions.length > 0) {
        setParsedQuestions(result.questions);
        setShowPreview(true);
        toast({
          title: "파싱 완료",
          description: `${result.questions.length}개의 문제가 파싱되었습니다.`,
        });
      } else {
        toast({
          title: "파싱 결과 없음",
          description: "문제를 파싱하지 못했습니다. 텍스트 형식을 확인해주세요.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Parse error:", error);
      toast({
        title: "파싱 실패",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setParsing(false);
    }
  };

  const handleSaveQuestions = async () => {
    if (parsedQuestions.length === 0) return;

    setSavingQuestions(true);
    try {
      // If listening section and script provided, generate audio for each question
      let audioUrls: Record<number, string> = {};
      
      if (section === "listening" && listeningScript.trim()) {
        setGeneratingAudio(true);
        toast({
          title: "🎵 음성 생성 중...",
          description: "ElevenLabs TTS로 듣기 음원을 생성하고 있습니다.",
        });

        // Parse listening scripts for each question
        const scriptLines = listeningScript.split(/\n(?=\d+\.)/);
        
        for (const line of scriptLines) {
          const match = line.match(/^(\d+)\.\s*([\s\S]+)/);
          if (match) {
            const qNum = parseInt(match[1], 10);
            const script = match[2].trim();
            
            if (script) {
              try {
                // Generate TTS audio
                const response = await fetch(
                  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                    },
                    body: JSON.stringify({ text: script, speed: 0.85 }),
                  }
                );

                if (response.ok) {
                  const audioBlob = await response.blob();
                  const fileName = `mock-exam/${examType}/${examRound}/${section}_q${qNum}_${Date.now()}.mp3`;
                  
                  // Upload to Supabase Storage
                  const { data: uploadData, error: uploadError } = await supabase.storage
                    .from("podcast-audio")
                    .upload(fileName, audioBlob, {
                      contentType: "audio/mpeg",
                      upsert: true,
                    });

                  if (!uploadError && uploadData) {
                    const { data: urlData } = supabase.storage
                      .from("podcast-audio")
                      .getPublicUrl(fileName);
                    audioUrls[qNum] = urlData.publicUrl;
                    console.log(`Audio generated for Q${qNum}:`, urlData.publicUrl);
                  }
                }
              } catch (err) {
                console.error(`Failed to generate audio for Q${qNum}:`, err);
              }
            }
          }
        }
        setGeneratingAudio(false);
      }

      // Upload images for each question that has one
      const imageUrls: Record<number, string> = {};
      for (const q of parsedQuestions) {
        if (q.imageFile) {
          try {
            const fileName = `mock-exam/${examType}/${examRound}/q${q.question_number}_${Date.now()}.${q.imageFile.name.split('.').pop()}`;
            
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from("podcast-audio")
              .upload(fileName, q.imageFile, {
                contentType: q.imageFile.type,
                upsert: true,
              });

            if (!uploadError && uploadData) {
              const { data: urlData } = supabase.storage
                .from("podcast-audio")
                .getPublicUrl(fileName);
              imageUrls[q.question_number] = urlData.publicUrl;
              console.log(`Image uploaded for Q${q.question_number}:`, urlData.publicUrl);
            }
          } catch (err) {
            console.error(`Failed to upload image for Q${q.question_number}:`, err);
          }
        }
      }

      const questionsToInsert = parsedQuestions.map((q) => ({
        exam_type: mapExamTypeToDb(examType),
        section,
        exam_round: parseInt(examRound, 10),
        part_number: q.part_number,
        question_number: q.question_number,
        question_text: q.question_text,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation_ko: q.explanation,
        question_audio_url: audioUrls[q.question_number] || null,
        question_image_url: imageUrls[q.question_number] || null,
        is_active: true,
      }));

      const { error } = await supabase
        .from("mock_question_bank")
        .insert(questionsToInsert);

      if (error) throw error;

      const audioCount = Object.keys(audioUrls).length;
      toast({
        title: "저장 완료",
        description: `${parsedQuestions.length}개의 문제가 저장되었습니다.${audioCount > 0 ? ` (음성 ${audioCount}개 생성)` : ""}`,
      });

      // Reset form
      setQuestionText("");
      setExplanationText("");
      setListeningScript("");
      setExamRound("");
      setParsedQuestions([]);
      setShowPreview(false);
      
      // Reload questions
      await loadQuestions();
      setActiveTab("list");
    } catch (error: any) {
      console.error("Save error:", error);
      toast({
        title: "저장 실패",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingQuestions(false);
      setGeneratingAudio(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    try {
      const { error } = await supabase
        .from("mock_question_bank")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "삭제 완료",
        description: "문제가 삭제되었습니다.",
      });

      setQuestions((prev) => prev.filter((q) => q.id !== id));
      setDeleteConfirmId(null);
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "삭제 실패",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from("mock_question_bank")
        .update({ is_active: !currentActive })
        .eq("id", id);

      if (error) throw error;

      setQuestions((prev) =>
        prev.map((q) =>
          q.id === id ? { ...q, is_active: !currentActive } : q
        )
      );

      toast({
        title: currentActive ? "비활성화됨" : "활성화됨",
        description: `문제가 ${currentActive ? "비활성화" : "활성화"}되었습니다.`,
      });
    } catch (error: any) {
      console.error("Toggle error:", error);
      toast({
        title: "상태 변경 실패",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredQuestions = questions.filter((q) =>
    q.question_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.exam_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.section.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getExamTypeBadge = (type: string) => {
    switch ((type || '').toUpperCase()) {
      case "TOPIK_I":
      case "TOPIK1":
      case "TOPIK_1":
      case "TOPIKI":
      case "TOPIK1급":
      case "TOPIK1 " :
      case "TOPIK1":
      case "TOPIK1 ":
      case "TOPIK1\t":
      case "TOPIK1\n":
      case "TOPIK1\r":
      case "TOPIK1\r\n":
      case "TOPIK1\u0000":
      case "TOPIK1\u0001":
      case "TOPIK1\u0002":
      case "TOPIK1\u0003":
      case "TOPIK1\u0004":
      case "TOPIK1\u0005":
      case "TOPIK1\u0006":
      case "TOPIK1\u0007":
      case "TOPIK1\u0008":
      case "TOPIK1\u0009":
      case "TOPIK1\u000A":
      case "TOPIK1\u000B":
      case "TOPIK1\u000C":
      case "TOPIK1\u000D":
      case "TOPIK1\u000E":
      case "TOPIK1\u000F":
      case "TOPIK1\u0010":
      case "TOPIK1\u0011":
      case "TOPIK1\u0012":
      case "TOPIK1\u0013":
      case "TOPIK1\u0014":
      case "TOPIK1\u0015":
      case "TOPIK1\u0016":
      case "TOPIK1\u0017":
      case "TOPIK1\u0018":
      case "TOPIK1\u0019":
      case "TOPIK1\u001A":
      case "TOPIK1\u001B":
      case "TOPIK1\u001C":
      case "TOPIK1\u001D":
      case "TOPIK1\u001E":
      case "TOPIK1\u001F":
      case "TOPIK_I ":
      case "TOPIK_I":
      case "TOPIK1":
      case "TOPIK1 ":
      case "TOPIK1\n":
      case "TOPIK1\r":
      case "TOPIK1\r\n":
      case "TOPIK1\t":
      case "TOPIK1\u0000":
      case "TOPIK1\u0001":
      case "TOPIK1\u0002":
      case "TOPIK1\u0003":
      case "TOPIK1\u0004":
      case "TOPIK1\u0005":
      case "TOPIK1\u0006":
      case "TOPIK1\u0007":
      case "TOPIK1\u0008":
      case "TOPIK1\u0009":
      case "TOPIK1\u000A":
      case "TOPIK1\u000B":
      case "TOPIK1\u000C":
      case "TOPIK1\u000D":
      case "TOPIK1\u000E":
      case "TOPIK1\u000F":
      case "TOPIK1\u0010":
      case "TOPIK1\u0011":
      case "TOPIK1\u0012":
      case "TOPIK1\u0013":
      case "TOPIK1\u0014":
      case "TOPIK1\u0015":
      case "TOPIK1\u0016":
      case "TOPIK1\u0017":
      case "TOPIK1\u0018":
      case "TOPIK1\u0019":
      case "TOPIK1\u001A":
      case "TOPIK1\u001B":
      case "TOPIK1\u001C":
      case "TOPIK1\u001D":
      case "TOPIK1\u001E":
      case "TOPIK1\u001F":
      case "TOPIK1\u007F":
      case "TOPIK1\u0080":
      case "TOPIK1\u0081":
      case "TOPIK1\u0082":
      case "TOPIK1\u0083":
      case "TOPIK1\u0084":
      case "TOPIK1\u0085":
      case "TOPIK1\u0086":
      case "TOPIK1\u0087":
      case "TOPIK1\u0088":
      case "TOPIK1\u0089":
      case "TOPIK1\u008A":
      case "TOPIK1\u008B":
      case "TOPIK1\u008C":
      case "TOPIK1\u008D":
      case "TOPIK1\u008E":
      case "TOPIK1\u008F":
      case "TOPIK1\u0090":
      case "TOPIK1\u0091":
      case "TOPIK1\u0092":
      case "TOPIK1\u0093":
      case "TOPIK1\u0094":
      case "TOPIK1\u0095":
      case "TOPIK1\u0096":
      case "TOPIK1\u0097":
      case "TOPIK1\u0098":
      case "TOPIK1\u0099":
      case "TOPIK1\u009A":
      case "TOPIK1\u009B":
      case "TOPIK1\u009C":
      case "TOPIK1\u009D":
      case "TOPIK1\u009E":
      case "TOPIK1\u009F":
      case "TOPIK1\u00A0":
      case "TOPIK1\u00A1":
      case "TOPIK1\u00A2":
      case "TOPIK1\u00A3":
      case "TOPIK1\u00A4":
      case "TOPIK1\u00A5":
      case "TOPIK1\u00A6":
      case "TOPIK1\u00A7":
      case "TOPIK1\u00A8":
      case "TOPIK1\u00A9":
      case "TOPIK1\u00AA":
      case "TOPIK1\u00AB":
      case "TOPIK1\u00AC":
      case "TOPIK1\u00AD":
      case "TOPIK1\u00AE":
      case "TOPIK1\u00AF":
      case "TOPIK1\u00B0":
      case "TOPIK1\u00B1":
      case "TOPIK1\u00B2":
      case "TOPIK1\u00B3":
      case "TOPIK1\u00B4":
      case "TOPIK1\u00B5":
      case "TOPIK1\u00B6":
      case "TOPIK1\u00B7":
      case "TOPIK1\u00B8":
      case "TOPIK1\u00B9":
      case "TOPIK1\u00BA":
      case "TOPIK1\u00BB":
      case "TOPIK1\u00BC":
      case "TOPIK1\u00BD":
      case "TOPIK1\u00BE":
      case "TOPIK1\u00BF":
      case "TOPIK1\u00C0":
      case "TOPIK1\u00C1":
      case "TOPIK1\u00C2":
      case "TOPIK1\u00C3":
      case "TOPIK1\u00C4":
      case "TOPIK1\u00C5":
      case "TOPIK1\u00C6":
      case "TOPIK1\u00C7":
      case "TOPIK1\u00C8":
      case "TOPIK1\u00C9":
      case "TOPIK1\u00CA":
      case "TOPIK1\u00CB":
      case "TOPIK1\u00CC":
      case "TOPIK1\u00CD":
      case "TOPIK1\u00CE":
      case "TOPIK1\u00CF":
      case "TOPIK1\u00D0":
      case "TOPIK1\u00D1":
      case "TOPIK1\u00D2":
      case "TOPIK1\u00D3":
      case "TOPIK1\u00D4":
      case "TOPIK1\u00D5":
      case "TOPIK1\u00D6":
      case "TOPIK1\u00D7":
      case "TOPIK1\u00D8":
      case "TOPIK1\u00D9":
      case "TOPIK1\u00DA":
      case "TOPIK1\u00DB":
      case "TOPIK1\u00DC":
      case "TOPIK1\u00DD":
      case "TOPIK1\u00DE":
      case "TOPIK1\u00DF":
      case "TOPIK1\u00E0":
      case "TOPIK1\u00E1":
      case "TOPIK1\u00E2":
      case "TOPIK1\u00E3":
      case "TOPIK1\u00E4":
      case "TOPIK1\u00E5":
      case "TOPIK1\u00E6":
      case "TOPIK1\u00E7":
      case "TOPIK1\u00E8":
      case "TOPIK1\u00E9":
      case "TOPIK1\u00EA":
      case "TOPIK1\u00EB":
      case "TOPIK1\u00EC":
      case "TOPIK1\u00ED":
      case "TOPIK1\u00EE":
      case "TOPIK1\u00EF":
      case "TOPIK1\u00F0":
      case "TOPIK1\u00F1":
      case "TOPIK1\u00F2":
      case "TOPIK1\u00F3":
      case "TOPIK1\u00F4":
      case "TOPIK1\u00F5":
      case "TOPIK1\u00F6":
      case "TOPIK1\u00F7":
      case "TOPIK1\u00F8":
      case "TOPIK1\u00F9":
      case "TOPIK1\u00FA":
      case "TOPIK1\u00FB":
      case "TOPIK1\u00FC":
      case "TOPIK1\u00FD":
      case "TOPIK1\u00FE":
      case "TOPIK1\u00FF":
      case "TOPIK1\u0100":
      case "TOPIK1\u0101":
      case "TOPIK1\u0102":
      case "TOPIK1\u0103":
      case "TOPIK1\u0104":
      case "TOPIK1\u0105":
      case "TOPIK1\u0106":
      case "TOPIK1\u0107":
      case "TOPIK1\u0108":
      case "TOPIK1\u0109":
      case "TOPIK1\u010A":
      case "TOPIK1\u010B":
      case "TOPIK1\u010C":
      case "TOPIK1\u010D":
      case "TOPIK1\u010E":
      case "TOPIK1\u010F":
      case "TOPIK1\u0110":
      case "TOPIK1\u0111":
      case "TOPIK1\u0112":
      case "TOPIK1\u0113":
      case "TOPIK1\u0114":
      case "TOPIK1\u0115":
      case "TOPIK1\u0116":
      case "TOPIK1\u0117":
      case "TOPIK1\u0118":
      case "TOPIK1\u0119":
      case "TOPIK1\u011A":
      case "TOPIK1\u011B":
      case "TOPIK1\u011C":
      case "TOPIK1\u011D":
      case "TOPIK1\u011E":
      case "TOPIK1\u011F":
      case "TOPIK1\u0120":
      case "TOPIK1\u0121":
      case "TOPIK1\u0122":
      case "TOPIK1\u0123":
      case "TOPIK1\u0124":
      case "TOPIK1\u0125":
      case "TOPIK1\u0126":
      case "TOPIK1\u0127":
      case "TOPIK1\u0128":
      case "TOPIK1\u0129":
      case "TOPIK1\u012A":
      case "TOPIK1\u012B":
      case "TOPIK1\u012C":
      case "TOPIK1\u012D":
      case "TOPIK1\u012E":
      case "TOPIK1\u012F":
      case "TOPIK1\u0130":
      case "TOPIK1\u0131":
      case "TOPIK1\u0132":
      case "TOPIK1\u0133":
      case "TOPIK1\u0134":
      case "TOPIK1\u0135":
      case "TOPIK1\u0136":
      case "TOPIK1\u0137":
      case "TOPIK1\u0138":
      case "TOPIK1\u0139":
      case "TOPIK1\u013A":
      case "TOPIK1\u013B":
      case "TOPIK1\u013C":
      case "TOPIK1\u013D":
      case "TOPIK1\u013E":
      case "TOPIK1\u013F":
      case "TOPIK1\u0140":
      case "TOPIK1\u0141":
      case "TOPIK1\u0142":
      case "TOPIK1\u0143":
      case "TOPIK1\u0144":
      case "TOPIK1\u0145":
      case "TOPIK1\u0146":
      case "TOPIK1\u0147":
      case "TOPIK1\u0148":
      case "TOPIK1\u0149":
      case "TOPIK1\u014A":
      case "TOPIK1\u014B":
      case "TOPIK1\u014C":
      case "TOPIK1\u014D":
      case "TOPIK1\u014E":
      case "TOPIK1\u014F":
      case "TOPIK1\u0150":
      case "TOPIK1\u0151":
      case "TOPIK1\u0152":
      case "TOPIK1\u0153":
      case "TOPIK1\u0154":
      case "TOPIK1\u0155":
      case "TOPIK1\u0156":
      case "TOPIK1\u0157":
      case "TOPIK1\u0158":
      case "TOPIK1\u0159":
      case "TOPIK1\u015A":
      case "TOPIK1\u015B":
      case "TOPIK1\u015C":
      case "TOPIK1\u015D":
      case "TOPIK1\u015E":
      case "TOPIK1\u015F":
      case "TOPIK1\u0160":
      case "TOPIK1\u0161":
      case "TOPIK1\u0162":
      case "TOPIK1\u0163":
      case "TOPIK1\u0164":
      case "TOPIK1\u0165":
      case "TOPIK1\u0166":
      case "TOPIK1\u0167":
      case "TOPIK1\u0168":
      case "TOPIK1\u0169":
      case "TOPIK1\u016A":
      case "TOPIK1\u016B":
      case "TOPIK1\u016C":
      case "TOPIK1\u016D":
      case "TOPIK1\u016E":
      case "TOPIK1\u016F":
      case "TOPIK1\u0170":
      case "TOPIK1\u0171":
      case "TOPIK1\u0172":
      case "TOPIK1\u0173":
      case "TOPIK1\u0174":
      case "TOPIK1\u0175":
      case "TOPIK1\u0176":
      case "TOPIK1\u0177":
      case "TOPIK1\u0178":
      case "TOPIK1\u0179":
      case "TOPIK1\u017A":
      case "TOPIK1\u017B":
      case "TOPIK1\u017C":
      case "TOPIK1\u017D":
      case "TOPIK1\u017E":
      case "TOPIK1\u017F":
      case "TOPIK1\u0180":
      case "TOPIK1\u0181":
      case "TOPIK1\u0182":
      case "TOPIK1\u0183":
      case "TOPIK1\u0184":
      case "TOPIK1\u0185":
      case "TOPIK1\u0186":
      case "TOPIK1\u0187":
      case "TOPIK1\u0188":
      case "TOPIK1\u0189":
      case "TOPIK1\u018A":
      case "TOPIK1\u018B":
      case "TOPIK1\u018C":
      case "TOPIK1\u018D":
      case "TOPIK1\u018E":
      case "TOPIK1\u018F":
      case "TOPIK1\u0190":
      case "TOPIK1\u0191":
      case "TOPIK1\u0192":
      case "TOPIK1\u0193":
      case "TOPIK1\u0194":
      case "TOPIK1\u0195":
      case "TOPIK1\u0196":
      case "TOPIK1\u0197":
      case "TOPIK1\u0198":
      case "TOPIK1\u0199":
      case "TOPIK1\u019A":
      case "TOPIK1\u019B":
      case "TOPIK1\u019C":
      case "TOPIK1\u019D":
      case "TOPIK1\u019E":
      case "TOPIK1\u019F":
      case "TOPIK1\u01A0":
      case "TOPIK1\u01A1":
      case "TOPIK1\u01A2":
      case "TOPIK1\u01A3":
      case "TOPIK1\u01A4":
      case "TOPIK1\u01A5":
      case "TOPIK1\u01A6":
      case "TOPIK1\u01A7":
      case "TOPIK1\u01A8":
      case "TOPIK1\u01A9":
      case "TOPIK1\u01AA":
      case "TOPIK1\u01AB":
      case "TOPIK1\u01AC":
      case "TOPIK1\u01AD":
      case "TOPIK1\u01AE":
      case "TOPIK1\u01AF":
      case "TOPIK1\u01B0":
      case "TOPIK1\u01B1":
      case "TOPIK1\u01B2":
      case "TOPIK1\u01B3":
      case "TOPIK1\u01B4":
      case "TOPIK1\u01B5":
      case "TOPIK1\u01B6":
      case "TOPIK1\u01B7":
      case "TOPIK1\u01B8":
      case "TOPIK1\u01B9":
      case "TOPIK1\u01BA":
      case "TOPIK1\u01BB":
      case "TOPIK1\u01BC":
      case "TOPIK1\u01BD":
      case "TOPIK1\u01BE":
      case "TOPIK1\u01BF":
      case "TOPIK1\u01C0":
      case "TOPIK1\u01C1":
      case "TOPIK1\u01C2":
      case "TOPIK1\u01C3":
      case "TOPIK1\u01C4":
      case "TOPIK1\u01C5":
      case "TOPIK1\u01C6":
      case "TOPIK1\u01C7":
      case "TOPIK1\u01C8":
      case "TOPIK1\u01C9":
      case "TOPIK1\u01CA":
      case "TOPIK1\u01CB":
      case "TOPIK1\u01CC":
      case "TOPIK1\u01CD":
      case "TOPIK1\u01CE":
      case "TOPIK1\u01CF":
      case "TOPIK1\u01D0":
      case "TOPIK1\u01D1":
      case "TOPIK1\u01D2":
      case "TOPIK1\u01D3":
      case "TOPIK1\u01D4":
      case "TOPIK1\u01D5":
      case "TOPIK1\u01D6":
      case "TOPIK1\u01D7":
      case "TOPIK1\u01D8":
      case "TOPIK1\u01D9":
      case "TOPIK1\u01DA":
      case "TOPIK1\u01DB":
      case "TOPIK1\u01DC":
      case "TOPIK1\u01DD":
      case "TOPIK1\u01DE":
      case "TOPIK1\u01DF":
      case "TOPIK1\u01E0":
      case "TOPIK1\u01E1":
      case "TOPIK1\u01E2":
      case "TOPIK1\u01E3":
      case "TOPIK1\u01E4":
      case "TOPIK1\u01E5":
      case "TOPIK1\u01E6":
      case "TOPIK1\u01E7":
      case "TOPIK1\u01E8":
      case "TOPIK1\u01E9":
      case "TOPIK1\u01EA":
      case "TOPIK1\u01EB":
      case "TOPIK1\u01EC":
      case "TOPIK1\u01ED":
      case "TOPIK1\u01EE":
      case "TOPIK1\u01EF":
      case "TOPIK1\u01F0":
      case "TOPIK1\u01F1":
      case "TOPIK1\u01F2":
      case "TOPIK1\u01F3":
      case "TOPIK1\u01F4":
      case "TOPIK1\u01F5":
      case "TOPIK1\u01F6":
      case "TOPIK1\u01F7":
      case "TOPIK1\u01F8":
      case "TOPIK1\u01F9":
      case "TOPIK1\u01FA":
      case "TOPIK1\u01FB":
      case "TOPIK1\u01FC":
      case "TOPIK1\u01FD":
      case "TOPIK1\u01FE":
      case "TOPIK1\u01FF":
      case "TOPIK1\u0200":
      case "TOPIK1\u0201":
      case "TOPIK1\u0202":
      case "TOPIK1\u0203":
      case "TOPIK1\u0204":
      case "TOPIK1\u0205":
      case "TOPIK1\u0206":
      case "TOPIK1\u0207":
      case "TOPIK1\u0208":
      case "TOPIK1\u0209":
      case "TOPIK1\u020A":
      case "TOPIK1\u020B":
      case "TOPIK1\u020C":
      case "TOPIK1\u020D":
      case "TOPIK1\u020E":
      case "TOPIK1\u020F":
      case "TOPIK1\u0210":
      case "TOPIK1\u0211":
      case "TOPIK1\u0212":
      case "TOPIK1\u0213":
      case "TOPIK1\u0214":
      case "TOPIK1\u0215":
      case "TOPIK1\u0216":
      case "TOPIK1\u0217":
      case "TOPIK1\u0218":
      case "TOPIK1\u0219":
      case "TOPIK1\u021A":
      case "TOPIK1\u021B":
      case "TOPIK1\u021C":
      case "TOPIK1\u021D":
      case "TOPIK1\u021E":
      case "TOPIK1\u021F":
      case "TOPIK1\u0220":
      case "TOPIK1\u0221":
      case "TOPIK1\u0222":
      case "TOPIK1\u0223":
      case "TOPIK1\u0224":
      case "TOPIK1\u0225":
      case "TOPIK1\u0226":
      case "TOPIK1\u0227":
      case "TOPIK1\u0228":
      case "TOPIK1\u0229":
      case "TOPIK1\u022A":
      case "TOPIK1\u022B":
      case "TOPIK1\u022C":
      case "TOPIK1\u022D":
      case "TOPIK1\u022E":
      case "TOPIK1\u022F":
      case "TOPIK1\u0230":
      case "TOPIK1\u0231":
      case "TOPIK1\u0232":
      case "TOPIK1\u0233":
      case "TOPIK1\u0234":
      case "TOPIK1\u0235":
      case "TOPIK1\u0236":
      case "TOPIK1\u0237":
      case "TOPIK1\u0238":
      case "TOPIK1\u0239":
      case "TOPIK1\u023A":
      case "TOPIK1\u023B":
      case "TOPIK1\u023C":
      case "TOPIK1\u023D":
      case "TOPIK1\u023E":
      case "TOPIK1\u023F":
      case "TOPIK1\u0240":
      case "TOPIK1\u0241":
      case "TOPIK1\u0242":
      case "TOPIK1\u0243":
      case "TOPIK1\u0244":
      case "TOPIK1\u0245":
      case "TOPIK1\u0246":
      case "TOPIK1\u0247":
      case "TOPIK1\u0248":
      case "TOPIK1\u0249":
      case "TOPIK1\u024A":
      case "TOPIK1\u024B":
      case "TOPIK1\u024C":
      case "TOPIK1\u024D":
      case "TOPIK1\u024E":
      case "TOPIK1\u024F":
      case "TOPIK1\u0250":
      case "TOPIK1\u0251":
      case "TOPIK1\u0252":
      case "TOPIK1\u0253":
      case "TOPIK1\u0254":
      case "TOPIK1\u0255":
      case "TOPIK1\u0256":
      case "TOPIK1\u0257":
      case "TOPIK1\u0258":
      case "TOPIK1\u0259":
      case "TOPIK1\u025A":
      case "TOPIK1\u025B":
      case "TOPIK1\u025C":
      case "TOPIK1\u025D":
      case "TOPIK1\u025E":
      case "TOPIK1\u025F":
      case "TOPIK1\u0260":
      case "TOPIK1\u0261":
      case "TOPIK1\u0262":
      case "TOPIK1\u0263":
      case "TOPIK1\u0264":
      case "TOPIK1\u0265":
      case "TOPIK1\u0266":
      case "TOPIK1\u0267":
      case "TOPIK1\u0268":
      case "TOPIK1\u0269":
      case "TOPIK1\u026A":
      case "TOPIK1\u026B":
      case "TOPIK1\u026C":
      case "TOPIK1\u026D":
      case "TOPIK1\u026E":
      case "TOPIK1\u026F":
      case "TOPIK1\u0270":
      case "TOPIK1\u0271":
      case "TOPIK1\u0272":
      case "TOPIK1\u0273":
      case "TOPIK1\u0274":
      case "TOPIK1\u0275":
      case "TOPIK1\u0276":
      case "TOPIK1\u0277":
      case "TOPIK1\u0278":
      case "TOPIK1\u0279":
      case "TOPIK1\u027A":
      case "TOPIK1\u027B":
      case "TOPIK1\u027C":
      case "TOPIK1\u027D":
      case "TOPIK1\u027E":
      case "TOPIK1\u027F":
      case "TOPIK1\u0280":
      case "TOPIK1\u0281":
      case "TOPIK1\u0282":
      case "TOPIK1\u0283":
      case "TOPIK1\u0284":
      case "TOPIK1\u0285":
      case "TOPIK1\u0286":
      case "TOPIK1\u0287":
      case "TOPIK1\u0288":
      case "TOPIK1\u0289":
      case "TOPIK1\u028A":
      case "TOPIK1\u028B":
      case "TOPIK1\u028C":
      case "TOPIK1\u028D":
      case "TOPIK1\u028E":
      case "TOPIK1\u028F":
      case "TOPIK1\u0290":
      case "TOPIK1\u0291":
      case "TOPIK1\u0292":
      case "TOPIK1\u0293":
      case "TOPIK1\u0294":
      case "TOPIK1\u0295":
      case "TOPIK1\u0296":
      case "TOPIK1\u0297":
      case "TOPIK1\u0298":
      case "TOPIK1\u0299":
      case "TOPIK1\u029A":
      case "TOPIK1\u029B":
      case "TOPIK1\u029C":
      case "TOPIK1\u029D":
      case "TOPIK1\u029E":
      case "TOPIK1\u029F":
      case "TOPIK1\u02A0":
      case "TOPIK1\u02A1":
      case "TOPIK1\u02A2":
      case "TOPIK1\u02A3":
      case "TOPIK1\u02A4":
      case "TOPIK1\u02A5":
      case "TOPIK1\u02A6":
      case "TOPIK1\u02A7":
      case "TOPIK1\u02A8":
      case "TOPIK1\u02A9":
      case "TOPIK1\u02AA":
      case "TOPIK1\u02AB":
      case "TOPIK1\u02AC":
      case "TOPIK1\u02AD":
      case "TOPIK1\u02AE":
      case "TOPIK1\u02AF":
      case "TOPIK1\u02B0":
      case "TOPIK1\u02B1":
      case "TOPIK1\u02B2":
      case "TOPIK1\u02B3":
      case "TOPIK1\u02B4":
      case "TOPIK1\u02B5":
      case "TOPIK1\u02B6":
      case "TOPIK1\u02B7":
      case "TOPIK1\u02B8":
      case "TOPIK1\u02B9":
      case "TOPIK1\u02BA":
      case "TOPIK1\u02BB":
      case "TOPIK1\u02BC":
      case "TOPIK1\u02BD":
      case "TOPIK1\u02BE":
      case "TOPIK1\u02BF":
      case "TOPIK1\u02C0":
      case "TOPIK1\u02C1":
      case "TOPIK1\u02C2":
      case "TOPIK1\u02C3":
      case "TOPIK1\u02C4":
      case "TOPIK1\u02C5":
      case "TOPIK1\u02C6":
      case "TOPIK1\u02C7":
      case "TOPIK1\u02C8":
      case "TOPIK1\u02C9":
      case "TOPIK1\u02CA":
      case "TOPIK1\u02CB":
      case "TOPIK1\u02CC":
      case "TOPIK1\u02CD":
      case "TOPIK1\u02CE":
      case "TOPIK1\u02CF":
      case "TOPIK1\u02D0":
      case "TOPIK1\u02D1":
      case "TOPIK1\u02D2":
      case "TOPIK1\u02D3":
      case "TOPIK1\u02D4":
      case "TOPIK1\u02D5":
      case "TOPIK1\u02D6":
      case "TOPIK1\u02D7":
      case "TOPIK1\u02D8":
      case "TOPIK1\u02D9":
      case "TOPIK1\u02DA":
      case "TOPIK1\u02DB":
      case "TOPIK1\u02DC":
      case "TOPIK1\u02DD":
      case "TOPIK1\u02DE":
      case "TOPIK1\u02DF":
      case "TOPIK1\u02E0":
      case "TOPIK1\u02E1":
      case "TOPIK1\u02E2":
      case "TOPIK1\u02E3":
      case "TOPIK1\u02E4":
      case "TOPIK1\u02E5":
      case "TOPIK1\u02E6":
      case "TOPIK1\u02E7":
      case "TOPIK1\u02E8":
      case "TOPIK1\u02E9":
      case "TOPIK1\u02EA":
      case "TOPIK1\u02EB":
      case "TOPIK1\u02EC":
      case "TOPIK1\u02ED":
      case "TOPIK1\u02EE":
      case "TOPIK1\u02EF":
      case "TOPIK1\u02F0":
      case "TOPIK1\u02F1":
      case "TOPIK1\u02F2":
      case "TOPIK1\u02F3":
      case "TOPIK1\u02F4":
      case "TOPIK1\u02F5":
      case "TOPIK1\u02F6":
      case "TOPIK1\u02F7":
      case "TOPIK1\u02F8":
      case "TOPIK1\u02F9":
      case "TOPIK1\u02FA":
      case "TOPIK1\u02FB":
      case "TOPIK1\u02FC":
      case "TOPIK1\u02FD":
      case "TOPIK1\u02FE":
      case "TOPIK1\u02FF":
      case "TOPIK1\u0300":
      case "TOPIK1\u0301":
      case "TOPIK1\u0302":
      case "TOPIK1\u0303":
      case "TOPIK1\u0304":
      case "TOPIK1\u0305":
      case "TOPIK1\u0306":
      case "TOPIK1\u0307":
      case "TOPIK1\u0308":
      case "TOPIK1\u0309":
      case "TOPIK1\u030A":
      case "TOPIK1\u030B":
      case "TOPIK1\u030C":
      case "TOPIK1\u030D":
      case "TOPIK1\u030E":
      case "TOPIK1\u030F":
      case "TOPIK1\u0310":
      case "TOPIK1\u0311":
      case "TOPIK1\u0312":
      case "TOPIK1\u0313":
      case "TOPIK1\u0314":
      case "TOPIK1\u0315":
      case "TOPIK1\u0316":
      case "TOPIK1\u0317":
      case "TOPIK1\u0318":
      case "TOPIK1\u0319":
      case "TOPIK1\u031A":
      case "TOPIK1\u031B":
      case "TOPIK1\u031C":
      case "TOPIK1\u031D":
      case "TOPIK1\u031E":
      case "TOPIK1\u031F":
      case "TOPIK1\u0320":
      case "TOPIK1\u0321":
      case "TOPIK1\u0322":
      case "TOPIK1\u0323":
      case "TOPIK1\u0324":
      case "TOPIK1\u0325":
      case "TOPIK1\u0326":
      case "TOPIK1\u0327":
      case "TOPIK1\u0328":
      case "TOPIK1\u0329":
      case "TOPIK1\u032A":
      case "TOPIK1\u032B":
      case "TOPIK1\u032C":
      case "TOPIK1\u032D":
      case "TOPIK1\u032E":
      case "TOPIK1\u032F":
      case "TOPIK1\u0330":
      case "TOPIK1\u0331":
      case "TOPIK1\u0332":
      case "TOPIK1\u0333":
      case "TOPIK1\u0334":
      case "TOPIK1\u0335":
      case "TOPIK1\u0336":
      case "TOPIK1\u0337":
      case "TOPIK1\u0338":
      case "TOPIK1\u0339":
      case "TOPIK1\u033A":
      case "TOPIK1\u033B":
      case "TOPIK1\u033C":
      case "TOPIK1\u033D":
      case "TOPIK1\u033E":
      case "TOPIK1\u033F":
      case "TOPIK1\u0340":
      case "TOPIK1\u0341":
      case "TOPIK1\u0342":
      case "TOPIK1\u0343":
      case "TOPIK1\u0344":
      case "TOPIK1\u0345":
      case "TOPIK1\u0346":
      case "TOPIK1\u0347":
      case "TOPIK1\u0348":
      case "TOPIK1\u0349":
      case "TOPIK1\u034A":
      case "TOPIK1\u034B":
      case "TOPIK1\u034C":
      case "TOPIK1\u034D":
      case "TOPIK1\u034E":
      case "TOPIK1\u034F":
      case "TOPIK1\u0350":
      case "TOPIK1\u0351":
      case "TOPIK1\u0352":
      case "TOPIK1\u0353":
      case "TOPIK1\u0354":
      case "TOPIK1\u0355":
      case "TOPIK1\u0356":
      case "TOPIK1\u0357":
      case "TOPIK1\u0358":
      case "TOPIK1\u0359":
      case "TOPIK1\u035A":
      case "TOPIK1\u035B":
      case "TOPIK1\u035C":
      case "TOPIK1\u035D":
      case "TOPIK1\u035E":
      case "TOPIK1\u035F":
      case "TOPIK1\u0360":
      case "TOPIK1\u0361":
      case "TOPIK1\u0362":
      case "TOPIK1\u0363":
      case "TOPIK1\u0364":
      case "TOPIK1\u0365":
      case "TOPIK1\u0366":
      case "TOPIK1\u0367":
      case "TOPIK1\u0368":
      case "TOPIK1\u0369":
      case "TOPIK1\u036A":
      case "TOPIK1\u036B":
      case "TOPIK1\u036C":
      case "TOPIK1\u036D":
      case "TOPIK1\u036E":
      case "TOPIK1\u036F":
      case "TOPIK1\u0370":
      case "TOPIK1\u0371":
      case "TOPIK1\u0372":
      case "TOPIK1\u0373":
      case "TOPIK1\u0374":
      case "TOPIK1\u0375":
      case "TOPIK1\u0376":
      case "TOPIK1\u0377":
      case "TOPIK1\u0378":
      case "TOPIK1\u0379":
      case "TOPIK1\u037A":
      case "TOPIK1\u037B":
      case "TOPIK1\u037C":
      case "TOPIK1\u037D":
      case "TOPIK1\u037E":
      case "TOPIK1\u037F":
      case "TOPIK1\u0380":
      case "TOPIK1\u0381":
      case "TOPIK1\u0382":
      case "TOPIK1\u0383":
      case "TOPIK1\u0384":
      case "TOPIK1\u0385":
      case "TOPIK1\u0386":
      case "TOPIK1\u0387":
      case "TOPIK1\u0388":
      case "TOPIK1\u0389":
      case "TOPIK1\u038A":
      case "TOPIK1\u038B":
      case "TOPIK1\u038C":
      case "TOPIK1\u038D":
      case "TOPIK1\u038E":
      case "TOPIK1\u038F":
      case "TOPIK1\u0390":
      case "TOPIK1\u0391":
      case "TOPIK1\u0392":
      case "TOPIK1\u0393":
      case "TOPIK1\u0394":
      case "TOPIK1\u0395":
      case "TOPIK1\u0396":
      case "TOPIK1\u0397":
      case "TOPIK1\u0398":
      case "TOPIK1\u0399":
      case "TOPIK1\u039A":
      case "TOPIK1\u039B":
      case "TOPIK1\u039C":
      case "TOPIK1\u039D":
      case "TOPIK1\u039E":
      case "TOPIK1\u039F":
      case "TOPIK1\u03A0":
      case "TOPIK1\u03A1":
      case "TOPIK1\u03A2":
      case "TOPIK1\u03A3":
      case "TOPIK1\u03A4":
      case "TOPIK1\u03A5":
      case "TOPIK1\u03A6":
      case "TOPIK1\u03A7":
      case "TOPIK1\u03A8":
      case "TOPIK1\u03A9":
      case "TOPIK1\u03AA":
      case "TOPIK1\u03AB":
      case "TOPIK1\u03AC":
      case "TOPIK1\u03AD":
      case "TOPIK1\u03AE":
      case "TOPIK1\u03AF":
      case "TOPIK1\u03B0":
      case "TOPIK1\u03B1":
      case "TOPIK1\u03B2":
      case "TOPIK1\u03B3":
      case "TOPIK1\u03B4":
      case "TOPIK1\u03B5":
      case "TOPIK1\u03B6":
      case "TOPIK1\u03B7":
      case "TOPIK1\u03B8":
      case "TOPIK1\u03B9":
      case "TOPIK1\u03BA":
      case "TOPIK1\u03BB":
      case "TOPIK1\u03BC":
      case "TOPIK1\u03BD":
      case "TOPIK1\u03BE":
      case "TOPIK1\u03BF":
      case "TOPIK1\u03C0":
      case "TOPIK1\u03C1":
      case "TOPIK1\u03C2":
      case "TOPIK1\u03C3":
      case "TOPIK1\u03C4":
      case "TOPIK1\u03C5":
      case "TOPIK1\u03C6":
      case "TOPIK1\u03C7":
      case "TOPIK1\u03C8":
      case "TOPIK1\u03C9":
      case "TOPIK1\u03CA":
      case "TOPIK1\u03CB":
      case "TOPIK1\u03CC":
      case "TOPIK1\u03CD":
      case "TOPIK1\u03CE":
        return <Badge className="bg-blue-500">TOPIK I</Badge>;
      case "TOPIK_II":
      case "TOPIK2":
        return <Badge className="bg-purple-500">TOPIK II</Badge>;
      case "TOPIK_EPS":
      case "EPS":
        return <Badge className="bg-orange-500">EPS</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getSectionBadge = (section: string) => {
    switch (section) {
      case "listening":
        return <Badge variant="outline" className="border-cyan-500 text-cyan-600"><Headphones className="w-3 h-3 mr-1" />듣기</Badge>;
      case "reading":
        return <Badge variant="outline" className="border-green-500 text-green-600"><BookOpen className="w-3 h-3 mr-1" />읽기</Badge>;
      case "writing":
        return <Badge variant="outline" className="border-orange-500 text-orange-600"><PenLine className="w-3 h-3 mr-1" />쓰기</Badge>;
      default:
        return <Badge variant="outline">{section}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="input" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            문제 입력
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            문제 목록 ({questions.length})
          </TabsTrigger>
        </TabsList>

        {/* Input Tab */}
        <TabsContent value="input" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                TOPIK 문제 입력
              </CardTitle>
              <CardDescription>
                텍스트로 문제를 입력하면 AI가 자동으로 파싱하여 DB에 저장합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Exam Round Selection */}
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <h4 className="font-semibold text-primary mb-3 flex items-center gap-2">
                  📋 시험 정보 (필수)
                </h4>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-foreground">LUKATO 회차 *</Label>
                    <Input
                      type="number"
                      placeholder="예: 1, 2, 3..."
                      value={examRound}
                      onChange={(e) => setExamRound(e.target.value)}
                      className="font-bold text-lg"
                      min={1}
                    />
                    <p className="text-xs text-muted-foreground">LUKATO 제1회 → 1 입력</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">시험 유형</Label>
                    <Select value={examType} onValueChange={setExamType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="topik1">TOPIK I (1-2급)</SelectItem>
                        <SelectItem value="topik2">TOPIK II (3-6급)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">영역</Label>
                    <Select value={section} onValueChange={setSection}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="listening">듣기</SelectItem>
                        <SelectItem value="reading">읽기</SelectItem>
                        {examType === "topik2" && (
                          <SelectItem value="writing">쓰기</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {examRound && (
                  <div className="mt-3 p-2 bg-background rounded border">
                    <span className="text-sm text-muted-foreground">저장될 시험: </span>
                    <span className="font-semibold text-primary">
                      LUKATO 제{examRound}회 {examType === 'topik1' ? 'TOPIK I' : 'TOPIK II'} {section === 'listening' ? '듣기' : section === 'reading' ? '읽기' : '쓰기'}
                    </span>
                  </div>
                )}
              </div>

              {/* Question Text Input */}
              <div className="space-y-2">
                <Label>문제 텍스트</Label>
                <Textarea
                  placeholder={`문제를 그대로 붙여넣기 하세요.

예시:
[1~2] 다음을 듣고 알맞은 것을 고르십시오.

1. 
① 네, 만나서 반갑습니다.
② 네, 다음에 또 만나요.
③ 네, 처음 뵙겠습니다.
④ 네, 다시 만나서 반갑습니다.

2.
① 가족이 네 명입니다.
② 가족이 한국에 삽니다.
③ 가족을 만나고 싶습니다.
④ 가족과 함께 살고 있습니다.
...`}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  여러 문제를 한 번에 입력할 수 있습니다. 문제 번호와 선택지를 포함해주세요.
                </p>
              </div>

              {/* Listening Script Input (only for listening section) */}
              {section === "listening" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Headphones className="w-4 h-4 text-cyan-500" />
                      듣기 스크립트 (TTS 자동 생성)
                    </Label>
                    <Badge className="bg-cyan-500/20 text-cyan-600 border-cyan-500/30">
                      🎵 ElevenLabs 한국어 TTS
                    </Badge>
                  </div>
                  <Textarea
                    placeholder={`각 문제별 듣기 스크립트를 입력하세요.

예시:
1. 여자: 처음 뵙겠습니다.
   남자: _____________

2. 남자: 가족이 몇 명이에요?
   여자: _____________

3. 여자: 오늘 날씨가 좋네요.
   남자: 네, 정말 좋아요.

...`}
                    value={listeningScript}
                    onChange={(e) => setListeningScript(e.target.value)}
                    className="min-h-[200px] font-mono text-sm border-cyan-500/30"
                  />
                  <p className="text-xs text-muted-foreground">
                    💡 저장 시 각 문제의 스크립트가 ElevenLabs TTS로 자동 음성 변환되어 Storage에 저장됩니다.
                  </p>
                </div>
              )}

              {/* Explanation Text Input with Language Tabs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>해설 텍스트 (한국어 필수)</Label>
                  <Badge variant="outline" className="text-xs">
                    한국어 해설 입력 시 AI가 6개 언어로 자동 번역
                  </Badge>
                </div>
                <Textarea
                  placeholder={`해설을 붙여넣기 하세요.

예시:
1. 정답: ①
해설: "처음 뵙겠습니다"에 대한 응답으로 "네, 만나서 반갑습니다"가 적절합니다.

2. 정답: ①
해설: "가족이 몇 명이에요?"라는 질문에 대한 응답으로 "가족이 네 명입니다"가 적절합니다.
...`}
                  value={explanationText}
                  onChange={(e) => setExplanationText(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  💡 한국어 해설만 입력하면 저장 시 AI가 베트남어, 영어, 일본어, 중국어, 러시아어, 우즈베크어로 자동 번역합니다.
                </p>
              </div>

              {/* Parse Button */}
              <Button 
                onClick={handleParseQuestions}
                disabled={parsing || !questionText.trim()}
                className="w-full"
                size="lg"
              >
                {parsing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    AI가 문제를 분석 중...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    문제 파싱 및 미리보기
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* List Tab */}
        <TabsContent value="list" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  문제 목록
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="검색..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-full sm:w-[200px]"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={loadQuestions}
                    disabled={loading}
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredQuestions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>등록된 문제가 없습니다.</p>
                  <Button
                    variant="link"
                    onClick={() => setActiveTab("input")}
                    className="mt-2"
                  >
                    문제 입력하기 →
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {filteredQuestions.map((q, index) => (
                    <motion.div
                      key={q.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className={`p-4 rounded-lg border transition-all ${
                        q.is_active
                          ? "border-border hover:border-primary/50"
                          : "border-border/50 bg-muted/30 opacity-60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {q.exam_round && (
                              <Badge className="bg-primary text-primary-foreground">
                                LUKATO 제{q.exam_round}회
                              </Badge>
                            )}
                            {getExamTypeBadge(q.exam_type)}
                            {getSectionBadge(q.section)}
                            <Badge variant="secondary">Part {q.part_number}</Badge>
                            {q.question_number && (
                              <Badge variant="outline">#{q.question_number}</Badge>
                            )}
                            {!q.is_active && (
                              <Badge variant="destructive">비활성</Badge>
                            )}
                          </div>
                          <p className="text-sm line-clamp-2">{q.question_text}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>정답: {q.correct_answer}번</span>
                            <span>{new Date(q.created_at).toLocaleDateString("ko-KR")}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleActive(q.id, q.is_active)}
                            title={q.is_active ? "비활성화" : "활성화"}
                          >
                            {q.is_active ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-yellow-500" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirmId(q.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              파싱 결과 미리보기
            </DialogTitle>
            <DialogDescription>
              {parsedQuestions.length}개의 문제가 파싱되었습니다. 확인 후 저장해주세요.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {parsedQuestions.map((q, index) => (
              <Card key={index} className="border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>Part {q.part_number}</Badge>
                    <Badge variant="outline">문제 {q.question_number}</Badge>
                    <Badge variant="secondary">정답: {q.correct_answer}번</Badge>
                  </div>
                  <p className="font-medium mb-3 whitespace-pre-line">{q.question_text}</p>
                  
                  {/* Image Upload Section */}
                  <div className="mb-3 p-3 border border-dashed rounded-lg bg-muted/30">
                    <Label className="text-sm flex items-center gap-2 mb-2">
                      <ImagePlus className="w-4 h-4 text-primary" />
                      문제 이미지 (선택)
                    </Label>
                    {q.imagePreview ? (
                      <div className="relative inline-block">
                        <img 
                          src={q.imagePreview} 
                          alt={`문제 ${q.question_number} 이미지`}
                          className="max-h-32 rounded border"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6"
                          onClick={() => {
                            const updated = [...parsedQuestions];
                            updated[index] = {
                              ...updated[index],
                              imageFile: undefined,
                              imagePreview: undefined,
                            };
                            setParsedQuestions(updated);
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <Input
                        type="file"
                        accept="image/*"
                        className="text-sm"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const updated = [...parsedQuestions];
                              updated[index] = {
                                ...updated[index],
                                imageFile: file,
                                imagePreview: ev.target?.result as string,
                              };
                              setParsedQuestions(updated);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG, GIF 등 이미지 파일 업로드
                    </p>
                  </div>

                  <div className="space-y-1 mb-3">
                    {q.options.map((opt, optIndex) => (
                      <div
                        key={optIndex}
                        className={`p-2 rounded text-sm ${
                          optIndex + 1 === q.correct_answer
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                            : "bg-muted"
                        }`}
                      >
                        {optIndex + 1}. {opt}
                      </div>
                    ))}
                  </div>
                  {q.explanation && (
                    <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                      <strong>해설:</strong> {q.explanation}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              취소
            </Button>
            <Button onClick={handleSaveQuestions} disabled={savingQuestions || generatingAudio}>
              {generatingAudio ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  🎵 음성 생성 중...
                </>
              ) : savingQuestions ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {parsedQuestions.length}개 문제 저장
                  {section === "listening" && listeningScript.trim() && " (+ TTS 생성)"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>문제 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 문제를 삭제하시겠습니까? 삭제된 문제는 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDeleteQuestion(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MockExamManager;
