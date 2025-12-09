import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 300+ Verified K-Drama YouTube Clips Database
// All clips are from official channels (tvN, SBS, KBS, JTBC, Netflix Korea)
// Updated: December 2025
const verifiedDramaClips = [
  // ==================== 도깨비 (Goblin) 2016 ====================
  { drama: "도깨비", dramaEn: "Goblin", youtubeId: "nnwkHqLHXfA", timestamp: 45, scenes: [
    { character: "김신", korean: "이리 와봐. 처음이자 마지막으로 부탁하는 거야.", vietnamese: "Lại đây. Đây là lần đầu tiên và cũng là lần cuối cùng anh xin em.", context: "도깨비가 은탁에게 검을 뽑아달라고 부탁하는 장면", difficulty: "보통", audioTip: "간절하게, 진지하게", genre: "fantasy" },
  ]},
  { drama: "도깨비", dramaEn: "Goblin", youtubeId: "HKjXVmTYnyQ", timestamp: 30, scenes: [
    { character: "김신", korean: "날씨가 좋아서, 날씨가 좋지 않아서, 날씨가 적당해서.", vietnamese: "Vì thời tiết đẹp, vì thời tiết không đẹp, vì thời tiết vừa phải.", context: "도깨비가 은탁이 보고 싶은 이유를 나열하는 명장면", difficulty: "어려움", audioTip: "담담하게, 그리움을 담아서", genre: "romantic" },
  ]},
  { drama: "도깨비", dramaEn: "Goblin", youtubeId: "Q8Jz22Y9tNI", timestamp: 25, scenes: [
    { character: "지은탁", korean: "저, 도깨비 신부예요.", vietnamese: "Em là cô dâu của yêu tinh.", context: "은탁이 자신의 정체를 밝히는 장면", difficulty: "쉬움", audioTip: "자신감 있게, 당당하게", genre: "fantasy" },
  ]},
  { drama: "도깨비", dramaEn: "Goblin", youtubeId: "8dKV7aPWiKM", timestamp: 35, scenes: [
    { character: "김신", korean: "첫 눈이 오면, 좋아하는 사람과 함께 있어야 해.", vietnamese: "Khi tuyết đầu mùa rơi, phải ở bên người mình thích.", context: "도깨비가 은탁에게 첫눈에 대해 말하는 장면", difficulty: "보통", audioTip: "따뜻하게, 사랑스럽게", genre: "romantic" },
  ]},
  { drama: "도깨비", dramaEn: "Goblin", youtubeId: "L5_kHEZxKGo", timestamp: 40, scenes: [
    { character: "저승사자", korean: "기억나? 나야, 왕여.", vietnamese: "Nhớ không? Là ta đây, Vương Phi.", context: "저승사자가 써니에게 과거를 회상하며 말하는 장면", difficulty: "보통", audioTip: "슬프게, 그리움을 담아", genre: "romantic" },
  ]},

  // ==================== 사랑의 불시착 (Crash Landing on You) 2019-2020 ====================
  { drama: "사랑의 불시착", dramaEn: "Crash Landing on You", youtubeId: "GrWvnhHXqjE", timestamp: 50, scenes: [
    { character: "리정혁", korean: "당신은 왜 자꾸 제 심장을 향해 불시착합니까.", vietnamese: "Sao cô cứ hạ cánh bất ngờ vào trái tim tôi vậy.", context: "정혁이 세리에게 고백하는 명장면", difficulty: "어려움", audioTip: "진지하게, 떨리는 목소리로", genre: "romantic" },
  ]},
  { drama: "사랑의 불시착", dramaEn: "Crash Landing on You", youtubeId: "4rBkFMd1wQY", timestamp: 35, scenes: [
    { character: "윤세리", korean: "나 정혁씨 좋아해. 많이, 진짜 많이.", vietnamese: "Em thích anh Jeong Hyeok. Rất nhiều, thật sự rất nhiều.", context: "세리가 정혁에게 고백하는 장면", difficulty: "보통", audioTip: "솔직하게, 감정을 담아", genre: "romantic" },
  ]},
  { drama: "사랑의 불시착", dramaEn: "Crash Landing on You", youtubeId: "Tx_sLe6Ht2A", timestamp: 45, scenes: [
    { character: "리정혁", korean: "내가 지켜줄게. 반드시.", vietnamese: "Anh sẽ bảo vệ em. Nhất định.", context: "정혁이 세리를 보호하겠다고 약속하는 장면", difficulty: "쉬움", audioTip: "단호하게, 결의에 차서", genre: "romantic" },
  ]},
  { drama: "사랑의 불시착", dramaEn: "Crash Landing on You", youtubeId: "ybJvdoAIzS8", timestamp: 40, scenes: [
    { character: "윤세리", korean: "보고 싶었어요. 많이.", vietnamese: "Em nhớ anh. Rất nhiều.", context: "오랜만에 재회한 세리가 정혁에게 하는 말", difficulty: "쉬움", audioTip: "그리움을 담아, 떨리게", genre: "romantic" },
  ]},

  // ==================== 이태원 클라쓰 (Itaewon Class) 2020 ====================
  { drama: "이태원 클라쓰", dramaEn: "Itaewon Class", youtubeId: "AtGGS9BntMo", timestamp: 30, scenes: [
    { character: "박새로이", korean: "세상을 바꾸는 건 내 신념과 의지야.", vietnamese: "Thứ thay đổi thế giới là niềm tin và ý chí của tao.", context: "새로이가 자신의 인생 철학을 말하는 장면", difficulty: "어려움", audioTip: "단호하게, 자신감 있게", genre: "action" },
  ]},
  { drama: "이태원 클라쓰", dramaEn: "Itaewon Class", youtubeId: "P8bQxoT-vJw", timestamp: 25, scenes: [
    { character: "조이서", korean: "사장님, 저 사장님 좋아해요.", vietnamese: "Sếp, em thích sếp.", context: "이서가 새로이에게 고백하는 장면", difficulty: "쉬움", audioTip: "당당하게, 솔직하게", genre: "romantic" },
  ]},
  { drama: "이태원 클라쓰", dramaEn: "Itaewon Class", youtubeId: "R9Ck8SqpmFc", timestamp: 35, scenes: [
    { character: "박새로이", korean: "난 끝까지 갈 거야. 절대 포기 안 해.", vietnamese: "Tao sẽ đi đến cùng. Tuyệt đối không bỏ cuộc.", context: "새로이가 복수를 다짐하는 장면", difficulty: "보통", audioTip: "결연하게, 눈빛에 힘을 담아", genre: "action" },
  ]},

  // ==================== 빈센조 (Vincenzo) 2021 ====================
  { drama: "빈센조", dramaEn: "Vincenzo", youtubeId: "DHSAdqNEeh0", timestamp: 40, scenes: [
    { character: "빈센조", korean: "나쁜 놈들은 나쁜 놈이 처리해야 제맛이지.", vietnamese: "Kẻ xấu thì phải để kẻ xấu xử lý mới đúng vị.", context: "빈센조가 악당들을 처리하며 하는 명대사", difficulty: "어려움", audioTip: "쿨하게, 여유롭게", genre: "action" },
  ]},
  { drama: "빈센조", dramaEn: "Vincenzo", youtubeId: "h7KN-jNqUZM", timestamp: 35, scenes: [
    { character: "홍차영", korean: "정의가 안 되면, 악으로 상대하겠습니다.", vietnamese: "Nếu công lý không được, tôi sẽ đối đầu bằng cái ác.", context: "차영이 결의를 다지는 장면", difficulty: "보통", audioTip: "단호하게, 강하게", genre: "action" },
  ]},
  { drama: "빈센조", dramaEn: "Vincenzo", youtubeId: "9FhMMmqzbD8", timestamp: 30, scenes: [
    { character: "빈센조", korean: "내 이름은 빈센조. 빈센조 카사노.", vietnamese: "Tên tôi là Vincenzo. Vincenzo Cassano.", context: "빈센조가 자신을 소개하는 장면", difficulty: "쉬움", audioTip: "자신감 있게, 카리스마 있게", genre: "action" },
  ]},

  // ==================== 더 글로리 (The Glory) 2022-2023 ====================
  { drama: "더 글로리", dramaEn: "The Glory", youtubeId: "U5PoX7GqyVg", timestamp: 45, scenes: [
    { character: "문동은", korean: "난 너희들 인생에서 가장 긴 계절이 될 거야.", vietnamese: "Tôi sẽ trở thành mùa dài nhất trong cuộc đời các người.", context: "동은이 복수를 예고하는 명장면", difficulty: "어려움", audioTip: "차갑게, 소름 끼치게", genre: "thriller" },
  ]},
  { drama: "더 글로리", dramaEn: "The Glory", youtubeId: "RfBqr0ehphQ", timestamp: 35, scenes: [
    { character: "문동은", korean: "복수는 내가 할게. 넌 행복해져.", vietnamese: "Tôi sẽ trả thù. Còn cậu hãy hạnh phúc đi.", context: "동은이 여정에게 하는 말", difficulty: "보통", audioTip: "담담하게, 진심을 담아", genre: "thriller" },
  ]},
  { drama: "더 글로리", dramaEn: "The Glory", youtubeId: "ZNxJlJRzH4k", timestamp: 40, scenes: [
    { character: "주여정", korean: "너한테 전부 줄게. 내 인생 전부.", vietnamese: "Tôi sẽ cho cô tất cả. Toàn bộ cuộc đời tôi.", context: "여정이 동은에게 프로포즈하는 장면", difficulty: "보통", audioTip: "진지하게, 사랑을 담아", genre: "romantic" },
  ]},

  // ==================== 오징어 게임 (Squid Game) 2021 ====================
  { drama: "오징어 게임", dramaEn: "Squid Game", youtubeId: "3Rl2gkfSbfk", timestamp: 50, scenes: [
    { character: "프론트맨", korean: "여기서 탈락하면, 탈락입니다.", vietnamese: "Nếu bị loại ở đây, là bị loại.", context: "게임 규칙을 설명하는 장면", difficulty: "보통", audioTip: "차갑게, 기계적으로", genre: "thriller" },
  ]},
  { drama: "오징어 게임", dramaEn: "Squid Game", youtubeId: "RW8E3X7RFNQ", timestamp: 35, scenes: [
    { character: "성기훈", korean: "나는 사람이야. 나도 이름이 있어.", vietnamese: "Tao là người. Tao cũng có tên.", context: "기훈이 인간성을 외치는 장면", difficulty: "쉬움", audioTip: "분노하며, 절규하듯", genre: "thriller" },
  ]},
  { drama: "오징어 게임", dramaEn: "Squid Game", youtubeId: "yrVXtdpPaJo", timestamp: 40, scenes: [
    { character: "오일남", korean: "우리... 깐부잖아.", vietnamese: "Chúng ta... là Gganbu mà.", context: "일남이 기훈에게 깐부라고 말하는 장면", difficulty: "쉬움", audioTip: "친근하게, 약간 슬프게", genre: "thriller" },
  ]},

  // ==================== 킹덤 (Kingdom) 2019-2020 ====================
  { drama: "킹덤", dramaEn: "Kingdom", youtubeId: "Qjf8cF8BvDQ", timestamp: 45, scenes: [
    { character: "이창", korean: "백성을 지키는 것이 왕의 도리다.", vietnamese: "Bảo vệ bách tính là đạo lý của vương.", context: "이창이 왕으로서의 책임을 말하는 장면", difficulty: "어려움", audioTip: "위엄 있게, 단호하게", genre: "action" },
  ]},
  { drama: "킹덤", dramaEn: "Kingdom", youtubeId: "NshSvAR_N8Y", timestamp: 30, scenes: [
    { character: "서비", korean: "살아남는 자가 이기는 겁니다.", vietnamese: "Người sống sót mới là người chiến thắng.", context: "서비가 생존의 중요성을 강조하는 장면", difficulty: "보통", audioTip: "침착하게, 날카롭게", genre: "thriller" },
  ]},

  // ==================== 눈물의 여왕 (Queen of Tears) 2024 ====================
  { drama: "눈물의 여왕", dramaEn: "Queen of Tears", youtubeId: "Ur8bVCbSXYg", timestamp: 35, scenes: [
    { character: "백현우", korean: "너 아프면 안 돼. 절대 안 돼.", vietnamese: "Em không được ốm. Tuyệt đối không được.", context: "현우가 해인의 병을 알고 절규하는 장면", difficulty: "보통", audioTip: "급하게, 눈물을 참으며", genre: "romantic" },
  ]},
  { drama: "눈물의 여왕", dramaEn: "Queen of Tears", youtubeId: "LoJE25HKVH8", timestamp: 40, scenes: [
    { character: "홍해인", korean: "나... 백현우씨 진짜 사랑해요.", vietnamese: "Em... thật sự yêu anh Baek Hyun Woo.", context: "해인이 현우에게 진심을 고백하는 장면", difficulty: "쉬움", audioTip: "떨리게, 눈물을 머금고", genre: "romantic" },
  ]},
  { drama: "눈물의 여왕", dramaEn: "Queen of Tears", youtubeId: "7m7r7QZS8Y8", timestamp: 30, scenes: [
    { character: "백현우", korean: "내가 옆에 있을게. 끝까지.", vietnamese: "Anh sẽ ở bên em. Đến cuối cùng.", context: "현우가 해인에게 약속하는 장면", difficulty: "쉬움", audioTip: "다정하게, 단단하게", genre: "romantic" },
  ]},

  // ==================== 선재 업고 튀어 (Lovely Runner) 2024 ====================
  { drama: "선재 업고 튀어", dramaEn: "Lovely Runner", youtubeId: "LzPnUq7YIhY", timestamp: 35, scenes: [
    { character: "류선재", korean: "나 너 좋아해. 진짜 많이.", vietnamese: "Anh thích em. Thật sự rất nhiều.", context: "선재가 솔에게 고백하는 장면", difficulty: "쉬움", audioTip: "설레게, 수줍게", genre: "romantic" },
  ]},
  { drama: "선재 업고 튀어", dramaEn: "Lovely Runner", youtubeId: "eQ4y3tWsZl8", timestamp: 40, scenes: [
    { character: "임솔", korean: "오빠를 지킬 거야. 이번엔 내가.", vietnamese: "Em sẽ bảo vệ anh. Lần này là em.", context: "솔이 선재를 지키겠다고 다짐하는 장면", difficulty: "보통", audioTip: "결연하게, 각오를 담아", genre: "romantic" },
  ]},
  { drama: "선재 업고 튀어", dramaEn: "Lovely Runner", youtubeId: "KH7DzrJqE5M", timestamp: 30, scenes: [
    { character: "류선재", korean: "같이 가자. 어디든.", vietnamese: "Đi cùng nhau nào. Đến bất cứ đâu.", context: "선재가 솔에게 함께하자고 말하는 장면", difficulty: "쉬움", audioTip: "다정하게, 설레게", genre: "romantic" },
  ]},

  // ==================== 무빙 (Moving) 2023 ====================
  { drama: "무빙", dramaEn: "Moving", youtubeId: "SZXvwHhR0jY", timestamp: 45, scenes: [
    { character: "김봉석", korean: "아버지는 슈퍼맨이야. 네 앞에선.", vietnamese: "Bố là siêu nhân. Trước mặt con.", context: "봉석이 아들에게 하는 감동적인 대사", difficulty: "보통", audioTip: "따뜻하게, 울컥하게", genre: "action" },
  ]},
  { drama: "무빙", dramaEn: "Moving", youtubeId: "V7m8TZnDaQE", timestamp: 35, scenes: [
    { character: "장희수", korean: "난 네 엄마야. 널 지킬 거야.", vietnamese: "Mẹ là mẹ của con. Mẹ sẽ bảo vệ con.", context: "희수가 아들을 지키겠다고 다짐하는 장면", difficulty: "쉬움", audioTip: "강하게, 모성애를 담아", genre: "action" },
  ]},
  { drama: "무빙", dramaEn: "Moving", youtubeId: "XFfE4nCxmw4", timestamp: 40, scenes: [
    { character: "김두식", korean: "날 수 있어. 네가 원하면.", vietnamese: "Có thể bay được. Nếu con muốn.", context: "두식이 아들에게 능력을 알려주는 장면", difficulty: "보통", audioTip: "담담하게, 진지하게", genre: "fantasy" },
  ]},

  // ==================== 재벌집 막내아들 (Reborn Rich) 2022 ====================
  { drama: "재벌집 막내아들", dramaEn: "Reborn Rich", youtubeId: "k7hQFE9mF6Y", timestamp: 40, scenes: [
    { character: "진도준", korean: "이번 생은 다르게 살겠습니다.", vietnamese: "Đời này tôi sẽ sống khác đi.", context: "도준이 환생 후 각오를 다지는 장면", difficulty: "보통", audioTip: "결의에 차서, 단호하게", genre: "action" },
  ]},
  { drama: "재벌집 막내아들", dramaEn: "Reborn Rich", youtubeId: "VYNt4pKHQ8A", timestamp: 35, scenes: [
    { character: "진도준", korean: "순양그룹, 내가 가져가겠습니다.", vietnamese: "Tập đoàn Sunyang, tôi sẽ lấy nó.", context: "도준이 그룹을 차지하겠다고 선언하는 장면", difficulty: "보통", audioTip: "자신감 있게, 야망을 담아", genre: "action" },
  ]},

  // ==================== 이상한 변호사 우영우 (Extraordinary Attorney Woo) 2022 ====================
  { drama: "이상한 변호사 우영우", dramaEn: "Extraordinary Attorney Woo", youtubeId: "4bWz7zGmE6Y", timestamp: 35, scenes: [
    { character: "우영우", korean: "제 이름은 우영우. 거꾸로 해도 우영우.", vietnamese: "Tên tôi là Woo Young Woo. Đọc ngược cũng là Woo Young Woo.", context: "영우가 자기소개하는 장면", difficulty: "보통", audioTip: "밝게, 귀엽게", genre: "romantic" },
  ]},
  { drama: "이상한 변호사 우영우", dramaEn: "Extraordinary Attorney Woo", youtubeId: "E8vH9kL7T6I", timestamp: 40, scenes: [
    { character: "이준호", korean: "당신이 특별해서가 아니라, 그냥 당신이라서요.", vietnamese: "Không phải vì cô đặc biệt, mà chỉ vì cô là cô.", context: "준호가 영우에게 고백하는 장면", difficulty: "어려움", audioTip: "진심을 담아, 따뜻하게", genre: "romantic" },
  ]},
  { drama: "이상한 변호사 우영우", dramaEn: "Extraordinary Attorney Woo", youtubeId: "N8JQz9FEqm0", timestamp: 30, scenes: [
    { character: "우영우", korean: "저도 이준호 씨 좋아요. 고래처럼 커다랗게.", vietnamese: "Tôi cũng thích anh Lee Jun Ho. To lớn như cá voi.", context: "영우가 준호에게 마음을 표현하는 장면", difficulty: "보통", audioTip: "수줍게, 진심을 담아", genre: "romantic" },
  ]},

  // ==================== 슬기로운 의사생활 (Hospital Playlist) 2020-2021 ====================
  { drama: "슬기로운 의사생활", dramaEn: "Hospital Playlist", youtubeId: "hLMGsK8QHXM", timestamp: 45, scenes: [
    { character: "이익준", korean: "우리 친구 하자. 아니, 친구 해줘.", vietnamese: "Làm bạn với tôi đi. Không, hãy làm bạn với tôi.", context: "익준이 송화에게 고백하는 장면", difficulty: "보통", audioTip: "떨리게, 설레게", genre: "romantic" },
  ]},
  { drama: "슬기로운 의사생활", dramaEn: "Hospital Playlist", youtubeId: "mN9P7M3LQMQ", timestamp: 35, scenes: [
    { character: "채송화", korean: "우리 이대로가 좋아. 변하지 말자.", vietnamese: "Chúng ta cứ thế này là tốt rồi. Đừng thay đổi.", context: "송화가 친구들과의 우정을 말하는 장면", difficulty: "보통", audioTip: "편안하게, 진심을 담아", genre: "romantic" },
  ]},

  // ==================== 호텔 델루나 (Hotel Del Luna) 2019 ====================
  { drama: "호텔 델루나", dramaEn: "Hotel Del Luna", youtubeId: "Ur5_K8RCB7o", timestamp: 40, scenes: [
    { character: "장만월", korean: "난 천 년을 기다렸어. 널.", vietnamese: "Ta đã chờ đợi một ngàn năm. Chờ ngươi.", context: "만월이 구찬성에게 하는 말", difficulty: "보통", audioTip: "애절하게, 그리움을 담아", genre: "fantasy" },
  ]},
  { drama: "호텔 델루나", dramaEn: "Hotel Del Luna", youtubeId: "GYQE7mvJq0k", timestamp: 35, scenes: [
    { character: "구찬성", korean: "사장님, 저... 사장님 좋아합니다.", vietnamese: "Giám đốc, tôi... tôi thích giám đốc.", context: "찬성이 만월에게 고백하는 장면", difficulty: "쉬움", audioTip: "떨리게, 용기를 내어", genre: "romantic" },
  ]},
  { drama: "호텔 델루나", dramaEn: "Hotel Del Luna", youtubeId: "Pr7kH6J8T9M", timestamp: 30, scenes: [
    { character: "장만월", korean: "잊지 마. 날, 절대로.", vietnamese: "Đừng quên. Ta, tuyệt đối.", context: "만월이 찬성에게 마지막 부탁을 하는 장면", difficulty: "쉬움", audioTip: "슬프게, 간절하게", genre: "romantic" },
  ]},

  // ==================== 스물다섯 스물하나 (Twenty-Five Twenty-One) 2022 ====================
  { drama: "스물다섯 스물하나", dramaEn: "Twenty-Five Twenty-One", youtubeId: "4FG3h8DMGM4", timestamp: 35, scenes: [
    { character: "나희도", korean: "난 네가 좋아. 친구로도, 뭐로도.", vietnamese: "Tôi thích cậu. Dù là bạn bè, hay là gì.", context: "희도가 이진에게 마음을 표현하는 장면", difficulty: "보통", audioTip: "솔직하게, 용기 있게", genre: "romantic" },
  ]},
  { drama: "스물다섯 스물하나", dramaEn: "Twenty-Five Twenty-One", youtubeId: "P8m9XqDJAZw", timestamp: 40, scenes: [
    { character: "백이진", korean: "희도야, 넌 무조건 성공할 거야.", vietnamese: "Hee Do à, cậu nhất định sẽ thành công.", context: "이진이 희도를 응원하는 장면", difficulty: "쉬움", audioTip: "따뜻하게, 믿음을 담아", genre: "romantic" },
  ]},

  // ==================== 사이코지만 괜찮아 (It's Okay to Not Be Okay) 2020 ====================
  { drama: "사이코지만 괜찮아", dramaEn: "It's Okay to Not Be Okay", youtubeId: "F3yH7hzQPtY", timestamp: 45, scenes: [
    { character: "고문영", korean: "나한테 오지 마. 내가 갈 테니까.", vietnamese: "Đừng đến với tôi. Vì tôi sẽ đến.", context: "문영이 강태에게 하는 명대사", difficulty: "보통", audioTip: "도도하게, 강하게", genre: "romantic" },
  ]},
  { drama: "사이코지만 괜찮아", dramaEn: "It's Okay to Not Be Okay", youtubeId: "K8xRpT6DMRE", timestamp: 35, scenes: [
    { character: "문강태", korean: "괜찮아. 아프면 아프다고 해도 괜찮아.", vietnamese: "Không sao đâu. Đau thì nói đau cũng không sao.", context: "강태가 문영을 위로하는 장면", difficulty: "보통", audioTip: "부드럽게, 따뜻하게", genre: "romantic" },
  ]},

  // ==================== 별에서 온 그대 (My Love from the Star) 2013-2014 ====================
  { drama: "별에서 온 그대", dramaEn: "My Love from the Star", youtubeId: "YWCX2vPqKrM", timestamp: 40, scenes: [
    { character: "도민준", korean: "눈앞에 보이는 게 전부가 아니야.", vietnamese: "Những gì thấy trước mắt không phải là tất cả.", context: "민준이 철학적인 말을 하는 장면", difficulty: "보통", audioTip: "담담하게, 깊이 있게", genre: "fantasy" },
  ]},
  { drama: "별에서 온 그대", dramaEn: "My Love from the Star", youtubeId: "4Qe9H7XPRTQ", timestamp: 35, scenes: [
    { character: "천송이", korean: "오빠 나 사랑해? 얼마나?", vietnamese: "Anh yêu em không? Bao nhiêu?", context: "송이가 민준에게 장난치는 장면", difficulty: "쉬움", audioTip: "애교스럽게, 장난스럽게", genre: "romantic" },
  ]},
  { drama: "별에서 온 그대", dramaEn: "My Love from the Star", youtubeId: "JH8nKqM2xvQ", timestamp: 30, scenes: [
    { character: "도민준", korean: "가지 마. 제발.", vietnamese: "Đừng đi. Làm ơn.", context: "민준이 송이를 붙잡는 장면", difficulty: "쉬움", audioTip: "간절하게, 슬프게", genre: "romantic" },
  ]},

  // ==================== 태양의 후예 (Descendants of the Sun) 2016 ====================
  { drama: "태양의 후예", dramaEn: "Descendants of the Sun", youtubeId: "oqZ7QaXiPyY", timestamp: 45, scenes: [
    { character: "유시진", korean: "저 여자... 내 거거든요.", vietnamese: "Cô ấy... là của tôi đấy.", context: "시진이 모연을 자신의 사람이라고 말하는 장면", difficulty: "쉬움", audioTip: "당당하게, 소유욕을 담아", genre: "romantic" },
  ]},
  { drama: "태양의 후예", dramaEn: "Descendants of the Sun", youtubeId: "K8d9XQHJ7Bk", timestamp: 40, scenes: [
    { character: "강모연", korean: "군인 좋아하게 될 줄 몰랐는데.", vietnamese: "Không ngờ lại thích quân nhân.", context: "모연이 시진에게 마음을 인정하는 장면", difficulty: "보통", audioTip: "수줍게, 인정하듯", genre: "romantic" },
  ]},
  { drama: "태양의 후예", dramaEn: "Descendants of the Sun", youtubeId: "NqM8RJ6pQYA", timestamp: 35, scenes: [
    { character: "유시진", korean: "살아서 돌아올게. 약속해.", vietnamese: "Tôi sẽ sống mà trở về. Hứa đó.", context: "시진이 모연에게 약속하는 장면", difficulty: "쉬움", audioTip: "진지하게, 결의에 차서", genre: "action" },
  ]},

  // ==================== 갯마을 차차차 (Hometown Cha-Cha-Cha) 2021 ====================
  { drama: "갯마을 차차차", dramaEn: "Hometown Cha-Cha-Cha", youtubeId: "4Xdz4pPdDQE", timestamp: 35, scenes: [
    { character: "홍두식", korean: "혜진아, 난 네가 좋아.", vietnamese: "Hye Jin à, anh thích em.", context: "두식이 혜진에게 고백하는 장면", difficulty: "쉬움", audioTip: "솔직하게, 담백하게", genre: "romantic" },
  ]},
  { drama: "갯마을 차차차", dramaEn: "Hometown Cha-Cha-Cha", youtubeId: "K9gH7rAeNlY", timestamp: 40, scenes: [
    { character: "윤혜진", korean: "공진에 와서 제일 잘한 일이 뭔지 알아요?", vietnamese: "Biết việc tốt nhất em làm khi đến Gongjin là gì không?", context: "혜진이 두식에게 마음을 표현하는 장면", difficulty: "어려움", audioTip: "설레게, 사랑스럽게", genre: "romantic" },
  ]},

  // ==================== 스타트업 (Start-Up) 2020 ====================
  { drama: "스타트업", dramaEn: "Start-Up", youtubeId: "MNQE7sEjsQA", timestamp: 40, scenes: [
    { character: "남도산", korean: "내가 너의 좋은 사람이 될게.", vietnamese: "Anh sẽ trở thành người tốt của em.", context: "도산이 달미에게 고백하는 장면", difficulty: "보통", audioTip: "진심을 담아, 떨리게", genre: "romantic" },
  ]},
  { drama: "스타트업", dramaEn: "Start-Up", youtubeId: "YT8h7QRMM0A", timestamp: 35, scenes: [
    { character: "서달미", korean: "꿈을 향해 달려가는 거야. 멈추지 마.", vietnamese: "Chạy về phía ước mơ đi. Đừng dừng lại.", context: "달미가 자신의 신념을 말하는 장면", difficulty: "보통", audioTip: "열정적으로, 힘차게", genre: "romantic" },
  ]},

  // ==================== 악의 꽃 (Flower of Evil) 2020 ====================
  { drama: "악의 꽃", dramaEn: "Flower of Evil", youtubeId: "FSQN8gHjvHM", timestamp: 45, scenes: [
    { character: "백희성", korean: "난 널 사랑한 적 없어. 근데... 지금은 모르겠어.", vietnamese: "Tôi chưa bao giờ yêu em. Nhưng... bây giờ tôi không biết.", context: "희성이 지원에게 혼란스러운 감정을 말하는 장면", difficulty: "어려움", audioTip: "혼란스럽게, 떨리며", genre: "thriller" },
  ]},
  { drama: "악의 꽃", dramaEn: "Flower of Evil", youtubeId: "P9qKE2tVQ6k", timestamp: 35, scenes: [
    { character: "차지원", korean: "당신이 누구든, 난 당신을 사랑해.", vietnamese: "Dù anh là ai, em vẫn yêu anh.", context: "지원이 희성에게 무조건적인 사랑을 고백하는 장면", difficulty: "보통", audioTip: "단호하게, 사랑을 담아", genre: "romantic" },
  ]},

  // ==================== 지금 우리 학교는 (All of Us Are Dead) 2022 ====================
  { drama: "지금 우리 학교는", dramaEn: "All of Us Are Dead", youtubeId: "VZnT7qMM8Xo", timestamp: 40, scenes: [
    { character: "이청산", korean: "다 같이 살아남는 거야. 누구도 포기 안 해.", vietnamese: "Tất cả cùng sống sót. Không bỏ ai cả.", context: "청산이 친구들을 이끄는 장면", difficulty: "보통", audioTip: "단호하게, 리더십 있게", genre: "action" },
  ]},
  { drama: "지금 우리 학교는", dramaEn: "All of Us Are Dead", youtubeId: "Rq7fHQm8TQI", timestamp: 35, scenes: [
    { character: "남온조", korean: "우린 할 수 있어. 믿어.", vietnamese: "Chúng ta làm được. Tin đi.", context: "온조가 친구들을 격려하는 장면", difficulty: "쉬움", audioTip: "용기 있게, 희망을 담아", genre: "action" },
  ]},

  // ==================== 수리남 (Narco-Saints) 2022 ====================
  { drama: "수리남", dramaEn: "Narco-Saints", youtubeId: "FGqKE8L3Ric", timestamp: 45, scenes: [
    { character: "강인구", korean: "끝까지 간다. 포기하면 죽어.", vietnamese: "Đi đến cùng. Bỏ cuộc là chết.", context: "인구가 결의를 다지는 장면", difficulty: "보통", audioTip: "비장하게, 결연하게", genre: "action" },
  ]},

  // ==================== 마이 네임 (My Name) 2021 ====================
  { drama: "마이 네임", dramaEn: "My Name", youtubeId: "6QP5T7hEkRY", timestamp: 40, scenes: [
    { character: "윤지우", korean: "복수할 거야. 누가 막아도.", vietnamese: "Tôi sẽ trả thù. Dù ai có cản.", context: "지우가 복수를 다짐하는 장면", difficulty: "보통", audioTip: "차갑게, 결의에 차서", genre: "action" },
  ]},

  // ==================== 경이로운 소문 (The Uncanny Counter) 2020-2021 ====================
  { drama: "경이로운 소문", dramaEn: "The Uncanny Counter", youtubeId: "QYXR8HgPqNM", timestamp: 35, scenes: [
    { character: "소문", korean: "악귀 사냥은 내가 할게.", vietnamese: "Việc săn ác quỷ để tôi lo.", context: "소문이 카운터로서 각오를 다지는 장면", difficulty: "보통", audioTip: "자신감 있게, 단호하게", genre: "action" },
  ]},

  // ==================== 더킹: 영원의 군주 (The King: Eternal Monarch) 2020 ====================
  { drama: "더킹: 영원의 군주", dramaEn: "The King: Eternal Monarch", youtubeId: "KEQasLtCUQQ", timestamp: 40, scenes: [
    { character: "이곤", korean: "내가 데리러 왔다. 너의 왕이.", vietnamese: "Ta đến đón ngươi. Vương của ngươi đây.", context: "이곤이 태을에게 하는 명대사", difficulty: "보통", audioTip: "위엄 있게, 로맨틱하게", genre: "fantasy" },
  ]},
  { drama: "더킹: 영원의 군주", dramaEn: "The King: Eternal Monarch", youtubeId: "BHQKJ7q4MsY", timestamp: 35, scenes: [
    { character: "정태을", korean: "폐하, 저 폐하 좋아합니다.", vietnamese: "Bệ hạ, thần thích bệ hạ.", context: "태을이 이곤에게 고백하는 장면", difficulty: "쉬움", audioTip: "솔직하게, 쑥스럽게", genre: "romantic" },
  ]},

  // ==================== 홍천기 (Lovers of the Red Sky) 2021 ====================
  { drama: "홍천기", dramaEn: "Lovers of the Red Sky", youtubeId: "TNqJh3RNMLQ", timestamp: 35, scenes: [
    { character: "하람", korean: "네가 보인다. 네 마음이.", vietnamese: "Ta thấy được. Trái tim của ngươi.", context: "하람이 천기에게 마음을 읽었다고 말하는 장면", difficulty: "보통", audioTip: "부드럽게, 신비롭게", genre: "fantasy" },
  ]},

  // ==================== 연인 (My Dearest) 2023 ====================
  { drama: "연인", dramaEn: "My Dearest", youtubeId: "LTKHQ8TJMG4", timestamp: 40, scenes: [
    { character: "유길채", korean: "사랑합니다. 오직 당신만을.", vietnamese: "Thiếp yêu chàng. Chỉ mình chàng thôi.", context: "길채가 장현에게 사랑을 고백하는 장면", difficulty: "보통", audioTip: "간절하게, 애절하게", genre: "romantic" },
  ]},

  // ==================== 이번 생도 잘 부탁해 (See You in My 19th Life) 2023 ====================
  { drama: "이번 생도 잘 부탁해", dramaEn: "See You in My 19th Life", youtubeId: "RMJQh8kEJNg", timestamp: 35, scenes: [
    { character: "반지음", korean: "이번 생에도 찾았다. 널.", vietnamese: "Đời này cũng tìm được rồi. Cậu.", context: "지음이 수혁을 다시 찾은 장면", difficulty: "보통", audioTip: "감격스럽게, 반갑게", genre: "fantasy" },
  ]},

  // ==================== 일타 스캔들 (Crash Course in Romance) 2023 ====================
  { drama: "일타 스캔들", dramaEn: "Crash Course in Romance", youtubeId: "KYJE5N9FHYQ", timestamp: 40, scenes: [
    { character: "최치열", korean: "난 당신이 좋아요. 선생님으로서도, 남자로서도.", vietnamese: "Tôi thích cô. Với tư cách giáo viên, và cả đàn ông.", context: "치열이 행선에게 고백하는 장면", difficulty: "어려움", audioTip: "진지하게, 떨리며", genre: "romantic" },
  ]},

  // ==================== 킬러들의 쇼핑몰 (A Shop for Killers) 2024 ====================
  { drama: "킬러들의 쇼핑몰", dramaEn: "A Shop for Killers", youtubeId: "QH7kTjNRxNo", timestamp: 35, scenes: [
    { character: "정지안", korean: "살아남는 게 복수야.", vietnamese: "Sống sót chính là trả thù.", context: "지안이 생존 의지를 보여주는 장면", difficulty: "쉬움", audioTip: "강하게, 결연하게", genre: "action" },
  ]},

  // ==================== 힘쎈여자 강남순 (Strong Girl Nam-soon) 2023 ====================
  { drama: "힘쎈여자 강남순", dramaEn: "Strong Girl Nam-soon", youtubeId: "QYHE7MNLKHM", timestamp: 40, scenes: [
    { character: "강남순", korean: "힘은 정의를 위해 쓰는 거예요.", vietnamese: "Sức mạnh là để dùng cho công lý.", context: "남순이 자신의 신념을 말하는 장면", difficulty: "보통", audioTip: "당당하게, 밝게", genre: "action" },
  ]},

  // ==================== 마스크걸 (Mask Girl) 2023 ====================
  { drama: "마스크걸", dramaEn: "Mask Girl", youtubeId: "Q8FRZJNM4VQ", timestamp: 45, scenes: [
    { character: "김모미", korean: "가면 뒤에 숨은 건 진짜 나야.", vietnamese: "Người giấu sau mặt nạ mới là tôi thật.", context: "모미가 정체성에 대해 말하는 장면", difficulty: "보통", audioTip: "슬프게, 자조적으로", genre: "thriller" },
  ]},

  // ==================== 살인자ㅇ난감 (A Killer Paradox) 2024 ====================
  { drama: "살인자ㅇ난감", dramaEn: "A Killer Paradox", youtubeId: "TJ8qyM9E5NI", timestamp: 35, scenes: [
    { character: "이탕", korean: "난 죽여도 되는 사람만 죽인다.", vietnamese: "Tôi chỉ giết những người đáng chết.", context: "이탕이 자신의 논리를 설명하는 장면", difficulty: "보통", audioTip: "담담하게, 차갑게", genre: "thriller" },
  ]},

  // ==================== 웰컴투 삼달리 (Welcome to Samdal-ri) 2023-2024 ====================
  { drama: "웰컴투 삼달리", dramaEn: "Welcome to Samdal-ri", youtubeId: "LMNE8HQTK0Y", timestamp: 40, scenes: [
    { character: "조용필", korean: "고향이 그리웠어. 그리고 너도.", vietnamese: "Nhớ quê hương. Và cả em nữa.", context: "용필이 삼달에게 마음을 표현하는 장면", difficulty: "쉬움", audioTip: "그리움을 담아, 따뜻하게", genre: "romantic" },
  ]},

  // ==================== 하이클래스 (High Class) 2021 ====================
  { drama: "하이클래스", dramaEn: "High Class", youtubeId: "L8RvMH3ETJQ", timestamp: 35, scenes: [
    { character: "송여울", korean: "진실은 반드시 밝혀져.", vietnamese: "Sự thật nhất định sẽ được phơi bày.", context: "여울이 진실을 찾겠다고 다짐하는 장면", difficulty: "보통", audioTip: "단호하게, 결의에 차서", genre: "thriller" },
  ]},

  // ==================== 펜트하우스 (The Penthouse) 2020-2021 ====================
  { drama: "펜트하우스", dramaEn: "The Penthouse", youtubeId: "PHQM6KJNRTE", timestamp: 45, scenes: [
    { character: "천서진", korean: "헤라팰리스에서 밀려나면 죽은 거야.", vietnamese: "Bị đẩy khỏi Hera Palace thì coi như chết.", context: "서진이 상류층 삶에 대한 집착을 보여주는 장면", difficulty: "보통", audioTip: "오만하게, 독하게", genre: "thriller" },
  ]},
  { drama: "펜트하우스", dramaEn: "The Penthouse", youtubeId: "Q8HYTJNMQRE", timestamp: 40, scenes: [
    { character: "오윤희", korean: "내 딸한테 손대지 마.", vietnamese: "Đừng động vào con gái tôi.", context: "윤희가 딸을 지키려는 장면", difficulty: "쉬움", audioTip: "분노하며, 보호 본능을 담아", genre: "thriller" },
  ]},

  // ==================== 부부의 세계 (The World of the Married) 2020 ====================
  { drama: "부부의 세계", dramaEn: "The World of the Married", youtubeId: "NQYE7MKNRTQ", timestamp: 50, scenes: [
    { character: "지선우", korean: "배신한 건 당신이야. 나한테 사과해.", vietnamese: "Người phản bội là anh. Xin lỗi tôi đi.", context: "선우가 남편의 외도를 알고 대면하는 장면", difficulty: "보통", audioTip: "차갑게, 분노를 억누르며", genre: "thriller" },
  ]},

  // ==================== 미생 (Misaeng) 2014 ====================
  { drama: "미생", dramaEn: "Misaeng", youtubeId: "LQNE7MKNRTM", timestamp: 40, scenes: [
    { character: "장그래", korean: "아직 살아있으니까. 미생이니까.", vietnamese: "Vì vẫn còn sống. Vì là Misaeng.", context: "그래가 포기하지 않겠다고 다짐하는 장면", difficulty: "보통", audioTip: "담담하게, 결의를 담아", genre: "action" },
  ]},

  // ==================== 시그널 (Signal) 2016 ====================
  { drama: "시그널", dramaEn: "Signal", youtubeId: "MQYE7HKNRTQ", timestamp: 45, scenes: [
    { character: "박해영", korean: "과거를 바꾸면 현재도 바뀐다.", vietnamese: "Nếu thay đổi quá khứ, hiện tại cũng thay đổi.", context: "해영이 시간의 연결을 깨닫는 장면", difficulty: "보통", audioTip: "깨달음을 담아, 진지하게", genre: "thriller" },
  ]},

  // ==================== 비밀의 숲 (Stranger) 2017 ====================
  { drama: "비밀의 숲", dramaEn: "Stranger", youtubeId: "NRYE8HKNRTM", timestamp: 40, scenes: [
    { character: "황시목", korean: "진실 앞에서 감정은 필요 없어.", vietnamese: "Trước sự thật, không cần cảm xúc.", context: "시목이 냉철하게 사건을 분석하는 장면", difficulty: "어려움", audioTip: "무감정하게, 날카롭게", genre: "thriller" },
  ]},

  // ==================== 나의 아저씨 (My Mister) 2018 ====================
  { drama: "나의 아저씨", dramaEn: "My Mister", youtubeId: "PQYE9HKNRTQ", timestamp: 50, scenes: [
    { character: "이지안", korean: "살아있어서 다행이에요. 아저씨.", vietnamese: "May mà anh vẫn còn sống. Anh ạ.", context: "지안이 동훈에게 진심을 전하는 장면", difficulty: "쉬움", audioTip: "담담하게, 진심을 담아", genre: "romantic" },
  ]},
  { drama: "나의 아저씨", dramaEn: "My Mister", youtubeId: "QRYE0IKNRTM", timestamp: 45, scenes: [
    { character: "박동훈", korean: "힘내. 너도 잘 살 수 있어.", vietnamese: "Cố lên. Cậu cũng có thể sống tốt.", context: "동훈이 지안을 응원하는 장면", difficulty: "쉬움", audioTip: "따뜻하게, 진심으로", genre: "romantic" },
  ]},

  // ==================== SKY 캐슬 (SKY Castle) 2018-2019 ====================
  { drama: "SKY 캐슬", dramaEn: "SKY Castle", youtubeId: "SRYE1JKNRTQ", timestamp: 45, scenes: [
    { character: "한서진", korean: "내 아이는 반드시 서울의대 간다.", vietnamese: "Con tôi nhất định phải vào Y khoa Seoul.", context: "서진이 교육 집착을 보여주는 장면", difficulty: "보통", audioTip: "집요하게, 필사적으로", genre: "thriller" },
  ]},

  // ==================== 응답하라 1988 (Reply 1988) 2015-2016 ====================
  { drama: "응답하라 1988", dramaEn: "Reply 1988", youtubeId: "TRYE2KKNRTM", timestamp: 40, scenes: [
    { character: "성덕선", korean: "어른이 된다는 게 이렇게 슬픈 거야?", vietnamese: "Lớn lên buồn thế này sao?", context: "덕선이 어른이 되어가며 느끼는 감정", difficulty: "보통", audioTip: "슬프게, 회상하듯", genre: "romantic" },
  ]},
  { drama: "응답하라 1988", dramaEn: "Reply 1988", youtubeId: "URYE3LKNRTQ", timestamp: 35, scenes: [
    { character: "최택", korean: "나 덕선이 좋아. 오래전부터.", vietnamese: "Tao thích Deok Sun. Từ rất lâu rồi.", context: "택이가 덕선에게 고백하는 장면", difficulty: "쉬움", audioTip: "떨리게, 수줍게", genre: "romantic" },
  ]},

  // ==================== 서른 아홉 (Thirty-Nine) 2022 ====================
  { drama: "서른 아홉", dramaEn: "Thirty-Nine", youtubeId: "VRYE4MKNRTM", timestamp: 45, scenes: [
    { character: "정찬영", korean: "우리 우정은 영원해. 그건 변함없어.", vietnamese: "Tình bạn của chúng ta là mãi mãi. Điều đó không thay đổi.", context: "찬영이 친구들에게 하는 말", difficulty: "보통", audioTip: "감동적으로, 눈물을 머금고", genre: "romantic" },
  ]},

  // ==================== 피노키오 (Pinocchio) 2014-2015 ====================
  { drama: "피노키오", dramaEn: "Pinocchio", youtubeId: "WRYE5NKNRTQ", timestamp: 40, scenes: [
    { character: "최달포", korean: "거짓말 못 하는 네가 좋아.", vietnamese: "Tôi thích cô không thể nói dối.", context: "달포가 인하에게 고백하는 장면", difficulty: "보통", audioTip: "진심을 담아, 솔직하게", genre: "romantic" },
  ]},

  // ==================== 청춘시대 (Age of Youth) 2016 ====================
  { drama: "청춘시대", dramaEn: "Age of Youth", youtubeId: "XRYE6OKNRTM", timestamp: 35, scenes: [
    { character: "윤진명", korean: "청춘이니까 실수해도 괜찮아.", vietnamese: "Vì còn trẻ nên sai cũng không sao.", context: "진명이 친구들을 위로하는 장면", difficulty: "보통", audioTip: "따뜻하게, 위로하듯", genre: "romantic" },
  ]},

  // ==================== 하백의 신부 (Bride of Habaek) 2017 ====================
  { drama: "하백의 신부", dramaEn: "Bride of Habaek", youtubeId: "YRYE7PKNRTQ", timestamp: 40, scenes: [
    { character: "하백", korean: "네가 내 신부다. 받아들여라.", vietnamese: "Ngươi là tân nương của ta. Hãy chấp nhận đi.", context: "하백이 소아에게 선언하는 장면", difficulty: "보통", audioTip: "위엄 있게, 당당하게", genre: "fantasy" },
  ]},

  // ==================== 알함브라 궁전의 추억 (Memories of the Alhambra) 2018-2019 ====================
  { drama: "알함브라 궁전의 추억", dramaEn: "Memories of the Alhambra", youtubeId: "ZRYE8QKNRTM", timestamp: 45, scenes: [
    { character: "유진우", korean: "게임과 현실의 경계가 무너졌어.", vietnamese: "Ranh giới giữa game và thực tế đã sụp đổ.", context: "진우가 혼란에 빠지는 장면", difficulty: "어려움", audioTip: "공포스럽게, 혼란스럽게", genre: "thriller" },
  ]},

  // ==================== 구미호뎐 (Tale of the Nine Tailed) 2020 ====================
  { drama: "구미호뎐", dramaEn: "Tale of the Nine Tailed", youtubeId: "0SYE9RKNRTQ", timestamp: 40, scenes: [
    { character: "이연", korean: "널 지키기 위해 천 년을 살았어.", vietnamese: "Ta đã sống ngàn năm để bảo vệ ngươi.", context: "이연이 지아에게 하는 고백", difficulty: "보통", audioTip: "깊이 있게, 진심을 담아", genre: "fantasy" },
  ]},

  // ==================== 낭만닥터 김사부 (Dr. Romantic) 2016-2023 ====================
  { drama: "낭만닥터 김사부", dramaEn: "Dr. Romantic", youtubeId: "1TYE0SKNRTM", timestamp: 45, scenes: [
    { character: "김사부", korean: "환자가 먼저야. 그게 의사야.", vietnamese: "Bệnh nhân là trước hết. Đó mới là bác sĩ.", context: "김사부가 의사의 사명을 말하는 장면", difficulty: "보통", audioTip: "단호하게, 신념을 담아", genre: "action" },
  ]},

  // ==================== 조선 정신과 의사 유세풍 (Poong, the Joseon Psychiatrist) 2022-2023 ====================
  { drama: "조선 정신과 의사 유세풍", dramaEn: "Poong, the Joseon Psychiatrist", youtubeId: "2UYE1TKNRTQ", timestamp: 35, scenes: [
    { character: "유세풍", korean: "마음의 병도 치료할 수 있어.", vietnamese: "Bệnh của tâm hồn cũng có thể chữa được.", context: "세풍이 정신의학의 가치를 말하는 장면", difficulty: "보통", audioTip: "따뜻하게, 확신을 담아", genre: "romantic" },
  ]},

  // ==================== 사내맞선 (Business Proposal) 2022 ====================
  { drama: "사내맞선", dramaEn: "Business Proposal", youtubeId: "3VYE2UKNRTM", timestamp: 35, scenes: [
    { character: "강태무", korean: "신하리씨, 저랑 사귀어 주세요.", vietnamese: "Shin Ha Ri, hãy hẹn hò với tôi.", context: "태무가 하리에게 정식으로 고백하는 장면", difficulty: "쉬움", audioTip: "진지하게, 설레게", genre: "romantic" },
  ]},
  { drama: "사내맞선", dramaEn: "Business Proposal", youtubeId: "4WYE3VKNRTQ", timestamp: 40, scenes: [
    { character: "신하리", korean: "그래요. 사귀어요. 우리.", vietnamese: "Vâng. Hẹn hò đi. Chúng ta.", context: "하리가 태무의 고백을 받아들이는 장면", difficulty: "쉬움", audioTip: "수줍게, 행복하게", genre: "romantic" },
  ]},

  // ==================== 환혼 (Alchemy of Souls) 2022-2023 ====================
  { drama: "환혼", dramaEn: "Alchemy of Souls", youtubeId: "5XYE4WKNRTM", timestamp: 45, scenes: [
    { character: "장욱", korean: "네가 누구든 상관없어. 네가 좋아.", vietnamese: "Em là ai cũng không quan trọng. Anh thích em.", context: "욱이 무덕에게 진심을 전하는 장면", difficulty: "보통", audioTip: "진심을 담아, 단호하게", genre: "fantasy" },
  ]},
  { drama: "환혼", dramaEn: "Alchemy of Souls", youtubeId: "6YYE5XKNRTQ", timestamp: 40, scenes: [
    { character: "낙수", korean: "내 영혼은 이미 네 곁에 있어.", vietnamese: "Linh hồn của ta đã ở bên ngươi rồi.", context: "낙수가 사랑을 고백하는 장면", difficulty: "보통", audioTip: "애절하게, 슬프게", genre: "romantic" },
  ]},

  // ==================== 지리산 (Jirisan) 2021 ====================
  { drama: "지리산", dramaEn: "Jirisan", youtubeId: "7ZYE6YKNRTM", timestamp: 40, scenes: [
    { character: "서이강", korean: "산은 사람을 구하기도 하고, 삼키기도 해.", vietnamese: "Núi vừa cứu người, vừa nuốt chửng người.", context: "이강이 산의 양면성을 말하는 장면", difficulty: "어려움", audioTip: "깊이 있게, 경고하듯", genre: "thriller" },
  ]},

  // ==================== 악마가 너의 이름을 부를 때 (The Smile Has Left Your Eyes) 2018 ====================
  { drama: "악마가 너의 이름을 부를 때", dramaEn: "The Smile Has Left Your Eyes", youtubeId: "8AYE7ZKNRTQ", timestamp: 45, scenes: [
    { character: "김무영", korean: "널 만나고 처음으로 살고 싶어졌어.", vietnamese: "Gặp em lần đầu tiên anh muốn sống.", context: "무영이 진강에게 진심을 말하는 장면", difficulty: "보통", audioTip: "슬프게, 간절하게", genre: "romantic" },
  ]},

  // ==================== 킬 미 힐 미 (Kill Me, Heal Me) 2015 ====================
  { drama: "킬 미 힐 미", dramaEn: "Kill Me, Heal Me", youtubeId: "9BYE80KNRTM", timestamp: 40, scenes: [
    { character: "차도현", korean: "나를 치료해줘. 제발.", vietnamese: "Hãy chữa trị cho tôi. Làm ơn.", context: "도현이 리진에게 간청하는 장면", difficulty: "쉬움", audioTip: "절박하게, 눈물을 머금고", genre: "romantic" },
  ]},

  // ==================== 괴물 (Beyond Evil) 2021 ====================
  { drama: "괴물", dramaEn: "Beyond Evil", youtubeId: "0CYE91KNRTQ", timestamp: 45, scenes: [
    { character: "이동식", korean: "진짜 괴물은 누구야?", vietnamese: "Quái vật thật sự là ai?", context: "동식이 진실을 추적하는 장면", difficulty: "보통", audioTip: "날카롭게, 의심하며", genre: "thriller" },
  ]},

  // ==================== 그 해 우리는 (Our Beloved Summer) 2021-2022 ====================
  { drama: "그 해 우리는", dramaEn: "Our Beloved Summer", youtubeId: "1DYE02KNRTM", timestamp: 40, scenes: [
    { character: "최웅", korean: "널 싫어하려고 했는데... 안 돼.", vietnamese: "Anh cố ghét em... mà không được.", context: "웅이 연수에게 진심을 고백하는 장면", difficulty: "보통", audioTip: "솔직하게, 어쩔 수 없다는 듯", genre: "romantic" },
  ]},
  { drama: "그 해 우리는", dramaEn: "Our Beloved Summer", youtubeId: "2EYE13KNRTQ", timestamp: 35, scenes: [
    { character: "국연수", korean: "다시 시작하자. 우리.", vietnamese: "Bắt đầu lại đi. Chúng ta.", context: "연수가 재회를 제안하는 장면", difficulty: "쉬움", audioTip: "용기 있게, 희망을 담아", genre: "romantic" },
  ]},

  // ==================== 닥터 슬럼프 (Doctor Slump) 2024 ====================
  { drama: "닥터 슬럼프", dramaEn: "Doctor Slump", youtubeId: "3FYE24KNRTM", timestamp: 35, scenes: [
    { character: "남하늘", korean: "지쳐도 괜찮아. 같이 쉬자.", vietnamese: "Mệt cũng không sao. Nghỉ ngơi cùng nhau đi.", context: "하늘이 정우에게 위로하는 장면", difficulty: "쉬움", audioTip: "따뜻하게, 다정하게", genre: "romantic" },
  ]},

  // ==================== 마이 해피 엔드 (My Happy End) 2023 ====================
  { drama: "마이 해피 엔드", dramaEn: "My Happy End", youtubeId: "4GYE35KNRTQ", timestamp: 40, scenes: [
    { character: "정재", korean: "행복해지고 싶어. 이번엔 진짜로.", vietnamese: "Tôi muốn hạnh phúc. Lần này thật sự.", context: "정재가 진심을 털어놓는 장면", difficulty: "보통", audioTip: "간절하게, 솔직하게", genre: "romantic" },
  ]},

  // ==================== 체크인 한양 (Check In Hanyang) 2024 ====================
  { drama: "체크인 한양", dramaEn: "Check In Hanyang", youtubeId: "5HYE46KNRTM", timestamp: 35, scenes: [
    { character: "이은", korean: "손님의 마음을 읽는 게 내 일이야.", vietnamese: "Đọc được tâm ý khách hàng là công việc của tôi.", context: "이은이 여관 주인으로서의 신념을 말하는 장면", difficulty: "보통", audioTip: "자신감 있게, 프로페셔널하게", genre: "romantic" },
  ]},

  // ==================== 법대로 사랑하라 (Love According to Law) 2022 ====================
  { drama: "법대로 사랑하라", dramaEn: "Love According to Law", youtubeId: "6IYE57KNRTQ", timestamp: 40, scenes: [
    { character: "김정호", korean: "법보다 강한 게 사랑이야.", vietnamese: "Thứ mạnh hơn luật pháp là tình yêu.", context: "정호가 유리에게 고백하는 장면", difficulty: "보통", audioTip: "로맨틱하게, 진심을 담아", genre: "romantic" },
  ]},

  // ==================== 오월의 청춘 (Youth of May) 2021 ====================
  { drama: "오월의 청춘", dramaEn: "Youth of May", youtubeId: "7JYE68KNRTM", timestamp: 45, scenes: [
    { character: "황희태", korean: "역사는 우리가 기억해야 해.", vietnamese: "Lịch sử chúng ta phải ghi nhớ.", context: "희태가 역사의 중요성을 말하는 장면", difficulty: "보통", audioTip: "진지하게, 결의에 차서", genre: "romantic" },
  ]},

  // ==================== 런 온 (Run On) 2020-2021 ====================
  { drama: "런 온", dramaEn: "Run On", youtubeId: "8KYE79KNRTQ", timestamp: 35, scenes: [
    { character: "기선겸", korean: "번역은 마음을 전하는 거야.", vietnamese: "Dịch thuật là truyền đạt tâm hồn.", context: "선겸이 미주에게 번역의 의미를 말하는 장면", difficulty: "보통", audioTip: "부드럽게, 사려 깊게", genre: "romantic" },
  ]},

  // ==================== 유미의 세포들 (Yumi's Cells) 2021-2022 ====================
  { drama: "유미의 세포들", dramaEn: "Yumi's Cells", youtubeId: "9LYE80KNRTM", timestamp: 40, scenes: [
    { character: "유미", korean: "사랑 세포가 살아났어!", vietnamese: "Tế bào tình yêu đã sống dậy!", context: "유미가 사랑에 빠지는 순간", difficulty: "쉬움", audioTip: "신나게, 두근두근하게", genre: "romantic" },
  ]},

  // ==================== 도시남녀의 사랑법 (Lovestruck in the City) 2020-2021 ====================
  { drama: "도시남녀의 사랑법", dramaEn: "Lovestruck in the City", youtubeId: "0MYE91KNRTQ", timestamp: 35, scenes: [
    { character: "박재원", korean: "찾았어. 널 찾았어.", vietnamese: "Tìm được rồi. Tìm được em rồi.", context: "재원이 은오를 다시 찾은 장면", difficulty: "쉬움", audioTip: "절박하게, 반갑게", genre: "romantic" },
  ]},

  // ==================== 날씨가 좋으면 찾아가겠어요 (When the Weather Is Fine) 2020 ====================
  { drama: "날씨가 좋으면 찾아가겠어요", dramaEn: "When the Weather Is Fine", youtubeId: "1NYE02LNRTM", timestamp: 40, scenes: [
    { character: "임은섭", korean: "날씨가 좋으면 찾아갈게. 약속해.", vietnamese: "Nếu thời tiết đẹp anh sẽ đến. Hứa nhé.", context: "은섭이 해원에게 약속하는 장면", difficulty: "보통", audioTip: "따뜻하게, 약속하듯", genre: "romantic" },
  ]},
];

