import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { BookOpen, Trash2, CheckCircle, Play, Search, Loader2 } from 'lucide-react';

interface VideoMistake {
  id: string;
  video_id: string;
  subtitle_index: number;
  word: string;
  word_meaning: string | null;
  context_sentence: string | null;
  timestamp_start: number;
  timestamp_end: number;
  mistake_count: number;
  mastered: boolean;
  notes: string | null;
  created_at: string;
  video_lessons?: {
    title: string;
    youtube_id: string;
  };
}

interface VideoMistakeNoteProps {
  videoId?: string;
  onSeekTo?: (time: number) => void;
}

export default function VideoMistakeNote({ videoId, onSeekTo }: VideoMistakeNoteProps) {
  const { t } = useTranslation();
  const [mistakes, setMistakes] = useState<VideoMistake[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unmastered' | 'mastered'>('all');

  useEffect(() => {
    fetchMistakes();
  }, [videoId]);

  const fetchMistakes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      let query = supabase
        .from('video_mistakes')
        .select(`
          *,
          video_lessons (
            title,
            youtube_id
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (videoId) {
        query = query.eq('video_id', videoId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMistakes(data || []);
    } catch (error) {
      console.error('Error fetching mistakes:', error);
      toast.error('오답노트를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMastered = async (mistake: VideoMistake) => {
    try {
      const { error } = await supabase
        .from('video_mistakes')
        .update({ mastered: !mistake.mastered })
        .eq('id', mistake.id);

      if (error) throw error;
      
      setMistakes(prev => 
        prev.map(m => m.id === mistake.id ? { ...m, mastered: !m.mastered } : m)
      );
      toast.success(mistake.mastered ? '다시 학습 목록에 추가되었습니다' : '학습 완료 처리되었습니다');
    } catch (error) {
      console.error('Error updating mistake:', error);
      toast.error('업데이트에 실패했습니다');
    }
  };

  const handleUpdateNotes = async (mistake: VideoMistake, notes: string) => {
    try {
      const { error } = await supabase
        .from('video_mistakes')
        .update({ notes })
        .eq('id', mistake.id);

      if (error) throw error;
      
      setMistakes(prev => 
        prev.map(m => m.id === mistake.id ? { ...m, notes } : m)
      );
    } catch (error) {
      console.error('Error updating notes:', error);
    }
  };

  const handleDelete = async (mistake: VideoMistake) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase
        .from('video_mistakes')
        .delete()
        .eq('id', mistake.id);

      if (error) throw error;
      
      setMistakes(prev => prev.filter(m => m.id !== mistake.id));
      toast.success('삭제되었습니다');
    } catch (error) {
      console.error('Error deleting mistake:', error);
      toast.error('삭제에 실패했습니다');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredMistakes = mistakes.filter(m => {
    // Apply filter
    if (filter === 'mastered' && !m.mastered) return false;
    if (filter === 'unmastered' && m.mastered) return false;
    
    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        m.word.toLowerCase().includes(query) ||
        m.word_meaning?.toLowerCase().includes(query) ||
        m.context_sentence?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("video.mistake.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            {t("video.mistake.filterAll")} ({mistakes.length})
          </Button>
          <Button
            variant={filter === 'unmastered' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('unmastered')}
          >
            {t("video.mistake.filterLearning")} ({mistakes.filter(m => !m.mastered).length})
          </Button>
          <Button
            variant={filter === 'mastered' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('mastered')}
          >
            {t("video.mistake.filterComplete")} ({mistakes.filter(m => m.mastered).length})
          </Button>
        </div>
      </div>

      {/* Mistake List */}
      {filteredMistakes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>
              {mistakes.length === 0 
                ? t("video.mistake.noSavedWords")
                : t("video.mistake.noSearchResults")
              }
            </p>
            <p className="text-sm mt-2">
              {t("video.mistake.clickToSave")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredMistakes.map((mistake) => (
            <Card 
              key={mistake.id} 
              className={`transition-all ${mistake.mastered ? 'opacity-60 bg-muted/30' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Word Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-lg">{mistake.word}</h3>
                      {mistake.mastered && (
                        <Badge variant="secondary" className="text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {t("video.mistake.complete")}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {t("video.mistake.wrongCount", { count: mistake.mistake_count })}
                      </Badge>
                    </div>

                    {mistake.word_meaning && (
                      <p className="text-muted-foreground mb-2">
                        {mistake.word_meaning}
                      </p>
                    )}

                    {mistake.context_sentence && (
                      <div className="p-2 bg-muted rounded-lg mb-2">
                        <p className="text-sm italic">"{mistake.context_sentence}"</p>
                      </div>
                    )}

                    {/* Video Info (when showing all videos) */}
                    {!videoId && mistake.video_lessons && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>📺 {mistake.video_lessons.title}</span>
                        <span>•</span>
                        <span>{formatTime(mistake.timestamp_start)}</span>
                      </div>
                    )}

                    {/* Notes */}
                    <Textarea
                      placeholder={t("video.mistake.addNote")}
                      value={mistake.notes || ''}
                      onChange={(e) => handleUpdateNotes(mistake, e.target.value)}
                      className="mt-2 text-sm min-h-[60px]"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    {onSeekTo && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onSeekTo(mistake.timestamp_start)}
                        title={t('video.mistake.viewInVideo')}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={mistake.mastered ? 'outline' : 'default'}
                      onClick={() => handleToggleMastered(mistake)}
                      title={mistake.mastered ? t('video.mistake.reviewAgain') : t('video.mistake.markComplete')}
                    >
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleDelete(mistake)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
