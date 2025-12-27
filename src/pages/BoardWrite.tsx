import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Send,
  Image,
  Youtube,
  FileUp,
  X,
  Loader2,
  Bold,
  Italic,
  List,
  Link as LinkIcon,
  Eye,
  Edit3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type BoardType = "notice" | "free" | "resource" | "anonymous";

export default function BoardWrite() {
  const { t } = useTranslation();
  const { boardType } = useParams<{ boardType: string }>();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [youtubeUrls, setYoutubeUrls] = useState<string[]>([]);
  const [newYoutubeUrl, setNewYoutubeUrl] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<string[]>([]);
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(!!editId);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showImageSizeMenu, setShowImageSizeMenu] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [selectedSize, setSelectedSize] = useState<'small' | 'medium' | 'large' | null>(null);

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

    // Check permissions for notice board
    if (boardType === "notice" && !roleData) {
      toast({ title: t("boardWrite.adminOnlyNotice") });
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
      setContent(data.content);
      setYoutubeUrls(data.youtube_urls || []);
      setExistingAttachments(data.attachment_urls || []);
      setIsPinned(data.is_pinned);
    } catch (error) {
      console.error("Error fetching post:", error);
      toast({ title: t("boardWrite.error"), description: t("boardWrite.loadError"), variant: "destructive" });
      navigate(`/board/${boardType}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddYoutubeUrl = () => {
    if (!newYoutubeUrl.trim()) return;
    if (!newYoutubeUrl.includes("youtube.com") && !newYoutubeUrl.includes("youtu.be")) {
      toast({ title: t("boardWrite.invalidYoutubeUrl") });
      return;
    }
    setYoutubeUrls([...youtubeUrls, newYoutubeUrl.trim()]);
    setNewYoutubeUrl("");
  };

  const handleRemoveYoutubeUrl = (index: number) => {
    setYoutubeUrls(youtubeUrls.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (files.length + attachments.length > 5) {
        toast({ title: t("boardWrite.maxAttachments") });
        return;
      }
      setAttachments([...attachments, ...files]);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'));
    if (imageItems.length === 0) return;

    e.preventDefault();

    if (!currentUser) {
      toast({ title: t("boardWrite.pleaseLogin") });
      return;
    }

    const textarea = e.currentTarget;
    const cursorPos = textarea.selectionStart;

    for (const item of imageItems) {
      const file = item.getAsFile();
      if (!file) continue;

      setUploadingImage(true);
      toast({ title: t("boardWrite.uploadingImage") || "이미지 업로드 중..." });

      try {
        const ext = file.type.split('/')[1] || 'png';
        const fileName = `${currentUser}/${Date.now()}_inline.${ext}`;
        
        const { error } = await supabase.storage
          .from("board-attachments")
          .upload(fileName, file);

        if (error) {
          console.error("Upload error:", error);
          toast({ title: t("boardWrite.uploadError") || "이미지 업로드 실패", variant: "destructive" });
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("board-attachments")
          .getPublicUrl(fileName);

        const imageTag = `\n<img src="${urlData.publicUrl}" alt="image" style="max-width:100%;border-radius:8px;margin:8px 0;" />\n`;
        
        setContent(prev => 
          prev.substring(0, cursorPos) + imageTag + prev.substring(cursorPos)
        );
        
        toast({ title: t("boardWrite.imageInserted") || "이미지가 삽입되었습니다" });
      } catch (err) {
        console.error("Image upload error:", err);
        toast({ title: t("boardWrite.uploadError") || "이미지 업로드 실패", variant: "destructive" });
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    if (!currentUser) {
      toast({ title: t("boardWrite.pleaseLogin") });
      return;
    }

    const file = e.target.files[0];
    if (!file.type.startsWith('image/')) {
      toast({ title: t("boardWrite.onlyImagesAllowed") || "이미지 파일만 가능합니다", variant: "destructive" });
      return;
    }

    setPendingImageFile(file);
    setShowImageSizeMenu(true);
    e.target.value = '';
  };

  const getImageSizeStyle = (size: 'small' | 'medium' | 'large') => {
    switch (size) {
      case 'small': return 'max-width:300px';
      case 'medium': return 'max-width:500px';
      case 'large': return 'max-width:100%';
    }
  };

  const getImageAlignStyle = (align: 'left' | 'center' | 'right') => {
    switch (align) {
      case 'left': return 'margin-left:0;margin-right:auto';
      case 'center': return 'margin-left:auto;margin-right:auto';
      case 'right': return 'margin-left:auto;margin-right:0';
    }
  };

  const handleSizeSelect = (size: 'small' | 'medium' | 'large') => {
    setSelectedSize(size);
  };

  const uploadImageWithSizeAndAlign = async (align: 'left' | 'center' | 'right') => {
    if (!pendingImageFile || !currentUser || !selectedSize) return;

    setShowImageSizeMenu(false);
    setUploadingImage(true);
    toast({ title: t("boardWrite.uploadingImage") || "이미지 업로드 중..." });

    try {
      const ext = pendingImageFile.type.split('/')[1] || 'png';
      const fileName = `${currentUser}/${Date.now()}_inline.${ext}`;
      
      const { error } = await supabase.storage
        .from("board-attachments")
        .upload(fileName, pendingImageFile);

      if (error) {
        console.error("Upload error:", error);
        toast({ title: t("boardWrite.uploadError") || "이미지 업로드 실패", variant: "destructive" });
        return;
      }

      const { data: urlData } = supabase.storage
        .from("board-attachments")
        .getPublicUrl(fileName);

      const sizeStyle = getImageSizeStyle(selectedSize);
      const alignStyle = getImageAlignStyle(align);
      const imageTag = `\n<img src="${urlData.publicUrl}" alt="image" style="${sizeStyle};${alignStyle};display:block;border-radius:8px;margin-top:8px;margin-bottom:8px;" />\n`;
      
      setContent(prev => prev + imageTag);
      
      toast({ title: t("boardWrite.imageInserted") || "이미지가 삽입되었습니다" });
    } catch (err) {
      console.error("Image upload error:", err);
      toast({ title: t("boardWrite.uploadError") || "이미지 업로드 실패", variant: "destructive" });
    } finally {
      setUploadingImage(false);
      setPendingImageFile(null);
      setSelectedSize(null);
    }
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

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({ title: t("boardWrite.enterTitle") });
      return;
    }
    if (!content.trim()) {
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
      const isAnonymousBoard = boardType === "anonymous";

      const postData = {
        board_type: boardType as BoardType,
        title: title.trim(),
        content: content.trim(),
        author_id: currentUser,
        is_anonymous: isAnonymousBoard,
        youtube_urls: youtubeUrls,
        attachment_urls: attachmentUrls,
        is_pinned: isAdmin ? isPinned : false
      };

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

  const insertFormatting = (format: string) => {
    const textarea = document.querySelector("textarea[name='content']") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);
    
    let newText = "";
    switch (format) {
      case "bold":
        newText = `<strong>${selected || t("boardWrite.formatText")}</strong>`;
        break;
      case "italic":
        newText = `<em>${selected || t("boardWrite.formatText")}</em>`;
        break;
      case "list":
        newText = `\n<ul>\n  <li>${selected || t("boardWrite.listItem1")}</li>\n  <li>${t("boardWrite.listItem2")}</li>\n</ul>`;
        break;
      case "link":
        newText = `<a href="URL">${selected || t("boardWrite.linkText")}</a>`;
        break;
    }
    
    setContent(content.substring(0, start) + newText + content.substring(end));
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
      
      <main className="flex-1 pt-6 pb-12 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto w-full">
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
                />
              </div>

              {/* Content with Preview */}
              <div className="space-y-2">
                <Label htmlFor="content">{t("boardWrite.contentLabel")} *</Label>
                <Tabs defaultValue="edit" className="w-full">
                  <TabsList className="mb-2">
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
                    <div className="flex gap-2 mb-2 flex-wrap">
                      <Button type="button" variant="outline" size="sm" onClick={() => insertFormatting("bold")}>
                        <Bold className="w-4 h-4" />
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => insertFormatting("italic")}>
                        <Italic className="w-4 h-4" />
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => insertFormatting("list")}>
                        <List className="w-4 h-4" />
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => insertFormatting("link")}>
                        <LinkIcon className="w-4 h-4" />
                      </Button>
                      <div className="relative">
                        <label className="inline-flex">
                          <Button type="button" variant="outline" size="sm" asChild className="cursor-pointer">
                            <span>
                              <Image className="w-4 h-4" />
                            </span>
                          </Button>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageFileSelect}
                            className="hidden"
                            disabled={uploadingImage}
                          />
                        </label>
                        
                        {showImageSizeMenu && (
                          <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 p-3 min-w-[180px]">
                            {!selectedSize ? (
                              <>
                                <p className="text-xs text-muted-foreground mb-2 px-1">{t("boardWrite.selectImageSize") || "① 크기 선택"}</p>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start"
                                  onClick={() => handleSizeSelect('small')}
                                >
                                  📷 {t("boardWrite.sizeSmall") || "작게"} (300px)
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start"
                                  onClick={() => handleSizeSelect('medium')}
                                >
                                  🖼️ {t("boardWrite.sizeMedium") || "중간"} (500px)
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start"
                                  onClick={() => handleSizeSelect('large')}
                                >
                                  🌅 {t("boardWrite.sizeLarge") || "크게"} (100%)
                                </Button>
                              </>
                            ) : (
                              <>
                                <p className="text-xs text-muted-foreground mb-2 px-1">{t("boardWrite.selectImageAlign") || "② 정렬 선택"}</p>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start"
                                  onClick={() => uploadImageWithSizeAndAlign('left')}
                                >
                                  ⬅️ {t("boardWrite.alignLeft") || "왼쪽"}
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start"
                                  onClick={() => uploadImageWithSizeAndAlign('center')}
                                >
                                  ⬛ {t("boardWrite.alignCenter") || "가운데"}
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start"
                                  onClick={() => uploadImageWithSizeAndAlign('right')}
                                >
                                  ➡️ {t("boardWrite.alignRight") || "오른쪽"}
                                </Button>
                                <div className="border-t border-border mt-2 pt-2">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start text-muted-foreground"
                                    onClick={() => setSelectedSize(null)}
                                  >
                                    ← {t("common.back") || "뒤로"}
                                  </Button>
                                </div>
                              </>
                            )}
                            <div className="border-t border-border mt-2 pt-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-muted-foreground"
                                onClick={() => {
                                  setShowImageSizeMenu(false);
                                  setPendingImageFile(null);
                                  setSelectedSize(null);
                                }}
                              >
                                ✕ {t("common.cancel") || "취소"}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="relative">
                      <Textarea
                        id="content"
                        name="content"
                        placeholder={t("boardWrite.contentPlaceholder")}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onPaste={handlePaste}
                        rows={12}
                        className="font-mono text-sm"
                        disabled={uploadingImage}
                      />
                      {uploadingImage && (
                        <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-md">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("boardWrite.pasteHint") || "💡 Ctrl+V로 이미지를 붙여넣으면 본문에 바로 삽입됩니다"}
                    </p>
                  </TabsContent>
                  
                  <TabsContent value="preview" className="mt-0">
                    <div 
                      className="prose prose-sm max-w-none min-h-[300px] p-4 border rounded-md bg-muted/30"
                      dangerouslySetInnerHTML={{ __html: content || `<p class="text-muted-foreground">${t("boardWrite.previewEmpty") || "미리보기할 내용이 없습니다"}</p>` }}
                    />
                  </TabsContent>
                </Tabs>
              </div>

              {/* YouTube URLs */}
              <div className="space-y-2">
                <Label>{t("boardWrite.youtubeLabel")}</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder={t("boardWrite.youtubePlaceholder")}
                    value={newYoutubeUrl}
                    onChange={(e) => setNewYoutubeUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddYoutubeUrl())}
                  />
                  <Button type="button" variant="outline" onClick={handleAddYoutubeUrl}>
                    <Youtube className="w-4 h-4" />
                  </Button>
                </div>
                {youtubeUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {youtubeUrls.map((url, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg text-sm">
                        <Youtube className="w-4 h-4 text-red-500" />
                        <span className="truncate max-w-[200px]">{url}</span>
                        <button onClick={() => handleRemoveYoutubeUrl(i)}>
                          <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

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