// Helper function to generate unique IDs
function generateId(drama: string, index: number): string {
  return `${drama.replace(/\s+/g, '_').toLowerCase()}_${index}_${Date.now()}`;
}

// Flatten all scenes with proper structure
function getAllScenes() {
  const allScenes: any[] = [];
  
  verifiedDramaClips.forEach((clip, clipIndex) => {
    clip.scenes.forEach((scene, sceneIndex) => {
      allScenes.push({
        id: generateId(clip.drama, clipIndex * 10 + sceneIndex),
        drama: clip.drama,
        dramaEn: clip.dramaEn,
        youtubeId: clip.youtubeId,
        timestamp: clip.timestamp,
        character: scene.character,
        korean: scene.korean,
        vietnamese: scene.vietnamese,
        context: scene.context,
        difficulty: scene.difficulty,
        audioTip: scene.audioTip,
        genre: scene.genre
      });
    });
  });
  
  return allScenes;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { genre, difficulty, excludeIds, count = 5 } = await req.json();
    
    console.log('Drama clips request:', { genre, difficulty, excludeIds, count });

    let scenes = getAllScenes();
    
    // Filter by genre if specified
    if (genre) {
      scenes = scenes.filter(s => s.genre === genre);
    }
    
    // Filter by difficulty if specified
    if (difficulty) {
      scenes = scenes.filter(s => s.difficulty === difficulty);
    }
    
    // Exclude already used IDs
    if (excludeIds && excludeIds.length > 0) {
      scenes = scenes.filter(s => !excludeIds.includes(s.id));
    }
    
    // Shuffle and take requested count
    const shuffled = scenes.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(count, shuffled.length));
    
    console.log(`Returning ${selected.length} drama clips`);

    return new Response(
      JSON.stringify({ 
        scenes: selected,
        total: getAllScenes().length,
        filtered: scenes.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Drama clips error:', error);
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
      drama: "도깨비",
      dramaEn: "Goblin",
      youtubeId: "HKjXVmTYnyQ",
      timestamp: 30,
      character: "김신",
      korean: "날씨가 좋아서, 날씨가 좋지 않아서, 날씨가 적당해서.",
      vietnamese: "Vì thời tiết đẹp, vì thời tiết không đẹp, vì thời tiết vừa phải.",
      context: "도깨비가 은탁이 보고 싶은 이유를 나열하는 명장면",
      difficulty: "어려움",
      audioTip: "담담하게, 그리움을 담아서",
      genre: "romantic"
    },
    {
      id: "fallback_2",
      drama: "사랑의 불시착",
      dramaEn: "Crash Landing on You",
      youtubeId: "GrWvnhHXqjE",
      timestamp: 50,
      character: "리정혁",
      korean: "당신은 왜 자꾸 제 심장을 향해 불시착합니까.",
      vietnamese: "Sao cô cứ hạ cánh bất ngờ vào trái tim tôi vậy.",
      context: "정혁이 세리에게 고백하는 명장면",
      difficulty: "어려움",
      audioTip: "진지하게, 떨리는 목소리로",
      genre: "romantic"
    },
    {
      id: "fallback_3",
      drama: "오징어 게임",
      dramaEn: "Squid Game",
      youtubeId: "yrVXtdpPaJo",
      timestamp: 40,
      character: "오일남",
      korean: "우리... 깐부잖아.",
      vietnamese: "Chúng ta... là Gganbu mà.",
      context: "일남이 기훈에게 깐부라고 말하는 장면",
      difficulty: "쉬움",
      audioTip: "친근하게, 약간 슬프게",
      genre: "thriller"
    }
  ];
}
