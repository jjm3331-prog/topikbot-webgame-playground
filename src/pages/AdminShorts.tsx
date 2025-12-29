import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Edit, Loader2, Upload, Globe, CheckCircle, AlertCircle, Tv, Mic, Newspaper, Music, Landmark, Plane } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ShortsVideo {
  id: string;
  youtube_url: string;
  youtube_id: string;
  title: string;
  thumbnail_url: string | null;
  is_published: boolean;
  view_count: number;
  created_at: string;
  category: string;
}

interface SubtitleStatus {
  language: string;
  exists: boolean;
}

const LANGUAGES = ['ko', 'vi', 'en', 'ja', 'zh', 'ru', 'uz'];
const LANGUAGE_FLAGS: Record<string, string> = {
  ko: '🇰🇷', vi: '🇻🇳', en: '🇺🇸', ja: '🇯🇵', zh: '🇨🇳', ru: '🇷🇺', uz: '🇺🇿'
};

// 카테고리 정의 (kdrama + movie 합침, education 삭제)
const CATEGORIES = [
  { id: 'kdrama', label: 'K드라마/영화', icon: Tv },
  { id: 'variety', label: '예능', icon: Mic },
  { id: 'news', label: '뉴스', icon: Newspaper },
  { id: 'kpop', label: 'K팝', icon: Music },
  { id: 'culture', label: '한국 문화', icon: Landmark },
  { id: 'travel', label: '여행', icon: Plane },
];

