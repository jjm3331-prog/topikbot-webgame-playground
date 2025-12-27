import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  ArrowLeft, 
  Heart,
  MessageCircle,
  Share2,
  User,
  Ghost,
  Clock,
  Eye,
  MoreVertical,
  Edit,
  Trash2,
  Send,
  Reply,
  Youtube,
  Flag,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { PostTranslateButton } from "@/components/board/PostTranslateButton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { vi, ko, enUS, ja, zhCN, ru, uz } from "date-fns/locale";

const getDateLocale = (lang: string) => {
  const locales: Record<string, any> = { vi, ko, en: enUS, ja, zh: zhCN, ru, uz };
  return locales[lang] || enUS;
};

interface Post {
  id: string;
  board_type: string;
  title: string;
  content: string;
  author_id: string | null;
  author_name: string | null;
  is_anonymous: boolean;
  view_count: number;
  like_count: number;
  comment_count: number;
  is_pinned: boolean;
  created_at: string;
  youtube_urls: string[];
  attachment_urls: string[];
}

interface Comment {
  id: string;
  post_id: string;
  parent_id: string | null;
  author_id: string | null;
  author_name: string | null;
  is_anonymous: boolean;
  content: string;
  like_count: number;
  created_at: string;
}

interface Author {
  id: string;
  username: string;
  avatar_url: string | null;
}

const extractYoutubeId = (url: string) => {
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  return match ? match[1] : null;
};

