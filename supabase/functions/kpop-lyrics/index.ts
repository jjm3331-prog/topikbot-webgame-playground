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
    const { difficulty, excludeIds } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Generating K-POP lyrics for:', { difficulty, excludeIds });

    const difficultyGuide = difficulty === '쉬움' 
      ? '초급자용: 기본 단어 1개 빈칸'
      : difficulty === '보통'
        ? '중급자용: 일상 단어 1-2개 빈칸'
        : '고급자용: 어려운 표현 2개 빈칸';

    const excludeList = excludeIds?.length > 0 
      ? `다음 ID들은 이미 사용했으니 제외해줘: ${excludeIds.join(', ')}`
      : '';

    const systemPrompt = `너는 K-POP 전문가이자 한국어 교육 전문가야.
유명한 K-POP 노래를 활용한 빈칸 채우기 문제를 만들어줘.

규칙:
1. 실제 존재하는 유명 K-POP 노래만 사용 (BTS, BLACKPINK, IU, aespa, NewJeans, TWICE, EXO 등)
2. youtubeId는 해당 노래의 공식 뮤직비디오 YouTube ID (11자리)
3. 빈칸은 ___로 표시, 빈칸 단어는 짧게 (1-3단어)
4. ${difficultyGuide}
${excludeList}

반드시 아래 JSON 형식으로만 응답해:
{
  "questions": [
    {
      "id": "고유ID",
      "artist": "아티스트명",
      "song": "노래 제목",
      "youtubeId": "실제YouTube영상ID",
      "timestamp": 재생시작초,
      "lyricLine": "빈칸 포함된 한 줄 가사",
      "answer": "정답",
      "hint": "힌트",
      "difficulty": "쉬움/보통/어려움",
      "points": 10-30
    }
  ]
}

예시 youtubeId:
- BTS Dynamite: qpjLMVcYfxI (공식 MV)
- NewJeans Hype Boy: 11cta61wi0g
- BLACKPINK DDU-DU DDU-DU: IHNzOHi8sJs
- aespa Next Level: 4TWR90KJl84`;

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
          { role: 'user', content: `K-POP 가사 빈칸 채우기 문제 5개를 만들어줘. 난이도: ${difficulty || '보통'}` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error('AI Gateway error');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('AI response:', content);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('K-POP lyrics error:', error);
    
    // Fallback with real YouTube IDs
    const fallback = {
      questions: [
        {
          id: "bts_dynamite_1",
          artist: "BTS",
          song: "Dynamite",
          youtubeId: "qpjLMVcYfxI",
          timestamp: 45,
          lyricLine: "So I'mma light it up like ___",
          answer: "dynamite",
          hint: "노래 제목과 같아요!",
          difficulty: "쉬움",
          points: 10
        },
        {
          id: "newjeans_hype_1",
          artist: "NewJeans",
          song: "Hype Boy",
          youtubeId: "11cta61wi0g",
          timestamp: 30,
          lyricLine: "I just wanna be your ___",
          answer: "hype boy",
          hint: "노래 제목!",
          difficulty: "쉬움",
          points: 10
        },
        {
          id: "aespa_next_1",
          artist: "aespa",
          song: "Next Level",
          youtubeId: "4TWR90KJl84",
          timestamp: 55,
          lyricLine: "I'm on the ___ Level",
          answer: "Next",
          hint: "다음 단계",
          difficulty: "쉬움",
          points: 10
        }
      ]
    };

    return new Response(
      JSON.stringify(fallback),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
