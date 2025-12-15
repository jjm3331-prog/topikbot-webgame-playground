import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 시즌 1: 데뷔 전쟁 - 12 챕터 구조
const SEASON_1_CHAPTERS = {
  1: {
    title_ko: "잔인한 통보",
    title_vi: "Thông báo tàn nhẫn",
    day: "DAY 1 - 월요일 오전 10시",
    location: "연습실 A",
    summary: "회사가 갑작스럽게 데뷔조 3명을 확정하고 나머지를 탈락시킴. 당신은 탈락 통보를 대신 전해야 함.",
    npcs: ["강도윤 대표", "탈락 연습생 민서"],
    mood: "긴장, 슬픔, 불안",
    mission_focus: "공감 + 사실 전달"
  },
  2: {
    title_ko: "경계선",
    title_vi: "Ranh giới",
    day: "DAY 2 - 화요일 밤 11시",
    location: "녹음실",
    summary: "데뷔조 연습생 한 명이 멘탈 붕괴. 대표는 녹음 강행, 트레이너는 휴식 권유. 당신이 결정해야 함.",
    npcs: ["강도윤 대표", "트레이너 박지연", "연습생 수민"],
    mood: "위기, 갈등",
    mission_focus: "중재 + 안전 우선"
  },
  3: {
    title_ko: "첫 번째 거래",
    title_vi: "Giao dịch đầu tiên",
    day: "DAY 5 - 금요일 오후 3시",
    location: "방송국 회의실",
    summary: "예능 PD와의 첫 미팅. 조건 협상이 필요함. 굴욕적인 캐릭터 강요 vs 노출 기회.",
    npcs: ["예능 PD 최민호"],
    mood: "긴장, 계산적",
    mission_focus: "협상 + 조건절"
  }
};

const SYSTEM_PROMPT = `당신은 K-POP 매니저 시뮬레이션 게임 "LUKATO 매니저"의 스토리 작가 AI입니다.

역할: 드라마틱하고 몰입감 있는 시각적 스토리를 생성합니다.

스타일 가이드:
- 한국 드라마/영화 같은 긴장감과 감정 전달
- 각 씬은 마치 넷플릭스 K-드라마 에피소드처럼 구체적으로
- NPC 대사는 현실적이고 캐릭터성 있게 (대표는 카리스마, 연습생은 불안)
- 상황 묘사는 오감을 자극하듯 생생하게

응답 형식 (JSON만):
{
  "scene": {
    "prologue_ko": "씬 시작 전 나레이션 (2-3문장, 상황/분위기 설명)",
    "prologue_vi": "베트남어 나레이션",
    "setting_ko": "구체적 배경 묘사 (연습실의 형광등, 대표의 차가운 눈빛 등)",
    "setting_vi": "베트남어 배경 묘사"
  },
  "dialogue": [
    {
      "speaker": "NPC 이름",
      "emotion": "분노/슬픔/냉정/불안/희망 중 택1",
      "text_ko": "한국어 대사",
      "text_vi": "베트남어 번역",
      "action": "행동 묘사 (선택사항)"
    }
  ],
  "mission": {
    "intro_ko": "미션 상황 설명",
    "intro_vi": "베트남어 미션 설명",
    "prompt_ko": "플레이어가 해야 할 말의 방향 제시",
    "prompt_vi": "베트남어 프롬프트",
    "tips": ["팁1", "팁2"],
    "forbidden": ["피해야 할 말/태도"]
  },
  "branches": {
    "success": "성공 시 다음 전개 힌트",
    "warning": "경고 시 다음 전개 힌트",
    "fail": "실패 시 다음 전개 힌트"
  }
}

주의:
- 대사는 자연스러운 한국어 구어체
- 감정 표현은 과장하지 말고 현실적으로
- 미션 프롬프트는 TOPIK 3-5 학습자가 이해하고 시도할 수 있게`;

