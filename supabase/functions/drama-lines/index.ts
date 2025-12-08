import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { genre, difficulty, excludeIds } = await req.json();
    
    console.log('Generating drama lines for:', { genre, difficulty, excludeIds });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const genrePrompt = genre ? `장르: ${genre}` : '장르: 로맨스, 액션, 판타지, 스릴러, 코미디 중 랜덤';
    const difficultyPrompt = difficulty || '랜덤';

    const systemPrompt = `너는 한국 드라마 전문가야. 유명한 K-Drama의 명대사를 제공해줘.

규칙:
1. 실제 한국 드라마에서 나온 유명한 대사여야 해
2. 대사는 자연스럽고 감정이 담긴 것이어야 해
3. 베트남어 번역은 자연스럽게 (번역투 X)
4. 난이도에 맞는 대사 길이:
   - 쉬움: 5-10음절 (짧은 문장)
   - 보통: 10-20음절 (중간 문장)
   - 어려움: 20음절 이상 (긴 문장이나 복잡한 표현)

반드시 아래 JSON 형식으로만 응답해:
{
  "scenes": [
    {
      "id": "unique_id_1",
      "drama": "드라마 제목 (English Title)",
      "character": "캐릭터 이름",
      "korean": "한국어 대사",
      "vietnamese": "베트남어 번역",
      "context": "어떤 장면에서 나온 대사인지 설명",
      "difficulty": "쉬움/보통/어려움",
      "audioTip": "어떤 감정/톤으로 읽어야 하는지",
      "genre": "romantic/action/fantasy/thriller"
    }
  ]
}`;

    const userPrompt = `${genrePrompt}
난이도: ${difficultyPrompt}
${excludeIds?.length ? `이미 나온 대사 ID (제외): ${excludeIds.join(', ')}` : ''}

새로운 K-Drama 명대사 5개를 생성해줘. 다양한 드라마에서 골고루 선택해줘.
인기 드라마 예시: 도깨비, 별에서 온 그대, 태양의 후예, 사랑의 불시착, 이태원 클라쓰, 킹덤, 오징어 게임, 빈센조, 더 글로리, 무빙, 경이로운 소문, 악의 꽃, 사이코지만 괜찮아, 슬기로운 의사생활, 호텔 델루나, 갯마을 차차차, 스타트업, 마이 네임, 지금 우리 학교는, 수리남, 재벌집 막내아들 등`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error('AI API error');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    console.log('AI response:', content);

    // Parse JSON from response
    let scenes;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      const parsed = JSON.parse(jsonStr);
      scenes = parsed.scenes;
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      // Return fallback scenes
      scenes = getFallbackScenes();
    }

    return new Response(
      JSON.stringify({ scenes }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Drama lines error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Return fallback scenes on error
    return new Response(
      JSON.stringify({ 
        scenes: getFallbackScenes(),
        error: errorMessage 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getFallbackScenes() {
  return [
    {
      id: "fallback_1",
      drama: "도깨비 (Goblin)",
      character: "김신",
      korean: "내가 너의 신부다.",
      vietnamese: "Anh là chú rể của em.",
      context: "도깨비가 은탁에게 처음 말하는 장면",
      difficulty: "쉬움",
      audioTip: "천천히, 감정을 담아서",
      genre: "fantasy"
    },
    {
      id: "fallback_2",
      drama: "사랑의 불시착 (Crash Landing on You)",
      character: "리정혁",
      korean: "당신은 나의 운명입니다.",
      vietnamese: "Em là định mệnh của anh.",
      context: "리정혁이 세리에게 하는 대사",
      difficulty: "보통",
      audioTip: "깊은 감정을 담아서",
      genre: "romantic"
    },
    {
      id: "fallback_3",
      drama: "오징어 게임 (Squid Game)",
      character: "성기훈",
      korean: "나는 깐부잖아.",
      vietnamese: "Tao là Gganbu mà.",
      context: "일남 할아버지와의 게임 중",
      difficulty: "쉬움",
      audioTip: "친근하게, 약간 슬프게",
      genre: "thriller"
    }
  ];
}
