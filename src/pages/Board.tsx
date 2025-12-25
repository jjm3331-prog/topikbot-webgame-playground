import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Plus, 
  Eye,
  Heart,
  MessageCircle,
  Pin,
  Clock,
  User,
  Ghost,
  Search,
  Megaphone,
  BookOpen,
  Filter,
  Calendar,
  TrendingUp,
  ChevronDown,
  Youtube,
  Image as ImageIcon,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, subDays, subWeeks, subMonths } from "date-fns";
import { vi } from "date-fns/locale";

type BoardType = "notice" | "free" | "resource" | "anonymous";

interface Post {
  id: string;
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

interface Author {
  id: string;
  username: string;
  avatar_url: string | null;
}

const boardInfo: Record<BoardType, { title: string; subtitle: string; icon: any; color: string }> = {
  notice: { 
    title: "Thông báo", 
    subtitle: "공지사항", 
    icon: Megaphone,
    color: "from-red-500 to-rose-600" 
  },
  free: { 
    title: "Tự do trao đổi", 
    subtitle: "자유게시판", 
    icon: MessageCircle,
    color: "from-blue-500 to-cyan-600" 
  },
  resource: { 
    title: "Tài liệu học tập", 
    subtitle: "학습자료실", 
    icon: BookOpen,
    color: "from-emerald-500 to-teal-600" 
  },
  anonymous: { 
    title: "Ẩn danh", 
    subtitle: "익명게시판", 
    icon: Ghost,
    color: "from-purple-500 to-indigo-600" 
  }
};

const extractYoutubeId = (url: string) => {
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  return match ? match[1] : null;
};

const getFirstImageFromAttachments = (urls: string[]) => {
  return urls.find(url => /\.(jpg|jpeg|png|gif|webp)$/i.test(url));
};

export default function Board() {
  const { boardType } = useParams<{ boardType: string }>();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [authors, setAuthors] = useState<Record<string, Author>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState<"all" | "title" | "content" | "author">("all");
  const [sortBy, setSortBy] = useState<"recent" | "likes" | "views" | "comments">("recent");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newPostsCount, setNewPostsCount] = useState(0);

  const info = boardInfo[boardType as BoardType] || boardInfo.free;
  const Icon = info.icon;

