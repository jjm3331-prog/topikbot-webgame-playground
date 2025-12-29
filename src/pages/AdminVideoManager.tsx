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
import { ArrowLeft, Plus, Trash2, Edit, Play, Loader2, Languages, CheckCircle, AlertCircle, Zap, Youtube, Mic, Upload } from 'lucide-react';
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

interface CaptionCheckResult {
  has_captions: boolean;
  available_languages: string[];
  has_korean: boolean;
  caption_type: string | null;
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
  const [generating, setGenerating] = useState<string | null>(null);
  const [translating, setTranslating] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoLesson | null>(null);
  const [subtitleStatuses, setSubtitleStatuses] = useState<Record<string, SubtitleStatus[]>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [captionChecks, setCaptionChecks] = useState<Record<string, CaptionCheckResult | null>>({});
  const [checkingCaptions, setCheckingCaptions] = useState<string | null>(null);
  
  // Progress tracking for chain generation
  const [chainProgress, setChainProgress] = useState<{
    videoId: string;
    step: 'checking' | 'extracting' | 'transcribing' | 'translating' | 'done';
    progress: number;
    message: string;
  } | null>(null);

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

  // Check if YouTube has auto-generated captions
  const handleCheckCaptions = async (video: VideoLesson) => {
    setCheckingCaptions(video.id);
    try {
      const { data, error } = await supabase.functions.invoke('youtube-captions', {
        body: { video_id: video.id, youtube_id: video.youtube_id, check_only: true }
      });

      if (error) throw error;

      setCaptionChecks(prev => ({
        ...prev,
        [video.id]: data as CaptionCheckResult
      }));

      if (data?.has_captions && data?.has_korean) {
        toast.success('✅ 유튜브 자동 자막 발견! 무료로 가져올 수 있습니다.');
      } else {
        toast.info('자동 자막 없음 - Whisper로 생성해야 합니다.');
      }
    } catch (error: any) {
      console.error('Error checking captions:', error);
      toast.error('자막 체크 실패');
    } finally {
      setCheckingCaptions(null);
    }
  };

  // Fetch captions from YouTube (free scraping)
  const handleFetchYouTubeCaptions = async (video: VideoLesson) => {
    setGenerating(video.id);
    setChainProgress({
      videoId: video.id,
      step: 'extracting',
      progress: 30,
      message: '📥 유튜브에서 자막 가져오는 중...'
    });

    try {
      const { data, error } = await supabase.functions.invoke('youtube-captions', {
        body: { video_id: video.id, youtube_id: video.youtube_id }
      });

      if (error) throw error;

      if (data?.use_whisper) {
        // No captions available, need to use Whisper
        toast.info(data.message);
        setChainProgress(null);
        setGenerating(null);
        return;
      }

      setChainProgress({
        videoId: video.id,
        step: 'done',
        progress: 100,
        message: `✅ ${data.message}`
      });

      toast.success(`유튜브 자막 가져오기 완료! (${data.subtitles_count}개)`);
      
      setTimeout(() => setChainProgress(null), 1500);
      fetchVideos();
    } catch (error: any) {
      console.error('Error fetching YouTube captions:', error);
      toast.error(error?.message || '자막 가져오기 실패');
      setChainProgress(null);
    } finally {
      setGenerating(null);
    }
  };

  // Fully automatic: YouTube captions → translate OR Whisper → translate
  const handleGenerateAndTranslate = async (video: VideoLesson) => {
    setGenerating(video.id);
    setChainProgress({
      videoId: video.id,
      step: 'checking',
      progress: 10,
      message: '🔍 유튜브 자막 확인 중...'
    });

    try {
      // Step 1: Check if YouTube has captions
      const { data: captionCheck } = await supabase.functions.invoke('youtube-captions', {
        body: { video_id: video.id, youtube_id: video.youtube_id, check_only: true }
      });

      let subtitlesReady = false;

      if (captionCheck?.has_captions && captionCheck?.has_korean) {
        // Try to fetch YouTube captions (FREE!)
        setChainProgress({
          videoId: video.id,
          step: 'extracting',
          progress: 25,
          message: '📥 유튜브 자막 무료로 가져오는 중...'
        });

        const { data: ytData, error: ytError } = await supabase.functions.invoke('youtube-captions', {
          body: { video_id: video.id, youtube_id: video.youtube_id }
        });

        if (!ytError && ytData?.success) {
          toast.success(`유튜브 자막 가져오기 완료! (무료, ${ytData.subtitles_count}개)`);
          subtitlesReady = true;
        }
      }

      // Step 2: If no YouTube captions, use Whisper
      if (!subtitlesReady) {
        setChainProgress({
          videoId: video.id,
          step: 'transcribing',
          progress: 40,
          message: '🎤 Whisper로 자막 생성 중... (유료)'
        });

        const { data: whisperData, error: whisperError } = await supabase.functions.invoke('video-whisper', {
          body: { video_id: video.id, youtube_id: video.youtube_id }
        });

        if (whisperError) throw whisperError;
        if (whisperData?.error) throw new Error(whisperData.error);

        toast.success(`Whisper 자막 생성 완료! (${whisperData?.subtitles_count}개)`);
      }

      // Step 3: Auto-translate to all languages
      setChainProgress({
        videoId: video.id,
        step: 'translating',
        progress: 70,
        message: '🌍 6개 언어 번역 중...'
      });

      const { error: translateError } = await supabase.functions.invoke('video-translate', {
        body: { video_id: video.id }
      });

      if (translateError) throw translateError;

      setChainProgress({
        videoId: video.id,
        step: 'done',
        progress: 100,
        message: '🎉 자막 생성 + 번역 완료!'
      });

      toast.success('모든 작업 완료!');
      
      setTimeout(() => setChainProgress(null), 2000);
      fetchVideos();
    } catch (error: any) {
      console.error('Error in chain generation:', error);
      toast.error(error?.message || '자막 생성에 실패했습니다');
      setChainProgress(null);
    } finally {
      setGenerating(null);
    }
  };

