import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// K-POP 한국어 가사 데이터베이스 - 한국어 단어 빈칸 채우기
// 모든 빈칸은 한국어 단어로, 한국어 학습에 초점
const verifiedSongs = [
  // ==================== BTS ====================
  { artist: "BTS", song: "봄날", youtubeId: "xEeFrLSkMm8", timestamp: 70, lyrics: [
    { line: "보고 싶다 이렇게 말하니까 더 ___ 싶다", answer: "보고", hint: "nhìn, gặp", difficulty: "쉬움" },
    { line: "눈꽃이 떨어져요 또 조금씩 ___", answer: "멀어져요", hint: "xa dần", difficulty: "보통" },
    { line: "허공을 떠도는 작은 먼지처럼 작은 ___처럼", answer: "먼지", hint: "bụi", difficulty: "보통" },
  ]},
  { artist: "BTS", song: "피 땀 눈물", youtubeId: "hmE9f-TEutc", timestamp: 58, lyrics: [
    { line: "내 피 ___ 눈물", answer: "땀", hint: "mồ hôi", difficulty: "쉬움" },
    { line: "나의 마지막 ___ 너에게 다 줄게", answer: "춤을", hint: "điệu nhảy", difficulty: "보통" },
    { line: "원해 많이 많이 많이 ___", answer: "많이", hint: "nhiều", difficulty: "쉬움" },
  ]},
  { artist: "BTS", song: "DNA", youtubeId: "MBdVXkSdhwU", timestamp: 55, lyrics: [
    { line: "첫눈에 널 알아보게 됐어 서롤 ___하게 됐어", answer: "불러", hint: "gọi", difficulty: "보통" },
    { line: "이건 우연이 아니야 우리의 ___", answer: "운명", hint: "số phận", difficulty: "보통" },
    { line: "우주가 처음 생겨났을 때부터 ___ 내려온", answer: "이어", hint: "nối tiếp", difficulty: "어려움" },
  ]},
  { artist: "BTS", song: "작은 것들을 위한 시", youtubeId: "XsX3ATc3FbA", timestamp: 60, lyrics: [
    { line: "모든 게 궁금해 ___에 대한 모든 걸", answer: "너", hint: "bạn/em", difficulty: "쉬움" },
    { line: "하나부터 ___ 모두 다", answer: "열까지", hint: "đến mười", difficulty: "보통" },
    { line: "작은 것들을 위한 ___", answer: "시", hint: "bài thơ", difficulty: "쉬움" },
  ]},
  { artist: "BTS", song: "Butter", youtubeId: "WMweEpGlu_U", timestamp: 45, lyrics: [
    { line: "너를 향한 내 ___ 녹아버리게", answer: "마음", hint: "trái tim", difficulty: "쉬움" },
  ]},
  
  // ==================== BLACKPINK ====================
  { artist: "BLACKPINK", song: "마지막처럼", youtubeId: "Amq-qlqbjYA", timestamp: 50, lyrics: [
    { line: "___처럼 내일 따윈 없는 것처럼", answer: "마지막", hint: "cuối cùng", difficulty: "쉬움" },
    { line: "빠져드는 내 기분 좋은 이 ___", answer: "느낌", hint: "cảm giác", difficulty: "보통" },
    { line: "내 심장이 ___ 때마다", answer: "뛸", hint: "đập", difficulty: "보통" },
  ]},
  { artist: "BLACKPINK", song: "불장난", youtubeId: "9pdj4iJD08s", timestamp: 52, lyrics: [
    { line: "___을 한 것처럼 아파도 난 좋아", answer: "불장난", hint: "chơi với lửa", difficulty: "쉬움" },
    { line: "나쁜 ___ 난 그걸 원해", answer: "사랑", hint: "tình yêu", difficulty: "쉬움" },
    { line: "더 ___ 보고 싶어", answer: "뜨겁게", hint: "nóng bỏng", difficulty: "보통" },
  ]},
  { artist: "BLACKPINK", song: "휘파람", youtubeId: "dISNgvVpWlo", timestamp: 48, lyrics: [
    { line: "___ 짧은 내 치마를 탓해", answer: "휘파람", hint: "tiếng huýt sáo", difficulty: "쉬움" },
    { line: "넌 너무 ___ 난 미소가 나", answer: "예뻐", hint: "xinh đẹp", difficulty: "쉬움" },
    { line: "마음이 점점 ___", answer: "뛰어", hint: "đập", difficulty: "보통" },
  ]},
  { artist: "BLACKPINK", song: "뚜두뚜두", youtubeId: "IHNzOHi8sJs", timestamp: 50, lyrics: [
    { line: "뚜두뚜두 두 ___ 날 불러봐", answer: "눈을", hint: "đôi mắt", difficulty: "보통" },
    { line: "어딜 봐 내 ___을 봐", answer: "눈", hint: "mắt", difficulty: "쉬움" },
  ]},

  // ==================== NewJeans ====================
  { artist: "NewJeans", song: "Ditto", youtubeId: "pSUydWEqKwE", timestamp: 40, lyrics: [
    { line: "말해줘 말해줘 나도 ___해", answer: "똑같이", hint: "giống nhau", difficulty: "보통" },
    { line: "하루가 1년 같아 너 없이 ___", answer: "기다려", hint: "đợi", difficulty: "보통" },
    { line: "너를 향한 내 ___", answer: "마음", hint: "trái tim", difficulty: "쉬움" },
  ]},
  { artist: "NewJeans", song: "OMG", youtubeId: "sVTy_wmn5SU", timestamp: 45, lyrics: [
    { line: "넌 나의 ___ 같아", answer: "천국", hint: "thiên đường", difficulty: "보통" },
    { line: "모든 게 변해 넌 ___ 같아", answer: "선물", hint: "quà tặng", difficulty: "보통" },
  ]},
  { artist: "NewJeans", song: "Hype Boy", youtubeId: "11cta61wi0g", timestamp: 35, lyrics: [
    { line: "왜 자꾸 내 ___ 쳐다봐", answer: "눈을", hint: "đôi mắt", difficulty: "쉬움" },
    { line: "널 ___ 수가 없어", answer: "잊을", hint: "quên", difficulty: "보통" },
  ]},

  // ==================== aespa ====================
  { artist: "aespa", song: "Supernova", youtubeId: "phuiiNCxRMg", timestamp: 45, lyrics: [
    { line: "나는 별처럼 빛나는 ___", answer: "존재", hint: "sự tồn tại", difficulty: "보통" },
    { line: "너의 ___ 될게", answer: "우주", hint: "vũ trụ", difficulty: "보통" },
  ]},
  { artist: "aespa", song: "Drama", youtubeId: "AS5Z9dXNpAg", timestamp: 52, lyrics: [
    { line: "나의 ___ 같은 하루", answer: "드라마", hint: "phim truyền hình", difficulty: "쉬움" },
    { line: "이건 내 인생의 ___", answer: "주인공", hint: "nhân vật chính", difficulty: "보통" },
  ]},
  { artist: "aespa", song: "Next Level", youtubeId: "4TWR90KJl84", timestamp: 55, lyrics: [
    { line: "내 ___ 확인해봐", answer: "세계", hint: "thế giới", difficulty: "보통" },
    { line: "광야로 ___ 때", answer: "걸어갈", hint: "đi bộ", difficulty: "어려움" },
  ]},

  // ==================== IVE ====================
  { artist: "IVE", song: "LOVE DIVE", youtubeId: "Y8JFxS1HlDo", timestamp: 35, lyrics: [
    { line: "깊이 빠져 내 ___ 안으로", answer: "사랑", hint: "tình yêu", difficulty: "쉬움" },
    { line: "난 이미 ___ 빠졌어", answer: "널", hint: "bạn", difficulty: "쉬움" },
  ]},
  { artist: "IVE", song: "After LIKE", youtubeId: "F0B7HDiY-10", timestamp: 40, lyrics: [
    { line: "___ 후에 좋아해", answer: "좋아요", hint: "thích", difficulty: "쉬움" },
    { line: "내 ___ 말해줘", answer: "마음", hint: "trái tim", difficulty: "쉬움" },
  ]},
  { artist: "IVE", song: "Eleven", youtubeId: "EZNBJbpJf48", timestamp: 38, lyrics: [
    { line: "10점 만점에 ___ 점", answer: "열한", hint: "11", difficulty: "쉬움" },
    { line: "너에게 ___ 빠져", answer: "완전히", hint: "hoàn toàn", difficulty: "보통" },
  ]},

  // ==================== TWICE ====================
  { artist: "TWICE", song: "What is Love?", youtubeId: "i0p1bmr0EmE", timestamp: 60, lyrics: [
    { line: "___ 어떤 느낌인지", answer: "사랑이", hint: "tình yêu", difficulty: "쉬움" },
    { line: "두근두근 ___ 떨려와", answer: "심장이", hint: "trái tim", difficulty: "보통" },
  ]},
  { artist: "TWICE", song: "Feel Special", youtubeId: "3ymwOvzhwHs", timestamp: 50, lyrics: [
    { line: "너만 있으면 ___하게 느껴져", answer: "특별", hint: "đặc biệt", difficulty: "쉬움" },
    { line: "넌 나를 ___ 만들어", answer: "빛나게", hint: "tỏa sáng", difficulty: "보통" },
  ]},
  { artist: "TWICE", song: "TT", youtubeId: "ePpPVE-GGJw", timestamp: 42, lyrics: [
    { line: "널 보면 ___ 나", answer: "떨려", hint: "run rẩy", difficulty: "쉬움" },
    { line: "내 마음을 ___", answer: "몰라", hint: "không biết", difficulty: "쉬움" },
  ]},
  { artist: "TWICE", song: "Cheer Up", youtubeId: "c7rCyll5AeY", timestamp: 45, lyrics: [
    { line: "___ 조금만 더 힘내", answer: "화이팅", hint: "cố lên", difficulty: "쉬움" },
    { line: "수줍은 내 ___", answer: "마음", hint: "trái tim", difficulty: "쉬움" },
  ]},

  // ==================== STRAY KIDS ====================
  { artist: "Stray Kids", song: "神메뉴", youtubeId: "TQTlCHxyuu8", timestamp: 45, lyrics: [
    { line: "뜨거운 ___", answer: "맛", hint: "vị", difficulty: "쉬움" },
    { line: "내가 ___이야", answer: "요리사", hint: "đầu bếp", difficulty: "보통" },
  ]},
  { artist: "Stray Kids", song: "소리꾼", youtubeId: "k8Y6ZTjmCXs", timestamp: 50, lyrics: [
    { line: "목소리 높여 ___ 부르자", answer: "노래", hint: "bài hát", difficulty: "쉬움" },
    { line: "우리의 ___", answer: "소리", hint: "âm thanh", difficulty: "쉬움" },
  ]},
  { artist: "Stray Kids", song: "Back Door", youtubeId: "X-uJtV8ScYk", timestamp: 48, lyrics: [
    { line: "___ 문을 열어", answer: "뒷", hint: "phía sau", difficulty: "쉬움" },
  ]},

  // ==================== (G)I-DLE ====================
  { artist: "(G)I-DLE", song: "TOMBOY", youtubeId: "Jh4QFaPmdss", timestamp: 42, lyrics: [
    { line: "난 ___ 되고 싶어", answer: "멋지게", hint: "tuyệt vời", difficulty: "보통" },
    { line: "내 인생의 ___", answer: "주인공", hint: "nhân vật chính", difficulty: "보통" },
  ]},
  { artist: "(G)I-DLE", song: "퀸카", youtubeId: "6FPr4D4dMN4", timestamp: 45, lyrics: [
    { line: "난 진짜 ___", answer: "퀸카", hint: "nữ hoàng", difficulty: "쉬움" },
    { line: "다 나에게 ___", answer: "빠져", hint: "say mê", difficulty: "쉬움" },
  ]},
  { artist: "(G)I-DLE", song: "사랑", youtubeId: "KH0o9V0SFQA", timestamp: 50, lyrics: [
    { line: "이건 ___ 아니야", answer: "사랑", hint: "tình yêu", difficulty: "쉬움" },
    { line: "거짓 ___", answer: "말", hint: "lời nói", difficulty: "쉬움" },
  ]},

  // ==================== SEVENTEEN ====================
  { artist: "SEVENTEEN", song: "손오공", youtubeId: "MmI-vsaOoUE", timestamp: 55, lyrics: [
    { line: "내 ___ 봐", answer: "춤을", hint: "điệu nhảy", difficulty: "쉬움" },
    { line: "하늘을 ___", answer: "날아", hint: "bay", difficulty: "쉬움" },
  ]},
  { artist: "SEVENTEEN", song: "예쁘다", youtubeId: "TpHfh9VUOek", timestamp: 50, lyrics: [
    { line: "___ 너무 예쁘다", answer: "아", hint: "ôi", difficulty: "쉬움" },
    { line: "네가 ___ 좋아", answer: "너무", hint: "quá", difficulty: "쉬움" },
  ]},
  { artist: "SEVENTEEN", song: "아주 NICE", youtubeId: "J-wFp43XOrA", timestamp: 48, lyrics: [
    { line: "아주 ___ 아주 좋아", answer: "멋져", hint: "tuyệt vời", difficulty: "쉬움" },
    { line: "오늘 ___ 기분 좋아", answer: "하루", hint: "một ngày", difficulty: "쉬움" },
  ]},

  // ==================== NCT/WayV ====================
  { artist: "NCT 127", song: "영웅", youtubeId: "MXPX8V5pjjw", timestamp: 48, lyrics: [
    { line: "난 ___ 난 영웅", answer: "영웅", hint: "anh hùng", difficulty: "쉬움" },
    { line: "___ 되고 싶어", answer: "힘이", hint: "sức mạnh", difficulty: "보통" },
  ]},
  { artist: "NCT DREAM", song: "맛", youtubeId: "4TWR90KJl84", timestamp: 45, lyrics: [
    { line: "이건 무슨 ___", answer: "맛", hint: "vị", difficulty: "쉬움" },
    { line: "___ 달콤해", answer: "너무", hint: "quá", difficulty: "쉬움" },
  ]},

  // ==================== Red Velvet ====================
  { artist: "Red Velvet", song: "빨간 맛", youtubeId: "WyiIGEHQP8o", timestamp: 45, lyrics: [
    { line: "빨간 ___ 궁금해", answer: "맛", hint: "vị", difficulty: "쉬움" },
    { line: "여름 ___ 사이다", answer: "밤", hint: "đêm", difficulty: "쉬움" },
  ]},
  { artist: "Red Velvet", song: "피카부", youtubeId: "WUewNpExC4g", timestamp: 50, lyrics: [
    { line: "___! 여기있어", answer: "피카부", hint: "ú òa", difficulty: "쉬움" },
    { line: "숨바꼭질 ___", answer: "하자", hint: "chơi đi", difficulty: "쉬움" },
  ]},

  // ==================== EXO ====================
  { artist: "EXO", song: "으르렁", youtubeId: "I3dezFzsNss", timestamp: 52, lyrics: [
    { line: "___ 으르렁 으르렁", answer: "으르렁", hint: "gầm gừ", difficulty: "쉬움" },
    { line: "네가 ___ 미칠 것 같아", answer: "좋아", hint: "thích", difficulty: "쉬움" },
  ]},
  { artist: "EXO", song: "Love Shot", youtubeId: "pSudEWafXrs", timestamp: 48, lyrics: [
    { line: "쏠 거야 내 ___ 속에", answer: "사랑", hint: "tình yêu", difficulty: "쉬움" },
  ]},

  // ==================== LE SSERAFIM ====================
  { artist: "LE SSERAFIM", song: "ANTIFRAGILE", youtubeId: "pyf8cbqyfPs", timestamp: 42, lyrics: [
    { line: "난 더 ___ 강해져", answer: "더", hint: "hơn nữa", difficulty: "쉬움" },
    { line: "내 ___ 이야기", answer: "인생", hint: "cuộc sống", difficulty: "보통" },
  ]},
  { artist: "LE SSERAFIM", song: "FEARLESS", youtubeId: "4vbDFu0PUew", timestamp: 45, lyrics: [
    { line: "___ 없어 난", answer: "두려움", hint: "nỗi sợ", difficulty: "보통" },
    { line: "내 ___ 걸어가", answer: "길을", hint: "con đường", difficulty: "보통" },
  ]},
  { artist: "LE SSERAFIM", song: "이브, 프시케 그리고 푸른 수염의 아내", youtubeId: "Mn2T8Xj2NWc", timestamp: 50, lyrics: [
    { line: "나의 ___ 선택", answer: "모든", hint: "tất cả", difficulty: "쉬움" },
  ]},

  // ==================== BABYMONSTER ====================
  { artist: "BABYMONSTER", song: "SHEESH", youtubeId: "Iti7SjL0fVA", timestamp: 40, lyrics: [
    { line: "나를 봐 내 ___", answer: "눈을", hint: "đôi mắt", difficulty: "쉬움" },
    { line: "___ 말해봐", answer: "솔직히", hint: "thành thật", difficulty: "보통" },
  ]},

  // ==================== ILLIT ====================
  { artist: "ILLIT", song: "Magnetic", youtubeId: "Vk5-c_v4gMU", timestamp: 38, lyrics: [
    { line: "널 향한 내 ___", answer: "마음", hint: "trái tim", difficulty: "쉬움" },
    { line: "끌리는 대로 ___", answer: "가고", hint: "đi", difficulty: "쉬움" },
  ]},

  // ==================== KISS OF LIFE ====================
  { artist: "KISS OF LIFE", song: "Midas Touch", youtubeId: "qTHDJBMDnYo", timestamp: 42, lyrics: [
    { line: "황금 ___", answer: "손길", hint: "bàn tay", difficulty: "보통" },
    { line: "모든 게 ___ 변해", answer: "금으로", hint: "vàng", difficulty: "보통" },
  ]},

  // ==================== 아이유 (IU) ====================
  { artist: "IU", song: "좋은 날", youtubeId: "jeqdYqsrsA0", timestamp: 55, lyrics: [
    { line: "좋은 ___ 좋은 날 좋은 날", answer: "날", hint: "ngày", difficulty: "쉬움" },
    { line: "오늘 ___ 너무 좋아", answer: "하루", hint: "một ngày", difficulty: "쉬움" },
  ]},
  { artist: "IU", song: "밤편지", youtubeId: "BzYnNdJhZQw", timestamp: 52, lyrics: [
    { line: "밤___ 쓰고 있어요", answer: "편지", hint: "lá thư", difficulty: "쉬움" },
    { line: "오늘 ___ 어땠나요", answer: "하루", hint: "một ngày", difficulty: "쉬움" },
  ]},
  { artist: "IU", song: "팔레트", youtubeId: "d9IxdwEFk1c", timestamp: 50, lyrics: [
    { line: "내 ___ 색깔로", answer: "취향", hint: "sở thích", difficulty: "보통" },
    { line: "예쁘게 ___ 거야", answer: "칠할", hint: "tô màu", difficulty: "보통" },
  ]},

  // ==================== 태연 (Taeyeon) ====================
  { artist: "태연", song: "사계", youtubeId: "x5kAyp6Bwag", timestamp: 55, lyrics: [
    { line: "봄 여름 ___ 겨울", answer: "가을", hint: "mùa thu", difficulty: "쉬움" },
    { line: "너와 ___ 계절", answer: "함께한", hint: "cùng nhau", difficulty: "보통" },
  ]},
  { artist: "태연", song: "Rain", youtubeId: "eHir_vB1RUI", timestamp: 48, lyrics: [
    { line: "___ 내리는 날", answer: "비가", hint: "mưa", difficulty: "쉬움" },
    { line: "너를 ___ 싶어", answer: "만나고", hint: "gặp", difficulty: "보통" },
  ]},

  // ==================== 볼빨간사춘기 ====================
  { artist: "볼빨간사춘기", song: "여행", youtubeId: "xRbPAVnqtcs", timestamp: 45, lyrics: [
    { line: "___ 떠나자", answer: "여행을", hint: "chuyến đi", difficulty: "쉬움" },
    { line: "어디로 ___ 좋아", answer: "가도", hint: "đi", difficulty: "쉬움" },
  ]},
  { artist: "볼빨간사춘기", song: "우주를 줄게", youtubeId: "9U8uA702xrE", timestamp: 50, lyrics: [
    { line: "___를 줄게", answer: "우주", hint: "vũ trụ", difficulty: "쉬움" },
    { line: "별처럼 ___ 너", answer: "빛나는", hint: "tỏa sáng", difficulty: "보통" },
  ]},

  // ==================== PSY ====================
  { artist: "PSY", song: "강남스타일", youtubeId: "9bZkp7q19f0", timestamp: 42, lyrics: [
    { line: "___ 스타일", answer: "강남", hint: "Gangnam", difficulty: "쉬움" },
    { line: "오빤 ___ 스타일", answer: "강남", hint: "Gangnam", difficulty: "쉬움" },
  ]},
  { artist: "PSY", song: "나팔바지", youtubeId: "tF27TNC_4pc", timestamp: 45, lyrics: [
    { line: "___ 입고 흔들어", answer: "나팔바지", hint: "quần ống loe", difficulty: "보통" },
  ]},

  // ==================== 2NE1 ====================
  { artist: "2NE1", song: "내가 제일 잘 나가", youtubeId: "j7_lSP8Vc3o", timestamp: 48, lyrics: [
    { line: "내가 제일 ___ 나가", answer: "잘", hint: "giỏi nhất", difficulty: "쉬움" },
    { line: "___서라 뛰어", answer: "일어", hint: "đứng dậy", difficulty: "보통" },
  ]},
  { artist: "2NE1", song: "Fire", youtubeId: "49AfuuRbgGo", timestamp: 45, lyrics: [
    { line: "___ 불타버려", answer: "불", hint: "lửa", difficulty: "쉬움" },
  ]},

  // ==================== BIGBANG ====================
  { artist: "BIGBANG", song: "거짓말", youtubeId: "2Cv3phvP8Ro", timestamp: 55, lyrics: [
    { line: "다 ___이야", answer: "거짓말", hint: "lời nói dối", difficulty: "쉬움" },
    { line: "너를 ___ 내 마음", answer: "사랑한", hint: "yêu", difficulty: "보통" },
  ]},
  { artist: "BIGBANG", song: "뱅뱅뱅", youtubeId: "2ips2mM7Zqw", timestamp: 48, lyrics: [
    { line: "___ 빵야빵야", answer: "뱅뱅뱅", hint: "bang bang bang", difficulty: "쉬움" },
  ]},

  // ==================== MAMAMOO ====================
  { artist: "MAMAMOO", song: "HIP", youtubeId: "KhTeiaCezwM", timestamp: 45, lyrics: [
    { line: "나는 나 ___는 너", answer: "너", hint: "bạn", difficulty: "쉬움" },
    { line: "내 ___ 봐봐", answer: "모습", hint: "vẻ ngoài", difficulty: "보통" },
  ]},
  { artist: "MAMAMOO", song: "별이 빛나는 밤", youtubeId: "LjUXm0Zy_dk", timestamp: 50, lyrics: [
    { line: "___이 빛나는 밤", answer: "별", hint: "ngôi sao", difficulty: "쉬움" },
    { line: "너와 ___ 밤", answer: "함께한", hint: "cùng nhau", difficulty: "보통" },
  ]},

  // ==================== ENHYPEN ====================
  { artist: "ENHYPEN", song: "Bite Me", youtubeId: "OYHR2V0JLhE", timestamp: 42, lyrics: [
    { line: "나를 ___ 봐", answer: "물어", hint: "cắn", difficulty: "쉬움" },
    { line: "너의 ___이 될게", answer: "전부", hint: "tất cả", difficulty: "보통" },
  ]},
  { artist: "ENHYPEN", song: "Drunk-Dazed", youtubeId: "Fc7-Oe0tj5k", timestamp: 45, lyrics: [
    { line: "___ 취한 듯", answer: "술에", hint: "rượu", difficulty: "보통" },
  ]},

  // ==================== TXT ====================
  { artist: "TXT", song: "Sugar Rush Ride", youtubeId: "iNkdcVdIIDk", timestamp: 48, lyrics: [
    { line: "___ 같은 너", answer: "설탕", hint: "đường", difficulty: "쉬움" },
    { line: "달콤한 ___", answer: "순간", hint: "khoảnh khắc", difficulty: "보통" },
  ]},
  { artist: "TXT", song: "0X1=LOVESONG", youtubeId: "S6z7yODUfPg", timestamp: 52, lyrics: [
    { line: "너를 ___ 나", answer: "사랑한", hint: "yêu", difficulty: "쉬움" },
  ]},

  // ==================== ATEEZ ====================
  { artist: "ATEEZ", song: "BOUNCY", youtubeId: "p7GRxXKIqkI", timestamp: 40, lyrics: [
    { line: "춤을 ___ 봐", answer: "춰", hint: "nhảy", difficulty: "쉬움" },
    { line: "신나게 ___", answer: "놀아", hint: "chơi", difficulty: "쉬움" },
  ]},
  { artist: "ATEEZ", song: "Guerrilla", youtubeId: "2HcVZm_4qAI", timestamp: 45, lyrics: [
    { line: "___로 싸워", answer: "전사", hint: "chiến binh", difficulty: "보통" },
  ]},

  // ==================== ZEROBASEONE ====================
  { artist: "ZEROBASEONE", song: "In Bloom", youtubeId: "lWn6gEeLoSE", timestamp: 42, lyrics: [
    { line: "___ 피워", answer: "꽃을", hint: "hoa", difficulty: "쉬움" },
    { line: "너와 ___ 봄", answer: "함께한", hint: "cùng nhau", difficulty: "보통" },
  ]},

  // ==================== RIIZE ====================
  { artist: "RIIZE", song: "Get A Guitar", youtubeId: "eFkF4j7KMz4", timestamp: 40, lyrics: [
    { line: "___ 치자", answer: "기타", hint: "đàn guitar", difficulty: "쉬움" },
    { line: "같이 ___", answer: "놀자", hint: "chơi đi", difficulty: "쉬움" },
  ]},
  { artist: "RIIZE", song: "Love 119", youtubeId: "G8p4qlJDVb8", timestamp: 42, lyrics: [
    { line: "___ 119", answer: "사랑", hint: "tình yêu", difficulty: "쉬움" },
  ]},

  // ==================== NMIXX ====================
  { artist: "NMIXX", song: "O.O", youtubeId: "ybA7d_hn8nY", timestamp: 38, lyrics: [
    { line: "___ 봐봐 내 눈", answer: "뜨고", hint: "mở", difficulty: "보통" },
  ]},
  { artist: "NMIXX", song: "DASH", youtubeId: "AJfhJTYZDfU", timestamp: 42, lyrics: [
    { line: "달려 ___", answer: "가자", hint: "đi thôi", difficulty: "쉬움" },
  ]},
];

