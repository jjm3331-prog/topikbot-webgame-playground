import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import CleanHeader from '@/components/CleanHeader';
import AppFooter from '@/components/AppFooter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Play, 
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  Globe,
  BookOpen,
  Mic,
  ChevronLeft,
  RotateCcw,
  CheckCircle,
  Bookmark,
  MessageSquare,
  Settings,
  Clock
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from '@/hooks/use-toast';

interface VideoLesson {
  id: string;
  title: string;
  description: string | null;
  youtube_id: string;
  youtube_url: string;
  thumbnail_url: string | null;
  category: string;
  difficulty: string;
  duration_seconds: number | null;
  view_count: number;
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
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'uz', name: "O'zbek", flag: '🇺🇿' },
];

export default function VideoPlayer() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  
  const [video, setVideo] = useState<VideoLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [subtitles, setSubtitles] = useState<SubtitleData[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language.split('-')[0] || 'ko');
  const [currentSubtitle, setCurrentSubtitle] = useState<Subtitle | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showSubtitle, setShowSubtitle] = useState(true);
  const [dualSubtitle, setDualSubtitle] = useState(false); // Show KO + translated
  const [hideBurnedInSubs, setHideBurnedInSubs] = useState(true); // Hide hardcoded/burned-in subs area
  const [ytReady, setYtReady] = useState(false);
  
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const subtitleListRef = useRef<HTMLDivElement>(null);
  const activeSubtitleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (videoId) {
      fetchVideo();
      fetchSubtitles();
      incrementViewCount();
    }
  }, [videoId]);

  useEffect(() => {
    // Load YouTube IFrame API (once) and set readiness
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
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
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

    // destroy previous instance (route changes / hot reload)
    try {
      playerRef.current?.destroy?.();
    } catch {
      // ignore
    }

    playerRef.current = new (window as any).YT.Player('youtube-player', {
      videoId: video.youtube_id,
      playerVars: {
        autoplay: 0,
        controls: 1,
        modestbranding: 1,
        rel: 0,
        cc_load_policy: 0,  // Don't auto-show CC
        iv_load_policy: 3,  // Hide annotations
        disablekb: 0,
        hl: 'ko',           // Interface language
      },
      events: {
        onReady: () => {
          // Ensure subtitle syncing starts immediately when user hits play
          updateCurrentSubtitle(playerRef.current?.getCurrentTime?.() ?? 0);
        },
        onStateChange: onPlayerStateChange,
      },
    });
  };

  const onPlayerStateChange = (event: any) => {
    if (event.data === 1) { // Playing
      setIsPlaying(true);
      startTimeUpdate();
    } else {
      setIsPlaying(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Keep subtitle synced even when paused
      if (playerRef.current?.getCurrentTime) {
        updateCurrentSubtitle(playerRef.current.getCurrentTime());
      }
    }
  };

  const startTimeUpdate = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        const time = playerRef.current.getCurrentTime();
        setCurrentTime(time);
        updateCurrentSubtitle(time);
      }
    }, 100);
  };

  const updateCurrentSubtitle = (time: number) => {
    const currentSubs = subtitles.find(s => s.language === selectedLanguage);
    if (!currentSubs || !Array.isArray(currentSubs.subtitles)) {
      setCurrentSubtitle(null);
      return;
    }

    const subtitle = currentSubs.subtitles.find(
      sub => time >= sub.start && time <= sub.end
    );
    setCurrentSubtitle(subtitle || null);
  };

  // Re-evaluate subtitle when language/subtitles change
  useEffect(() => {
    updateCurrentSubtitle(currentTime);
  }, [selectedLanguage, subtitles]);

  const fetchVideo = async () => {
    try {
      const { data, error } = await supabase
        .from('video_lessons')
        .select('*')
        .eq('id', videoId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast({
          title: t('videoPlayer.error'),
          description: t('videoPlayer.videoNotFound'),
          variant: 'destructive',
        });
        navigate('/video-hub');
        return;
      }
      setVideo(data);
    } catch (error) {
      console.error('Error fetching video:', error);
      toast({
        title: t('videoPlayer.error'),
        description: t('videoPlayer.videoNotFound'),
        variant: 'destructive',
      });
      navigate('/video-hub');
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
      
      const parsedData = (data || []).map(item => ({
        language: item.language,
        subtitles: Array.isArray(item.subtitles) 
          ? (item.subtitles as unknown as Subtitle[])
          : []
      }));
      
      setSubtitles(parsedData);
    } catch (error) {
      console.error('Error fetching subtitles:', error);
    }
  };

  const incrementViewCount = async () => {
    try {
      await supabase.rpc('increment_cache_hit', { p_id: videoId });
    } catch (error) {
      // Silent fail for view count
    }
  };

  const seekTo = (time: number) => {
    if (playerRef.current && playerRef.current.seekTo) {
      playerRef.current.seekTo(time, true);
    }
  };

  const handleSubtitleClick = (subtitle: Subtitle) => {
    seekTo(subtitle.start);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentSubtitles = subtitles.find(s => s.language === selectedLanguage)?.subtitles || [];
  const koreanSubtitles = subtitles.find(s => s.language === 'ko')?.subtitles || [];

  // Find current subtitle index for highlighting
  const currentSubtitleIndex = useMemo(() => {
    if (!currentSubtitle) return -1;
    return currentSubtitles.findIndex(sub => sub.start === currentSubtitle.start);
  }, [currentSubtitle, currentSubtitles]);

  // Auto-scroll to current subtitle
  useEffect(() => {
    if (activeSubtitleRef.current && subtitleListRef.current) {
      activeSubtitleRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentSubtitleIndex]);

  // Get Korean subtitle at current time for dual mode
  const koreanSubtitleNow = useMemo(() => {
    if (!dualSubtitle || selectedLanguage === 'ko') return null;
    return koreanSubtitles.find(sub => currentTime >= sub.start && currentTime <= sub.end) || null;
  }, [dualSubtitle, selectedLanguage, koreanSubtitles, currentTime]);

  // Debug log for subtitle sync
  useEffect(() => {
    console.log('[Subtitle Debug]', {
      currentTime: currentTime.toFixed(2),
      selectedLanguage,
      subtitlesAvailable: subtitles.map(s => s.language),
      currentSubtitlesCount: currentSubtitles.length,
      currentSubtitle: currentSubtitle?.text?.substring(0, 30),
      koreanSubtitleNow: koreanSubtitleNow?.text?.substring(0, 30),
      dualSubtitle,
    });
  }, [currentTime, selectedLanguage, currentSubtitle, koreanSubtitleNow]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <CleanHeader />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <Skeleton className="w-full aspect-video rounded-xl mb-6" />
          <Skeleton className="h-8 w-3/4 mb-4" />
          <Skeleton className="h-4 w-1/2" />
        </main>
      </div>
    );
  }

  if (!video) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CleanHeader />
      
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate('/video-hub')}
            className="mb-4"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            {t('videoPlayer.backToHub')}
          </Button>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Video Section */}
            <div className="lg:col-span-2 space-y-4">
              {/* Video Player */}
              <div className="relative rounded-2xl overflow-hidden bg-black shadow-2xl">
                <div className="aspect-video">
                  <div id="youtube-player" className="w-full h-full" />
                </div>

                {/* Mask for burned-in (hardcoded) subtitles inside the video */}
                {hideBurnedInSubs && showSubtitle && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-[22%] pointer-events-none z-[5]"
                    style={{
                      background:
                        'linear-gradient(to top, rgba(0,0,0,0.92), rgba(0,0,0,0.65), rgba(0,0,0,0))',
                    }}
                  />
                )}

                {/* Subtitle Overlay - Our custom subtitles */}
                {showSubtitle && (currentSubtitle || koreanSubtitleNow) && (
                  <motion.div
                    key={`${currentSubtitle?.start}-${koreanSubtitleNow?.start}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-4 left-0 right-0 px-4 z-10"
                  >
                    <div className="bg-gradient-to-r from-black/90 to-black/80 backdrop-blur-md text-white text-center py-4 px-8 rounded-xl max-w-3xl mx-auto space-y-2 border border-white/10 shadow-2xl">
                      {/* Korean (support line) */}
                      {dualSubtitle && selectedLanguage !== 'ko' && koreanSubtitleNow && (
                        <p className="text-base sm:text-lg font-medium text-white/90">
                          {koreanSubtitleNow.text}
                        </p>
                      )}
                      {/* Selected language (main line) */}
                      {currentSubtitle && (
                        <p
                          className={`font-semibold ${
                            dualSubtitle && selectedLanguage !== 'ko'
                              ? 'text-xl sm:text-2xl text-yellow-400'
                              : 'text-xl sm:text-2xl text-white'
                          }`}
                        >
                          {currentSubtitle.text}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Video Info */}
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h1 className="text-2xl font-bold mb-2">{video.title}</h1>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <Badge variant="secondary">
                          {video.difficulty === 'beginner' 
                            ? t('videoPlayer.beginner')
                            : video.difficulty === 'intermediate'
                            ? t('videoPlayer.intermediate')
                            : t('videoPlayer.advanced')}
                        </Badge>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {video.duration_seconds 
                            ? formatTime(video.duration_seconds)
                            : t('videoPlayer.unknownDuration')}
                        </span>
                        <span>{video.view_count.toLocaleString()} {t('videoPlayer.views')}</span>
                      </div>
                      {video.description && (
                        <p className="mt-4 text-muted-foreground">{video.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Language Selector */}
                  <div className="mt-6 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Globe className="w-5 h-5 text-primary" />
                      <span className="font-medium">{t('videoPlayer.subtitleLanguage')}</span>
                    </div>
                    <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((lang) => (
                          <SelectItem key={lang.code} value={lang.code}>
                            <span className="flex items-center gap-2">
                              <span>{lang.flag}</span>
                              <span>{lang.name}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSubtitle(!showSubtitle)}
                    >
                      {showSubtitle ? t('videoPlayer.hideSubtitle') : t('videoPlayer.showSubtitle')}
                    </Button>

                    {showSubtitle && (
                      <Button
                        variant={hideBurnedInSubs ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setHideBurnedInSubs(!hideBurnedInSubs)}
                      >
                        원본 자막 가리기
                      </Button>
                    )}

                    {/* Dual subtitle toggle - only when not Korean */}
                    {selectedLanguage !== 'ko' && (
                      <Button
                        variant={dualSubtitle ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDualSubtitle(!dualSubtitle)}
                        className={dualSubtitle ? 'bg-yellow-500 hover:bg-yellow-600 text-black' : ''}
                      >
                        🇰🇷 + {LANGUAGES.find(l => l.code === selectedLanguage)?.flag || '🌍'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Features Cards */}
              <div className="grid sm:grid-cols-3 gap-4">
                <Card className="border-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Mic className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{t('videoPlayer.shadowing')}</h3>
                      <p className="text-xs text-muted-foreground">{t('videoPlayer.shadowingDesc')}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{t('videoPlayer.vocabulary')}</h3>
                      <p className="text-xs text-muted-foreground">{t('videoPlayer.vocabularyDesc')}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{t('videoPlayer.aiQa')}</h3>
                      <p className="text-xs text-muted-foreground">{t('videoPlayer.aiQaDesc')}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Subtitle List Sidebar */}
            <div className="lg:col-span-1">
              <Card className="border-0 shadow-lg sticky top-4">
                <CardContent className="p-0">
                  <div className="p-4 border-b bg-muted/50">
                    <h2 className="font-bold flex items-center gap-2">
                      <Globe className="w-5 h-5 text-primary" />
                      {t('videoPlayer.subtitleList')}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('videoPlayer.clickToJump')}
                    </p>
                  </div>
                  <div ref={subtitleListRef} className="max-h-[600px] overflow-y-auto scroll-smooth">
                    {currentSubtitles.length > 0 ? (
                      currentSubtitles.map((sub, index) => {
                        const isActive = currentSubtitleIndex === index;
                        return (
                          <motion.button
                            key={index}
                            ref={isActive ? activeSubtitleRef : null}
                            onClick={() => handleSubtitleClick(sub)}
                            className={`w-full text-left p-4 border-b last:border-b-0 transition-all duration-300 ${
                              isActive
                                ? 'bg-primary/20 border-l-4 border-l-primary shadow-inner'
                                : 'hover:bg-muted/50'
                            }`}
                            animate={isActive ? { scale: 1.02 } : { scale: 1 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="flex items-start gap-3">
                              <span className={`text-xs font-mono shrink-0 mt-1 px-1.5 py-0.5 rounded ${
                                isActive 
                                  ? 'bg-primary text-primary-foreground font-bold' 
                                  : 'text-muted-foreground'
                              }`}>
                                {formatTime(sub.start)}
                              </span>
                              <p className={`text-sm leading-relaxed transition-all ${
                                isActive 
                                  ? 'text-foreground font-medium' 
                                  : 'text-muted-foreground'
                              }`}>
                                {sub.text}
                              </p>
                            </div>
                            {isActive && (
                              <motion.div 
                                className="absolute left-0 top-0 bottom-0 w-1 bg-primary"
                                layoutId="activeIndicator"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                              />
                            )}
                          </motion.button>
                        );
                      })
                    ) : (
                      <div className="p-8 text-center text-muted-foreground">
                        <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>{t('videoPlayer.noSubtitles')}</p>
                        <p className="text-sm mt-1">{t('videoPlayer.subtitlesComingSoon')}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
