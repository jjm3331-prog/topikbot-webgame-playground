import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import CleanHeader from '@/components/CleanHeader';
import AppFooter from '@/components/AppFooter';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, Eye, Globe, Tv, Mic, Newspaper, Music, Landmark, Plane, Sparkles, Zap, Users, Clock } from 'lucide-react';

interface ShortsVideo {
  id: string;
  title: string;
  youtube_id: string;
  thumbnail_url: string | null;
  view_count: number;
  category: string;
}

// Categories
const CATEGORIES = [
  { id: 'all', labelKey: 'videoHub.categories.all', icon: Sparkles, gradient: 'from-primary via-korean-orange to-korean-gold' },
  { id: 'drama', labelKey: 'videoHub.categories.drama', icon: Tv, gradient: 'from-rose-500 via-pink-500 to-fuchsia-500' },
  { id: 'variety', labelKey: 'videoHub.categories.variety', icon: Mic, gradient: 'from-amber-400 via-orange-500 to-red-500' },
  { id: 'news', labelKey: 'videoHub.categories.news', icon: Newspaper, gradient: 'from-cyan-400 via-blue-500 to-indigo-600' },
  { id: 'music', labelKey: 'videoHub.categories.music', icon: Music, gradient: 'from-violet-500 via-purple-500 to-pink-500' },
  { id: 'culture', labelKey: 'videoHub.categories.culture', icon: Landmark, gradient: 'from-emerald-400 via-green-500 to-teal-500' },
  { id: 'travel', labelKey: 'videoHub.categories.travel', icon: Plane, gradient: 'from-sky-400 via-blue-500 to-cyan-500' },
] as const;

type CategoryId = typeof CATEGORIES[number]['id'];

