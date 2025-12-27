import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Send,
  FileUp,
  X,
  Loader2,
  Eye,
  Edit3,
  Image,
  Music
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import BlockEditor, { Block, blocksToHtml } from "@/components/board/BlockEditor";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type BoardType = "notice" | "free" | "resource" | "anonymous" | "podcast";

const generateId = () => Math.random().toString(36).substr(2, 9);

export default function BoardWrite() {
  const { t } = useTranslation();
  const { boardType } = useParams<{ boardType: string }>();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([
    { id: generateId(), type: 'text', content: '' }
  ]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<string[]>([]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [existingAudioUrl, setExistingAudioUrl] = useState<string | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(!!editId);

  useEffect(() => {
    checkAuth();
    if (editId) {
      fetchPost();
    }
  }, [editId]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: t("boardWrite.pleaseLogin") });
      navigate("/auth");
      return;
    }
    setCurrentUser(user.id);
    
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!roleData);

    if ((boardType === "notice" || boardType === "podcast") && !roleData) {
      toast({ title: boardType === "podcast" ? t("boardWrite.adminOnlyPodcast") : t("boardWrite.adminOnlyNotice") });
      navigate(`/board/${boardType}`);
    }
  };

  const fetchPost = async () => {
    try {
      const { data, error } = await supabase
        .from("board_posts")
        .select("*")
        .eq("id", editId)
        .single();

      if (error) throw error;
      
      setTitle(data.title);
      // Parse existing content into blocks (simple fallback)
      if (data.content) {
        setBlocks([{ id: generateId(), type: 'text', content: data.content.replace(/<[^>]*>/g, '') }]);
      }
      setExistingAttachments(data.attachment_urls || []);
      setExistingAudioUrl((data as any).audio_url || null);
      setIsPinned(data.is_pinned);
    } catch (error) {
      console.error("Error fetching post:", error);
      toast({ title: t("boardWrite.loadError"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const uploadAttachments = async (): Promise<string[]> => {
    const urls: string[] = [...existingAttachments];
    
    for (const file of attachments) {
      const fileName = `${currentUser}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage
        .from("board-attachments")
        .upload(fileName, file);
      
      if (error) {
        console.error("Upload error:", error);
        continue;
      }
      
      const { data: urlData } = supabase.storage
        .from("board-attachments")
        .getPublicUrl(fileName);
      
      urls.push(urlData.publicUrl);
    }
    
    return urls;
  };

  const uploadAudio = async (): Promise<string | null> => {
    if (existingAudioUrl && !audioFile) return existingAudioUrl;
    if (!audioFile) return null;
    
    const fileName = `${currentUser}/${Date.now()}_${audioFile.name}`;
    const { error } = await supabase.storage
      .from("podcast-audio")
      .upload(fileName, audioFile);
    
    if (error) {
      console.error("Audio upload error:", error);
      return null;
    }
    
    const { data: urlData } = supabase.storage
      .from("podcast-audio")
      .getPublicUrl(fileName);
    
    return urlData.publicUrl;
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({ title: t("boardWrite.enterTitle") });
      return;
    }
    
    const hasContent = blocks.some(b => 
      b.type === 'divider' || 
      (b.content && b.content.trim()) || 
      (b.meta?.items && b.meta.items.some(item => item.trim()))
    );
    
    if (!hasContent) {
      toast({ title: t("boardWrite.enterContent") });
      return;
    }
    
    if (!currentUser) {
      toast({ title: t("boardWrite.pleaseLogin") });
      return;
    }

    setSubmitting(true);
    try {
      const attachmentUrls = await uploadAttachments();
      const audioUrl = boardType === "podcast" ? await uploadAudio() : null;
      const isAnonymousBoard = boardType === "anonymous";
      const htmlContent = blocksToHtml(blocks);

      const postData: any = {
        board_type: boardType as BoardType,
        title: title.trim(),
        content: htmlContent,
        author_id: currentUser,
        is_anonymous: isAnonymousBoard,
        youtube_urls: [] as string[],
        attachment_urls: attachmentUrls,
        is_pinned: isAdmin ? isPinned : false
      };

      if (audioUrl) {
        postData.audio_url = audioUrl;
      }

      if (editId) {
        await supabase
          .from("board_posts")
          .update(postData)
          .eq("id", editId);
        toast({ title: t("boardWrite.updateSuccess") });
      } else {
        await supabase
          .from("board_posts")
          .insert(postData);
        toast({ title: t("boardWrite.postSuccess") });
      }

      navigate(`/board/${boardType}`);
    } catch (error) {
      console.error("Error saving post:", error);
      toast({ title: t("boardWrite.error"), description: t("boardWrite.saveError"), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CleanHeader />
      
      <main className="flex-1 pt-6 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto w-full">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(`/board/${boardType}`)}
              className="-ml-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("boardWrite.back")}
            </Button>
            
            <h1 className="text-headline font-bold text-foreground mt-4">
              {editId ? t("boardWrite.editPost") : t("boardWrite.newPost")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("blockEditor.hint") || "블록을 추가하여 글을 작성하세요. 블록 사이에 + 버튼으로 새 블록을 추가할 수 있습니다."}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-6 space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">{t("boardWrite.titleLabel")} *</Label>
                <Input
                  id="title"
                  placeholder={t("boardWrite.titlePlaceholder")}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  className="text-lg font-medium"
                />
              </div>

              {/* Block Editor with Preview */}
              <div className="space-y-2">
                <Label>{t("boardWrite.contentLabel")} *</Label>
                <Tabs defaultValue="edit" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="edit" className="gap-2">
                      <Edit3 className="w-4 h-4" />
                      {t("boardWrite.editTab") || "작성"}
                    </TabsTrigger>
                    <TabsTrigger value="preview" className="gap-2">
                      <Eye className="w-4 h-4" />
                      {t("boardWrite.previewTab") || "미리보기"}
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="edit" className="mt-0">
                    <div className="pl-10 sm:pl-12">
                      <BlockEditor 
                        blocks={blocks} 
                        setBlocks={setBlocks} 
                        userId={currentUser}
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="preview" className="mt-0">
                    <div 
                      className="prose prose-sm max-w-none min-h-[300px] p-6 border rounded-xl bg-muted/30"
                      dangerouslySetInnerHTML={{ 
                        __html: blocksToHtml(blocks) || `<p class="text-muted-foreground">${t("boardWrite.previewEmpty") || "미리보기할 내용이 없습니다"}</p>` 
                      }}
                    />
                  </TabsContent>
                </Tabs>
              </div>

              {/* Audio Upload for Podcast */}
              {boardType === "podcast" && (
                <div className="space-y-2">
                  <Label>{t("boardWrite.audioLabel") || "오디오 파일 (MP3)"}</Label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 px-4 py-2 border border-dashed rounded-lg cursor-pointer hover:bg-muted transition-colors border-orange-500/30 hover:border-orange-500/50">
                      <Music className="w-4 h-4 text-orange-500" />
                      <span className="text-sm">{t("boardWrite.selectAudio") || "오디오 선택"}</span>
                      <input
                        type="file"
                        onChange={(e) => e.target.files?.[0] && setAudioFile(e.target.files[0])}
                        className="hidden"
                        accept="audio/*"
                      />
                    </label>
                  </div>
                  {(audioFile || existingAudioUrl) && (
                    <div className="flex items-center gap-2 mt-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                      <Music className="w-4 h-4 text-orange-500" />
                      <span className="text-sm text-foreground truncate flex-1">
                        {audioFile ? audioFile.name : (t("boardWrite.existingAudio") || "기존 오디오 파일")}
                      </span>
                      <button onClick={() => { setAudioFile(null); setExistingAudioUrl(null); }}>
                        <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Attachments */}
              <div className="space-y-2">
                <Label>{t("boardWrite.attachmentsLabel")}</Label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 px-4 py-2 border border-dashed rounded-lg cursor-pointer hover:bg-muted transition-colors">
                    <FileUp className="w-4 h-4" />
                    <span className="text-sm">{t("boardWrite.selectFile")}</span>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    />
                  </label>
                </div>
                {(attachments.length > 0 || existingAttachments.length > 0) && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {existingAttachments.map((url, i) => (
                      <div key={`existing-${i}`} className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg text-sm">
                        <Image className="w-4 h-4" />
                        <span>{t("boardWrite.file")} {i + 1}</span>
                      </div>
                    ))}
                    {attachments.map((file, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg text-sm">
                        <Image className="w-4 h-4" />
                        <span className="truncate max-w-[150px]">{file.name}</span>
                        <button onClick={() => handleRemoveAttachment(i)}>
                          <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Admin Options */}
              {isAdmin && (
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{t("boardWrite.pinPost")}</p>
                    <p className="text-sm text-muted-foreground">{t("boardWrite.pinDescription")}</p>
                  </div>
                  <Switch checked={isPinned} onCheckedChange={setIsPinned} />
                </div>
              )}

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => navigate(`/board/${boardType}`)}>
                  {t("boardWrite.cancel")}
                </Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  {editId ? t("boardWrite.update") : t("boardWrite.submit")}
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      </main>
      
      <AppFooter />
    </div>
  );
}