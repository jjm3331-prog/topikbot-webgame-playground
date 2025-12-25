import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 캐싱용 시스템 프롬프트 (고정)
const SYSTEM_PROMPT_WORDS = `당신은 한국어 학습 콘텐츠 추출기입니다.
손글씨 연습에 적합한 한국어 단어를 생성합니다.

## 규칙
- 2-6글자 단어
- 일상적이고 실용적인 단어
- 다양한 받침 포함 (ㄱ, ㄴ, ㄹ, ㅁ, ㅂ, ㅇ 등)

## 응답 형식 (JSON 배열만)
[{"korean": "한국어", "vietnamese": "Tiếng Hàn"}, ...]`;

const SYSTEM_PROMPT_SENTENCES = `당신은 한국어 학습 콘텐츠 추출기입니다.
손글씨 연습에 적합한 한국어 문장을 생성합니다.

## 규칙
- 5-15글자 문장
- 문법적으로 완성된 문장
- 일상적이고 실용적인 표현
- 다양한 문법 패턴 포함

## 응답 형식 (JSON 배열만)
[{"korean": "안녕하세요", "vietnamese": "Xin chào"}, ...]`;

// 폴백 콘텐츠
const FALLBACK_WORDS = [
  { korean: "한국어", vietnamese: "Tiếng Hàn" },
  { korean: "공부", vietnamese: "Học tập" },
  { korean: "연습", vietnamese: "Luyện tập" },
  { korean: "사랑", vietnamese: "Tình yêu" },
  { korean: "행복", vietnamese: "Hạnh phúc" },
  { korean: "친구", vietnamese: "Bạn bè" },
  { korean: "가족", vietnamese: "Gia đình" },
  { korean: "음식", vietnamese: "Đồ ăn" },
  { korean: "여행", vietnamese: "Du lịch" },
  { korean: "문화", vietnamese: "Văn hóa" },
];

const FALLBACK_SENTENCES = [
  { korean: "안녕하세요", vietnamese: "Xin chào" },
  { korean: "감사합니다", vietnamese: "Cảm ơn" },
  { korean: "사랑해요", vietnamese: "Anh/Em yêu bạn" },
  { korean: "오늘 날씨가 좋아요", vietnamese: "Hôm nay thời tiết đẹp" },
  { korean: "한국어를 공부해요", vietnamese: "Tôi học tiếng Hàn" },
  { korean: "맛있게 드세요", vietnamese: "Chúc ngon miệng" },
  { korean: "잘 지내세요?", vietnamese: "Bạn khỏe không?" },
  { korean: "좋은 하루 되세요", vietnamese: "Chúc bạn một ngày tốt lành" },
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
    const skipCache: boolean = body.skipCache ?? false;
    
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!geminiApiKey) {
      console.log('⚠️ GEMINI_API_KEY missing, using fallback content');
      const fallback = type === 'words' ? FALLBACK_WORDS : FALLBACK_SENTENCES;
      const filtered = fallback.filter(item => !exclude.includes(item.korean));
      return new Response(JSON.stringify({ 
        success: true, 
        content: filtered.slice(0, count),
        source: 'fallback'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 캐시 키 생성
    const cacheKey = `handwriting_${type}_${count}`;
    
    // 캐시 확인 (4시간 유효, skipCache가 false이고 exclude가 비어있을 때만)
    if (!skipCache && exclude.length === 0) {
      const { data: cached } = await supabase
        .from('ai_response_cache')
        .select('*')
        .eq('cache_key', cacheKey)
        .eq('function_name', 'handwriting-content')
        .gt('expires_at', new Date().toISOString())
        .limit(1)
        .maybeSingle();

      if (cached) {
        console.log(`⚡ Cache HIT for ${cacheKey}`);
        await supabase.rpc('increment_cache_hit', { p_id: cached.id });
        
        return new Response(JSON.stringify({
          success: true,
          content: cached.response,
          source: 'cache',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.log(`💨 Cache MISS for ${cacheKey}`);
    }

    console.log(`📝 Generating ${count} ${type} for handwriting practice`);

    // Gemini 2.5 Flash로 콘텐츠 생성
    const systemPrompt = type === 'words' ? SYSTEM_PROMPT_WORDS : SYSTEM_PROMPT_SENTENCES;
    const userPrompt = `${count + 5}개의 ${type === 'words' ? '단어' : '문장'}를 생성해주세요.
${exclude.length > 0 ? `다음 항목은 제외하세요: ${exclude.join(', ')}` : ''}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    let extractedContent: { korean: string; vietnamese: string }[] = [];
    try {
      extractedContent = JSON.parse(content);
      if (!Array.isArray(extractedContent)) {
        extractedContent = [];
      }
    } catch {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        extractedContent = JSON.parse(jsonMatch[0]);
      }
    }

    console.log(`✅ Extracted ${extractedContent.length} items`);

    // 제외 목록 필터링 후 반환
    const finalContent = extractedContent
      .filter(item => !exclude.includes(item.korean))
      .slice(0, count);

    // 부족하면 폴백 추가
    if (finalContent.length < count) {
      const fallback = type === 'words' ? FALLBACK_WORDS : FALLBACK_SENTENCES;
      const additional = fallback
        .filter(item => !exclude.includes(item.korean) && !finalContent.some(c => c.korean === item.korean))
        .slice(0, count - finalContent.length);
      finalContent.push(...additional);
    }

    // 캐시에 저장 (4시간 유효, exclude가 비어있을 때만)
    if (exclude.length === 0) {
      const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
      await supabase.from('ai_response_cache').upsert({
        cache_key: cacheKey,
        function_name: 'handwriting-content',
        response: finalContent,
        request_params: { type, count },
        expires_at: expiresAt,
        hit_count: 0,
      }, { onConflict: 'cache_key' });
      console.log(`💾 Cached result for ${cacheKey}`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      content: finalContent,
      source: 'generated',
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
