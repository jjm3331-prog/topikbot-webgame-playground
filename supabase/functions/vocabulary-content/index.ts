import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TOPIK 급수별 어휘 가이드라인
const TOPIK_VOCAB_GUIDELINES: Record<string, string> = {
  "1-2": `[TOPIK 1-2급 어휘 가이드라인]
수준: 기초 어휘 800~1500개
카테고리:
- 일상생활: 가족, 음식, 날씨, 시간, 장소, 쇼핑
- 기본 동사: 가다, 오다, 먹다, 마시다, 자다, 일어나다
- 기본 형용사: 좋다, 크다, 작다, 많다, 예쁘다
- 숫자, 요일, 색깔
예시: 학교, 친구, 음식, 사과, 커피, 책, 가방`,

  "3-4": `[TOPIK 3-4급 어휘 가이드라인]
수준: 중급 어휘 3000~5000개
카테고리:
- 사회생활: 직장, 교육, 건강, 환경, 경제
- 추상 개념: 경험, 문화, 관계, 발전, 변화
- 한자어: 학생(學生), 회사(會社), 시간(時間)
- 관용 표현: ~에 따르면, ~에 비해, ~를 통해
예시: 경험, 문화, 환경, 발전, 관계, 정보, 기회`,

  "5-6": `[TOPIK 5-6급 어휘 가이드라인]
수준: 고급 어휘 6000개 이상
카테고리:
- 학술/전문: 지속가능성, 패러다임, 인프라, 메커니즘
- 추상 개념: 본질, 함의, 맥락, 전제, 귀결, 타당성
- 사회/정치: 양극화, 담론, 인식, 관점, 논거
- 관용어/속담: 빈 수레가 요란하다, 물의를 일으키다
예시: 지속가능성, 패러다임, 양극화, 본질, 함의, 맥락`,
};

// 카테고리 목록 (랜덤 선택용)
const VOCAB_CATEGORIES: Record<string, string[]> = {
  "1-2": [
    "가족과 관계 (gia đình)",
    "음식과 요리 (đồ ăn)",
    "날씨와 계절 (thời tiết)",
    "쇼핑과 물건 (mua sắm)",
    "교통과 장소 (giao thông)",
    "학교와 공부 (trường học)",
    "취미와 운동 (sở thích)",
    "직업과 일 (nghề nghiệp)",
    "신체와 건강 (cơ thể)",
    "색깔과 모양 (màu sắc)",
    "숫자와 시간 (số và thời gian)",
    "기본 동사 (động từ cơ bản)",
    "기본 형용사 (tính từ cơ bản)",
    "집과 가구 (nhà cửa)",
    "옷과 패션 (quần áo)",
  ],
  "3-4": [
    "사회와 문화 (xã hội)",
    "경제와 금융 (kinh tế)",
    "환경과 자연 (môi trường)",
    "기술과 과학 (công nghệ)",
    "건강과 의료 (y tế)",
    "교육과 학문 (giáo dục)",
    "예술과 미디어 (nghệ thuật)",
    "정치와 법률 (chính trị)",
    "심리와 감정 (tâm lý)",
    "비즈니스 용어 (kinh doanh)",
    "추상 개념 (khái niệm trừu tượng)",
    "한자어 (từ Hán)",
    "관용 표현 (thành ngữ)",
    "직장 생활 (công sở)",
    "국제 관계 (quan hệ quốc tế)",
  ],
  "5-6": [
    "학술 용어 (thuật ngữ học thuật)",
    "철학과 사상 (triết học)",
    "사회 문제 (vấn đề xã hội)",
    "고급 추상어 (từ trừu tượng cao cấp)",
    "전문 분야 (chuyên ngành)",
    "정치 담론 (diễn ngôn chính trị)",
    "경제 분석 (phân tích kinh tế)",
    "과학 연구 (nghiên cứu khoa học)",
    "법률 용어 (thuật ngữ pháp lý)",
    "문학 표현 (biểu đạt văn học)",
    "속담과 격언 (tục ngữ)",
    "고급 한자어 (từ Hán nâng cao)",
    "비판적 사고 (tư duy phản biện)",
    "학문적 글쓰기 (viết học thuật)",
    "미디어 담론 (diễn ngôn truyền thông)",
  ],
};