export default function ShortsHub() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [videos, setVideos] = useState<ShortsVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const categoryRef = useRef<HTMLDivElement>(null);

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

  // Filter by category (DB categories: kdrama, movie, variety, news, kpop, culture, travel)
  const filteredVideos = selectedCategory === 'all'
    ? videos
    : selectedCategory === 'drama'
      ? videos.filter(v => v.category === 'kdrama' || v.category === 'movie')
      : selectedCategory === 'music'
        ? videos.filter(v => v.category === 'kpop' || v.category === 'music')
        : videos.filter(v => v.category === selectedCategory);

  const getCategoryCount = (categoryId: CategoryId) => {
    if (categoryId === 'all') return videos.length;
    if (categoryId === 'drama') return videos.filter(v => v.category === 'kdrama' || v.category === 'movie').length;
    if (categoryId === 'music') return videos.filter(v => v.category === 'kpop' || v.category === 'music').length;
    return videos.filter(v => v.category === categoryId).length;
  };

  const getCategoryLabel = (categoryId: CategoryId) => {
    const cat = CATEGORIES.find(c => c.id === categoryId);
    return cat ? t(cat.labelKey) : t('videoHub.categories.all');
  };

  const totalViews = videos.reduce((acc, v) => acc + v.view_count, 0);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CleanHeader />

      <main className="flex-1">
        {/* Premium Hero Section */}
        <section className="relative overflow-hidden">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/3" />
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="text-center max-w-4xl mx-auto"
            >
              {/* Premium Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                <span className="text-sm font-semibold text-primary tracking-wide">{t('videoHub.hero.badge')}</span>
              </motion.div>

              {/* Main Title */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight mb-6">
                <span className="block text-foreground">{t('videoHub.hero.title1')}</span>
                <span className="block text-gradient-primary mt-2">{t('videoHub.hero.title2')}</span>
              </h1>

              {/* Subtitle */}
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
                {t('videoHub.hero.subtitle')}
              </p>

              {/* Stats Row */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap justify-center gap-8 md:gap-12"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-korean-orange flex items-center justify-center shadow-lg shadow-primary/25">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-bold text-foreground">{videos.length}</p>
                    <p className="text-sm text-muted-foreground">{t('videoHub.videos.sectionTitle')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-secondary to-korean-cyan flex items-center justify-center shadow-lg shadow-secondary/25">
                    <Globe className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-bold text-foreground">7</p>
                    <p className="text-sm text-muted-foreground">{t('videoHub.stats.languages')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-korean-purple to-korean-pink flex items-center justify-center shadow-lg shadow-korean-purple/25">
                    <Eye className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-bold text-foreground">{(totalViews / 1000).toFixed(1)}K</p>
                    <p className="text-sm text-muted-foreground">{t('videoPlayer.views')}</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Category Navigation */}
        <section 
          ref={categoryRef}
          className="sticky top-16 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mb-2">
              {CATEGORIES.map((cat, idx) => {
                const Icon = cat.icon;
                const count = getCategoryCount(cat.id);
                const isActive = selectedCategory === cat.id;
                
                return (
                  <motion.button
                    key={cat.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`
                      relative flex items-center gap-2 px-5 py-3 rounded-2xl font-medium text-sm
                      transition-all duration-300 shrink-0 group
                      ${isActive 
                        ? 'text-white shadow-xl' 
                        : 'text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted'
                      }
                    `}
                  >
                    {/* Active Background */}
                    {isActive && (
                      <motion.div
                        layoutId="activeCategoryBg"
                        className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${cat.gradient}`}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    
                    <span className="relative z-10 flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${isActive ? '' : 'group-hover:scale-110'} transition-transform`} />
                      <span>{t(cat.labelKey)}</span>
                      <span className={`
                        px-2 py-0.5 rounded-full text-xs font-semibold
                        ${isActive ? 'bg-white/20' : 'bg-muted-foreground/10'}
                      `}>
                        {count}
                      </span>
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Videos Grid */}
        <section className="py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Section Header */}
            <motion.div
              key={`header-${selectedCategory}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-end justify-between mb-8"
            >
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                  {getCategoryLabel(selectedCategory)}
                  <span className="text-muted-foreground font-normal ml-2">{t('videoHub.videos.sectionTitle')}</span>
                </h2>
                <p className="text-muted-foreground mt-1">
                  {t('videoHub.videos.count', { count: filteredVideos.length })}
                </p>
              </div>
            </motion.div>

            {/* Grid */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-[9/16] rounded-3xl" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))}
              </div>
            ) : filteredVideos.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
                  <Play className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {t('videoHub.videos.noVideos')}
                </h3>
                <p className="text-muted-foreground max-w-sm">
                  {t('videoHub.videos.comingSoon')}
                </p>
              </motion.div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedCategory}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6"
                >
                  {filteredVideos.map((video, idx) => {
                    const categoryInfo =
                      video.category === 'kdrama' || video.category === 'movie'
                        ? CATEGORIES.find(c => c.id === 'drama')
                        : video.category === 'kpop' || video.category === 'music'
                          ? CATEGORIES.find(c => c.id === 'music')
                          : CATEGORIES.find(c => c.id === (video.category as CategoryId));
                    
                    return (
                      <motion.div
                        key={video.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ 
                          delay: idx * 0.03,
                          duration: 0.4,
                          ease: [0.22, 1, 0.36, 1]
                        }}
                        className="group cursor-pointer"
                        onClick={() => navigate(`/shorts/${video.id}`)}
                      >
                        {/* Video Card */}
                        <div className="relative aspect-[9/16] rounded-3xl overflow-hidden bg-muted mb-3">
                          {/* Thumbnail */}
                          <img
                            src={video.thumbnail_url || `https://img.youtube.com/vi/${video.youtube_id}/maxresdefault.jpg`}
                            alt={video.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            loading="lazy"
                          />
                          
                          {/* Gradient Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                          
                          {/* Category Badge */}
                          {categoryInfo && (
                            <div className={`absolute top-3 left-3 px-3 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r ${categoryInfo.gradient} shadow-lg`}>
                              {t(categoryInfo.labelKey)}
                            </div>
                          )}
                          
                          {/* Play Button */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              className="w-16 h-16 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center shadow-2xl"
                            >
                              <Play className="w-7 h-7 text-primary ml-1" fill="currentColor" />
                            </motion.div>
                          </div>
                          
                          {/* Bottom Info */}
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <div className="flex items-center gap-3 text-white/90 text-xs">
                              <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full">
                                <Eye className="w-3.5 h-3.5" />
                                <span className="font-medium">{video.view_count.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full">
                                <Clock className="w-3.5 h-3.5" />
                                <span className="font-medium">&lt; 1분</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Title */}
                        <h3 className="font-semibold text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                          {video.title}
                        </h3>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </section>

        {/* Bottom CTA */}
        {!loading && videos.length > 0 && (
          <section className="py-16 md:py-24">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="relative p-8 md:p-12 rounded-[2.5rem] overflow-hidden"
              >
                {/* Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary via-korean-orange to-korean-gold opacity-90" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.2)_0%,transparent_60%)]" />
                
                <div className="relative z-10">
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                    {t('videoHub.cta.title')}
                  </h3>
                  <p className="text-white/80 mb-8 max-w-lg mx-auto">
                    {t('videoHub.cta.description')}
                  </p>
                  <div className="flex flex-wrap justify-center gap-4">
                    <button
                      onClick={() => navigate(`/shorts/${videos[0]?.id}`)}
                      className="px-8 py-4 bg-white text-primary font-bold rounded-2xl hover:bg-white/90 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1"
                    >
                      {t('videoHub.cta.button')}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>
        )}
      </main>

      <AppFooter />
    </div>
  );
}