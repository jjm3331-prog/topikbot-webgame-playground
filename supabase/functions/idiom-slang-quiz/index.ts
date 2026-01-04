import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category = 'mixed', count = 10, language = 'ko' } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const langInstructions: Record<string, string> = {
      ko: '모든 텍스트를 한국어로 작성하세요.',
      vi: 'Viết tất cả văn bản bằng tiếng Việt (ngoại trừ expression phải giữ nguyên tiếng Hàn).',
      en: 'Write all text in English (except expression must stay in Korean).',
      zh: '用中文写所有文本（expression必须保持韩语）。',
      ja: 'すべてのテキストを日本語で書いてください（expressionは韓国語のまま）。',
      ru: 'Напишите весь текст на русском языке (expression должен оставаться на корейском).',
      uz: "Barcha matnni o'zbek tilida yozing (expression koreys tilida qolishi kerak).",
    };

    // Massive list of idioms to ensure variety
    const idiomExamples = [
      // 신체 관련 관용어 (100+)
      "눈이 높다", "눈에 넣어도 안 아프다", "눈에 불을 켜다", "눈 깜짝할 사이", "눈앞이 캄캄하다",
      "눈 밖에 나다", "눈을 붙이다", "눈이 빠지게 기다리다", "눈시울이 붉어지다", "눈썹이 휘날리다",
      "귀가 얇다", "귀가 따갑다", "귀에 못이 박히다", "귀를 기울이다", "귀가 솔깃하다",
      "귀에 쏙쏙 들어오다", "귀청이 떨어지다", "귀가 번쩍 뜨이다", "귀를 의심하다", "귀가 가렵다",
      "입이 가볍다", "입이 무겁다", "입에 침이 마르다", "입을 모으다", "입이 벌어지다",
      "입에 풀칠하다", "입이 근질근질하다", "입에 발린 소리", "입을 다물다", "입맛이 쓰다",
      "코가 납작해지다", "코가 높다", "코 묻은 돈", "코앞에 닥치다", "코빼기도 안 보이다",
      "코가 꿰이다", "코를 찌르다", "코웃음 치다", "콧대가 높다", "콧대를 꺾다",
      "손이 크다", "손이 모자라다", "손에 땀을 쥐다", "손을 떼다", "손을 쓰다",
      "손이 맵다", "손에 익다", "손을 놓다", "손이 근질거리다", "손에 넣다",
      "발이 넓다", "발이 묶이다", "발을 빼다", "발을 끊다", "발이 떨어지지 않다",
      "발등에 불이 떨어지다", "발뺌하다", "발 벗고 나서다", "발목을 잡다", "발이 오그라들다",
      "머리가 굳다", "머리를 굴리다", "머리가 복잡하다", "머리를 맞대다", "머리가 터지다",
      "머리를 싸매다", "머리에 피도 안 마르다", "머리가 무겁다", "머리가 띵하다", "머리를 쓰다",
      "배가 아프다", "배꼽을 잡다", "배를 채우다", "배를 두드리다", "배짱이 좋다",
      "가슴이 뛰다", "가슴이 찡하다", "가슴에 새기다", "가슴이 먹먹하다", "가슴이 철렁하다",
      "등을 돌리다", "등을 떠밀다", "등골이 오싹하다", "등이 따뜻하다", "등을 긁어주다",
      "어깨가 무겁다", "어깨를 나란히 하다", "어깨가 으쓱하다", "어깨를 두드리다", "어깨를 펴다",
      "허리가 휘다", "허리를 펴다", "허리띠를 졸라매다", "허리가 잘록하다", "허를 찌르다",
      "무릎을 꿇다", "무릎을 탁 치다", "다리를 펴다", "다리가 풀리다", "다리를 놓다",
      // 동물 관련 관용어
      "호랑이 담배 피던 시절", "닭 쫓던 개 지붕 쳐다보다", "소 잃고 외양간 고치다", "개구리 올챙이 적 생각 못 한다",
      "까마귀 날자 배 떨어진다", "원숭이도 나무에서 떨어진다", "말 한마디로 천 냥 빚을 갚는다", "뱁새가 황새 따라가면 가랑이 찢어진다",
      "고래 싸움에 새우 등 터진다", "용 꼬리보다 뱀 머리가 낫다", "우물 안 개구리", "독 안에 든 쥐",
      "호랑이도 제 말 하면 온다", "물 만난 고기", "나는 새도 떨어뜨린다", "닭 대가리",
      // 자연 관련 관용어
      "하늘이 무너져도 솟아날 구멍이 있다", "낮말은 새가 듣고 밤말은 쥐가 듣는다", "불난 데 부채질한다", "물에 빠진 사람 건져 놓으니 보따리 내놓으라 한다",
      "산 넘어 산", "빙산의 일각", "바람 앞의 등불", "태산이 높다 하되 하늘 아래 뫼이로다", "물 쓰듯 하다",
      // 감정/상태 관련 관용어
      "정신이 없다", "마음을 먹다", "마음을 졸이다", "애가 타다", "간이 콩알만 해지다",
      "진땀을 빼다", "기가 차다", "혼이 나다", "기가 막히다", "오금이 저리다",
      "속이 상하다", "속이 시원하다", "속을 끓이다", "속이 뒤집히다", "마음을 놓다",
      "정신을 차리다", "정신이 번쩍 들다", "혼이 빠지다", "넋이 나가다", "맥이 풀리다"
    ];

    // Massive list of MZ slang (150+)
    const slangExamples = [
      // 2024-2025 최신 유행어
      "갓생", "점메추", "킹받다", "어쩔티비", "중꺾마", "내또출", "갓벽", "스불재",
      "오히려좋아", "알잘딱깔센", "군싹", "억텐", "갑분싸", "꾸안꾸", "완내스",
      "별다줄", "멍청비용", "700", "탕진잼", "플렉스", "존맛탱", "비담", "저메추",
      "만반잘부", "복세편살", "삼귀다", "스듣기", "조거든요", "휴거", "할많하않",
      "갑통알", "커여워", "엄근진", "당모치", "좋댓구알", "레게노", "가성비", "짤",
      "띵곡", "띵작", "갓겜", "웅니", "웃프다", "극한의 효율", "분노조절장애",
      // 성격/행동 관련
      "찐따", "아싸", "인싸", "프로불편러", "만렙", "커엽다", "빡침", "사바사",
      "문찐", "어텐션", "텐션", "그냥저냥", "극혐", "극호감", "호불호", "선넘네",
      "뇌절", "과몰입", "취존", "취저", "입털다", "이생망", "현생", "억까",
      // 인터넷/SNS 관련
      "오운완", "헬창", "헬스장", "운동메이트", "인스타그래머블", "틱톡러", "유튜버",
      "좋아요", "구독", "알림설정", "인플루언서", "셀카", "릴스", "쇼츠", "스토리",
      "팔로우", "언팔", "차단", "뮤트", "디엠", "멘션", "해시태그", "바이럴",
      // 음식/카페 관련
      "혼밥", "혼술", "카공족", "노쇼", "웨이팅", "줄서기", "디저트", "디카페인",
      "아아", "아바라", "아샷추", "라떼는", "플랫화이트", "콜드브루", "드립",
      // 직장/학교 관련
      "워라밸", "칼퇴", "야근", "회식", "직딩", "사축", "월급루팡", "공시생",
      "취준생", "N수생", "재수생", "학점파괴", "에브리타임", "학식", "과대",
      // 감정 표현
      "레알", "ㅋㅋㅋ", "ㅠㅠ", "ㄹㅇ", "ㄴㄴ", "ㄱㄱ", "넵", "웅", "오케이",
      "굳굳", "쿠쿠", "싱숭생숭", "울컥", "어색어색", "두근두근", "설렘주의보",
      // 연애 관련
      "썸", "밀당", "삼귀", "만귀", "고백", "플러팅", "애인", "연애하다",
      "모쏠", "장수모쏠", "솔로탈출", "커플", "공개연애", "비밀연애", "이별",
      // 게임/취미 관련
      "겜", "찐", "트롤", "캐리", "고수", "하수", "뉴비", "골드손", "똥손",
      "버프", "너프", "패치", "업데이트", "다운로드", "스트리밍", "방송",
      // 2023-2024 트렌드
      "MBTI", "ENFP", "ISTJ", "갓생러", "미라클모닝", "새벽기상", "자기계발",
      "부캐", "본캐", "멀티페르소나", "부업", "투잡", "N잡러", "파이프라인",
      // 신조어/합성어
      "꿀잼", "노잼", "핵꿀잼", "핵노잼", "극꿀잼", "개꿀", "지림", "존잼",
      "존버", "가즈아", "홀드", "존버러", "불타오르네", "버닝", "하이퍼",
      // 기타 최신
      "형광등", "눈치게임", "TMI", "TMT", "JOMO", "FOMO", "소확행", "욜로",
      "포기를 모르는", "불사조", "피닉스", "부활", "리저렉션", "컴백", "레전드"
    ];

    const categoryPrompt = category === 'idiom' 
      ? `한국어 관용어/속담만 출제하세요. 아래 예시 중에서 무작위로 선택하되, 매번 다른 표현을 사용하세요:
${idiomExamples.slice(0, 50).join(', ')}... 등 다양한 관용어에서 선택`
      : category === 'slang'
      ? `MZ세대 한국 신조어/슬랭만 출제하세요. 아래 예시 중에서 무작위로 선택하되, 매번 다른 표현을 사용하세요:
${slangExamples.slice(0, 50).join(', ')}... 등 다양한 신조어에서 선택`
      : `한국어 관용어와 MZ슬랭을 반반 섞어서 출제하세요. 다양한 표현을 사용하세요.`;

    // Generate a random seed to ensure variety
    const randomSeed = Math.floor(Math.random() * 1000000);
    const timestamp = Date.now();

    // Language name mapping for clear instructions
    const languageNames: Record<string, string> = {
      ko: 'Korean',
      vi: 'Vietnamese',
      en: 'English',
      zh: 'Chinese (Simplified)',
      ja: 'Japanese',
      ru: 'Russian',
      uz: "O'zbek (Uzbek)"
    };
    
    const targetLangName = languageNames[language] || 'English';

    const systemPrompt = `You are an expert Korean language quiz generator with deep knowledge of Korean idioms (관용어/속담) and MZ generation slang (신조어).

## CRITICAL - TARGET LANGUAGE: ${targetLangName} (code: ${language})
ALL translations MUST be in ${targetLangName}. DO NOT use English unless the target language IS English.

## CRITICAL RULES FOR VARIETY:
1. NEVER repeat expressions from previous sessions
2. Use random seed ${randomSeed} and timestamp ${timestamp} to ensure unique selection
3. Choose expressions from the FULL range of possibilities, not just common ones
4. Each quiz must feel completely fresh and different

## BILINGUAL OUTPUT REQUIREMENT - VERY IMPORTANT:
- meaning, example: MUST include BOTH Korean AND ${targetLangName} together.
  - If target language is 'ko', only Korean is needed
  - If target language is NOT 'ko', format as: "한국어 / ${targetLangName} translation"
- options: MUST be ONLY the target language text (NO Korean in options).
  - If target language is 'ko', options are Korean only
  - If target language is NOT 'ko', options are ${targetLangName} only (no slash, no Korean)

### EXAMPLES BY LANGUAGE:

${language === 'vi' ? `For Vietnamese (vi):
- meaning: "기준이 까다롭다 / Có tiêu chuẩn cao, khó tính"
- example: "그녀는 눈이 높아서 아무나 안 만나요. / Cô ấy có tiêu chuẩn cao nên không hẹn hò với ai cũng được."
- options: ["Có tiêu chuẩn cao", "Thị lực tốt", "Cao lớn", "Kiêu ngạo"]` : ''}

${language === 'en' ? `For English (en):
- meaning: "기준이 까다롭다 / To have high standards"
- example: "그녀는 눈이 높아서 아무나 안 만나요. / She has high standards so she doesn't date just anyone."
- options: ["High standards", "Good eyesight", "Tall", "Arrogant"]` : ''}

${language === 'zh' ? `For Chinese (zh):
- meaning: "기준이 까다롭다 / 标准高，挑剔"
- example: "그녀는 눈이 높아서 아무나 안 만나요. / 她标准很高，不会随便约会。"
- options: ["标准高", "视力好", "个子高", "自大"]` : ''}

${language === 'ja' ? `For Japanese (ja):
- meaning: "기준이 까다롭다 / 基準が高い、目が高い"
- example: "그녀는 눈이 높아서 아무나 안 만나요. / 彼女は目が高いので誰とでも付き合わない。"
- options: ["基準が高い", "視力が良い", "背が高い", "自慢する"]` : ''}

${language === 'ru' ? `For Russian (ru):
- meaning: "기준이 까다롭다 / Высокие стандарты, придирчивый"
- example: "그녀는 눈이 높아서 아무나 안 만나요. / У неё высокие стандарты, она не встречается с кем попало."
- options: ["Высокие стандарты", "Хорошее зрение", "Высокий рост", "Высокомерие"]` : ''}

${language === 'uz' ? `For Uzbek (uz):
- meaning: "기준이 까다롭다 / Talabi yuqori, tanlab oluvchi"
- example: "그녀는 눈이 높아서 아무나 안 만나요. / Uning talabi yuqori, hamma bilan uchrashavermaydi."
- options: ["Talabi yuqori", "Ko'rish yaxshi", "Bo'yi baland", "Manman"]
- For slang "갓생": meaning: "God + 인생 / God + Hayot, tirishqoq hayot", example: "요즘 갓생 살려고 새벽 5시에 일어나요. / Eng yaxshi hayot uchun ertalab 5 da turaman."` : ''}

## CATEGORY INSTRUCTIONS:
${categoryPrompt}

## IDIOM CATEGORIES (관용어 분류):
- 신체부위: 눈, 귀, 입, 코, 손, 발, 머리, 가슴, 배, 등, 어깨, 허리, 다리, 무릎
- 동물: 호랑이, 개, 고양이, 소, 말, 닭, 뱀, 용, 까마귀, 개구리, 물고기
- 자연: 하늘, 땅, 물, 불, 바람, 산, 바다, 강, 비, 눈
- 음식: 밥, 국, 떡, 죽, 술, 물, 콩, 팥
- 감정: 화, 슬픔, 기쁨, 두려움, 놀람, 민망함

## SLANG CATEGORIES (신조어 분류):
- 줄임말: 알잘딱깔센, 갑분싸, 별다줄, 만반잘부
- 합성어: 갓생, 꿀잼, 핵인싸, 존잼
- 밈/유행어: 어쩔티비, 중꺾마, 킹받다
- SNS용어: TMI, 인싸, 아싸, 좋댓구알
- 감정표현: 웃프다, 커엽다, 빡침, 극혐
- 트렌드: 워라밸, 소확행, 욜로, 갓생러

## OUTPUT FORMAT (STRICT JSON):
{
  "questions": [
    {
      "expression": "한국어 표현 (ALWAYS in Korean only)",
      "meaning": "한국어 설명 / ${language === 'ko' ? '한국어만' : targetLangName + ' translation here'}",
      "example": "한국어 예문 / ${language === 'ko' ? '한국어만' : targetLangName + ' translation here'}",
      "options": ["${targetLangName}", "${targetLangName}", "${targetLangName}", "${targetLangName}"],
      "correctIndex": 0-3 (RANDOMIZE this!),
      "category": "idiom" or "slang",
      "difficulty": "easy"/"medium"/"hard"
    }
  ]
}

## QUALITY REQUIREMENTS:
- ALL translations MUST be in ${targetLangName} - NOT English (unless target IS English)
- correctIndex must be RANDOMLY distributed (0, 1, 2, or 3)
- Wrong options must be plausible but clearly incorrect
- Mix of easy (30%), medium (50%), hard (20%) difficulties
- Examples must be realistic everyday situations
- For slang: use terms from 2020-2025
- For idioms: include both common and lesser-known expressions
- EVERY meaning, example, and option MUST have bilingual format (Korean / ${targetLangName}) unless ${language} is 'ko'

Generate exactly ${count} UNIQUE questions with maximum variety!`;

    console.log(`[idiom-slang-quiz] Generating ${count} ${category} questions in ${language}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate ${count} ${category === 'mixed' ? 'mixed idiom and slang' : category} quiz questions.` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[idiom-slang-quiz] API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    
    console.log("[idiom-slang-quiz] Raw response length:", content.length);

    let quiz;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        quiz = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("[idiom-slang-quiz] Parse error:", parseError);
      // Return fallback questions
      const bilingualFallbacks: Record<string, { meaning: string; example: string; options: string[] }[]> = {
        ko: [
          { meaning: "기준이 까다롭다", example: "그녀는 눈이 높아서 아무나 안 만나요.", options: ["기준이 까다롭다", "시력이 좋다", "키가 크다", "자만하다"] },
          { meaning: "갓(God) + 인생, 부지런하고 계획적인 삶", example: "요즘 갓생 살려고 새벽 5시에 일어나요.", options: ["부지런한 삶", "게으른 삶", "신앙생활", "파티생활"] }
        ],
        vi: [
          { meaning: "기준이 까다롭다 / Có tiêu chuẩn cao, khó tính", example: "그녀는 눈이 높아서 아무나 안 만나요. / Cô ấy có tiêu chuẩn cao nên không hẹn hò với bất kỳ ai.", options: ["기준이 까다롭다 / Có tiêu chuẩn cao", "시력이 좋다 / Thị lực tốt", "키가 크다 / Cao lớn", "자만하다 / Kiêu ngạo"] },
          { meaning: "갓(God) + 인생 / God + Cuộc sống, sống siêng năng và có kế hoạch", example: "요즘 갓생 살려고 새벽 5시에 일어나요. / Dạo này tôi dậy lúc 5 giờ sáng để sống cuộc đời tốt nhất.", options: ["부지런한 삶 / Cuộc sống siêng năng", "게으른 삶 / Cuộc sống lười biếng", "신앙생활 / Cuộc sống tôn giáo", "파티생활 / Cuộc sống tiệc tùng"] }
        ],
        en: [
          { meaning: "기준이 까다롭다 / To have high standards", example: "그녀는 눈이 높아서 아무나 안 만나요. / She has high standards so she doesn't date just anyone.", options: ["기준이 까다롭다 / To have high standards", "시력이 좋다 / To have good eyesight", "키가 크다 / To be tall", "자만하다 / To be arrogant"] },
          { meaning: "갓(God) + 인생 / God + Life, living a diligent life", example: "요즘 갓생 살려고 새벽 5시에 일어나요. / I wake up at 5am trying to live my best life.", options: ["부지런한 삶 / Diligent life", "게으른 삶 / Lazy life", "신앙생활 / Religious life", "파티생활 / Party life"] }
        ],
        zh: [
          { meaning: "기준이 까다롭다 / 眼光高，挑剔", example: "그녀는 눈이 높아서 아무나 안 만나요. / 她眼光很高，不会随便约会。", options: ["기준이 까다롭다 / 眼光高", "시력이 좋다 / 视力好", "키가 크다 / 个子高", "자만하다 / 自大"] },
          { meaning: "갓(God) + 인생 / God + 人生，勤奋有计划的生活", example: "요즘 갓생 살려고 새벽 5시에 일어나요. / 最近为了过充实的生活，凌晨5点起床。", options: ["부지런한 삶 / 勤奋的生活", "게으른 삶 / 懒惰的生活", "신앙생활 / 信仰生活", "파티생활 / 派对生活"] }
        ],
        ja: [
          { meaning: "기준이 까다롭다 / 目が高い、基準が厳しい", example: "그녀는 눈이 높아서 아무나 안 만나요. / 彼女は目が高いので誰とでもは付き合いません。", options: ["기준이 까다롭다 / 基準が高い", "시력이 좋다 / 視力が良い", "키가 크다 / 背が高い", "자만하다 / うぬぼれている"] },
          { meaning: "갓(God) + 인생 / God + 人生、勤勉で計画的な生活", example: "요즘 갓생 살려고 새벽 5시에 일어나요. / 最近充実した生活のために朝5時に起きています。", options: ["부지런한 삶 / 勤勉な生活", "게으른 삶 / 怠惰な生活", "신앙생활 / 信仰生活", "파티생활 / パーティー生活"] }
        ],
        ru: [
          { meaning: "기준이 까다롭다 / Высокие стандарты, придирчивый", example: "그녀는 눈이 높아서 아무나 안 만나요. / У неё высокие стандарты, она не встречается с кем попало.", options: ["기준이 까다롭다 / Высокие стандарты", "시력이 좋다 / Хорошее зрение", "키가 크다 / Высокий рост", "자만하다 / Высокомерный"] },
          { meaning: "갓(God) + 인생 / God + Жизнь, усердная и планомерная жизнь", example: "요즘 갓생 살려고 새벽 5시에 일어나요. / Сейчас встаю в 5 утра, чтобы жить лучшей жизнью.", options: ["부지런한 삶 / Усердная жизнь", "게으른 삶 / Ленивая жизнь", "신앙생활 / Религиозная жизнь", "파티생활 / Вечеринки"] }
        ],
        uz: [
          { meaning: "기준이 까다롭다 / Talabi yuqori, tanlab oluvchi", example: "그녀는 눈이 높아서 아무나 안 만나요. / Uning talabi yuqori, hamma bilan uchrashavermaydi.", options: ["기준이 까다롭다 / Talabi yuqori", "시력이 좋다 / Ko'rish yaxshi", "키가 크다 / Bo'yi baland", "자만하다 / Manman"] },
          { meaning: "갓(God) + 인생 / God + Hayot, tirishqoq va rejali hayot", example: "요즘 갓생 살려고 새벽 5시에 일어나요. / Hozir eng yaxshi hayot uchun ertalab 5 da turaman.", options: ["부지런한 삶 / Tirishqoq hayot", "게으른 삶 / Dangasa hayot", "신앙생활 / Diniy hayot", "파티생활 / Ziyofat hayoti"] }
        ]
      };
      
      const fallback = bilingualFallbacks[language] || bilingualFallbacks.en;
      quiz = {
        questions: [
          {
            expression: "눈이 높다",
            ...fallback[0],
            correctIndex: 0,
            category: "idiom",
            difficulty: "easy"
          },
          {
            expression: "갓생",
            ...fallback[1],
            correctIndex: 0,
            category: "slang",
            difficulty: "easy"
          }
        ]
      };
    }

    return new Response(JSON.stringify(quiz), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[idiom-slang-quiz] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
