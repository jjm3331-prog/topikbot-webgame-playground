import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import CleanHeader from '@/components/CleanHeader';
import AppFooter from '@/components/AppFooter';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Play, Eye, Globe, Tv, Mic, Newspaper, Music, Film, Utensils, Plane, Sparkles, BookOpen } from 'lucide-react';

interface ShortsVideo {
  id: string;
  title: string;
  youtube_id: string;
  thumbnail_url: string | null;
  view_count: number;
  category: string;
}

// 카테고리 정의
const CATEGORIES = [
  { id: 'all', label: '전체', icon: Sparkles, color: 'from-primary to-primary' },
  { id: 'kdrama', label: 'K드라마', icon: Tv, color: 'from-pink-500 to-rose-500' },
  { id: 'variety', label: '예능', icon: Mic, color: 'from-yellow-500 to-orange-500' },
  { id: 'news', label: '뉴스', icon: Newspaper, color: 'from-blue-500 to-cyan-500' },
  { id: 'kpop', label: 'K팝', icon: Music, color: 'from-purple-500 to-pink-500' },
  { id: 'movie', label: '영화', icon: Film, color: 'from-red-500 to-orange-500' },
  { id: 'food', label: '먹방/요리', icon: Utensils, color: 'from-green-500 to-emerald-500' },
  { id: 'travel', label: '여행', icon: Plane, color: 'from-sky-500 to-blue-500' },
  { id: 'education', label: '교육', icon: BookOpen, color: 'from-indigo-500 to-purple-500' },
];

export default function ShortsHub() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [videos, setVideos] = useState<ShortsVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('video_lessons')
        .select('id, title, youtube_id, thumbnail_url, view_count, category')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error fetching shorts:', error);
    } finally {
      setLoading(false);
    }
  };

  // 카테고리별 필터링
  const filteredVideos = selectedCategory === 'all'
    ? videos
    : videos.filter(v => v.category === selectedCategory);

  // 카테고리별 개수 계산
  const getCategoryCount = (categoryId: string) => {
    if (categoryId === 'all') return videos.length;
    return videos.filter(v => v.category === categoryId).length;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CleanHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="py-12 px-4 bg-gradient-to-b from-primary/10 to-background">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Badge className="mb-4 text-lg px-4 py-1">📱 Shorts</Badge>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                숏츠로 배우는 한국어
              </h1>
              <p className="text-xl text-muted-foreground mb-6">
                짧은 영상으로 한국어 표현을 빠르게 익혀보세요
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  7개국어 자막 지원
                </div>
                <div className="flex items-center gap-2">
                  <Play className="w-5 h-5 text-primary" />
                  1분 미만 짧은 영상
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Category Tabs */}
        <section className="py-6 px-4 border-b bg-background/80 backdrop-blur-sm sticky top-16 z-30">
          <div className="max-w-6xl mx-auto">
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-2 pb-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const count = getCategoryCount(cat.id);
                  const isActive = selectedCategory === cat.id;
                  
                  return (
                    <Button
                      key={cat.id}
                      variant={isActive ? 'default' : 'outline'}
                      size="sm"
                      className={`gap-2 shrink-0 ${
                        isActive 
                          ? `bg-gradient-to-r ${cat.color} border-0 text-white hover:opacity-90`
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => setSelectedCategory(cat.id)}
                    >
                      <Icon className="w-4 h-4" />
                      {cat.label}
                      <Badge 
                        variant="secondary" 
                        className={`ml-1 ${isActive ? 'bg-white/20 text-white' : ''}`}
                      >
                        {count}
                      </Badge>
                    </Button>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        </section>

        {/* Videos Grid */}
        <section className="py-8 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                {CATEGORIES.find(c => c.id === selectedCategory)?.label || '전체'} 숏츠
              </h2>
              <p className="text-sm text-muted-foreground">
                {filteredVideos.length}개 영상
              </p>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="aspect-[9/16] rounded-2xl" />
                ))}
              </div>
            ) : filteredVideos.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">
                  {selectedCategory === 'all' 
                    ? '아직 공개된 숏츠가 없습니다' 
                    : `${CATEGORIES.find(c => c.id === selectedCategory)?.label} 카테고리에 숏츠가 없습니다`
                  }
                </p>
              </Card>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedCategory}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                >
                  {filteredVideos.map((video, idx) => {
                    const categoryInfo = CATEGORIES.find(c => c.id === video.category);
                    
                    return (
                      <motion.div
                        key={video.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                      >
                        <Card
                          className="group cursor-pointer overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1"
                          onClick={() => navigate(`/shorts/${video.id}`)}
                        >
                          <div className="aspect-[9/16] relative bg-muted">
                            <img
                              src={video.thumbnail_url || `https://img.youtube.com/vi/${video.youtube_id}/maxresdefault.jpg`}
                              alt={video.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            
                            {/* Category Badge */}
                            {categoryInfo && categoryInfo.id !== 'all' && (
                              <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium text-white bg-gradient-to-r ${categoryInfo.color}`}>
                                {categoryInfo.label}
                              </div>
                            )}
                            
                            {/* Play Overlay */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
                                <Play className="w-7 h-7 text-primary ml-1" fill="currentColor" />
                              </div>
                            </div>
                            
                            {/* View Count */}
                            <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                              <Eye className="w-3 h-3" />
                              {video.view_count.toLocaleString()}
                            </div>
                          </div>
                          
                          <CardContent className="p-3">
                            <p className="text-sm font-medium line-clamp-2">{video.title}</p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
