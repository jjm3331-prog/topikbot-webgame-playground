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
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
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

export default function Board() {
  const { boardType } = useParams<{ boardType: string }>();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [authors, setAuthors] = useState<Record<string, Author>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const info = boardInfo[boardType as BoardType] || boardInfo.free;
  const Icon = info.icon;

  useEffect(() => {
    checkAuth();
    fetchPosts();
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

  const filteredPosts = posts.filter(post => 
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              
              {canCreatePost() && (
                <Button 
                  onClick={() => navigate(`/board/${boardType}/write`)}
                  className={`bg-gradient-to-r ${info.color} hover:opacity-90`}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Viết bài
                </Button>
              )}
            </div>
          </motion.div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm bài viết..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
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
                    onClick={() => navigate(`/board/${boardType}/write`)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Viết bài đầu tiên
                  </Button>
                )}
              </Card>
            ) : (
              filteredPosts.map((post, index) => {
                const author = getAuthorDisplay(post);
                return (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
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
                            </div>
                          </div>
                          
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {post.content.replace(/<[^>]*>/g, '').slice(0, 150)}
                          </p>

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
