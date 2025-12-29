import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import CleanHeader from '@/components/CleanHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, Volume2, Play, Eye, Lightbulb, GraduationCap, Languages, Sparkles, Loader2, BookOpen, MessageCircle, Globe2, Heart, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { playElevenLabsTTS } from '@/lib/elevenlabsTts';

interface KeySentence {
  korean: string;
  translation: string;
  explanation: string;
  timestamp: number;
}

interface Vocabulary {
  word: string;
  meaning: string;
  partOfSpeech: string;
  example: string;
  exampleTranslation: string;
}

interface Idiom {
  korean: string;
  literal: string;
  meaning: string;
  usage: string;
}

interface CulturalNote {
  topic: string;
  explanation: string;
  tip: string;
}

interface LearningContent {
  keySentences: KeySentence[];
  vocabulary: Vocabulary[];
  idioms: Idiom[];
  culturalNotes: CulturalNote[];
}

interface ShortsVideo {
  id: string;
  title: string;
  youtube_id: string;
  view_count: number;
  category: string;
}

interface Subtitle {
  start: number;
  end: number;
  text: string;
}

interface SubtitleData {
  language: string;
  subtitles: Subtitle[];
}

const LANGUAGES = [
  { code: 'ko', name: '한국어', flag: '🇰🇷', gradient: 'from-slate-700 to-slate-900' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳', gradient: 'from-red-500 to-yellow-500' },
  { code: 'en', name: 'English', flag: '🇺🇸', gradient: 'from-blue-500 to-indigo-500' },
  { code: 'ja', name: '日本語', flag: '🇯🇵', gradient: 'from-pink-500 to-red-500' },
  { code: 'zh', name: '中文', flag: '🇨🇳', gradient: 'from-red-500 to-orange-500' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', gradient: 'from-blue-500 to-red-500' },
  { code: 'uz', name: "O'zbek", flag: '🇺🇿', gradient: 'from-cyan-500 to-green-500' },
] as const;

const CATEGORY_KEYS: Record<string, string> = {
  kdrama: 'categories.kdrama',
  movie: 'categories.movie',
  variety: 'categories.variety',
  news: 'categories.news',
  kpop: 'categories.kpop',
  culture: 'categories.culture',
  travel: 'categories.travel',
};

export default function ShortsPlayer() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const normalizeLang = (code: string) => {
    const base = (code || 'ko').split('-')[0].toLowerCase();
    if (base === 'vn') return 'vi';
    if (base === 'cn') return 'zh';
    if (base === 'kr') return 'ko';
    return base;
  };

  const [video, setVideo] = useState<ShortsVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [subtitles, setSubtitles] = useState<SubtitleData[]>([]);

  // Per-language page: only expose the current page language (no cross-language switching).
  const selectedLanguage = useMemo(() => normalizeLang(i18n.language), [i18n.language]);

  const [ytReady, setYtReady] = useState(false);
  const [learningContent, setLearningContent] = useState<LearningContent | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [activeTab, setActiveTab] = useState('sentences');

  const playerRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (videoId) {
      fetchVideo();
      fetchSubtitles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  useEffect(() => {
    if ((window as any).YT?.Player) {
      setYtReady(true);
      return;
    }

    if (document.getElementById('yt-iframe-api')) return;

    (window as any).onYouTubeIframeAPIReady = () => {
      setYtReady(true);
    };

    const tag = document.createElement('script');
    tag.id = 'yt-iframe-api';
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;
    document.head.appendChild(tag);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      try {
        playerRef.current?.destroy?.();
      } catch {
        // ignore
      }
    };
  }, []);


  useEffect(() => {
    if (video && ytReady && (window as any).YT?.Player) {
      initPlayer();
    }
  }, [video, ytReady]);

  const initPlayer = () => {
    if (!video) return;
    try { playerRef.current?.destroy?.(); } catch { }

    playerRef.current = new (window as any).YT.Player('shorts-player', {
      videoId: video.youtube_id,
      playerVars: {
        autoplay: 0,
        controls: 1,
        modestbranding: 1,
        rel: 0,
        cc_load_policy: 0,
        iv_load_policy: 3,
        playsinline: 1,
      },
    });
  };

  const fetchVideo = async () => {
    try {
      const { data, error } = await supabase
        .from('video_lessons')
        .select('id, title, youtube_id, view_count, category')
        .eq('id', videoId)
        .single();

      if (error) throw error;
      setVideo(data);
    } catch (error) {
      console.error('Error fetching video:', error);
      toast.error(t('videoPlayer.videoNotFound'));
      navigate('/shorts');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubtitles = async () => {
    try {
      const { data, error } = await supabase
        .from('video_subtitles')
        .select('language, subtitles')
        .eq('video_id', videoId);

      if (error) throw error;
      
      const parsed = (data || []).map(item => ({
        language: item.language,
        subtitles: Array.isArray(item.subtitles) 
          ? (item.subtitles as unknown as Subtitle[])
          : []
      }));
      
      setSubtitles(parsed);
    } catch (error) {
      console.error('Error fetching subtitles:', error);
    }
  };

  const seekTo = useCallback((time: number) => {
    playerRef.current?.seekTo?.(time, true);
    playerRef.current?.playVideo?.();
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const koreanSubtitles = useMemo(() => {
    return subtitles.find(s => s.language === 'ko')?.subtitles || [];
  }, [subtitles]);

  // Per-language page: only expose the current locale language.
  const availableLanguages = useMemo(
    () => LANGUAGES.filter((l) => l.code === selectedLanguage),
    [selectedLanguage]
  );

  const fetchLearningContent = useCallback(async () => {
    if (!videoId || koreanSubtitles.length === 0) return;
    
    setLoadingContent(true);
    try {
      const { data, error } = await supabase.functions.invoke('shorts-expressions', {
        body: {
          videoId,
          subtitles: koreanSubtitles,
          targetLanguage: selectedLanguage,
        },
      });

      if (error) throw error;
      
      if (data) {
        setLearningContent({
          keySentences: data.keySentences || [],
          vocabulary: data.vocabulary || [],
          idioms: data.idioms || [],
          culturalNotes: data.culturalNotes || [],
        });
      }
    } catch (error) {
      console.error('Error fetching learning content:', error);
      toast.error(t('videoPlayer.aiLearning.loadFailed'));
    } finally {
      setLoadingContent(false);
    }
  }, [videoId, koreanSubtitles, selectedLanguage, t]);

  useEffect(() => {
    if (koreanSubtitles.length > 0) {
      fetchLearningContent();
    }
  }, [koreanSubtitles.length, selectedLanguage]);

  const speakText = async (text: string) => {
    try {
      await playElevenLabsTTS(text, { speed: 0.8, truncate: 260 });
    } catch (e) {
      console.error('TTS error:', e);
      toast.error(t('videoPlayer.error'));
    }
  };

  const getCategoryLabel = (category: string) => {
    const key = CATEGORY_KEYS[category];
    return key ? t(`videoPlayer.${key}`) : category;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <CleanHeader />
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Skeleton className="h-10 w-32 mb-6" />
          <div className="grid md:grid-cols-[320px_1fr] lg:grid-cols-[360px_1fr] gap-6">
            <Skeleton className="aspect-[9/16] rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-16 rounded-2xl" />
              <Skeleton className="h-[60vh] rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!video) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CleanHeader />

      <main className="flex-1">
        {/* Background Effects */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 -right-32 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 -left-32 w-[300px] h-[300px] bg-secondary/5 rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-4 md:py-6">
          {/* Back Navigation */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-4 md:mb-6"
          >
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/shorts')} 
              className="group gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>{t('videoPlayer.backToHub')}</span>
            </Button>
          </motion.div>

          {/* Main Content - Responsive Grid */}
          <div className="grid md:grid-cols-[320px_1fr] lg:grid-cols-[360px_1fr] gap-6 lg:gap-8">
            
            {/* Left: Video Player Section - Compact */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col"
            >
              {/* Player Container - Smaller on mobile */}
              <div className="relative w-full max-w-[320px] lg:max-w-[360px] mx-auto">
                {/* Glow Effect */}
                <div className="absolute -inset-3 bg-gradient-to-br from-primary/15 via-transparent to-secondary/15 rounded-[2rem] blur-xl opacity-60" />
                
                {/* Player Wrapper */}
                <div className="relative bg-black rounded-2xl lg:rounded-3xl overflow-hidden shadow-xl ring-1 ring-white/10">
                  <div className="aspect-[9/16]">
                    <div id="shorts-player" className="absolute inset-0 w-full h-full" />
                  </div>
                </div>
              </div>
              
              {/* Video Info - Compact */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-4 text-center"
              >
                <h1 className="text-base md:text-lg font-bold text-foreground leading-snug line-clamp-2">
                  {video.title}
                </h1>
                 <div className="flex items-center justify-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    {video.view_count.toLocaleString()} {t('videoPlayer.views')}
                  </span>
                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                    {getCategoryLabel(video.category)}
                  </Badge>
                </div>
              </motion.div>
            </motion.div>

            {/* Right: AI Learning Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="space-y-4"
            >
              {/* Language Selector - Compact */}
              <div className="p-4 rounded-2xl bg-card border border-border/50 shadow-md">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-korean-orange flex items-center justify-center">
                      <Languages className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{t('videoPlayer.subtitleLanguage')}</h3>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {availableLanguages.map((lang) => {
                      const isActive = selectedLanguage === lang.code;
                      return (
                        <button
                          key={lang.code}
                          onClick={() => setSelectedLanguage(lang.code)}
                          className={`
                            relative px-3 py-2 rounded-xl text-xs font-medium transition-all duration-300
                            ${isActive 
                              ? 'text-white shadow-md' 
                              : 'text-muted-foreground bg-muted/50 hover:bg-muted hover:text-foreground'
                            }
                          `}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="activeLanguage"
                              className={`absolute inset-0 rounded-xl bg-gradient-to-r ${lang.gradient}`}
                              transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                          )}
                          <span className="relative z-10 flex items-center gap-1.5">
                            <span>{lang.flag}</span>
                            <span className="hidden sm:inline">{lang.name}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* AI Learning Content Tabs */}
              <div className="rounded-2xl bg-card border border-border/50 shadow-md overflow-hidden">
                <div className="p-4 border-b border-border/50 bg-gradient-to-r from-secondary/5 to-primary/5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-secondary to-korean-cyan flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{t('videoPlayer.aiLearning.title')}</h3>
                      <p className="text-xs text-muted-foreground">{t('videoPlayer.aiLearning.description')}</p>
                    </div>
                  </div>
                </div>

                {loadingContent ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                        <Loader2 className="w-7 h-7 text-primary animate-spin" />
                      </div>
                      <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-4">{t('videoPlayer.aiLearning.loading')}</p>
                  </div>
                ) : learningContent ? (
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="px-4 pt-3">
                      <TabsList className="w-full grid grid-cols-4 h-10">
                        <TabsTrigger value="sentences" className="text-xs gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{t('videoPlayer.tabs.sentences')}</span>
                          <span className="sm:hidden">{t('videoPlayer.tabs.sentences').slice(0, 2)}</span>
                        </TabsTrigger>
                        <TabsTrigger value="vocabulary" className="text-xs gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                          <BookOpen className="w-3.5 h-3.5" />
                          {t('videoPlayer.tabs.vocabulary')}
                        </TabsTrigger>
                        <TabsTrigger value="idioms" className="text-xs gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                          <Globe2 className="w-3.5 h-3.5" />
                          {t('videoPlayer.tabs.idioms')}
                        </TabsTrigger>
                        <TabsTrigger value="culture" className="text-xs gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                          <Heart className="w-3.5 h-3.5" />
                          {t('videoPlayer.tabs.culture')}
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    {/* Key Sentences */}
                    <TabsContent value="sentences" className="p-4 space-y-3 max-h-[55vh] overflow-y-auto">
                      {learningContent.keySentences.length > 0 ? (
                        learningContent.keySentences.map((sentence, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.03 * idx }}
                            className="p-3.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-mono">
                                {formatTime(sentence.timestamp)}
                              </span>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => speakText(sentence.korean)}
                                  className="p-1.5 rounded-lg bg-muted hover:bg-primary hover:text-white transition-colors"
                                  title={t('videoPlayer.tooltips.listenPronunciation')}
                                >
                                  <Volume2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => seekTo(sentence.timestamp)}
                                  className="p-1.5 rounded-lg bg-muted hover:bg-primary hover:text-white transition-colors"
                                  title={t('videoPlayer.tooltips.watchInVideo')}
                                >
                                  <Play className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <p className="text-base font-bold text-foreground mb-1.5">{sentence.korean}</p>
                            <p className="text-sm text-primary/80 mb-1.5">{sentence.translation}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{sentence.explanation}</p>
                          </motion.div>
                        ))
                      ) : (
                        <EmptyState message={t('videoPlayer.empty.sentences')} />
                      )}
                    </TabsContent>

                    {/* Vocabulary */}
                    <TabsContent value="vocabulary" className="p-4 space-y-3 max-h-[55vh] overflow-y-auto">
                      {learningContent.vocabulary.length > 0 ? (
                        learningContent.vocabulary.map((vocab, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.03 * idx }}
                            className="p-3.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-base font-bold text-foreground">{vocab.word}</span>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{vocab.partOfSpeech}</Badge>
                              </div>
                              <button
                                onClick={() => speakText(vocab.word)}
                                className="p-1.5 rounded-lg bg-muted hover:bg-primary hover:text-white transition-colors"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="text-sm text-primary/80 mb-2">{vocab.meaning}</p>
                            <div className="p-2.5 rounded-lg bg-background/50 border border-border/30">
                              <p className="text-sm font-medium text-foreground">{vocab.example}</p>
                              <p className="text-xs text-muted-foreground mt-1">{vocab.exampleTranslation}</p>
                            </div>
                          </motion.div>
                        ))
                      ) : (
                        <EmptyState message={t('videoPlayer.empty.vocabulary')} />
                      )}
                    </TabsContent>

                    {/* Idioms */}
                    <TabsContent value="idioms" className="p-4 space-y-3 max-h-[55vh] overflow-y-auto">
                      {learningContent.idioms.length > 0 ? (
                        learningContent.idioms.map((idiom, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.03 * idx }}
                            className="p-3.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <p className="text-base font-bold text-foreground">{idiom.korean}</p>
                              <button
                                onClick={() => speakText(idiom.korean)}
                                className="p-1.5 rounded-lg bg-muted hover:bg-primary hover:text-white transition-colors"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="space-y-1.5 text-sm">
                              <div className="flex gap-2">
                                <span className="text-xs font-medium text-muted-foreground w-10 shrink-0">{t('videoPlayer.idiomLabels.literal')}</span>
                                <span className="text-foreground/80">{idiom.literal}</span>
                              </div>
                              <div className="flex gap-2">
                                <span className="text-xs font-medium text-primary w-10 shrink-0">{t('videoPlayer.idiomLabels.meaning')}</span>
                                <span className="text-foreground">{idiom.meaning}</span>
                              </div>
                            </div>
                            <div className="flex items-start gap-2 mt-2 pt-2 border-t border-border/30">
                              <Lightbulb className="w-3.5 h-3.5 text-korean-orange shrink-0 mt-0.5" />
                              <span className="text-xs text-muted-foreground">{idiom.usage}</span>
                            </div>
                          </motion.div>
                        ))
                      ) : (
                        <EmptyState message={t('videoPlayer.empty.idioms')} />
                      )}
                    </TabsContent>

                    {/* Cultural Notes */}
                    <TabsContent value="culture" className="p-4 space-y-3 max-h-[55vh] overflow-y-auto">
                      {learningContent.culturalNotes.length > 0 ? (
                        learningContent.culturalNotes.map((note, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.03 * idx }}
                            className="p-3.5 rounded-xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-border/30"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-korean-orange flex items-center justify-center">
                                <Heart className="w-3 h-3 text-white" />
                              </div>
                              <h4 className="font-bold text-foreground text-sm">{note.topic}</h4>
                            </div>
                            <p className="text-sm text-foreground/80 mb-2">{note.explanation}</p>
                            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-background/50">
                              <Lightbulb className="w-3.5 h-3.5 text-korean-orange shrink-0 mt-0.5" />
                              <p className="text-xs text-muted-foreground">{note.tip}</p>
                            </div>
                          </motion.div>
                        ))
                      ) : (
                        <EmptyState message={t('videoPlayer.empty.culture')} />
                      )}
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                      <GraduationCap className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t('videoPlayer.aiLearning.loadError')}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchLearningContent}
                      className="gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      {t('videoPlayer.aiLearning.retry')}
                    </Button>
                  </div>
                )}
              </div>

              {/* Learning Tips - Compact */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-border/50">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-korean-orange flex items-center justify-center shrink-0">
                    <Lightbulb className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-foreground mb-2">{t('videoPlayer.learningTips.title')}</h3>
                    <ul className="space-y-1.5 text-xs text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <Volume2 className="w-3 h-3 text-primary shrink-0" />
                        {t('videoPlayer.learningTips.tip1')}
                      </li>
                      <li className="flex items-center gap-2">
                        <Play className="w-3 h-3 text-primary shrink-0" />
                        {t('videoPlayer.learningTips.tip2')}
                      </li>
                      <li className="flex items-center gap-2">
                        <Heart className="w-3 h-3 text-primary shrink-0" />
                        {t('videoPlayer.learningTips.tip3')}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <BookOpen className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