// Gemini로 어휘 생성 (중복 방지 기능 강화)
async function generateVocabulary(
  count: number,
  geminiApiKey: string,
  topikLevel: string,
  excludeWords: string[],
  sessionId: string
): Promise<any[]> {
  const guideline = TOPIK_VOCAB_GUIDELINES[topikLevel] || TOPIK_VOCAB_GUIDELINES["1-2"];
  const categories = VOCAB_CATEGORIES[topikLevel] || VOCAB_CATEGORIES["1-2"];
  
  // 랜덤으로 2-3개 카테고리 선택
  const shuffledCategories = categories.sort(() => Math.random() - 0.5);
  const selectedCategories = shuffledCategories.slice(0, 3);
  
  // 제외할 단어 목록 (최근 100개만)
  const recentExcluded = excludeWords.slice(-100);
  const excludeList = recentExcluded.length > 0 
    ? `\n\n⚠️ 절대 사용하지 말아야 할 단어 (이미 학습함):\n${recentExcluded.join(', ')}`
    : '';

  // 랜덤 시드 생성
  const randomSeed = Math.random().toString(36).substring(2, 10);

  const prompt = `당신은 TOPIK(한국어능력시험) 어휘 전문가입니다.
베트남어 학습자를 위한 한국어 단어 ${count}개를 생성하세요.

세션 ID: ${sessionId}
랜덤 시드: ${randomSeed}

${guideline}

🎯 이번에 집중할 카테고리:
${selectedCategories.map((c, i) => `${i + 1}. ${c}`).join('\n')}

${excludeList}

[필수 요구사항]
1. 각 단어는 반드시 다음 JSON 형식:
{
  "id": 숫자,
  "korean": "한국어 단어",
  "meaning": "베트남어 뜻",
  "pronunciation": "발음 가이드 (선택)",
  "example": "예문 (한국어)",
  "exampleMeaning": "예문 뜻 (베트남어)"
}

2. 중요 규칙:
- 반드시 ${topikLevel}급 수준에 맞는 단어 선택
- 위에서 지정한 카테고리에서 단어 선택
- 베트남어 번역은 정확하고 자연스럽게
- 예문은 일상에서 자주 사용하는 문장으로
- ⚠️ 절대로 제외 목록에 있는 단어를 포함하지 마세요!
- 완전히 새로운 단어만 생성하세요

3. 베트남어 번역 품질:
- 단순한 사전 번역이 아닌 실제 사용되는 표현
- 뉘앙스를 정확히 전달

반드시 JSON 배열만 반환하세요. ${count}개의 단어를 모두 포함하세요.`;

  const xaiApiKey = Deno.env.get('X_AI_API_KEY');
  if (!xaiApiKey) {
    throw new Error('X_AI_API_KEY not configured');
  }

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${xaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'grok-4.1-fast-non-reasoning',
      messages: [
        {
          role: 'system',
          content: `당신은 TOPIK ${topikLevel}급 한국어 어휘 교육 전문가입니다. 반드시 JSON 배열 형식으로만 응답하세요.`
        },
        { role: 'user', content: prompt }
      ],
      temperature: 1.2,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('xAI API error:', response.status, errText);
    throw new Error(`xAI API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      const words = JSON.parse(jsonMatch[0]);
      // 중복 필터링 (이중 체크)
      const filteredWords = words.filter((w: any) => 
        !excludeWords.includes(w.korean)
      );
      return filteredWords;
    } catch (e) {
      console.error('JSON parse error:', e);
    }
  }
  
  return [];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      count = 12, 
      topikLevel = '1-2', 
      sessionId = '', 
      excludeWords = [],
      forceNew = false 
    } = await req.json();
    
    console.log(`📚 Vocabulary Content: level=${topikLevel}, count=${count}, session=${sessionId}, excluded=${excludeWords.length}`);

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    if (!geminiApiKey) {
      console.error('Missing GEMINI_API_KEY');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'API key not configured',
        words: [] 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // forceNew가 true이거나 excludeWords가 있으면 항상 새로 생성
    const shouldGenerateNew = forceNew || excludeWords.length > 0;

    if (!shouldGenerateNew) {
      // 캐시에서 여러 세트 중 하나를 랜덤 선택
      const { data: cachedList } = await supabase
        .from('ai_response_cache')
        .select('*')
        .eq('function_name', 'vocabulary-content')
        .like('cache_key', `vocabulary_${topikLevel}_%`)
        .gt('expires_at', new Date().toISOString())
        .limit(5);

      if (cachedList && cachedList.length > 0) {
        // 랜덤으로 하나 선택
        const randomIndex = Math.floor(Math.random() * cachedList.length);
        const cached = cachedList[randomIndex];
        
        console.log(`⚡ Cache HIT (random selection from ${cachedList.length} sets)`);
        await supabase.rpc('increment_cache_hit', { p_id: cached.id });
        
        return new Response(JSON.stringify({
          success: true,
          words: cached.response,
          topikLevel,
          source: 'cache',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // 새 단어 생성
    const uniqueSessionId = sessionId || crypto.randomUUID();
    console.log(`📝 Generating NEW ${count} vocabulary words for TOPIK ${topikLevel}`);
    
    const words = await generateVocabulary(
      count, 
      geminiApiKey, 
      topikLevel, 
      excludeWords,
      uniqueSessionId
    );
    
    console.log(`✨ Generated ${words.length} words`);

    // 새 캐시 키 생성 (타임스탬프 포함으로 여러 세트 저장)
    const timestamp = Date.now();
    const cacheKey = `vocabulary_${topikLevel}_${timestamp}`;
    
    // 캐시에 저장 (1시간 유효)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await supabase.from('ai_response_cache').insert({
      cache_key: cacheKey,
      function_name: 'vocabulary-content',
      response: words,
      request_params: { count, topikLevel, sessionId: uniqueSessionId },
      expires_at: expiresAt,
      hit_count: 0,
    });
    console.log(`💾 Cached result for ${cacheKey}`);

    // 오래된 캐시 정리 (같은 레벨의 10개 이상 캐시가 있으면 오래된 것 삭제)
    const { data: oldCaches } = await supabase
      .from('ai_response_cache')
      .select('id, created_at')
      .eq('function_name', 'vocabulary-content')
      .like('cache_key', `vocabulary_${topikLevel}_%`)
      .order('created_at', { ascending: true });

    if (oldCaches && oldCaches.length > 10) {
      const toDelete = oldCaches.slice(0, oldCaches.length - 10);
      for (const cache of toDelete) {
        await supabase.from('ai_response_cache').delete().eq('id', cache.id);
      }
      console.log(`🧹 Cleaned up ${toDelete.length} old caches`);
    }

    return new Response(JSON.stringify({
      success: true,
      words,
      topikLevel,
      source: 'generated',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Vocabulary content error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      words: [],
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
