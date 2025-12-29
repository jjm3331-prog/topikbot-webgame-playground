import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Save, Loader2, Plus, Trash2, Play, Pause } from 'lucide-react';

interface Subtitle {
  start: number;
  end: number;
  text: string;
}

interface VideoLesson {
  id: string;
  youtube_id: string;
  title: string;
}

interface SubtitleData {
  id: string;
  language: string;
  subtitles: Subtitle[];
  is_reviewed: boolean;
}

const LANGUAGES = ['ko', 'vi', 'en', 'ja', 'zh', 'ru', 'uz'];
const LANGUAGE_LABELS: Record<string, string> = {
  ko: '🇰🇷 한국어',
  vi: '🇻🇳 Tiếng Việt',
  en: '🇺🇸 English',
  ja: '🇯🇵 日本語',
  zh: '🇨🇳 中文',
  ru: '🇷🇺 Русский',
  uz: '🇺🇿 O\'zbek',
};

export default function AdminVideoSubtitles() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState<VideoLesson | null>(null);
  const [subtitles, setSubtitles] = useState<Record<string, SubtitleData>>({});
  const [activeLanguage, setActiveLanguage] = useState('ko');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [player, setPlayer] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    fetchData();
    loadYouTubeAPI();
  }, [videoId]);

  const loadYouTubeAPI = () => {
    if (window.YT) return;
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
  };

  const fetchData = async () => {
    if (!videoId) return;

    try {
      // Fetch video
      const { data: videoData, error: videoError } = await supabase
        .from('video_lessons')
        .select('id, youtube_id, title')
        .eq('id', videoId)
        .single();

      if (videoError) throw videoError;
      setVideo(videoData);

      // Fetch subtitles
      const { data: subsData, error: subsError } = await supabase
        .from('video_subtitles')
        .select('*')
        .eq('video_id', videoId);

      if (subsError) throw subsError;

      const subsMap: Record<string, SubtitleData> = {};
      subsData?.forEach((sub) => {
        subsMap[sub.language] = {
          id: sub.id,
          language: sub.language,
          subtitles: (sub.subtitles as unknown as Subtitle[]) || [],
          is_reviewed: sub.is_reviewed ?? false,
        };
      });
      setSubtitles(subsMap);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('데이터를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!video || !window.YT) return;

    const initPlayer = () => {
      new window.YT.Player('youtube-player', {
        videoId: video.youtube_id,
        height: '100%',
        width: '100%',
        playerVars: {
          autoplay: 0,
          controls: 1,
          modestbranding: 1,
        },
        events: {
          onReady: (event: any) => {
            setPlayer(event.target);
          },
          onStateChange: (event: any) => {
            setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
          },
        },
      });
    };

    if (window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }
  }, [video]);

  useEffect(() => {
    if (!player || !isPlaying) return;

    const interval = setInterval(() => {
      const time = player.getCurrentTime();
      setCurrentTime(time);
    }, 100);

    return () => clearInterval(interval);
  }, [player, isPlaying]);

  const getCurrentSubtitleIndex = () => {
    const subs = subtitles[activeLanguage]?.subtitles || [];
    return subs.findIndex((s) => currentTime >= s.start && currentTime <= s.end);
  };

  const handleSubtitleChange = (index: number, field: keyof Subtitle, value: string | number) => {
    setSubtitles((prev) => {
      const langData = prev[activeLanguage];
      if (!langData) return prev;

      const newSubs = [...langData.subtitles];
      newSubs[index] = { ...newSubs[index], [field]: value };

      return {
        ...prev,
        [activeLanguage]: { ...langData, subtitles: newSubs },
      };
    });
  };

  const handleAddSubtitle = () => {
    setSubtitles((prev) => {
      const langData = prev[activeLanguage];
      const lastSub = langData?.subtitles[langData.subtitles.length - 1];
      const newStart = lastSub ? lastSub.end : 0;

      const newSub: Subtitle = {
        start: newStart,
        end: newStart + 5,
        text: '',
      };

      if (!langData) {
        return {
          ...prev,
          [activeLanguage]: {
            id: '',
            language: activeLanguage,
            subtitles: [newSub],
            is_reviewed: false,
          },
        };
      }

      return {
        ...prev,
        [activeLanguage]: {
          ...langData,
          subtitles: [...langData.subtitles, newSub],
        },
      };
    });
  };

  const handleDeleteSubtitle = (index: number) => {
    setSubtitles((prev) => {
      const langData = prev[activeLanguage];
      if (!langData) return prev;

      const newSubs = langData.subtitles.filter((_, i) => i !== index);
      return {
        ...prev,
        [activeLanguage]: { ...langData, subtitles: newSubs },
      };
    });
  };

  const handleSetCurrentTime = (index: number, field: 'start' | 'end') => {
    if (!player) return;
    const time = player.getCurrentTime();
    handleSubtitleChange(index, field, parseFloat(time.toFixed(2)));
  };

  const handleSeekTo = (time: number) => {
    player?.seekTo(time, true);
  };

  const handleToggleReviewed = () => {
    setSubtitles((prev) => {
      const langData = prev[activeLanguage];
      if (!langData) return prev;

      return {
        ...prev,
        [activeLanguage]: { ...langData, is_reviewed: !langData.is_reviewed },
      };
    });
  };

  const handleSave = async () => {
    if (!videoId) return;

    setSaving(true);
    try {
      const langData = subtitles[activeLanguage];
      if (!langData) {
        toast.error('저장할 자막이 없습니다');
        return;
      }

      const { error } = await supabase
        .from('video_subtitles')
        .upsert({
          video_id: videoId,
          language: activeLanguage,
          subtitles: langData.subtitles as unknown as any,
          is_reviewed: langData.is_reviewed,
        }, {
          onConflict: 'video_id,language',
        });

      if (error) throw error;
      toast.success('저장되었습니다');
      fetchData();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>영상을 찾을 수 없습니다</p>
      </div>
    );
  }

  const currentSubtitleIndex = getCurrentSubtitleIndex();
  const langData = subtitles[activeLanguage];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/video-manager')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold">{video.title}</h1>
              <p className="text-sm text-muted-foreground">자막 검수</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={langData?.is_reviewed || false}
                onCheckedChange={handleToggleReviewed}
              />
              <Label>검수 완료</Label>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              저장
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Video Player */}
          <Card className="sticky top-24">
            <CardContent className="p-4">
              <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
                <div id="youtube-player" className="w-full h-full" />
              </div>
              <div className="text-center">
                <Badge variant="outline" className="text-lg">
                  {formatTime(currentTime)}
                </Badge>
              </div>
              {/* Current subtitle display */}
              {currentSubtitleIndex >= 0 && langData?.subtitles[currentSubtitleIndex] && (
                <div className="mt-4 p-4 bg-primary/10 rounded-lg text-center">
                  <p className="text-lg font-medium">
                    {langData.subtitles[currentSubtitleIndex].text}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subtitle Editor */}
          <Card>
            <CardHeader>
              <CardTitle>자막 편집</CardTitle>
              <Tabs value={activeLanguage} onValueChange={setActiveLanguage}>
                <TabsList className="flex flex-wrap h-auto gap-1">
                  {LANGUAGES.map((lang) => (
                    <TabsTrigger key={lang} value={lang} className="text-xs">
                      {subtitles[lang] ? (
                        subtitles[lang].is_reviewed ? '✅' : '⚠️'
                      ) : '❌'}{' '}
                      {lang.toUpperCase()}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {(langData?.subtitles || []).map((sub, index) => (
                  <div
                    key={index}
                    className={`p-3 border rounded-lg space-y-2 transition-colors ${
                      currentSubtitleIndex === index ? 'border-primary bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleDeleteSubtitle(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">시작</Label>
                        <div className="flex gap-1">
                          <Input
                            type="number"
                            step="0.1"
                            value={sub.start}
                            onChange={(e) => handleSubtitleChange(index, 'start', parseFloat(e.target.value))}
                            className="text-sm"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSetCurrentTime(index, 'start')}
                            title="현재 시간으로 설정"
                          >
                            ⏱️
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSeekTo(sub.start)}
                            title="이 시간으로 이동"
                          >
                            <Play className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">종료</Label>
                        <div className="flex gap-1">
                          <Input
                            type="number"
                            step="0.1"
                            value={sub.end}
                            onChange={(e) => handleSubtitleChange(index, 'end', parseFloat(e.target.value))}
                            className="text-sm"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSetCurrentTime(index, 'end')}
                            title="현재 시간으로 설정"
                          >
                            ⏱️
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">자막 텍스트</Label>
                      <Input
                        value={sub.text}
                        onChange={(e) => handleSubtitleChange(index, 'text', e.target.value)}
                        placeholder="자막 내용"
                      />
                    </div>
                  </div>
                ))}

                <Button onClick={handleAddSubtitle} variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  자막 추가
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Add YouTube types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}
