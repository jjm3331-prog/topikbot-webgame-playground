import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { X, BookmarkPlus, Volume2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface WordPopupProps {
  word: string;
  position: { x: number; y: number };
  onClose: () => void;
  videoId?: string;
}

interface VocabMatch {
  word: string;
  meaning_vi: string | null;
  meaning_en: string | null;
  meaning_ja: string | null;
  meaning_zh: string | null;
  pos: string | null;
  level: number;
}

export default function WordPopup({ word, position, onClose, videoId }: WordPopupProps) {
  const [vocab, setVocab] = useState<VocabMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchMeaning = async () => {
      setLoading(true);
      try {
        // 정확히 일치하는 단어 검색
        const { data, error } = await supabase
          .from('topik_vocabulary')
          .select('word, meaning_vi, meaning_en, meaning_ja, meaning_zh, pos, level')
          .eq('word', word.trim())
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          setVocab(data);
        } else {
          // 부분 일치 검색
          const { data: fuzzy } = await supabase
            .from('topik_vocabulary')
            .select('word, meaning_vi, meaning_en, meaning_ja, meaning_zh, pos, level')
            .ilike('word', `%${word.trim()}%`)
            .limit(1)
            .maybeSingle();
          
          setVocab(fuzzy || null);
        }
      } catch (e) {
        console.error('Error fetching word:', e);
      } finally {
        setLoading(false);
      }
    };

    if (word) fetchMeaning();
  }, [word]);

  const saveToMistakes = async () => {
    if (!vocab || !videoId) return;
    setSaving(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('로그인이 필요합니다');
        return;
      }

      const { error } = await supabase
        .from('video_mistakes')
        .upsert({
          user_id: user.id,
          video_id: videoId,
          word: vocab.word,
          word_meaning: vocab.meaning_vi || vocab.meaning_en || '',
          subtitle_index: 0,
          timestamp_start: 0,
          timestamp_end: 0,
        }, {
          onConflict: 'user_id,video_id,word'
        });

      if (error) throw error;
      toast.success('단어장에 저장했습니다');
    } catch (e) {
      console.error('Error saving word:', e);
      toast.error('저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const speakWord = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'ko-KR';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  // 클릭 위치 기준 팝업 위치 조정
  const popupStyle = {
    left: Math.min(position.x, window.innerWidth - 280),
    top: position.y + 10,
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed z-50 w-64 bg-card border-2 border-primary/30 rounded-xl shadow-2xl overflow-hidden"
        style={popupStyle}
      >
        {/* Header */}
        <div className="bg-primary/10 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary">{word}</span>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={speakWord}>
              <Volume2 className="w-4 h-4" />
            </Button>
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : vocab ? (
            <div className="space-y-3">
              {vocab.pos && (
                <span className="inline-block px-2 py-0.5 bg-muted rounded text-xs font-medium">
                  {vocab.pos}
                </span>
              )}
              
              <div className="space-y-1">
                {vocab.meaning_vi && (
                  <p className="text-sm">🇻🇳 {vocab.meaning_vi}</p>
                )}
                {vocab.meaning_en && (
                  <p className="text-sm">🇺🇸 {vocab.meaning_en}</p>
                )}
                {vocab.meaning_ja && (
                  <p className="text-sm">🇯🇵 {vocab.meaning_ja}</p>
                )}
                {vocab.meaning_zh && (
                  <p className="text-sm">🇨🇳 {vocab.meaning_zh}</p>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                TOPIK Level {vocab.level}
              </div>

              <Button 
                size="sm" 
                className="w-full mt-2" 
                onClick={saveToMistakes}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <BookmarkPlus className="w-4 h-4 mr-2" />
                )}
                단어장에 저장
              </Button>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">
              사전에서 찾을 수 없습니다
            </div>
          )}
        </div>
      </motion.div>

      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />
    </AnimatePresence>
  );
}