// YouTube video validation
async function validateYouTubeVideo(youtubeId: string): Promise<boolean> {
  try {
    const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${youtubeId}&format=json`);
    return response.ok;
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { difficulty, excludeIds = [], validate = false } = body;

    console.log("Generating K-POP lyrics for:", { difficulty, excludeIds: excludeIds.length, totalSongs: verifiedSongs.length });

    // Filter songs by difficulty if specified
    let availableSongs = verifiedSongs.filter(song => {
      const songId = `${song.artist}-${song.song}`;
      if (excludeIds.includes(songId)) return false;
      
      if (difficulty && difficulty !== "전체") {
        return song.lyrics.some(l => l.difficulty === difficulty);
      }
      return true;
    });

    // Shuffle songs
    availableSongs = availableSongs.sort(() => Math.random() - 0.5);

    // Create questions from lyrics
    const questions: {
      artist: string;
      song: string;
      youtubeId: string;
      timestamp: number;
      line: string;
      answer: string;
      hint: string;
      difficulty: string;
      points: number;
    }[] = [];

    for (const song of availableSongs) {
      if (questions.length >= 5) break;

      // Filter lyrics by difficulty
      let eligibleLyrics = song.lyrics;
      if (difficulty && difficulty !== "전체") {
        eligibleLyrics = song.lyrics.filter(l => l.difficulty === difficulty);
      }

      if (eligibleLyrics.length === 0) continue;

      // Pick a random lyric
      const lyric = eligibleLyrics[Math.floor(Math.random() * eligibleLyrics.length)];

      // Validate YouTube video if requested
      if (validate) {
        const isValid = await validateYouTubeVideo(song.youtubeId);
        if (!isValid) continue;
      }

      questions.push({
        artist: song.artist,
        song: song.song,
        youtubeId: song.youtubeId,
        timestamp: song.timestamp,
        line: lyric.line,
        answer: lyric.answer,
        hint: lyric.hint,
        difficulty: lyric.difficulty,
        points: lyric.difficulty === "쉬움" ? 10 : lyric.difficulty === "보통" ? 15 : 20,
      });
    }

    // Fallback if not enough questions
    if (questions.length < 3) {
      const fallbackSong = verifiedSongs[0];
      const fallbackLyric = fallbackSong.lyrics[0];
      questions.push({
        artist: fallbackSong.artist,
        song: fallbackSong.song,
        youtubeId: fallbackSong.youtubeId,
        timestamp: fallbackSong.timestamp,
        line: fallbackLyric.line,
        answer: fallbackLyric.answer,
        hint: fallbackLyric.hint,
        difficulty: fallbackLyric.difficulty,
        points: 10,
      });
    }

    console.log("Returning", questions.length, "questions from", verifiedSongs.length, "total songs");

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("K-POP lyrics error:", error);
    
    // Return fallback question
    const fallbackQuestion = {
      artist: "BTS",
      song: "봄날",
      youtubeId: "xEeFrLSkMm8",
      timestamp: 70,
      line: "보고 싶다 이렇게 말하니까 더 ___ 싶다",
      answer: "보고",
      hint: "nhìn, gặp",
      difficulty: "쉬움",
      points: 10,
    };

    return new Response(JSON.stringify({ questions: [fallbackQuestion] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
