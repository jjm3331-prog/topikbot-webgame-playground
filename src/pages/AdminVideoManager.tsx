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
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Edit, Play, Loader2, CheckCircle, AlertCircle, Upload } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';


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

export default function AdminVideoManager() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoLesson | null>(null);
  const [subtitleStatuses, setSubtitleStatuses] = useState<Record<string, SubtitleStatus[]>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [translatingVideoId, setTranslatingVideoId] = useState<string | null>(null);
  

  // SRT Upload state
  const [srtUploadOpen, setSrtUploadOpen] = useState(false);
  const [srtUploadVideo, setSrtUploadVideo] = useState<VideoLesson | null>(null);
  const [srtFile, setSrtFile] = useState<File | null>(null);
  const [srtLanguage, setSrtLanguage] = useState('ko');
  const [srtUploading, setSrtUploading] = useState(false);
  const [srtAutoTranslate, setSrtAutoTranslate] = useState(true);
  const [srtPreview, setSrtPreview] = useState<Array<{ start: number; end: number; text: string }>>([]);

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

  // SRT Upload functions
  const openSrtUpload = (video: VideoLesson) => {
    setSrtUploadVideo(video);
    setSrtFile(null);
    setSrtLanguage('ko');
    setSrtAutoTranslate(true);
    setSrtPreview([]);
    setSrtUploadOpen(true);
  };

  const handleSrtFileChange = async (file: File | null) => {
    setSrtFile(file);
    if (file) {
      const content = await file.text();
      const parsed = parseSRT(content);
      setSrtPreview(parsed.slice(0, 10)); // Show first 10 for preview
    } else {
      setSrtPreview([]);
    }
  };

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  };

  const parseSRT = (content: string): Array<{ start: number; end: number; text: string }> => {
    const subtitles: Array<{ start: number; end: number; text: string }> = [];

    // Normalize line endings for Windows/macOS compatibility
    const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    const blocks = normalized.split(/\n\n+/);

    for (const block of blocks) {
      const lines = block
        .split(/\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length < 2) continue;

      // Find timestamp line (format: 00:00:00,000 --> 00:00:03,240)
      const timestampLine = lines.find((l) => l.includes('-->'));
      if (!timestampLine) continue;

      const [startStr, endStr] = timestampLine.split('-->').map((s) => s.trim());
      if (!startStr || !endStr) continue;

      const parseTimestamp = (ts: string): number => {
        const match = ts.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
        if (!match) return 0;
        const [, h, m, s, ms] = match;
        return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 1000;
      };

      const start = parseTimestamp(startStr);
      const end = parseTimestamp(endStr);

      // Get text lines (everything after timestamp)
      const timestampIndex = lines.indexOf(timestampLine);
      const textLines = lines.slice(timestampIndex + 1).filter((l) => !/^[0-9]+$/.test(l));

      // If the SRT contains bilingual lines per block, pick by selected upload language.
      // - ko: prefer first line
      // - others: prefer second line if present, else fallback to joined text
      let text = '';
      if (textLines.length === 1) {
        text = textLines[0];
      } else if (textLines.length >= 2) {
        text = srtLanguage === 'ko' ? textLines[0] : textLines[1] ?? textLines.join(' ');
      } else {
        text = '';
      }

      // Fallback: join multi-line captions (some SRTs split sentences across lines)
      if (!text) text = textLines.join(' ').trim();

      if (text) {
        subtitles.push({ start, end, text });
      }
    }

    return subtitles;
  };

  const handleSrtUpload = async () => {
    if (!srtFile || !srtUploadVideo) return;

    setSrtUploading(true);
    try {
      const content = await srtFile.text();
      const subtitles = parseSRT(content);

      if (subtitles.length === 0) {
        toast.error('SRT 파일을 파싱할 수 없습니다');
        setSrtUploading(false);
        return;
      }

      // Save to video_subtitles table
      const { error } = await supabase
        .from('video_subtitles')
        .upsert({
          video_id: srtUploadVideo.id,
          language: srtLanguage,
          subtitles: subtitles,
          is_reviewed: false,
        }, {
          onConflict: 'video_id,language'
        });

      if (error) throw error;

      toast.success(`${subtitles.length}개 자막이 저장되었습니다 (${srtLanguage.toUpperCase()})`);
      
      // Auto-translate if enabled
      if (srtAutoTranslate && srtLanguage === 'ko') {
        toast.info('🌍 6개 언어 번역 시작...');
        
        try {
          const { error: translateError } = await supabase.functions.invoke('video-translate', {
            body: { video_id: srtUploadVideo.id }
          });
          
          if (translateError) throw translateError;
          toast.success('모든 언어 번역 완료!');
        } catch (transErr: any) {
          console.error('Translation error:', transErr);
          toast.error('번역 실패: ' + (transErr.message || '알 수 없는 오류'));
        }
      }
      
      setSrtUploadOpen(false);
      fetchVideos();
    } catch (error: any) {
      console.error('Error uploading SRT:', error);
      toast.error(error.message || 'SRT 업로드 실패');
    } finally {
      setSrtUploading(false);
    }
  };

  // Refresh subtitle statuses for a single video
  const refreshSubtitleStatus = async (videoId: string) => {
    const { data: subs } = await supabase
      .from('video_subtitles')
      .select('language, is_reviewed')
      .eq('video_id', videoId);

    setSubtitleStatuses(prev => ({
      ...prev,
      [videoId]: LANGUAGES.map(lang => ({
        language: lang,
        exists: subs?.some(s => s.language === lang) || false,
        is_reviewed: subs?.find(s => s.language === lang)?.is_reviewed || false,
      })),
    }));
  };

  // Translate video subtitles to 7 languages
  const handleTranslateAll = async (video: VideoLesson) => {
    // Check if Korean subtitle exists first
    const hasKorean = subtitleStatuses[video.id]?.find(s => s.language === 'ko')?.exists;
    if (!hasKorean) {
      toast.error('먼저 한국어(ko) SRT 자막을 업로드해주세요');
      return;
    }

    setTranslatingVideoId(video.id);
    toast.info('🌍 6개 언어 번역 중... (약 30초~1분 소요)');
    
    try {
      const { error, data } = await supabase.functions.invoke('video-translate', {
        body: { video_id: video.id }
      });
      
      if (error) throw error;
      
      const successCount = data?.results 
        ? Object.values(data.results).filter(Boolean).length 
        : 0;
      
      toast.success(`✅ ${successCount}/6 언어 번역 완료!`);
      
      // Immediately refresh subtitle status for this video
      await refreshSubtitleStatus(video.id);
    } catch (err: any) {
      console.error('Translation error:', err);
      toast.error('번역 실패: ' + (err.message || '알 수 없는 오류'));
    } finally {
      setTranslatingVideoId(null);
    }
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

                            {/* Actions - Only working features */}
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openSrtUpload(video)}
                              >
                                <Upload className="w-4 h-4 mr-1" />
                                SRT 업로드
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600"
                                onClick={() => handleTranslateAll(video)}
                                disabled={translatingVideoId === video.id}
                              >
                                {translatingVideoId === video.id ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                    번역 중...
                                  </>
                                ) : (
                                  <>🌍 7개국어 번역</>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/admin/video/${video.id}/subtitles`)}
                              >
                                ✏️ 검수
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

      {/* SRT Upload Dialog */}
      <Dialog open={srtUploadOpen} onOpenChange={setSrtUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              SRT 자막 업로드
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">영상</Label>
              <p className="text-sm text-muted-foreground truncate">{srtUploadVideo?.title}</p>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">언어 선택</Label>
              <Select value={srtLanguage} onValueChange={setSrtLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {lang.toUpperCase()} - {
                        lang === 'ko' ? '한국어' :
                        lang === 'vi' ? 'Tiếng Việt' :
                        lang === 'en' ? 'English' :
                        lang === 'ja' ? '日本語' :
                        lang === 'zh' ? '中文' :
                        lang === 'ru' ? 'Русский' : "O'zbek"
                      }
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">자막 파일 (SRT 또는 VTT)</Label>
              <Input
                type="file"
                accept=".srt,.vtt"
                onChange={(e) => handleSrtFileChange(e.target.files?.[0] || null)}
              />
              {srtFile && (
                <p className="text-xs text-muted-foreground mt-1">
                  선택됨: {srtFile.name}
                </p>
              )}
            </div>

            {/* Preview */}
            {srtPreview.length > 0 && (
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  미리보기 ({srtPreview.length}개 / 전체)
                </Label>
                <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-2 bg-muted/30">
                  {srtPreview.map((sub, idx) => (
                    <div key={idx} className="text-xs border-b border-border/50 pb-1 last:border-0">
                      <span className="text-muted-foreground font-mono">
                        {formatTime(sub.start)} → {formatTime(sub.end)}
                      </span>
                      <p className="mt-0.5">{sub.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Auto translate option */}
            {srtLanguage === 'ko' && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-translate"
                  checked={srtAutoTranslate}
                  onCheckedChange={setSrtAutoTranslate}
                />
                <Label htmlFor="auto-translate" className="text-sm">
                  업로드 후 6개 언어 자동 번역
                </Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSrtUploadOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSrtUpload} disabled={!srtFile || srtUploading}>
              {srtUploading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              {srtAutoTranslate && srtLanguage === 'ko' ? '업로드 + 번역' : '업로드'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
