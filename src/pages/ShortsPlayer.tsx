import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import CleanHeader from '@/components/CleanHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, Globe, BookOpen, Volume2, Play, Eye, Lightbulb, GraduationCap, Languages, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface KeyExpression {
  korean: string;
  translation: string;
  context: string;
  timestamp: number;
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
  const [keyExpressions, setKeyExpressions] = useState<KeyExpression[]>([]);
  const [loadingExpressions, setLoadingExpressions] = useState(false);

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

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
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

  // Fetch key expressions from LLM
  const fetchKeyExpressions = useCallback(async () => {
    if (!videoId || koreanSubtitles.length === 0) return;
    
    setLoadingExpressions(true);
    try {
      const targetLang = selectedLanguage === 'ko' ? 'en' : selectedLanguage;
      
      const { data, error } = await supabase.functions.invoke('shorts-expressions', {
        body: {
          videoId,
          subtitles: koreanSubtitles,
          targetLanguage: targetLang,
        },
      });

      if (error) throw error;
      
      if (data?.expressions && Array.isArray(data.expressions)) {
        setKeyExpressions(data.expressions);
      }
    } catch (error) {
      console.error('Error fetching expressions:', error);
      toast.error('핵심 표현을 불러오는데 실패했습니다');
    } finally {
      setLoadingExpressions(false);
    }
  }, [videoId, koreanSubtitles, selectedLanguage]);

  // Load expressions when subtitles are ready
  useEffect(() => {
    if (koreanSubtitles.length > 0 && keyExpressions.length === 0 && !loadingExpressions) {
      fetchKeyExpressions();
    }
  }, [koreanSubtitles, keyExpressions.length, loadingExpressions, fetchKeyExpressions]);

  // Speak Korean text
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ko-KR';
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
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

            {/* Right: Language Selector & Subtitle Timeline */}
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

              {/* Subtitle Timeline */}
              <div className="rounded-3xl bg-card border border-border/50 shadow-lg overflow-hidden">
                <div className="p-5 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-secondary to-korean-cyan flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">자막 타임라인</h3>
                      <p className="text-xs text-muted-foreground">클릭하여 해당 구간으로 이동</p>
                    </div>
                  </div>
                </div>
                
                <ScrollArea className="h-[40vh] md:h-[45vh]">
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
                          </div>
                          
                          {/* Main subtitle */}
                          <p className={`font-medium leading-relaxed ${isActive ? 'text-foreground' : 'text-foreground/80'}`}>
                            {sub.text}
                          </p>
                          
                          {/* Korean (dual mode) */}
                          {showDual && (
                            <p className="text-sm text-muted-foreground mt-2 pt-2 border-t border-border/30">
                              🇰🇷 {koreanText}
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
            </motion.div>
          </div>

          {/* Learning Section - LLM Curated Key Expressions */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-12"
          >
            <div className="text-center mb-8">
              <Badge variant="outline" className="mb-4 px-4 py-1.5 gap-2">
                <Sparkles className="w-4 h-4" />
                AI 추천 학습
              </Badge>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                핵심 표현 4선
              </h2>
              <p className="text-muted-foreground mt-2">
                AI가 선별한 가장 유용한 한국어 표현
              </p>
            </div>

            {loadingExpressions ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                  <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
                </div>
                <p className="text-muted-foreground mt-4">AI가 핵심 표현을 분석 중...</p>
              </div>
            ) : keyExpressions.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-5">
                {keyExpressions.map((expr, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * idx }}
                    className="group relative p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
                  >
                    {/* Index Badge */}
                    <div className="absolute -top-3 -left-3 w-10 h-10 rounded-2xl bg-gradient-to-br from-primary via-korean-orange to-secondary flex items-center justify-center text-white text-lg font-bold shadow-lg">
                      {idx + 1}
                    </div>

                    {/* Actions */}
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          speakText(expr.korean);
                        }}
                        className="p-2.5 rounded-xl bg-muted/50 hover:bg-primary hover:text-white text-muted-foreground transition-all"
                        title="발음 듣기"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          seekTo(expr.timestamp);
                        }}
                        className="p-2.5 rounded-xl bg-muted/50 hover:bg-primary hover:text-white text-muted-foreground transition-all"
                        title="영상에서 보기"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Time */}
                    <span className="inline-block px-3 py-1.5 rounded-lg bg-muted text-xs font-mono text-muted-foreground mb-4">
                      {formatTime(expr.timestamp)}
                    </span>

                    {/* Korean Text */}
                    <p className="text-xl font-bold text-foreground leading-relaxed mb-4 pr-20">
                      {expr.korean}
                    </p>

                    {/* Translation */}
                    <div className="flex items-start gap-2 p-4 rounded-xl bg-primary/5 border border-primary/10">
                      <Languages className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                      <p className="text-base text-foreground/90 font-medium">
                        {expr.translation}
                      </p>
                    </div>

                    {/* Context */}
                    <div className="flex items-start gap-2 mt-3 pt-3 border-t border-border/30">
                      <Lightbulb className="w-4 h-4 text-korean-orange mt-0.5 shrink-0" />
                      <p className="text-sm text-muted-foreground">
                        {expr.context}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : koreanSubtitles.length > 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <GraduationCap className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-4">
                  핵심 표현을 불러오지 못했습니다
                </p>
                <Button
                  variant="outline"
                  onClick={fetchKeyExpressions}
                  className="gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  다시 분석하기
                </Button>
              </div>
            ) : null}

            {/* Learning Tips */}
            <div className="mt-10 p-6 rounded-3xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-border/50">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-korean-orange flex items-center justify-center shrink-0">
                  <Lightbulb className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-2">학습 Tip</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span className="font-medium text-foreground">발음 버튼</span>을 눌러 한국어 발음을 들어보세요
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span className="font-medium text-foreground">재생 버튼</span>을 누르면 해당 장면으로 바로 이동해요
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      상황 설명을 읽고 어떤 상황에서 쓰는지 이해해보세요
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.section>
        </div>
      </main>
    </div>
  );
}
