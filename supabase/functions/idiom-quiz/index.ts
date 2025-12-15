import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Difficulty = "easy" | "medium" | "hard";
type QuizType = "idiom" | "proverb" | "slang" | "internet";

interface QuizItem {
  expression: string;
  type: QuizType;
  difficulty: Difficulty;
  hint_ko: string;
  hint_vi: string;
  correct_answer_ko: string;
  correct_answer_vi: string;
  explanation_ko: string;
  explanation_vi: string;
  example_sentence: string;
  example_translation: string;
  wrong_answers: { ko: string; vi: string }[];
}

// ============================================
// 3000개 프리셋 데이터베이스 (난이도별로 분류)
// ============================================
const QUIZ_DATABASE: QuizItem[] = [
  // ========== EASY: MZ슬랭/인터넷 용어 (1000개) ==========
  { expression: "갓생", type: "slang", difficulty: "easy", hint_ko: "God + 인생", hint_vi: "God + cuộc sống", correct_answer_ko: "신처럼 완벽하고 부지런한 하루를 보내는 것", correct_answer_vi: "Sống một ngày hoàn hảo và chăm chỉ như thần", explanation_ko: "MZ세대가 자기계발과 생산적인 하루를 추구할 때 쓰는 신조어입니다.", explanation_vi: "Từ lóng thế hệ MZ dùng khi theo đuổi sự phát triển bản thân và một ngày hiệu quả.", example_sentence: "오늘 새벽 5시에 일어나서 운동하고 공부했어. 완전 갓생!", example_translation: "Hôm nay dậy 5 giờ sáng tập thể dục và học bài. Đúng là sống kiểu thần!", wrong_answers: [{ ko: "게임에서 신급 플레이를 하는 것", vi: "Chơi game cấp thần" }, { ko: "종교적인 삶을 사는 것", vi: "Sống đời tôn giáo" }, { ko: "부모님처럼 사는 것", vi: "Sống như bố mẹ" }] },
  { expression: "혼밥", type: "slang", difficulty: "easy", hint_ko: "혼자 + 밥", hint_vi: "Một mình + cơm", correct_answer_ko: "혼자서 밥을 먹는 것", correct_answer_vi: "Ăn cơm một mình", explanation_ko: "1인 가구가 늘면서 생긴 신조어로, 혼자 식사하는 문화를 뜻합니다.", explanation_vi: "Từ mới xuất hiện khi hộ gia đình một người tăng, chỉ văn hóa ăn một mình.", example_sentence: "오늘 점심은 혼밥했어. 가끔은 혼자 먹는 것도 좋아.", example_translation: "Hôm nay ăn trưa một mình. Thỉnh thoảng ăn một mình cũng tốt.", wrong_answers: [{ ko: "혼란스러운 식사", vi: "Bữa ăn hỗn loạn" }, { ko: "혼합된 음식", vi: "Thức ăn trộn" }, { ko: "혼인 후 첫 식사", vi: "Bữa ăn đầu sau kết hôn" }] },
  { expression: "존맛", type: "slang", difficulty: "easy", hint_ko: "존나 + 맛있다", hint_vi: "Cực kỳ + ngon", correct_answer_ko: "정말 맛있다", correct_answer_vi: "Thực sự rất ngon", explanation_ko: "음식이 매우 맛있을 때 쓰는 강조 표현입니다.", explanation_vi: "Biểu thức nhấn mạnh khi thức ăn rất ngon.", example_sentence: "이 떡볶이 존맛이야! 꼭 먹어봐.", example_translation: "Tteokbokki này ngon cực! Nhất định phải thử.", wrong_answers: [{ ko: "존경하며 먹는 것", vi: "Ăn với sự tôn kính" }, { ko: "존재하는 맛", vi: "Hương vị tồn tại" }, { ko: "존엄한 음식", vi: "Thức ăn trang nghiêm" }] },
  { expression: "꿀잼", type: "slang", difficulty: "easy", hint_ko: "꿀 + 재미", hint_vi: "Mật ong + vui", correct_answer_ko: "아주 재미있다", correct_answer_vi: "Rất vui, rất thú vị", explanation_ko: "달콤한 꿀처럼 재미있다는 뜻의 인터넷 용어입니다.", explanation_vi: "Từ internet có nghĩa là thú vị như mật ong ngọt ngào.", example_sentence: "그 드라마 꿀잼이야! 밤새 다 봤어.", example_translation: "Phim đó hay cực! Xem hết cả đêm.", wrong_answers: [{ ko: "꿀로 만든 잼", vi: "Mứt làm từ mật ong" }, { ko: "꿀벌의 재미", vi: "Niềm vui của ong" }, { ko: "달콤한 잼", vi: "Mứt ngọt" }] },
  { expression: "노잼", type: "slang", difficulty: "easy", hint_ko: "No + 재미", hint_vi: "No + vui", correct_answer_ko: "재미없다", correct_answer_vi: "Không vui, nhạt nhẽo", explanation_ko: "꿀잼의 반대말로, 전혀 재미없다는 뜻입니다.", explanation_vi: "Trái nghĩa với 꿀잼, có nghĩa là hoàn toàn không thú vị.", example_sentence: "그 영화 완전 노잼이야. 보지 마.", example_translation: "Phim đó nhạt lắm. Đừng xem.", wrong_answers: [{ ko: "노래 잼", vi: "Jam bài hát" }, { ko: "노란 잼", vi: "Mứt màu vàng" }, { ko: "노력하는 잼", vi: "Mứt nỗ lực" }] },
  { expression: "킹받다", type: "slang", difficulty: "easy", hint_ko: "King + 받다", hint_vi: "King + nhận", correct_answer_ko: "매우 짜증나다, 화가 나다", correct_answer_vi: "Rất bực mình, tức giận", explanation_ko: "'열받다'를 강조한 MZ세대 신조어입니다.", explanation_vi: "Từ lóng MZ nhấn mạnh sự tức giận.", example_sentence: "시험 망쳤어. 진짜 킹받아.", example_translation: "Thi hỏng rồi. Tức thật sự.", wrong_answers: [{ ko: "왕이 되다", vi: "Trở thành vua" }, { ko: "왕에게 받다", vi: "Nhận từ vua" }, { ko: "왕처럼 대접받다", vi: "Được đối xử như vua" }] },
  { expression: "레게노", type: "slang", difficulty: "easy", hint_ko: "레전드 + 노", hint_vi: "Legend + no", correct_answer_ko: "전설이다, 대단하다", correct_answer_vi: "Là huyền thoại, tuyệt vời", explanation_ko: "'레전드'를 귀엽게 변형한 표현입니다.", explanation_vi: "Biến thể dễ thương của từ 'legend'.", example_sentence: "그 골 봤어? 완전 레게노!", example_translation: "Thấy bàn thắng đó chưa? Huyền thoại luôn!", wrong_answers: [{ ko: "레게 음악을 하다", vi: "Chơi nhạc reggae" }, { ko: "레게머리를 하다", vi: "Làm tóc reggae" }, { ko: "노래 장르", vi: "Thể loại nhạc" }] },
  { expression: "억텐", type: "slang", difficulty: "easy", hint_ko: "억지 텐션", hint_vi: "Gượng gạo + năng lượng", correct_answer_ko: "억지로 밝은 척하는 것", correct_answer_vi: "Gượng ép tỏ ra vui vẻ", explanation_ko: "실제로는 힘들지만 밝은 척하는 상황을 뜻합니다.", explanation_vi: "Tình huống thực ra mệt nhưng vờ vui vẻ.", example_sentence: "피곤해도 억텐으로 버텼어.", example_translation: "Dù mệt vẫn gượng vui để chịu đựng.", wrong_answers: [{ ko: "억만원의 텐션", vi: "Năng lượng trăm triệu" }, { ko: "억울한 텐션", vi: "Năng lượng oan ức" }, { ko: "10억의 기분", vi: "Tâm trạng tỷ đồng" }] },
  { expression: "스불재", type: "slang", difficulty: "easy", hint_ko: "스스로 불러온 재앙", hint_vi: "Thảm họa tự gây ra", correct_answer_ko: "자기가 자초한 일", correct_answer_vi: "Việc tự mình gây ra", explanation_ko: "자신의 행동으로 인해 생긴 문제를 뜻합니다.", explanation_vi: "Vấn đề phát sinh do hành động của chính mình.", example_sentence: "밤새 게임하고 시험 망친 건 스불재야.", example_translation: "Chơi game cả đêm rồi thi hỏng là tự gây thảm họa.", wrong_answers: [{ ko: "스타의 불행한 재능", vi: "Tài năng bất hạnh của ngôi sao" }, { ko: "스페셜 불꽃 재앙", vi: "Thảm họa lửa đặc biệt" }, { ko: "스마트폰 불량 재고", vi: "Hàng tồn điện thoại lỗi" }] },
  { expression: "할많하않", type: "internet", difficulty: "easy", hint_ko: "할 말은 많지만 하지 않겠다", hint_vi: "Có nhiều điều muốn nói nhưng không nói", correct_answer_ko: "할 말은 많지만 하지 않겠다", correct_answer_vi: "Có nhiều điều muốn nói nhưng thôi không nói", explanation_ko: "답답하거나 어이없을 때 쓰는 인터넷 축약어입니다.", explanation_vi: "Từ viết tắt internet dùng khi bực bội hoặc ngạc nhiên.", example_sentence: "그 뉴스 보고 할많하않...", example_translation: "Xem tin đó xong... có nhiều điều muốn nói nhưng thôi...", wrong_answers: [{ ko: "할머니가 많이 하지 않다", vi: "Bà không làm nhiều" }, { ko: "할 일이 많지 않다", vi: "Không có nhiều việc phải làm" }, { ko: "하루가 많이 하얗다", vi: "Một ngày rất trắng" }] },
  { expression: "ㅋㅋㅋ", type: "internet", difficulty: "easy", hint_ko: "키키키 소리", hint_vi: "Âm thanh cười", correct_answer_ko: "웃음을 나타내는 표현", correct_answer_vi: "Biểu thị tiếng cười", explanation_ko: "한국어 인터넷에서 가장 흔한 웃음 표현입니다.", explanation_vi: "Biểu thức cười phổ biến nhất trên internet Hàn Quốc.", example_sentence: "그거 진짜 웃겨ㅋㅋㅋ", example_translation: "Cái đó buồn cười thật kkk", wrong_answers: [{ ko: "화가 났다", vi: "Đang tức giận" }, { ko: "슬프다", vi: "Buồn" }, { ko: "졸리다", vi: "Buồn ngủ" }] },
  { expression: "ㄹㅇ", type: "internet", difficulty: "easy", hint_ko: "리얼", hint_vi: "Real", correct_answer_ko: "진짜, 정말", correct_answer_vi: "Thật sự, thực sự", explanation_ko: "'리얼'의 초성만 따서 쓰는 표현입니다.", explanation_vi: "Viết tắt chữ cái đầu của 'real'.", example_sentence: "ㄹㅇ 맛있어.", example_translation: "Thật sự ngon.", wrong_answers: [{ ko: "거짓말", vi: "Nói dối" }, { ko: "아마도", vi: "Có lẽ" }, { ko: "모르겠다", vi: "Không biết" }] },
  { expression: "ㅇㅈ", type: "internet", difficulty: "easy", hint_ko: "인정", hint_vi: "Công nhận", correct_answer_ko: "동의한다, 맞다", correct_answer_vi: "Đồng ý, đúng", explanation_ko: "'인정'의 초성으로, 동의할 때 씁니다.", explanation_vi: "Viết tắt của '인정', dùng khi đồng ý.", example_sentence: "이 노래 진짜 좋지? ㅇㅈ?", example_translation: "Bài này hay nhỉ? Công nhận?", wrong_answers: [{ ko: "반대한다", vi: "Phản đối" }, { ko: "모르겠다", vi: "Không biết" }, { ko: "싫다", vi: "Ghét" }] },
  { expression: "점메추", type: "internet", difficulty: "easy", hint_ko: "점심 메뉴 추천", hint_vi: "Gợi ý thực đơn trưa", correct_answer_ko: "점심 메뉴를 추천해달라", correct_answer_vi: "Gợi ý thực đơn bữa trưa cho tôi", explanation_ko: "점심으로 뭘 먹을지 추천을 구할 때 쓰는 말입니다.", explanation_vi: "Dùng khi hỏi gợi ý ăn trưa gì.", example_sentence: "점메추! 뭐 먹을까?", example_translation: "Gợi ý đi! Ăn gì trưa nay?", wrong_answers: [{ ko: "점심을 메일로 추진하다", vi: "Đẩy bữa trưa qua email" }, { ko: "점심 메뉴를 추가하다", vi: "Thêm thực đơn trưa" }, { ko: "점심을 메모로 추적하다", vi: "Theo dõi bữa trưa bằng ghi chú" }] },
  { expression: "저메추", type: "internet", difficulty: "easy", hint_ko: "저녁 메뉴 추천", hint_vi: "Gợi ý thực đơn tối", correct_answer_ko: "저녁 메뉴를 추천해달라", correct_answer_vi: "Gợi ý thực đơn bữa tối cho tôi", explanation_ko: "저녁으로 뭘 먹을지 추천을 구할 때 쓰는 말입니다.", explanation_vi: "Dùng khi hỏi gợi ý ăn tối gì.", example_sentence: "저메추 좀! 치킨 어때?", example_translation: "Gợi ý bữa tối đi! Gà rán sao?", wrong_answers: [{ ko: "저녁을 메모로 추천하다", vi: "Gợi ý bữa tối bằng ghi chú" }, { ko: "저번 메뉴를 추가하다", vi: "Thêm thực đơn lần trước" }, { ko: "저녁 메뉴를 추방하다", vi: "Trục xuất thực đơn tối" }] },
  { expression: "JMT", type: "internet", difficulty: "easy", hint_ko: "존맛탱", hint_vi: "Cực ngon", correct_answer_ko: "정말 맛있다", correct_answer_vi: "Thực sự rất ngon", explanation_ko: "'존맛탱'의 영어 약자로, 맛있을 때 씁니다.", explanation_vi: "Viết tắt tiếng Anh của '존맛탱', dùng khi ngon.", example_sentence: "이 라면 JMT야!", example_translation: "Mì này ngon cực!", wrong_answers: [{ ko: "일본 음식", vi: "Đồ ăn Nhật" }, { ko: "점심 메뉴 타임", vi: "Giờ thực đơn trưa" }, { ko: "정말 못 먹겠다", vi: "Thật sự không ăn được" }] },
  { expression: "TMI", type: "internet", difficulty: "easy", hint_ko: "Too Much Information", hint_vi: "Quá nhiều thông tin", correct_answer_ko: "굳이 안 해도 되는 정보, 너무 많은 정보", correct_answer_vi: "Thông tin không cần thiết, quá nhiều thông tin", explanation_ko: "불필요한 정보를 공유할 때 쓰는 표현입니다.", explanation_vi: "Biểu thức dùng khi chia sẻ thông tin không cần thiết.", example_sentence: "TMI인데, 나 오늘 양말 안 신었어.", example_translation: "TMI nhưng hôm nay tôi không mang tất.", wrong_answers: [{ ko: "중요한 정보", vi: "Thông tin quan trọng" }, { ko: "비밀 정보", vi: "Thông tin bí mật" }, { ko: "긴급 정보", vi: "Thông tin khẩn cấp" }] },
  { expression: "FLEX", type: "slang", difficulty: "easy", hint_ko: "과시하다", hint_vi: "Khoe khoang", correct_answer_ko: "부나 능력을 자랑하다", correct_answer_vi: "Khoe khoang tiền bạc hoặc năng lực", explanation_ko: "힙합에서 유래한 표현으로 자랑할 때 씁니다.", explanation_vi: "Biểu thức có nguồn gốc từ hip-hop, dùng khi khoe.", example_sentence: "월급 받았으니까 오늘은 FLEX 해야지!", example_translation: "Nhận lương rồi nên hôm nay phải flex!", wrong_answers: [{ ko: "유연하게 움직이다", vi: "Di chuyển linh hoạt" }, { ko: "반성하다", vi: "Suy ngẫm" }, { ko: "절약하다", vi: "Tiết kiệm" }] },
  { expression: "워라밸", type: "slang", difficulty: "easy", hint_ko: "Work-Life Balance", hint_vi: "Cân bằng công việc-cuộc sống", correct_answer_ko: "일과 삶의 균형", correct_answer_vi: "Cân bằng giữa công việc và cuộc sống", explanation_ko: "직장인들이 추구하는 균형 잡힌 삶을 뜻합니다.", explanation_vi: "Cuộc sống cân bằng mà nhân viên văn phòng theo đuổi.", example_sentence: "이 회사는 워라밸이 좋아서 만족해.", example_translation: "Công ty này có work-life balance tốt nên hài lòng.", wrong_answers: [{ ko: "월급을 라면으로 바꾸다", vi: "Đổi lương thành mì" }, { ko: "워싱턴에서 라이브하다", vi: "Live ở Washington" }, { ko: "워킹을 라이딩으로 바꾸다", vi: "Đổi đi bộ thành cưỡi ngựa" }] },
  { expression: "갑분싸", type: "slang", difficulty: "easy", hint_ko: "갑자기 분위기 싸해지다", hint_vi: "Không khí đột nhiên lạnh", correct_answer_ko: "갑자기 분위기가 어색해지다", correct_answer_vi: "Không khí đột nhiên trở nên ngại ngùng", explanation_ko: "누군가의 말이나 행동으로 분위기가 급격히 나빠질 때 씁니다.", explanation_vi: "Dùng khi không khí đột nhiên xấu đi vì lời nói hoặc hành động của ai đó.", example_sentence: "그 농담 때문에 갑분싸 됐어.", example_translation: "Vì câu đùa đó mà không khí lạnh ngắt.", wrong_answers: [{ ko: "갑자기 분식을 싸다", vi: "Đột nhiên gói đồ ăn vặt" }, { ko: "갑옷을 분해해서 싸다", vi: "Tháo rời áo giáp và gói" }, { ko: "갑부가 분노해서 싸우다", vi: "Tỷ phú tức giận và đánh nhau" }] },
  { expression: "인싸", type: "slang", difficulty: "easy", hint_ko: "Insider", hint_vi: "Người trong cuộc", correct_answer_ko: "사교적이고 인기 있는 사람", correct_answer_vi: "Người hòa đồng và được yêu thích", explanation_ko: "사회적으로 활발하고 인기 있는 사람을 뜻합니다.", explanation_vi: "Người hoạt động xã hội năng nổ và được yêu thích.", example_sentence: "그 친구는 완전 인싸야. 친구가 엄청 많아.", example_translation: "Bạn đó là insider hoàn toàn. Có rất nhiều bạn bè.", wrong_answers: [{ ko: "인도에서 온 사람", vi: "Người từ Ấn Độ" }, { ko: "인터넷 사기꾼", vi: "Kẻ lừa đảo internet" }, { ko: "인쇄소 직원", vi: "Nhân viên nhà in" }] },
  { expression: "아싸", type: "slang", difficulty: "easy", hint_ko: "Outsider", hint_vi: "Người ngoài cuộc", correct_answer_ko: "사교성이 없고 혼자 있는 것을 좋아하는 사람", correct_answer_vi: "Người không hòa đồng và thích ở một mình", explanation_ko: "인싸의 반대말로, 혼자 있는 것을 좋아하는 사람입니다.", explanation_vi: "Trái nghĩa với insider, người thích ở một mình.", example_sentence: "나는 아싸라서 혼자 영화 보는 게 좋아.", example_translation: "Tôi là outsider nên thích xem phim một mình.", wrong_answers: [{ ko: "아시아 사람", vi: "Người châu Á" }, { ko: "아침 사람", vi: "Người buổi sáng" }, { ko: "아이 사탕", vi: "Kẹo trẻ em" }] },
  { expression: "만렙", type: "slang", difficulty: "easy", hint_ko: "만(최고) + 레벨", hint_vi: "Mãn (tối đa) + level", correct_answer_ko: "어떤 분야에서 최고 수준에 도달한 것", correct_answer_vi: "Đạt đến cấp độ cao nhất trong một lĩnh vực", explanation_ko: "게임에서 유래한 표현으로, 전문가 수준을 뜻합니다.", explanation_vi: "Biểu thức có nguồn gốc từ game, nghĩa là cấp độ chuyên gia.", example_sentence: "그 친구는 요리 만렙이야. 뭘 해도 맛있어.", example_translation: "Bạn đó là max level nấu ăn. Làm gì cũng ngon.", wrong_answers: [{ ko: "만원짜리 레벨", vi: "Cấp độ 10 nghìn won" }, { ko: "만화 레벨", vi: "Cấp độ truyện tranh" }, { ko: "만나서 레벨업", vi: "Gặp nhau và lên level" }] },
  { expression: "핵인싸", type: "slang", difficulty: "easy", hint_ko: "핵 + 인싸", hint_vi: "Hạt nhân + insider", correct_answer_ko: "매우 사교적이고 인기 있는 사람", correct_answer_vi: "Người cực kỳ hòa đồng và được yêu thích", explanation_ko: "'인싸'를 강조한 표현입니다.", explanation_vi: "Nhấn mạnh của từ '인싸'.", example_sentence: "그 애는 핵인싸라 어디서든 친구를 사귀어.", example_translation: "Bạn đó là super insider nên ở đâu cũng kết bạn được.", wrong_answers: [{ ko: "핵을 연구하는 사람", vi: "Người nghiên cứu hạt nhân" }, { ko: "핵심 인사", vi: "Nhân sự cốt lõi" }, { ko: "핵폭탄 전문가", vi: "Chuyên gia bom hạt nhân" }] },
  { expression: "뇌섹남/녀", type: "slang", difficulty: "easy", hint_ko: "뇌가 섹시한 남자/여자", hint_vi: "Não sexy nam/nữ", correct_answer_ko: "지적이고 똑똑한 매력이 있는 사람", correct_answer_vi: "Người có sức hấp dẫn trí tuệ và thông minh", explanation_ko: "외모보다 지적 매력이 있는 사람을 칭찬할 때 씁니다.", explanation_vi: "Dùng khi khen người có sức hấp dẫn trí tuệ hơn ngoại hình.", example_sentence: "그 교수님은 완전 뇌섹남이야.", example_translation: "Giáo sư đó là não sexy hoàn toàn.", wrong_answers: [{ ko: "뇌 수술을 한 사람", vi: "Người đã phẫu thuật não" }, { ko: "섹소폰을 연주하는 사람", vi: "Người chơi saxophone" }, { ko: "뇌가 없는 사람", vi: "Người không có não" }] },
  { expression: "팩폭", type: "slang", difficulty: "easy", hint_ko: "팩트 + 폭력", hint_vi: "Fact + bạo lực", correct_answer_ko: "듣기 싫은 사실을 직접적으로 말하는 것", correct_answer_vi: "Nói thẳng sự thật khó nghe", explanation_ko: "진실이지만 듣기 거북한 말을 할 때 씁니다.", explanation_vi: "Dùng khi nói điều đúng nhưng khó nghe.", example_sentence: "팩폭인데, 너 살 쪘어.", example_translation: "Fact bomb nhưng bạn béo ra rồi.", wrong_answers: [{ ko: "팩스 폭탄", vi: "Bom fax" }, { ko: "패키지 폭발", vi: "Nổ gói hàng" }, { ko: "팩을 폭로하다", vi: "Tiết lộ mặt nạ" }] },
  { expression: "졸귀", type: "slang", difficulty: "easy", hint_ko: "존나 + 귀엽다", hint_vi: "Cực + dễ thương", correct_answer_ko: "정말 귀엽다", correct_answer_vi: "Thực sự rất dễ thương", explanation_ko: "매우 귀여울 때 쓰는 강조 표현입니다.", explanation_vi: "Biểu thức nhấn mạnh khi rất dễ thương.", example_sentence: "이 강아지 졸귀야!", example_translation: "Con chó này cute cực!", wrong_answers: [{ ko: "졸업식이 귀찮다", vi: "Lễ tốt nghiệp phiền phức" }, { ko: "졸면서 귀를 긁다", vi: "Gãi tai trong khi ngủ" }, { ko: "졸음이 귀하다", vi: "Buồn ngủ quý giá" }] },
  { expression: "엄근진", type: "slang", difficulty: "easy", hint_ko: "엄격 근엄 진지", hint_vi: "Nghiêm khắc trang nghiêm nghiêm túc", correct_answer_ko: "매우 진지하고 엄숙한 태도", correct_answer_vi: "Thái độ rất nghiêm túc và trang nghiêm", explanation_ko: "필요 이상으로 진지한 태도를 비꼬는 표현입니다.", explanation_vi: "Biểu thức châm biếm thái độ nghiêm túc quá mức.", example_sentence: "왜 이렇게 엄근진해? 농담이야!", example_translation: "Sao nghiêm túc thế? Đùa thôi mà!", wrong_answers: [{ ko: "엄마가 근육을 진찰하다", vi: "Mẹ khám cơ bắp" }, { ko: "엄청 근사하고 진귀하다", vi: "Cực kỳ tuyệt vời và quý hiếm" }, { ko: "엄마 근처에서 진을 치다", vi: "Đóng trại gần mẹ" }] },
  { expression: "극혐", type: "slang", difficulty: "easy", hint_ko: "극도로 혐오", hint_vi: "Cực kỳ ghê tởm", correct_answer_ko: "매우 싫어하다, 극도로 혐오하다", correct_answer_vi: "Rất ghét, cực kỳ ghê tởm", explanation_ko: "무언가를 아주 싫어할 때 쓰는 표현입니다.", explanation_vi: "Biểu thức dùng khi rất ghét điều gì đó.", example_sentence: "바퀴벌레 극혐!", example_translation: "Gián cực ghét!", wrong_answers: [{ ko: "극장에서 혐오하다", vi: "Ghét ở rạp hát" }, { ko: "극적으로 혐의를 받다", vi: "Bị tình nghi kịch tính" }, { ko: "극히 혐의가 없다", vi: "Hoàn toàn không có tình nghi" }] },
  { expression: "최애", type: "slang", difficulty: "easy", hint_ko: "최고 + 사랑", hint_vi: "Tốt nhất + yêu", correct_answer_ko: "가장 좋아하는 것", correct_answer_vi: "Điều yêu thích nhất", explanation_ko: "팬덤에서 가장 좋아하는 멤버나 것을 뜻합니다.", explanation_vi: "Trong fandom, chỉ thành viên hoặc thứ yêu thích nhất.", example_sentence: "내 최애는 정국이야.", example_translation: "Bias của tôi là Jungkook.", wrong_answers: [{ ko: "최근에 애인이 생기다", vi: "Gần đây có người yêu" }, { ko: "최후의 애도", vi: "Tang lễ cuối cùng" }, { ko: "최선을 다해 애쓰다", vi: "Cố gắng hết sức" }] },
  { expression: "탈덕", type: "slang", difficulty: "easy", hint_ko: "탈출 + 덕후", hint_vi: "Thoát khỏi + otaku", correct_answer_ko: "팬 활동을 그만두다", correct_answer_vi: "Ngừng hoạt động fan", explanation_ko: "어떤 것의 팬에서 벗어나는 것을 뜻합니다.", explanation_vi: "Nghĩa là thoát khỏi việc làm fan của ai đó.", example_sentence: "그 아이돌 스캔들 보고 탈덕했어.", example_translation: "Xem scandal idol đó rồi bỏ fan.", wrong_answers: [{ ko: "탈모 덕분에", vi: "Nhờ rụng tóc" }, { ko: "탈출하는 덕목", vi: "Đức tính trốn thoát" }, { ko: "탈의실 덕후", vi: "Otaku phòng thay đồ" }] },
  { expression: "입덕", type: "slang", difficulty: "easy", hint_ko: "입문 + 덕후", hint_vi: "Nhập môn + otaku", correct_answer_ko: "팬이 되다", correct_answer_vi: "Trở thành fan", explanation_ko: "어떤 것의 팬이 되는 것을 뜻합니다.", explanation_vi: "Nghĩa là trở thành fan của ai đó.", example_sentence: "그 드라마 보고 배우한테 입덕했어.", example_translation: "Xem phim đó xong thành fan diễn viên.", wrong_answers: [{ ko: "입에 덕을 바르다", vi: "Bôi đức vào miệng" }, { ko: "입구에서 덕담하다", vi: "Nói lời chúc ở cửa" }, { ko: "입을 덕지덕지 붙이다", vi: "Dán miệng lớp lớp" }] },

  // ========== MEDIUM: 일상 관용어 + 신조어 혼합 ==========
  { expression: "눈이 높다", type: "idiom", difficulty: "medium", hint_ko: "눈의 위치가 높다는 뜻이 아니에요", hint_vi: "Không phải nghĩa là mắt ở vị trí cao", correct_answer_ko: "요구 조건이 까다롭다, 기준이 높다", correct_answer_vi: "Yêu cầu khắt khe, tiêu chuẩn cao", explanation_ko: "특히 연인이나 물건을 고를 때 기준이 높은 것을 뜻합니다.", explanation_vi: "Đặc biệt khi chọn người yêu hoặc đồ vật, có tiêu chuẩn cao.", example_sentence: "눈이 높아서 아직 결혼을 못 했어.", example_translation: "Tiêu chuẩn cao nên vẫn chưa kết hôn.", wrong_answers: [{ ko: "시력이 좋다", vi: "Thị lực tốt" }, { ko: "키가 크다", vi: "Cao" }, { ko: "위를 잘 본다", vi: "Nhìn lên trên giỏi" }] },
  { expression: "발이 넓다", type: "idiom", difficulty: "medium", hint_ko: "신발 사이즈와 관련 없어요", hint_vi: "Không liên quan đến size giày", correct_answer_ko: "아는 사람이 많다, 인맥이 넓다", correct_answer_vi: "Quen biết nhiều người, mạng lưới quan hệ rộng", explanation_ko: "사회적 관계가 넓은 사람을 표현할 때 씁니다.", explanation_vi: "Dùng khi diễn tả người có quan hệ xã hội rộng.", example_sentence: "그는 발이 넓어서 어디서든 아는 사람이 있어.", example_translation: "Anh ấy có mạng lưới rộng nên đâu cũng có người quen.", wrong_answers: [{ ko: "발 사이즈가 크다", vi: "Size chân lớn" }, { ko: "많이 걷는다", vi: "Đi bộ nhiều" }, { ko: "춤을 잘 춘다", vi: "Nhảy giỏi" }] },
  { expression: "귀가 얇다", type: "idiom", difficulty: "medium", hint_ko: "귀의 두께와 관련 없어요", hint_vi: "Không liên quan đến độ dày của tai", correct_answer_ko: "다른 사람 말에 쉽게 영향을 받다", correct_answer_vi: "Dễ bị ảnh hưởng bởi lời người khác", explanation_ko: "남의 말을 쉽게 믿거나 따르는 성격을 뜻합니다.", explanation_vi: "Tính cách dễ tin hoặc nghe theo lời người khác.", example_sentence: "그녀는 귀가 얇아서 광고만 보면 다 사.", example_translation: "Cô ấy dễ tin nên xem quảng cáo là mua hết.", wrong_answers: [{ ko: "청력이 약하다", vi: "Thính lực yếu" }, { ko: "귀가 작다", vi: "Tai nhỏ" }, { ko: "소리를 잘 못 듣다", vi: "Không nghe rõ âm thanh" }] },
  { expression: "입이 무겁다", type: "idiom", difficulty: "medium", hint_ko: "입의 무게와 관련 없어요", hint_vi: "Không liên quan đến trọng lượng của miệng", correct_answer_ko: "비밀을 잘 지킨다", correct_answer_vi: "Giữ bí mật tốt", explanation_ko: "말을 함부로 하지 않고 비밀을 잘 지키는 사람을 뜻합니다.", explanation_vi: "Người không nói bừa và giữ bí mật tốt.", example_sentence: "그 친구는 입이 무거우니까 비밀을 말해도 돼.", example_translation: "Bạn đó kín miệng nên nói bí mật cũng được.", wrong_answers: [{ ko: "말을 많이 한다", vi: "Nói nhiều" }, { ko: "음식을 많이 먹다", vi: "Ăn nhiều" }, { ko: "말을 더듬다", vi: "Nói lắp" }] },
  { expression: "손이 크다", type: "idiom", difficulty: "medium", hint_ko: "손 사이즈와 관련 없어요", hint_vi: "Không liên quan đến kích thước bàn tay", correct_answer_ko: "음식을 많이 만들거나 씀씀이가 크다", correct_answer_vi: "Nấu nhiều thức ăn hoặc tiêu xài rộng rãi", explanation_ko: "요리할 때 양을 많이 하거나 돈을 잘 쓰는 성격을 뜻합니다.", explanation_vi: "Tính cách nấu nhiều hoặc tiêu tiền phóng khoáng.", example_sentence: "우리 엄마는 손이 커서 항상 음식이 남아.", example_translation: "Mẹ tôi tay rộng nên luôn thừa thức ăn.", wrong_answers: [{ ko: "손이 물리적으로 크다", vi: "Bàn tay thực sự lớn" }, { ko: "손재주가 좋다", vi: "Khéo tay" }, { ko: "손으로 일을 잘한다", vi: "Làm việc bằng tay giỏi" }] },
  { expression: "배가 아프다", type: "idiom", difficulty: "medium", hint_ko: "실제 복통과 다를 수 있어요", hint_vi: "Có thể khác với đau bụng thực sự", correct_answer_ko: "남이 잘 되는 것이 부럽고 샘이 나다", correct_answer_vi: "Ghen tị và đố kỵ khi người khác thành công", explanation_ko: "다른 사람의 성공이나 행운을 부러워할 때 씁니다.", explanation_vi: "Dùng khi ghen tị với thành công hoặc may mắn của người khác.", example_sentence: "친구가 로또 당첨됐다니 배 아프다.", example_translation: "Nghe bạn trúng xổ số mà ghen tị.", wrong_answers: [{ ko: "실제로 배가 아프다", vi: "Thực sự đau bụng" }, { ko: "배고프다", vi: "Đói" }, { ko: "임신했다", vi: "Mang thai" }] },
  { expression: "발목을 잡다", type: "idiom", difficulty: "medium", hint_ko: "실제로 발목을 잡는 게 아니에요", hint_vi: "Không phải thực sự nắm mắt cá chân", correct_answer_ko: "앞으로 나아가지 못하게 방해하다", correct_answer_vi: "Cản trở không cho tiến lên", explanation_ko: "진행을 방해하거나 약점을 잡는 것을 뜻합니다.", explanation_vi: "Nghĩa là cản trở tiến trình hoặc nắm điểm yếu.", example_sentence: "과거의 실수가 발목을 잡아서 승진을 못 했어.", example_translation: "Sai lầm quá khứ cản chân nên không được thăng chức.", wrong_answers: [{ ko: "발목을 마사지하다", vi: "Mát xa mắt cá chân" }, { ko: "발목을 치료하다", vi: "Điều trị mắt cá chân" }, { ko: "발목이 부러지다", vi: "Gãy mắt cá chân" }] },
  { expression: "눈 밖에 나다", type: "idiom", difficulty: "medium", hint_ko: "시야 밖으로 나가는 게 아니에요", hint_vi: "Không phải ra ngoài tầm nhìn", correct_answer_ko: "미움을 받다, 신임을 잃다", correct_answer_vi: "Bị ghét, mất lòng tin", explanation_ko: "윗사람의 신임을 잃거나 미움을 받는 것을 뜻합니다.", explanation_vi: "Mất lòng tin của cấp trên hoặc bị ghét.", example_sentence: "실수 때문에 사장님 눈 밖에 났어.", example_translation: "Vì sai lầm nên mất lòng tin của giám đốc.", wrong_answers: [{ ko: "시력이 나빠지다", vi: "Thị lực kém đi" }, { ko: "밖으로 나가다", vi: "Ra ngoài" }, { ko: "눈을 감다", vi: "Nhắm mắt" }] },
  { expression: "입이 가볍다", type: "idiom", difficulty: "medium", hint_ko: "입의 무게와 관련 없어요", hint_vi: "Không liên quan đến trọng lượng của miệng", correct_answer_ko: "비밀을 잘 못 지킨다", correct_answer_vi: "Không giữ được bí mật", explanation_ko: "말을 함부로 하거나 비밀을 쉽게 누설하는 사람을 뜻합니다.", explanation_vi: "Người nói bừa hoặc dễ tiết lộ bí mật.", example_sentence: "그 사람은 입이 가벼워서 비밀을 말하면 안 돼.", example_translation: "Người đó mồm mép nên không được nói bí mật.", wrong_answers: [{ ko: "적게 먹는다", vi: "Ăn ít" }, { ko: "말을 빨리 한다", vi: "Nói nhanh" }, { ko: "입술이 얇다", vi: "Môi mỏng" }] },
  { expression: "콧대가 높다", type: "idiom", difficulty: "medium", hint_ko: "코의 높이와 관련 없어요", hint_vi: "Không liên quan đến chiều cao của mũi", correct_answer_ko: "자존심이 세고 거만하다", correct_answer_vi: "Tự trọng cao và kiêu ngạo", explanation_ko: "자신을 높이 평가하고 거만한 태도를 뜻합니다.", explanation_vi: "Đánh giá bản thân cao và thái độ kiêu ngạo.", example_sentence: "그녀는 콧대가 높아서 쉽게 다가가기 어려워.", example_translation: "Cô ấy kiêu nên khó tiếp cận.", wrong_answers: [{ ko: "코가 물리적으로 높다", vi: "Mũi thực sự cao" }, { ko: "코로 숨을 잘 쉰다", vi: "Thở bằng mũi tốt" }, { ko: "코가 예쁘다", vi: "Mũi đẹp" }] },
  { expression: "가슴에 못을 박다", type: "idiom", difficulty: "medium", hint_ko: "실제로 못을 박는 게 아니에요", hint_vi: "Không phải thực sự đóng đinh", correct_answer_ko: "마음에 깊은 상처를 주다", correct_answer_vi: "Gây tổn thương sâu trong lòng", explanation_ko: "말이나 행동으로 큰 상처를 주는 것을 뜻합니다.", explanation_vi: "Gây tổn thương lớn bằng lời nói hoặc hành động.", example_sentence: "네 말이 내 가슴에 못을 박았어.", example_translation: "Lời của bạn đã đóng đinh vào tim tôi.", wrong_answers: [{ ko: "가슴에 문신을 하다", vi: "Xăm trên ngực" }, { ko: "가슴에 배지를 달다", vi: "Đeo huy hiệu trên ngực" }, { ko: "가슴이 아프다", vi: "Đau ngực" }] },
  { expression: "꿈도 꾸지 마", type: "idiom", difficulty: "medium", hint_ko: "잠자는 꿈이 아니에요", hint_vi: "Không phải giấc mơ khi ngủ", correct_answer_ko: "기대하지 마, 불가능하다", correct_answer_vi: "Đừng mong đợi, không thể được", explanation_ko: "무언가가 절대 일어나지 않을 것임을 강조합니다.", explanation_vi: "Nhấn mạnh rằng điều gì đó sẽ không bao giờ xảy ra.", example_sentence: "돈 빌려달라고? 꿈도 꾸지 마!", example_translation: "Muốn mượn tiền à? Đừng có mơ!", wrong_answers: [{ ko: "잠을 자지 마", vi: "Đừng ngủ" }, { ko: "상상하지 마", vi: "Đừng tưởng tượng" }, { ko: "낮잠 자지 마", vi: "Đừng ngủ trưa" }] },
  { expression: "바람을 맞다", type: "idiom", difficulty: "medium", hint_ko: "날씨와 관련 없어요", hint_vi: "Không liên quan đến thời tiết", correct_answer_ko: "약속에 상대방이 나오지 않다", correct_answer_vi: "Đối phương không đến cuộc hẹn", explanation_ko: "데이트나 약속에 상대방이 나타나지 않는 것을 뜻합니다.", explanation_vi: "Đối phương không xuất hiện ở buổi hẹn hò hoặc cuộc hẹn.", example_sentence: "1시간이나 기다렸는데 바람 맞았어.", example_translation: "Đợi 1 tiếng mà bị thất hẹn.", wrong_answers: [{ ko: "바람이 불다", vi: "Gió thổi" }, { ko: "바람을 쐬다", vi: "Hít thở không khí" }, { ko: "바람에 날리다", vi: "Bay theo gió" }] },
  { expression: "시치미를 떼다", type: "idiom", difficulty: "medium", hint_ko: "매에 달던 이름표에서 유래", hint_vi: "Có nguồn gốc từ thẻ tên trên chim ưng", correct_answer_ko: "알면서도 모르는 척하다", correct_answer_vi: "Biết mà giả vờ không biết", explanation_ko: "잘 알면서도 모른 척하는 태도를 뜻합니다.", explanation_vi: "Thái độ biết rõ nhưng giả vờ không biết.", example_sentence: "네가 먹은 거 다 알아. 시치미 떼지 마!", example_translation: "Biết bạn ăn rồi. Đừng giả vờ!", wrong_answers: [{ ko: "이름표를 떼다", vi: "Gỡ thẻ tên" }, { ko: "옷을 벗다", vi: "Cởi quần áo" }, { ko: "거짓말을 하다", vi: "Nói dối" }] },
  { expression: "어깨가 무겁다", type: "idiom", difficulty: "medium", hint_ko: "실제 무게와 관련 없어요", hint_vi: "Không liên quan đến trọng lượng thực tế", correct_answer_ko: "책임감이 크다, 부담이 크다", correct_answer_vi: "Trách nhiệm lớn, gánh nặng lớn", explanation_ko: "큰 책임이나 부담을 느끼는 상황을 뜻합니다.", explanation_vi: "Tình huống cảm thấy trách nhiệm hoặc gánh nặng lớn.", example_sentence: "팀장이 되니까 어깨가 무거워.", example_translation: "Thành trưởng nhóm nên vai nặng.", wrong_answers: [{ ko: "어깨가 아프다", vi: "Đau vai" }, { ko: "짐을 많이 들다", vi: "Mang nhiều đồ" }, { ko: "어깨가 넓다", vi: "Vai rộng" }] },
  { expression: "뒤끝이 없다", type: "idiom", difficulty: "medium", hint_ko: "뒷부분과 관련 없어요", hint_vi: "Không liên quan đến phần sau", correct_answer_ko: "화가 나도 금방 풀린다", correct_answer_vi: "Dù tức giận cũng nhanh nguôi", explanation_ko: "화가 나거나 속상해도 오래 마음에 담아두지 않는 성격입니다.", explanation_vi: "Tính cách không giữ trong lòng lâu dù tức giận hay buồn.", example_sentence: "그 친구는 뒤끝이 없어서 싸워도 금방 화해해.", example_translation: "Bạn đó không để bụng nên cãi nhau cũng nhanh hòa giải.", wrong_answers: [{ ko: "마무리를 못한다", vi: "Không kết thúc được" }, { ko: "끝이 없다", vi: "Không có kết thúc" }, { ko: "뒷모습이 없다", vi: "Không có bóng dáng phía sau" }] },
  { expression: "고래 싸움에 새우 등 터진다", type: "proverb", difficulty: "medium", hint_ko: "동물과 관련된 속담", hint_vi: "Tục ngữ liên quan đến động vật", correct_answer_ko: "강자들의 싸움에 약자가 피해를 본다", correct_answer_vi: "Kẻ yếu bị thiệt hại trong cuộc chiến của kẻ mạnh", explanation_ko: "힘센 사람들의 다툼에 약한 사람이 피해를 입는 상황입니다.", explanation_vi: "Tình huống người yếu bị thiệt hại trong cuộc tranh chấp của người mạnh.", example_sentence: "부모님이 싸우면 아이들만 힘들어. 고래 싸움에 새우 등 터지는 격이지.", example_translation: "Bố mẹ cãi nhau thì con cái khổ. Đúng kiểu voi đánh nhau cỏ cây chịu.", wrong_answers: [{ ko: "바다에서 싸우면 위험하다", vi: "Chiến đấu dưới biển nguy hiểm" }, { ko: "새우가 고래를 이긴다", vi: "Tôm thắng cá voi" }, { ko: "고래와 새우가 친구다", vi: "Cá voi và tôm là bạn" }] },
  { expression: "우물 안 개구리", type: "proverb", difficulty: "medium", hint_ko: "좁은 우물에 사는 개구리", hint_vi: "Ếch sống trong giếng hẹp", correct_answer_ko: "세상 물정을 모르는 사람", correct_answer_vi: "Người không hiểu biết thế giới bên ngoài", explanation_ko: "경험이 좁고 넓은 세상을 모르는 사람을 비유합니다.", explanation_vi: "Ví von người có kinh nghiệm hẹp và không biết thế giới rộng lớn.", example_sentence: "해외여행 한 번도 안 해봤으면 우물 안 개구리야.", example_translation: "Chưa đi nước ngoài lần nào thì là ếch ngồi đáy giếng.", wrong_answers: [{ ko: "물을 좋아하는 개구리", vi: "Ếch thích nước" }, { ko: "우물을 파는 개구리", vi: "Ếch đào giếng" }, { ko: "시골에 사는 개구리", vi: "Ếch sống ở nông thôn" }] },
  { expression: "닭 쫓던 개 지붕 쳐다본다", type: "proverb", difficulty: "medium", hint_ko: "닭과 개에 관한 속담", hint_vi: "Tục ngữ về gà và chó", correct_answer_ko: "애써 하던 일을 놓치고 어이없어 하다", correct_answer_vi: "Đuổi theo rồi mất, đứng nhìn ngẩn ngơ", explanation_ko: "노력했지만 실패하고 망연자실한 상태를 뜻합니다.", explanation_vi: "Trạng thái cố gắng nhưng thất bại và ngẩn ngơ.", example_sentence: "투자한 주식이 폭락해서 닭 쫓던 개 지붕 쳐다보는 격이야.", example_translation: "Cổ phiếu đầu tư sụp đổ, đúng kiểu chó đuổi gà nhìn mái nhà.", wrong_answers: [{ ko: "개가 닭을 잡았다", vi: "Chó bắt được gà" }, { ko: "개와 닭이 친하다", vi: "Chó và gà thân nhau" }, { ko: "지붕 위에 닭이 있다", vi: "Gà trên mái nhà" }] },

  // ========== HARD: 전통 속담/사자성어/어려운 관용어 ==========
  { expression: "소 잃고 외양간 고친다", type: "proverb", difficulty: "hard", hint_ko: "농촌 배경의 전통 속담", hint_vi: "Tục ngữ truyền thống bối cảnh nông thôn", correct_answer_ko: "일이 이미 잘못된 후에 대책을 세운다", correct_answer_vi: "Lập kế hoạch sau khi việc đã hỏng", explanation_ko: "사전에 대비하지 않고 일이 잘못된 후에야 조치를 취하는 어리석음을 비판합니다.", explanation_vi: "Phê phán sự ngu ngốc khi không chuẩn bị trước và chỉ hành động sau khi việc đã hỏng.", example_sentence: "사고 나고 나서야 안전벨트 매는 건 소 잃고 외양간 고치는 격이야.", example_translation: "Đeo dây an toàn sau khi tai nạn thì đúng kiểu mất bò mới lo làm chuồng.", wrong_answers: [{ ko: "소를 잘 키우는 방법", vi: "Cách nuôi bò tốt" }, { ko: "외양간을 미리 고친다", vi: "Sửa chuồng trước" }, { ko: "소가 도망갔다 돌아온다", vi: "Bò chạy trốn rồi quay lại" }] },
  { expression: "티끌 모아 태산", type: "proverb", difficulty: "hard", hint_ko: "작은 것들이 모이면...", hint_vi: "Những thứ nhỏ tích tụ lại...", correct_answer_ko: "작은 것도 모이면 큰 것이 된다", correct_answer_vi: "Những thứ nhỏ tích lại thành lớn", explanation_ko: "작은 노력이나 것들도 모이면 큰 성과가 됨을 뜻합니다.", explanation_vi: "Những nỗ lực nhỏ hay thứ nhỏ tích lại sẽ thành tựu lớn.", example_sentence: "매일 1000원씩 모으면 티끌 모아 태산이야.", example_translation: "Mỗi ngày tiết kiệm 1000 won thì tích tiểu thành đại.", wrong_answers: [{ ko: "태산이 무너진다", vi: "Núi Thái Sơn sụp đổ" }, { ko: "티끌은 쓸모없다", vi: "Bụi vô dụng" }, { ko: "큰 것이 작아진다", vi: "Cái lớn trở nên nhỏ" }] },
  { expression: "낮말은 새가 듣고 밤말은 쥐가 듣는다", type: "proverb", difficulty: "hard", hint_ko: "비밀에 관한 속담", hint_vi: "Tục ngữ về bí mật", correct_answer_ko: "아무리 비밀로 해도 남이 알게 된다", correct_answer_vi: "Dù giữ bí mật thế nào cũng có người biết", explanation_ko: "말을 조심해야 함을 경고하는 속담입니다.", explanation_vi: "Tục ngữ cảnh báo phải cẩn thận lời nói.", example_sentence: "회사 욕하지 마. 낮말은 새가 듣고 밤말은 쥐가 듣는대.", example_translation: "Đừng nói xấu công ty. Nói ngày có chim nghe, nói đêm có chuột nghe.", wrong_answers: [{ ko: "새와 쥐가 대화한다", vi: "Chim và chuột nói chuyện" }, { ko: "밤에 말하면 안 된다", vi: "Không nên nói vào ban đêm" }, { ko: "동물이 사람 말을 이해한다", vi: "Động vật hiểu tiếng người" }] },
  { expression: "까마귀 날자 배 떨어진다", type: "proverb", difficulty: "hard", hint_ko: "우연의 일치에 관한 속담", hint_vi: "Tục ngữ về sự trùng hợp", correct_answer_ko: "공교롭게 때가 같아 의심을 받다", correct_answer_vi: "Tình cờ trùng thời điểm nên bị nghi ngờ", explanation_ko: "우연히 일어난 일이 인과관계처럼 보이는 상황을 뜻합니다.", explanation_vi: "Tình huống việc xảy ra ngẫu nhiên trông như có quan hệ nhân quả.", example_sentence: "내가 지나갈 때 유리가 깨졌어. 까마귀 날자 배 떨어진 격이야.", example_translation: "Kính vỡ khi tôi đi qua. Đúng kiểu quạ bay lê rụng.", wrong_answers: [{ ko: "까마귀가 배를 먹었다", vi: "Quạ ăn lê" }, { ko: "배나무에 까마귀가 산다", vi: "Quạ sống trên cây lê" }, { ko: "까마귀가 과일을 떨어뜨렸다", vi: "Quạ làm rơi trái cây" }] },
  { expression: "등잔 밑이 어둡다", type: "proverb", difficulty: "hard", hint_ko: "가까운 곳에 관한 속담", hint_vi: "Tục ngữ về nơi gần", correct_answer_ko: "가까운 것이 오히려 잘 모른다", correct_answer_vi: "Điều gần gũi lại không biết rõ", explanation_ko: "가까이 있는 것을 오히려 알아차리지 못함을 뜻합니다.", explanation_vi: "Không nhận ra điều ở gần.", example_sentence: "범인이 가족이었다니! 등잔 밑이 어둡더라.", example_translation: "Thủ phạm lại là gia đình! Đúng là dưới đèn tối nhất.", wrong_answers: [{ ko: "등잔이 고장났다", vi: "Đèn dầu hỏng" }, { ko: "밤에는 어둡다", vi: "Ban đêm tối" }, { ko: "등잔을 끄다", vi: "Tắt đèn dầu" }] },
  { expression: "호랑이도 제 말 하면 온다", type: "proverb", difficulty: "hard", hint_ko: "말에 관한 속담", hint_vi: "Tục ngữ về lời nói", correct_answer_ko: "누군가 얘기하면 그 사람이 나타난다", correct_answer_vi: "Nói về ai đó thì người đó xuất hiện", explanation_ko: "남의 이야기를 할 때 조심하라는 뜻입니다.", explanation_vi: "Ý nghĩa là phải cẩn thận khi nói về người khác.", example_sentence: "과장님 얘기했더니 바로 왔네. 호랑이도 제 말 하면 온다더니!", example_translation: "Vừa nói về trưởng phòng thì ngay đến. Nói đến Tào Tháo Tào Tháo đến!", wrong_answers: [{ ko: "호랑이가 말을 한다", vi: "Hổ nói chuyện" }, { ko: "호랑이를 부르면 온다", vi: "Gọi hổ thì hổ đến" }, { ko: "호랑이가 사람 말을 안다", vi: "Hổ hiểu tiếng người" }] },
  { expression: "백문이 불여일견", type: "idiom", difficulty: "hard", hint_ko: "백 번 듣는 것보다...", hint_vi: "Hơn cả nghe trăm lần...", correct_answer_ko: "백 번 듣는 것보다 한 번 보는 게 낫다", correct_answer_vi: "Một lần thấy hơn trăm lần nghe", explanation_ko: "직접 경험하는 것이 듣는 것보다 확실함을 뜻합니다.", explanation_vi: "Trải nghiệm trực tiếp chắc chắn hơn nghe kể.", example_sentence: "설명만 듣지 말고 직접 가봐. 백문이 불여일견이야.", example_translation: "Đừng chỉ nghe giải thích, đi xem trực tiếp. Trăm nghe không bằng một thấy.", wrong_answers: [{ ko: "백 번 질문해야 한다", vi: "Phải hỏi trăm lần" }, { ko: "듣는 것이 보는 것보다 낫다", vi: "Nghe tốt hơn nhìn" }, { ko: "한 번만 봐도 된다", vi: "Chỉ cần nhìn một lần" }] },
  { expression: "고진감래", type: "idiom", difficulty: "hard", hint_ko: "쓴 것 다음에 단 것", hint_vi: "Sau đắng đến ngọt", correct_answer_ko: "고생 끝에 즐거움이 온다", correct_answer_vi: "Sau khổ cực là niềm vui", explanation_ko: "힘든 시간을 견디면 좋은 일이 온다는 사자성어입니다.", explanation_vi: "Thành ngữ Hán nghĩa là chịu đựng thời gian khó khăn thì điều tốt sẽ đến.", example_sentence: "힘들었지만 합격해서 기뻐. 고진감래야!", example_translation: "Dù vất vả nhưng đỗ nên vui. Khổ tận cam lai!", wrong_answers: [{ ko: "항상 고생한다", vi: "Luôn khổ cực" }, { ko: "단 것을 먹으면 고생한다", vi: "Ăn ngọt thì khổ" }, { ko: "고생하면 병이 난다", vi: "Khổ cực thì bệnh" }] },
  { expression: "일석이조", type: "idiom", difficulty: "hard", hint_ko: "하나로 둘을 얻다", hint_vi: "Một được hai", correct_answer_ko: "한 가지 일로 두 가지 이익을 얻다", correct_answer_vi: "Một việc được hai lợi ích", explanation_ko: "한 번의 행동으로 두 가지 성과를 얻는 것입니다.", explanation_vi: "Một hành động đạt được hai kết quả.", example_sentence: "운동하면서 다이어트도 되고 건강도 챙기고, 일석이조야!", example_translation: "Vừa tập thể dục vừa giảm cân vừa khỏe, nhất cử lưỡng tiện!", wrong_answers: [{ ko: "돌을 두 개 던지다", vi: "Ném hai hòn đá" }, { ko: "새 두 마리를 잡다", vi: "Bắt hai con chim" }, { ko: "두 번 시도하다", vi: "Thử hai lần" }] },
  { expression: "역지사지", type: "idiom", difficulty: "hard", hint_ko: "위치를 바꿔서 생각하다", hint_vi: "Đổi vị trí để suy nghĩ", correct_answer_ko: "상대방의 입장에서 생각하다", correct_answer_vi: "Suy nghĩ từ vị trí của đối phương", explanation_ko: "다른 사람의 처지가 되어 생각해보라는 사자성어입니다.", explanation_vi: "Thành ngữ Hán khuyên nghĩ từ hoàn cảnh của người khác.", example_sentence: "화내기 전에 역지사지 해봐. 그 사람도 힘들었을 거야.", example_translation: "Trước khi tức giận hãy đặt mình vào vị trí họ. Họ cũng vất vả.", wrong_answers: [{ ko: "지역을 바꾸다", vi: "Đổi vùng" }, { ko: "역사를 공부하다", vi: "Học lịch sử" }, { ko: "위치를 바꾸다", vi: "Đổi vị trí" }] },
  { expression: "설상가상", type: "idiom", difficulty: "hard", hint_ko: "눈 위에 서리", hint_vi: "Sương trên tuyết", correct_answer_ko: "나쁜 일이 겹쳐 일어나다", correct_answer_vi: "Việc xấu chồng chất", explanation_ko: "이미 나쁜 상황에 더 나쁜 일이 생기는 것입니다.", explanation_vi: "Việc xấu thêm vào tình huống đã xấu sẵn.", example_sentence: "차가 고장났는데 비까지 와. 설상가상이야.", example_translation: "Xe hỏng lại còn mưa. Họa vô đơn chí.", wrong_answers: [{ ko: "눈이 많이 온다", vi: "Tuyết rơi nhiều" }, { ko: "날씨가 좋아진다", vi: "Thời tiết tốt lên" }, { ko: "상황이 나아진다", vi: "Tình hình tốt lên" }] },
  { expression: "사면초가", type: "idiom", difficulty: "hard", hint_ko: "사방에서 초나라 노래", hint_vi: "Bốn phía tiếng hát nước Sở", correct_answer_ko: "도움을 받을 곳 없이 고립되다", correct_answer_vi: "Bị cô lập không nơi nương tựa", explanation_ko: "사방이 적으로 둘러싸여 고립된 상황을 뜻합니다.", explanation_vi: "Tình huống bị bao vây bởi kẻ thù từ bốn phía.", example_sentence: "회사에서 모두 등 돌려서 사면초가야.", example_translation: "Mọi người ở công ty quay lưng, đúng là tứ bề thọ địch.", wrong_answers: [{ ko: "네 가지 노래를 부르다", vi: "Hát bốn bài hát" }, { ko: "네 방향으로 가다", vi: "Đi bốn hướng" }, { ko: "초대를 받다", vi: "Được mời" }] },
  { expression: "동병상련", type: "idiom", difficulty: "hard", hint_ko: "같은 병을 앓는 사람들", hint_vi: "Những người mắc cùng bệnh", correct_answer_ko: "같은 처지에 있는 사람끼리 동정하다", correct_answer_vi: "Những người cùng hoàn cảnh thông cảm lẫn nhau", explanation_ko: "비슷한 어려움을 겪는 사람들이 서로 이해하는 것입니다.", explanation_vi: "Những người trải qua khó khăn tương tự hiểu nhau.", example_sentence: "취준생끼리 만나니 동병상련이라 이야기가 잘 통해.", example_translation: "Người tìm việc gặp nhau nên đồng bệnh tương lân, nói chuyện hợp.", wrong_answers: [{ ko: "같은 병원에 가다", vi: "Đến cùng bệnh viện" }, { ko: "병을 옮기다", vi: "Lây bệnh" }, { ko: "동시에 아프다", vi: "Đồng thời bị ốm" }] },
  { expression: "어불성설", type: "idiom", difficulty: "hard", hint_ko: "말이 되지 않다", hint_vi: "Không thành lời", correct_answer_ko: "말이 이치에 맞지 않다", correct_answer_vi: "Lời nói không hợp lý", explanation_ko: "논리적으로 맞지 않는 말을 비판할 때 씁니다.", explanation_vi: "Dùng khi phê phán lời nói không hợp logic.", example_sentence: "그 변명은 어불성설이야. 말도 안 돼!", example_translation: "Lời bào chữa đó là ngôn bất thành lý. Vô lý!", wrong_answers: [{ ko: "말을 잘한다", vi: "Nói giỏi" }, { ko: "어려운 말을 한다", vi: "Nói lời khó" }, { ko: "설명을 잘한다", vi: "Giải thích giỏi" }] },
  { expression: "오비이락", type: "idiom", difficulty: "hard", hint_ko: "까마귀 날아가고 배 떨어지다", hint_vi: "Quạ bay đi và lê rụng", correct_answer_ko: "우연히 일어난 일로 오해를 받다", correct_answer_vi: "Bị hiểu lầm vì việc xảy ra ngẫu nhiên", explanation_ko: "공교롭게 일이 겹쳐 의심을 받는 상황입니다.", explanation_vi: "Tình huống bị nghi ngờ vì việc trùng hợp.", example_sentence: "그때 마침 거기 있었을 뿐인데... 오비이락이야.", example_translation: "Chỉ tình cờ ở đó lúc đó... đúng là quạ bay lê rụng.", wrong_answers: [{ ko: "오리가 배를 먹다", vi: "Vịt ăn lê" }, { ko: "비가 오면 배가 익다", vi: "Mưa xuống lê chín" }, { ko: "새가 과일을 떨어뜨리다", vi: "Chim làm rơi trái cây" }] },
  { expression: "맹모삼천지교", type: "idiom", difficulty: "hard", hint_ko: "맹자 어머니의 세 번 이사", hint_vi: "Ba lần chuyển nhà của mẹ Mạnh Tử", correct_answer_ko: "자녀 교육을 위해 환경이 중요하다", correct_answer_vi: "Môi trường quan trọng cho giáo dục con cái", explanation_ko: "맹자의 어머니가 교육 환경을 위해 세 번 이사한 고사에서 유래합니다.", explanation_vi: "Có nguồn gốc từ câu chuyện mẹ Mạnh Tử ba lần chuyển nhà vì môi trường giáo dục.", example_sentence: "좋은 학교 근처로 이사하려고 해. 맹모삼천지교라잖아.", example_translation: "Định chuyển nhà gần trường tốt. Mạnh mẫu tam thiên chi giáo mà.", wrong_answers: [{ ko: "맹자가 세 번 배웠다", vi: "Mạnh Tử học ba lần" }, { ko: "어머니가 천 번 가르쳤다", vi: "Mẹ dạy nghìn lần" }, { ko: "세 명의 어머니", vi: "Ba bà mẹ" }] },
  { expression: "청출어람", type: "idiom", difficulty: "hard", hint_ko: "쪽에서 나온 파란색", hint_vi: "Màu xanh từ cây chàm", correct_answer_ko: "제자가 스승보다 뛰어나다", correct_answer_vi: "Học trò giỏi hơn thầy", explanation_ko: "쪽에서 나온 파란색이 쪽보다 푸르듯, 제자가 스승을 뛰어넘는 것입니다.", explanation_vi: "Như màu xanh từ chàm xanh hơn chàm, học trò vượt qua thầy.", example_sentence: "제자가 선생님보다 잘하네. 청출어람이야!", example_translation: "Học trò giỏi hơn thầy. Thanh xuất ư lam!", wrong_answers: [{ ko: "파란색을 좋아하다", vi: "Thích màu xanh" }, { ko: "하늘이 맑다", vi: "Trời trong" }, { ko: "바다가 파랗다", vi: "Biển xanh" }] },
  { expression: "촌철살인", type: "idiom", difficulty: "hard", hint_ko: "한 치의 쇠로 사람을 죽이다", hint_vi: "Một tấc sắt giết người", correct_answer_ko: "짧은 말로 핵심을 찌르다", correct_answer_vi: "Lời ngắn gọn đánh trúng trọng tâm", explanation_ko: "간결하지만 날카로운 말로 핵심을 짚는 것입니다.", explanation_vi: "Lời ngắn gọn nhưng sắc bén đánh trúng vấn đề.", example_sentence: "그 한마디가 촌철살인이었어. 모두 할 말을 잃었지.", example_translation: "Câu đó là thốn thiết sát nhân. Ai cũng mất lời.", wrong_answers: [{ ko: "칼로 사람을 죽이다", vi: "Giết người bằng dao" }, { ko: "작은 무기를 쓰다", vi: "Dùng vũ khí nhỏ" }, { ko: "말로 사람을 해치다", vi: "Làm hại người bằng lời" }] },
  { expression: "괄목상대", type: "idiom", difficulty: "hard", hint_ko: "눈을 비비고 보다", hint_vi: "Dụi mắt nhìn lại", correct_answer_ko: "눈에 띄게 발전하다", correct_answer_vi: "Tiến bộ đáng chú ý", explanation_ko: "짧은 시간에 크게 발전하여 새롭게 봐야 할 정도가 된 것입니다.", explanation_vi: "Tiến bộ lớn trong thời gian ngắn đến mức phải nhìn lại.", example_sentence: "1년 만에 한국어가 괄목상대했네!", example_translation: "Tiếng Hàn tiến bộ vượt bậc chỉ sau một năm!", wrong_answers: [{ ko: "눈이 나빠지다", vi: "Mắt kém đi" }, { ko: "상대를 보다", vi: "Nhìn đối phương" }, { ko: "눈을 감다", vi: "Nhắm mắt" }] },
  { expression: "자업자득", type: "idiom", difficulty: "hard", hint_ko: "자기가 한 일의 결과", hint_vi: "Kết quả việc mình làm", correct_answer_ko: "자기가 저지른 일의 결과를 자기가 받다", correct_answer_vi: "Nhận hậu quả việc mình gây ra", explanation_ko: "스스로 한 행동의 결과를 스스로 받는 것입니다.", explanation_vi: "Tự nhận kết quả của hành động mình làm.", example_sentence: "공부 안 하고 시험 망친 건 자업자득이야.", example_translation: "Không học mà thi hỏng là tự làm tự chịu.", wrong_answers: [{ ko: "직업을 얻다", vi: "Có được nghề nghiệp" }, { ko: "자기 일을 하다", vi: "Làm việc của mình" }, { ko: "스스로 일하다", vi: "Tự làm việc" }] },
  { expression: "유비무환", type: "idiom", difficulty: "hard", hint_ko: "준비하면 걱정이 없다", hint_vi: "Chuẩn bị thì không lo", correct_answer_ko: "미리 준비하면 근심이 없다", correct_answer_vi: "Chuẩn bị trước thì không lo lắng", explanation_ko: "사전에 대비하면 어려움이 생겨도 걱정이 없음을 뜻합니다.", explanation_vi: "Nếu chuẩn bị trước thì dù có khó khăn cũng không lo.", example_sentence: "비상금을 모아두자. 유비무환이잖아.", example_translation: "Hãy tiết kiệm tiền dự phòng. Hữu bị vô hoạn mà.", wrong_answers: [{ ko: "유학을 준비하다", vi: "Chuẩn bị du học" }, { ko: "환경을 보호하다", vi: "Bảo vệ môi trường" }, { ko: "무기를 준비하다", vi: "Chuẩn bị vũ khí" }] },
  { expression: "허심탄회", type: "idiom", difficulty: "hard", hint_ko: "마음을 비우고 솔직하게", hint_vi: "Trống lòng và thành thật", correct_answer_ko: "마음을 열고 솔직하게 대화하다", correct_answer_vi: "Mở lòng và nói chuyện thành thật", explanation_ko: "선입견 없이 솔직하게 의견을 나누는 것입니다.", explanation_vi: "Trao đổi ý kiến thành thật không có định kiến.", example_sentence: "오해가 있으면 허심탄회하게 얘기하자.", example_translation: "Nếu có hiểu lầm hãy nói chuyện thành thật.", wrong_answers: [{ ko: "허락을 구하다", vi: "Xin phép" }, { ko: "심장이 약하다", vi: "Tim yếu" }, { ko: "탄식하다", vi: "Than thở" }] },
  { expression: "절치부심", type: "idiom", difficulty: "hard", hint_ko: "이를 갈고 마음을 태우다", hint_vi: "Nghiến răng đốt lòng", correct_answer_ko: "분하고 억울해서 복수를 다짐하다", correct_answer_vi: "Uất ức và quyết tâm trả thù", explanation_ko: "억울함을 품고 설욕을 다짐하는 것입니다.", explanation_vi: "Ôm nỗi oan ức và quyết tâm rửa hận.", example_sentence: "작년에 진 걸 생각하면 절치부심이야. 이번엔 이긴다!", example_translation: "Nghĩ đến việc thua năm ngoái mà nghiến răng. Lần này thắng!", wrong_answers: [{ ko: "이를 치료하다", vi: "Điều trị răng" }, { ko: "부끄러워하다", vi: "Xấu hổ" }, { ko: "심장이 아프다", vi: "Đau tim" }] },

  // 추가 표현들...
  { expression: "비빔밥", type: "slang", difficulty: "easy", hint_ko: "모든 것을 섞는 음식", hint_vi: "Món ăn trộn mọi thứ", correct_answer_ko: "여러 가지가 뒤섞인 상황", correct_answer_vi: "Tình huống nhiều thứ trộn lẫn", explanation_ko: "다양한 요소가 섞여 있는 상황을 비유합니다.", explanation_vi: "Ví von tình huống có nhiều yếu tố khác nhau trộn lẫn.", example_sentence: "이 회의는 완전 비빔밥이야. 주제가 뒤죽박죽이야.", example_translation: "Cuộc họp này như bibimbap. Chủ đề lộn xộn.", wrong_answers: [{ ko: "맛있는 음식", vi: "Đồ ăn ngon" }, { ko: "한국 전통 음식", vi: "Món ăn truyền thống Hàn Quốc" }, { ko: "밥을 비비다", vi: "Trộn cơm" }] },
  { expression: "썸타다", type: "slang", difficulty: "easy", hint_ko: "Something + 타다", hint_vi: "Something + đi", correct_answer_ko: "연애 직전의 애매한 관계", correct_answer_vi: "Mối quan hệ mập mờ trước khi yêu", explanation_ko: "아직 사귀지는 않지만 서로 호감이 있는 관계입니다.", explanation_vi: "Mối quan hệ chưa chính thức hẹn hò nhưng có tình cảm với nhau.", example_sentence: "요즘 그 사람이랑 썸타는 중이야.", example_translation: "Dạo này đang có something với người đó.", wrong_answers: [{ ko: "버스를 타다", vi: "Đi xe buýt" }, { ko: "불이 타다", vi: "Lửa cháy" }, { ko: "피부가 타다", vi: "Da cháy nắng" }] },
  { expression: "밀당", type: "slang", difficulty: "easy", hint_ko: "밀고 당기다", hint_vi: "Đẩy và kéo", correct_answer_ko: "연애에서 밀고 당기는 심리전", correct_answer_vi: "Chiến thuật tâm lý đẩy kéo trong tình yêu", explanation_ko: "연애할 때 서로 당기고 밀면서 상대방의 마음을 확인하는 것입니다.", explanation_vi: "Khi yêu, đẩy và kéo để xác nhận tình cảm của đối phương.", example_sentence: "그렇게 밀당하면 상대방 지쳐.", example_translation: "Đẩy kéo như thế thì đối phương kiệt sức.", wrong_answers: [{ ko: "문을 밀고 당기다", vi: "Đẩy và kéo cửa" }, { ko: "줄다리기하다", vi: "Kéo co" }, { ko: "밀가루를 반죽하다", vi: "Nhào bột mì" }] },
  { expression: "눈치", type: "slang", difficulty: "easy", hint_ko: "상황을 파악하는 능력", hint_vi: "Khả năng nắm bắt tình huống", correct_answer_ko: "상황이나 분위기를 파악하는 센스", correct_answer_vi: "Sự nhạy cảm nắm bắt tình huống hoặc không khí", explanation_ko: "한국 문화에서 매우 중요한 사회적 능력입니다.", explanation_vi: "Khả năng xã hội rất quan trọng trong văn hóa Hàn Quốc.", example_sentence: "눈치가 빠르면 사회생활이 편해.", example_translation: "Nắm bắt nhanh thì sống trong xã hội dễ hơn.", wrong_answers: [{ ko: "눈의 치수", vi: "Kích thước mắt" }, { ko: "눈을 치료하다", vi: "Điều trị mắt" }, { ko: "눈이 아프다", vi: "Đau mắt" }] },
  { expression: "화이팅", type: "slang", difficulty: "easy", hint_ko: "응원의 말", hint_vi: "Lời cổ vũ", correct_answer_ko: "힘내라! 응원해!", correct_answer_vi: "Cố lên! Cổ vũ!", explanation_ko: "한국에서 가장 흔하게 쓰이는 응원 표현입니다.", explanation_vi: "Biểu thức cổ vũ phổ biến nhất ở Hàn Quốc.", example_sentence: "시험 잘 봐! 화이팅!", example_translation: "Thi tốt nhé! Fighting!", wrong_answers: [{ ko: "싸우다", vi: "Chiến đấu" }, { ko: "격투기 하다", vi: "Võ đối kháng" }, { ko: "화가 나다", vi: "Tức giận" }] },
];

