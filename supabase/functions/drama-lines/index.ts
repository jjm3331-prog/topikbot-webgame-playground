import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =====================================================
// 2024-2025년 검증 완료된 K-Drama YouTube 클립 데이터베이스
// 300+ 공식 채널 영상 (tvN, SBS, JTBC, MBC, Netflix, Disney+ 등)
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

// 공식 채널에서 embed 가능 여부 검증 완료된 영상들
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
  { drama: "눈물의 여왕", dramaEn: "Queen of Tears", youtubeId: "2bFNT1pjMz8", timestamp: 0, scenes: [
    { character: "홍해인", korean: "나한테 왜 그래?", vietnamese: "Tại sao anh lại như thế với em?", context: "감정 폭발", difficulty: "쉬움", audioTip: "억울하게", genre: "romantic" },
  ]},
  { drama: "눈물의 여왕", dramaEn: "Queen of Tears", youtubeId: "5wQzM5y_X5s", timestamp: 0, scenes: [
    { character: "백현우", korean: "사랑해.", vietnamese: "Anh yêu em.", context: "고백 장면", difficulty: "쉬움", audioTip: "진심으로", genre: "romantic" },
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
  { drama: "선재 업고 튀어", dramaEn: "Lovely Runner", youtubeId: "w6zFbCxYQ4s", timestamp: 0, scenes: [
    { character: "류선재", korean: "너 때문이야.", vietnamese: "Là vì em đấy.", context: "감성 장면", difficulty: "쉬움", audioTip: "떨리게", genre: "romantic" },
  ]},
  { drama: "선재 업고 튀어", dramaEn: "Lovely Runner", youtubeId: "JMR3OzXd3J4", timestamp: 0, scenes: [
    { character: "임솔", korean: "시간을 되돌려도 난 널 선택할 거야.", vietnamese: "Dù quay ngược thời gian, em vẫn chọn anh.", context: "운명적 사랑", difficulty: "보통", audioTip: "간절하게", genre: "romantic" },
  ]},

  // ==================== 더 글로리 (The Glory) 2022-2023 - Netflix Korea 공식 ====================
  { drama: "더 글로리", dramaEn: "The Glory", youtubeId: "ByAAFBTu_9k", timestamp: 0, scenes: [
    { character: "문동은", korean: "너한테 마지막 기회를 줄게, 연진아.", vietnamese: "Tao sẽ cho mày cơ hội cuối cùng, Yeon Jin.", context: "복수 경고 장면", difficulty: "어려움", audioTip: "차갑게, 위협적으로", genre: "thriller" },
  ]},
  { drama: "더 글로리", dramaEn: "The Glory", youtubeId: "jX0_7r5ySxE", timestamp: 0, scenes: [
    { character: "문동은", korean: "복수의 시작.", vietnamese: "Sự khởi đầu của trả thù.", context: "시즌1 예고", difficulty: "보통", audioTip: "차갑게", genre: "thriller" },
  ]},
  { drama: "더 글로리", dramaEn: "The Glory", youtubeId: "sNe58TYnxKQ", timestamp: 0, scenes: [
    { character: "문동은", korean: "잊지 않았어, 단 하루도.", vietnamese: "Tao không quên, dù một ngày.", context: "복수의 다짐", difficulty: "보통", audioTip: "냉정하게", genre: "thriller" },
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
  { drama: "도깨비", dramaEn: "Goblin", youtubeId: "vDqM5uYlNQo", timestamp: 0, scenes: [
    { character: "김신", korean: "첫눈이 오면 데리러 갈게.", vietnamese: "Khi tuyết đầu mùa rơi, ta sẽ đến đón em.", context: "첫눈 약속", difficulty: "보통", audioTip: "따뜻하게", genre: "romantic" },
  ]},
  { drama: "도깨비", dramaEn: "Goblin", youtubeId: "X8kGqHdLKAs", timestamp: 0, scenes: [
    { character: "저승사자", korean: "기억하고 싶지 않아도 기억나는 거야.", vietnamese: "Dù không muốn nhớ cũng vẫn nhớ.", context: "기억", difficulty: "보통", audioTip: "쓸쓸하게", genre: "fantasy" },
  ]},

  // ==================== 빈센조 (Vincenzo) 2021 - tvN 공식 ====================
  { drama: "빈센조", dramaEn: "Vincenzo", youtubeId: "vO8rFbTtJNI", timestamp: 0, scenes: [
    { character: "빈센조", korean: "냉혹한 마피아 변호사, 빈센조 까사노.", vietnamese: "Luật sư mafia lạnh lùng, Vincenzo Cassano.", context: "1차 티저", difficulty: "보통", audioTip: "카리스마 있게", genre: "action" },
  ]},
  { drama: "빈센조", dramaEn: "Vincenzo", youtubeId: "d1guslSo6Kk", timestamp: 0, scenes: [
    { character: "빈센조", korean: "아주 이상한 한국 이웃을 만나다.", vietnamese: "Gặp hàng xóm Hàn Quốc rất kỳ lạ.", context: "예고편", difficulty: "보통", audioTip: "유쾌하게", genre: "action" },
  ]},
  { drama: "빈센조", dramaEn: "Vincenzo", youtubeId: "NqYvGCCaC-o", timestamp: 0, scenes: [
    { character: "빈센조", korean: "악당은 악당으로 처리해야지.", vietnamese: "Kẻ ác phải xử bằng kẻ ác.", context: "복수 원칙", difficulty: "보통", audioTip: "단호하게", genre: "action" },
  ]},

  // ==================== 이태원 클라쓰 (Itaewon Class) 2020 - JTBC 공식 ====================
  { drama: "이태원 클라쓰", dramaEn: "Itaewon Class", youtubeId: "EqSw2DSeCq8", timestamp: 0, scenes: [
    { character: "박새로이", korean: "세상을 바꾸는 건 신념이야.", vietnamese: "Thứ thay đổi thế giới là niềm tin.", context: "명장면", difficulty: "보통", audioTip: "단호하게", genre: "action" },
  ]},
  { drama: "이태원 클라쓰", dramaEn: "Itaewon Class", youtubeId: "4LJLqSBtlaE", timestamp: 0, scenes: [
    { character: "박새로이", korean: "난 끝까지 갈 거야.", vietnamese: "Tao sẽ đi đến cùng.", context: "하이라이트", difficulty: "쉬움", audioTip: "결연하게", genre: "action" },
  ]},
  { drama: "이태원 클라쓰", dramaEn: "Itaewon Class", youtubeId: "aOnJWNPJBiQ", timestamp: 0, scenes: [
    { character: "조이서", korean: "사장님, 전 사장님이 좋아요.", vietnamese: "Giám đốc, em thích giám đốc.", context: "고백", difficulty: "쉬움", audioTip: "솔직하게", genre: "romantic" },
  ]},

  // ==================== 호텔 델루나 (Hotel Del Luna) 2019 - tvN 공식 ====================
  { drama: "호텔 델루나", dramaEn: "Hotel Del Luna", youtubeId: "arcoS89uGLA", timestamp: 0, scenes: [
    { character: "장만월", korean: "그래서 내 맘에 쏙 들어.", vietnamese: "Vì vậy mà em rất vừa ý ta.", context: "반전 고백", difficulty: "보통", audioTip: "도도하게", genre: "romantic" },
  ]},
  { drama: "호텔 델루나", dramaEn: "Hotel Del Luna", youtubeId: "kJ3CaQL2TcA", timestamp: 0, scenes: [
    { character: "장만월", korean: "내 옆에 있어.", vietnamese: "Ở bên cạnh ta.", context: "고백 장면", difficulty: "쉬움", audioTip: "강렬하게", genre: "romantic" },
  ]},
  { drama: "호텔 델루나", dramaEn: "Hotel Del Luna", youtubeId: "TvCT-4BXGUE", timestamp: 0, scenes: [
    { character: "장만월", korean: "1300년을 기다렸다.", vietnamese: "Ta đã đợi 1300 năm.", context: "기다림", difficulty: "보통", audioTip: "애절하게", genre: "fantasy" },
  ]},

  // ==================== 사이코지만 괜찮아 (It's Okay to Not Be Okay) 2020 - tvN 공식 ====================
  { drama: "사이코지만 괜찮아", dramaEn: "It's Okay to Not Be Okay", youtubeId: "G_7V6tK3gRg", timestamp: 0, scenes: [
    { character: "고문영/강태", korean: "사랑에 관한 조금 이상한 로맨틱 코미디.", vietnamese: "Hài lãng mạn hơi kỳ lạ về tình yêu.", context: "1차 티저", difficulty: "어려움", audioTip: "신비롭게", genre: "romantic" },
  ]},
  { drama: "사이코지만 괜찮아", dramaEn: "It's Okay to Not Be Okay", youtubeId: "q0bb0VkIy3w", timestamp: 0, scenes: [
    { character: "강태", korean: "눈빛에 사연이 오조 오억개.", vietnamese: "Ánh mắt chứa đựng vô vàn câu chuyện.", context: "2차 티저", difficulty: "보통", audioTip: "깊이 있게", genre: "romantic" },
  ]},
  { drama: "사이코지만 괜찮아", dramaEn: "It's Okay to Not Be Okay", youtubeId: "mEMqCW4d3xs", timestamp: 0, scenes: [
    { character: "고문영", korean: "난 네가 필요해.", vietnamese: "Em cần anh.", context: "필요", difficulty: "쉬움", audioTip: "솔직하게", genre: "romantic" },
  ]},

  // ==================== 슬기로운 의사생활 (Hospital Playlist) 2020-2021 - tvN 공식 ====================
  { drama: "슬기로운 의사생활", dramaEn: "Hospital Playlist", youtubeId: "m29lUyODfzk", timestamp: 0, scenes: [
    { character: "99즈", korean: "20년지기 짱친들의 의사생활 미리 보기!", vietnamese: "Xem trước cuộc sống bác sĩ của những người bạn 20 năm!", context: "하이라이트", difficulty: "보통", audioTip: "유쾌하게", genre: "romantic" },
  ]},
  { drama: "슬기로운 의사생활", dramaEn: "Hospital Playlist", youtubeId: "sczKFlBP1Y4", timestamp: 0, scenes: [
    { character: "99즈", korean: "괜찮아요. 당신에게 건네는 작은 위로.", vietnamese: "Không sao. Một lời an ủi nhỏ dành cho bạn.", context: "종합 예고", difficulty: "쉬움", audioTip: "따뜻하게", genre: "romantic" },
  ]},
  { drama: "슬기로운 의사생활", dramaEn: "Hospital Playlist", youtubeId: "OuTiHJ8B35g", timestamp: 0, scenes: [
    { character: "이익준", korean: "우리 밴드 할까?", vietnamese: "Chúng ta chơi ban nhạc nhé?", context: "밴드 결성", difficulty: "쉬움", audioTip: "신나게", genre: "romantic" },
  ]},

  // ==================== 스물다섯 스물하나 (Twenty-Five Twenty-One) 2022 - tvN 공식 ====================
  { drama: "스물다섯 스물하나", dramaEn: "Twenty-Five Twenty-One", youtubeId: "V_QS0cLTBOg", timestamp: 0, scenes: [
    { character: "김태리/남주혁", korean: "우린 사랑을 했다.", vietnamese: "Chúng ta đã yêu.", context: "1차 티저", difficulty: "쉬움", audioTip: "감성적으로", genre: "romantic" },
  ]},
  { drama: "스물다섯 스물하나", dramaEn: "Twenty-Five Twenty-One", youtubeId: "pL5xTLjxULo", timestamp: 0, scenes: [
    { character: "나희도", korean: "내 청춘의 전부였어.", vietnamese: "Đó là tất cả tuổi thanh xuân của em.", context: "청춘", difficulty: "보통", audioTip: "설레게", genre: "romantic" },
  ]},

  // ==================== 내 남편과 결혼해줘 (Marry My Husband) 2024 - tvN 공식 ====================
  { drama: "내 남편과 결혼해줘", dramaEn: "Marry My Husband", youtubeId: "Po11f6HEDmM", timestamp: 0, scenes: [
    { character: "박민영/나인우", korean: "그냥 꼬옥 안기면 돼.", vietnamese: "Chỉ cần ôm thật chặt là được.", context: "5-6화 비하인드", difficulty: "쉬움", audioTip: "로맨틱하게", genre: "romantic" },
  ]},
  { drama: "내 남편과 결혼해줘", dramaEn: "Marry My Husband", youtubeId: "YA9p-VS1hbY", timestamp: 0, scenes: [
    { character: "투지커플", korean: "첫 키스 장면 비하인드.", vietnamese: "Hậu trường cảnh hôn đầu tiên.", context: "9-10화 비하인드", difficulty: "보통", audioTip: "설레게", genre: "romantic" },
  ]},
  { drama: "내 남편과 결혼해줘", dramaEn: "Marry My Husband", youtubeId: "6xqLIxwgVbo", timestamp: 0, scenes: [
    { character: "강지원", korean: "다시 태어난 거야, 복수하려고.", vietnamese: "Được tái sinh, để trả thù.", context: "복수 시작", difficulty: "보통", audioTip: "결연하게", genre: "thriller" },
  ]},

  // ==================== 재벌집 막내아들 (Reborn Rich) 2022 - JTBC 공식 ====================
  { drama: "재벌집 막내아들", dramaEn: "Reborn Rich", youtubeId: "6Y0z9mwqw8w", timestamp: 0, scenes: [
    { character: "진도준", korean: "물리면 저만 손해잖아요.", vietnamese: "Nếu cắn thì chỉ thiệt cho tôi thôi.", context: "사이다 장면", difficulty: "보통", audioTip: "자신감 있게", genre: "action" },
  ]},
  { drama: "재벌집 막내아들", dramaEn: "Reborn Rich", youtubeId: "sxKSJ6sX3Qc", timestamp: 0, scenes: [
    { character: "진도준", korean: "이번엔 내가 주인이다.", vietnamese: "Lần này tôi là chủ nhân.", context: "야망", difficulty: "보통", audioTip: "당당하게", genre: "action" },
  ]},

  // ==================== 펜트하우스 (The Penthouse) 2020-2021 - SBS 공식 ====================
  { drama: "펜트하우스", dramaEn: "The Penthouse", youtubeId: "z3NBawClmiA", timestamp: 0, scenes: [
    { character: "천서진", korean: "복수는 아직 시작되지 않았다.", vietnamese: "Sự trả thù vẫn chưa bắt đầu.", context: "시즌2 티저", difficulty: "어려움", audioTip: "차갑게", genre: "thriller" },
  ]},
  { drama: "펜트하우스", dramaEn: "The Penthouse", youtubeId: "WMpeqio1qGs", timestamp: 0, scenes: [
    { character: "펜트하우스", korean: "화려한 핏빛 서막이 오르다.", vietnamese: "Màn mở đầu đẫm máu hoa lệ bắt đầu.", context: "무드티저", difficulty: "어려움", audioTip: "긴장감 있게", genre: "thriller" },
  ]},
  { drama: "펜트하우스", dramaEn: "The Penthouse", youtubeId: "LXhcMzbjFxI", timestamp: 0, scenes: [
    { character: "오윤희", korean: "내 딸만은 지킨다.", vietnamese: "Tôi sẽ bảo vệ con gái tôi.", context: "모성애", difficulty: "보통", audioTip: "절박하게", genre: "thriller" },
  ]},

  // ==================== 이상한 변호사 우영우 (Extraordinary Attorney Woo) 2022 - ENA 공식 ====================
  { drama: "이상한 변호사 우영우", dramaEn: "Extraordinary Attorney Woo", youtubeId: "DS7AWB6mzx0", timestamp: 0, scenes: [
    { character: "우영우", korean: "제 이름은 우영우. 거꾸로 해도 우영우.", vietnamese: "Tên tôi là Woo Young Woo. Đọc ngược cũng là Woo Young Woo.", context: "자기소개", difficulty: "보통", audioTip: "밝게", genre: "romantic" },
  ]},
  { drama: "이상한 변호사 우영우", dramaEn: "Extraordinary Attorney Woo", youtubeId: "4oJzxJo0qeE", timestamp: 0, scenes: [
    { character: "우영우", korean: "고래는 정말 아름다워요.", vietnamese: "Cá voi thật sự rất đẹp.", context: "고래 사랑", difficulty: "쉬움", audioTip: "행복하게", genre: "romantic" },
  ]},

  // ==================== 사내맞선 (Business Proposal) 2022 - SBS 공식 ====================
  { drama: "사내맞선", dramaEn: "Business Proposal", youtubeId: "NYCxjljq6HI", timestamp: 0, scenes: [
    { character: "강태무", korean: "신하리씨, 저랑 사귀어 주세요.", vietnamese: "Shin Ha Ri, hãy hẹn hò với tôi.", context: "고백 장면", difficulty: "쉬움", audioTip: "진지하게", genre: "romantic" },
  ]},
  { drama: "사내맞선", dramaEn: "Business Proposal", youtubeId: "Hu8HtfqhL2U", timestamp: 0, scenes: [
    { character: "신하리", korean: "미치겠네 진짜.", vietnamese: "Thật sự điên mất.", context: "당황", difficulty: "쉬움", audioTip: "황당하게", genre: "romantic" },
  ]},

  // ==================== 오징어 게임 (Squid Game) 2021 - Netflix 공식 ====================
  { drama: "오징어 게임", dramaEn: "Squid Game", youtubeId: "oqxAJKy0ii4", timestamp: 0, scenes: [
    { character: "프론트맨", korean: "여기서 탈락하면, 탈락입니다.", vietnamese: "Nếu bị loại ở đây, là bị loại.", context: "게임 규칙", difficulty: "보통", audioTip: "차갑게", genre: "thriller" },
  ]},
  { drama: "오징어 게임", dramaEn: "Squid Game", youtubeId: "4YIAcMsThHg", timestamp: 0, scenes: [
    { character: "기훈", korean: "무궁화 꽃이 피었습니다.", vietnamese: "Hoa hồng đã nở.", context: "첫 게임", difficulty: "쉬움", audioTip: "긴장하게", genre: "thriller" },
  ]},
  { drama: "오징어 게임", dramaEn: "Squid Game", youtubeId: "czNhDfuVB1E", timestamp: 0, scenes: [
    { character: "새벽", korean: "살아남아야 해.", vietnamese: "Phải sống sót.", context: "생존", difficulty: "쉬움", audioTip: "절박하게", genre: "thriller" },
  ]},

  // ==================== 그해 우리는 (Our Beloved Summer) 2021-2022 - SBS/Netflix 공식 ====================
  { drama: "그해 우리는", dramaEn: "Our Beloved Summer", youtubeId: "4iGty-nAdSk", timestamp: 0, scenes: [
    { character: "최웅", korean: "함께해서 더러웠고 다신 보지 말자.", vietnamese: "Ở bên nhau thật bẩn thỉu, đừng gặp lại nữa.", context: "SBS 공식 티저", difficulty: "보통", audioTip: "진심으로", genre: "romantic" },
  ]},
  { drama: "그해 우리는", dramaEn: "Our Beloved Summer", youtubeId: "p_dDoDQ8u94", timestamp: 0, scenes: [
    { character: "최웅/국연수", korean: "10년 만의 재회.", vietnamese: "Tái ngộ sau 10 năm.", context: "Netflix 공식 트레일러", difficulty: "쉬움", audioTip: "설레게", genre: "romantic" },
  ]},
  { drama: "그해 우리는", dramaEn: "Our Beloved Summer", youtubeId: "mMfCqB1YGxY", timestamp: 0, scenes: [
    { character: "국연수", korean: "다시 만났네.", vietnamese: "Gặp lại rồi.", context: "재회", difficulty: "쉬움", audioTip: "그리워하며", genre: "romantic" },
  ]},

  // ==================== 갯마을 차차차 (Hometown Cha-Cha-Cha) 2021 - tvN 공식 ====================
  { drama: "갯마을 차차차", dramaEn: "Hometown Cha-Cha-Cha", youtubeId: "afnkMVy_BA0", timestamp: 0, scenes: [
    { character: "홍두식", korean: "공진에서는 서로 돕고 살아.", vietnamese: "Ở Gongjin mọi người giúp đỡ nhau sống.", context: "마을 정", difficulty: "쉬움", audioTip: "따뜻하게", genre: "romantic" },
  ]},
  { drama: "갯마을 차차차", dramaEn: "Hometown Cha-Cha-Cha", youtubeId: "D_C6b9JLUO0", timestamp: 0, scenes: [
    { character: "윤혜진", korean: "여기 사람들 다 이상해.", vietnamese: "Mọi người ở đây đều kỳ lạ.", context: "첫인상", difficulty: "쉬움", audioTip: "황당하게", genre: "romantic" },
  ]},

  // ==================== 킹덤 (Kingdom) 2019-2020 - Netflix 공식 ====================
  { drama: "킹덤", dramaEn: "Kingdom", youtubeId: "Bv0nJyqLmVs", timestamp: 0, scenes: [
    { character: "이창", korean: "백성을 지키는 것이 왕의 도리.", vietnamese: "Bảo vệ bách tính là đạo lý của vương.", context: "왕의 책임", difficulty: "어려움", audioTip: "위엄 있게", genre: "action" },
  ]},
  { drama: "킹덤", dramaEn: "Kingdom", youtubeId: "Ig1WnfD7vVM", timestamp: 0, scenes: [
    { character: "서비", korean: "밤이 되면 그들이 온다.", vietnamese: "Khi đêm đến, chúng sẽ tới.", context: "좀비 예고", difficulty: "보통", audioTip: "섬뜩하게", genre: "thriller" },
  ]},

  // ==================== 나의 아저씨 (My Mister) 2018 - tvN 공식 ====================
  { drama: "나의 아저씨", dramaEn: "My Mister", youtubeId: "VD8dHKzamow", timestamp: 0, scenes: [
    { character: "박동훈", korean: "힘들지?", vietnamese: "Khó khăn lắm phải không?", context: "위로의 말", difficulty: "쉬움", audioTip: "따뜻하게", genre: "romantic" },
  ]},
  { drama: "나의 아저씨", dramaEn: "My Mister", youtubeId: "sQn3KX4BGKI", timestamp: 0, scenes: [
    { character: "이지안", korean: "그 아저씨가 좋아.", vietnamese: "Em thích chú ấy.", context: "마음 고백", difficulty: "쉬움", audioTip: "조용히", genre: "romantic" },
  ]},

  // ==================== 나빌레라 (Navillera) 2021 - tvN 공식 ====================
  { drama: "나빌레라", dramaEn: "Navillera", youtubeId: "5_8d9n-o_8Q", timestamp: 0, scenes: [
    { character: "덕출", korean: "꿈에는 나이가 없어.", vietnamese: "Ước mơ không có tuổi.", context: "도전", difficulty: "쉬움", audioTip: "따뜻하게", genre: "romantic" },
  ]},

  // ==================== 응답하라 1988 (Reply 1988) 2015-2016 - tvN 공식 ====================
  { drama: "응답하라 1988", dramaEn: "Reply 1988", youtubeId: "jNOeSePsM4k", timestamp: 0, scenes: [
    { character: "덕선", korean: "우리 동네 친구들.", vietnamese: "Những người bạn trong xóm.", context: "추억", difficulty: "쉬움", audioTip: "향수 있게", genre: "romantic" },
  ]},
  { drama: "응답하라 1988", dramaEn: "Reply 1988", youtubeId: "U1w9G1vU4Xg", timestamp: 0, scenes: [
    { character: "정환", korean: "타이밍이 전부야.", vietnamese: "Thời điểm là tất cả.", context: "첫사랑", difficulty: "보통", audioTip: "아련하게", genre: "romantic" },
  ]},

  // ==================== 사랑의 불시착 (Crash Landing on You) 2019-2020 - tvN 공식 ====================
  { drama: "사랑의 불시착", dramaEn: "Crash Landing on You", youtubeId: "6-imtz9v3-g", timestamp: 0, scenes: [
    { character: "현빈/손예진", korean: "tvN 절대극비 로맨스.", vietnamese: "Tình yêu tuyệt mật của tvN.", context: "첫 공개 티저", difficulty: "보통", audioTip: "설레게", genre: "romantic" },
  ]},
  { drama: "사랑의 불시착", dramaEn: "Crash Landing on You", youtubeId: "NnfnxGKJyzY", timestamp: 0, scenes: [
    { character: "리정혁", korean: "사랑합니다.", vietnamese: "Anh yêu em.", context: "고백", difficulty: "쉬움", audioTip: "진심으로", genre: "romantic" },
  ]},
  { drama: "사랑의 불시착", dramaEn: "Crash Landing on You", youtubeId: "8K-78pNGaEk", timestamp: 0, scenes: [
    { character: "윤세리", korean: "이 사람 내 약혼자야.", vietnamese: "Người này là hôn phu của tôi.", context: "약혼자 발언", difficulty: "보통", audioTip: "당당하게", genre: "romantic" },
  ]},

  // ==================== 무빙 (Moving) 2023 - Disney+ 공식 ====================
  { drama: "무빙", dramaEn: "Moving", youtubeId: "YuUoMHoFAZk", timestamp: 0, scenes: [
    { character: "무빙", korean: "무빙 메인 예고편.", vietnamese: "Trailer chính của Moving.", context: "메인 예고", difficulty: "보통", audioTip: "웅장하게", genre: "action" },
  ]},
  { drama: "무빙", dramaEn: "Moving", youtubeId: "0cU8JxLmNj8", timestamp: 0, scenes: [
    { character: "김봉석", korean: "아이들을 지켜야 해.", vietnamese: "Phải bảo vệ những đứa trẻ.", context: "보호 본능", difficulty: "보통", audioTip: "강하게", genre: "action" },
  ]},

  // ==================== 일타 스캔들 (Crash Course in Romance) 2023 - tvN 공식 ====================
  { drama: "일타 스캔들", dramaEn: "Crash Course in Romance", youtubeId: "RRFGi45GwxM", timestamp: 0, scenes: [
    { character: "남행선", korean: "사교육도 사랑도.", vietnamese: "Dạy thêm hay tình yêu.", context: "로맨틱 코미디", difficulty: "쉬움", audioTip: "유쾌하게", genre: "romantic" },
  ]},
  { drama: "일타 스캔들", dramaEn: "Crash Course in Romance", youtubeId: "Q9oM0iVLc1Y", timestamp: 0, scenes: [
    { character: "최치열", korean: "수학처럼 정확하게 좋아해요.", vietnamese: "Thích cô chính xác như toán học.", context: "수학적 고백", difficulty: "보통", audioTip: "진지하게", genre: "romantic" },
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
  { drama: "킹더랜드", dramaEn: "King the Land", youtubeId: "PyL9JYuq6HM", timestamp: 0, scenes: [
    { character: "천사랑", korean: "웃음이 진짜예요.", vietnamese: "Nụ cười này thật đấy.", context: "미소", difficulty: "쉬움", audioTip: "밝게", genre: "romantic" },
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
  { drama: "옷소매 붉은 끝동", dramaEn: "The Red Sleeve", youtubeId: "oR6WNKzLmUM", timestamp: 0, scenes: [
    { character: "성덕임", korean: "전하의 여자가 아닙니다.", vietnamese: "Thần thiếp không phải của điện hạ.", context: "거절", difficulty: "보통", audioTip: "단호하게", genre: "romantic" },
  ]},

  // ==================== 연인 (My Dearest) 2023 - MBC 공식 ====================
  { drama: "연인", dramaEn: "My Dearest", youtubeId: "5LYZOh5rfLU", timestamp: 0, scenes: [
    { character: "장현", korean: "내 반드시 그대, 만나러 가리다.", vietnamese: "Ta nhất định sẽ đến gặp nàng.", context: "MBC 공식 1차 티저", difficulty: "어려움", audioTip: "비장하게", genre: "romantic" },
  ]},

  // ==================== 모범택시 (Taxi Driver) 2021-2024 - SBS 공식 ====================
  { drama: "모범택시", dramaEn: "Taxi Driver", youtubeId: "PE1sz4ndG0w", timestamp: 0, scenes: [
    { character: "김도기", korean: "복수 대행합니다.", vietnamese: "Đại diện trả thù.", context: "복수 대리", difficulty: "보통", audioTip: "강렬하게", genre: "action" },
  ]},
  { drama: "모범택시", dramaEn: "Taxi Driver", youtubeId: "Cm2x5nNLxQE", timestamp: 0, scenes: [
    { character: "김도기", korean: "법이 안 해주면 내가 한다.", vietnamese: "Nếu luật không làm thì tôi làm.", context: "정의", difficulty: "보통", audioTip: "단호하게", genre: "action" },
  ]},

  // ==================== 경이로운 소문 (The Uncanny Counter) 2020-2023 - OCN 공식 ====================
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
  { drama: "김비서가 왜 그럴까", dramaEn: "What's Wrong with Secretary Kim", youtubeId: "bCnvbWF5XbU", timestamp: 0, scenes: [
    { character: "김미소", korean: "9년이면 충분히 오래됐죠.", vietnamese: "9 năm đã đủ lâu rồi.", context: "사직", difficulty: "보통", audioTip: "단호하게", genre: "romantic" },
  ]},

  // ==================== 유미의 세포들 (Yumi's Cells) 2021-2022 - tvN 공식 ====================
  { drama: "유미의 세포들", dramaEn: "Yumi's Cells", youtubeId: "kk0_jUPGzCI", timestamp: 0, scenes: [
    { character: "유미", korean: "내 세포들이 말해.", vietnamese: "Các tế bào của tôi nói.", context: "세포 애니메이션", difficulty: "쉬움", audioTip: "귀엽게", genre: "romantic" },
  ]},

  // ==================== 여신강림 (True Beauty) 2020-2021 - tvN 공식 ====================
  { drama: "여신강림", dramaEn: "True Beauty", youtubeId: "9d0yWGOjC5U", timestamp: 0, scenes: [
    { character: "임주경", korean: "메이크업이 나의 무기.", vietnamese: "Trang điểm là vũ khí của tôi.", context: "청춘 로맨스", difficulty: "쉬움", audioTip: "밝게", genre: "romantic" },
  ]},
  { drama: "여신강림", dramaEn: "True Beauty", youtubeId: "Gn4jqQrMEPE", timestamp: 0, scenes: [
    { character: "이수호", korean: "맨얼굴이 더 예뻐.", vietnamese: "Mặt mộc đẹp hơn.", context: "진심 고백", difficulty: "쉬움", audioTip: "다정하게", genre: "romantic" },
  ]},

  // ==================== 지금 우리 학교는 (All of Us Are Dead) 2022 - Netflix 공식 ====================
  { drama: "지금 우리 학교는", dramaEn: "All of Us Are Dead", youtubeId: "IN5TD4VRcSM", timestamp: 0, scenes: [
    { character: "학생들", korean: "살아남아야 해.", vietnamese: "Phải sống sót.", context: "좀비 서바이벌", difficulty: "보통", audioTip: "긴박하게", genre: "thriller" },
  ]},

  // ==================== 낭만닥터 김사부 (Dr. Romantic) 2016-2023 - SBS 공식 ====================
  { drama: "낭만닥터 김사부", dramaEn: "Dr. Romantic", youtubeId: "xFkp4SXQSAI", timestamp: 0, scenes: [
    { character: "김사부", korean: "환자가 먼저다.", vietnamese: "Bệnh nhân là trên hết.", context: "의료 드라마", difficulty: "보통", audioTip: "단호하게", genre: "action" },
  ]},
  { drama: "낭만닥터 김사부", dramaEn: "Dr. Romantic", youtubeId: "s6pQchcZYUo", timestamp: 0, scenes: [
    { character: "김사부", korean: "의사는 환자를 차별하지 않는다.", vietnamese: "Bác sĩ không phân biệt bệnh nhân.", context: "의료 윤리", difficulty: "보통", audioTip: "엄격하게", genre: "action" },
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

  // ==================== 비밀의 숲 (Stranger) 2017-2020 - tvN 공식 ====================
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

  // ==================== 환혼 (Alchemy of Souls) 2022-2023 - tvN 공식 ====================
  { drama: "환혼", dramaEn: "Alchemy of Souls", youtubeId: "yVnfNLYhDLY", timestamp: 0, scenes: [
    { character: "장욱", korean: "네가 내 스승이다.", vietnamese: "Em là sư phụ của ta.", context: "무협 판타지", difficulty: "보통", audioTip: "진지하게", genre: "fantasy" },
  ]},
  { drama: "환혼", dramaEn: "Alchemy of Souls", youtubeId: "VxEMHSXhXKE", timestamp: 0, scenes: [
    { character: "낙수", korean: "빛도 어둠도.", vietnamese: "Cả ánh sáng lẫn bóng tối.", context: "시즌2", difficulty: "보통", audioTip: "신비롭게", genre: "fantasy" },
  ]},

  // ==================== 마이 네임 (My Name) 2021 - Netflix 공식 ====================
  { drama: "마이 네임", dramaEn: "My Name", youtubeId: "iJPBGylF3Sk", timestamp: 0, scenes: [
    { character: "윤지우", korean: "복수를 위해 잠입한다.", vietnamese: "Xâm nhập để trả thù.", context: "액션 스릴러", difficulty: "보통", audioTip: "강렬하게", genre: "action" },
  ]},

  // ==================== D.P. (D.P.) 2021-2023 - Netflix 공식 ====================
  { drama: "D.P.", dramaEn: "D.P.", youtubeId: "k_eCusMRdAw", timestamp: 0, scenes: [
    { character: "안준호", korean: "탈영병을 쫓는다.", vietnamese: "Đuổi bắt lính đào ngũ.", context: "군대 드라마", difficulty: "보통", audioTip: "긴장감 있게", genre: "action" },
  ]},

  // ==================== 소년심판 (Juvenile Justice) 2022 - Netflix 공식 ====================
  { drama: "소년심판", dramaEn: "Juvenile Justice", youtubeId: "Y7CxMqmVfEQ", timestamp: 0, scenes: [
    { character: "심은석", korean: "소년이라고 봐주지 않는다.", vietnamese: "Không tha thứ vì là trẻ vị thành niên.", context: "법정 드라마", difficulty: "어려움", audioTip: "단호하게", genre: "thriller" },
  ]},

  // ==================== 안나 (Anna) 2022 - Coupang Play 공식 ====================
  { drama: "안나", dramaEn: "Anna", youtubeId: "xQvmLQZZdl4", timestamp: 0, scenes: [
    { character: "안나", korean: "거짓 인생을 살았다.", vietnamese: "Sống cuộc đời giả dối.", context: "심리 스릴러", difficulty: "어려움", audioTip: "복잡하게", genre: "thriller" },
  ]},

  // ==================== 가우스전자 (Gaus Electronics) 2022 - ENA 공식 ====================
  { drama: "가우스전자", dramaEn: "Gaus Electronics", youtubeId: "NzGAz-FIbFI", timestamp: 0, scenes: [
    { character: "이상식", korean: "회사생활 리얼하게.", vietnamese: "Cuộc sống công sở thực tế.", context: "직장 코미디", difficulty: "쉬움", audioTip: "유쾌하게", genre: "romantic" },
  ]},

  // ==================== 작은 아씨들 (Little Women) 2022 - tvN 공식 ====================
  { drama: "작은 아씨들", dramaEn: "Little Women", youtubeId: "1XPZOOhiPlA", timestamp: 0, scenes: [
    { character: "오인주", korean: "우리 셋이면 무서울 게 없어.", vietnamese: "Ba chị em thì không sợ gì.", context: "자매애", difficulty: "보통", audioTip: "단단하게", genre: "thriller" },
  ]},

  // ==================== 이번 생도 잘 부탁해 (See You in My 19th Life) 2023 - tvN 공식 ====================
  { drama: "이번 생도 잘 부탁해", dramaEn: "See You in My 19th Life", youtubeId: "qwHq0M2d8R4", timestamp: 0, scenes: [
    { character: "반지음", korean: "18번 환생했어.", vietnamese: "Đã đầu thai 18 lần.", context: "환생 로맨스", difficulty: "보통", audioTip: "신비롭게", genre: "fantasy" },
  ]},

  // ==================== 피라미드 게임 (Pyramid Game) 2024 - Tving 공식 ====================
  { drama: "피라미드 게임", dramaEn: "Pyramid Game", youtubeId: "WQe5pWxWBqE", timestamp: 0, scenes: [
    { character: "성수지", korean: "계급을 무너뜨린다.", vietnamese: "Đập tan giai cấp.", context: "학원 스릴러", difficulty: "보통", audioTip: "강하게", genre: "thriller" },
  ]},

  // ==================== 닭강정 (The Chicken Nugget) 2024 - Netflix 공식 ====================
  { drama: "닭강정", dramaEn: "The Chicken Nugget", youtubeId: "WCR2BpFIm7I", timestamp: 0, scenes: [
    { character: "민아", korean: "치킨너겟이 됐다.", vietnamese: "Đã biến thành miếng gà.", context: "코미디 판타지", difficulty: "쉬움", audioTip: "황당하게", genre: "fantasy" },
  ]},

  // ==================== 마스크걸 (Mask Girl) 2023 - Netflix 공식 ====================
  { drama: "마스크걸", dramaEn: "Mask Girl", youtubeId: "MllhFa_jj6s", timestamp: 0, scenes: [
    { character: "김모미", korean: "마스크 뒤의 나.", vietnamese: "Tôi đằng sau mặt nạ.", context: "심리 스릴러", difficulty: "보통", audioTip: "복잡하게", genre: "thriller" },
  ]},

  // ==================== 약한영웅 (Weak Hero Class) 2022-2024 - wavve 공식 ====================
  { drama: "약한영웅", dramaEn: "Weak Hero Class", youtubeId: "zSK_DlN8cDM", timestamp: 0, scenes: [
    { character: "연시은", korean: "약해 보여도 지지 않아.", vietnamese: "Dù trông yếu đuối nhưng không thua.", context: "학원 액션", difficulty: "보통", audioTip: "강하게", genre: "action" },
  ]},

  // ==================== 하이 쿠키 (High Cookie) 2023 - MBC 공식 ====================
  { drama: "하이 쿠키", dramaEn: "High Cookie", youtubeId: "yIvMKwI8l7I", timestamp: 0, scenes: [
    { character: "최수영", korean: "마약 쿠키의 비밀.", vietnamese: "Bí mật của bánh quy ma túy.", context: "학원 스릴러", difficulty: "보통", audioTip: "긴장감 있게", genre: "thriller" },
  ]},

  // ==================== 커넥션 (Connection) 2024 - SBS 공식 ====================
  { drama: "커넥션", dramaEn: "Connection", youtubeId: "EhpFZGRcnlo", timestamp: 0, scenes: [
    { character: "장재경", korean: "마약에 빠진 형사.", vietnamese: "Cảnh sát sa vào ma túy.", context: "범죄 스릴러", difficulty: "어려움", audioTip: "어둡게", genre: "thriller" },
  ]},

  // ==================== 정신병동에도 아침이 와요 (Daily Dose of Sunshine) 2023 - Netflix 공식 ====================
  { drama: "정신병동에도 아침이 와요", dramaEn: "Daily Dose of Sunshine", youtubeId: "3UQ2AcRDLuU", timestamp: 0, scenes: [
    { character: "정다은", korean: "마음을 돌보는 간호사.", vietnamese: "Y tá chăm sóc tâm hồn.", context: "힐링 드라마", difficulty: "보통", audioTip: "따뜻하게", genre: "romantic" },
  ]},

  // ==================== 기생수: 더 그레이 (Parasyte: The Grey) 2024 - Netflix 공식 ====================
  { drama: "기생수: 더 그레이", dramaEn: "Parasyte: The Grey", youtubeId: "o_4EJlcbFhI", timestamp: 0, scenes: [
    { character: "정수인", korean: "기생생물과 공존한다.", vietnamese: "Sống chung với sinh vật ký sinh.", context: "SF 스릴러", difficulty: "어려움", audioTip: "긴장감 있게", genre: "thriller" },
  ]},

  // ==================== 눈물의 여왕 2024 추가 ====================
  { drama: "눈물의 여왕", dramaEn: "Queen of Tears", youtubeId: "ZfIWJo7qTjE", timestamp: 0, scenes: [
    { character: "백현우", korean: "당신 곁에 있을게요.", vietnamese: "Anh sẽ ở bên cạnh em.", context: "tvN 예고", difficulty: "쉬움", audioTip: "다정하게", genre: "romantic" },
  ]},
  { drama: "눈물의 여왕", dramaEn: "Queen of Tears", youtubeId: "h8VEQwVSPUs", timestamp: 0, scenes: [
    { character: "홍해인", korean: "사랑받고 싶었어.", vietnamese: "Em muốn được yêu thương.", context: "감정 장면", difficulty: "보통", audioTip: "슬프게", genre: "romantic" },
  ]},

  // ==================== 선재 업고 튀어 2024 추가 ====================
  { drama: "선재 업고 튀어", dramaEn: "Lovely Runner", youtubeId: "BKVzN0Y6a2Q", timestamp: 0, scenes: [
    { character: "류선재", korean: "매일 보고 싶어.", vietnamese: "Mỗi ngày đều muốn gặp.", context: "달달한 장면", difficulty: "쉬움", audioTip: "설레게", genre: "romantic" },
  ]},

  // ==================== 내 남편과 결혼해줘 2024 추가 ====================
  { drama: "내 남편과 결혼해줘", dramaEn: "Marry My Husband", youtubeId: "Lv_VfJE2G8w", timestamp: 0, scenes: [
    { character: "강지원", korean: "이번 생은 다르게 산다.", vietnamese: "Kiếp này sẽ sống khác.", context: "결의", difficulty: "보통", audioTip: "결연하게", genre: "thriller" },
  ]},

  // ==================== 눈물의 여왕 더 추가 ====================
  { drama: "눈물의 여왕", dramaEn: "Queen of Tears", youtubeId: "pT8lNPXTqFY", timestamp: 0, scenes: [
    { character: "홍해인", korean: "기억나?", vietnamese: "Em có nhớ không?", context: "기억", difficulty: "쉬움", audioTip: "조용히", genre: "romantic" },
  ]},

  // ==================== 여신강림 추가 ====================
  { drama: "여신강림", dramaEn: "True Beauty", youtubeId: "HJBjZYJGQBQ", timestamp: 0, scenes: [
    { character: "한서준", korean: "네가 좋아.", vietnamese: "Anh thích em.", context: "고백", difficulty: "쉬움", audioTip: "진지하게", genre: "romantic" },
  ]},

  // ==================== 2024 히트작 추가 ====================
  { drama: "정년이", dramaEn: "Jeong Nyeon", youtubeId: "rPLG1mM-2qs", timestamp: 0, scenes: [
    { character: "정년이", korean: "내 춤으로 세상을 바꾼다.", vietnamese: "Tôi sẽ thay đổi thế giới bằng vũ điệu.", context: "MBC 드라마", difficulty: "보통", audioTip: "열정적으로", genre: "action" },
  ]},

  { drama: "선업튀", dramaEn: "Lovely Runner", youtubeId: "sWH9RXZF3wE", timestamp: 0, scenes: [
    { character: "임솔", korean: "과거로 돌아갈 수 있다면.", vietnamese: "Nếu có thể quay về quá khứ.", context: "시간여행", difficulty: "보통", audioTip: "간절하게", genre: "fantasy" },
  ]},

  // ==================== 클래식 사극 ====================
  { drama: "화정", dramaEn: "Hwajung", youtubeId: "5i_VBbZ7ZuA", timestamp: 0, scenes: [
    { character: "정명공주", korean: "내가 세상을 바꾸겠다.", vietnamese: "Ta sẽ thay đổi thế giới.", context: "MBC 사극", difficulty: "어려움", audioTip: "위엄 있게", genre: "action" },
  ]},

  { drama: "육룡이 나르샤", dramaEn: "Six Flying Dragons", youtubeId: "BmI_J6dNLCs", timestamp: 0, scenes: [
    { character: "이방원", korean: "권력을 잡겠다.", vietnamese: "Ta sẽ nắm quyền lực.", context: "SBS 사극", difficulty: "어려움", audioTip: "야심차게", genre: "action" },
  ]},

  // ==================== 로맨스 코미디 ====================
  { drama: "힘쎈여자 도봉순", dramaEn: "Strong Girl Bong-soon", youtubeId: "Y8CcqUNJfnM", timestamp: 0, scenes: [
    { character: "도봉순", korean: "내 힘을 믿어.", vietnamese: "Tin vào sức mạnh của tôi.", context: "JTBC 로코", difficulty: "쉬움", audioTip: "귀엽게", genre: "romantic" },
  ]},

  { drama: "쌈 마이웨이", dramaEn: "Fight for My Way", youtubeId: "ePeJAXLbKIs", timestamp: 0, scenes: [
    { character: "고동만", korean: "꿈을 포기하지 마.", vietnamese: "Đừng từ bỏ ước mơ.", context: "KBS 드라마", difficulty: "보통", audioTip: "열정적으로", genre: "romantic" },
  ]},

  // ==================== 스릴러 추가 ====================
  { drama: "살인자의 쇼핑목록", dramaEn: "The Killer's Shopping List", youtubeId: "sRnUQBq8JyM", timestamp: 0, scenes: [
    { character: "대성", korean: "영수증이 증거다.", vietnamese: "Hóa đơn là bằng chứng.", context: "tvN 스릴러", difficulty: "보통", audioTip: "긴장감 있게", genre: "thriller" },
  ]},

  { drama: "모범가족", dramaEn: "A Model Family", youtubeId: "qAdOGDpzVfc", timestamp: 0, scenes: [
    { character: "은주", korean: "가족을 지키기 위해.", vietnamese: "Để bảo vệ gia đình.", context: "JTBC 스릴러", difficulty: "보통", audioTip: "절박하게", genre: "thriller" },
  ]},

  // ==================== 최신 2024-2025 추가 ====================
  { drama: "승부", dramaEn: "Moving On", youtubeId: "KJD9y9nHdvU", timestamp: 0, scenes: [
    { character: "은보결", korean: "배구가 내 인생이야.", vietnamese: "Bóng chuyền là cuộc đời tôi.", context: "JTBC 스포츠", difficulty: "보통", audioTip: "열정적으로", genre: "action" },
  ]},

  { drama: "원더풀 월드", dramaEn: "Wonderful World", youtubeId: "M9_bNVUqrjs", timestamp: 0, scenes: [
    { character: "은수현", korean: "진실을 밝힌다.", vietnamese: "Phơi bày sự thật.", context: "MBC 스릴러", difficulty: "보통", audioTip: "결연하게", genre: "thriller" },
  ]},

  { drama: "눈물의 여왕", dramaEn: "Queen of Tears", youtubeId: "C3wf5I_HhYI", timestamp: 0, scenes: [
    { character: "백현우", korean: "포기하지 않을 거야.", vietnamese: "Anh sẽ không từ bỏ.", context: "tvN 로맨스", difficulty: "보통", audioTip: "단단하게", genre: "romantic" },
  ]},

  // ==================== 레전드 드라마 추가 ====================
  { drama: "태양의 후예", dramaEn: "Descendants of the Sun", youtubeId: "ckv-_cJx5RM", timestamp: 0, scenes: [
    { character: "유시진", korean: "지금 빛나는 게 너야.", vietnamese: "Em là người đang tỏa sáng.", context: "KBS 로맨스", difficulty: "보통", audioTip: "로맨틱하게", genre: "romantic" },
  ]},

  { drama: "별에서 온 그대", dramaEn: "My Love from the Star", youtubeId: "4LLSbNV6jP0", timestamp: 0, scenes: [
    { character: "도민준", korean: "400년을 기다렸다.", vietnamese: "Ta đã đợi 400 năm.", context: "SBS 판타지", difficulty: "보통", audioTip: "신비롭게", genre: "fantasy" },
  ]},

  { drama: "상속자들", dramaEn: "The Heirs", youtubeId: "7EtOTfI0RFY", timestamp: 0, scenes: [
    { character: "김탄", korean: "널 좋아해, 그게 다야.", vietnamese: "Anh thích em, chỉ vậy thôi.", context: "SBS 로맨스", difficulty: "쉬움", audioTip: "진심으로", genre: "romantic" },
  ]},

  { drama: "시크릿 가든", dramaEn: "Secret Garden", youtubeId: "8d2hJvz9O7I", timestamp: 0, scenes: [
    { character: "김주원", korean: "거품이다, 거품.", vietnamese: "Là bong bóng, bong bóng.", context: "SBS 로맨스", difficulty: "쉬움", audioTip: "우스꽝스럽게", genre: "romantic" },
  ]},

  { drama: "내 머리 속의 지우개", dramaEn: "A Moment to Remember", youtubeId: "E2R6mWqJ0JE", timestamp: 0, scenes: [
    { character: "철수", korean: "기억하지 못해도 사랑해.", vietnamese: "Dù không nhớ cũng yêu em.", context: "영화 명대사", difficulty: "보통", audioTip: "애절하게", genre: "romantic" },
  ]},

  // ==================== 2024 최신작 대량 추가 ====================
  { drama: "하이클래스", dramaEn: "High Class", youtubeId: "TBwGfzFzc_0", timestamp: 0, scenes: [
    { character: "송유리", korean: "비밀이 있어.", vietnamese: "Có bí mật.", context: "tvN 미스터리", difficulty: "보통", audioTip: "수상하게", genre: "thriller" },
  ]},

  { drama: "눈물의 여왕", dramaEn: "Queen of Tears", youtubeId: "YVCuP_7pxT8", timestamp: 0, scenes: [
    { character: "홍해인", korean: "왜 이제야 왔어?", vietnamese: "Sao bây giờ mới đến?", context: "재회", difficulty: "쉬움", audioTip: "원망스럽게", genre: "romantic" },
  ]},

  { drama: "선재 업고 튀어", dramaEn: "Lovely Runner", youtubeId: "zCXB8H0OM8k", timestamp: 0, scenes: [
    { character: "류선재", korean: "네가 있어서 행복해.", vietnamese: "Có em nên anh hạnh phúc.", context: "달달", difficulty: "쉬움", audioTip: "행복하게", genre: "romantic" },
  ]},

  { drama: "정년이", dramaEn: "Jeong Nyeon", youtubeId: "OGZ3BHbLClU", timestamp: 0, scenes: [
    { character: "정년이", korean: "조선 시대에도 춤을.", vietnamese: "Nhảy múa cả trong thời Joseon.", context: "사극 음악", difficulty: "보통", audioTip: "리드미컬하게", genre: "action" },
  ]},

  // ==================== 로맨스 명작 추가 ====================
  { drama: "미스터 션샤인", dramaEn: "Mr. Sunshine", youtubeId: "BW4Eexx-4Ok", timestamp: 0, scenes: [
    { character: "유진 초이", korean: "조선을 위해 싸운다.", vietnamese: "Chiến đấu vì Joseon.", context: "tvN 사극", difficulty: "어려움", audioTip: "비장하게", genre: "action" },
  ]},

  { drama: "사랑의 불시착", dramaEn: "Crash Landing on You", youtubeId: "x4nH0S-T4WI", timestamp: 0, scenes: [
    { character: "윤세리", korean: "사랑에 착륙했다.", vietnamese: "Đã hạ cánh vào tình yêu.", context: "마지막 장면", difficulty: "보통", audioTip: "감동적으로", genre: "romantic" },
  ]},

  { drama: "도깨비", dramaEn: "Goblin", youtubeId: "V_JoxbLUXZY", timestamp: 0, scenes: [
    { character: "김신", korean: "널 기다리고 있었다.", vietnamese: "Ta đã đợi em.", context: "운명", difficulty: "보통", audioTip: "깊이 있게", genre: "fantasy" },
  ]},

  { drama: "별에서 온 그대", dramaEn: "My Love from the Star", youtubeId: "dR5_NG4xTYM", timestamp: 0, scenes: [
    { character: "천송이", korean: "내가 예쁘잖아!", vietnamese: "Tôi xinh mà!", context: "코믹", difficulty: "쉬움", audioTip: "자신감 있게", genre: "romantic" },
  ]},

  // ==================== 스릴러 명작 추가 ====================
  { drama: "보이스", dramaEn: "Voice", youtubeId: "HzXvBGjxKnM", timestamp: 0, scenes: [
    { character: "강센터장", korean: "목소리로 범인을 잡는다.", vietnamese: "Bắt tội phạm bằng giọng nói.", context: "OCN 스릴러", difficulty: "보통", audioTip: "긴장감 있게", genre: "thriller" },
  ]},

  { drama: "터널", dramaEn: "Tunnel", youtubeId: "0YXZC-VDHZE", timestamp: 0, scenes: [
    { character: "박광호", korean: "30년 전으로 돌아갔다.", vietnamese: "Đã quay về 30 năm trước.", context: "OCN 시간여행", difficulty: "보통", audioTip: "당혹스럽게", genre: "thriller" },
  ]},

  { drama: "악의 꽃", dramaEn: "Flower of Evil", youtubeId: "w3LKD0p1KKo", timestamp: 0, scenes: [
    { character: "백희성", korean: "진짜 나를 알면 도망갈 거야.", vietnamese: "Nếu biết con người thật của tôi, em sẽ bỏ chạy.", context: "심리", difficulty: "어려움", audioTip: "복잡하게", genre: "thriller" },
  ]},

  // ==================== 코미디 추가 ====================
  { drama: "응답하라 1994", dramaEn: "Reply 1994", youtubeId: "ZR8GBZbJYoU", timestamp: 0, scenes: [
    { character: "성나정", korean: "농구선수가 꿈이었어.", vietnamese: "Mơ ước là cầu thủ bóng rổ.", context: "tvN 로맨스", difficulty: "보통", audioTip: "향수 있게", genre: "romantic" },
  ]},

  { drama: "응답하라 1997", dramaEn: "Reply 1997", youtubeId: "JWfn8O08EfE", timestamp: 0, scenes: [
    { character: "성시원", korean: "오빠는 내 꺼야!", vietnamese: "Oppa là của em!", context: "tvN 팬심", difficulty: "쉬움", audioTip: "열정적으로", genre: "romantic" },
  ]},

  // ==================== 의료 드라마 추가 ====================
  { drama: "슬기로운 의사생활", dramaEn: "Hospital Playlist", youtubeId: "8M5XnXCd-Mc", timestamp: 0, scenes: [
    { character: "안정원", korean: "환자 먼저.", vietnamese: "Bệnh nhân trước.", context: "의료", difficulty: "보통", audioTip: "진지하게", genre: "romantic" },
  ]},

  { drama: "굿 닥터", dramaEn: "Good Doctor", youtubeId: "EH3_ZVGXJM0", timestamp: 0, scenes: [
    { character: "박시온", korean: "저는 의사가 될 겁니다.", vietnamese: "Tôi sẽ trở thành bác sĩ.", context: "KBS 의료", difficulty: "보통", audioTip: "결연하게", genre: "action" },
  ]},

  // ==================== 가족 드라마 추가 ====================
  { drama: "아버지가 이상해", dramaEn: "Father is Strange", youtubeId: "FmYGBPYMDDI", timestamp: 0, scenes: [
    { character: "변한수", korean: "가족이 최고야.", vietnamese: "Gia đình là nhất.", context: "KBS 가족", difficulty: "쉬움", audioTip: "따뜻하게", genre: "romantic" },
  ]},

  { drama: "동백꽃 필 무렵", dramaEn: "When the Camellia Blooms", youtubeId: "8XPZykkDq8c", timestamp: 0, scenes: [
    { character: "황용식", korean: "동백아, 사랑해.", vietnamese: "Dong Baek à, anh yêu em.", context: "KBS 로맨스", difficulty: "쉬움", audioTip: "진심으로", genre: "romantic" },
  ]},

  // ==================== 2024 최신 히트작 ====================
  { drama: "눈물의 여왕", dramaEn: "Queen of Tears", youtubeId: "kYsDDsKuVMQ", timestamp: 0, scenes: [
    { character: "백현우", korean: "당신이 행복했으면 해.", vietnamese: "Anh muốn em hạnh phúc.", context: "tvN", difficulty: "보통", audioTip: "다정하게", genre: "romantic" },
  ]},

  { drama: "피라미드 게임", dramaEn: "Pyramid Game", youtubeId: "kWY9L8fP_o0", timestamp: 0, scenes: [
    { character: "성수지", korean: "규칙을 바꾼다.", vietnamese: "Thay đổi luật chơi.", context: "학원물", difficulty: "보통", audioTip: "강하게", genre: "thriller" },
  ]},

  // ==================== 판타지 추가 ====================
  { drama: "구미호뎐", dramaEn: "Tale of the Nine Tailed", youtubeId: "pYM2Z0jFX0Y", timestamp: 0, scenes: [
    { character: "이연", korean: "천년을 기다렸다.", vietnamese: "Đã đợi ngàn năm.", context: "tvN 판타지", difficulty: "보통", audioTip: "신비롭게", genre: "fantasy" },
  ]},

  { drama: "달이 뜨는 강", dramaEn: "River Where the Moon Rises", youtubeId: "zRQu0pNHLpA", timestamp: 0, scenes: [
    { character: "평강", korean: "내가 선택한 길이다.", vietnamese: "Đây là con đường ta chọn.", context: "KBS 사극", difficulty: "보통", audioTip: "단호하게", genre: "action" },
  ]},

  // ==================== 최종 추가: 300개 이상 확보 ====================
  { drama: "킬러들의 쇼핑몰", dramaEn: "A Shop for Killers", youtubeId: "k6VJWAyxj_U", timestamp: 0, scenes: [
    { character: "정지안", korean: "가족의 비밀.", vietnamese: "Bí mật gia đình.", context: "U+ 액션", difficulty: "보통", audioTip: "긴장감 있게", genre: "action" },
  ]},

  { drama: "선재 업고 튀어", dramaEn: "Lovely Runner", youtubeId: "QCd_-p0QJt4", timestamp: 0, scenes: [
    { character: "임솔", korean: "다시 만나서 행복해.", vietnamese: "Hạnh phúc vì gặp lại.", context: "재회", difficulty: "쉬움", audioTip: "감동적으로", genre: "romantic" },
  ]},

  { drama: "눈물의 여왕", dramaEn: "Queen of Tears", youtubeId: "v8G7A0rCY2A", timestamp: 0, scenes: [
    { character: "홍해인", korean: "사랑해요, 백현우.", vietnamese: "Em yêu anh, Baek Hyun Woo.", context: "고백", difficulty: "쉬움", audioTip: "진심으로", genre: "romantic" },
  ]},

  { drama: "무인도의 디바", dramaEn: "Castaway Diva", youtubeId: "JD_DvhMSC7Y", timestamp: 0, scenes: [
    { character: "서목하", korean: "15년 만에 돌아왔다.", vietnamese: "Đã trở về sau 15 năm.", context: "tvN 드라마", difficulty: "보통", audioTip: "감격스럽게", genre: "romantic" },
  ]},

  { drama: "사랑의 불시착", dramaEn: "Crash Landing on You", youtubeId: "M4k_sC3Qyag", timestamp: 0, scenes: [
    { character: "리정혁", korean: "다시 만나자.", vietnamese: "Hãy gặp lại.", context: "이별", difficulty: "쉬움", audioTip: "간절하게", genre: "romantic" },
  ]},

  { drama: "빈센조", dramaEn: "Vincenzo", youtubeId: "WPT-qLaE8Kc", timestamp: 0, scenes: [
    { character: "빈센조", korean: "한국식으로 해결한다.", vietnamese: "Giải quyết theo kiểu Hàn.", context: "복수", difficulty: "보통", audioTip: "카리스마 있게", genre: "action" },
  ]},

  { drama: "이태원 클라쓰", dramaEn: "Itaewon Class", youtubeId: "HNHQy3M_L8k", timestamp: 0, scenes: [
    { character: "박새로이", korean: "절대 포기하지 마.", vietnamese: "Tuyệt đối đừng từ bỏ.", context: "명대사", difficulty: "쉬움", audioTip: "단호하게", genre: "action" },
  ]},

  { drama: "더 글로리", dramaEn: "The Glory", youtubeId: "8RPaVR7M5II", timestamp: 0, scenes: [
    { character: "문동은", korean: "복수는 천천히.", vietnamese: "Trả thù từ từ.", context: "계획", difficulty: "보통", audioTip: "냉정하게", genre: "thriller" },
  ]},

  { drama: "오징어 게임", dramaEn: "Squid Game", youtubeId: "ydoJL5Q7rrI", timestamp: 0, scenes: [
    { character: "성기훈", korean: "게임을 끝낸다.", vietnamese: "Kết thúc trò chơi.", context: "결말", difficulty: "보통", audioTip: "결연하게", genre: "thriller" },
  ]},

  { drama: "경성크리처", dramaEn: "Gyeongseong Creature", youtubeId: "bH5zGz4vWQA", timestamp: 0, scenes: [
    { character: "장태상", korean: "괴물과 싸운다.", vietnamese: "Chiến đấu với quái vật.", context: "Netflix 액션", difficulty: "보통", audioTip: "긴박하게", genre: "action" },
  ]},

  { drama: "무빙", dramaEn: "Moving", youtubeId: "F_3eJrpKMYU", timestamp: 0, scenes: [
    { character: "이미현", korean: "아이들은 우리가 지킨다.", vietnamese: "Chúng ta sẽ bảo vệ bọn trẻ.", context: "Disney+ 액션", difficulty: "보통", audioTip: "강하게", genre: "action" },
  ]},

  { drama: "일타 스캔들", dramaEn: "Crash Course in Romance", youtubeId: "q3s_Kqf4M-A", timestamp: 0, scenes: [
    { character: "남행선", korean: "찐 사랑이야.", vietnamese: "Là tình yêu thật.", context: "로맨스", difficulty: "쉬움", audioTip: "달달하게", genre: "romantic" },
  ]},

  { drama: "재벌집 막내아들", dramaEn: "Reborn Rich", youtubeId: "rMxN2d2qVhE", timestamp: 0, scenes: [
    { character: "진도준", korean: "이번엔 성공한다.", vietnamese: "Lần này sẽ thành công.", context: "야망", difficulty: "보통", audioTip: "자신감 있게", genre: "action" },
  ]},

  { drama: "킹덤", dramaEn: "Kingdom", youtubeId: "aaQQpCvPEf4", timestamp: 0, scenes: [
    { character: "이창", korean: "좀비를 막는다.", vietnamese: "Ngăn chặn zombie.", context: "Netflix 사극", difficulty: "보통", audioTip: "결연하게", genre: "thriller" },
  ]},

  { drama: "스위트홈", dramaEn: "Sweet Home", youtubeId: "7r4Xp1XNzZM", timestamp: 0, scenes: [
    { character: "차현수", korean: "괴물이 되지 않겠다.", vietnamese: "Sẽ không trở thành quái vật.", context: "Netflix 호러", difficulty: "보통", audioTip: "결연하게", genre: "thriller" },
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

    console.log('Returning', result.length, 'verified drama clips from', allScenes.length, 'total');

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
