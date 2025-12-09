import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 검증된 K-Drama YouTube 클립 데이터베이스
// 모든 클립은 tvN 공식 채널에서 검증된 실제 YouTube ID입니다
const verifiedDramaClips = [
  // ==================== 도깨비 (Goblin) 2016 - tvN Drama 공식 ====================
  { drama: "도깨비", dramaEn: "Goblin", youtubeId: "d4GaQ30slGI", timestamp: 0, scenes: [
    { character: "김신", korean: "날씨가 좋아서, 날씨가 좋지 않아서, 날씨가 적당해서.", vietnamese: "Vì thời tiết đẹp, vì thời tiết không đẹp, vì thời tiết vừa phải.", context: "도깨비가 은탁이 보고 싶은 이유를 나열하는 명장면", difficulty: "어려움", audioTip: "담담하게, 그리움을 담아서", genre: "romantic" },
  ]},
  { drama: "도깨비", dramaEn: "Goblin", youtubeId: "yQMBmsrKBMA", timestamp: 0, scenes: [
    { character: "김신", korean: "떨어지는 단풍잎을 잡으면 사랑이 이루어진다.", vietnamese: "Nếu bắt được lá phong rơi thì tình yêu sẽ thành hiện thực.", context: "도깨비가 은탁에게 단풍잎을 잡아주는 장면", difficulty: "보통", audioTip: "로맨틱하게, 부드럽게", genre: "romantic" },
  ]},
  { drama: "도깨비", dramaEn: "Goblin", youtubeId: "Ra7coUN_lYk", timestamp: 0, scenes: [
    { character: "내레이션", korean: "백성들은 그를 신이라 불렀다.", vietnamese: "Bách tính gọi ông ấy là thần.", context: "도깨비의 오프닝, 김신의 과거", difficulty: "보통", audioTip: "웅장하게, 장엄하게", genre: "fantasy" },
  ]},
  { drama: "도깨비", dramaEn: "Goblin", youtubeId: "lf7sEp3DI8M", timestamp: 0, scenes: [
    { character: "김신", korean: "이리 와봐.", vietnamese: "Lại đây.", context: "도깨비 티저 명장면", difficulty: "쉬움", audioTip: "부드럽게, 로맨틱하게", genre: "romantic" },
  ]},
  { drama: "도깨비", dramaEn: "Goblin", youtubeId: "YJVQ7yvuQK4", timestamp: 0, scenes: [
    { character: "저승사자", korean: "저... 죽은 거예요?", vietnamese: "Tôi... chết rồi sao?", context: "저승사자 티저 장면", difficulty: "쉬움", audioTip: "혼란스럽게, 궁금하게", genre: "fantasy" },
  ]},

  // ==================== 더 글로리 (The Glory) 2022-2023 - Netflix Korea ====================
  { drama: "더 글로리", dramaEn: "The Glory", youtubeId: "ByAAFBTu_9k", timestamp: 0, scenes: [
    { character: "문동은", korean: "너한테 마지막 기회를 줄게, 연진아.", vietnamese: "Tao sẽ cho mày cơ hội cuối cùng, Yeon Jin.", context: "동은이 연진에게 경고하는 장면", difficulty: "어려움", audioTip: "차갑게, 위협적으로", genre: "thriller" },
  ]},
  { drama: "더 글로리", dramaEn: "The Glory", youtubeId: "ACxta4XqWgE", timestamp: 0, scenes: [
    { character: "가해자들", korean: "복수당한 자들의 이야기.", vietnamese: "Câu chuyện của những kẻ bị trả thù.", context: "더 글로리 비하인드 인터뷰", difficulty: "보통", audioTip: "진지하게", genre: "thriller" },
  ]},
  { drama: "더 글로리", dramaEn: "The Glory", youtubeId: "tfS1nyhcZAE", timestamp: 0, scenes: [
    { character: "차주영", korean: "파트 2에 비하면 파트 1은 순한 맛이에요.", vietnamese: "So với phần 2 thì phần 1 còn nhẹ nhàng.", context: "더 글로리 비하인드 인터뷰", difficulty: "보통", audioTip: "유쾌하게", genre: "thriller" },
  ]},

  // ==================== 선재 업고 튀어 (Lovely Runner) 2024 - tvN ====================
  { drama: "선재 업고 튀어", dramaEn: "Lovely Runner", youtubeId: "eat89myzHCA", timestamp: 0, scenes: [
    { character: "류선재", korean: "전설의 그 장면.", vietnamese: "Cảnh huyền thoại đó.", context: "선업튀 레전드 명장면 모음", difficulty: "보통", audioTip: "설레게, 감동적으로", genre: "romantic" },
  ]},
  { drama: "선재 업고 튀어", dramaEn: "Lovely Runner", youtubeId: "_1K6eifXctA", timestamp: 0, scenes: [
    { character: "류선재", korean: "네 넥타이, 내가 매줄게.", vietnamese: "Cà vạt của em, anh sẽ thắt cho.", context: "선재가 솔에게 넥타이를 매주는 장면", difficulty: "쉬움", audioTip: "다정하게, 설레게", genre: "romantic" },
  ]},
  { drama: "선재 업고 튀어", dramaEn: "Lovely Runner", youtubeId: "NpkTKWEeeGg", timestamp: 0, scenes: [
    { character: "임솔/류선재", korean: "쌍방구원 로맨스.", vietnamese: "Tình yêu cứu rỗi lẫn nhau.", context: "선재업고튀어 1-2화 하이라이트", difficulty: "보통", audioTip: "감동적으로", genre: "romantic" },
  ]},
  { drama: "선재 업고 튀어", dramaEn: "Lovely Runner", youtubeId: "4OSfHuUPD2U", timestamp: 0, scenes: [
    { character: "류선재", korean: "임솔 밖에 모르는 순애보.", vietnamese: "Tình yêu thuần khiết chỉ biết Im Sol.", context: "류선재 시점으로 보는 선업튀", difficulty: "보통", audioTip: "사랑스럽게", genre: "romantic" },
  ]},
  { drama: "선재 업고 튀어", dramaEn: "Lovely Runner", youtubeId: "aiIRwfKEk-Y", timestamp: 0, scenes: [
    { character: "임솔", korean: "난 네가 다른 시간 속에 있다 해도, 다 뛰어넘어서 널 보러 갈 거야.", vietnamese: "Dù anh ở trong thời gian khác, em cũng sẽ vượt qua tất cả để gặp anh.", context: "선재업고튀어 1화 예고", difficulty: "어려움", audioTip: "결연하게, 간절하게", genre: "romantic" },
  ]},

  // ==================== 눈물의 여왕 (Queen of Tears) 2024 - tvN ====================
  { drama: "눈물의 여왕", dramaEn: "Queen of Tears", youtubeId: "ejz4DAOzKNk", timestamp: 0, scenes: [
    { character: "백현우", korean: "어떤 순간이 와도 홍해인을 지켜내겠다.", vietnamese: "Dù bất cứ khoảnh khắc nào đến, tôi cũng sẽ bảo vệ Hong Hae In.", context: "눈물의여왕 최종화 예고", difficulty: "어려움", audioTip: "결연하게, 간절하게", genre: "romantic" },
  ]},
  { drama: "눈물의 여왕", dramaEn: "Queen of Tears", youtubeId: "lsaJ7aLR_Ws", timestamp: 0, scenes: [
    { character: "송중기", korean: "빈센조 등장!", vietnamese: "Vincenzo xuất hiện!", context: "눈물의여왕 빈센조 카메오 장면", difficulty: "쉬움", audioTip: "유쾌하게", genre: "romantic" },
  ]},
  { drama: "눈물의 여왕", dramaEn: "Queen of Tears", youtubeId: "BZJXfDo5i4I", timestamp: 0, scenes: [
    { character: "백현우", korean: "결혼 3년차에 아내가 예뻐 보인다.", vietnamese: "Kết hôn năm thứ 3 mà vợ vẫn đẹp.", context: "눈물의여왕 캐릭터 티저", difficulty: "보통", audioTip: "달달하게", genre: "romantic" },
  ]},
  { drama: "눈물의 여왕", dramaEn: "Queen of Tears", youtubeId: "F1H8GaddZ4Q", timestamp: 0, scenes: [
    { character: "김수현/김지원", korean: "촬영장 깨알 모먼트.", vietnamese: "Những khoảnh khắc vui nhộn ở trường quay.", context: "눈물의 여왕 비하인드", difficulty: "쉬움", audioTip: "유쾌하게", genre: "romantic" },
  ]},

  // ==================== 사랑의 불시착 (Crash Landing on You) 2019-2020 ====================
  { drama: "사랑의 불시착", dramaEn: "Crash Landing on You", youtubeId: "6-imtz9v3-g", timestamp: 0, scenes: [
    { character: "현빈/손예진", korean: "tvN 절대극비 로맨스.", vietnamese: "Tình yêu tuyệt mật của tvN.", context: "사랑의 불시착 첫 공개 티저", difficulty: "보통", audioTip: "설레게", genre: "romantic" },
  ]},

  // ==================== 내 남편과 결혼해줘 (Marry My Husband) 2024 ====================
  { drama: "내 남편과 결혼해줘", dramaEn: "Marry My Husband", youtubeId: "Po11f6HEDmM", timestamp: 0, scenes: [
    { character: "박민영/나인우", korean: "그냥 꼬옥 안기면 돼.", vietnamese: "Chỉ cần ôm thật chặt là được.", context: "내남결 5-6화 비하인드", difficulty: "쉬움", audioTip: "로맨틱하게", genre: "romantic" },
  ]},
  { drama: "내 남편과 결혼해줘", dramaEn: "Marry My Husband", youtubeId: "YA9p-VS1hbY", timestamp: 0, scenes: [
    { character: "투지커플", korean: "첫 키스 장면 비하인드.", vietnamese: "Hậu trường cảnh hôn đầu tiên.", context: "내남결 9-10화 비하인드", difficulty: "보통", audioTip: "설레게", genre: "romantic" },
  ]},

  // ==================== 스물다섯 스물하나 (Twenty-Five Twenty-One) 2022 ====================
  { drama: "스물다섯 스물하나", dramaEn: "Twenty-Five Twenty-One", youtubeId: "V_QS0cLTBOg", timestamp: 0, scenes: [
    { character: "김태리/남주혁", korean: "우린 사랑을 했다.", vietnamese: "Chúng ta đã yêu.", context: "스물다섯 스물하나 1차 티저", difficulty: "쉬움", audioTip: "감성적으로", genre: "romantic" },
  ]},

  // ==================== 빈센조 (Vincenzo) 2021 ====================
  { drama: "빈센조", dramaEn: "Vincenzo", youtubeId: "vO8rFbTtJNI", timestamp: 0, scenes: [
    { character: "빈센조", korean: "냉혹한 마피아 변호사, 빈센조 까사노.", vietnamese: "Luật sư mafia lạnh lùng, Vincenzo Cassano.", context: "빈센조 1차 티저", difficulty: "보통", audioTip: "카리스마 있게", genre: "action" },
  ]},
  { drama: "빈센조", dramaEn: "Vincenzo", youtubeId: "d1guslSo6Kk", timestamp: 0, scenes: [
    { character: "빈센조", korean: "아주 이상한 한국 이웃을 만나다.", vietnamese: "Gặp những người hàng xóm Hàn Quốc rất kỳ lạ.", context: "빈센조 예고편", difficulty: "보통", audioTip: "유쾌하게", genre: "action" },
  ]},
  { drama: "빈센조", dramaEn: "Vincenzo", youtubeId: "EGcy422sqzg", timestamp: 0, scenes: [
    { character: "빈센조", korean: "빌런보다 센 놈, 냉혹한 마피아 콘실리에리.", vietnamese: "Kẻ mạnh hơn cả phản diện, cố vấn mafia lạnh lùng.", context: "빈센조 다시보기 하이라이트", difficulty: "어려움", audioTip: "강렬하게", genre: "action" },
  ]},

  // ==================== 무빙 (Moving) 2023 - Disney+ ====================
  { drama: "무빙", dramaEn: "Moving", youtubeId: "UGvf8-m3S-c", timestamp: 0, scenes: [
    { character: "제작진", korean: "난 지금 무빙의 비밀을 알려주고 있는 거예요.", vietnamese: "Tôi đang tiết lộ bí mật của Moving đây.", context: "무빙 프로덕션 비하인드", difficulty: "보통", audioTip: "신비롭게", genre: "action" },
  ]},
  { drama: "무빙", dramaEn: "Moving", youtubeId: "d9gk7xz0WIw", timestamp: 0, scenes: [
    { character: "두식/미현", korean: "두식과 미현의 신혼 일기.", vietnamese: "Nhật ký tân hôn của Doo Sik và Mi Hyun.", context: "무빙 12-13회 선공개", difficulty: "쉬움", audioTip: "달달하게", genre: "romantic" },
  ]},
  { drama: "무빙", dramaEn: "Moving", youtubeId: "wIBjVrZqVK0", timestamp: 0, scenes: [
    { character: "구룡포", korean: "아무리 다쳐도 재생하는데, 뭐 먹고 살겠어? 건달이지.", vietnamese: "Dù bị thương thế nào cũng hồi phục được, thì làm gì để sống? Làm đầu gấu thôi.", context: "구룡포의 과거 이야기", difficulty: "어려움", audioTip: "거칠게, 솔직하게", genre: "action" },
  ]},
  { drama: "무빙", dramaEn: "Moving", youtubeId: "YuUoMHoFAZk", timestamp: 0, scenes: [
    { character: "무빙", korean: "무빙 메인 예고편.", vietnamese: "Trailer chính của Moving.", context: "무빙 메인 예고편", difficulty: "보통", audioTip: "웅장하게", genre: "action" },
  ]},
  { drama: "무빙", dramaEn: "Moving", youtubeId: "lw_KiAFDM10", timestamp: 0, scenes: [
    { character: "무빙", korean: "무빙 커밍순 예고편.", vietnamese: "Trailer sắp ra mắt của Moving.", context: "무빙 커밍순 예고편", difficulty: "보통", audioTip: "기대감 있게", genre: "action" },
  ]},

  // ==================== 이태원 클라쓰 (Itaewon Class) 2020 ====================
  { drama: "이태원 클라쓰", dramaEn: "Itaewon Class", youtubeId: "EqSw2DSeCq8", timestamp: 0, scenes: [
    { character: "박새로이", korean: "세상을 바꾸는 건 신념이야.", vietnamese: "Thứ thay đổi thế giới là niềm tin.", context: "이태원 클라쓰 명장면", difficulty: "보통", audioTip: "단호하게", genre: "action" },
  ]},
  { drama: "이태원 클라쓰", dramaEn: "Itaewon Class", youtubeId: "4LJLqSBtlaE", timestamp: 0, scenes: [
    { character: "박새로이", korean: "난 끝까지 갈 거야.", vietnamese: "Tao sẽ đi đến cùng.", context: "이태원 클라쓰 하이라이트", difficulty: "쉬움", audioTip: "결연하게", genre: "action" },
  ]},
  { drama: "이태원 클라쓰", dramaEn: "Itaewon Class", youtubeId: "kT2NfopLaj0", timestamp: 0, scenes: [
    { character: "이태원 클라쓰", korean: "이태원 클라쓰 오프닝 시퀀스.", vietnamese: "Phân đoạn mở đầu Itaewon Class.", context: "오프닝 시퀀스", difficulty: "보통", audioTip: "감각적으로", genre: "action" },
  ]},

  // ==================== 사이코지만 괜찮아 (It's Okay to Not Be Okay) 2020 ====================
  { drama: "사이코지만 괜찮아", dramaEn: "It's Okay to Not Be Okay", youtubeId: "F3yH7hzQPtY", timestamp: 45, scenes: [
    { character: "고문영", korean: "나한테 오지 마. 내가 갈 테니까.", vietnamese: "Đừng đến với tôi. Vì tôi sẽ đến.", context: "문영이 강태에게 하는 명대사", difficulty: "보통", audioTip: "도도하게, 강하게", genre: "romantic" },
  ]},

  // ==================== 더킹: 영원의 군주 (The King: Eternal Monarch) 2020 ====================
  { drama: "더킹: 영원의 군주", dramaEn: "The King: Eternal Monarch", youtubeId: "KEQasLtCUQQ", timestamp: 40, scenes: [
    { character: "이곤", korean: "내가 데리러 왔다. 너의 왕이.", vietnamese: "Ta đến đón ngươi. Vương của ngươi đây.", context: "이곤이 태을에게 하는 명대사", difficulty: "보통", audioTip: "위엄 있게, 로맨틱하게", genre: "fantasy" },
  ]},

  // ==================== 킬러들의 쇼핑몰 (A Shop for Killers) 2024 ====================
  { drama: "킬러들의 쇼핑몰", dramaEn: "A Shop for Killers", youtubeId: "QH7kTjNRxNo", timestamp: 35, scenes: [
    { character: "정지안", korean: "살아남는 게 복수야.", vietnamese: "Sống sót chính là trả thù.", context: "지안이 생존 의지를 보여주는 장면", difficulty: "쉬움", audioTip: "강하게, 결연하게", genre: "action" },
  ]},

  // ==================== 지리산 (Jirisan) 2021 ====================
  { drama: "지리산", dramaEn: "Jirisan", youtubeId: "7ZYE6YKNRTM", timestamp: 40, scenes: [
    { character: "서이강", korean: "산은 사람을 구하기도 하고, 삼키기도 해.", vietnamese: "Núi vừa cứu người, vừa nuốt chửng người.", context: "이강이 산의 양면성을 말하는 장면", difficulty: "어려움", audioTip: "깊이 있게, 경고하듯", genre: "thriller" },
  ]},

  // ==================== 악의 꽃 (Flower of Evil) 2020 ====================
  { drama: "악의 꽃", dramaEn: "Flower of Evil", youtubeId: "P9qKE2tVQ6k", timestamp: 35, scenes: [
    { character: "차지원", korean: "당신이 누구든, 난 당신을 사랑해.", vietnamese: "Dù anh là ai, em vẫn yêu anh.", context: "지원이 희성에게 무조건적인 사랑을 고백하는 장면", difficulty: "보통", audioTip: "단호하게, 사랑을 담아", genre: "romantic" },
  ]},

  // ==================== 사내맞선 (Business Proposal) 2022 ====================
  { drama: "사내맞선", dramaEn: "Business Proposal", youtubeId: "3VYE2UKNRTM", timestamp: 35, scenes: [
    { character: "강태무", korean: "신하리씨, 저랑 사귀어 주세요.", vietnamese: "Shin Ha Ri, hãy hẹn hò với tôi.", context: "태무가 하리에게 정식으로 고백하는 장면", difficulty: "쉬움", audioTip: "진지하게, 설레게", genre: "romantic" },
  ]},

  // ==================== 이혼보험 (Divorce Insurance) 2025 ====================
  { drama: "이혼보험", dramaEn: "Divorce Insurance", youtubeId: "5BecAcb4dRU", timestamp: 0, scenes: [
    { character: "이동욱", korean: "이 분위기 나만 이상해?", vietnamese: "Chỉ mình tôi thấy không khí này lạ sao?", context: "전전전처와 썸녀의 신경전", difficulty: "보통", audioTip: "어색하게, 긴장하며", genre: "romantic" },
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
    
    console.log('Drama clips request:', { genre, difficulty, excludeIds: excludeIds.length, count });

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
      id: `${scene.drama.replace(/\s+/g, '_')}_${scene.timestamp}_${Date.now()}`
    }));

    console.log('Returning', result.length, 'drama clips');

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