  useEffect(() => {
    checkAuth();
    fetchPosts();
    
    // Realtime subscription for new posts
    const channel = supabase
      .channel('board-posts-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'board_posts',
          filter: `board_type=eq.${boardType}`
        },
        (payload) => {
          console.log('New post received:', payload);
          setNewPostsCount(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'board_posts'
        },
        (payload) => {
          setPosts(prev => prev.map(p => 
            p.id === payload.new.id ? { ...p, ...payload.new } as Post : p
          ));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'board_posts'
        },
        (payload) => {
          setPosts(prev => prev.filter(p => p.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [boardType]);

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
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    setNewPostsCount(0);
    try {
      const { data, error } = await supabase
        .from("board_posts")
        .select("*")
        .eq("board_type", boardType as BoardType)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      setPosts(data || []);
      
      // Fetch authors
      const authorIds = [...new Set((data || [])
        .filter(p => p.author_id && !p.is_anonymous)
        .map(p => p.author_id))];
      
      if (authorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", authorIds);
        
        const authorsMap: Record<string, Author> = {};
        profilesData?.forEach(p => {
          authorsMap[p.id] = p;
        });
        setAuthors(authorsMap);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải bài viết",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const canCreatePost = () => {
    if (!currentUser) return false;
    if (boardType === "notice") return isAdmin;
    return true;
  };

  const handleWriteClick = () => {
    if (!currentUser) {
      toast({ title: "Vui lòng đăng nhập để viết bài" });
      navigate("/auth");
      return;
    }
    if (boardType === "notice" && !isAdmin) {
      toast({ 
        title: "Chỉ quản trị viên",
        description: "Chỉ quản trị viên mới có thể đăng thông báo.",
        variant: "destructive"
      });
      return;
    }
    navigate(`/board/${boardType}/write`);
  };

  const getAuthorDisplay = (post: Post) => {
    if (post.is_anonymous || boardType === "anonymous") {
      return { name: "Ẩn danh", avatar: null };
    }
    if (post.author_id && authors[post.author_id]) {
      return { 
        name: authors[post.author_id].username, 
        avatar: authors[post.author_id].avatar_url 
      };
    }
    return { name: post.author_name || "Người dùng", avatar: null };
  };

  // Apply filters and sorting
  const filteredPosts = posts
    .filter(post => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const author = getAuthorDisplay(post);
        
        switch (searchField) {
          case "title":
            if (!post.title.toLowerCase().includes(query)) return false;
            break;
          case "content":
            if (!post.content.toLowerCase().includes(query)) return false;
            break;
          case "author":
            if (!author.name.toLowerCase().includes(query)) return false;
            break;
          default:
            if (!post.title.toLowerCase().includes(query) && 
                !post.content.toLowerCase().includes(query) &&
                !author.name.toLowerCase().includes(query)) return false;
        }
      }
      
      // Date filter
      if (dateFilter !== "all") {
        const postDate = new Date(post.created_at);
        const now = new Date();
        
        switch (dateFilter) {
          case "today":
            if (postDate < subDays(now, 1)) return false;
            break;
          case "week":
            if (postDate < subWeeks(now, 1)) return false;
            break;
          case "month":
            if (postDate < subMonths(now, 1)) return false;
            break;
        }
      }
      
      return true;
    })
    .sort((a, b) => {
      // Pinned posts always first
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      
      switch (sortBy) {
        case "likes":
          return b.like_count - a.like_count;
        case "views":
          return b.view_count - a.view_count;
        case "comments":
          return b.comment_count - a.comment_count;
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CleanHeader />
      
      <main className="flex-1 pt-6 pb-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto w-full">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate("/board-hub")}
              className="mb-4 -ml-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại
            </Button>
            
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${info.color} flex items-center justify-center shadow-lg`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-headline font-bold text-foreground">{info.title}</h1>
                  <p className="text-body text-muted-foreground">{info.subtitle}</p>
                </div>
              </div>
              
              {/* Only show write button if user can create post (admin check for notice) */}
              {boardType !== "notice" && currentUser && (
                <Button 
                  onClick={handleWriteClick}
                  className={`bg-gradient-to-r ${info.color} hover:opacity-90`}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Viết bài
                </Button>
              )}
              {boardType === "notice" && isAdmin && (
                <Button 
                  onClick={handleWriteClick}
                  className={`bg-gradient-to-r ${info.color} hover:opacity-90`}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Viết bài
                </Button>
              )}
            </div>
          </motion.div>

          {/* New posts notification */}
          {newPostsCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4"
            >
              <Button 
                variant="outline" 
                className="w-full border-primary text-primary"
                onClick={fetchPosts}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {newPostsCount} bài viết mới - Nhấn để tải
              </Button>
            </motion.div>
          )}

          {/* Search & Filters */}
          <div className="space-y-3 mb-6">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm bài viết..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={searchField} onValueChange={(v: any) => setSearchField(v)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="title">Tiêu đề</SelectItem>
                  <SelectItem value="content">Nội dung</SelectItem>
                  <SelectItem value="author">Tác giả</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="w-[140px]">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Mới nhất</SelectItem>
                  <SelectItem value="likes">Nhiều thích</SelectItem>
                  <SelectItem value="views">Nhiều xem</SelectItem>
                  <SelectItem value="comments">Nhiều bình luận</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={dateFilter} onValueChange={(v: any) => setDateFilter(v)}>
                <SelectTrigger className="w-[130px]">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="today">Hôm nay</SelectItem>
                  <SelectItem value="week">Tuần này</SelectItem>
                  <SelectItem value="month">Tháng này</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Posts List */}
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="p-4">
                  <div className="flex gap-4">
                    <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                </Card>
              ))
            ) : filteredPosts.length === 0 ? (
              <Card className="p-12 text-center">
                <Icon className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">Chưa có bài viết nào</p>
                {canCreatePost() && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={handleWriteClick}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Viết bài đầu tiên
                  </Button>
                )}
              </Card>
            ) : (
              filteredPosts.map((post, index) => {
                const author = getAuthorDisplay(post);
                const youtubeId = post.youtube_urls?.[0] ? extractYoutubeId(post.youtube_urls[0]) : null;
                const firstImage = post.attachment_urls ? getFirstImageFromAttachments(post.attachment_urls) : null;
                
                return (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Card 
                      className="p-4 cursor-pointer hover:shadow-lg transition-all hover:border-primary/30"
                      onClick={() => navigate(`/board/${boardType}/${post.id}`)}
                    >
                      <div className="flex gap-4">
                        {/* Avatar */}
                        <div className="shrink-0">
                          {author.avatar ? (
                            <img 
                              src={author.avatar} 
                              alt={author.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                              {boardType === "anonymous" || post.is_anonymous ? (
                                <Ghost className="w-5 h-5 text-muted-foreground" />
                              ) : (
                                <User className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              {post.is_pinned && (
                                <Badge variant="secondary" className="text-xs">
                                  <Pin className="w-3 h-3 mr-1" />
                                  Ghim
                                </Badge>
                              )}
                              <h3 className="font-semibold text-foreground line-clamp-1">
                                {post.title}
                              </h3>
                              {/* Media indicators */}
                              {youtubeId && (
                                <Badge variant="outline" className="text-xs text-red-500 border-red-200">
                                  <Youtube className="w-3 h-3" />
                                </Badge>
                              )}
                              {firstImage && (
                                <Badge variant="outline" className="text-xs text-blue-500 border-blue-200">
                                  <ImageIcon className="w-3 h-3" />
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {post.content.replace(/<[^>]*>/g, '').slice(0, 150)}
                          </p>

                          {/* Thumbnail Preview */}
                          {(youtubeId || firstImage) && (
                            <div className="mt-3 flex gap-2">
                              {youtubeId && (
                                <div className="relative w-32 h-20 rounded-lg overflow-hidden bg-muted">
                                  <img 
                                    src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`}
                                    alt="YouTube thumbnail"
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                    <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center">
                                      <div className="w-0 h-0 border-l-[8px] border-l-white border-y-[5px] border-y-transparent ml-1" />
                                    </div>
                                  </div>
                                </div>
                              )}
                              {firstImage && !youtubeId && (
                                <div className="w-32 h-20 rounded-lg overflow-hidden bg-muted">
                                  <img 
                                    src={firstImage}
                                    alt="Attachment"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          {/* Meta */}
                          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                            <span className="font-medium">{author.name}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(post.created_at), "dd/MM/yyyy", { locale: vi })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {post.view_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="w-3 h-3" />
                              {post.like_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircle className="w-3 h-3" />
                              {post.comment_count}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </main>
      
      <AppFooter />
    </div>
  );
}