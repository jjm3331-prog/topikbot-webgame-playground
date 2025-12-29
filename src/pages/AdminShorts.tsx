import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Edit, Loader2, Upload, CheckCircle, AlertCircle, Tv, Mic, Newspaper, Music, Landmark, Plane, FileText } from 'lucide-react';
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

// 카테고리 정의
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
  const [scriptStatuses, setScriptStatuses] = useState<Record<string, boolean>>({});

  // Form state
  const [formData, setFormData] = useState({ youtube_url: '', title: '', category: 'kdrama' });
  const [editingVideo, setEditingVideo] = useState<ShortsVideo | null>(null);

  // Script Upload state
  const [scriptDialogOpen, setScriptDialogOpen] = useState(false);
  const [scriptVideo, setScriptVideo] = useState<ShortsVideo | null>(null);
  const [scriptFile, setScriptFile] = useState<File | null>(null);
  const [scriptText, setScriptText] = useState('');
  const [scriptUploading, setScriptUploading] = useState(false);

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
        .select('id, youtube_url, youtube_id, title, thumbnail_url, is_published, view_count, created_at, category')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);

      // Fetch script statuses (check if Korean script exists)
      if (data) {
        const statuses: Record<string, boolean> = {};
        for (const video of data) {
          const { data: subs } = await supabase
            .from('video_subtitles')
            .select('language')
            .eq('video_id', video.id)
            .eq('language', 'ko')
            .single();

          statuses[video.id] = !!subs;
        }
        setScriptStatuses(statuses);
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
      // Delete subtitles first
      await supabase.from('video_subtitles').delete().eq('video_id', video.id);
      // Delete video
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

  // Script Functions
  const openScriptDialog = async (video: ShortsVideo) => {
    setScriptVideo(video);
    setScriptFile(null);
    setScriptText('');
    setScriptDialogOpen(true);

    // Load existing script if available
    const { data } = await supabase
      .from('video_subtitles')
      .select('subtitles')
      .eq('video_id', video.id)
      .eq('language', 'ko')
      .single();

    if (data?.subtitles) {
      // Convert subtitles array to plain text
      const subtitles = data.subtitles as Array<{ text?: string }>;
      const text = subtitles.map(s => s.text || '').filter(Boolean).join('\n');
      setScriptText(text);
    }
  };

  // Parse text content - works for both SRT and plain TXT
  const parseTextContent = (content: string): Array<{ start: number; end: number; text: string }> => {
    // Check if it's SRT format
    const hasSrtTimestamps = content.includes('-->');
    
    if (hasSrtTimestamps) {
      // Parse as SRT
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
    } else {
      // Parse as plain text - each line or paragraph becomes a segment
      const lines = content.split(/\n+/).map(l => l.trim()).filter(Boolean);
      return lines.map((text, idx) => ({
        start: idx * 5, // Assign dummy timestamps (5 seconds apart)
        end: (idx + 1) * 5,
        text
      }));
    }
  };

  const handleFileChange = async (file: File | null) => {
    setScriptFile(file);
    if (file) {
      const content = await file.text();
      setScriptText(content);
    }
  };

  const handleScriptUpload = async () => {
    if (!scriptText.trim() || !scriptVideo) return;

    setScriptUploading(true);
    try {
      const parsed = parseTextContent(scriptText);

      if (parsed.length === 0) {
        toast.error('스크립트 파싱 실패 - 내용을 확인해주세요');
        setScriptUploading(false);
        return;
      }

      // Save Korean script
      const { error } = await supabase
        .from('video_subtitles')
        .upsert({
          video_id: scriptVideo.id,
          language: 'ko',
          subtitles: parsed,
          is_reviewed: true,
        }, { onConflict: 'video_id,language' });

      if (error) throw error;

      // Clear old cache for this video (so AI regenerates learning content)
      await supabase
        .from('ai_response_cache')
        .delete()
        .like('cache_key', `shorts-learning-%${scriptVideo.id}%`);

      toast.success(`✅ ${parsed.length}줄 스크립트 저장 완료! AI가 학습 콘텐츠를 생성할 준비가 되었습니다.`);
      
      setScriptDialogOpen(false);
      fetchVideos();
    } catch (error: any) {
      console.error('Script upload error:', error);
      toast.error(error.message || '스크립트 업로드 실패');
    } finally {
      setScriptUploading(false);
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

                        {/* Script Status */}
                        <div className="flex items-center gap-2 mb-3">
                          <Badge 
                            variant={scriptStatuses[video.id] ? 'default' : 'outline'}
                            className="gap-1"
                          >
                            <FileText className="w-3 h-3" />
                            스크립트
                            {scriptStatuses[video.id] ? (
                              <CheckCircle className="w-3 h-3 ml-1" />
                            ) : (
                              <AlertCircle className="w-3 h-3 ml-1 opacity-50" />
                            )}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {scriptStatuses[video.id] ? 'AI 학습 준비 완료' : '스크립트 업로드 필요'}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openScriptDialog(video)}
                          >
                            <Upload className="w-4 h-4 mr-1" />
                            {scriptStatuses[video.id] ? '스크립트 수정' : '스크립트 업로드'}
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

      {/* Script Upload Dialog */}
      <Dialog open={scriptDialogOpen} onOpenChange={setScriptDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>📝 스크립트 업로드</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-muted/50 border border-border">
              <h4 className="font-medium mb-2">💡 스크립트 사용 안내</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 이 스크립트는 AI가 학습 콘텐츠를 생성할 때 참고 자료로 사용됩니다</li>
                <li>• <strong>SRT 파일</strong> 또는 <strong>일반 텍스트(TXT)</strong> 모두 지원됩니다</li>
                <li>• 타임스탬프 없이 대화 내용만 입력해도 됩니다</li>
                <li>• 비문이나 불완전한 문장도 AI가 정리해서 학습 콘텐츠로 만듭니다</li>
              </ul>
            </div>
            
            <div>
              <Label>파일 업로드 (SRT 또는 TXT)</Label>
              <Input
                type="file"
                accept=".srt,.vtt,.txt"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                className="mt-1"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>스크립트 내용</Label>
                <span className="text-xs text-muted-foreground">
                  {scriptText.split('\n').filter(l => l.trim()).length}줄
                </span>
              </div>
              <Textarea
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                placeholder={`영상의 대화 내용을 입력하세요...

예시:
아 진짜 이거 너무 맛있다
노량진에서 회를 먹었는데요
진짜 이렇게 먹고 있었어요

또는 SRT 형식:
1
00:00:01,000 --> 00:00:03,000
아 진짜 이거 너무 맛있다`}
                className="min-h-[250px] font-mono text-sm"
              />
            </div>

            <Button 
              onClick={handleScriptUpload} 
              disabled={!scriptText.trim() || scriptUploading}
              className="w-full"
            >
              {scriptUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  스크립트 저장
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
