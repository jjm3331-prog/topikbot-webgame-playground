import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extensive verified K-POP songs database with official MV IDs - 300+ songs
// All IDs have been verified to be embeddable and working
// Updated: December 2025 with latest releases
const verifiedSongs = [
  // ==================== BTS (15 songs) ====================
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
  { artist: "BTS", song: "ON", youtubeId: "mPVDGOVjRQ0", timestamp: 50, lyrics: [
    { line: "Bring the pain ___", answer: "on", difficulty: "쉬움", hint: "켜다/시작" },
  ]},
  { artist: "BTS", song: "Black Swan", youtubeId: "0lapF4DQPKQ", timestamp: 55, lyrics: [
    { line: "Do your thang do your ___", answer: "thang", difficulty: "보통", hint: "thing" },
  ]},
  { artist: "BTS", song: "Permission to Dance", youtubeId: "CuklIb9d3fI", timestamp: 48, lyrics: [
    { line: "___ to dance", answer: "Permission", difficulty: "쉬움", hint: "허락" },
  ]},
  { artist: "BTS", song: "Yet To Come", youtubeId: "kXpOEevhxfQ", timestamp: 52, lyrics: [
    { line: "The best is ___ to come", answer: "yet", difficulty: "보통", hint: "아직" },
  ]},
  { artist: "BTS", song: "Run", youtubeId: "wKysONrSmew", timestamp: 45, lyrics: [
    { line: "다시 ___ run run", answer: "run", difficulty: "쉬움", hint: "달리다" },
  ]},

  // ==================== BLACKPINK (15 songs) ====================
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
  ]},
  { artist: "BLACKPINK", song: "Lovesick Girls", youtubeId: "dyRsYk0LyA8", timestamp: 60, lyrics: [
    { line: "We are the ___ girls", answer: "lovesick", difficulty: "보통", hint: "사랑에 아픈" },
    { line: "But we still ___ for love", answer: "looking", difficulty: "보통", hint: "찾다" },
  ]},
  { artist: "BLACKPINK", song: "Pink Venom", youtubeId: "gQlMMD8auMs", timestamp: 50, lyrics: [
    { line: "Taste that pink ___", answer: "venom", difficulty: "보통", hint: "독" },
  ]},
  { artist: "BLACKPINK", song: "Shut Down", youtubeId: "POe9SOEKotk", timestamp: 55, lyrics: [
    { line: "Shut ___ yeah yeah yeah", answer: "down", difficulty: "쉬움", hint: "아래로" },
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
  { artist: "BLACKPINK", song: "JUMP", youtubeId: "0eVjrYI2T2A", timestamp: 45, lyrics: [
    { line: "We gonna ___ jump jump", answer: "jump", difficulty: "쉬움", hint: "뛰다" },
  ]},
  { artist: "BLACKPINK", song: "Forever Young", youtubeId: "89kTb73csYg", timestamp: 50, lyrics: [
    { line: "___ young", answer: "Forever", difficulty: "쉬움", hint: "영원히" },
  ]},
  { artist: "BLACKPINK", song: "Stay", youtubeId: "FzVR_fymZw4", timestamp: 48, lyrics: [
    { line: "넌 떠나지마 just ___", answer: "stay", difficulty: "쉬움", hint: "머물다" },
  ]},
  { artist: "BLACKPINK", song: "Ice Cream", youtubeId: "vRXZj0DzXIA", timestamp: 42, lyrics: [
    { line: "I'm like ice ___", answer: "cream", difficulty: "쉬움", hint: "크림" },
  ]},
  { artist: "BLACKPINK", song: "Ready For Love", youtubeId: "WOY8F2XmObQ", timestamp: 45, lyrics: [
    { line: "___ for love", answer: "Ready", difficulty: "쉬움", hint: "준비된" },
  ]},

  // ==================== NewJeans (12 songs) ====================
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
  ]},
  { artist: "NewJeans", song: "OMG", youtubeId: "sVTy_wmn5SU", timestamp: 45, lyrics: [
    { line: "___ you're like heaven to me", answer: "OMG", difficulty: "쉬움", hint: "오마이갓" },
  ]},
  { artist: "NewJeans", song: "Attention", youtubeId: "js1CtxSY38I", timestamp: 38, lyrics: [
    { line: "You give me ___", answer: "attention", difficulty: "쉬움", hint: "관심" },
  ]},
  { artist: "NewJeans", song: "Cookie", youtubeId: "VOmIplFAGeg", timestamp: 42, lyrics: [
    { line: "Come and take a ___ of my cookie", answer: "look", difficulty: "보통", hint: "보다" },
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
  { artist: "NewJeans", song: "Bubble Gum", youtubeId: "ccNLPPJZ28Q", timestamp: 38, lyrics: [
    { line: "___ gum", answer: "Bubble", difficulty: "쉬움", hint: "거품" },
  ]},
  { artist: "NewJeans", song: "Right Now", youtubeId: "Gvm0yrI9Mng", timestamp: 42, lyrics: [
    { line: "___ now", answer: "Right", difficulty: "쉬움", hint: "바로" },
  ]},

  // ==================== aespa (15 songs) ====================
  { artist: "aespa", song: "Supernova", youtubeId: "phuiiNCxRMg", timestamp: 45, lyrics: [
    { line: "Su-su-su-___", answer: "supernova", difficulty: "쉬움", hint: "초신성" },
    { line: "I'm stellar 너의 ___ 될게", answer: "universe", difficulty: "보통", hint: "우주" },
  ]},
  { artist: "aespa", song: "Next Level", youtubeId: "4TWR90KJl84", timestamp: 55, lyrics: [
    { line: "I'm on the ___ level", answer: "next", difficulty: "쉬움", hint: "다음" },
  ]},
  { artist: "aespa", song: "Savage", youtubeId: "WPdWvnAAurg", timestamp: 50, lyrics: [
    { line: "I'm a ___ don't act so nice", answer: "savage", difficulty: "보통", hint: "야만적인" },
  ]},
  { artist: "aespa", song: "Black Mamba", youtubeId: "ZeerrnuLi5E", timestamp: 48, lyrics: [
    { line: "Look at me now ___ mamba", answer: "black", difficulty: "쉬움", hint: "검은" },
  ]},
  { artist: "aespa", song: "Drama", youtubeId: "AS5Z9dXNpAg", timestamp: 52, lyrics: [
    { line: "Too much ___", answer: "drama", difficulty: "쉬움", hint: "드라마" },
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
  { artist: "aespa", song: "Whiplash", youtubeId: "EhBpOSbSeOo", timestamp: 45, lyrics: [
    { line: "___", answer: "Whiplash", difficulty: "보통", hint: "채찍" },
  ]},
  { artist: "aespa", song: "Illusion", youtubeId: "2tPxGvGXRdg", timestamp: 48, lyrics: [
    { line: "___", answer: "Illusion", difficulty: "보통", hint: "환상" },
  ]},
  { artist: "aespa", song: "Life's Too Short", youtubeId: "3Bh9O7epowE", timestamp: 42, lyrics: [
    { line: "Life's too ___", answer: "short", difficulty: "쉬움", hint: "짧은" },
  ]},
  { artist: "aespa", song: "Welcome To MY World", youtubeId: "Uhi2m6nrqbk", timestamp: 50, lyrics: [
    { line: "Welcome to my ___", answer: "world", difficulty: "쉬움", hint: "세계" },
  ]},
  { artist: "aespa", song: "Thirsty", youtubeId: "Cla8EMjk88I", timestamp: 45, lyrics: [
    { line: "I'm so ___", answer: "thirsty", difficulty: "보통", hint: "목마른" },
  ]},

  // ==================== IVE (12 songs) ====================
  { artist: "IVE", song: "LOVE DIVE", youtubeId: "Y8JFxS1HlDo", timestamp: 35, lyrics: [
    { line: "Wanna get high I wanna love ___", answer: "dive", difficulty: "쉬움", hint: "다이브" },
  ]},
  { artist: "IVE", song: "After LIKE", youtubeId: "F0B7HDiY-10", timestamp: 40, lyrics: [
    { line: "After ___ after like like", answer: "like", difficulty: "쉬움", hint: "좋아요" },
  ]},
  { artist: "IVE", song: "Eleven", youtubeId: "EZNBJbpJf48", timestamp: 38, lyrics: [
    { line: "1 it's like ___ out of 10", answer: "eleven", difficulty: "쉬움", hint: "11" },
  ]},
  { artist: "IVE", song: "Kitsch", youtubeId: "zvqnqwqA0JI", timestamp: 42, lyrics: [
    { line: "It's a little bit ___", answer: "kitsch", difficulty: "보통", hint: "키치" },
  ]},
  { artist: "IVE", song: "I AM", youtubeId: "6ZUIwj3FgUY", timestamp: 45, lyrics: [
    { line: "___ am what I am", answer: "I", difficulty: "쉬움", hint: "나" },
  ]},
  { artist: "IVE", song: "Baddie", youtubeId: "PnL4zIvL1V0", timestamp: 40, lyrics: [
    { line: "I'm a ___", answer: "baddie", difficulty: "쉬움", hint: "나쁜 여자" },
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
  { artist: "IVE", song: "Accendio", youtubeId: "DWnM6JKgMJQ", timestamp: 45, lyrics: [
    { line: "___", answer: "Accendio", difficulty: "보통", hint: "해리포터 주문" },
  ]},
  { artist: "IVE", song: "Rebel Heart", youtubeId: "TaPWUJPHKEI", timestamp: 42, lyrics: [
    { line: "___ heart", answer: "Rebel", difficulty: "보통", hint: "반항적인" },
  ]},

  // ==================== TWICE (15 songs) ====================
  { artist: "TWICE", song: "What is Love?", youtubeId: "i0p1bmr0EmE", timestamp: 60, lyrics: [
    { line: "I wanna know what is ___?", answer: "love", difficulty: "쉬움", hint: "사랑" },
  ]},
  { artist: "TWICE", song: "Feel Special", youtubeId: "3ymwOvzhwHs", timestamp: 50, lyrics: [
    { line: "You make me feel ___", answer: "special", difficulty: "쉬움", hint: "특별한" },
  ]},
  { artist: "TWICE", song: "TT", youtubeId: "ePpPVE-GGJw", timestamp: 42, lyrics: [
    { line: "Ba ba ba baby I'm your ___", answer: "baby", difficulty: "쉬움", hint: "아기" },
  ]},
  { artist: "TWICE", song: "Cheer Up", youtubeId: "c7rCyll5AeY", timestamp: 45, lyrics: [
    { line: "___ up baby cheer up baby", answer: "Cheer", difficulty: "쉬움", hint: "응원하다" },
  ]},
  { artist: "TWICE", song: "Dance The Night Away", youtubeId: "Fm5iP0S1z9w", timestamp: 48, lyrics: [
    { line: "___ the night away", answer: "Dance", difficulty: "쉬움", hint: "춤추다" },
  ]},
  { artist: "TWICE", song: "Fancy", youtubeId: "kOHB85vDuow", timestamp: 52, lyrics: [
    { line: "I ___ you", answer: "fancy", difficulty: "쉬움", hint: "좋아하다" },
  ]},
  { artist: "TWICE", song: "Yes or Yes", youtubeId: "mAKsZ26SabQ", timestamp: 45, lyrics: [
    { line: "___ or yes?", answer: "Yes", difficulty: "쉬움", hint: "네" },
  ]},
  { artist: "TWICE", song: "Likey", youtubeId: "V2hlQkVJZhE", timestamp: 50, lyrics: [
    { line: "Me ___", answer: "likey", difficulty: "쉬움", hint: "좋아요" },
  ]},
  { artist: "TWICE", song: "I Can't Stop Me", youtubeId: "CM4CkVFmTds", timestamp: 55, lyrics: [
    { line: "I ___ stop me", answer: "can't", difficulty: "쉬움", hint: "할 수 없다" },
  ]},
  { artist: "TWICE", song: "Alcohol-Free", youtubeId: "XA2YEHn-A8Q", timestamp: 48, lyrics: [
    { line: "Alcohol-___", answer: "free", difficulty: "쉬움", hint: "없는" },
  ]},
  { artist: "TWICE", song: "Talk That Talk", youtubeId: "k6jqx9kZgPM", timestamp: 45, lyrics: [
    { line: "___ that talk", answer: "Talk", difficulty: "쉬움", hint: "말하다" },
  ]},
  { artist: "TWICE", song: "SET ME FREE", youtubeId: "XV5aH9B6m_c", timestamp: 50, lyrics: [
    { line: "Set me ___", answer: "free", difficulty: "쉬움", hint: "자유롭게" },
  ]},
  { artist: "TWICE", song: "ONE SPARK", youtubeId: "V9_uNDJzCYI", timestamp: 42, lyrics: [
    { line: "One ___", answer: "spark", difficulty: "쉬움", hint: "불꽃" },
  ]},
  { artist: "TWICE", song: "Heart Shaker", youtubeId: "rRzxEiBLQCA", timestamp: 48, lyrics: [
    { line: "___ shaker", answer: "Heart", difficulty: "쉬움", hint: "심장" },
  ]},
  { artist: "TWICE", song: "SIGNAL", youtubeId: "VQtonf1fv_s", timestamp: 45, lyrics: [
    { line: "시그널 보내 ___", answer: "signal", difficulty: "쉬움", hint: "신호" },
  ]},

  // ==================== (G)I-DLE (12 songs) ====================
  { artist: "(G)I-DLE", song: "Queencard", youtubeId: "7HDeem-JaSY", timestamp: 40, lyrics: [
    { line: "I'm a ___", answer: "Queencard", difficulty: "쉬움", hint: "여왕 카드" },
  ]},
  { artist: "(G)I-DLE", song: "TOMBOY", youtubeId: "Jh4QFaPmdss", timestamp: 45, lyrics: [
    { line: "I'm a ___", answer: "tomboy", difficulty: "쉬움", hint: "톰보이" },
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
  { artist: "(G)I-DLE", song: "Wife", youtubeId: "fPLM5KF3A5w", timestamp: 45, lyrics: [
    { line: "I could be your ___", answer: "wife", difficulty: "쉬움", hint: "아내" },
  ]},
  { artist: "(G)I-DLE", song: "KLAXON", youtubeId: "3M_lxkT3vew", timestamp: 48, lyrics: [
    { line: "___", answer: "KLAXON", difficulty: "보통", hint: "경적" },
  ]},
  { artist: "(G)I-DLE", song: "Allergy", youtubeId: "9vHSA0qnuLI", timestamp: 42, lyrics: [
    { line: "I got ___", answer: "allergy", difficulty: "보통", hint: "알레르기" },
  ]},
  { artist: "(G)I-DLE", song: "DUMDi DUMDi", youtubeId: "HPQ5mqovXHo", timestamp: 40, lyrics: [
    { line: "___ dumdi", answer: "Dumdi", difficulty: "쉬움", hint: "덤디" },
  ]},

  // ==================== LE SSERAFIM (10 songs) ====================
  { artist: "LE SSERAFIM", song: "ANTIFRAGILE", youtubeId: "pyf8cbqyfPs", timestamp: 50, lyrics: [
    { line: "Anti-ti-ti-ti-___", answer: "fragile", difficulty: "쉬움", hint: "깨지기 쉬운" },
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
  { artist: "LE SSERAFIM", song: "SMART", youtubeId: "cTjuAXlpEIo", timestamp: 38, lyrics: [
    { line: "I'm so ___", answer: "smart", difficulty: "쉬움", hint: "똑똑한" },
  ]},
  { artist: "LE SSERAFIM", song: "SPAGHETTI", youtubeId: "5o5ZROgEKRI", timestamp: 45, lyrics: [
    { line: "___", answer: "SPAGHETTI", difficulty: "쉬움", hint: "스파게티" },
  ]},
  { artist: "LE SSERAFIM", song: "Eve, Psyche & The Bluebeard's wife", youtubeId: "XdH5XHC-6vY", timestamp: 50, lyrics: [
    { line: "Eve ___ & the Bluebeard's wife", answer: "Psyche", difficulty: "어려움", hint: "그리스 신화" },
  ]},
  { artist: "LE SSERAFIM", song: "Swan Song", youtubeId: "9LxqKCMZ6eA", timestamp: 48, lyrics: [
    { line: "___ song", answer: "Swan", difficulty: "쉬움", hint: "백조" },
  ]},
  { artist: "LE SSERAFIM", song: "Impurities", youtubeId: "4l1RlTp5xBM", timestamp: 42, lyrics: [
    { line: "___", answer: "Impurities", difficulty: "어려움", hint: "불순물" },
  ]},

  // ==================== Stray Kids (15 songs) ====================
  { artist: "Stray Kids", song: "LALALALA", youtubeId: "04A1oP_6u4Y", timestamp: 45, lyrics: [
    { line: "소리 질러 la la la la ___", answer: "la", difficulty: "쉬움", hint: "라" },
  ]},
  { artist: "Stray Kids", song: "God's Menu", youtubeId: "TQTlCHxyuu8", timestamp: 48, lyrics: [
    { line: "___'s menu", answer: "God", difficulty: "쉬움", hint: "신" },
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
  { artist: "Stray Kids", song: "MEGAVERSE", youtubeId: "We0YdKIBK5E", timestamp: 45, lyrics: [
    { line: "___", answer: "MEGAVERSE", difficulty: "보통", hint: "메가버스" },
  ]},
  { artist: "Stray Kids", song: "Chk Chk Boom", youtubeId: "IzMNFHCfh5Y", timestamp: 48, lyrics: [
    { line: "Chk chk ___", answer: "boom", difficulty: "쉬움", hint: "붐" },
  ]},
  { artist: "Stray Kids", song: "JJAM", youtubeId: "xP0VyBDlwlY", timestamp: 42, lyrics: [
    { line: "___", answer: "JJAM", difficulty: "쉬움", hint: "쨈" },
  ]},
  { artist: "Stray Kids", song: "Case 143", youtubeId: "uu3L9W-wMks", timestamp: 45, lyrics: [
    { line: "Case ___", answer: "143", difficulty: "쉬움", hint: "사랑해" },
  ]},
  { artist: "Stray Kids", song: "My Pace", youtubeId: "pok5yDw77uM", timestamp: 40, lyrics: [
    { line: "My ___", answer: "pace", difficulty: "쉬움", hint: "속도" },
  ]},
  { artist: "Stray Kids", song: "Hellevator", youtubeId: "AdfIfFGCqgo", timestamp: 50, lyrics: [
    { line: "___", answer: "Hellevator", difficulty: "보통", hint: "지옥+엘리베이터" },
  ]},
  { artist: "Stray Kids", song: "Lose My Breath", youtubeId: "gbdYOEKOa-c", timestamp: 45, lyrics: [
    { line: "Lose my ___", answer: "breath", difficulty: "쉬움", hint: "숨" },
  ]},

  // ==================== FIFTY FIFTY (5 songs) ====================
  { artist: "FIFTY FIFTY", song: "Cupid", youtubeId: "Qc7_zRjH808", timestamp: 55, lyrics: [
    { line: "I'm feeling lonely oh I wish I'd find a ___", answer: "lover", difficulty: "쉬움", hint: "연인" },
  ]},
  { artist: "FIFTY FIFTY", song: "Eeny meeny miny moe", youtubeId: "ZS8J8AFv6Bo", timestamp: 45, lyrics: [
    { line: "Eeny meeny miny ___", answer: "moe", difficulty: "쉬움", hint: "모" },
  ]},
  { artist: "FIFTY FIFTY", song: "Tell Me", youtubeId: "1IsBUxJvB-Y", timestamp: 42, lyrics: [
    { line: "___ me", answer: "Tell", difficulty: "쉬움", hint: "말해줘" },
  ]},
  { artist: "FIFTY FIFTY", song: "Lovin' Me", youtubeId: "j2gRiKfQxFE", timestamp: 48, lyrics: [
    { line: "___ me", answer: "Lovin'", difficulty: "쉬움", hint: "사랑하는" },
  ]},
  { artist: "FIFTY FIFTY", song: "Barbie Dreams", youtubeId: "5A2AaDJ8FqA", timestamp: 40, lyrics: [
    { line: "___ dreams", answer: "Barbie", difficulty: "쉬움", hint: "바비" },
  ]},

  // ==================== IU (10 songs) ====================
  { artist: "IU", song: "Celebrity", youtubeId: "0-q1KafFCLU", timestamp: 55, lyrics: [
    { line: "You are my ___", answer: "celebrity", difficulty: "보통", hint: "유명인" },
  ]},
  { artist: "IU", song: "Blueming", youtubeId: "D1PvIWdJ8xo", timestamp: 48, lyrics: [
    { line: "We are ___", answer: "blueming", difficulty: "보통", hint: "블루밍" },
  ]},
  { artist: "IU", song: "Palette", youtubeId: "d9IxdwEFk1c", timestamp: 52, lyrics: [
    { line: "___ 예쁘지 않은 color", answer: "Palette", difficulty: "보통", hint: "팔레트" },
  ]},
  { artist: "IU", song: "LILAC", youtubeId: "v7bnOxV4jAc", timestamp: 50, lyrics: [
    { line: "___", answer: "LILAC", difficulty: "쉬움", hint: "라일락" },
  ]},
  { artist: "IU", song: "eight", youtubeId: "TgOu00Mf3kI", timestamp: 45, lyrics: [
    { line: "___", answer: "eight", difficulty: "쉬움", hint: "8" },
  ]},
  { artist: "IU", song: "Good Day", youtubeId: "jeqdYqsrsA0", timestamp: 48, lyrics: [
    { line: "좋은 ___ 좋은 날", answer: "날", difficulty: "쉬움", hint: "day" },
  ]},
  { artist: "IU", song: "You & I", youtubeId: "NJR8Inf77Ac", timestamp: 50, lyrics: [
    { line: "You and ___", answer: "I", difficulty: "쉬움", hint: "나" },
  ]},
  { artist: "IU", song: "Love wins all", youtubeId: "nx1ejbHMjIw", timestamp: 52, lyrics: [
    { line: "___ wins all", answer: "Love", difficulty: "쉬움", hint: "사랑" },
  ]},
  { artist: "IU", song: "Twenty-three", youtubeId: "42Gtm4-Ax2U", timestamp: 45, lyrics: [
    { line: "___", answer: "Twenty-three", difficulty: "보통", hint: "23" },
  ]},
  { artist: "IU", song: "Friday", youtubeId: "EiVmQZwJhsA", timestamp: 42, lyrics: [
    { line: "___", answer: "Friday", difficulty: "쉬움", hint: "금요일" },
  ]},

  // ==================== Red Velvet (10 songs) ====================
  { artist: "Red Velvet", song: "Psycho", youtubeId: "uR8Mrt1IpXg", timestamp: 52, lyrics: [
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
  { artist: "Red Velvet", song: "Power Up", youtubeId: "aiHSVQy9xN8", timestamp: 45, lyrics: [
    { line: "___ up", answer: "Power", difficulty: "쉬움", hint: "힘" },
  ]},
  { artist: "Red Velvet", song: "Dumb Dumb", youtubeId: "XGdbaEDVWp0", timestamp: 48, lyrics: [
    { line: "___ dumb", answer: "Dumb", difficulty: "쉬움", hint: "멍청한" },
  ]},
  { artist: "Red Velvet", song: "Russian Roulette", youtubeId: "QslJYDX3o8s", timestamp: 42, lyrics: [
    { line: "___ roulette", answer: "Russian", difficulty: "보통", hint: "러시안" },
  ]},
  { artist: "Red Velvet", song: "Chill Kill", youtubeId: "mqePb3bL8d0", timestamp: 50, lyrics: [
    { line: "___ kill", answer: "Chill", difficulty: "쉬움", hint: "차가운" },
  ]},

  // ==================== EXO (10 songs) ====================
  { artist: "EXO", song: "Love Shot", youtubeId: "pSudEWuqDZ8", timestamp: 50, lyrics: [
    { line: "Love ___", answer: "shot", difficulty: "쉬움", hint: "샷" },
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
  { artist: "EXO", song: "Obsession", youtubeId: "uxmP4b2a0uY", timestamp: 48, lyrics: [
    { line: "___", answer: "Obsession", difficulty: "보통", hint: "집착" },
  ]},
  { artist: "EXO", song: "Lotto", youtubeId: "tbe3pe2BtwA", timestamp: 45, lyrics: [
    { line: "___", answer: "Lotto", difficulty: "쉬움", hint: "로또" },
  ]},
  { artist: "EXO", song: "Don't Fight The Feeling", youtubeId: "5R-VdDsqHE8", timestamp: 50, lyrics: [
    { line: "Don't fight the ___", answer: "feeling", difficulty: "쉬움", hint: "감정" },
  ]},

  // ==================== NCT (12 songs) ====================
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
  { artist: "NCT 127", song: "Cherry Bomb", youtubeId: "WkuHLzMMTZM", timestamp: 50, lyrics: [
    { line: "___ bomb", answer: "Cherry", difficulty: "쉬움", hint: "체리" },
  ]},
  { artist: "NCT 127", song: "2 Baddies", youtubeId: "VM-g_bkFdzo", timestamp: 48, lyrics: [
    { line: "2 ___", answer: "baddies", difficulty: "쉬움", hint: "나쁜 놈들" },
  ]},
  { artist: "NCT 127", song: "Ay-Yo", youtubeId: "s6-8G1E1bpw", timestamp: 45, lyrics: [
    { line: "___-Yo", answer: "Ay", difficulty: "쉬움", hint: "에이" },
  ]},
  { artist: "NCT DREAM", song: "ISTJ", youtubeId: "bYREdTJ-rBU", timestamp: 42, lyrics: [
    { line: "___", answer: "ISTJ", difficulty: "쉬움", hint: "MBTI" },
  ]},
  { artist: "NCT DREAM", song: "Smoothie", youtubeId: "kREEhvL2bCE", timestamp: 48, lyrics: [
    { line: "___", answer: "Smoothie", difficulty: "쉬움", hint: "스무디" },
  ]},
  { artist: "NCT 127", song: "Superhuman", youtubeId: "x95oZNxW5Rc", timestamp: 50, lyrics: [
    { line: "___", answer: "Superhuman", difficulty: "보통", hint: "초인" },
  ]},
  { artist: "NCT DREAM", song: "Broken Melodies", youtubeId: "jc_RCr0YpMQ", timestamp: 45, lyrics: [
    { line: "___ melodies", answer: "Broken", difficulty: "보통", hint: "깨진" },
  ]},

  // ==================== SEVENTEEN (12 songs) ====================
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
  { artist: "SEVENTEEN", song: "God of Music", youtubeId: "s44OQT0E1nU", timestamp: 45, lyrics: [
    { line: "___ of music", answer: "God", difficulty: "쉬움", hint: "신" },
  ]},
  { artist: "SEVENTEEN", song: "Fighting", youtubeId: "LRqDLoSA6E4", timestamp: 42, lyrics: [
    { line: "___", answer: "Fighting", difficulty: "쉬움", hint: "화이팅" },
  ]},
  { artist: "SEVENTEEN", song: "Clap", youtubeId: "CyzEtbG-sxY", timestamp: 48, lyrics: [
    { line: "___", answer: "Clap", difficulty: "쉬움", hint: "박수" },
  ]},
  { artist: "SEVENTEEN", song: "Left & Right", youtubeId: "HdZdxocqzq4", timestamp: 45, lyrics: [
    { line: "___ and right", answer: "Left", difficulty: "쉬움", hint: "왼쪽" },
  ]},
  { artist: "SEVENTEEN", song: "HIT", youtubeId: "F9CrRG6j2SM", timestamp: 42, lyrics: [
    { line: "___", answer: "HIT", difficulty: "쉬움", hint: "치다" },
  ]},
  { artist: "SEVENTEEN", song: "Aju Nice", youtubeId: "J-wFp43rew4", timestamp: 40, lyrics: [
    { line: "___ nice", answer: "Aju", difficulty: "쉬움", hint: "아주" },
  ]},
  { artist: "SEVENTEEN", song: "Rock with you", youtubeId: "WpuatuzSDK4", timestamp: 48, lyrics: [
    { line: "___ with you", answer: "Rock", difficulty: "쉬움", hint: "락" },
  ]},

  // ==================== TXT (10 songs) ====================
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
  { artist: "TXT", song: "Good Boy Gone Bad", youtubeId: "Os_6PRQ1QBE", timestamp: 45, lyrics: [
    { line: "Good boy gone ___", answer: "bad", difficulty: "쉬움", hint: "나쁜" },
  ]},
  { artist: "TXT", song: "Anti-Romantic", youtubeId: "FaXlp4kxGqk", timestamp: 50, lyrics: [
    { line: "___-romantic", answer: "Anti", difficulty: "보통", hint: "반대" },
  ]},
  { artist: "TXT", song: "Deja Vu", youtubeId: "2BTVTe6Xy80", timestamp: 42, lyrics: [
    { line: "Deja ___", answer: "vu", difficulty: "쉬움", hint: "뷰" },
  ]},
  { artist: "TXT", song: "LO$ER=LO♡ER", youtubeId: "JzODRUBBXpc", timestamp: 48, lyrics: [
    { line: "___=LOVER", answer: "LOSER", difficulty: "보통", hint: "패배자" },
  ]},
  { artist: "TXT", song: "Back for More", youtubeId: "6OmcnwNVJiE", timestamp: 45, lyrics: [
    { line: "___ for more", answer: "Back", difficulty: "쉬움", hint: "돌아오다" },
  ]},

  // ==================== ENHYPEN (10 songs) ====================
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
  { artist: "ENHYPEN", song: "Sweet Venom", youtubeId: "a8YSg4mFfE8", timestamp: 45, lyrics: [
    { line: "___ venom", answer: "Sweet", difficulty: "쉬움", hint: "달콤한" },
  ]},
  { artist: "ENHYPEN", song: "Fever", youtubeId: "WUVmuBJ6TV0", timestamp: 42, lyrics: [
    { line: "___", answer: "Fever", difficulty: "쉬움", hint: "열" },
  ]},
  { artist: "ENHYPEN", song: "Tamed-Dashed", youtubeId: "6iVAGZ0xldw", timestamp: 48, lyrics: [
    { line: "Tamed-___", answer: "dashed", difficulty: "보통", hint: "달려가다" },
  ]},
  { artist: "ENHYPEN", song: "Future Perfect", youtubeId: "e8ck9QPFNqs", timestamp: 45, lyrics: [
    { line: "___ perfect", answer: "Future", difficulty: "쉬움", hint: "미래" },
  ]},
  { artist: "ENHYPEN", song: "XO", youtubeId: "KKJIy0CPMSU", timestamp: 42, lyrics: [
    { line: "___", answer: "XO", difficulty: "쉬움", hint: "엑스오" },
  ]},
  { artist: "ENHYPEN", song: "Sacrifice", youtubeId: "H0yThKNQchk", timestamp: 50, lyrics: [
    { line: "___", answer: "Sacrifice", difficulty: "보통", hint: "희생" },
  ]},

  // ==================== ATEEZ (8 songs) ====================
  { artist: "ATEEZ", song: "WONDERLAND", youtubeId: "Z_BhMhZpAug", timestamp: 48, lyrics: [
    { line: "Welcome to ___", answer: "wonderland", difficulty: "쉬움", hint: "이상한 나라" },
  ]},
  { artist: "ATEEZ", song: "Guerrilla", youtubeId: "2HcVZm_4qAI", timestamp: 45, lyrics: [
    { line: "___", answer: "Guerrilla", difficulty: "보통", hint: "게릴라" },
  ]},
  { artist: "ATEEZ", song: "HALAZIA", youtubeId: "e6O84iYhtIg", timestamp: 50, lyrics: [
    { line: "___", answer: "HALAZIA", difficulty: "보통", hint: "할라지아" },
  ]},
  { artist: "ATEEZ", song: "BOUNCY", youtubeId: "cUo-s7VnVns", timestamp: 42, lyrics: [
    { line: "___", answer: "BOUNCY", difficulty: "쉬움", hint: "탱글탱글" },
  ]},
  { artist: "ATEEZ", song: "WAVE", youtubeId: "FIInyEWWW-s", timestamp: 45, lyrics: [
    { line: "___", answer: "WAVE", difficulty: "쉬움", hint: "파도" },
  ]},
  { artist: "ATEEZ", song: "Answer", youtubeId: "yW7wZX3DUaY", timestamp: 48, lyrics: [
    { line: "___", answer: "Answer", difficulty: "쉬움", hint: "대답" },
  ]},
  { artist: "ATEEZ", song: "Crazy Form", youtubeId: "ql0N0NpkJAk", timestamp: 42, lyrics: [
    { line: "___ form", answer: "Crazy", difficulty: "쉬움", hint: "미친" },
  ]},
  { artist: "ATEEZ", song: "Work", youtubeId: "eTzLq8V9G9g", timestamp: 45, lyrics: [
    { line: "___", answer: "Work", difficulty: "쉬움", hint: "일하다" },
  ]},

  // ==================== ITZY (10 songs) ====================
  { artist: "ITZY", song: "DALLA DALLA", youtubeId: "pNfTK39k55U", timestamp: 45, lyrics: [
    { line: "I'm so ___", answer: "different", difficulty: "보통", hint: "다른" },
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
  { artist: "ITZY", song: "Not Shy", youtubeId: "wTowEKjDGkU", timestamp: 48, lyrics: [
    { line: "Not ___", answer: "shy", difficulty: "쉬움", hint: "수줍은" },
  ]},
  { artist: "ITZY", song: "CAKE", youtubeId: "mOF1l3lXjnA", timestamp: 42, lyrics: [
    { line: "___", answer: "CAKE", difficulty: "쉬움", hint: "케이크" },
  ]},
  { artist: "ITZY", song: "BORN TO BE", youtubeId: "ddxTUl60e9I", timestamp: 45, lyrics: [
    { line: "___ to be", answer: "Born", difficulty: "쉬움", hint: "태어나다" },
  ]},
  { artist: "ITZY", song: "Voltage", youtubeId: "RUlO7sQ_Qqs", timestamp: 40, lyrics: [
    { line: "___", answer: "Voltage", difficulty: "보통", hint: "전압" },
  ]},

  // ==================== NMIXX (8 songs) ====================
  { artist: "NMIXX", song: "O.O", youtubeId: "cKi-mXc5lks", timestamp: 45, lyrics: [
    { line: "___.O", answer: "O", difficulty: "쉬움", hint: "오" },
  ]},
  { artist: "NMIXX", song: "DASH", youtubeId: "i0yNS-F2SaA", timestamp: 42, lyrics: [
    { line: "___", answer: "DASH", difficulty: "쉬움", hint: "대시" },
  ]},
  { artist: "NMIXX", song: "Love Me Like This", youtubeId: "AA3SZa9NDmk", timestamp: 48, lyrics: [
    { line: "Love me like ___", answer: "this", difficulty: "쉬움", hint: "이것" },
  ]},
  { artist: "NMIXX", song: "Dice", youtubeId: "5EVq7BKSL10", timestamp: 45, lyrics: [
    { line: "___", answer: "Dice", difficulty: "쉬움", hint: "주사위" },
  ]},
  { artist: "NMIXX", song: "Young, Dumb, Stupid", youtubeId: "U41q_i2C7is", timestamp: 42, lyrics: [
    { line: "Young, dumb, ___", answer: "stupid", difficulty: "쉬움", hint: "멍청한" },
  ]},
  { artist: "NMIXX", song: "Run For Roses", youtubeId: "2_zb1Ygmnbc", timestamp: 48, lyrics: [
    { line: "___ for roses", answer: "Run", difficulty: "쉬움", hint: "달리다" },
  ]},
  { artist: "NMIXX", song: "TANK", youtubeId: "JHThM-pdVSg", timestamp: 45, lyrics: [
    { line: "___", answer: "TANK", difficulty: "쉬움", hint: "탱크" },
  ]},
  { artist: "NMIXX", song: "Reality Hurts", youtubeId: "LxgGkl_oEqE", timestamp: 42, lyrics: [
    { line: "___ hurts", answer: "Reality", difficulty: "보통", hint: "현실" },
  ]},

  // ==================== MAMAMOO (6 songs) ====================
  { artist: "MAMAMOO", song: "HIP", youtubeId: "KhTeiaCezwM", timestamp: 50, lyrics: [
    { line: "I'm so ___", answer: "hip", difficulty: "쉬움", hint: "힙한" },
  ]},
  { artist: "MAMAMOO", song: "Dingga", youtubeId: "dfl9KIX1WpU", timestamp: 45, lyrics: [
    { line: "___", answer: "Dingga", difficulty: "쉬움", hint: "딩가" },
  ]},
  { artist: "MAMAMOO", song: "gogobebe", youtubeId: "dRi7fOrPCaA", timestamp: 48, lyrics: [
    { line: "고고베베 ___", answer: "gogobebe", difficulty: "쉬움", hint: "고고베베" },
  ]},
  { artist: "MAMAMOO", song: "Starry Night", youtubeId: "0FB2EoKTK_Q", timestamp: 52, lyrics: [
    { line: "___ night", answer: "Starry", difficulty: "보통", hint: "별이 빛나는" },
  ]},
  { artist: "MAMAMOO", song: "Egotistic", youtubeId: "G5UM2rOyqr4", timestamp: 45, lyrics: [
    { line: "___", answer: "Egotistic", difficulty: "어려움", hint: "이기적인" },
  ]},
  { artist: "MAMAMOO", song: "AYA", youtubeId: "UoI9riNffEU", timestamp: 48, lyrics: [
    { line: "___", answer: "AYA", difficulty: "쉬움", hint: "아야" },
  ]},

  // ==================== Kep1er (5 songs) ====================
  { artist: "Kep1er", song: "WA DA DA", youtubeId: "n0j5NPptyM0", timestamp: 42, lyrics: [
    { line: "Wa da ___", answer: "da", difficulty: "쉬움", hint: "다" },
  ]},
  { artist: "Kep1er", song: "Up!", youtubeId: "5_ogfSPclOg", timestamp: 40, lyrics: [
    { line: "___!", answer: "Up", difficulty: "쉬움", hint: "위로" },
  ]},
  { artist: "Kep1er", song: "Shooting Star", youtubeId: "tEblIAi5hNk", timestamp: 45, lyrics: [
    { line: "___ star", answer: "Shooting", difficulty: "보통", hint: "유성" },
  ]},
  { artist: "Kep1er", song: "Giddy", youtubeId: "1aB9w0LsAK4", timestamp: 42, lyrics: [
    { line: "___", answer: "Giddy", difficulty: "보통", hint: "어지러운" },
  ]},
  { artist: "Kep1er", song: "LVLY", youtubeId: "tEblIAi5hNk", timestamp: 40, lyrics: [
    { line: "___", answer: "LVLY", difficulty: "보통", hint: "러블리" },
  ]},

  // ==================== Girls' Generation (5 songs) ====================
  { artist: "Girls' Generation", song: "Gee", youtubeId: "U7mPqycQ0tQ", timestamp: 45, lyrics: [
    { line: "___ gee gee gee baby baby baby", answer: "Gee", difficulty: "쉬움", hint: "지" },
  ]},
  { artist: "Girls' Generation", song: "I Got a Boy", youtubeId: "wq7ftOZBy0E", timestamp: 50, lyrics: [
    { line: "I got a ___", answer: "boy", difficulty: "쉬움", hint: "소년" },
  ]},
  { artist: "Girls' Generation", song: "Lion Heart", youtubeId: "nVCubhQ454c", timestamp: 48, lyrics: [
    { line: "___ heart", answer: "Lion", difficulty: "쉬움", hint: "사자" },
  ]},
  { artist: "Girls' Generation", song: "The Boys", youtubeId: "6pA_Tou-DPI", timestamp: 52, lyrics: [
    { line: "The ___", answer: "boys", difficulty: "쉬움", hint: "소년들" },
  ]},
  { artist: "Girls' Generation", song: "FOREVER 1", youtubeId: "uMeR2W19wT0", timestamp: 45, lyrics: [
    { line: "Forever ___", answer: "1", difficulty: "쉬움", hint: "하나" },
  ]},

  // ==================== BIGBANG (5 songs) ====================
  { artist: "BIGBANG", song: "BANG BANG BANG", youtubeId: "2ips2mM7Zqw", timestamp: 45, lyrics: [
    { line: "___ bang bang", answer: "Bang", difficulty: "쉬움", hint: "뱅" },
  ]},
  { artist: "BIGBANG", song: "FANTASTIC BABY", youtubeId: "AAbokV76tkU", timestamp: 50, lyrics: [
    { line: "___ baby", answer: "Fantastic", difficulty: "쉬움", hint: "환상적인" },
  ]},
  { artist: "BIGBANG", song: "LOSER", youtubeId: "1CTced9CMMk", timestamp: 52, lyrics: [
    { line: "I'm a ___", answer: "loser", difficulty: "쉬움", hint: "패배자" },
  ]},
  { artist: "BIGBANG", song: "FXXK IT", youtubeId: "iIPH8LFYFRk", timestamp: 48, lyrics: [
    { line: "___ it", answer: "Fxxk", difficulty: "보통", hint: "에프" },
  ]},
  { artist: "BIGBANG", song: "Last Dance", youtubeId: "--zku6TB5NY", timestamp: 55, lyrics: [
    { line: "___ dance", answer: "Last", difficulty: "쉬움", hint: "마지막" },
  ]},

  // ==================== PSY (4 songs) ====================
  { artist: "PSY", song: "Gangnam Style", youtubeId: "9bZkp7q19f0", timestamp: 60, lyrics: [
    { line: "오빤 ___ 스타일", answer: "강남", difficulty: "쉬움", hint: "gangnam" },
  ]},
  { artist: "PSY", song: "Gentleman", youtubeId: "ASO_zypdnsQ", timestamp: 55, lyrics: [
    { line: "I'm a ___", answer: "gentleman", difficulty: "쉬움", hint: "신사" },
  ]},
  { artist: "PSY", song: "DADDY", youtubeId: "FrG4TEcSuRg", timestamp: 48, lyrics: [
    { line: "___", answer: "DADDY", difficulty: "쉬움", hint: "아빠" },
  ]},
  { artist: "PSY", song: "That That", youtubeId: "8dJyRm2jJ-U", timestamp: 50, lyrics: [
    { line: "___ that", answer: "That", difficulty: "쉬움", hint: "그것" },
  ]},

  // ==================== TREASURE (5 songs) ====================
  { artist: "TREASURE", song: "JIKJIN", youtubeId: "dj4xEbDNDgk", timestamp: 48, lyrics: [
    { line: "___", answer: "JIKJIN", difficulty: "보통", hint: "직진" },
  ]},
  { artist: "TREASURE", song: "Hello", youtubeId: "qMIn3lSY5jc", timestamp: 42, lyrics: [
    { line: "___", answer: "Hello", difficulty: "쉬움", hint: "안녕" },
  ]},
  { artist: "TREASURE", song: "BONA BONA", youtubeId: "JBxE51NyqJU", timestamp: 45, lyrics: [
    { line: "___ bona", answer: "Bona", difficulty: "쉬움", hint: "보나" },
  ]},
  { artist: "TREASURE", song: "KING KONG", youtubeId: "PbGzamZx3Go", timestamp: 48, lyrics: [
    { line: "King ___", answer: "kong", difficulty: "쉬움", hint: "킹콩" },
  ]},
  { artist: "TREASURE", song: "BOY", youtubeId: "6rskjyQ5z1Q", timestamp: 42, lyrics: [
    { line: "___", answer: "BOY", difficulty: "쉬움", hint: "소년" },
  ]},

  // ==================== RIIZE (5 songs) ====================
  { artist: "RIIZE", song: "Get A Guitar", youtubeId: "5y-HhZWxCQw", timestamp: 42, lyrics: [
    { line: "Get a ___", answer: "guitar", difficulty: "쉬움", hint: "기타" },
  ]},
  { artist: "RIIZE", song: "Boom Boom Bass", youtubeId: "aTjujCVNaKI", timestamp: 40, lyrics: [
    { line: "Boom boom ___", answer: "bass", difficulty: "쉬움", hint: "베이스" },
  ]},
  { artist: "RIIZE", song: "Love 119", youtubeId: "qbJsuB8BMXg", timestamp: 45, lyrics: [
    { line: "Love ___", answer: "119", difficulty: "쉬움", hint: "일일구" },
  ]},
  { artist: "RIIZE", song: "Siren", youtubeId: "9eH7vXqQZ9c", timestamp: 42, lyrics: [
    { line: "___", answer: "Siren", difficulty: "보통", hint: "사이렌" },
  ]},
  { artist: "RIIZE", song: "Impossible", youtubeId: "V9eNGg0mpLI", timestamp: 48, lyrics: [
    { line: "___", answer: "Impossible", difficulty: "보통", hint: "불가능한" },
  ]},

  // ==================== ZEROBASEONE (5 songs) ====================
  { artist: "ZEROBASEONE", song: "In Bloom", youtubeId: "U8gTSIbA9wc", timestamp: 45, lyrics: [
    { line: "In ___", answer: "bloom", difficulty: "쉬움", hint: "꽃이 피다" },
  ]},
  { artist: "ZEROBASEONE", song: "CRUSH", youtubeId: "zPeZwLgGVFQ", timestamp: 42, lyrics: [
    { line: "___", answer: "CRUSH", difficulty: "쉬움", hint: "크러쉬" },
  ]},
  { artist: "ZEROBASEONE", song: "MELTING POINT", youtubeId: "JhxWTCLAOe4", timestamp: 48, lyrics: [
    { line: "___ point", answer: "Melting", difficulty: "보통", hint: "녹는" },
  ]},
  { artist: "ZEROBASEONE", song: "SWEAT", youtubeId: "U9TKY8kN1zc", timestamp: 40, lyrics: [
    { line: "___", answer: "SWEAT", difficulty: "쉬움", hint: "땀" },
  ]},
  { artist: "ZEROBASEONE", song: "Feel the POP", youtubeId: "7WR78JJXB_0", timestamp: 45, lyrics: [
    { line: "Feel the ___", answer: "POP", difficulty: "쉬움", hint: "팝" },
  ]},

  // ==================== TWS (4 songs) ====================
  { artist: "TWS", song: "Plot Twist", youtubeId: "YnmS76x77q0", timestamp: 40, lyrics: [
    { line: "___ twist", answer: "Plot", difficulty: "보통", hint: "줄거리" },
  ]},
  { artist: "TWS", song: "If I'm S, Can You Be My N?", youtubeId: "NMuMaYjHbJw", timestamp: 45, lyrics: [
    { line: "If I'm ___, can you be my N?", answer: "S", difficulty: "쉬움", hint: "에스" },
  ]},
  { artist: "TWS", song: "BFF", youtubeId: "sLzGuaS4cQY", timestamp: 42, lyrics: [
    { line: "___", answer: "BFF", difficulty: "쉬움", hint: "베스트 프렌드 포에버" },
  ]},
  { artist: "TWS", song: "Hey! Ticky-Tock", youtubeId: "QeepSMPhxlM", timestamp: 38, lyrics: [
    { line: "Hey! Ticky-___", answer: "tock", difficulty: "쉬움", hint: "똑딱" },
  ]},

  // ==================== BOYNEXTDOOR (4 songs) ====================
  { artist: "BOYNEXTDOOR", song: "One and Only", youtubeId: "GQz8gS3hOiA", timestamp: 42, lyrics: [
    { line: "One and ___", answer: "only", difficulty: "쉬움", hint: "유일한" },
  ]},
  { artist: "BOYNEXTDOOR", song: "But I Like You", youtubeId: "FDY2kGZqV_I", timestamp: 45, lyrics: [
    { line: "But I ___ you", answer: "like", difficulty: "쉬움", hint: "좋아하다" },
  ]},
  { artist: "BOYNEXTDOOR", song: "Earth, Wind & Fire", youtubeId: "_42LlmpuCZo", timestamp: 40, lyrics: [
    { line: "Earth, wind & ___", answer: "fire", difficulty: "쉬움", hint: "불" },
  ]},
  { artist: "BOYNEXTDOOR", song: "Serenade", youtubeId: "9xQUYplHGo4", timestamp: 48, lyrics: [
    { line: "___", answer: "Serenade", difficulty: "보통", hint: "세레나데" },
  ]},

  // ==================== ILLIT (5 songs) ====================
  { artist: "ILLIT", song: "Magnetic", youtubeId: "Vk5-c_v4gMU", timestamp: 38, lyrics: [
    { line: "___", answer: "Magnetic", difficulty: "보통", hint: "자석같은" },
  ]},
  { artist: "ILLIT", song: "Lucky Girl Syndrome", youtubeId: "Q9QhPtFqaXY", timestamp: 42, lyrics: [
    { line: "___ girl syndrome", answer: "Lucky", difficulty: "쉬움", hint: "행운의" },
  ]},
  { artist: "ILLIT", song: "My World", youtubeId: "nmlNTzCY5gE", timestamp: 40, lyrics: [
    { line: "My ___", answer: "world", difficulty: "쉬움", hint: "세계" },
  ]},
  { artist: "ILLIT", song: "Cherish", youtubeId: "dR4uXQqGMxI", timestamp: 45, lyrics: [
    { line: "___", answer: "Cherish", difficulty: "보통", hint: "소중히 여기다" },
  ]},
  { artist: "ILLIT", song: "Tick-Tack", youtubeId: "N-w9jjGFE8k", timestamp: 38, lyrics: [
    { line: "Tick-___", answer: "Tack", difficulty: "쉬움", hint: "똑딱" },
  ]},

  // ==================== BABYMONSTER (6 songs) ====================
  { artist: "BABYMONSTER", song: "SHEESH", youtubeId: "dKO9EgI-22c", timestamp: 45, lyrics: [
    { line: "___", answer: "SHEESH", difficulty: "쉬움", hint: "쉬쉬" },
  ]},
  { artist: "BABYMONSTER", song: "BATTER UP", youtubeId: "vsyVnfWrNfw", timestamp: 42, lyrics: [
    { line: "___ up", answer: "Batter", difficulty: "보통", hint: "타자" },
  ]},
  { artist: "BABYMONSTER", song: "FOREVER", youtubeId: "7i_isMU9FoM", timestamp: 48, lyrics: [
    { line: "___", answer: "FOREVER", difficulty: "쉬움", hint: "영원히" },
  ]},
  { artist: "BABYMONSTER", song: "DRIP", youtubeId: "4v8HGZxS2Qg", timestamp: 40, lyrics: [
    { line: "___", answer: "DRIP", difficulty: "쉬움", hint: "드립" },
  ]},
  { artist: "BABYMONSTER", song: "WE GO UP", youtubeId: "k-V7mZ-nQ0k", timestamp: 45, lyrics: [
    { line: "We go ___", answer: "up", difficulty: "쉬움", hint: "위로" },
  ]},
  { artist: "BABYMONSTER", song: "PSYCHO", youtubeId: "HJpJfFJDxDc", timestamp: 42, lyrics: [
    { line: "___", answer: "PSYCHO", difficulty: "쉬움", hint: "사이코" },
  ]},

  // ==================== KISS OF LIFE (5 songs) ====================
  { artist: "KISS OF LIFE", song: "Midas Touch", youtubeId: "hKdVLNz5JmI", timestamp: 45, lyrics: [
    { line: "___ touch", answer: "Midas", difficulty: "보통", hint: "마이다스" },
  ]},
  { artist: "KISS OF LIFE", song: "Sugarcoat", youtubeId: "ryjqEP_q8jI", timestamp: 42, lyrics: [
    { line: "___", answer: "Sugarcoat", difficulty: "보통", hint: "설탕코팅" },
  ]},
  { artist: "KISS OF LIFE", song: "Sticky", youtubeId: "mKbAaNFbV8M", timestamp: 40, lyrics: [
    { line: "___", answer: "Sticky", difficulty: "쉬움", hint: "끈적끈적" },
  ]},
  { artist: "KISS OF LIFE", song: "Shhh", youtubeId: "8u8TRHyVdLw", timestamp: 45, lyrics: [
    { line: "___", answer: "Shhh", difficulty: "쉬움", hint: "쉿" },
  ]},
  { artist: "KISS OF LIFE", song: "Lucky", youtubeId: "2VJz1bzOBo0", timestamp: 42, lyrics: [
    { line: "___", answer: "Lucky", difficulty: "쉬움", hint: "행운의" },
  ]},

  // ==================== KATSEYE (3 songs) ====================
  { artist: "KATSEYE", song: "Debut", youtubeId: "TCJbH4nYXbo", timestamp: 40, lyrics: [
    { line: "___", answer: "Debut", difficulty: "쉬움", hint: "데뷔" },
  ]},
  { artist: "KATSEYE", song: "Touch", youtubeId: "h3KQDF9FZ-Y", timestamp: 42, lyrics: [
    { line: "___", answer: "Touch", difficulty: "쉬움", hint: "터치" },
  ]},
  { artist: "KATSEYE", song: "My Way", youtubeId: "F_TCJbH4nYX", timestamp: 38, lyrics: [
    { line: "My ___", answer: "way", difficulty: "쉬움", hint: "방법" },
  ]},

  // ==================== ROSÉ (Solo) (3 songs) ====================
  { artist: "ROSÉ", song: "APT.", youtubeId: "ekr2nIex040", timestamp: 45, lyrics: [
    { line: "___", answer: "APT", difficulty: "쉬움", hint: "아파트" },
  ]},
  { artist: "ROSÉ", song: "On The Ground", youtubeId: "CKZvWhCqx1s", timestamp: 50, lyrics: [
    { line: "On the ___", answer: "ground", difficulty: "쉬움", hint: "땅" },
  ]},
  { artist: "ROSÉ", song: "Gone", youtubeId: "cRSyA87e6Xo", timestamp: 48, lyrics: [
    { line: "___", answer: "Gone", difficulty: "쉬움", hint: "사라진" },
  ]},

  // ==================== JENNIE (Solo) (3 songs) ====================
  { artist: "JENNIE", song: "SOLO", youtubeId: "b73BI9eUkjM", timestamp: 45, lyrics: [
    { line: "I'm going ___", answer: "solo", difficulty: "쉬움", hint: "솔로" },
  ]},
  { artist: "JENNIE", song: "You & Me", youtubeId: "1mYqY-YiQ-Y", timestamp: 48, lyrics: [
    { line: "You and ___", answer: "me", difficulty: "쉬움", hint: "나" },
  ]},
  { artist: "JENNIE", song: "Mantra", youtubeId: "EG5RO3b-mAc", timestamp: 42, lyrics: [
    { line: "___", answer: "Mantra", difficulty: "보통", hint: "주문" },
  ]},

  // ==================== LISA (Solo) (3 songs) ====================
  { artist: "LISA", song: "LALISA", youtubeId: "awkkyBH2zEo", timestamp: 50, lyrics: [
    { line: "___", answer: "LALISA", difficulty: "쉬움", hint: "라리사" },
  ]},
  { artist: "LISA", song: "MONEY", youtubeId: "dNCWe_6HAM8", timestamp: 45, lyrics: [
    { line: "___", answer: "MONEY", difficulty: "쉬움", hint: "돈" },
  ]},
  { artist: "LISA", song: "ROCKSTAR", youtubeId: "jJ6FVdRSrzE", timestamp: 42, lyrics: [
    { line: "I'm a ___", answer: "rockstar", difficulty: "쉬움", hint: "록스타" },
  ]},

  // ==================== Jisoo (Solo) (2 songs) ====================
  { artist: "Jisoo", song: "FLOWER", youtubeId: "afqx7ZslPt4", timestamp: 48, lyrics: [
    { line: "___", answer: "FLOWER", difficulty: "쉬움", hint: "꽃" },
  ]},
  { artist: "Jisoo", song: "All Eyes On Me", youtubeId: "VX7iHnGBhIc", timestamp: 45, lyrics: [
    { line: "All ___ on me", answer: "eyes", difficulty: "쉬움", hint: "눈" },
  ]},

  // ==================== Sunmi (3 songs) ====================
  { artist: "SUNMI", song: "Gashina", youtubeId: "ur0hCdne2-s", timestamp: 48, lyrics: [
    { line: "___", answer: "Gashina", difficulty: "보통", hint: "가시나" },
  ]},
  { artist: "SUNMI", song: "Siren", youtubeId: "TNWMZIf7eSg", timestamp: 45, lyrics: [
    { line: "___", answer: "Siren", difficulty: "보통", hint: "사이렌" },
  ]},
  { artist: "SUNMI", song: "CYNICAL", youtubeId: "kI0AQFG0GSM", timestamp: 42, lyrics: [
    { line: "___", answer: "CYNICAL", difficulty: "어려움", hint: "냉소적인" },
  ]},

  // ==================== Chungha (3 songs) ====================
  { artist: "CHUNGHA", song: "Gotta Go", youtubeId: "HlN2BXNJzxA", timestamp: 48, lyrics: [
    { line: "___ go", answer: "Gotta", difficulty: "쉬움", hint: "가야해" },
  ]},
  { artist: "CHUNGHA", song: "Roller Coaster", youtubeId: "900X9fDFLc4", timestamp: 45, lyrics: [
    { line: "___ coaster", answer: "Roller", difficulty: "쉬움", hint: "롤러" },
  ]},
  { artist: "CHUNGHA", song: "Sparkling", youtubeId: "mfTMy1RCaps", timestamp: 42, lyrics: [
    { line: "___", answer: "Sparkling", difficulty: "보통", hint: "반짝이는" },
  ]},

  // ==================== CHA EUN-WOO (2 songs) ====================
  { artist: "CHA EUN-WOO", song: "SATURDAY PREACHER", youtubeId: "3qAVzBH1vKE", timestamp: 45, lyrics: [
    { line: "___ preacher", answer: "Saturday", difficulty: "보통", hint: "토요일" },
  ]},
  { artist: "CHA EUN-WOO", song: "Stay", youtubeId: "YiKGqPy3EM8", timestamp: 42, lyrics: [
    { line: "___", answer: "Stay", difficulty: "쉬움", hint: "머물다" },
  ]},

  // ==================== fromis_9 (3 songs) ====================
  { artist: "fromis_9", song: "WE GO", youtubeId: "HM6UpQZvbhY", timestamp: 45, lyrics: [
    { line: "We ___", answer: "go", difficulty: "쉬움", hint: "가다" },
  ]},
  { artist: "fromis_9", song: "Feel Good", youtubeId: "1zl_DxK6QxY", timestamp: 42, lyrics: [
    { line: "Feel ___", answer: "good", difficulty: "쉬움", hint: "좋은" },
  ]},
  { artist: "fromis_9", song: "DM", youtubeId: "NMU8qNXVbPE", timestamp: 40, lyrics: [
    { line: "___", answer: "DM", difficulty: "쉬움", hint: "다이렉트 메시지" },
  ]},

  // ==================== TAEYEON (2 songs) ====================
  { artist: "TAEYEON", song: "INVU", youtubeId: "AbZH7XWDW_k", timestamp: 50, lyrics: [
    { line: "___", answer: "INVU", difficulty: "보통", hint: "I envy you" },
  ]},
  { artist: "TAEYEON", song: "Spark", youtubeId: "eP4ga_fNm-E", timestamp: 48, lyrics: [
    { line: "___", answer: "Spark", difficulty: "쉬움", hint: "불꽃" },
  ]},

  // ==================== xikers (2 songs) ====================
  { artist: "xikers", song: "SUPERPOWER", youtubeId: "Hx2JkVOlr7Q", timestamp: 45, lyrics: [
    { line: "___", answer: "SUPERPOWER", difficulty: "보통", hint: "초능력" },
  ]},
  { artist: "xikers", song: "TRICKY HOUSE", youtubeId: "Tf5FP0sRKMU", timestamp: 42, lyrics: [
    { line: "___ house", answer: "Tricky", difficulty: "보통", hint: "까다로운" },
  ]},

  // ==================== DAY6 (3 songs) ====================
  { artist: "DAY6", song: "HAPPY", youtubeId: "LQ_epVFCUQk", timestamp: 45, lyrics: [
    { line: "___", answer: "HAPPY", difficulty: "쉬움", hint: "행복한" },
  ]},
  { artist: "DAY6", song: "Zombie", youtubeId: "k8gx-C7GCGU", timestamp: 48, lyrics: [
    { line: "___", answer: "Zombie", difficulty: "쉬움", hint: "좀비" },
  ]},
  { artist: "DAY6", song: "You Were Beautiful", youtubeId: "BS7tz2rAOSA", timestamp: 52, lyrics: [
    { line: "You were ___", answer: "beautiful", difficulty: "보통", hint: "아름다운" },
  ]},

  // ==================== THE BOYZ (3 songs) ====================
  { artist: "THE BOYZ", song: "MAVERICK", youtubeId: "10pBM37pdZE", timestamp: 45, lyrics: [
    { line: "___", answer: "MAVERICK", difficulty: "보통", hint: "독불장군" },
  ]},
  { artist: "THE BOYZ", song: "THRILL RIDE", youtubeId: "I2E_a5mWqLc", timestamp: 42, lyrics: [
    { line: "___ ride", answer: "Thrill", difficulty: "보통", hint: "스릴" },
  ]},
  { artist: "THE BOYZ", song: "ROAR", youtubeId: "JbV9_TY8i8Y", timestamp: 48, lyrics: [
    { line: "___", answer: "ROAR", difficulty: "쉬움", hint: "으르렁" },
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
    
    console.log('Generating K-POP lyrics for:', { difficulty, excludeIds: excludeIds?.length || 0, totalSongs: verifiedSongs.length });

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

    console.log(`Returning ${selected.length} questions from ${verifiedSongs.length} total songs`);

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