function validateNumber(value: unknown, min: number, max: number): number | null {
  if (typeof value !== 'number' || isNaN(value)) return null;
  if (value < min || value > max) return null;
  return value;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chapterNumber, groupName, groupGender, groupConcept, previousResult, currentStats } = await req.json();

    const validChapter = validateNumber(chapterNumber, 1, 12) || 1;
    const chapter = SEASON_1_CHAPTERS[validChapter as keyof typeof SEASON_1_CHAPTERS] || SEASON_1_CHAPTERS[1];

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const userPrompt = `
그룹 정보:
- 이름: ${groupName || 'LUKATO'}
- 성별: ${groupGender === 'male' ? '남자 그룹' : groupGender === 'female' ? '여자 그룹' : '혼성 그룹'}
- 컨셉: ${groupConcept || 'fresh'}

챕터 ${validChapter}: ${chapter.title_ko}
- 시간: ${chapter.day}
- 장소: ${chapter.location}
- 상황: ${chapter.summary}
- 등장인물: ${chapter.npcs.join(', ')}
- 분위기: ${chapter.mood}
- 미션 초점: ${chapter.mission_focus}

${previousResult ? `이전 미션 결과: ${previousResult}` : ''}
${currentStats ? `현재 지표: 멘탈 ${currentStats.mental}, 케미 ${currentStats.chemistry}, 미디어 ${currentStats.media_tone}, 루머 ${currentStats.rumor}` : ''}

위 정보를 바탕으로 드라마틱한 씬을 생성하세요. 
마치 tvN 드라마 첫 화처럼 긴장감 있게 시작해주세요.
NPC 대사는 최소 2개, 최대 4개.
플레이어가 한국어로 응답해야 하는 미션을 포함하세요.`;

    console.log('Generating story for chapter:', validChapter);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `${SYSTEM_PROMPT}\n\n${userPrompt}` }]
          }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 2048
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error('스토리 생성 실패');
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // JSON 추출
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Failed to parse story JSON:', text);
      throw new Error('스토리 파싱 실패');
    }

    const storyData = JSON.parse(jsonMatch[0]);

    // 챕터 메타데이터 추가
    const result = {
      chapter: {
        number: validChapter,
        title_ko: chapter.title_ko,
        title_vi: chapter.title_vi,
        day: chapter.day,
        location: chapter.location
      },
      ...storyData
    };

    console.log('Story generated successfully');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Manager story error:', error);
    
    // 폴백 스토리
    return new Response(JSON.stringify({
      chapter: { number: 1, title_ko: "잔인한 통보", title_vi: "Thông báo tàn nhẫn", day: "DAY 1", location: "연습실 A" },
      scene: {
        prologue_ko: "형광등 불빛이 차갑게 내리쬐는 연습실. 오늘, 네 명의 운명이 갈린다.",
        prologue_vi: "Ánh đèn huỳnh quang lạnh lẽo chiếu xuống phòng tập. Hôm nay, số phận của bốn người sẽ được định đoạt.",
        setting_ko: "연습실 거울에 비친 연습생들의 불안한 눈빛. 대표가 문을 열고 들어온다.",
        setting_vi: "Ánh mắt lo lắng của các thực tập sinh phản chiếu trong gương. Đại diện mở cửa bước vào."
      },
      dialogue: [
        {
          speaker: "강도윤 대표",
          emotion: "냉정",
          text_ko: "오늘 안에 정리해. 데뷔조는 세 명. 나머지는... 알지?",
          text_vi: "Hôm nay phải xong. Đội debut ba người. Còn lại... hiểu rồi chứ?",
          action: "차갑게 서류를 내려놓는다"
        }
      ],
      mission: {
        intro_ko: "탈락 통보를 직접 전해야 한다. 대표는 이미 떠났고, 민서가 당신을 바라보고 있다.",
        intro_vi: "Bạn phải trực tiếp thông báo kết quả loại. Đại diện đã rời đi, Minseo đang nhìn bạn.",
        prompt_ko: "민서에게 탈락 사실을 공감하며 전달하세요. 공감 → 사실 → 대안 순서로.",
        prompt_vi: "Hãy thông báo kết quả cho Minseo với sự đồng cảm. Theo thứ tự: Đồng cảm → Sự thật → Lựa chọn.",
        tips: ["존댓말 사용", "감정을 인정해주세요", "다음 기회를 언급"],
        forbidden: ["냉정하게 말하지 마세요", "거짓 희망을 주지 마세요"]
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