  // Just generate subtitles (no translation)
  const handleGenerateSubtitlesOnly = async (video: VideoLesson) => {
    setGenerating(video.id);
    setChainProgress({
      videoId: video.id,
      step: 'extracting',
      progress: 20,
      message: '🎵 YouTube에서 오디오 추출 중...'
    });

    try {
      setChainProgress({
        videoId: video.id,
        step: 'transcribing',
        progress: 50,
        message: '🎤 Whisper로 자막 생성 중...'
      });
      
      const { data, error } = await supabase.functions.invoke('video-whisper', {
        body: { video_id: video.id, youtube_id: video.youtube_id }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setChainProgress({
        videoId: video.id,
        step: 'done',
        progress: 100,
        message: '✅ 자막 생성 완료!'
      });

      toast.success(data?.message || '자막이 생성되었습니다');
      
      setTimeout(() => {
        setChainProgress(null);
      }, 1500);
      
      fetchVideos();
    } catch (error: any) {
      console.error('Error generating subtitles:', error);
      const msg = error?.message || '자막 생성에 실패했습니다';
      toast.error(msg);
      setChainProgress(null);
    } finally {
      setGenerating(null);
    }
  };

  const handleTranslate = async (video: VideoLesson) => {
    setTranslating(video.id);
    setChainProgress({
      videoId: video.id,
      step: 'translating',
      progress: 50,
      message: '🌍 6개 언어 번역 중...'
    });

    try {
      const { data, error } = await supabase.functions.invoke('video-translate', {
        body: { video_id: video.id }
      });

      if (error) throw error;
      
      setChainProgress({
        videoId: video.id,
        step: 'done',
        progress: 100,
        message: '✅ 번역 완료!'
      });

      toast.success(data.message);
      
      setTimeout(() => {
        setChainProgress(null);
      }, 1500);
      
      fetchVideos();
    } catch (error) {
      console.error('Error translating:', error);
      toast.error('번역에 실패했습니다');
      setChainProgress(null);
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
    const blocks = content.trim().split(/\n\n+/);

    for (const block of blocks) {
      const lines = block.split('\n').filter(l => l.trim());
      if (lines.length < 2) continue;

      // Find timestamp line (format: 00:00:00,000 --> 00:00:03,240)
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

      // Get text lines (everything after timestamp)
      const timestampIndex = lines.indexOf(timestampLine);
      const textLines = lines.slice(timestampIndex + 1);
      
      // For bilingual SRT, take only the first line (Korean)
      const text = textLines[0]?.trim() || '';
      
      if (text && !text.match(/^\d+$/)) {
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

                            {/* Caption Check Status */}
                            {captionChecks[video.id] && (
                              <div className="mb-3 p-2 rounded-lg bg-muted/50 text-sm">
                                {captionChecks[video.id]?.has_korean ? (
                                  <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                                    <Youtube className="w-4 h-4" />
                                    ✅ 유튜브 자막 있음 (무료 가져오기 가능!)
                                  </span>
                                ) : (
                                  <span className="text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                                    <Mic className="w-4 h-4" />
                                    ⚠️ 유튜브 자막 없음 (Whisper 필요)
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Progress Bar */}
                            {chainProgress?.videoId === video.id && (
                              <div className="mb-3 space-y-2">
                                <div className="flex items-center gap-2">
                                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                  <span className="text-sm font-medium">{chainProgress.message}</span>
                                </div>
                                <Progress value={chainProgress.progress} className="h-2" />
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex flex-wrap gap-2">
                              {/* Check captions first */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCheckCaptions(video)}
                                disabled={checkingCaptions === video.id}
                              >
                                {checkingCaptions === video.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                ) : (
                                  <Youtube className="w-4 h-4 mr-1" />
                                )}
                                자막 체크
                              </Button>

                              {/* If YouTube captions available, show free fetch button */}
                              {captionChecks[video.id]?.has_korean && (
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleFetchYouTubeCaptions(video)}
                                  disabled={generating === video.id}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  {generating === video.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                  ) : (
                                    <Youtube className="w-4 h-4 mr-1" />
                                  )}
                                  🆓 무료 자막
                                </Button>
                              )}

                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleGenerateAndTranslate(video)}
                                disabled={generating === video.id || translating === video.id}
                                className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                              >
                                {generating === video.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                ) : (
                                  <Zap className="w-4 h-4 mr-1" />
                                )}
                                ⚡ 자막+번역
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleGenerateSubtitlesOnly(video)}
                                disabled={generating === video.id}
                                title="Whisper로 자막 생성 (유료)"
                              >
                                {generating === video.id && chainProgress?.step !== 'translating' ? (
                                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                ) : (
                                  <Mic className="w-4 h-4 mr-1" />
                                )}
                                Whisper
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
                                onClick={() => openSrtUpload(video)}
                              >
                                <Upload className="w-4 h-4 mr-1" />
                                SRT
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
              <Label className="text-sm font-medium mb-2 block">SRT 파일</Label>
              <Input
                type="file"
                accept=".srt"
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
