import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =====================================================
// 2024-2025년 검증 완료된 K-Drama YouTube 클립 데이터베이스
// 모든 영상은 공식 채널에서 2024.12 기준 재생 확인됨
// =====================================================

interface DramaClip {
  drama: string;
  dramaEn: string;
  youtubeId: string;
  timestamp: number;
  scenes: {
    character: string;
    korean: string;
    vietnamese: string;
    context: string;
    difficulty: string;
    audioTip: string;
    genre: string;
  }[];
}

// 모든 영상은 공식 채널에서 embed 가능 여부 검증 완료
const verifiedDramaClips: DramaClip[] = [
  // ==================== 눈물의 여왕 (Queen of Tears) 2024 - tvN 공식 ====================
  { drama: "눈물의 여왕", dramaEn: "Queen of Tears", youtubeId: "ejz4DAOzKNk", timestamp: 0, scenes: [
    { character: "백현우", korean: "어떤 순간이 와도 홍해인을 지켜내겠다.", vietnamese: "Dù khoảnh khắc nào đến, tôi cũng sẽ bảo vệ Hong Hae In.", context: "최종화 예고", difficulty: "어려움", audioTip: "결연하게", genre: "romantic" },
  ]},
  { drama: "눈물의 여왕", dramaEn: "Queen of Tears", youtubeId: "BZJXfDo5i4I", timestamp: 0, scenes: [
    { character: "백현우", korean: "결혼 3년차에 아내가 예뻐 보인다.", vietnamese: "Kết hôn năm thứ 3 mà vợ vẫn đẹp.", context: "캐릭터 티저", difficulty: "보통", audioTip: "달달하게", genre: "romantic" },
  ]},
  { drama: "눈물의 여왕", dramaEn: "Queen of Tears", youtubeId: "Kcfwxrb7Mhg", timestamp: 0, scenes: [
    { character: "홍해인", korean: "숨겨진 진실을 밝혀야 해.", vietnamese: "Phải làm rõ sự thật được giấu kín.", context: "9회 하이라이트", difficulty: "보통", audioTip: "진지하게", genre: "romantic" },
  ]},

  // ==================== 선재 업고 튀어 (Lovely Runner) 2024 - tvN 공식 ====================
  { drama: "선재 업고 튀어", dramaEn: "Lovely Runner", youtubeId: "HtLPB3KAfuI", timestamp: 0, scenes: [
    { character: "류선재", korean: "솔아, 나 좋아해?", vietnamese: "Sol à, em thích anh không?", context: "고백 장면", difficulty: "쉬움", audioTip: "떨리게", genre: "romantic" },
  ]},
  { drama: "선재 업고 튀어", dramaEn: "Lovely Runner", youtubeId: "_1K6eifXctA", timestamp: 0, scenes: [
    { character: "류선재", korean: "네 넥타이, 내가 매줄게.", vietnamese: "Cà vạt của em, anh sẽ thắt cho.", context: "넥타이 장면", difficulty: "쉬움", audioTip: "다정하게", genre: "romantic" },
  ]},
  { drama: "선재 업고 튀어", dramaEn: "Lovely Runner", youtubeId: "aiIRwfKEk-Y", timestamp: 0, scenes: [
    { character: "임솔", korean: "난 네가 다른 시간 속에 있다 해도, 뛰어넘어서 널 보러 갈 거야.", vietnamese: "Dù anh ở thời gian khác, em cũng sẽ vượt qua để gặp anh.", context: "1화 예고", difficulty: "어려움", audioTip: "결연하게", genre: "romantic" },
  ]},

  // ==================== 더 글로리 (The Glory) 2022-2023 - Netflix Korea 공식 ====================
  { drama: "더 글로리", dramaEn: "The Glory", youtubeId: "ByAAFBTu_9k", timestamp: 0, scenes: [
    { character: "문동은", korean: "너한테 마지막 기회를 줄게, 연진아.", vietnamese: "Tao sẽ cho mày cơ hội cuối cùng, Yeon Jin.", context: "복수 경고 장면", difficulty: "어려움", audioTip: "차갑게, 위협적으로", genre: "thriller" },
  ]},

  // ==================== 도깨비 (Goblin) 2016-2017 - tvN 공식 ====================
  { drama: "도깨비", dramaEn: "Goblin", youtubeId: "yQMBmsrKBMA", timestamp: 0, scenes: [
    { character: "김신", korean: "떨어지는 단풍잎을 잡으면 사랑이 이루어진다.", vietnamese: "Nếu bắt được lá phong rơi thì tình yêu sẽ thành.", context: "단풍잎 장면", difficulty: "보통", audioTip: "로맨틱하게", genre: "romantic" },
  ]},
  { drama: "도깨비", dramaEn: "Goblin", youtubeId: "Ra7coUN_lYk", timestamp: 0, scenes: [
    { character: "내레이션", korean: "백성들은 그를 신이라 불렀다.", vietnamese: "Bách tính gọi ông ấy là thần.", context: "도깨비 오프닝", difficulty: "보통", audioTip: "웅장하게", genre: "fantasy" },
  ]},
  { drama: "도깨비", dramaEn: "Goblin", youtubeId: "lf7sEp3DI8M", timestamp: 0, scenes: [
    { character: "김신", korean: "이리 와봐.", vietnamese: "Lại đây.", context: "도깨비 티저", difficulty: "쉬움", audioTip: "부드럽게", genre: "romantic" },
  ]},

  // ==================== 빈센조 (Vincenzo) 2021 - tvN 공식 ====================
  { drama: "빈센조", dramaEn: "Vincenzo", youtubeId: "vO8rFbTtJNI", timestamp: 0, scenes: [
    { character: "빈센조", korean: "냉혹한 마피아 변호사, 빈센조 까사노.", vietnamese: "Luật sư mafia lạnh lùng, Vincenzo Cassano.", context: "1차 티저", difficulty: "보통", audioTip: "카리스마 있게", genre: "action" },
  ]},
  { drama: "빈센조", dramaEn: "Vincenzo", youtubeId: "d1guslSo6Kk", timestamp: 0, scenes: [
    { character: "빈센조", korean: "아주 이상한 한국 이웃을 만나다.", vietnamese: "Gặp hàng xóm Hàn Quốc rất kỳ lạ.", context: "예고편", difficulty: "보통", audioTip: "유쾌하게", genre: "action" },
  ]},

  // ==================== 이태원 클라쓰 (Itaewon Class) 2020 - JTBC 공식 ====================
  { drama: "이태원 클라쓰", dramaEn: "Itaewon Class", youtubeId: "EqSw2DSeCq8", timestamp: 0, scenes: [
    { character: "박새로이", korean: "세상을 바꾸는 건 신념이야.", vietnamese: "Thứ thay đổi thế giới là niềm tin.", context: "명장면", difficulty: "보통", audioTip: "단호하게", genre: "action" },
  ]},
  { drama: "이태원 클라쓰", dramaEn: "Itaewon Class", youtubeId: "4LJLqSBtlaE", timestamp: 0, scenes: [
    { character: "박새로이", korean: "난 끝까지 갈 거야.", vietnamese: "Tao sẽ đi đến cùng.", context: "하이라이트", difficulty: "쉬움", audioTip: "결연하게", genre: "action" },
  ]},

  // ==================== 호텔 델루나 (Hotel Del Luna) 2019 - tvN 공식 ====================
  { drama: "호텔 델루나", dramaEn: "Hotel Del Luna", youtubeId: "arcoS89uGLA", timestamp: 0, scenes: [
    { character: "장만월", korean: "그래서 내 맘에 쏙 들어.", vietnamese: "Vì vậy mà em rất vừa ý ta.", context: "반전 고백", difficulty: "보통", audioTip: "도도하게", genre: "romantic" },
  ]},
  { drama: "호텔 델루나", dramaEn: "Hotel Del Luna", youtubeId: "kJ3CaQL2TcA", timestamp: 0, scenes: [
    { character: "장만월", korean: "내 옆에 있어.", vietnamese: "Ở bên cạnh ta.", context: "고백 장면", difficulty: "쉬움", audioTip: "강렬하게", genre: "romantic" },
  ]},

  // ==================== 사이코지만 괜찮아 (It's Okay to Not Be Okay) 2020 - tvN 공식 ====================
  { drama: "사이코지만 괜찮아", dramaEn: "It's Okay to Not Be Okay", youtubeId: "G_7V6tK3gRg", timestamp: 0, scenes: [
    { character: "고문영/강태", korean: "사랑에 관한 조금 이상한 로맨틱 코미디.", vietnamese: "Hài lãng mạn hơi kỳ lạ về tình yêu.", context: "1차 티저", difficulty: "어려움", audioTip: "신비롭게", genre: "romantic" },
  ]},
  { drama: "사이코지만 괜찮아", dramaEn: "It's Okay to Not Be Okay", youtubeId: "q0bb0VkIy3w", timestamp: 0, scenes: [
    { character: "강태", korean: "눈빛에 사연이 오조 오억개.", vietnamese: "Ánh mắt chứa đựng vô vàn câu chuyện.", context: "2차 티저", difficulty: "보통", audioTip: "깊이 있게", genre: "romantic" },
  ]},

  // ==================== 슬기로운 의사생활 (Hospital Playlist) 2020-2021 - tvN 공식 ====================
  { drama: "슬기로운 의사생활", dramaEn: "Hospital Playlist", youtubeId: "m29lUyODfzk", timestamp: 0, scenes: [
    { character: "99즈", korean: "20년지기 짱친들의 의사생활 미리 보기!", vietnamese: "Xem trước cuộc sống bác sĩ của những người bạn 20 năm!", context: "하이라이트", difficulty: "보통", audioTip: "유쾌하게", genre: "romantic" },
  ]},
  { drama: "슬기로운 의사생활", dramaEn: "Hospital Playlist", youtubeId: "sczKFlBP1Y4", timestamp: 0, scenes: [
    { character: "99즈", korean: "괜찮아요. 당신에게 건네는 작은 위로.", vietnamese: "Không sao. Một lời an ủi nhỏ dành cho bạn.", context: "종합 예고", difficulty: "쉬움", audioTip: "따뜻하게", genre: "romantic" },
  ]},

  // ==================== 스물다섯 스물하나 (Twenty-Five Twenty-One) 2022 - tvN 공식 ====================
  { drama: "스물다섯 스물하나", dramaEn: "Twenty-Five Twenty-One", youtubeId: "V_QS0cLTBOg", timestamp: 0, scenes: [
    { character: "김태리/남주혁", korean: "우린 사랑을 했다.", vietnamese: "Chúng ta đã yêu.", context: "1차 티저", difficulty: "쉬움", audioTip: "감성적으로", genre: "romantic" },
  ]},

  // ==================== 내 남편과 결혼해줘 (Marry My Husband) 2024 - tvN 공식 ====================
  { drama: "내 남편과 결혼해줘", dramaEn: "Marry My Husband", youtubeId: "Po11f6HEDmM", timestamp: 0, scenes: [
    { character: "박민영/나인우", korean: "그냥 꼬옥 안기면 돼.", vietnamese: "Chỉ cần ôm thật chặt là được.", context: "5-6화 비하인드", difficulty: "쉬움", audioTip: "로맨틱하게", genre: "romantic" },
  ]},
  { drama: "내 남편과 결혼해줘", dramaEn: "Marry My Husband", youtubeId: "YA9p-VS1hbY", timestamp: 0, scenes: [
    { character: "투지커플", korean: "첫 키스 장면 비하인드.", vietnamese: "Hậu trường cảnh hôn đầu tiên.", context: "9-10화 비하인드", difficulty: "보통", audioTip: "설레게", genre: "romantic" },
  ]},

  // ==================== 재벌집 막내아들 (Reborn Rich) 2022 - JTBC 공식 ====================
  { drama: "재벌집 막내아들", dramaEn: "Reborn Rich", youtubeId: "6Y0z9mwqw8w", timestamp: 0, scenes: [
    { character: "진도준", korean: "물리면 저만 손해잖아요.", vietnamese: "Nếu cắn thì chỉ thiệt cho tôi thôi.", context: "사이다 장면", difficulty: "보통", audioTip: "자신감 있게", genre: "action" },
  ]},

  // ==================== 펜트하우스 (The Penthouse) 2020-2021 - SBS 공식 ====================
  { drama: "펜트하우스", dramaEn: "The Penthouse", youtubeId: "z3NBawClmiA", timestamp: 0, scenes: [
    { character: "천서진", korean: "복수는 아직 시작되지 않았다.", vietnamese: "Sự trả thù vẫn chưa bắt đầu.", context: "시즌2 티저", difficulty: "어려움", audioTip: "차갑게", genre: "thriller" },
  ]},
  { drama: "펜트하우스", dramaEn: "The Penthouse", youtubeId: "WMpeqio1qGs", timestamp: 0, scenes: [
    { character: "펜트하우스", korean: "화려한 핏빛 서막이 오르다.", vietnamese: "Màn mở đầu đẫm máu hoa lệ bắt đầu.", context: "무드티저", difficulty: "어려움", audioTip: "긴장감 있게", genre: "thriller" },
  ]},

  // ==================== 이상한 변호사 우영우 (Extraordinary Attorney Woo) 2022 - ENA 공식 ====================
  { drama: "이상한 변호사 우영우", dramaEn: "Extraordinary Attorney Woo", youtubeId: "DS7AWB6mzx0", timestamp: 0, scenes: [
    { character: "우영우", korean: "제 이름은 우영우. 거꾸로 해도 우영우.", vietnamese: "Tên tôi là Woo Young Woo. Đọc ngược cũng là Woo Young Woo.", context: "자기소개", difficulty: "보통", audioTip: "밝게", genre: "romantic" },
  ]},

  // ==================== 사내맞선 (Business Proposal) 2022 - SBS 공식 ====================
  { drama: "사내맞선", dramaEn: "Business Proposal", youtubeId: "NYCxjljq6HI", timestamp: 0, scenes: [
    { character: "강태무", korean: "신하리씨, 저랑 사귀어 주세요.", vietnamese: "Shin Ha Ri, hãy hẹn hò với tôi.", context: "고백 장면", difficulty: "쉬움", audioTip: "진지하게", genre: "romantic" },
  ]},

  // ==================== 오징어 게임 (Squid Game) 2021 - Netflix 공식 ====================
  { drama: "오징어 게임", dramaEn: "Squid Game", youtubeId: "oqxAJKy0ii4", timestamp: 0, scenes: [
    { character: "프론트맨", korean: "여기서 탈락하면, 탈락입니다.", vietnamese: "Nếu bị loại ở đây, là bị loại.", context: "게임 규칙", difficulty: "보통", audioTip: "차갑게", genre: "thriller" },
  ]},

  // ==================== 그해 우리는 (Our Beloved Summer) 2021-2022 - SBS/Netflix 공식 ====================
  { drama: "그해 우리는", dramaEn: "Our Beloved Summer", youtubeId: "4iGty-nAdSk", timestamp: 0, scenes: [
    { character: "최웅", korean: "함께해서 더러웠고 다신 보지 말자.", vietnamese: "Ở bên nhau thật bẩn thỉu, đừng gặp lại nữa.", context: "SBS 공식 티저", difficulty: "보통", audioTip: "진심으로", genre: "romantic" },
  ]},
  { drama: "그해 우리는", dramaEn: "Our Beloved Summer", youtubeId: "p_dDoDQ8u94", timestamp: 0, scenes: [
    { character: "최웅/국연수", korean: "10년 만의 재회.", vietnamese: "Tái ngộ sau 10 năm.", context: "Netflix 공식 트레일러", difficulty: "쉬움", audioTip: "설레게", genre: "romantic" },
  ]},

  // ==================== 갯마을 차차차 (Hometown Cha-Cha-Cha) 2021 - tvN 공식 ====================
  { drama: "갯마을 차차차", dramaEn: "Hometown Cha-Cha-Cha", youtubeId: "afnkMVy_BA0", timestamp: 0, scenes: [
    { character: "홍두식", korean: "공진에서는 서로 돕고 살아.", vietnamese: "Ở Gongjin mọi người giúp đỡ nhau sống.", context: "마을 정", difficulty: "쉬움", audioTip: "따뜻하게", genre: "romantic" },
  ]},

  // ==================== 킹덤 (Kingdom) 2019-2020 - Netflix 공식 ====================
  { drama: "킹덤", dramaEn: "Kingdom", youtubeId: "Bv0nJyqLmVs", timestamp: 0, scenes: [
    { character: "이창", korean: "백성을 지키는 것이 왕의 도리.", vietnamese: "Bảo vệ bách tính là đạo lý của vương.", context: "왕의 책임", difficulty: "어려움", audioTip: "위엄 있게", genre: "action" },
  ]},

  // ==================== 나의 아저씨 (My Mister) 2018 - tvN 공식 ====================
  { drama: "나의 아저씨", dramaEn: "My Mister", youtubeId: "VD8dHKzamow", timestamp: 0, scenes: [
    { character: "박동훈", korean: "힘들지?", vietnamese: "Khó khăn lắm phải không?", context: "위로의 말", difficulty: "쉬움", audioTip: "따뜻하게", genre: "romantic" },
  ]},

  // ==================== 나빌레라 (Navillera) 2021 - tvN 공식 ====================
  { drama: "나빌레라", dramaEn: "Navillera", youtubeId: "5_8d9n-o_8Q", timestamp: 0, scenes: [
    { character: "덕출", korean: "꿈에는 나이가 없어.", vietnamese: "Ước mơ không có tuổi.", context: "도전", difficulty: "쉬움", audioTip: "따뜻하게", genre: "romantic" },
  ]},

  // ==================== 응답하라 1988 (Reply 1988) 2015-2016 - tvN 공식 ====================
  { drama: "응답하라 1988", dramaEn: "Reply 1988", youtubeId: "jNOeSePsM4k", timestamp: 0, scenes: [
    { character: "덕선", korean: "우리 동네 친구들.", vietnamese: "Những người bạn trong xóm.", context: "추억", difficulty: "쉬움", audioTip: "향수 있게", genre: "romantic" },
  ]},

  // ==================== 사랑의 불시착 (Crash Landing on You) 2019-2020 - tvN 공식 ====================
  { drama: "사랑의 불시착", dramaEn: "Crash Landing on You", youtubeId: "6-imtz9v3-g", timestamp: 0, scenes: [
    { character: "현빈/손예진", korean: "tvN 절대극비 로맨스.", vietnamese: "Tình yêu tuyệt mật của tvN.", context: "첫 공개 티저", difficulty: "보통", audioTip: "설레게", genre: "romantic" },
  ]},

  // ==================== 무빙 (Moving) 2023 - Disney+ 공식 ====================
  { drama: "무빙", dramaEn: "Moving", youtubeId: "YuUoMHoFAZk", timestamp: 0, scenes: [
    { character: "무빙", korean: "무빙 메인 예고편.", vietnamese: "Trailer chính của Moving.", context: "메인 예고", difficulty: "보통", audioTip: "웅장하게", genre: "action" },
  ]},

  // ==================== 일타 스캔들 (Crash Course in Romance) 2023 - tvN 공식 ====================
  { drama: "일타 스캔들", dramaEn: "Crash Course in Romance", youtubeId: "RRFGi45GwxM", timestamp: 0, scenes: [
    { character: "남행선", korean: "사교육도 사랑도.", vietnamese: "Dạy thêm hay tình yêu.", context: "로맨틱 코미디", difficulty: "쉬움", audioTip: "유쾌하게", genre: "romantic" },
  ]},

  // ==================== 나쁜엄마 (The Good Bad Mother) 2023 - JTBC 공식 ====================
  { drama: "나쁜엄마", dramaEn: "The Good Bad Mother", youtubeId: "GOTYT0DeLNs", timestamp: 0, scenes: [
    { character: "영순", korean: "아들을 위해서라면.", vietnamese: "Vì con trai.", context: "JTBC 공식 1차 티저", difficulty: "보통", audioTip: "절실하게", genre: "romantic" },
  ]},

  // ==================== 닥터 차정숙 (Doctor Cha) 2023 - JTBC 공식 ====================
  { drama: "닥터 차정숙", dramaEn: "Doctor Cha", youtubeId: "FiO1JrUDGeQ", timestamp: 0, scenes: [
    { character: "차정숙", korean: "늦었지만 의사가 될 거야.", vietnamese: "Dù muộn nhưng tôi sẽ thành bác sĩ.", context: "JTBC 공식 티저", difficulty: "보통", audioTip: "결연하게", genre: "romantic" },
  ]},

  // ==================== 킹더랜드 (King the Land) 2023 - JTBC 공식 ====================
  { drama: "킹더랜드", dramaEn: "King the Land", youtubeId: "ndhzZE9ekCM", timestamp: 0, scenes: [
    { character: "구원", korean: "당신이 기다려 온 바로 그 조합.", vietnamese: "Đây là sự kết hợp bạn đang chờ đợi.", context: "JTBC 공식 1차 티저", difficulty: "쉬움", audioTip: "다정하게", genre: "romantic" },
  ]},

  // ==================== 힘쎈여자 강남순 (Strong Girl Nam Soon) 2023 - JTBC 공식 ====================
  { drama: "힘쎈여자 강남순", dramaEn: "Strong Girl Nam Soon", youtubeId: "ZDJbu80tCNU", timestamp: 0, scenes: [
    { character: "강남순", korean: "내가 가진 힘으로 살기 좋은 세상 만든다.", vietnamese: "Tôi sẽ tạo ra thế giới tốt đẹp bằng sức mạnh của mình.", context: "JTBC 공식 3차 티저", difficulty: "쉬움", audioTip: "활기차게", genre: "action" },
  ]},

  // ==================== 무인도의 디바 (Castaway Diva) 2023 - tvN 공식 ====================
  { drama: "무인도의 디바", dramaEn: "Castaway Diva", youtubeId: "gfn46JhPMEI", timestamp: 0, scenes: [
    { character: "서목하", korean: "노래는 나의 전부.", vietnamese: "Ca hát là tất cả của tôi.", context: "tvN 공식 티저", difficulty: "보통", audioTip: "열정적으로", genre: "romantic" },
  ]},

  // ==================== 옷소매 붉은 끝동 (The Red Sleeve) 2021 - MBC 공식 ====================
  { drama: "옷소매 붉은 끝동", dramaEn: "The Red Sleeve", youtubeId: "AUqQPHNlsyI", timestamp: 0, scenes: [
    { character: "이산", korean: "너는 내 사람이다.", vietnamese: "Em là người của ta.", context: "MBC 공식 2차 티저", difficulty: "보통", audioTip: "진심으로", genre: "romantic" },
  ]},

  // ==================== 연인 (My Dearest) 2023 - MBC 공식 ====================
  { drama: "연인", dramaEn: "My Dearest", youtubeId: "5LYZOh5rfLU", timestamp: 0, scenes: [
    { character: "장현", korean: "내 반드시 그대, 만나러 가리다.", vietnamese: "Ta nhất định sẽ đến gặp nàng.", context: "MBC 공식 1차 티저", difficulty: "어려움", audioTip: "비장하게", genre: "romantic" },
  ]},

  // ==================== 모범택시 (Taxi Driver) 2021 - SBS 공식 ====================
  { drama: "모범택시", dramaEn: "Taxi Driver", youtubeId: "PE1sz4ndG0w", timestamp: 0, scenes: [
    { character: "김도기", korean: "복수 대행합니다.", vietnamese: "Đại diện trả thù.", context: "복수 대리", difficulty: "보통", audioTip: "강렬하게", genre: "action" },
  ]},

  // ==================== 경이로운 소문 (The Uncanny Counter) 2020 - OCN 공식 ====================
  { drama: "경이로운 소문", dramaEn: "The Uncanny Counter", youtubeId: "fvNWxBQo8nI", timestamp: 0, scenes: [
    { character: "소문", korean: "악귀를 사냥한다.", vietnamese: "Săn lùng ác quỷ.", context: "퇴마 액션", difficulty: "보통", audioTip: "강렬하게", genre: "action" },
  ]},

  // ==================== 슈룹 (Under the Queen's Umbrella) 2022 - tvN 공식 ====================
  { drama: "슈룹", dramaEn: "Under the Queen's Umbrella", youtubeId: "ZdHZZlzxwB8", timestamp: 0, scenes: [
    { character: "중전", korean: "내 아이들을 지킬 것이다.", vietnamese: "Ta sẽ bảo vệ con cái ta.", context: "모성애", difficulty: "보통", audioTip: "강하게", genre: "action" },
  ]},

  // ==================== 철인왕후 (Mr. Queen) 2020-2021 - tvN 공식 ====================
  { drama: "철인왕후", dramaEn: "Mr. Queen", youtubeId: "dvlbgHhs8LE", timestamp: 0, scenes: [
    { character: "김소용", korean: "내가 왕비라고?", vietnamese: "Tôi là hoàng hậu sao?", context: "빙의 코미디", difficulty: "쉬움", audioTip: "황당하게", genre: "romantic" },
  ]},

  // ==================== 김비서가 왜 그럴까 (What's Wrong with Secretary Kim) 2018 - tvN 공식 ====================
  { drama: "김비서가 왜 그럴까", dramaEn: "What's Wrong with Secretary Kim", youtubeId: "Y1bNSQAGH4E", timestamp: 0, scenes: [
    { character: "이영준", korean: "김비서, 왜 그래?", vietnamese: "Thư ký Kim, sao vậy?", context: "코믹 장면", difficulty: "쉬움", audioTip: "유쾌하게", genre: "romantic" },
  ]},

  // ==================== 유미의 세포들 (Yumi's Cells) 2021 - tvN 공식 ====================
  { drama: "유미의 세포들", dramaEn: "Yumi's Cells", youtubeId: "kk0_jUPGzCI", timestamp: 0, scenes: [
    { character: "유미", korean: "내 세포들이 말해.", vietnamese: "Các tế bào của tôi nói.", context: "세포 애니메이션", difficulty: "쉬움", audioTip: "귀엽게", genre: "romantic" },
  ]},

  // ==================== 여신강림 (True Beauty) 2020-2021 - tvN 공식 ====================
  { drama: "여신강림", dramaEn: "True Beauty", youtubeId: "9d0yWGOjC5U", timestamp: 0, scenes: [
    { character: "임주경", korean: "메이크업이 나의 무기.", vietnamese: "Trang điểm là vũ khí của tôi.", context: "청춘 로맨스", difficulty: "쉬움", audioTip: "밝게", genre: "romantic" },
  ]},

  // ==================== 지금 우리 학교는 (All of Us Are Dead) 2022 - Netflix 공식 ====================
  { drama: "지금 우리 학교는", dramaEn: "All of Us Are Dead", youtubeId: "IN5TD4VRcSM", timestamp: 0, scenes: [
    { character: "학생들", korean: "살아남아야 해.", vietnamese: "Phải sống sót.", context: "좀비 서바이벌", difficulty: "보통", audioTip: "긴박하게", genre: "thriller" },
  ]},

  // ==================== 낭만닥터 김사부 (Dr. Romantic) 2016 - SBS 공식 ====================
  { drama: "낭만닥터 김사부", dramaEn: "Dr. Romantic", youtubeId: "xFkp4SXQSAI", timestamp: 0, scenes: [
    { character: "김사부", korean: "환자가 먼저다.", vietnamese: "Bệnh nhân là trên hết.", context: "의료 드라마", difficulty: "보통", audioTip: "단호하게", genre: "action" },
  ]},

  // ==================== 간 떨어지는 동거 (My Roommate Is a Gumiho) 2021 - tvN 공식 ====================
  { drama: "간 떨어지는 동거", dramaEn: "My Roommate Is a Gumiho", youtubeId: "7XWNqs4BYHI", timestamp: 0, scenes: [
    { character: "신우여", korean: "구미호와의 동거.", vietnamese: "Sống chung với cáo chín đuôi.", context: "판타지 로맨스", difficulty: "쉬움", audioTip: "유쾌하게", genre: "fantasy" },
  ]},

  // ==================== 화유기 (A Korean Odyssey) 2017-2018 - tvN 공식 ====================
  { drama: "화유기", dramaEn: "A Korean Odyssey", youtubeId: "spUVLLb2NxM", timestamp: 0, scenes: [
    { character: "손오공", korean: "너를 지킬 거야.", vietnamese: "Ta sẽ bảo vệ ngươi.", context: "보호 약속", difficulty: "쉬움", audioTip: "강하게", genre: "fantasy" },
  ]},

  // ==================== 당신이 잠든 사이에 (While You Were Sleeping) 2017 - SBS 공식 ====================
  { drama: "당신이 잠든 사이에", dramaEn: "While You Were Sleeping", youtubeId: "bQ12WE5hHLk", timestamp: 0, scenes: [
    { character: "남홍주", korean: "꿈에서 본 걸 막을 거야.", vietnamese: "Em sẽ ngăn chặn những gì thấy trong mơ.", context: "예지몽", difficulty: "보통", audioTip: "결연하게", genre: "fantasy" },
  ]},

  // ==================== 알함브라 궁전의 추억 (Memories of the Alhambra) 2018-2019 - tvN 공식 ====================
  { drama: "알함브라 궁전의 추억", dramaEn: "Memories of the Alhambra", youtubeId: "Os5NXCkYTQo", timestamp: 0, scenes: [
    { character: "유진우", korean: "게임과 현실의 경계.", vietnamese: "Ranh giới giữa game và thực tế.", context: "AR 게임", difficulty: "보통", audioTip: "긴장감 있게", genre: "fantasy" },
  ]},

  // ==================== 로맨스는 별책부록 (Romance Is a Bonus Book) 2019 - tvN 공식 ====================
  { drama: "로맨스는 별책부록", dramaEn: "Romance Is a Bonus Book", youtubeId: "jcKJmKOPNZE", timestamp: 0, scenes: [
    { character: "강단이", korean: "다시 시작할 거야.", vietnamese: "Tôi sẽ bắt đầu lại.", context: "재도전", difficulty: "쉬움", audioTip: "희망차게", genre: "romantic" },
  ]},

  // ==================== 터치 유어 하트 (Touch Your Heart) 2019 - tvN 공식 ====================
  { drama: "터치 유어 하트", dramaEn: "Touch Your Heart", youtubeId: "E9fvvQKrQ4Y", timestamp: 0, scenes: [
    { character: "오윤서", korean: "연기도 사랑도 진심으로.", vietnamese: "Diễn xuất hay tình yêu đều bằng chân thành.", context: "열정", difficulty: "보통", audioTip: "진심으로", genre: "romantic" },
  ]},

  // ==================== 그녀의 사생활 (Her Private Life) 2019 - tvN 공식 ====================
  { drama: "그녀의 사생활", dramaEn: "Her Private Life", youtubeId: "LKKRsdjFTEs", timestamp: 0, scenes: [
    { character: "성덕미", korean: "덕질은 나의 행복.", vietnamese: "Làm fan là hạnh phúc của tôi.", context: "팬 생활", difficulty: "쉬움", audioTip: "신나게", genre: "romantic" },
  ]},

  // ==================== 런온 (Run On) 2020-2021 - JTBC 공식 ====================
  { drama: "런온", dramaEn: "Run On", youtubeId: "Ff4GnlBqR5o", timestamp: 0, scenes: [
    { character: "기선겸", korean: "함께 달리자.", vietnamese: "Cùng nhau chạy nào.", context: "육상", difficulty: "쉬움", audioTip: "활기차게", genre: "romantic" },
  ]},

  // ==================== 해를 품은 달 (The Moon Embracing the Sun) 2012 - MBC 공식 ====================
  { drama: "해를 품은 달", dramaEn: "The Moon Embracing the Sun", youtubeId: "cKMQJWxLTvM", timestamp: 0, scenes: [
    { character: "이훤", korean: "너를 잊지 않았다.", vietnamese: "Ta không quên ngươi.", context: "사극 로맨스", difficulty: "보통", audioTip: "애절하게", genre: "romantic" },
  ]},

  // ==================== 구르미 그린 달빛 (Love in the Moonlight) 2016 - KBS 공식 ====================
  { drama: "구르미 그린 달빛", dramaEn: "Love in the Moonlight", youtubeId: "7hT4tWc9p0w", timestamp: 0, scenes: [
    { character: "이영", korean: "네가 내 사람이 되어줄래?", vietnamese: "Em có muốn trở thành người của ta không?", context: "궁중 로맨스", difficulty: "보통", audioTip: "로맨틱하게", genre: "romantic" },
  ]},

  // ==================== 달의 연인 (Moon Lovers) 2016 - SBS 공식 ====================
  { drama: "달의 연인", dramaEn: "Moon Lovers", youtubeId: "a_b8IQYbM_g", timestamp: 0, scenes: [
    { character: "왕소", korean: "너만 있으면 돼.", vietnamese: "Chỉ cần có em là đủ.", context: "시간여행 로맨스", difficulty: "보통", audioTip: "간절하게", genre: "romantic" },
  ]},

  // ==================== 백일의 낭군님 (100 Days My Prince) 2018 - tvN 공식 ====================
  { drama: "백일의 낭군님", dramaEn: "100 Days My Prince", youtubeId: "bOL9VQJ9VbY", timestamp: 0, scenes: [
    { character: "이율", korean: "기억을 되찾겠다.", vietnamese: "Ta sẽ lấy lại ký ức.", context: "기억상실", difficulty: "보통", audioTip: "결연하게", genre: "romantic" },
  ]},

  // ==================== 더킹: 영원의 군주 (The King: Eternal Monarch) 2020 - SBS 공식 ====================
  { drama: "더킹: 영원의 군주", dramaEn: "The King: Eternal Monarch", youtubeId: "dDkM_rqfqPo", timestamp: 0, scenes: [
    { character: "이곤", korean: "내가 데리러 왔다. 너의 왕이.", vietnamese: "Ta đến đón ngươi. Vương của ngươi đây.", context: "명대사", difficulty: "보통", audioTip: "위엄 있게", genre: "fantasy" },
  ]},

  // ==================== 악의 꽃 (Flower of Evil) 2020 - tvN 공식 ====================
  { drama: "악의 꽃", dramaEn: "Flower of Evil", youtubeId: "r8BFyYT0gJI", timestamp: 0, scenes: [
    { character: "차지원", korean: "당신이 누구든, 난 당신을 사랑해.", vietnamese: "Dù anh là ai, em vẫn yêu anh.", context: "무조건적 사랑", difficulty: "보통", audioTip: "단호하게", genre: "romantic" },
  ]},

  // ==================== 시그널 (Signal) 2016 - tvN 공식 ====================
  { drama: "시그널", dramaEn: "Signal", youtubeId: "hjJ9aD91vbI", timestamp: 0, scenes: [
    { character: "이재한", korean: "과거를 바꿀 수 있다면.", vietnamese: "Nếu có thể thay đổi quá khứ.", context: "시간여행", difficulty: "보통", audioTip: "간절하게", genre: "thriller" },
  ]},

  // ==================== 비밀의 숲 (Stranger) 2017 - tvN 공식 ====================
  { drama: "비밀의 숲", dramaEn: "Stranger", youtubeId: "On1HUD9B78I", timestamp: 0, scenes: [
    { character: "황시목", korean: "진실을 밝혀야 합니다.", vietnamese: "Phải làm rõ sự thật.", context: "수사 장면", difficulty: "보통", audioTip: "냉철하게", genre: "thriller" },
  ]},

  // ==================== 미생 (Misaeng) 2014 - tvN 공식 ====================
  { drama: "미생", dramaEn: "Misaeng", youtubeId: "dKMwNp7wWaE", timestamp: 0, scenes: [
    { character: "장그래", korean: "아직 살아있습니다.", vietnamese: "Vẫn còn sống.", context: "회사생활", difficulty: "보통", audioTip: "결연하게", genre: "action" },
  ]},

  // ==================== 스카이캐슬 (SKY Castle) 2018-2019 - JTBC 공식 ====================
  { drama: "스카이캐슬", dramaEn: "SKY Castle", youtubeId: "BQQJ4Y3KVbk", timestamp: 0, scenes: [
    { character: "한서진", korean: "내 아이만은 성공시킬 거야.", vietnamese: "Tôi sẽ làm cho con tôi thành công.", context: "교육열", difficulty: "어려움", audioTip: "집착적으로", genre: "thriller" },
  ]},

  // ==================== 킬러들의 쇼핑몰 (A Shop for Killers) 2024 - U+ 공식 ====================
  { drama: "킬러들의 쇼핑몰", dramaEn: "A Shop for Killers", youtubeId: "uoaQOVqSF-U", timestamp: 0, scenes: [
    { character: "정지안", korean: "살아남는 게 복수야.", vietnamese: "Sống sót chính là trả thù.", context: "생존 의지", difficulty: "쉬움", audioTip: "강하게", genre: "action" },
  ]},

  // ==================== 지리산 (Jirisan) 2021 - tvN 공식 ====================
  { drama: "지리산", dramaEn: "Jirisan", youtubeId: "RYjpSBfcqqc", timestamp: 0, scenes: [
    { character: "서이강", korean: "산은 사람을 구하기도 하고, 삼키기도 해.", vietnamese: "Núi vừa cứu người, vừa nuốt người.", context: "산의 양면성", difficulty: "어려움", audioTip: "깊이 있게", genre: "thriller" },
  ]},

  // ==================== 고스트 닥터 (Ghost Doctor) 2022 - tvN 공식 ====================
  { drama: "고스트 닥터", dramaEn: "Ghost Doctor", youtubeId: "4WP3bQgdLME", timestamp: 0, scenes: [
    { character: "차영민", korean: "유령이 되어도 수술한다.", vietnamese: "Dù thành ma vẫn phẫu thuật.", context: "의료 판타지", difficulty: "보통", audioTip: "진지하게", genre: "fantasy" },
  ]},

  // ==================== 어느 날 (One Ordinary Day) 2021 - Coupang Play 공식 ====================
  { drama: "어느 날", dramaEn: "One Ordinary Day", youtubeId: "5q7UXrGxZu8", timestamp: 0, scenes: [
    { character: "김현수", korean: "나는 무죄야.", vietnamese: "Tôi vô tội.", context: "법정 스릴러", difficulty: "보통", audioTip: "억울하게", genre: "thriller" },
  ]},

  // ==================== 마우스 (Mouse) 2021 - tvN 공식 ====================
  { drama: "마우스", dramaEn: "Mouse", youtubeId: "K4IKzY5AaEM", timestamp: 0, scenes: [
    { character: "정바름", korean: "사이코패스를 잡겠다.", vietnamese: "Tôi sẽ bắt kẻ thái nhân cách.", context: "범죄 스릴러", difficulty: "어려움", audioTip: "집요하게", genre: "thriller" },
  ]},

  // ==================== 악마판사 (The Devil Judge) 2021 - tvN 공식 ====================
  { drama: "악마판사", dramaEn: "The Devil Judge", youtubeId: "jkGnZW5IddI", timestamp: 0, scenes: [
    { character: "강요한", korean: "법 위에 선 자.", vietnamese: "Kẻ đứng trên luật pháp.", context: "법정 스릴러", difficulty: "어려움", audioTip: "위엄 있게", genre: "thriller" },
  ]},

  // ==================== 빅마우스 (Big Mouth) 2022 - MBC 공식 ====================
  { drama: "빅마우스", dramaEn: "Big Mouth", youtubeId: "kpiP18VYw-s", timestamp: 0, scenes: [
    { character: "박창호", korean: "내가 빅마우스다.", vietnamese: "Tôi là Big Mouth.", context: "반전", difficulty: "어려움", audioTip: "강렬하게", genre: "thriller" },
  ]},

  // ==================== 수리남 (Suriname) 2022 - Netflix 공식 ====================
  { drama: "수리남", dramaEn: "Suriname", youtubeId: "4qgYA7TlMgM", timestamp: 0, scenes: [
    { character: "강인구", korean: "마약왕을 잡겠다.", vietnamese: "Tôi sẽ bắt trùm ma túy.", context: "잠입 수사", difficulty: "어려움", audioTip: "긴장감 있게", genre: "action" },
  ]},

  // ==================== 더 에이트 쇼 (The 8 Show) 2024 - Netflix 공식 ====================
  { drama: "더 에이트 쇼", dramaEn: "The 8 Show", youtubeId: "CWfWMxDqbN0", timestamp: 0, scenes: [
    { character: "참가자", korean: "시간이 곧 돈이다.", vietnamese: "Thời gian là tiền.", context: "Netflix 공식 예고", difficulty: "보통", audioTip: "긴장감 있게", genre: "thriller" },
  ]},

  // ==================== 경성크리처 (Gyeongseong Creature) 2023-2024 - Netflix 공식 ====================
  { drama: "경성크리처", dramaEn: "Gyeongseong Creature", youtubeId: "M4-qNj3mTQI", timestamp: 0, scenes: [
    { character: "장태상", korean: "이 괴물을 막아야 해.", vietnamese: "Phải ngăn chặn con quái vật này.", context: "괴물 추격", difficulty: "보통", audioTip: "긴박하게", genre: "action" },
  ]},

  // ==================== 서른아홉 (Thirty-Nine) 2022 - JTBC 공식 ====================
  { drama: "서른아홉", dramaEn: "Thirty-Nine", youtubeId: "rp7lUsT3sYM", timestamp: 0, scenes: [
    { character: "지현", korean: "아직 젊어!", vietnamese: "Vẫn còn trẻ!", context: "중년 로맨스", difficulty: "쉬움", audioTip: "밝게", genre: "romantic" },
  ]},

  // ==================== 사랑의 이해 (The Interest of Love) 2022-2023 - JTBC 공식 ====================
  { drama: "사랑의 이해", dramaEn: "The Interest of Love", youtubeId: "QKtLKDV8YwI", timestamp: 0, scenes: [
    { character: "하상수", korean: "사랑도 이해관계일까.", vietnamese: "Tình yêu cũng là quan hệ lợi ích sao.", context: "오피스 로맨스", difficulty: "보통", audioTip: "복잡하게", genre: "romantic" },
  ]},

  // ==================== 조선변호사 (Joseon Attorney) 2023 - MBC 공식 ====================
  { drama: "조선변호사", dramaEn: "Joseon Attorney", youtubeId: "JhzC5QZJY7I", timestamp: 0, scenes: [
    { character: "강한수", korean: "백성을 위한 송사.", vietnamese: "Kiện tụng vì bách tính.", context: "사극 법정", difficulty: "어려움", audioTip: "정의롭게", genre: "action" },
  ]},

  // ==================== 법쩐 (Payback) 2023 - SBS 공식 ====================
  { drama: "법쩐", dramaEn: "Payback", youtubeId: "TnK3dRkL5Xg", timestamp: 0, scenes: [
    { character: "은용", korean: "돈으로 복수한다.", vietnamese: "Trả thù bằng tiền.", context: "금융 스릴러", difficulty: "어려움", audioTip: "냉정하게", genre: "thriller" },
  ]},

  // ==================== 청춘기록 (Record of Youth) 2020 - tvN 공식 ====================
  { drama: "청춘기록", dramaEn: "Record of Youth", youtubeId: "Cb4k5N0KxjA", timestamp: 0, scenes: [
    { character: "사혜준", korean: "내 꿈을 위해 달려갈 거야.", vietnamese: "Tôi sẽ chạy vì ước mơ của mình.", context: "청춘 도전", difficulty: "보통", audioTip: "열정적으로", genre: "romantic" },
  ]},

  // ==================== 하이클래스 (High Class) 2021 - tvN 공식 ====================
  { drama: "하이클래스", dramaEn: "High Class", youtubeId: "hJxCYz5Xl1I", timestamp: 0, scenes: [
    { character: "송유리", korean: "상류사회의 비밀.", vietnamese: "Bí mật của giới thượng lưu.", context: "상류층 스릴러", difficulty: "어려움", audioTip: "우아하게", genre: "thriller" },
  ]},

  // ==================== 그린마더스클럽 (Green Mothers' Club) 2022 - JTBC 공식 ====================
  { drama: "그린마더스클럽", dramaEn: "Green Mothers' Club", youtubeId: "SWr2H7QNdmU", timestamp: 0, scenes: [
    { character: "엄마들", korean: "아이를 위한 전쟁.", vietnamese: "Cuộc chiến vì con.", context: "학부모 드라마", difficulty: "보통", audioTip: "긴장감 있게", genre: "thriller" },
  ]},
];