export default function AdminShorts() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState<ShortsVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [subtitleStatuses, setSubtitleStatuses] = useState<Record<string, SubtitleStatus[]>>({});
  const [translatingId, setTranslatingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({ youtube_url: '', title: '', category: 'kdrama' });
  const [editingVideo, setEditingVideo] = useState<ShortsVideo | null>(null);

  // SRT Upload state
  const [srtDialogOpen, setSrtDialogOpen] = useState(false);
  const [srtVideo, setSrtVideo] = useState<ShortsVideo | null>(null);
  const [srtFile, setSrtFile] = useState<File | null>(null);
  const [srtUploading, setSrtUploading] = useState(false);
  const [srtPreview, setSrtPreview] = useState<Array<{ start: number; end: number; text: string }>>([]);

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
      // 모든 숏츠 카테고리 가져오기
      const { data, error } = await supabase
        .from('video_lessons')
        .select('id, youtube_url, youtube_id, title, thumbnail_url, is_published, view_count, created_at, category')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);

      // Fetch subtitle statuses
      if (data) {
        const statuses: Record<string, SubtitleStatus[]> = {};
        for (const video of data) {
          const { data: subs } = await supabase
            .from('video_subtitles')
            .select('language')
            .eq('video_id', video.id);

          statuses[video.id] = LANGUAGES.map(lang => ({
            language: lang,
            exists: subs?.some(s => s.language === lang) || false,
          }));
        }
        setSubtitleStatuses(statuses);
      }
    } catch (error) {
      console.error('Error fetching shorts:', error);
      toast.error('숏츠 목록 로드 실패');
    } finally {
      setLoading(false);
    }
  };

  const extractYouTubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/shorts\/)([^&\n?#]+)/,
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
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
      toast.error('유효한 YouTube Shorts URL을 입력해주세요');
      return;
    }

    setSaving(true);
    try {
      const videoData = {
        youtube_url: formData.youtube_url,
        youtube_id: youtubeId,
        title: formData.title,
        thumbnail_url: `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
        category: formData.category,
        difficulty: 'intermediate',
        is_published: false,
      };

      if (editingVideo) {
        const { error } = await supabase
          .from('video_lessons')
          .update(videoData)
          .eq('id', editingVideo.id);
        if (error) throw error;
        toast.success('숏츠가 수정되었습니다');
      } else {
        const { error } = await supabase
          .from('video_lessons')
          .insert(videoData);
        if (error) throw error;
        toast.success('숏츠가 등록되었습니다');
      }

      resetForm();
      fetchVideos();
    } catch (error) {
      console.error('Error saving shorts:', error);
      toast.error('저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setEditingVideo(null);
    setFormData({ youtube_url: '', title: '', category: 'kdrama' });
  };

  const handleEdit = (video: ShortsVideo) => {
    setEditingVideo(video);
    setFormData({ youtube_url: video.youtube_url, title: video.title, category: video.category || 'kdrama' });
  };

  const handleDelete = async (video: ShortsVideo) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      const { error } = await supabase.from('video_lessons').delete().eq('id', video.id);
      if (error) throw error;
      toast.success('삭제되었습니다');
      fetchVideos();
    } catch (error) {
      toast.error('삭제 실패');
    }
  };

  const handleTogglePublish = async (video: ShortsVideo) => {
    try {
      const { error } = await supabase
        .from('video_lessons')
        .update({ is_published: !video.is_published })
        .eq('id', video.id);
      if (error) throw error;
      toast.success(video.is_published ? '비공개 처리됨' : '공개됨');
      fetchVideos();
    } catch (error) {
      toast.error('상태 변경 실패');
    }
  };

  // SRT Functions
  const openSrtDialog = (video: ShortsVideo) => {
    setSrtVideo(video);
    setSrtFile(null);
    setSrtPreview([]);
    setSrtDialogOpen(true);
  };

  const parseSRT = (content: string): Array<{ start: number; end: number; text: string }> => {
    const subtitles: Array<{ start: number; end: number; text: string }> = [];
    const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    const blocks = normalized.split(/\n\n+/);

    for (const block of blocks) {
      const lines = block.split(/\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) continue;

      const timestampLine = lines.find(l => l.includes('-->'));
      if (!timestampLine) continue;

      const [startStr, endStr] = timestampLine.split('-->').map(s => s.trim());
      if (!startStr || !endStr) continue;

      const parseTimestamp = (ts: string): number => {
        const match = ts.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
        if (!match) return 0;
        const [, h, m, s, ms] = match;
        return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 1000;
      };

      const start = parseTimestamp(startStr);
      const end = parseTimestamp(endStr);
      const timestampIndex = lines.indexOf(timestampLine);
      const textLines = lines.slice(timestampIndex + 1).filter(l => !/^[0-9]+$/.test(l));
      const text = textLines.join(' ').trim();

      if (text) {
        subtitles.push({ start, end, text });
      }
    }
    return subtitles;
  };

  const handleSrtFileChange = async (file: File | null) => {
    setSrtFile(file);
    if (file) {
      const content = await file.text();
      const parsed = parseSRT(content);
      setSrtPreview(parsed.slice(0, 5));
    } else {
      setSrtPreview([]);
    }
  };

  const handleSrtUpload = async () => {
    if (!srtFile || !srtVideo) return;

    setSrtUploading(true);
    try {
      const content = await srtFile.text();
      const subtitles = parseSRT(content);

      if (subtitles.length === 0) {
        toast.error('SRT 파싱 실패');
        setSrtUploading(false);
        return;
      }

      // 한국어 자막 저장
      const { error } = await supabase
        .from('video_subtitles')
        .upsert({
          video_id: srtVideo.id,
          language: 'ko',
          subtitles: subtitles,
          is_reviewed: false,
        }, { onConflict: 'video_id,language' });

      if (error) throw error;

      toast.success(`${subtitles.length}개 자막 저장 완료!`);
      
      // 자동 번역 시작
      toast.info('🌍 6개 언어 번역 시작...');
      
      const { error: translateError } = await supabase.functions.invoke('video-translate', {
        body: { video_id: srtVideo.id }
      });
      
      if (translateError) {
        console.error('Translation error:', translateError);
        toast.error('번역 실패: ' + translateError.message);
      } else {
        toast.success('✅ 7개국어 번역 완료!');
      }

      setSrtDialogOpen(false);
      fetchVideos();
    } catch (error: any) {
      console.error('SRT upload error:', error);
      toast.error(error.message || 'SRT 업로드 실패');
    } finally {
      setSrtUploading(false);
    }
  };

  // Translate all languages
  const handleTranslateAll = async (video: ShortsVideo) => {
    const hasKorean = subtitleStatuses[video.id]?.find(s => s.language === 'ko')?.exists;
    if (!hasKorean) {
      toast.error('먼저 한국어 SRT를 업로드하세요');
      return;
    }

    setTranslatingId(video.id);
    toast.info('🌍 번역 중...');

    try {
      const { error, data } = await supabase.functions.invoke('video-translate', {
        body: { video_id: video.id }
      });

      if (error) throw error;
      
      const successCount = data?.results 
        ? Object.values(data.results).filter(Boolean).length 
        : 0;
      
      toast.success(`✅ ${successCount}/6 언어 번역 완료!`);
      fetchVideos();
    } catch (err: any) {
      toast.error('번역 실패: ' + (err.message || '알 수 없는 오류'));
    } finally {
      setTranslatingId(null);
    }
  };

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">📱 숏츠 관리</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {editingVideo ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                {editingVideo ? '숏츠 수정' : '새 숏츠 등록'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>YouTube Shorts URL *</Label>
                  <Input
                    value={formData.youtube_url}
                    onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })}
                    placeholder="https://youtube.com/shorts/..."
                    required
                  />
                </div>
                <div>
                  <Label>제목 *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="숏츠 제목"
                    required
                  />
                </div>
                <div>
                  <Label>카테고리 *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="카테고리 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving} className="flex-1">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {editingVideo ? '수정' : '등록'}
                  </Button>
                  {editingVideo && (
                    <Button type="button" variant="outline" onClick={resetForm}>
                      취소
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold">등록된 숏츠 ({videos.length})</h2>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : videos.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                등록된 숏츠가 없습니다
              </Card>
            ) : (
              <div className="space-y-3">
                {videos.map((video) => (
                  <Card key={video.id} className="overflow-hidden">
                    <div className="flex gap-4 p-4">
                      {/* Thumbnail */}
                      <div className="w-24 h-40 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                        <img
                          src={video.thumbnail_url || ''}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-medium truncate">{video.title}</h3>
                          <div className="flex gap-1">
                            <Badge variant="outline" className="text-xs">
                              {CATEGORIES.find(c => c.id === video.category)?.label || video.category}
                            </Badge>
                            <Badge variant={video.is_published ? 'default' : 'secondary'}>
                              {video.is_published ? '공개' : '비공개'}
                            </Badge>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground mb-3">
                          조회수 {video.view_count.toLocaleString()}
                        </p>

                        {/* Subtitle Status */}
                        <div className="flex flex-wrap gap-1 mb-3">
                          {subtitleStatuses[video.id]?.map((status) => (
                            <Badge 
                              key={status.language}
                              variant={status.exists ? 'default' : 'outline'}
                              className="text-xs"
                            >
                              {LANGUAGE_FLAGS[status.language]}
                              {status.exists ? (
                                <CheckCircle className="w-3 h-3 ml-1" />
                              ) : (
                                <AlertCircle className="w-3 h-3 ml-1 opacity-50" />
                              )}
                            </Badge>
                          ))}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openSrtDialog(video)}
                          >
                            <Upload className="w-4 h-4 mr-1" />
                            SRT 업로드
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTranslateAll(video)}
                            disabled={translatingId === video.id}
                          >
                            {translatingId === video.id ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <Globe className="w-4 h-4 mr-1" />
                            )}
                            번역
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTogglePublish(video)}
                          >
                            {video.is_published ? '비공개' : '공개'}
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
          </div>
        </div>
      </div>

      {/* SRT Upload Dialog */}
      <Dialog open={srtDialogOpen} onOpenChange={setSrtDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>🇰🇷 한국어 SRT 업로드</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              한국어 SRT 파일을 업로드하면 자동으로 6개 언어로 번역됩니다.
            </p>
            
            <div>
              <Label>SRT 파일 선택</Label>
              <Input
                type="file"
                accept=".srt,.vtt"
                onChange={(e) => handleSrtFileChange(e.target.files?.[0] || null)}
              />
            </div>

            {srtPreview.length > 0 && (
              <div className="bg-muted rounded-lg p-3 max-h-48 overflow-y-auto">
                <p className="text-xs text-muted-foreground mb-2">미리보기 (처음 5개)</p>
                {srtPreview.map((sub, idx) => (
                  <div key={idx} className="text-sm mb-2">
                    <span className="text-primary font-mono text-xs">
                      {formatTime(sub.start)} → {formatTime(sub.end)}
                    </span>
                    <p className="mt-0.5">{sub.text}</p>
                  </div>
                ))}
              </div>
            )}

            <Button 
              onClick={handleSrtUpload} 
              disabled={!srtFile || srtUploading}
              className="w-full"
            >
              {srtUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  업로드 및 번역 중...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  업로드 + 7개국어 번역
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
