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
import { ChevronLeft, Globe, Volume2, Play, Eye, Lightbulb, GraduationCap, Languages, Sparkles, Loader2, BookOpen, MessageCircle, Globe2, Heart } from 'lucide-react';
import { toast } from 'sonner';

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
  const { i18n, t } = useTranslation();

  const normalizeLang = (code: string) => {
    const base = (code || 'vi').split('-')[0].toLowerCase();
    if (base === 'vn') return 'vi';
    if (base === 'cn') return 'zh';
    if (base === 'ko') return 'vi'; // Default to Vietnamese for Korean users
    return base;
  };

  const [video, setVideo] = useState<ShortsVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [subtitles, setSubtitles] = useState<SubtitleData[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState(() => normalizeLang(i18n.language));
  const [ytReady, setYtReady] = useState(false);
  const [learningContent, setLearningContent] = useState<LearningContent | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [activeTab, setActiveTab] = useState('sentences');

  const playerRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // Available languages for translation
  const availableLanguages = useMemo(() => {
    const currentAppLang = normalizeLang(i18n.language);
    return LANGUAGES.filter(l => l.code === currentAppLang || l.code === 'en');
  }, [i18n.language]);

  // Fetch learning content from LLM
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
      toast.error('학습 콘텐츠를 불러오는데 실패했습니다');
    } finally {
      setLoadingContent(false);
    }
  }, [videoId, koreanSubtitles, selectedLanguage]);

  // Load content when subtitles are ready or language changes
  useEffect(() => {
    if (koreanSubtitles.length > 0) {
      fetchLearningContent();
    }
  }, [koreanSubtitles.length, selectedLanguage]);

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

            {/* Right: Language Selector & AI Learning Content */}
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
                    <Languages className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">학습 언어</h3>
                    <p className="text-xs text-muted-foreground">번역 및 설명 언어를 선택하세요</p>
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
              </div>

              {/* AI Learning Content Tabs */}
              <div className="rounded-3xl bg-card border border-border/50 shadow-lg overflow-hidden">
                <div className="p-5 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-secondary to-korean-cyan flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">AI 학습 콘텐츠</h3>
                      <p className="text-xs text-muted-foreground">AI가 분석한 맞춤 학습 자료</p>
                    </div>
                  </div>
                </div>

                {loadingContent ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                      </div>
                      <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
                    </div>
                    <p className="text-muted-foreground mt-4">AI가 학습 콘텐츠를 생성 중...</p>
                  </div>
                ) : learningContent ? (
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="w-full grid grid-cols-4 p-1 m-4 mr-8">
                      <TabsTrigger value="sentences" className="text-xs sm:text-sm gap-1">
                        <MessageCircle className="w-3.5 h-3.5 hidden sm:inline" />
                        문장
                      </TabsTrigger>
                      <TabsTrigger value="vocabulary" className="text-xs sm:text-sm gap-1">
                        <BookOpen className="w-3.5 h-3.5 hidden sm:inline" />
                        어휘
                      </TabsTrigger>
                      <TabsTrigger value="idioms" className="text-xs sm:text-sm gap-1">
                        <Globe2 className="w-3.5 h-3.5 hidden sm:inline" />
                        관용어
                      </TabsTrigger>
                      <TabsTrigger value="culture" className="text-xs sm:text-sm gap-1">
                        <Heart className="w-3.5 h-3.5 hidden sm:inline" />
                        문화
                      </TabsTrigger>
                    </TabsList>

                    {/* Key Sentences */}
                    <TabsContent value="sentences" className="p-4 space-y-3 max-h-[50vh] overflow-y-auto">
                      {learningContent.keySentences.map((sentence, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.05 * idx }}
                          className="p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-mono">
                              {formatTime(sentence.timestamp)}
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => speakText(sentence.korean)}
                                className="p-2 rounded-lg bg-muted hover:bg-primary hover:text-white transition-colors"
                              >
                                <Volume2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => seekTo(sentence.timestamp)}
                                className="p-2 rounded-lg bg-muted hover:bg-primary hover:text-white transition-colors"
                              >
                                <Play className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <p className="text-lg font-bold text-foreground mb-2">{sentence.korean}</p>
                          <p className="text-sm text-primary/80 mb-2">{sentence.translation}</p>
                          <p className="text-xs text-muted-foreground">{sentence.explanation}</p>
                        </motion.div>
                      ))}
                      {learningContent.keySentences.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          핵심 문장이 없습니다
                        </div>
                      )}
                    </TabsContent>

                    {/* Vocabulary */}
                    <TabsContent value="vocabulary" className="p-4 space-y-3 max-h-[50vh] overflow-y-auto">
                      {learningContent.vocabulary.map((vocab, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.05 * idx }}
                          className="p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <span className="text-lg font-bold text-foreground">{vocab.word}</span>
                              <Badge variant="outline" className="ml-2 text-xs">{vocab.partOfSpeech}</Badge>
                            </div>
                            <button
                              onClick={() => speakText(vocab.word)}
                              className="p-2 rounded-lg bg-muted hover:bg-primary hover:text-white transition-colors"
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-sm text-primary/80 mb-3">{vocab.meaning}</p>
                          <div className="p-3 rounded-xl bg-background/50 border border-border/30">
                            <p className="text-sm font-medium text-foreground">{vocab.example}</p>
                            <p className="text-xs text-muted-foreground mt-1">{vocab.exampleTranslation}</p>
                          </div>
                        </motion.div>
                      ))}
                      {learningContent.vocabulary.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          어휘가 없습니다
                        </div>
                      )}
                    </TabsContent>

                    {/* Idioms */}
                    <TabsContent value="idioms" className="p-4 space-y-3 max-h-[50vh] overflow-y-auto">
                      {learningContent.idioms.map((idiom, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.05 * idx }}
                          className="p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <p className="text-lg font-bold text-foreground">{idiom.korean}</p>
                            <button
                              onClick={() => speakText(idiom.korean)}
                              className="p-2 rounded-lg bg-muted hover:bg-primary hover:text-white transition-colors"
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">직역:</span>
                              <span className="text-sm text-foreground/80">{idiom.literal}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-medium text-primary w-16 shrink-0">의미:</span>
                              <span className="text-sm text-foreground">{idiom.meaning}</span>
                            </div>
                            <div className="flex items-start gap-2 pt-2 border-t border-border/30">
                              <Lightbulb className="w-4 h-4 text-korean-orange shrink-0 mt-0.5" />
                              <span className="text-xs text-muted-foreground">{idiom.usage}</span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                      {learningContent.idioms.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          관용어가 없습니다
                        </div>
                      )}
                    </TabsContent>

                    {/* Cultural Notes */}
                    <TabsContent value="culture" className="p-4 space-y-3 max-h-[50vh] overflow-y-auto">
                      {learningContent.culturalNotes.map((note, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.05 * idx }}
                          className="p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-border/30"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-korean-orange flex items-center justify-center">
                              <Heart className="w-4 h-4 text-white" />
                            </div>
                            <h4 className="font-bold text-foreground">{note.topic}</h4>
                          </div>
                          <p className="text-sm text-foreground/80 mb-3">{note.explanation}</p>
                          <div className="flex items-start gap-2 p-3 rounded-xl bg-background/50">
                            <Lightbulb className="w-4 h-4 text-korean-orange shrink-0 mt-0.5" />
                            <p className="text-xs text-muted-foreground">{note.tip}</p>
                          </div>
                        </motion.div>
                      ))}
                      {learningContent.culturalNotes.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          문화 노트가 없습니다
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <GraduationCap className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground mb-4">
                      학습 콘텐츠를 불러오지 못했습니다
                    </p>
                    <Button
                      variant="outline"
                      onClick={fetchLearningContent}
                      className="gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      다시 분석하기
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Learning Tips */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 p-6 rounded-3xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-border/50"
          >
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
                    <span className="font-medium text-foreground">문화 탭</span>에서 한국 문화를 함께 배워보세요
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
