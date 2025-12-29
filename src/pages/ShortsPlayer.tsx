import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import CleanHeader from '@/components/CleanHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, Globe, BookOpen, Volume2, Mic, Play, Eye, ArrowRight, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import WordPopup from '@/components/shorts/WordPopup';
import ShadowingMode from '@/components/shorts/ShadowingMode';

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

interface WordPopupState {
  word: string;
  position: { x: number; y: number };
}

const LANGUAGES = [
  { code: 'ko', name: '한국어', flag: '🇰🇷', gradient: 'from-rose-500 to-pink-500' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳', gradient: 'from-red-500 to-yellow-500' },
  { code: 'en', name: 'English', flag: '🇺🇸', gradient: 'from-blue-500 to-indigo-500' },
  { code: 'ja', name: '日本語', flag: '🇯🇵', gradient: 'from-pink-500 to-red-500' },
  { code: 'zh', name: '中文', flag: '🇨🇳', gradient: 'from-red-500 to-orange-500' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', gradient: 'from-blue-500 to-red-500' },
  { code: 'uz', name: "O'zbek", flag: '🇺🇿', gradient: 'from-cyan-500 to-green-500' },
];

export default function ShortsPlayer() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  const normalizeLang = (code: string) => {
    const base = (code || 'ko').split('-')[0].toLowerCase();
    if (base === 'vn') return 'vi';
    if (base === 'cn') return 'zh';
    return base;
  };

  const [video, setVideo] = useState<ShortsVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [subtitles, setSubtitles] = useState<SubtitleData[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState(() => normalizeLang(i18n.language));
  const [currentTime, setCurrentTime] = useState(0);
  const [ytReady, setYtReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Word popup state
  const [wordPopup, setWordPopup] = useState<WordPopupState | null>(null);

  // Active tab
  const [activeTab, setActiveTab] = useState<'subtitles' | 'shadowing'>('subtitles');

  const playerRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const activeSubRef = useRef<HTMLButtonElement>(null);

  // Fetch video data
  useEffect(() => {
    if (videoId) {
      fetchVideo();
      fetchSubtitles();
    }
  }, [videoId]);

  // Load YouTube API
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
      try { playerRef.current?.destroy?.(); } catch { }
    };
  }, []);

  // Initialize player
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
      events: {
        onStateChange: (event: any) => {
          if (event.data === 1) {
            setIsPlaying(true);
            startTimeUpdate();
          } else {
            setIsPlaying(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
          }
        },
      },
    });
  };

  const startTimeUpdate = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (playerRef.current?.getCurrentTime) {
        setCurrentTime(playerRef.current.getCurrentTime());
      }
    }, 100);
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
      toast.error('영상을 찾을 수 없습니다');
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
  }, []);

  const pauseVideo = useCallback(() => {
    playerRef.current?.pauseVideo?.();
  }, []);

  const playVideo = useCallback(() => {
    playerRef.current?.playVideo?.();
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Word click handler
  const handleWordClick = (word: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const cleanWord = word.replace(/[^\uAC00-\uD7AF]/g, '');
    if (cleanWord.length === 0) return;

    setWordPopup({
      word: cleanWord,
      position: { x: event.clientX, y: event.clientY },
    });
  };

  // Get current subtitles for selected language
  const currentSubtitles = useMemo(() => {
    return subtitles.find(s => s.language === selectedLanguage)?.subtitles || [];
  }, [subtitles, selectedLanguage]);

  const koreanSubtitles = useMemo(() => {
    return subtitles.find(s => s.language === 'ko')?.subtitles || [];
  }, [subtitles]);

  // Find active subtitle index
  const activeIndex = useMemo(() => {
    return currentSubtitles.findIndex(sub => 
      currentTime >= sub.start && currentTime <= sub.end
    );
  }, [currentSubtitles, currentTime]);

  // Auto-scroll to active subtitle
  useEffect(() => {
    if (activeSubRef.current) {
      activeSubRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeIndex]);

  // Available languages for this video
  const availableLanguages = useMemo(() => {
    const available = new Set(subtitles.map(s => s.language));
    return LANGUAGES.filter(l => available.has(l.code));
  }, [subtitles]);

  // Render clickable words in subtitle
  const renderClickableText = (text: string, isKorean: boolean) => {
    if (!isKorean) return text;

    const words = text.split(/(\s+)/);
    return words.map((word, i) => {
      const isWord = /[\uAC00-\uD7AF]/.test(word);
      if (!isWord) return word;

      return (
        <span
          key={i}
          onClick={(e) => handleWordClick(word, e)}
          className="cursor-pointer hover:bg-primary/20 hover:text-primary rounded px-0.5 transition-colors"
        >
          {word}
        </span>
      );
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <CleanHeader />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="flex justify-center">
              <Skeleton className="w-full max-w-[420px] aspect-[9/16] rounded-[2rem]" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-[50vh] rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!video) return null;

  const selectedLangInfo = LANGUAGES.find(l => l.code === selectedLanguage);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CleanHeader />

      <main className="flex-1">
        {/* Background Effects */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 -right-32 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 -left-32 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
          {/* Back Navigation */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6"
          >
            <Button 
              variant="ghost" 
              onClick={() => navigate('/shorts')} 
              className="group gap-2 text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span>숏츠 목록으로</span>
            </Button>
          </motion.div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            
            {/* Left: Video Player Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center"
            >
              {/* Player Container */}
              <div className="relative w-full max-w-[420px]">
                {/* Glow Effect */}
                <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20 rounded-[3rem] blur-2xl opacity-50" />
                
                {/* Player Wrapper */}
                <div className="relative bg-black rounded-[2rem] overflow-hidden shadow-2xl ring-1 ring-white/10">
                  <div className="aspect-[9/16]">
                    <div id="shorts-player" className="absolute inset-0 w-full h-full" />
                  </div>
                </div>
              </div>
              
              {/* Video Info */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-6 text-center max-w-[420px]"
              >
                <h1 className="text-xl md:text-2xl font-bold text-foreground leading-tight">
                  {video.title}
                </h1>
                <div className="flex items-center justify-center gap-4 mt-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4" />
                    {video.view_count.toLocaleString()}회
                  </span>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                  <span className="px-3 py-1 rounded-full bg-muted text-xs font-medium">
                    {video.category === 'kdrama' || video.category === 'movie' ? 'K드라마/영화' : video.category}
                  </span>
                </div>
              </motion.div>
            </motion.div>

            {/* Right: Controls & Subtitles */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="space-y-6"
            >
              {/* Language Selector */}
              <div className="p-5 rounded-3xl bg-card border border-border/50 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-korean-orange flex items-center justify-center">
                    <Globe className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">자막 언어</h3>
                    <p className="text-xs text-muted-foreground">원하는 언어로 학습하세요</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {availableLanguages.map((lang) => {
                    const isActive = selectedLanguage === lang.code;
                    return (
                      <button
                        key={lang.code}
                        onClick={() => setSelectedLanguage(lang.code)}
                        className={`
                          relative px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-300
                          ${isActive 
                            ? 'text-white shadow-lg' 
                            : 'text-muted-foreground bg-muted/50 hover:bg-muted hover:text-foreground'
                          }
                        `}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeLanguage"
                            className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${lang.gradient}`}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          />
                        )}
                        <span className="relative z-10 flex items-center gap-2">
                          <span className="text-base">{lang.flag}</span>
                          <span>{lang.name}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                
                {availableLanguages.length === 0 && (
                  <p className="text-muted-foreground text-sm py-4 text-center">
                    이 영상에는 자막이 없습니다
                  </p>
                )}
              </div>

              {/* Mode Tabs */}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-14 p-1.5 bg-muted/50 rounded-2xl">
                  <TabsTrigger 
                    value="subtitles" 
                    className="gap-2 rounded-xl text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all"
                  >
                    <BookOpen className="w-4 h-4" />
                    자막 학습
                  </TabsTrigger>
                  <TabsTrigger 
                    value="shadowing" 
                    className="gap-2 rounded-xl text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all"
                  >
                    <Mic className="w-4 h-4" />
                    섀도잉 연습
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="subtitles" className="mt-4">
                  {/* Subtitle List */}
                  <div className="rounded-3xl bg-card border border-border/50 shadow-lg overflow-hidden">
                    <div className="p-5 border-b border-border/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-secondary to-korean-cyan flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">자막 타임라인</h3>
                            <p className="text-xs text-muted-foreground">클릭하여 해당 구간으로 이동</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="gap-1">
                          <Sparkles className="w-3 h-3" />
                          단어 클릭 = 뜻 보기
                        </Badge>
                      </div>
                    </div>
                    
                    <ScrollArea className="h-[45vh] md:h-[50vh]">
                      <div className="p-4 space-y-2">
                        {currentSubtitles.map((sub, idx) => {
                          const isActive = idx === activeIndex;
                          const koreanText = koreanSubtitles[idx]?.text;
                          const showDual = selectedLanguage !== 'ko' && koreanText;

                          return (
                            <motion.button
                              key={idx}
                              ref={isActive ? activeSubRef : null}
                              onClick={() => seekTo(sub.start)}
                              className={`
                                w-full text-left p-4 rounded-2xl transition-all duration-300 group
                                ${isActive 
                                  ? 'bg-gradient-to-r from-primary/10 to-primary/5 ring-2 ring-primary shadow-lg shadow-primary/10' 
                                  : 'bg-muted/30 hover:bg-muted/60'
                                }
                              `}
                              animate={isActive ? { scale: 1.01 } : { scale: 1 }}
                              whileHover={{ x: 4 }}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`
                                  px-2.5 py-1 rounded-lg text-xs font-mono font-semibold
                                  ${isActive ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}
                                `}>
                                  {formatTime(sub.start)}
                                </span>
                                {isActive && (
                                  <motion.span
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-white text-xs font-medium"
                                  >
                                    <Volume2 className="w-3 h-3" />
                                    재생 중
                                  </motion.span>
                                )}
                                <ArrowRight className={`
                                  w-4 h-4 ml-auto transition-all
                                  ${isActive ? 'text-primary opacity-100' : 'text-muted-foreground opacity-0 group-hover:opacity-100'}
                                `} />
                              </div>
                              
                              {/* Main subtitle */}
                              <p className={`font-medium leading-relaxed ${isActive ? 'text-foreground' : 'text-foreground/80'}`}>
                                {selectedLanguage === 'ko' 
                                  ? renderClickableText(sub.text, true)
                                  : sub.text
                                }
                              </p>
                              
                              {/* Korean (dual mode) */}
                              {showDual && (
                                <p className="text-sm text-muted-foreground mt-2 pt-2 border-t border-border/30">
                                  🇰🇷 {renderClickableText(koreanText!, true)}
                                </p>
                              )}
                            </motion.button>
                          );
                        })}

                        {currentSubtitles.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                              <Globe className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <p className="text-muted-foreground">
                              선택한 언어의 자막이 없습니다
                            </p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>

                <TabsContent value="shadowing" className="mt-4">
                  <div className="rounded-3xl bg-card border border-border/50 shadow-lg overflow-hidden">
                    <ShadowingMode
                      subtitles={koreanSubtitles}
                      currentTime={currentTime}
                      onSeekTo={seekTo}
                      onPause={pauseVideo}
                      onPlay={playVideo}
                      isPlaying={isPlaying}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Word Popup */}
      <AnimatePresence>
        {wordPopup && (
          <WordPopup
            word={wordPopup.word}
            position={wordPopup.position}
            onClose={() => setWordPopup(null)}
            videoId={videoId}
          />
        )}
      </AnimatePresence>
    </div>
  );
}