import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import CleanHeader from '@/components/CleanHeader';
import AppFooter from '@/components/AppFooter';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, Eye, Globe } from 'lucide-react';

interface ShortsVideo {
  id: string;
  title: string;
  youtube_id: string;
  thumbnail_url: string | null;
  view_count: number;
}

export default function ShortsHub() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [videos, setVideos] = useState<ShortsVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('video_lessons')
        .select('id, title, youtube_id, thumbnail_url, view_count')
        .eq('category', 'shorts')
        .eq('is_published', true)
        .order('view_count', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error fetching shorts:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CleanHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="py-16 px-4 bg-gradient-to-b from-primary/10 to-background">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Badge className="mb-4 text-lg px-4 py-1">📱 NEW</Badge>
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

        {/* Videos Grid */}
        <section className="py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">전체 숏츠</h2>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="aspect-[9/16] rounded-2xl" />
                ))}
              </div>
            ) : videos.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">아직 공개된 숏츠가 없습니다</p>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {videos.map((video, idx) => (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
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
                        />
                        
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
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
