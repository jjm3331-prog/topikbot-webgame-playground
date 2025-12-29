import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import CleanHeader from '@/components/CleanHeader';
import AppFooter from '@/components/AppFooter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Globe, 
  BookOpen, 
  Mic, 
  MessageSquare, 
  Trophy,
  ChevronRight,
  Sparkles,
  Languages,
  PenLine,
  CheckCircle,
  Zap,
  Users
} from 'lucide-react';

interface VideoLesson {
  id: string;
  title: string;
  thumbnail_url: string | null;
  category: string;
  difficulty: string;
  view_count: number;
}

export default function VideoLearningHub() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const CATEGORIES = [
    { value: 'all', labelKey: 'videoHub.categories.all', emoji: '📺' },
    { value: 'drama', labelKey: 'videoHub.categories.drama', emoji: '🎭' },
    { value: 'news', labelKey: 'videoHub.categories.news', emoji: '📰' },
    { value: 'education', labelKey: 'videoHub.categories.education', emoji: '📚' },
    { value: 'variety', labelKey: 'videoHub.categories.variety', emoji: '🎪' },
    { value: 'music', labelKey: 'videoHub.categories.music', emoji: '🎵' },
  ];

  const FEATURES = [
    {
      icon: Languages,
      titleKey: 'videoHub.features.subtitle.title',
      descriptionKey: 'videoHub.features.subtitle.description',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: BookOpen,
      titleKey: 'videoHub.features.topik.title',
      descriptionKey: 'videoHub.features.topik.description',
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: Mic,
      titleKey: 'videoHub.features.shadowing.title',
      descriptionKey: 'videoHub.features.shadowing.description',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: MessageSquare,
      titleKey: 'videoHub.features.aiQa.title',
      descriptionKey: 'videoHub.features.aiQa.description',
      color: 'from-orange-500 to-red-500',
    },
    {
      icon: PenLine,
      titleKey: 'videoHub.features.mistakes.title',
      descriptionKey: 'videoHub.features.mistakes.description',
      color: 'from-indigo-500 to-violet-500',
    },
    {
      icon: Trophy,
      titleKey: 'videoHub.features.quiz.title',
      descriptionKey: 'videoHub.features.quiz.description',
      color: 'from-yellow-500 to-amber-500',
    },
  ];

  const HOW_TO_USE = [
    { step: 1, titleKey: 'videoHub.howTo.step1.title', descriptionKey: 'videoHub.howTo.step1.description', icon: Play },
    { step: 2, titleKey: 'videoHub.howTo.step2.title', descriptionKey: 'videoHub.howTo.step2.description', icon: Globe },
    { step: 3, titleKey: 'videoHub.howTo.step3.title', descriptionKey: 'videoHub.howTo.step3.description', icon: BookOpen },
    { step: 4, titleKey: 'videoHub.howTo.step4.title', descriptionKey: 'videoHub.howTo.step4.description', icon: Mic },
    { step: 5, titleKey: 'videoHub.howTo.step5.title', descriptionKey: 'videoHub.howTo.step5.description', icon: CheckCircle },
  ];

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('video_lessons')
        .select('id, title, thumbnail_url, category, difficulty, view_count')
        .eq('is_published', true)
        .order('view_count', { ascending: false })
        .limit(6);

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVideos = selectedCategory === 'all' 
    ? videos 
    : videos.filter(v => v.category === selectedCategory);

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return t('videoHub.difficulty.beginner');
      case 'intermediate': return t('videoHub.difficulty.intermediate');
      case 'advanced': return t('videoHub.difficulty.advanced');
      default: return difficulty;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CleanHeader />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-16 sm:py-24">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
          <div className="absolute inset-0">
            <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>
          
          <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
              >
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">{t('videoHub.hero.badge')}</span>
              </motion.div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
                <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  {t('videoHub.hero.title1')}
                </span>
                <br />
                <span className="text-foreground">{t('videoHub.hero.title2')}</span>
              </h1>

              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                {t('videoHub.hero.subtitle')}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  className="text-lg px-8 h-14 rounded-2xl bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/25"
                  onClick={() => document.getElementById('videos')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <Play className="w-5 h-5 mr-2" />
                  {t('videoHub.hero.startButton')}
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="text-lg px-8 h-14 rounded-2xl"
                  onClick={() => document.getElementById('how-to-use')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  {t('videoHub.hero.guideButton')}
                </Button>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap justify-center gap-8 mt-12"
              >
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">7</div>
                  <div className="text-sm text-muted-foreground">{t('videoHub.stats.languages')}</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">AI</div>
                  <div className="text-sm text-muted-foreground">{t('videoHub.stats.pronunciation')}</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">∞</div>
                  <div className="text-sm text-muted-foreground">{t('videoHub.stats.repeat')}</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">TOPIK</div>
                  <div className="text-sm text-muted-foreground">{t('videoHub.stats.vocabulary')}</div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 sm:py-20 bg-muted/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                🚀 {t('videoHub.features.sectionTitle')}
              </h2>
              <p className="text-muted-foreground text-lg">
                {t('videoHub.features.sectionSubtitle')}
              </p>
            </motion.div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature, index) => (
                <motion.div
                  key={feature.titleKey}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full group hover:shadow-xl transition-all duration-300 border-0 bg-card/80 backdrop-blur">
                    <CardContent className="p-6">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        <feature.icon className="w-7 h-7 text-white" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">{t(feature.titleKey)}</h3>
                      <p className="text-muted-foreground">{t(feature.descriptionKey)}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How to Use Section */}
        <section id="how-to-use" className="py-16 sm:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                📖 {t('videoHub.howTo.sectionTitle')}
              </h2>
              <p className="text-muted-foreground text-lg">
                {t('videoHub.howTo.sectionSubtitle')}
              </p>
            </motion.div>

            <div className="relative">
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-primary/20 via-primary to-primary/20 hidden lg:block -translate-y-1/2" />
              
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
                {HOW_TO_USE.map((step, index) => (
                  <motion.div
                    key={step.step}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="relative"
                  >
                    <Card className="h-full text-center hover:shadow-lg transition-all border-0 bg-card">
                      <CardContent className="p-6">
                        <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4 relative z-10">
                          {step.step}
                        </div>
                        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                          <step.icon className="w-7 h-7 text-primary" />
                        </div>
                        <h3 className="font-bold text-lg mb-2">{t(step.titleKey)}</h3>
                        <p className="text-sm text-muted-foreground">{t(step.descriptionKey)}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Video Preview Section */}
        {videos.length > 0 && (
          <section id="videos" className="py-16 sm:py-20 bg-muted/30">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
              >
                <div>
                  <h2 className="text-3xl font-bold mb-2">🎬 {t('videoHub.videos.sectionTitle')}</h2>
                  <p className="text-muted-foreground">{t('videoHub.videos.sectionSubtitle')}</p>
                </div>
              </motion.div>

              {/* Category Tabs */}
              <div className="flex flex-wrap gap-2 mb-8">
                {CATEGORIES.map((cat) => (
                  <Button
                    key={cat.value}
                    variant={selectedCategory === cat.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.value)}
                    className="rounded-full"
                  >
                    {cat.emoji} {t(cat.labelKey)}
                  </Button>
                ))}
              </div>

              {/* Video Grid */}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredVideos.map((video, index) => (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card 
                      className="overflow-hidden cursor-pointer group hover:shadow-xl transition-all border-0"
                      onClick={() => navigate(`/video-hub/${video.id}`)}
                    >
                      <div className="relative aspect-video bg-muted">
                        {video.thumbnail_url ? (
                          <img 
                            src={video.thumbnail_url} 
                            alt={video.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                            <Play className="w-8 h-8 text-primary ml-1" />
                          </div>
                        </div>
                        <Badge className="absolute top-3 left-3 bg-black/60 backdrop-blur">
                          {CATEGORIES.find(c => c.value === video.category)?.emoji} {t(CATEGORIES.find(c => c.value === video.category)?.labelKey || '')}
                        </Badge>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                          {video.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {video.view_count}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {getDifficultyLabel(video.difficulty)}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {filteredVideos.length === 0 && !loading && (
                <div className="text-center py-12 text-muted-foreground">
                  <Play className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>{t('videoHub.videos.noVideos')}</p>
                  <p className="text-sm mt-2">{t('videoHub.videos.comingSoon')}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="py-16 sm:py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary to-accent text-white">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2),transparent_50%)]" />
                <CardContent className="relative z-10 p-8 sm:p-12 text-center">
                  <Zap className="w-16 h-16 mx-auto mb-6 opacity-80" />
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                    {t('videoHub.cta.title')}
                  </h2>
                  <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
                    {t('videoHub.cta.description')}
                  </p>
                  <Button 
                    size="lg"
                    variant="secondary"
                    className="text-lg px-8 h-14 rounded-2xl"
                    onClick={() => document.getElementById('videos')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    <Play className="w-5 h-5 mr-2" />
                    {t('videoHub.cta.button')}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
