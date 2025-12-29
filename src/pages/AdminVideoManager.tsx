import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Edit, Play, Loader2, Languages, CheckCircle, AlertCircle } from 'lucide-react';


interface VideoLesson {
  id: string;
  youtube_url: string;
  youtube_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string;
  difficulty: string;
  duration_seconds: number | null;
  is_published: boolean;
  view_count: number;
  created_at: string;
}

interface SubtitleStatus {
  language: string;
  exists: boolean;
  is_reviewed: boolean;
}

const CATEGORIES = [
  { value: 'drama', label: '🎭 드라마' },
  { value: 'news', label: '📺 뉴스' },
  { value: 'education', label: '📚 교육' },
  { value: 'variety', label: '🎪 예능' },
  { value: 'music', label: '🎵 음악' },
  { value: 'documentary', label: '🎬 다큐멘터리' },
];

const DIFFICULTIES = [
  { value: 'beginner', label: '초급' },
  { value: 'intermediate', label: '중급' },
  { value: 'advanced', label: '고급' },
];

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

export default function AdminVideoManager() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [translating, setTranslating] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoLesson | null>(null);
  const [subtitleStatuses, setSubtitleStatuses] = useState<Record<string, SubtitleStatus[]>>({});
  const [isAdmin, setIsAdmin] = useState(false);

  const [audioDialogOpen, setAudioDialogOpen] = useState(false);
  const [audioDialogVideo, setAudioDialogVideo] = useState<VideoLesson | null>(null);
  const [audioUrl, setAudioUrl] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    youtube_url: '',
    title: '',
    description: '',
    category: 'education',
    difficulty: 'intermediate',
  });

  useEffect(() => {
    checkAdmin();
    fetchVideos();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (!roles?.some(r => r.role === 'admin')) {
      toast.error('관리자 권한이 필요합니다');
      navigate('/');
      return;
    }
    setIsAdmin(true);
  };

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('video_lessons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);

      // Fetch subtitle statuses for each video
      if (data) {
        const statuses: Record<string, SubtitleStatus[]> = {};
        for (const video of data) {
          const { data: subs } = await supabase
            .from('video_subtitles')
            .select('language, is_reviewed')
            .eq('video_id', video.id);

          statuses[video.id] = LANGUAGES.map(lang => ({
            language: lang,
            exists: subs?.some(s => s.language === lang) || false,
            is_reviewed: subs?.find(s => s.language === lang)?.is_reviewed || false,
          }));
        }
        setSubtitleStatuses(statuses);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast.error('영상 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const extractYouTubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const youtubeId = extractYouTubeId(formData.youtube_url);
    if (!youtubeId) {
      toast.error('유효한 YouTube URL을 입력해주세요');
      return;
    }

    setSaving(true);
    try {
      const videoData = {
        youtube_url: formData.youtube_url,
        youtube_id: youtubeId,
        title: formData.title,
        description: formData.description || null,
        thumbnail_url: `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
        category: formData.category,
        difficulty: formData.difficulty,
        is_published: false,
      };

      if (selectedVideo) {
        // Update
        const { error } = await supabase
          .from('video_lessons')
          .update(videoData)
          .eq('id', selectedVideo.id);
        if (error) throw error;
        toast.success('영상이 수정되었습니다');
      } else {
        // Insert
        const { error } = await supabase
          .from('video_lessons')
          .insert(videoData);
        if (error) throw error;
        toast.success('영상이 등록되었습니다');
      }

      resetForm();
      fetchVideos();
    } catch (error) {
      console.error('Error saving video:', error);
      toast.error('저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const openAudioDialog = (video: VideoLesson) => {
    setAudioDialogVideo(video);
    setAudioUrl('');
    setAudioDialogOpen(true);
  };

  const handleGenerateSubtitles = async () => {
    if (!audioDialogVideo) return;
    if (!audioUrl.trim()) {
      toast.error('오디오 파일 URL을 입력해주세요');
      return;
    }

    setGenerating(audioDialogVideo.id);
    try {
      const { data, error } = await supabase.functions.invoke('video-whisper', {
        body: { video_id: audioDialogVideo.id, audio_url: audioUrl.trim() }
      });

      if (error) throw error;

      toast.success(data?.message || '자막이 생성되었습니다');
      setAudioDialogOpen(false);
      setAudioDialogVideo(null);
      fetchVideos();
    } catch (error: any) {
      console.error('Error generating subtitles:', error);
      const msg = error?.message || '자막 생성에 실패했습니다';
      toast.error(msg);
    } finally {
      setGenerating(null);
    }
  };

  const handleTranslate = async (video: VideoLesson) => {
    setTranslating(video.id);
    try {
      const { data, error } = await supabase.functions.invoke('video-translate', {
        body: { video_id: video.id }
      });

      if (error) throw error;
      
      toast.success(data.message);
      fetchVideos();
    } catch (error) {
      console.error('Error translating:', error);
      toast.error('번역에 실패했습니다');
    } finally {
      setTranslating(null);
    }
  };

  const handleTogglePublish = async (video: VideoLesson) => {
    try {
      const { error } = await supabase
        .from('video_lessons')
        .update({ is_published: !video.is_published })
        .eq('id', video.id);

      if (error) throw error;
      toast.success(video.is_published ? '비공개 처리되었습니다' : '공개되었습니다');
      fetchVideos();
    } catch (error) {
      console.error('Error toggling publish:', error);
      toast.error('상태 변경에 실패했습니다');
    }
  };

  const handleDelete = async (video: VideoLesson) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase
        .from('video_lessons')
        .delete()
        .eq('id', video.id);

      if (error) throw error;
      toast.success('삭제되었습니다');
      fetchVideos();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('삭제에 실패했습니다');
    }
  };

  const handleEdit = (video: VideoLesson) => {
    setSelectedVideo(video);
    setFormData({
      youtube_url: video.youtube_url,
      title: video.title,
      description: video.description || '',
      category: video.category,
      difficulty: video.difficulty,
    });
  };

  const resetForm = () => {
    setSelectedVideo(null);
    setFormData({
      youtube_url: '',
      title: '',
      description: '',
      category: 'education',
      difficulty: 'intermediate',
    });
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}
            aria-label="관리자 홈으로 이동"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">🎬 비디오 학습 관리</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Section */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {selectedVideo ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                {selectedVideo ? '영상 수정' : '새 영상 등록'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>YouTube URL *</Label>
                  <Input
                    value={formData.youtube_url}
                    onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                    required
                  />
                </div>

                <div>
                  <Label>제목 *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="영상 제목"
                    required
                  />
                </div>

                <div>
                  <Label>설명</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="영상 설명"
                    rows={3}
                  />
                </div>

                <div>
                  <Label>카테고리</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => setFormData({ ...formData, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>난이도</Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(v) => setFormData({ ...formData, difficulty: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIFFICULTIES.map((diff) => (
                        <SelectItem key={diff.value} value={diff.value}>
                          {diff.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={saving} className="flex-1">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {selectedVideo ? '수정' : '등록'}
                  </Button>
                  {selectedVideo && (
                    <Button type="button" variant="outline" onClick={resetForm}>
                      취소
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Video List Section */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>등록된 영상 ({videos.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                ) : videos.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    등록된 영상이 없습니다
                  </p>
                ) : (
                  <div className="space-y-4">
                    {videos.map((video) => (
                      <Card key={video.id} className="overflow-hidden">
                        <div className="flex flex-col md:flex-row gap-4 p-4">
                          {/* Thumbnail */}
                          <div className="relative w-full md:w-48 aspect-video rounded-lg overflow-hidden bg-muted flex-shrink-0">
                            {video.thumbnail_url ? (
                              <img
                                src={video.thumbnail_url}
                                alt={video.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Play className="w-8 h-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h3 className="font-semibold truncate">{video.title}</h3>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Switch
                                  checked={video.is_published}
                                  onCheckedChange={() => handleTogglePublish(video)}
                                />
                                <span className="text-xs">
                                  {video.is_published ? '공개' : '비공개'}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-3">
                              <Badge variant="secondary">
                                {CATEGORIES.find(c => c.value === video.category)?.label}
                              </Badge>
                              <Badge variant="outline">
                                {DIFFICULTIES.find(d => d.value === video.difficulty)?.label}
                              </Badge>
                              <Badge variant="outline">
                                조회 {video.view_count}
                              </Badge>
                            </div>

                            {/* Subtitle Status */}
                            <div className="flex flex-wrap gap-1 mb-3">
                              {subtitleStatuses[video.id]?.map((status) => (
                                <Badge
                                  key={status.language}
                                  variant={status.exists ? (status.is_reviewed ? 'default' : 'secondary') : 'outline'}
                                  className="text-xs"
                                >
                                  {status.exists ? (
                                    status.is_reviewed ? (
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                    ) : (
                                      <AlertCircle className="w-3 h-3 mr-1" />
                                    )
                                  ) : null}
                                  {status.language.toUpperCase()}
                                </Badge>
                              ))}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openAudioDialog(video)}
                                disabled={generating === video.id}
                              >
                                {generating === video.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                ) : null}
                                🎤 자막 생성
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleTranslate(video)}
                                disabled={translating === video.id}
                              >
                                {translating === video.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                ) : (
                                  <Languages className="w-4 h-4 mr-1" />
                                )}
                                번역
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/admin/video/${video.id}/subtitles`)}
                              >
                                ✏️ 자막 검수
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEdit(video)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => handleDelete(video)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={audioDialogOpen} onOpenChange={setAudioDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>오디오 URL로 자동 자막 생성</DialogTitle>
            <DialogDescription>
              직접 다운로드 가능한 오디오 파일 URL(mp3/m4a/wav)을 넣으면, Whisper가 타임스탬프 자막(KO)을 자동 생성해 저장합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>오디오 파일 URL</Label>
            <Input
              value={audioUrl}
              onChange={(e) => setAudioUrl(e.target.value)}
              placeholder="https://.../audio.m4a"
            />
            <p className="text-xs text-muted-foreground">
              * YouTube 링크 자체가 아니라 “오디오 파일(직접 다운로드)” 링크여야 합니다. (최대 25MB)
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAudioDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleGenerateSubtitles}
              disabled={!audioDialogVideo || generating === audioDialogVideo?.id}
            >
              {audioDialogVideo && generating === audioDialogVideo.id ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              생성
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
