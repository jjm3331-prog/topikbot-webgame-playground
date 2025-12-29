import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 폴백 콘텐츠 (DB 연결 실패 시)
const FALLBACK_WORDS = [
  { korean: "한국어", vietnamese: "Tiếng Hàn", english: "Korean" },
  { korean: "공부", vietnamese: "Học tập", english: "Study" },
  { korean: "연습", vietnamese: "Luyện tập", english: "Practice" },
  { korean: "사랑", vietnamese: "Tình yêu", english: "Love" },
  { korean: "행복", vietnamese: "Hạnh phúc", english: "Happiness" },
  { korean: "친구", vietnamese: "Bạn bè", english: "Friend" },
  { korean: "가족", vietnamese: "Gia đình", english: "Family" },
  { korean: "음식", vietnamese: "Đồ ăn", english: "Food" },
  { korean: "여행", vietnamese: "Du lịch", english: "Travel" },
  { korean: "문화", vietnamese: "Văn hóa", english: "Culture" },
];

const FALLBACK_SENTENCES = [
  { korean: "안녕하세요", vietnamese: "Xin chào", english: "Hello" },
  { korean: "감사합니다", vietnamese: "Cảm ơn", english: "Thank you" },
  { korean: "사랑해요", vietnamese: "Anh/Em yêu bạn", english: "I love you" },
  { korean: "오늘 날씨가 좋아요", vietnamese: "Hôm nay thời tiết đẹp", english: "The weather is nice today" },
  { korean: "한국어를 공부해요", vietnamese: "Tôi học tiếng Hàn", english: "I study Korean" },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  type ContentType = 'words' | 'sentences';

  try {
    const body = await req.json();
    const type: ContentType = body.type === 'sentences' ? 'sentences' : 'words';
    const count: number = body.count ?? 10;
    const exclude: string[] = body.exclude ?? [];
    const level: number = body.level ?? 0; // 0 = all levels
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`📝 Fetching ${count} ${type} from DB (level: ${level}, exclude: ${exclude.length})`);

    if (type === 'words') {
      // 단어: topik_vocabulary 테이블에서 가져오기
      let query = supabase
        .from('topik_vocabulary')
        .select('id, word, meaning_vi, meaning_en, level')
        .not('word', 'is', null);
      
      // 레벨 필터
      if (level > 0) {
        query = query.eq('level', level);
      }
      
      // 더 많이 가져와서 랜덤 선택
      const { data: vocabData, error } = await query.limit(200);
      
      if (error) {
        console.error('DB query error:', error);
        throw error;
      }
      
      if (vocabData && vocabData.length > 0) {
        // 제외 목록 필터링
        let filtered = vocabData.filter(v => !exclude.includes(v.word));
        
        // 2-6글자 단어만 (손글씨 연습에 적합)
        filtered = filtered.filter(v => v.word.length >= 2 && v.word.length <= 6);
        
        // 랜덤 셔플 후 선택
        const shuffled = filtered.sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, count);
        
        const content = selected.map(v => ({
          korean: v.word,
          vietnamese: v.meaning_vi || v.meaning_en || '',
          english: v.meaning_en || '',
          level: v.level,
        }));
        
        console.log(`✅ DB: ${content.length}/${vocabData.length} words selected`);
        
        return new Response(JSON.stringify({ 
          success: true, 
          content,
          source: 'database',
          total: vocabData.length,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      // 문장: topik_vocabulary의 example_sentence 사용
      let query = supabase
        .from('topik_vocabulary')
        .select('id, word, example_sentence, example_sentence_vi, meaning_vi, meaning_en, level')
        .not('example_sentence', 'is', null);
      
      // 레벨 필터
      if (level > 0) {
        query = query.eq('level', level);
      }
      
      const { data: sentenceData, error } = await query.limit(100);
      
      if (error) {
        console.error('DB query error:', error);
        throw error;
      }
      
      if (sentenceData && sentenceData.length > 0) {
        // 제외 목록 필터링
        let filtered = sentenceData.filter(s => 
          s.example_sentence && !exclude.includes(s.example_sentence)
        );
        
        // 5-20글자 문장만 (손글씨 연습에 적합)
        filtered = filtered.filter(s => {
          const len = s.example_sentence?.length || 0;
          return len >= 5 && len <= 20;
        });
        
        // 랜덤 셔플 후 선택
        const shuffled = filtered.sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, count);
        
        const content = selected.map(s => ({
          korean: s.example_sentence!,
          vietnamese: s.example_sentence_vi || s.meaning_vi || '',
          english: s.meaning_en || '',
          level: s.level,
          word: s.word, // 관련 단어
        }));
        
        console.log(`✅ DB: ${content.length}/${sentenceData.length} sentences selected`);
        
        return new Response(JSON.stringify({ 
          success: true, 
          content,
          source: 'database',
          total: sentenceData.length,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // DB에서 데이터를 못 찾으면 폴백
    console.log('⚠️ No DB data found, using fallback');
    const fallback = type === 'words' ? FALLBACK_WORDS : FALLBACK_SENTENCES;
    const filtered = fallback.filter(item => !exclude.includes(item.korean));
    
    return new Response(JSON.stringify({ 
      success: true, 
      content: filtered.slice(0, count),
      source: 'fallback'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Handwriting content error:', error);
    
    // 에러 시 폴백
    const fallback = FALLBACK_WORDS.slice(0, 10);
    return new Response(JSON.stringify({ 
      success: true, 
      content: fallback,
      source: 'fallback',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
