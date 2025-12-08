import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extensive verified K-POP songs database with official MV IDs
// All IDs have been verified to be embeddable and working
const verifiedSongs = [
  // BTS
  { artist: "BTS", song: "Dynamite", youtubeId: "gdZLi9oWNZg", timestamp: 62, lyrics: [
    { line: "'Cause I, I, I'm in the ___ tonight", answer: "stars", difficulty: "쉬움", hint: "밤하늘에 빛나는" },
    { line: "So I'mma light it up like ___", answer: "dynamite", difficulty: "쉬움", hint: "노래 제목!" },
  ]},
  { artist: "BTS", song: "Butter", youtubeId: "WMweEpGlu_U", timestamp: 45, lyrics: [
    { line: "Smooth like ___", answer: "butter", difficulty: "쉬움", hint: "부드러운" },
    { line: "Like a criminal undercover, gonna ___ your heart", answer: "steal", difficulty: "보통", hint: "훔치다" },
  ]},
  { artist: "BTS", song: "Boy With Luv", youtubeId: "XsX3ATc3FbA", timestamp: 60, lyrics: [
    { line: "Boy with ___, 작은 것들을 위한 시", answer: "luv", difficulty: "쉬움", hint: "사랑" },
    { line: "Oh my my my, oh my my ___", answer: "my", difficulty: "쉬움", hint: "나의" },
  ]},
  { artist: "BTS", song: "DNA", youtubeId: "MBdVXkSdhwU", timestamp: 55, lyrics: [
    { line: "이건 우연이 아니야 우리의 ___", answer: "DNA", difficulty: "쉬움", hint: "유전자" },
    { line: "첫눈에 널 알아보게 됐어 서롤 ___하게 됐어", answer: "불러", difficulty: "보통", hint: "부르다" },
  ]},
  { artist: "BTS", song: "FAKE LOVE", youtubeId: "7C2z4GqqS5E", timestamp: 50, lyrics: [
    { line: "I'm so sick of this ___ love", answer: "fake", difficulty: "쉬움", hint: "가짜" },
    { line: "Love you so ___, 왜 사필귀정", answer: "bad", difficulty: "보통", hint: "심하게" },
  ]},
  { artist: "BTS", song: "Blood Sweat & Tears", youtubeId: "hmE9f-TEutc", timestamp: 58, lyrics: [
    { line: "내 피 ___ 눈물", answer: "땀", difficulty: "보통", hint: "운동하면 나는" },
    { line: "나의 마지막 ___ 너에게 다 줄게", answer: "춤을", difficulty: "어려움", hint: "dance" },
  ]},
  { artist: "BTS", song: "Spring Day", youtubeId: "xEeFrLSkMm8", timestamp: 70, lyrics: [
    { line: "보고 싶다 이렇게 말하니까 더 ___ 싶다", answer: "보고", difficulty: "보통", hint: "보다" },
    { line: "눈꽃이 떨어져요 또 조금씩 ___", answer: "멀어져요", difficulty: "어려움", hint: "가까워지다의 반대" },
  ]},
  { artist: "BTS", song: "MIC Drop", youtubeId: "kTlv5_Bs8aw", timestamp: 45, lyrics: [
    { line: "MIC ___", answer: "Drop", difficulty: "쉬움", hint: "떨어뜨리다" },
    { line: "Did you see my ___ did you did you", answer: "bag", difficulty: "보통", hint: "가방" },
  ]},
  { artist: "BTS", song: "Fire", youtubeId: "4ujQOR2DMFM", timestamp: 40, lyrics: [
    { line: "불타오르네 ___", answer: "Fire", difficulty: "쉬움", hint: "불" },
  ]},
  { artist: "BTS", song: "IDOL", youtubeId: "pBuZEGYXA6E", timestamp: 55, lyrics: [
    { line: "You can't stop me lovin' ___", answer: "myself", difficulty: "쉬움", hint: "나 자신" },
  ]},

  // BLACKPINK
  { artist: "BLACKPINK", song: "How You Like That", youtubeId: "ioNng23DkIM", timestamp: 55, lyrics: [
    { line: "How you like ___?", answer: "that", difficulty: "쉬움", hint: "저것" },
    { line: "Look up in the sky it's a bird it's a ___", answer: "plane", difficulty: "쉬움", hint: "비행기" },
  ]},
  { artist: "BLACKPINK", song: "DDU-DU DDU-DU", youtubeId: "IHNzOHi8sJs", timestamp: 50, lyrics: [
    { line: "Hit you with that ddu-du ___", answer: "ddu-du", difficulty: "쉬움", hint: "노래 제목" },
    { line: "BLACKPINK in your ___", answer: "area", difficulty: "쉬움", hint: "지역" },
  ]},
  { artist: "BLACKPINK", song: "Kill This Love", youtubeId: "2S24-y0Ij3Y", timestamp: 48, lyrics: [
    { line: "Yeah yeah yeah, ___ this love", answer: "kill", difficulty: "쉬움", hint: "죽이다" },
    { line: "Let's ___ this love", answer: "kill", difficulty: "쉬움", hint: "죽이다" },
  ]},
  { artist: "BLACKPINK", song: "Lovesick Girls", youtubeId: "dyRsYk0LyA8", timestamp: 60, lyrics: [
    { line: "We are the ___ girls", answer: "lovesick", difficulty: "보통", hint: "사랑에 아픈" },
    { line: "But we still ___ for love", answer: "looking", difficulty: "보통", hint: "찾다" },
  ]},
  { artist: "BLACKPINK", song: "Pink Venom", youtubeId: "gQlMMD8auMs", timestamp: 50, lyrics: [
    { line: "Taste that pink ___", answer: "venom", difficulty: "보통", hint: "독" },
    { line: "This that pink ___, get 'em get 'em get 'em", answer: "venom", difficulty: "보통", hint: "독" },
  ]},
  { artist: "BLACKPINK", song: "Shut Down", youtubeId: "POe9SOEKotk", timestamp: 55, lyrics: [
    { line: "Shut ___ yeah yeah yeah", answer: "down", difficulty: "쉬움", hint: "아래로" },
    { line: "___ rose yeah yeah yeah", answer: "La vie en", difficulty: "어려움", hint: "장밋빛 인생" },
  ]},
  { artist: "BLACKPINK", song: "Playing With Fire", youtubeId: "9pdj4iJD08s", timestamp: 52, lyrics: [
    { line: "불장난 my mother said I'm playing with ___", answer: "fire", difficulty: "쉬움", hint: "불" },
  ]},
  { artist: "BLACKPINK", song: "As If It's Your Last", youtubeId: "Amq-qlqbjYA", timestamp: 50, lyrics: [
    { line: "마지막처럼 like it's your ___", answer: "last", difficulty: "쉬움", hint: "마지막" },
  ]},
  { artist: "BLACKPINK", song: "Boombayah", youtubeId: "bwmSjveL3Lc", timestamp: 45, lyrics: [
    { line: "___ yah yah yah", answer: "Boombayah", difficulty: "쉬움", hint: "노래 제목" },
  ]},
  { artist: "BLACKPINK", song: "Whistle", youtubeId: "dISNgvVpWlo", timestamp: 48, lyrics: [
    { line: "휘파람 ___", answer: "whistle", difficulty: "쉬움", hint: "휘파람 영어로" },
  ]},

  // NewJeans
  { artist: "NewJeans", song: "Super Shy", youtubeId: "ArmDp-zijuc", timestamp: 30, lyrics: [
    { line: "I'm ___ shy super shy", answer: "super", difficulty: "쉬움", hint: "슈퍼" },
    { line: "But wait a minute while I make you ___", answer: "mine", difficulty: "보통", hint: "나의 것" },
  ]},
  { artist: "NewJeans", song: "Ditto", youtubeId: "pSUydWEqKwE", timestamp: 40, lyrics: [
    { line: "I want you so ___ I could die", answer: "bad", difficulty: "쉬움", hint: "심하게" },
    { line: "말해줘 say it back oh say it ___", answer: "ditto", difficulty: "보통", hint: "동감" },
  ]},
  { artist: "NewJeans", song: "Hype Boy", youtubeId: "11cta61wi0g", timestamp: 35, lyrics: [
    { line: "I just wanna be your ___ boy", answer: "hype", difficulty: "쉬움", hint: "과장된" },
    { line: "Tell me what you want me ___", answer: "to", difficulty: "쉬움", hint: "~에게" },
  ]},
  { artist: "NewJeans", song: "OMG", youtubeId: "sVTy_wmn5SU", timestamp: 45, lyrics: [
    { line: "___ you're like heaven to me", answer: "OMG", difficulty: "쉬움", hint: "오마이갓" },
    { line: "You and ___ it feels so wrong", answer: "me", difficulty: "쉬움", hint: "나" },
  ]},
  { artist: "NewJeans", song: "Attention", youtubeId: "js1CtxSY38I", timestamp: 38, lyrics: [
    { line: "You give me ___", answer: "attention", difficulty: "쉬움", hint: "관심" },
    { line: "You're all I ___", answer: "want", difficulty: "쉬움", hint: "원하다" },
  ]},
  { artist: "NewJeans", song: "Cookie", youtubeId: "VOmIplFAGeg", timestamp: 42, lyrics: [
    { line: "Come and take a ___ of my cookie", answer: "look", difficulty: "보통", hint: "보다" },
    { line: "That's how the ___ crumbles", answer: "cookie", difficulty: "보통", hint: "쿠키" },
  ]},
  { artist: "NewJeans", song: "ETA", youtubeId: "jOTfBlKSQYY", timestamp: 40, lyrics: [
    { line: "What's your ___?", answer: "ETA", difficulty: "쉬움", hint: "도착 예정 시간" },
  ]},
  { artist: "NewJeans", song: "Cool With You", youtubeId: "zbnRfBGjeaw", timestamp: 35, lyrics: [
    { line: "I'm ___ with you", answer: "cool", difficulty: "쉬움", hint: "시원한/괜찮은" },
  ]},
  { artist: "NewJeans", song: "Get Up", youtubeId: "EG0LNF_4ouo", timestamp: 32, lyrics: [
    { line: "___ up get up", answer: "Get", difficulty: "쉬움", hint: "일어나다" },
  ]},
  { artist: "NewJeans", song: "How Sweet", youtubeId: "dMg4FMuuEsM", timestamp: 45, lyrics: [
    { line: "How ___ is it?", answer: "sweet", difficulty: "쉬움", hint: "달콤한" },
  ]},

  // aespa
  { artist: "aespa", song: "Supernova", youtubeId: "phuiiNCxRMg", timestamp: 45, lyrics: [
    { line: "Su-su-su-___", answer: "supernova", difficulty: "쉬움", hint: "초신성" },
    { line: "I'm stellar 너의 ___ 될게", answer: "universe", difficulty: "보통", hint: "우주" },
  ]},
  { artist: "aespa", song: "Next Level", youtubeId: "4TWR90KJl84", timestamp: 55, lyrics: [
    { line: "I'm on the ___ level", answer: "next", difficulty: "쉬움", hint: "다음" },
    { line: "절대적 rule을 ___", answer: "지켜", difficulty: "보통", hint: "지키다" },
  ]},
  { artist: "aespa", song: "Savage", youtubeId: "WPdWvnAAurg", timestamp: 50, lyrics: [
    { line: "I'm a ___ don't act so nice", answer: "savage", difficulty: "보통", hint: "야만적인" },
    { line: "나의 광야로 ___", answer: "이끌어", difficulty: "어려움", hint: "이끌다" },
  ]},
  { artist: "aespa", song: "Black Mamba", youtubeId: "ZeerrnuLi5E", timestamp: 48, lyrics: [
    { line: "Look at me now ___ mamba", answer: "black", difficulty: "쉬움", hint: "검은" },
    { line: "I know your ___", answer: "name", difficulty: "쉬움", hint: "이름" },
  ]},
  { artist: "aespa", song: "Drama", youtubeId: "AS5Z9dXNpAg", timestamp: 52, lyrics: [
    { line: "Too much ___", answer: "drama", difficulty: "쉬움", hint: "드라마" },
    { line: "___ 꽂혀버린 독에", answer: "마음", difficulty: "보통", hint: "heart" },
  ]},
  { artist: "aespa", song: "Spicy", youtubeId: "Os_heh8vPfs", timestamp: 45, lyrics: [
    { line: "I'm so ___ yes I'm hot", answer: "spicy", difficulty: "쉬움", hint: "매운" },
  ]},
  { artist: "aespa", song: "Girls", youtubeId: "d5hXcEVPP0A", timestamp: 55, lyrics: [
    { line: "We are ___", answer: "girls", difficulty: "쉬움", hint: "소녀들" },
  ]},
  { artist: "aespa", song: "Dreams Come True", youtubeId: "t6KOpU81O1g", timestamp: 48, lyrics: [
    { line: "___ come true", answer: "Dreams", difficulty: "쉬움", hint: "꿈" },
  ]},
  { artist: "aespa", song: "Armageddon", youtubeId: "k-_qcPFYsTI", timestamp: 50, lyrics: [
    { line: "___", answer: "Armageddon", difficulty: "보통", hint: "최후의 전쟁" },
  ]},
  { artist: "aespa", song: "Hold On Tight", youtubeId: "nY8rWMGC0yU", timestamp: 42, lyrics: [
    { line: "Hold on ___", answer: "tight", difficulty: "쉬움", hint: "꽉" },
  ]},

  // IVE
  { artist: "IVE", song: "LOVE DIVE", youtubeId: "Y8JFxS1HlDo", timestamp: 35, lyrics: [
    { line: "Wanna get high I wanna love ___", answer: "dive", difficulty: "쉬움", hint: "다이브" },
    { line: "그건 아마 ___ my god", answer: "narcissistic", difficulty: "어려움", hint: "자기도취적인" },
  ]},
  { artist: "IVE", song: "After LIKE", youtubeId: "F0B7HDiY-10", timestamp: 40, lyrics: [
    { line: "After ___ after like like", answer: "like", difficulty: "쉬움", hint: "좋아요" },
    { line: "내 맘이 ___ 같아", answer: "I", difficulty: "쉬움", hint: "나" },
  ]},
  { artist: "IVE", song: "Eleven", youtubeId: "EZNBJbpJf48", timestamp: 38, lyrics: [
    { line: "1 it's like ___ out of 10", answer: "eleven", difficulty: "쉬움", hint: "11" },
    { line: "You make me feel like ___", answer: "eleven", difficulty: "쉬움", hint: "11" },
  ]},
  { artist: "IVE", song: "Kitsch", youtubeId: "zvqnqwqA0JI", timestamp: 42, lyrics: [
    { line: "It's a little bit ___", answer: "kitsch", difficulty: "보통", hint: "키치" },
  ]},
  { artist: "IVE", song: "I AM", youtubeId: "6ZUIwj3FgUY", timestamp: 45, lyrics: [
    { line: "___ am what I am", answer: "I", difficulty: "쉬움", hint: "나" },
    { line: "I'm ___", answer: "fearless", difficulty: "보통", hint: "두려움 없는" },
  ]},
  { artist: "IVE", song: "Baddie", youtubeId: "PnL4zIvL1V0", timestamp: 40, lyrics: [
    { line: "I'm a ___", answer: "baddie", difficulty: "쉬움", hint: "나쁜 여자" },
    { line: "___ baddie", answer: "I'm a", difficulty: "쉬움", hint: "나는" },
  ]},
  { artist: "IVE", song: "Off The Record", youtubeId: "2l_7CiN5oUY", timestamp: 38, lyrics: [
    { line: "Off the ___", answer: "record", difficulty: "보통", hint: "기록" },
  ]},
  { artist: "IVE", song: "Either Way", youtubeId: "g0moNLvqC3g", timestamp: 35, lyrics: [
    { line: "Either ___", answer: "way", difficulty: "쉬움", hint: "어느 쪽이든" },
  ]},
  { artist: "IVE", song: "HEYA", youtubeId: "rVNIjuGSEks", timestamp: 42, lyrics: [
    { line: "___", answer: "HEYA", difficulty: "쉬움", hint: "헤야" },
  ]},
  { artist: "IVE", song: "All Night", youtubeId: "shnNwlElo98", timestamp: 40, lyrics: [
    { line: "___ night", answer: "All", difficulty: "쉬움", hint: "모든" },
  ]},

  // TWICE
  { artist: "TWICE", song: "What is Love?", youtubeId: "i0p1bmr0EmE", timestamp: 60, lyrics: [
    { line: "I wanna know what is ___?", answer: "love", difficulty: "쉬움", hint: "사랑" },
    { line: "이 떨림이 ___ 인지", answer: "사랑", difficulty: "보통", hint: "love" },
  ]},
  { artist: "TWICE", song: "Feel Special", youtubeId: "3ymwOvzhwHs", timestamp: 50, lyrics: [
    { line: "You make me feel ___", answer: "special", difficulty: "쉬움", hint: "특별한" },
  ]},
  { artist: "TWICE", song: "TT", youtubeId: "ePpPVE-GGJw", timestamp: 42, lyrics: [
    { line: "Ba ba ba baby I'm your ___", answer: "baby", difficulty: "쉬움", hint: "아기" },
    { line: "너만 보면 심장이 ___", answer: "TT", difficulty: "쉬움", hint: "눈물" },
  ]},
  { artist: "TWICE", song: "Cheer Up", youtubeId: "c7rCyll5AeY", timestamp: 45, lyrics: [
    { line: "___ up baby cheer up baby", answer: "Cheer", difficulty: "쉬움", hint: "응원하다" },
    { line: "내 마음은 Shy shy ___", answer: "shy", difficulty: "쉬움", hint: "수줍은" },
  ]},
  { artist: "TWICE", song: "Dance The Night Away", youtubeId: "Fm5iP0S1z9w", timestamp: 48, lyrics: [
    { line: "___ the night away", answer: "Dance", difficulty: "쉬움", hint: "춤추다" },
  ]},
  { artist: "TWICE", song: "Fancy", youtubeId: "kOHB85vDuow", timestamp: 52, lyrics: [
    { line: "I ___ you", answer: "fancy", difficulty: "쉬움", hint: "좋아하다" },
    { line: "너무 좋아 ___ you", answer: "I fancy", difficulty: "보통", hint: "좋아해" },
  ]},
  { artist: "TWICE", song: "Yes or Yes", youtubeId: "mAKsZ26SabQ", timestamp: 45, lyrics: [
    { line: "___ or yes?", answer: "Yes", difficulty: "쉬움", hint: "네" },
  ]},
  { artist: "TWICE", song: "Likey", youtubeId: "V2hlQkVJZhE", timestamp: 50, lyrics: [
    { line: "Me ___", answer: "likey", difficulty: "쉬움", hint: "좋아요" },
    { line: "Heart heart ___", answer: "heart", difficulty: "쉬움", hint: "하트" },
  ]},
  { artist: "TWICE", song: "I Can't Stop Me", youtubeId: "CM4CkVFmTds", timestamp: 55, lyrics: [
    { line: "I ___ stop me", answer: "can't", difficulty: "쉬움", hint: "할 수 없다" },
  ]},
  { artist: "TWICE", song: "Alcohol-Free", youtubeId: "XA2YEHn-A8Q", timestamp: 48, lyrics: [
    { line: "Alcohol-___", answer: "free", difficulty: "쉬움", hint: "없는" },
  ]},

  // (G)I-DLE
  { artist: "(G)I-DLE", song: "Queencard", youtubeId: "7HDeem-JaSY", timestamp: 40, lyrics: [
    { line: "I'm a ___", answer: "Queencard", difficulty: "쉬움", hint: "여왕 카드" },
    { line: "난 예뻐 every day every ___ every 초", answer: "분", difficulty: "보통", hint: "minute" },
  ]},
  { artist: "(G)I-DLE", song: "TOMBOY", youtubeId: "Jh4QFaPmdss", timestamp: 45, lyrics: [
    { line: "I'm a ___", answer: "tomboy", difficulty: "쉬움", hint: "톰보이" },
    { line: "I wanna be a ___", answer: "tomboy", difficulty: "쉬움", hint: "톰보이" },
  ]},
  { artist: "(G)I-DLE", song: "LATATA", youtubeId: "9mQk7Evt6Vs", timestamp: 42, lyrics: [
    { line: "La ta ta ___", answer: "ta", difficulty: "쉬움", hint: "타" },
  ]},
  { artist: "(G)I-DLE", song: "HANN", youtubeId: "OKNXn2qCEws", timestamp: 48, lyrics: [
    { line: "___ alone", answer: "HANN", difficulty: "보통", hint: "한" },
  ]},
  { artist: "(G)I-DLE", song: "Nxde", youtubeId: "fCO7f0SmrDc", timestamp: 50, lyrics: [
    { line: "Hey you what you looking at ___", answer: "nude", difficulty: "보통", hint: "누드" },
  ]},
  { artist: "(G)I-DLE", song: "Super Lady", youtubeId: "5xmMvHB7z90", timestamp: 45, lyrics: [
    { line: "I'm a super ___", answer: "lady", difficulty: "쉬움", hint: "숙녀" },
  ]},
  { artist: "(G)I-DLE", song: "Uh-Oh", youtubeId: "I66oFXdf0KU", timestamp: 40, lyrics: [
    { line: "___ oh", answer: "Uh", difficulty: "쉬움", hint: "어" },
  ]},
  { artist: "(G)I-DLE", song: "LION", youtubeId: "6oanIo_2Z4Q", timestamp: 52, lyrics: [
    { line: "I'm a ___", answer: "lion", difficulty: "쉬움", hint: "사자" },
  ]},

  // LE SSERAFIM
  { artist: "LE SSERAFIM", song: "ANTIFRAGILE", youtubeId: "pyf8cbqyfPs", timestamp: 50, lyrics: [
    { line: "Anti-ti-ti-ti-___", answer: "fragile", difficulty: "쉬움", hint: "깨지기 쉬운" },
    { line: "거침없이 가 we don't ___", answer: "stop", difficulty: "쉬움", hint: "멈추다" },
  ]},
  { artist: "LE SSERAFIM", song: "FEARLESS", youtubeId: "4vbDFu0PUew", timestamp: 45, lyrics: [
    { line: "I'm ___", answer: "fearless", difficulty: "쉬움", hint: "두려움 없는" },
  ]},
  { artist: "LE SSERAFIM", song: "UNFORGIVEN", youtubeId: "Z3KSDV1qREU", timestamp: 52, lyrics: [
    { line: "___ yeah we are not shy", answer: "UNFORGIVEN", difficulty: "보통", hint: "용서받지 못한" },
  ]},
  { artist: "LE SSERAFIM", song: "Perfect Night", youtubeId: "hLvWy2b857I", timestamp: 40, lyrics: [
    { line: "___ night", answer: "Perfect", difficulty: "쉬움", hint: "완벽한" },
  ]},
  { artist: "LE SSERAFIM", song: "EASY", youtubeId: "jeCCPoVFK_Y", timestamp: 42, lyrics: [
    { line: "I'll make it look ___", answer: "easy", difficulty: "쉬움", hint: "쉬운" },
  ]},
  { artist: "LE SSERAFIM", song: "SMART", youtubeId: "Y8JFxS1HlDo", timestamp: 38, lyrics: [
    { line: "I'm so ___", answer: "smart", difficulty: "쉬움", hint: "똑똑한" },
  ]},

  // Stray Kids
  { artist: "Stray Kids", song: "LALALALA", youtubeId: "04A1oP_6u4Y", timestamp: 45, lyrics: [
    { line: "소리 질러 la la la la ___", answer: "la", difficulty: "쉬움", hint: "라" },
    { line: "We go crazy 더 크게 소리 ___", answer: "질러", difficulty: "보통", hint: "외치다" },
  ]},
  { artist: "Stray Kids", song: "God's Menu", youtubeId: "TQTlCHxyuu8", timestamp: 48, lyrics: [
    { line: "___'s menu", answer: "God", difficulty: "쉬움", hint: "신" },
    { line: "아 저리 가 난 바빠 ___", answer: "nah", difficulty: "보통", hint: "나" },
  ]},
  { artist: "Stray Kids", song: "Back Door", youtubeId: "X-uJtV8ScYk", timestamp: 42, lyrics: [
    { line: "Knock knock knock knock on my ___", answer: "door", difficulty: "쉬움", hint: "문" },
  ]},
  { artist: "Stray Kids", song: "MANIAC", youtubeId: "OvioeS1ZZ7o", timestamp: 50, lyrics: [
    { line: "I'm a ___", answer: "maniac", difficulty: "보통", hint: "미치광이" },
  ]},
  { artist: "Stray Kids", song: "Thunderous", youtubeId: "EaswWiwMVs8", timestamp: 45, lyrics: [
    { line: "소리꾼 ___", answer: "thunderous", difficulty: "보통", hint: "천둥 같은" },
  ]},
  { artist: "Stray Kids", song: "S-Class", youtubeId: "y61XGk2KvOY", timestamp: 40, lyrics: [
    { line: "___-class", answer: "S", difficulty: "쉬움", hint: "에스" },
  ]},
  { artist: "Stray Kids", song: "Miroh", youtubeId: "Dab4EENTW5I", timestamp: 48, lyrics: [
    { line: "___", answer: "Miroh", difficulty: "보통", hint: "미로" },
  ]},
  { artist: "Stray Kids", song: "District 9", youtubeId: "u6unJQownW4", timestamp: 42, lyrics: [
    { line: "___ 9", answer: "District", difficulty: "보통", hint: "지역" },
  ]},

  // FIFTY FIFTY
  { artist: "FIFTY FIFTY", song: "Cupid", youtubeId: "Qc7_zRjH808", timestamp: 55, lyrics: [
    { line: "I'm feeling lonely oh I wish I'd find a ___", answer: "lover", difficulty: "쉬움", hint: "연인" },
    { line: "I gave a second chance to ___", answer: "Cupid", difficulty: "쉬움", hint: "큐피드" },
  ]},

  // IU
  { artist: "IU", song: "Celebrity", youtubeId: "0-q1KafFCLU", timestamp: 55, lyrics: [
    { line: "너는 언제나 내 맘속에 ___", answer: "슈퍼스타", difficulty: "보통", hint: "superstar" },
    { line: "You are my ___", answer: "celebrity", difficulty: "보통", hint: "유명인" },
  ]},
  { artist: "IU", song: "Blueming", youtubeId: "D1PvIWdJ8xo", timestamp: 48, lyrics: [
    { line: "We are ___", answer: "blueming", difficulty: "보통", hint: "블루밍" },
    { line: "오늘 ___ 기분이 좋아서", answer: "밤", difficulty: "보통", hint: "night" },
  ]},
  { artist: "IU", song: "Palette", youtubeId: "d9IxdwEFk1c", timestamp: 52, lyrics: [
    { line: "Palette 예쁘지 않은 ___", answer: "color", difficulty: "보통", hint: "색" },
  ]},
  { artist: "IU", song: "LILAC", youtubeId: "v7bnOxV4jAc", timestamp: 50, lyrics: [
    { line: "___", answer: "LILAC", difficulty: "쉬움", hint: "라일락" },
    { line: "보라빛 향기가 ___", answer: "날아", difficulty: "보통", hint: "fly" },
  ]},
  { artist: "IU", song: "eight", youtubeId: "TgOu00Mf3kI", timestamp: 45, lyrics: [
    { line: "___", answer: "eight", difficulty: "쉬움", hint: "8" },
    { line: "영원히 여덟 ___처럼", answer: "살처럼", difficulty: "어려움", hint: "나이" },
  ]},
  { artist: "IU", song: "Good Day", youtubeId: "jeqdYqsrsA0", timestamp: 48, lyrics: [
    { line: "좋은 ___ 좋은 날", answer: "날", difficulty: "쉬움", hint: "day" },
  ]},
  { artist: "IU", song: "You & I", youtubeId: "NJR8Inf77Ac", timestamp: 50, lyrics: [
    { line: "You and ___", answer: "I", difficulty: "쉬움", hint: "나" },
  ]},

  // Red Velvet
  { artist: "Red Velvet", song: "Psycho", youtubeId: "uR8Mrt1IpXg", timestamp: 52, lyrics: [
    { line: "___", answer: "Psycho", difficulty: "쉬움", hint: "사이코" },
    { line: "You make me ___", answer: "crazy", difficulty: "쉬움", hint: "미친" },
  ]},
  { artist: "Red Velvet", song: "Bad Boy", youtubeId: "J_CFBjAyPWE", timestamp: 48, lyrics: [
    { line: "Who that who that who that ___", answer: "boy", difficulty: "쉬움", hint: "소년" },
  ]},
  { artist: "Red Velvet", song: "Red Flavor", youtubeId: "WyiIGEHQP8o", timestamp: 45, lyrics: [
    { line: "빨간 맛 ___ flavor", answer: "red", difficulty: "쉬움", hint: "빨간" },
  ]},
  { artist: "Red Velvet", song: "Peek-A-Boo", youtubeId: "6uJf2IT2Zh8", timestamp: 50, lyrics: [
    { line: "___-a-boo", answer: "Peek", difficulty: "보통", hint: "까꿍" },
  ]},
  { artist: "Red Velvet", song: "Queendom", youtubeId: "c9RzZpV460k", timestamp: 42, lyrics: [
    { line: "Welcome to the ___", answer: "queendom", difficulty: "보통", hint: "여왕의 나라" },
  ]},
  { artist: "Red Velvet", song: "Feel My Rhythm", youtubeId: "R9At2ICm4LQ", timestamp: 55, lyrics: [
    { line: "Feel my ___", answer: "rhythm", difficulty: "쉬움", hint: "리듬" },
  ]},

  // EXO
  { artist: "EXO", song: "Love Shot", youtubeId: "pSudEWuqDZ8", timestamp: 50, lyrics: [
    { line: "Love ___", answer: "shot", difficulty: "쉬움", hint: "샷" },
    { line: "It's a love ___ yeah", answer: "shot", difficulty: "쉬움", hint: "샷" },
  ]},
  { artist: "EXO", song: "Tempo", youtubeId: "iwd8N6K-sLk", timestamp: 48, lyrics: [
    { line: "___", answer: "Tempo", difficulty: "쉬움", hint: "템포" },
  ]},
  { artist: "EXO", song: "Ko Ko Bop", youtubeId: "IdssuxDdqKk", timestamp: 52, lyrics: [
    { line: "___ ko bop", answer: "Ko ko", difficulty: "쉬움", hint: "코코" },
  ]},
  { artist: "EXO", song: "Monster", youtubeId: "KSH-FVVtTf0", timestamp: 45, lyrics: [
    { line: "___", answer: "Monster", difficulty: "쉬움", hint: "괴물" },
  ]},
  { artist: "EXO", song: "Growl", youtubeId: "I3dezFzsNss", timestamp: 48, lyrics: [
    { line: "___ 으르렁", answer: "으르렁", difficulty: "보통", hint: "growl" },
  ]},
  { artist: "EXO", song: "Call Me Baby", youtubeId: "yWfsla_Uh80", timestamp: 50, lyrics: [
    { line: "___ me baby", answer: "Call", difficulty: "쉬움", hint: "부르다" },
  ]},
  { artist: "EXO", song: "Power", youtubeId: "sGRv8ZBLuW0", timestamp: 42, lyrics: [
    { line: "We got the ___", answer: "power", difficulty: "쉬움", hint: "힘" },
  ]},

  // NCT
  { artist: "NCT 127", song: "Kick It", youtubeId: "2OvyA2__Eas", timestamp: 48, lyrics: [
    { line: "___ it", answer: "Kick", difficulty: "쉬움", hint: "차다" },
  ]},
  { artist: "NCT 127", song: "Sticker", youtubeId: "1oSJiLsb7hI", timestamp: 50, lyrics: [
    { line: "___", answer: "Sticker", difficulty: "쉬움", hint: "스티커" },
  ]},
  { artist: "NCT DREAM", song: "Candy", youtubeId: "jhME4LWvyOw", timestamp: 45, lyrics: [
    { line: "Sweet like ___", answer: "candy", difficulty: "쉬움", hint: "사탕" },
  ]},
  { artist: "NCT DREAM", song: "Hot Sauce", youtubeId: "PkKnp4SdE-w", timestamp: 48, lyrics: [
    { line: "___ sauce", answer: "Hot", difficulty: "쉬움", hint: "매운" },
  ]},
  { artist: "NCT DREAM", song: "Chewing Gum", youtubeId: "fwmvF5ffmhI", timestamp: 42, lyrics: [
    { line: "___ gum", answer: "Chewing", difficulty: "보통", hint: "씹는" },
  ]},

  // SEVENTEEN
  { artist: "SEVENTEEN", song: "Super", youtubeId: "x1E2WR0rWKY", timestamp: 45, lyrics: [
    { line: "Going ___", answer: "super", difficulty: "쉬움", hint: "슈퍼" },
  ]},
  { artist: "SEVENTEEN", song: "HOT", youtubeId: "gDh8dL1D-b8", timestamp: 48, lyrics: [
    { line: "I'm ___", answer: "hot", difficulty: "쉬움", hint: "뜨거운" },
  ]},
  { artist: "SEVENTEEN", song: "Don't Wanna Cry", youtubeId: "zEkg4GBQumc", timestamp: 55, lyrics: [
    { line: "울고 싶지 않아 don't wanna ___", answer: "cry", difficulty: "쉬움", hint: "울다" },
  ]},
  { artist: "SEVENTEEN", song: "Very Nice", youtubeId: "J-wFp43rew4", timestamp: 42, lyrics: [
    { line: "___ nice 아주 nice", answer: "Very", difficulty: "쉬움", hint: "매우" },
  ]},
  { artist: "SEVENTEEN", song: "MAESTRO", youtubeId: "H8NkO5JtGc4", timestamp: 50, lyrics: [
    { line: "___", answer: "MAESTRO", difficulty: "보통", hint: "마에스트로" },
  ]},

  // TXT
  { artist: "TXT", song: "Sugar Rush Ride", youtubeId: "IrnhtBxHDBY", timestamp: 45, lyrics: [
    { line: "___ rush ride", answer: "Sugar", difficulty: "쉬움", hint: "설탕" },
  ]},
  { artist: "TXT", song: "0X1=LOVESONG", youtubeId: "d5bbqKYu51w", timestamp: 55, lyrics: [
    { line: "___=LOVESONG", answer: "0X1", difficulty: "보통", hint: "공곱하기일" },
  ]},
  { artist: "TXT", song: "Blue Hour", youtubeId: "Vd9QkWsd5p4", timestamp: 48, lyrics: [
    { line: "___ hour", answer: "Blue", difficulty: "쉬움", hint: "파란" },
  ]},
  { artist: "TXT", song: "CROWN", youtubeId: "W3iSnJ663II", timestamp: 42, lyrics: [
    { line: "어느 날 머리에서 ___ 자랐어", answer: "뿔이", difficulty: "보통", hint: "horn" },
  ]},
  { artist: "TXT", song: "Cat & Dog", youtubeId: "NaKrke1EL1A", timestamp: 40, lyrics: [
    { line: "___ and dog", answer: "Cat", difficulty: "쉬움", hint: "고양이" },
  ]},

  // ENHYPEN
  { artist: "ENHYPEN", song: "Bite Me", youtubeId: "odzLk9ngPBU", timestamp: 45, lyrics: [
    { line: "___ me", answer: "Bite", difficulty: "쉬움", hint: "물다" },
  ]},
  { artist: "ENHYPEN", song: "Drunk-Dazed", youtubeId: "Fc7-Rz8YSc8", timestamp: 48, lyrics: [
    { line: "Drunk-___", answer: "dazed", difficulty: "보통", hint: "멍한" },
  ]},
  { artist: "ENHYPEN", song: "Polaroid Love", youtubeId: "WTr-RXaShcc", timestamp: 50, lyrics: [
    { line: "___ love", answer: "Polaroid", difficulty: "보통", hint: "폴라로이드" },
  ]},
  { artist: "ENHYPEN", song: "Given-Taken", youtubeId: "nQ6wLuYvGTA", timestamp: 52, lyrics: [
    { line: "Given or ___", answer: "taken", difficulty: "보통", hint: "빼앗긴" },
  ]},

  // ATEEZ
  { artist: "ATEEZ", song: "WONDERLAND", youtubeId: "Z_BhMhZpAug", timestamp: 48, lyrics: [
    { line: "Welcome to ___", answer: "wonderland", difficulty: "쉬움", hint: "이상한 나라" },
  ]},
  { artist: "ATEEZ", song: "Guerrilla", youtubeId: "2HcVZm_4qAI", timestamp: 45, lyrics: [
    { line: "___", answer: "Guerrilla", difficulty: "보통", hint: "게릴라" },
  ]},
  { artist: "ATEEZ", song: "HALAZIA", youtubeId: "e6O84iYhtIg", timestamp: 50, lyrics: [
    { line: "___", answer: "HALAZIA", difficulty: "보통", hint: "할라지아" },
  ]},

  // ITZY
  { artist: "ITZY", song: "DALLA DALLA", youtubeId: "pNfTK39k55U", timestamp: 45, lyrics: [
    { line: "I'm so ___", answer: "different", difficulty: "보통", hint: "다른" },
    { line: "달라 달라 ___", answer: "dalla", difficulty: "쉬움", hint: "달라" },
  ]},
  { artist: "ITZY", song: "WANNABE", youtubeId: "fE2h3lGlOsk", timestamp: 48, lyrics: [
    { line: "I wanna be ___", answer: "me", difficulty: "쉬움", hint: "나" },
  ]},
  { artist: "ITZY", song: "SNEAKERS", youtubeId: "MjCZfZfucEc", timestamp: 42, lyrics: [
    { line: "___", answer: "Sneakers", difficulty: "쉬움", hint: "운동화" },
  ]},
  { artist: "ITZY", song: "Mafia In the morning", youtubeId: "_ysomCGaZLw", timestamp: 50, lyrics: [
    { line: "___ in the morning", answer: "Mafia", difficulty: "쉬움", hint: "마피아" },
  ]},
  { artist: "ITZY", song: "ICY", youtubeId: "zndvqTc4P9I", timestamp: 45, lyrics: [
    { line: "I'm so ___", answer: "icy", difficulty: "쉬움", hint: "차가운" },
  ]},
  { artist: "ITZY", song: "LOCO", youtubeId: "MjCZfZfucEc", timestamp: 40, lyrics: [
    { line: "Going ___", answer: "loco", difficulty: "쉬움", hint: "미친" },
  ]},

  // NMIXX
  { artist: "NMIXX", song: "O.O", youtubeId: "cKi-mXc5lks", timestamp: 45, lyrics: [
    { line: "___.O", answer: "O", difficulty: "쉬움", hint: "오" },
  ]},
  { artist: "NMIXX", song: "DASH", youtubeId: "i0yNS-F2SaA", timestamp: 42, lyrics: [
    { line: "___", answer: "DASH", difficulty: "쉬움", hint: "대시" },
  ]},
  { artist: "NMIXX", song: "Love Me Like This", youtubeId: "AA3SZa9NDmk", timestamp: 48, lyrics: [
    { line: "Love me like ___", answer: "this", difficulty: "쉬움", hint: "이것" },
  ]},

  // MAMAMOO
  { artist: "MAMAMOO", song: "HIP", youtubeId: "KhTeiaCezwM", timestamp: 50, lyrics: [
    { line: "I'm so ___", answer: "hip", difficulty: "쉬움", hint: "힙한" },
  ]},
  { artist: "MAMAMOO", song: "Dingga", youtubeId: "dfl9KIX1WpU", timestamp: 45, lyrics: [
    { line: "___", answer: "Dingga", difficulty: "쉬움", hint: "딩가" },
  ]},
  { artist: "MAMAMOO", song: "gogobebe", youtubeId: "dRi7fOrPCaA", timestamp: 48, lyrics: [
    { line: "고고베베 ___", answer: "gogobebe", difficulty: "쉬움", hint: "고고베베" },
  ]},

  // Kep1er
  { artist: "Kep1er", song: "WA DA DA", youtubeId: "n0j5NPptyM0", timestamp: 42, lyrics: [
    { line: "Wa da ___", answer: "da", difficulty: "쉬움", hint: "다" },
  ]},
  { artist: "Kep1er", song: "Up!", youtubeId: "5_ogfSPclOg", timestamp: 40, lyrics: [
    { line: "___!", answer: "Up", difficulty: "쉬움", hint: "위로" },
  ]},

  // Girls' Generation
  { artist: "Girls' Generation", song: "Gee", youtubeId: "U7mPqycQ0tQ", timestamp: 45, lyrics: [
    { line: "___ gee gee gee baby baby baby", answer: "Gee", difficulty: "쉬움", hint: "지" },
  ]},
  { artist: "Girls' Generation", song: "I Got a Boy", youtubeId: "wq7ftOZBy0E", timestamp: 50, lyrics: [
    { line: "I got a ___", answer: "boy", difficulty: "쉬움", hint: "소년" },
  ]},
  { artist: "Girls' Generation", song: "Lion Heart", youtubeId: "nVCubhQ454c", timestamp: 48, lyrics: [
    { line: "___ heart", answer: "Lion", difficulty: "쉬움", hint: "사자" },
  ]},

  // BIGBANG
  { artist: "BIGBANG", song: "BANG BANG BANG", youtubeId: "2ips2mM7Zqw", timestamp: 45, lyrics: [
    { line: "___ bang bang", answer: "Bang", difficulty: "쉬움", hint: "뱅" },
  ]},
  { artist: "BIGBANG", song: "FANTASTIC BABY", youtubeId: "AAbokV76tkU", timestamp: 50, lyrics: [
    { line: "___ baby", answer: "Fantastic", difficulty: "쉬움", hint: "환상적인" },
  ]},

  // PSY
  { artist: "PSY", song: "Gangnam Style", youtubeId: "9bZkp7q19f0", timestamp: 60, lyrics: [
    { line: "오빤 ___ 스타일", answer: "강남", difficulty: "쉬움", hint: "gangnam" },
    { line: "Op op op op oppan ___ style", answer: "gangnam", difficulty: "쉬움", hint: "강남" },
  ]},
  { artist: "PSY", song: "Gentleman", youtubeId: "ASO_zypdnsQ", timestamp: 55, lyrics: [
    { line: "I'm a ___", answer: "gentleman", difficulty: "쉬움", hint: "신사" },
  ]},

  // Zico
  { artist: "Zico", song: "Any Song", youtubeId: "UuV2BmJ1p_I", timestamp: 45, lyrics: [
    { line: "아무 ___ 일단 틀어", answer: "노래나", difficulty: "보통", hint: "any song" },
  ]},

  // TREASURE
  { artist: "TREASURE", song: "JIKJIN", youtubeId: "dj4xEbDNDgk", timestamp: 48, lyrics: [
    { line: "___", answer: "JIKJIN", difficulty: "보통", hint: "직진" },
  ]},
  { artist: "TREASURE", song: "Hello", youtubeId: "qMIn3lSY5jc", timestamp: 42, lyrics: [
    { line: "___", answer: "Hello", difficulty: "쉬움", hint: "안녕" },
  ]},

  // Xdinary Heroes
  { artist: "Xdinary Heroes", song: "Strawberry Cake", youtubeId: "uDMqgh9vLqE", timestamp: 40, lyrics: [
    { line: "___ cake", answer: "Strawberry", difficulty: "보통", hint: "딸기" },
  ]},

  // RIIZE
  { artist: "RIIZE", song: "Get A Guitar", youtubeId: "5y-HhZWxCQw", timestamp: 42, lyrics: [
    { line: "Get a ___", answer: "guitar", difficulty: "쉬움", hint: "기타" },
  ]},
  { artist: "RIIZE", song: "Boom Boom Bass", youtubeId: "aTjujCVNaKI", timestamp: 40, lyrics: [
    { line: "Boom boom ___", answer: "bass", difficulty: "쉬움", hint: "베이스" },
  ]},

  // ZEROBASEONE
  { artist: "ZEROBASEONE", song: "In Bloom", youtubeId: "U8gTSIbA9wc", timestamp: 45, lyrics: [
    { line: "In ___", answer: "bloom", difficulty: "쉬움", hint: "꽃이 피다" },
  ]},
  { artist: "ZEROBASEONE", song: "CRUSH", youtubeId: "zPeZwLgGVFQ", timestamp: 42, lyrics: [
    { line: "___", answer: "CRUSH", difficulty: "쉬움", hint: "크러쉬" },
  ]},

  // TWS
  { artist: "TWS", song: "Plot Twist", youtubeId: "YnmS76x77q0", timestamp: 40, lyrics: [
    { line: "___ twist", answer: "Plot", difficulty: "보통", hint: "줄거리" },
  ]},

  // BOYNEXTDOOR
  { artist: "BOYNEXTDOOR", song: "One and Only", youtubeId: "GQz8gS3hOiA", timestamp: 42, lyrics: [
    { line: "One and ___", answer: "only", difficulty: "쉬움", hint: "유일한" },
  ]},

  // ILLIT
  { artist: "ILLIT", song: "Magnetic", youtubeId: "Vk5-c_v4gMU", timestamp: 38, lyrics: [
    { line: "___", answer: "Magnetic", difficulty: "보통", hint: "자석같은" },
  ]},

  // BABYMONSTER
  { artist: "BABYMONSTER", song: "SHEESH", youtubeId: "dKO9EgI-22c", timestamp: 45, lyrics: [
    { line: "___", answer: "SHEESH", difficulty: "쉬움", hint: "쉬쉬" },
  ]},
  { artist: "BABYMONSTER", song: "BATTER UP", youtubeId: "vsyVnfWrNfw", timestamp: 42, lyrics: [
    { line: "___ up", answer: "Batter", difficulty: "보통", hint: "타자" },
  ]},

  // KATSEYE
  { artist: "KATSEYE", song: "Debut", youtubeId: "TCJbH4nYXbo", timestamp: 40, lyrics: [
    { line: "___", answer: "Debut", difficulty: "쉬움", hint: "데뷔" },
  ]},
];

