import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import CleanHeader from '@/components/CleanHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, Globe, BookOpen, Volume2, Mic } from 'lucide-react';
import { toast } from 'sonner';
import WordPopup from '@/components/shorts/WordPopup';
import ShadowingMode from '@/components/shorts/ShadowingMode';

interface ShortsVideo {
  id: string;
  title: string;
  youtube_id: string;
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

interface WordPopupState {
  word: string;
  position: { x: number; y: number };
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
        .select('id, title, youtube_id, view_count')
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
    // 한글만 추출
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
          <div className="grid lg:grid-cols-2 gap-6">
            <Skeleton className="aspect-[9/16] max-h-[70vh] rounded-2xl" />
            <Skeleton className="h-[60vh] rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!video) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CleanHeader />

      <main className="flex-1 px-4 py-6">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <Button variant="ghost" onClick={() => navigate('/shorts')} className="mb-4">
            <ChevronLeft className="w-5 h-5 mr-1" />
            숏츠 목록
          </Button>

          {/* Main Grid: Shorts Player (Left) + Subtitle Panel (Right) */}
          <div className="grid lg:grid-cols-2 gap-6 items-start">
            
            {/* Left: Shorts Player (9:16 ratio) */}
            <div className="flex flex-col items-center">
              <div className="w-full max-w-[400px] bg-black rounded-2xl overflow-hidden shadow-2xl">
                <div className="aspect-[9/16] relative">
                  <div id="shorts-player" className="absolute inset-0 w-full h-full" />
                </div>
              </div>
              
              {/* Video Title */}
              <div className="mt-4 text-center">
                <h1 className="text-xl font-bold">{video.title}</h1>
                <p className="text-sm text-muted-foreground">
                  조회수 {video.view_count.toLocaleString()}회
                </p>
              </div>
            </div>

            {/* Right: Subtitle Panel + Shadowing */}
            <div className="space-y-4">
              {/* Language Selector */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    자막 언어
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {availableLanguages.map((lang) => (
                      <Button
                        key={lang.code}
                        size="sm"
                        variant={selectedLanguage === lang.code ? 'default' : 'outline'}
                        onClick={() => setSelectedLanguage(lang.code)}
                      >
                        {lang.flag} {lang.name}
                      </Button>
                    ))}
                  </div>
                  {availableLanguages.length === 0 && (
                    <p className="text-muted-foreground text-sm">자막이 없습니다</p>
                  )}
                </CardContent>
              </Card>

              {/* Tabs: Subtitles vs Shadowing */}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="subtitles" className="gap-2">
                    <BookOpen className="w-4 h-4" />
                    자막
                  </TabsTrigger>
                  <TabsTrigger value="shadowing" className="gap-2">
                    <Mic className="w-4 h-4" />
                    섀도잉
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="subtitles" className="mt-4">
                  {/* Subtitle List */}
                  <Card className="flex-1">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <BookOpen className="w-5 h-5" />
                        자막 타임라인
                        <span className="text-xs text-muted-foreground font-normal ml-2">
                          💡 한글 단어 클릭 시 뜻 보기
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ScrollArea className="h-[50vh] px-4 pb-4">
                        <div className="space-y-2">
                          {currentSubtitles.map((sub, idx) => {
                            const isActive = idx === activeIndex;
                            const koreanText = koreanSubtitles[idx]?.text;
                            const showDual = selectedLanguage !== 'ko' && koreanText;

                            return (
                              <motion.button
                                key={idx}
                                ref={isActive ? activeSubRef : null}
                                onClick={() => seekTo(sub.start)}
                                className={`w-full text-left p-3 rounded-xl transition-all ${
                                  isActive 
                                    ? 'bg-primary/10 border-2 border-primary shadow-lg' 
                                    : 'bg-muted/50 hover:bg-muted border border-transparent'
                                }`}
                                animate={isActive ? { scale: 1.02 } : { scale: 1 }}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs font-mono">
                                    {formatTime(sub.start)}
                                  </Badge>
                                  {isActive && (
                                    <Badge variant="default" className="text-xs">
                                      <Volume2 className="w-3 h-3 mr-1" />
                                      재생 중
                                    </Badge>
                                  )}
                                </div>
                                
                                {/* Main subtitle text - clickable words for Korean */}
                                <p className={`font-medium ${isActive ? 'text-primary' : ''}`}>
                                  {selectedLanguage === 'ko' 
                                    ? renderClickableText(sub.text, true)
                                    : sub.text
                                  }
                                </p>
                                
                                {/* Korean (if dual mode) - also clickable */}
                                {showDual && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    🇰🇷 {renderClickableText(koreanText!, true)}
                                  </p>
                                )}
                              </motion.button>
                            );
                          })}

                          {currentSubtitles.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground">
                              선택한 언어의 자막이 없습니다
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="shadowing" className="mt-4">
                  <ShadowingMode
                    subtitles={koreanSubtitles}
                    currentTime={currentTime}
                    onSeekTo={seekTo}
                    onPause={pauseVideo}
                    onPlay={playVideo}
                    isPlaying={isPlaying}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>

      {/* Word Popup */}
      {wordPopup && (
        <WordPopup
          word={wordPopup.word}
          position={wordPopup.position}
          onClose={() => setWordPopup(null)}
          videoId={videoId}
        />
      )}
    </div>
  );
}