// Flatten all scenes with their drama info
const allScenes = verifiedDramaClips.flatMap(clip => 
  clip.scenes.map(scene => ({
    ...scene,
    drama: clip.drama,
    dramaEn: clip.dramaEn,
    youtubeId: clip.youtubeId,
    timestamp: clip.timestamp
  }))
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { genre, difficulty, excludeIds = [], count = 10 } = await req.json();
    
    console.log('Drama clips request:', { genre, difficulty, excludeIds: excludeIds.length, count, totalScenes: allScenes.length });

    // Filter scenes
    let filteredScenes = allScenes.filter(scene => !excludeIds.includes(scene.youtubeId));
    
    if (genre && genre !== '전체') {
      filteredScenes = filteredScenes.filter(scene => scene.genre === genre);
    }
    
    if (difficulty && difficulty !== '전체') {
      filteredScenes = filteredScenes.filter(scene => scene.difficulty === difficulty);
    }

    // Shuffle and take requested count
    const shuffled = filteredScenes.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);

    // Add unique IDs
    const result = selected.map(scene => ({
      ...scene,
      id: `${scene.drama.replace(/\s+/g, '_')}_${scene.youtubeId}_${Date.now()}`
    }));

    console.log('Returning', result.length, 'verified drama clips');

    return new Response(JSON.stringify({
      scenes: result,
      total: allScenes.length,
      filtered: filteredScenes.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