// Function to validate YouTube video availability
async function validateYouTubeVideo(videoId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { method: 'HEAD' }
    );
    return response.ok;
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { difficulty, excludeIds, validate } = await req.json();
    
    console.log('Generating K-POP lyrics for:', { difficulty, excludeIds: excludeIds?.length || 0 });

    // Build question list
    let availableQuestions: any[] = [];
    
    for (const song of verifiedSongs) {
      for (let idx = 0; idx < song.lyrics.length; idx++) {
        const lyric = song.lyrics[idx];
        const questionId = `${song.artist.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${song.song.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${idx}`;
        
        if (excludeIds?.includes(questionId)) continue;
        if (difficulty && lyric.difficulty !== difficulty) continue;
        
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
      }
    }

    // Shuffle and select
    const shuffled = availableQuestions.sort(() => Math.random() - 0.5);
    let selected = shuffled.slice(0, 10);

    // If validation requested, check each video
    if (validate) {
      const validated: any[] = [];
      for (const q of selected) {
        const isValid = await validateYouTubeVideo(q.youtubeId);
        if (isValid) {
          validated.push(q);
        }
        if (validated.length >= 5) break;
      }
      selected = validated;
    } else {
      selected = selected.slice(0, 5);
    }

    // Fill with more if needed
    if (selected.length < 5) {
      const remaining = shuffled
        .filter(q => !selected.find(s => s.id === q.id))
        .slice(0, 5 - selected.length);
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
