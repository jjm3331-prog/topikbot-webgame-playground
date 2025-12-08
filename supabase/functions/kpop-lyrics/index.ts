import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Pre-verified working YouTube video IDs with timestamps
const verifiedSongs = [
  {
    artist: "BTS",
    song: "Dynamite",
    youtubeId: "gdZLi9oWNZg",
    timestamp: 62,
    lyrics: [
      { line: "'Cause I, I, I'm in the ___ tonight", answer: "stars", difficulty: "쉬움", hint: "밤하늘에 빛나는" },
      { line: "So I'mma light it up like ___", answer: "dynamite", difficulty: "쉬움", hint: "노래 제목!" },
      { line: "Shining through the city with a little funk and ___", answer: "soul", difficulty: "보통", hint: "영혼" },
    ]
  },
  {
    artist: "BTS",
    song: "Butter",
    youtubeId: "WMweEpGlu_U",
    timestamp: 45,
    lyrics: [
      { line: "Smooth like ___", answer: "butter", difficulty: "쉬움", hint: "노래 제목, 부드러운" },
      { line: "Like a criminal undercover, gonna ___ your heart", answer: "steal", difficulty: "보통", hint: "훔치다" },
    ]
  },
  {
    artist: "BLACKPINK",
    song: "How You Like That",
    youtubeId: "ioNng23DkIM",
    timestamp: 55,
    lyrics: [
      { line: "Look up in the sky, it's a bird, it's a ___", answer: "plane", difficulty: "쉬움", hint: "하늘을 나는 것" },
      { line: "How you like that? How you like ___?", answer: "that", difficulty: "쉬움", hint: "저것" },
    ]
  },
  {
    artist: "BLACKPINK",
    song: "Pink Venom",
    youtubeId: "gQlMMD8auMs",
    timestamp: 50,
    lyrics: [
      { line: "Taste that pink ___, get 'em, get 'em, get 'em", answer: "venom", difficulty: "보통", hint: "노래 제목, 독" },
      { line: "Black paint and ___ on my lips", answer: "ammo", difficulty: "어려움", hint: "탄약" },
    ]
  },
  {
    artist: "NewJeans",
    song: "Super Shy",
    youtubeId: "ArmDp-zijuc",
    timestamp: 30,
    lyrics: [
      { line: "I'm super ___, super shy", answer: "shy", difficulty: "쉬움", hint: "수줍은" },
      { line: "But wait a minute while I make you ___", answer: "mine", difficulty: "보통", hint: "나의 것" },
    ]
  },
  {
    artist: "NewJeans",
    song: "Ditto",
    youtubeId: "pSUydWEqKwE",
    timestamp: 40,
    lyrics: [
      { line: "I want you so ___, I could die", answer: "bad", difficulty: "쉬움", hint: "심하게, 몹시" },
      { line: "말해줘 say it back, oh say it ___", answer: "ditto", difficulty: "보통", hint: "노래 제목, 동감" },
    ]
  },
  {
    artist: "aespa",
    song: "Supernova",
    youtubeId: "phuiiNCxRMg",
    timestamp: 45,
    lyrics: [
      { line: "Su-su-su-___", answer: "supernova", difficulty: "쉬움", hint: "초신성, 노래 제목" },
      { line: "I'm stellar, 너의 ___ 될게", answer: "universe", difficulty: "보통", hint: "우주" },
    ]
  },
  {
    artist: "IVE",
    song: "LOVE DIVE",
    youtubeId: "Y8JFxS1HlDo",
    timestamp: 35,
    lyrics: [
      { line: "Wanna get ___, I wanna love dive", answer: "high", difficulty: "쉬움", hint: "높이 올라가고 싶어" },
      { line: "난 궁금해 yeah 그건 아마 Narcissistic, my ___", answer: "god", difficulty: "보통", hint: "세상에!" },
    ]
  },
  {
    artist: "IVE",
    song: "Kitsch",
    youtubeId: "zvqnqwqA0JI",
    timestamp: 40,
    lyrics: [
      { line: "It's a little bit ___, it's a little bit fun", answer: "kitsch", difficulty: "보통", hint: "노래 제목" },
    ]
  },
  {
    artist: "FIFTY FIFTY",
    song: "Cupid",
    youtubeId: "Qc7_zRjH808",
    timestamp: 55,
    lyrics: [
      { line: "I'm feeling lonely, oh I wish I'd find a ___", answer: "lover", difficulty: "쉬움", hint: "연인" },
      { line: "I gave a second chance to ___", answer: "Cupid", difficulty: "쉬움", hint: "노래 제목, 큐피드" },
    ]
  },
  {
    artist: "LE SSERAFIM",
    song: "ANTIFRAGILE",
    youtubeId: "pyf8cbqyfPs",
    timestamp: 50,
    lyrics: [
      { line: "Anti-ti-ti-ti-___", answer: "fragile", difficulty: "쉬움", hint: "깨지기 쉬운의 반대" },
      { line: "거침없이 가 we don't ___", answer: "stop", difficulty: "쉬움", hint: "멈추다" },
    ]
  },
  {
    artist: "Stray Kids",
    song: "LALALALA",
    youtubeId: "04A1oP_6u4Y",
    timestamp: 45,
    lyrics: [
      { line: "소리 질러 la la la la ___", answer: "la", difficulty: "쉬움", hint: "라라라..." },
      { line: "We go ___, 더 크게 소리 질러", answer: "crazy", difficulty: "보통", hint: "미친" },
    ]
  },
  {
    artist: "TWICE",
    song: "What is Love?",
    youtubeId: "i0p1bmr0EmE",
    timestamp: 60,
    lyrics: [
      { line: "I wanna know what is ___?", answer: "love", difficulty: "쉬움", hint: "사랑" },
      { line: "이 떨림이 사랑인지 널 ___할 때 빛나는지", answer: "마주", difficulty: "어려움", hint: "서로 바라보다" },
    ]
  },
  {
    artist: "TWICE",
    song: "Feel Special",
    youtubeId: "3ymwOvzhwHs",
    timestamp: 50,
    lyrics: [
      { line: "You make me feel ___", answer: "special", difficulty: "쉬움", hint: "특별한" },
    ]
  },
  {
    artist: "(G)I-DLE",
    song: "Queencard",
    youtubeId: "7HDeem-JaSY",
    timestamp: 40,
    lyrics: [
      { line: "I'm a ___", answer: "Queencard", difficulty: "쉬움", hint: "여왕 카드, 노래 제목" },
      { line: "난 예뻐 every ___ every 분 every 초", answer: "day", difficulty: "보통", hint: "매일" },
    ]
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { difficulty, excludeIds } = await req.json();
    
    console.log('Generating K-POP lyrics for:', { difficulty, excludeIds });

    // Filter by difficulty and exclude used IDs
    let availableQuestions: any[] = [];
    
    verifiedSongs.forEach(song => {
      song.lyrics.forEach((lyric, idx) => {
        const questionId = `${song.artist.toLowerCase().replace(/\s+/g, '_')}_${song.song.toLowerCase().replace(/\s+/g, '_')}_${idx}`;
        
        // Skip if already used
        if (excludeIds?.includes(questionId)) return;
        
        // Filter by difficulty if specified
        if (difficulty && lyric.difficulty !== difficulty) return;
        
        availableQuestions.push({
          id: questionId,
          artist: song.artist,
          song: song.song,
          youtubeId: song.youtubeId,
          timestamp: song.timestamp,
          lyricLine: lyric.line,
          answer: lyric.answer,
          hint: lyric.hint,
          difficulty: lyric.difficulty,
          points: lyric.difficulty === '쉬움' ? 10 : lyric.difficulty === '보통' ? 20 : 30
        });
      });
    });

    // Shuffle and pick 5
    const shuffled = availableQuestions.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 5);

    // If not enough questions, include some from other difficulties
    if (selected.length < 5) {
      const allQuestions: any[] = [];
      verifiedSongs.forEach(song => {
        song.lyrics.forEach((lyric, idx) => {
          const questionId = `${song.artist.toLowerCase().replace(/\s+/g, '_')}_${song.song.toLowerCase().replace(/\s+/g, '_')}_${idx}`;
          if (excludeIds?.includes(questionId)) return;
          if (selected.find(q => q.id === questionId)) return;
          
          allQuestions.push({
            id: questionId,
            artist: song.artist,
            song: song.song,
            youtubeId: song.youtubeId,
            timestamp: song.timestamp,
            lyricLine: lyric.line,
            answer: lyric.answer,
            hint: lyric.hint,
            difficulty: lyric.difficulty,
            points: lyric.difficulty === '쉬움' ? 10 : lyric.difficulty === '보통' ? 20 : 30
          });
        });
      });
      
      const remaining = allQuestions.sort(() => Math.random() - 0.5).slice(0, 5 - selected.length);
      selected.push(...remaining);
    }

    console.log(`Returning ${selected.length} questions`);

    return new Response(
      JSON.stringify({ questions: selected }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('K-POP lyrics error:', error);
    
    return new Response(
      JSON.stringify({ 
        questions: [
          {
            id: "bts_dynamite_fallback",
            artist: "BTS",
            song: "Dynamite",
            youtubeId: "gdZLi9oWNZg",
            timestamp: 62,
            lyricLine: "So I'mma light it up like ___",
            answer: "dynamite",
            hint: "노래 제목!",
            difficulty: "쉬움",
            points: 10
          }
        ]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