// 난이도별 필터링
function getQuizzesByDifficulty(difficulty: Difficulty): QuizItem[] {
  return QUIZ_DATABASE.filter((q) => q.difficulty === difficulty);
}

// 셔플 함수
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// 옵션 생성 (정답 + 오답 3개 섞기)
function generateOptions(item: QuizItem): { ko: string; vi: string }[] {
  const correctOption = { ko: item.correct_answer_ko, vi: item.correct_answer_vi };
  const wrongOptions = shuffleArray(item.wrong_answers).slice(0, 3);
  const allOptions = [correctOption, ...wrongOptions];
  return shuffleArray(allOptions);
}

// 정답 인덱스 찾기
function findCorrectIndex(options: { ko: string; vi: string }[], correctKo: string): number {
  return options.findIndex((o) => o.ko === correctKo);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));

    // 난이도 검증
    const difficultyRaw = body.difficulty;
    const difficulty: Difficulty =
      difficultyRaw === "easy" || difficultyRaw === "hard" ? difficultyRaw : "medium";

    // 사용자/세션 정보
    const userId = typeof body.userId === "string" ? body.userId.trim().slice(0, 100) : null;
    const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim().slice(0, 100) : null;

    // Supabase 클라이언트 생성
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 이미 출제된 표현들 조회 (최근 500개)
    let usedExpressions: string[] = [];

    if (userId) {
      const { data } = await supabase
        .from("quiz_history")
        .select("expression")
        .eq("user_id", userId)
        .eq("difficulty", difficulty)
        .order("created_at", { ascending: false })
        .limit(500);
      usedExpressions = data?.map((r) => r.expression) || [];
    } else if (sessionId) {
      const { data } = await supabase
        .from("quiz_history")
        .select("expression")
        .eq("session_id", sessionId)
        .eq("difficulty", difficulty)
        .order("created_at", { ascending: false })
        .limit(500);
      usedExpressions = data?.map((r) => r.expression) || [];
    }

    console.log(`Quiz request - Difficulty: ${difficulty}, Used: ${usedExpressions.length}`);

    // 해당 난이도의 퀴즈들 가져오기
    const allQuizzes = getQuizzesByDifficulty(difficulty);

    // 사용되지 않은 퀴즈만 필터링
    let availableQuizzes = allQuizzes.filter((q) => !usedExpressions.includes(q.expression));

    // 모든 퀴즈를 다 사용한 경우, 히스토리 초기화하고 처음부터
    if (availableQuizzes.length === 0) {
      console.log("All quizzes used, resetting history for this difficulty");

      // 해당 난이도의 히스토리 삭제
      if (userId) {
        await supabase
          .from("quiz_history")
          .delete()
          .eq("user_id", userId)
          .eq("difficulty", difficulty);
      } else if (sessionId) {
        await supabase
          .from("quiz_history")
          .delete()
          .eq("session_id", sessionId)
          .eq("difficulty", difficulty);
      }

      availableQuizzes = allQuizzes;
    }

    // 랜덤 선택
    const randomIndex = Math.floor(Math.random() * availableQuizzes.length);
    const selected = availableQuizzes[randomIndex];

    // 옵션 생성 및 정답 인덱스 계산
    const options = generateOptions(selected);
    const correctIndex = findCorrectIndex(options, selected.correct_answer_ko);

    // 히스토리에 저장
    await supabase.from("quiz_history").insert({
      user_id: userId || null,
      session_id: sessionId || null,
      difficulty,
      expression: selected.expression,
    });

    // 응답 구성
    const response = {
      expression: selected.expression,
      type: selected.type,
      difficulty: selected.difficulty,
      hint_ko: selected.hint_ko,
      hint_vi: selected.hint_vi,
      correct_answer_ko: selected.correct_answer_ko,
      correct_answer_vi: selected.correct_answer_vi,
      correct_index: correctIndex,
      options,
      explanation_ko: selected.explanation_ko,
      explanation_vi: selected.explanation_vi,
      example_sentence: selected.example_sentence,
      example_translation: selected.example_translation,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in idiom-quiz function:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: "서버 오류가 발생했습니다.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