export default function BoardPost() {
  const { boardType, postId } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [authors, setAuthors] = useState<Record<string, Author>>({});
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [liked, setLiked] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [newCommentsCount, setNewCommentsCount] = useState(0);
  
  // Report dialog state
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ type: 'post' | 'comment'; id: string } | null>(null);
  const [reportReason, setReportReason] = useState<'spam' | 'abuse' | 'other'>('spam');
  const [reportDescription, setReportDescription] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchPost();
    incrementViewCount();
    
    // Realtime subscription for comments
    const channel = supabase
      .channel('board-comments-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'board_comments',
          filter: `post_id=eq.${postId}`
        },
        (payload) => {
          console.log('New comment received:', payload);
          setNewCommentsCount(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'board_comments'
        },
        (payload) => {
          setComments(prev => prev.filter(c => c.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user?.id || null);
    
    if (user) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!roleData);

      // Check if liked
      const { data: likeData } = await supabase
        .from("board_likes")
        .select("id")
        .eq("user_id", user.id)
        .eq("post_id", postId)
        .maybeSingle();
      setLiked(!!likeData);
    }
  };

  const fetchPost = async () => {
    setLoading(true);
    setNewCommentsCount(0);
    try {
      const { data: postData, error: postError } = await supabase
        .from("board_posts")
        .select("*")
        .eq("id", postId)
        .single();

      if (postError) throw postError;
      setPost(postData);

      // Fetch comments
      const { data: commentsData } = await supabase
        .from("board_comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      setComments(commentsData || []);

      // Fetch authors
      const allAuthorIds = [
        postData.author_id,
        ...(commentsData || []).map(c => c.author_id)
      ].filter((id): id is string => id !== null && !postData.is_anonymous);

      const uniqueIds = [...new Set(allAuthorIds)];
      
      if (uniqueIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", uniqueIds);
        
        const authorsMap: Record<string, Author> = {};
        profilesData?.forEach(p => {
          authorsMap[p.id] = p;
        });
        setAuthors(authorsMap);
      }
    } catch (error) {
      console.error("Error fetching post:", error);
      toast({
        title: t("board.error"),
        description: t("board.cannotLoadPost"),
        variant: "destructive"
      });
      navigate(`/board/${boardType}`);
    } finally {
      setLoading(false);
    }
  };

  const incrementViewCount = async () => {
    await supabase
      .from("board_posts")
      .update({ view_count: (post?.view_count || 0) + 1 })
      .eq("id", postId);
  };

  const handleLike = async () => {
    if (!currentUser) {
      toast({ title: t("board.pleaseLoginToLike") });
      return;
    }

    try {
      if (liked) {
        await supabase
          .from("board_likes")
          .delete()
          .eq("user_id", currentUser)
          .eq("post_id", postId);
        
        await supabase
          .from("board_posts")
          .update({ like_count: Math.max(0, (post?.like_count || 1) - 1) })
          .eq("id", postId);
        
        setLiked(false);
        if (post) setPost({ ...post, like_count: Math.max(0, post.like_count - 1) });
      } else {
        await supabase
          .from("board_likes")
          .insert({ user_id: currentUser, post_id: postId });
        
        await supabase
          .from("board_posts")
          .update({ like_count: (post?.like_count || 0) + 1 })
          .eq("id", postId);
        
        setLiked(true);
        if (post) setPost({ ...post, like_count: post.like_count + 1 });
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: post?.title,
        url: window.location.href
      });
    } catch {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: t("board.linkCopied") });
    }
  };

  const handleComment = async () => {
    if (!currentUser) {
      toast({ title: t("board.pleaseLoginToComment") });
      return;
    }
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const isAnonymousBoard = boardType === "anonymous";
      
      await supabase
        .from("board_comments")
        .insert({
          post_id: postId,
          parent_id: replyTo,
          author_id: currentUser,
          is_anonymous: isAnonymousBoard,
          content: newComment.trim()
        });

      await supabase
        .from("board_posts")
        .update({ comment_count: (post?.comment_count || 0) + 1 })
        .eq("id", postId);

      setNewComment("");
      setReplyTo(null);
      fetchPost();
      toast({ title: t("board.commentPosted") });
    } catch (error) {
      console.error("Error posting comment:", error);
      toast({ title: t("board.error"), description: t("board.cannotPostComment"), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t("board.confirmDelete"))) return;
    
    try {
      await supabase.from("board_posts").delete().eq("id", postId);
      toast({ title: t("board.postDeleted") });
      navigate(`/board/${boardType}`);
    } catch (error) {
      toast({ title: t("board.error"), description: t("board.cannotDeletePost"), variant: "destructive" });
    }
  };

  const openReportDialog = (type: 'post' | 'comment', id: string) => {
    if (!currentUser) {
      toast({ title: t("board.pleaseLoginToReport") });
      return;
    }
    setReportTarget({ type, id });
    setReportReason('spam');
    setReportDescription('');
    setReportDialogOpen(true);
  };

  const handleReport = async () => {
    if (!currentUser || !reportTarget) return;
    
    setReportSubmitting(true);
    try {
      const reportData: any = {
        reporter_id: currentUser,
        reason: reportReason,
        description: reportDescription.trim() || null
      };
      
      if (reportTarget.type === 'post') {
        reportData.post_id = reportTarget.id;
      } else {
        reportData.comment_id = reportTarget.id;
      }

      await supabase.from("board_reports").insert(reportData);
      
      toast({ title: t("board.reportSent"), description: t("board.reportReviewMessage") });
      setReportDialogOpen(false);
    } catch (error) {
      console.error("Error submitting report:", error);
      toast({ title: t("board.error"), description: t("board.cannotSendReport"), variant: "destructive" });
    } finally {
      setReportSubmitting(false);
    }
  };

  const getAuthorDisplay = (authorId: string | null, authorName: string | null, isAnon: boolean) => {
    if (isAnon || boardType === "anonymous") {
      return { name: t("board.anonymous"), avatar: null };
    }
    if (authorId && authors[authorId]) {
      return { 
        name: authors[authorId].username, 
        avatar: authors[authorId].avatar_url 
      };
    }
    return { name: authorName || t("board.user"), avatar: null };
  };

  const renderComments = (parentId: string | null = null, depth = 0) => {
    const filtered = comments.filter(c => c.parent_id === parentId);
    
    return filtered.map(comment => {
      const author = getAuthorDisplay(comment.author_id, comment.author_name, comment.is_anonymous);
      
      return (
        <div key={comment.id} className={depth > 0 ? "ml-8 border-l-2 border-muted pl-4" : ""}>
          <div className="flex gap-3 py-4">
            <div className="shrink-0">
              {author.avatar ? (
                <img src={author.avatar} alt={author.name} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  {comment.is_anonymous ? <Ghost className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{author.name}</span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(comment.created_at), "dd/MM/yyyy HH:mm", { locale: dateLocale })}
                </span>
              </div>
              <p className="text-sm mt-1">{comment.content}</p>
              <div className="flex items-center gap-2 mt-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={() => setReplyTo(comment.id)}
                >
                  <Reply className="w-3 h-3 mr-1" />
                  {t("board.reply")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => openReportDialog('comment', comment.id)}
                >
                  <Flag className="w-3 h-3 mr-1" />
                  {t("board.report")}
                </Button>
              </div>
            </div>
          </div>
          {renderComments(comment.id, depth + 1)}
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <CleanHeader />
        <main className="flex-1 pt-6 pb-12 px-4">
          <div className="max-w-3xl mx-auto">
            <Skeleton className="h-8 w-48 mb-6" />
            <Card className="p-6">
              <Skeleton className="h-8 w-3/4 mb-4" />
              <Skeleton className="h-4 w-1/2 mb-6" />
              <Skeleton className="h-48 w-full" />
            </Card>
          </div>
        </main>
      </div>
    );
  }

  if (!post) return null;

  const postAuthor = getAuthorDisplay(post.author_id, post.author_name, post.is_anonymous);
  const canModify = currentUser && (post.author_id === currentUser || isAdmin);

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
              {t("board.back")}
            </Button>
          </motion.div>

          {/* Post Content */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-6">
              {/* Title & Actions */}
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                  {post.title}
                </h1>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => openReportDialog('post', post.id)}
                  >
                    <Flag className="w-4 h-4" />
                  </Button>
                  {canModify && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/board/${boardType}/write?edit=${post.id}`)}>
                          <Edit className="w-4 h-4 mr-2" />
                          {t("board.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          {t("board.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              {/* Author Info */}
              <div className="flex items-center gap-3 mt-4 pb-4 border-b">
                {postAuthor.avatar ? (
                  <img src={postAuthor.avatar} alt={postAuthor.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    {post.is_anonymous ? <Ghost className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  </div>
                )}
                <div>
                  <p className="font-medium">{postAuthor.name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(post.created_at), "dd/MM/yyyy HH:mm", { locale: dateLocale })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {post.view_count}
                    </span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div 
                className="prose prose-sm max-w-none mt-6 text-foreground"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />

              {/* YouTube Embeds */}
              {post.youtube_urls && post.youtube_urls.length > 0 && (
                <div className="mt-6 space-y-4">
                  {post.youtube_urls.map((url, i) => {
                    const videoId = extractYoutubeId(url);
                    if (!videoId) return null;
                    return (
                      <div key={i} className="aspect-video rounded-lg overflow-hidden">
                        <iframe
                          src={`https://www.youtube.com/embed/${videoId}`}
                          className="w-full h-full"
                          allowFullScreen
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Attachments */}
              {post.attachment_urls && post.attachment_urls.length > 0 && (
                <div className="mt-6">
                  <p className="text-sm font-medium mb-2">{t("board.attachments")}:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {post.attachment_urls.map((url, i) => {
                      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                      if (isImage) {
                        return (
                          <a 
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block aspect-video rounded-lg overflow-hidden bg-muted"
                          >
                            <img src={url} alt={`Attachment ${i + 1}`} className="w-full h-full object-cover hover:opacity-80 transition-opacity" />
                          </a>
                        );
                      }
                      return (
                        <a 
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-sm hover:bg-muted/80"
                        >
                          {t("board.file")} {i + 1}
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-4 mt-6 pt-4 border-t">
                <Button 
                  variant={liked ? "default" : "outline"} 
                  size="sm"
                  onClick={handleLike}
                  className={liked ? "bg-pink-500 hover:bg-pink-600" : ""}
                >
                  <Heart className={`w-4 h-4 mr-2 ${liked ? "fill-current" : ""}`} />
                  {post.like_count}
                </Button>
                <Button variant="outline" size="sm">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  {post.comment_count}
                </Button>
                <Button variant="outline" size="sm" onClick={handleShare}>
                  <Share2 className="w-4 h-4 mr-2" />
                  {t("board.share")}
                </Button>
                <PostTranslateButton 
                  text={`${post.title}\n\n${post.content.replace(/<[^>]*>/g, '')}`}
                />
              </div>
            </Card>
          </motion.div>

          {/* Comments Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-6"
          >
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">{t("board.comments")} ({comments.length})</h3>
              
              {/* New comments notification */}
              {newCommentsCount > 0 && (
                <Button 
                  variant="outline" 
                  className="w-full mb-4 border-primary text-primary"
                  onClick={fetchPost}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t("board.newCommentsNotification", { count: newCommentsCount })}
                </Button>
              )}

              {/* Comment Input */}
              {currentUser && (
                <div className="mb-6">
                  {replyTo && (
                    <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                      <Reply className="w-4 h-4" />
                      <span>{t("board.replyingToComment")}</span>
                      <Button variant="ghost" size="sm" onClick={() => setReplyTo(null)}>
                        {t("board.cancel")}
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Textarea
                      placeholder={t("board.writeComment")}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={2}
                      className="resize-none"
                    />
                    <Button onClick={handleComment} disabled={submitting || !newComment.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Comments List */}
              <div className="divide-y">
                {comments.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">{t("board.noComments")}</p>
                ) : (
                  renderComments()
                )}
              </div>
            </Card>
          </motion.div>
        </div>
      </main>
      
      <AppFooter />

      {/* Report Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              {t("board.reportViolation")}
            </DialogTitle>
            <DialogDescription>
              {t("board.reportDescription", { type: reportTarget?.type === 'post' ? t("board.postType") : t("board.commentType") })}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <RadioGroup value={reportReason} onValueChange={(v: any) => setReportReason(v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="spam" id="spam" />
                <Label htmlFor="spam">{t("board.reportReasons.spam")}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="abuse" id="abuse" />
                <Label htmlFor="abuse">{t("board.reportReasons.abuse")}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="other" />
                <Label htmlFor="other">{t("board.reportReasons.other")}</Label>
              </div>
            </RadioGroup>
            
            <div>
              <Label htmlFor="description">{t("board.detailDescription")}</Label>
              <Textarea
                id="description"
                placeholder={t("board.describeViolation")}
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                rows={3}
                className="mt-2"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
              {t("board.cancel")}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReport}
              disabled={reportSubmitting}
            >
              {reportSubmitting ? t("board.sending") : t("board.sendReport")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}