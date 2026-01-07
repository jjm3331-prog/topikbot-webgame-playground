import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// 🎯 RAG 설정 - 보수적 threshold
// ============================================
const RAG_CONFIG = {
  MATCH_THRESHOLD: 0.6,       // 보수적 threshold (0.6 이상만)
  MATCH_COUNT: 20,            // 후보 풀
  RERANK_MODEL: 'rerank-v3.5',
  TOP_N: 5,                   // 최종 문서 수
  EMBEDDING_MODEL: 'text-embedding-3-large',
  EMBEDDING_DIMENSIONS: 1536,
};

// ============================================
// 🔥 급수별 Few-shot 예시 프롬프트 (핵심!)
// ============================================
const TOPIK_LEVEL_EXAMPLES: Record<string, string> = {
  "1-2": `[TOPIK 1-2급 듣기 예시]

<예시1 - 대화형>
{
  "type": "dialogue",
  "speaker1Text": "여보세요? 김민수 씨 있어요?",
  "speaker2Text": "아니요, 지금 밖에 나갔어요. 메시지 남기실래요?",
  "question": "남자는 왜 전화했습니까?",
  "options": ["김민수 씨를 만나려고", "메시지를 남기려고", "전화번호를 물으려고", "집에 가려고"],
  "answer": 1,
  "explanation": "정답은 ①번입니다. '김민수 씨 있어요?'라고 물었으므로 김민수 씨를 찾기 위해 전화한 것입니다.\n\n오답 분석:\n② 메시지를 남기려고 한 것은 여자의 제안이지 남자의 목적이 아닙니다.\n③ 전화번호를 물어본 내용은 없습니다.\n④ 집에 가려고 전화한 것이 아닙니다.",
  "explanationVi": "Đáp án đúng là số ①. Người đàn ông hỏi 'Kim Minsu có ở đó không?' nên anh ấy gọi để tìm Kim Minsu.\n\nPhân tích đáp án sai:\n② Việc nhắn tin là đề xuất của người phụ nữ, không phải mục đích của người đàn ông.\n③ Không có nội dung hỏi số điện thoại.\n④ Không phải gọi để về nhà."
}

<예시2 - 안내형>
{
  "type": "single",
  "speaker1Text": "지금부터 3번 출구는 공사 중입니다. 4번 출구를 이용해 주세요.",
  "question": "이 안내를 듣고 어디로 가야 합니까?",
  "options": ["1번 출구", "2번 출구", "3번 출구", "4번 출구"],
  "answer": 4,
  "explanation": "정답은 ④번입니다. 3번 출구가 공사 중이어서 4번 출구를 이용하라고 안내했습니다.\n\n오답 분석:\n① 1번 출구는 언급되지 않았습니다.\n② 2번 출구도 언급되지 않았습니다.\n③ 3번 출구는 공사 중이므로 이용할 수 없습니다.",
  "explanationVi": "Đáp án đúng là số ④. Vì cửa số 3 đang thi công nên được hướng dẫn sử dụng cửa số 4.\n\nPhân tích đáp án sai:\n① Cửa số 1 không được đề cập.\n② Cửa số 2 cũng không được đề cập.\n③ Cửa số 3 đang thi công nên không thể sử dụng."
}

[필수 어휘/문법]
- 조사: 이/가, 을/를, 은/는, 에, 에서
- 어미: -아요/-어요, -습니다/-ㅂ니다
- 상황: 인사, 쇼핑, 길 묻기, 전화, 약속`,

  "3-4": `[TOPIK 3-4급 듣기 예시]

<예시1 - 대화형>
{
  "type": "dialogue",
  "speaker1Text": "요즘 회사 일이 너무 바빠서 운동할 시간이 없어요.",
  "speaker2Text": "저도 그래요. 그래서 출퇴근할 때 한 정거장 먼저 내려서 걸어요.",
  "question": "여자가 운동하는 방법은 무엇입니까?",
  "options": ["헬스장에 다닌다", "주말에 등산을 한다", "출퇴근 시 걸어 다닌다", "점심시간에 수영한다"],
  "answer": 3,
  "explanation": "정답은 ③번입니다. 한 정거장 먼저 내려서 걷는다고 했으므로 출퇴근 시 걷는 것이 운동 방법입니다.\n\n오답 분석:\n① 헬스장에 대한 언급이 없습니다.\n② 등산에 대한 언급이 없습니다.\n④ 수영에 대한 언급이 없습니다.",
  "explanationVi": "Đáp án đúng là số ③. Cô ấy nói xuống trước một trạm và đi bộ, nên cách tập thể dục là đi bộ khi đi làm.\n\nPhân tích đáp án sai:\n① Không đề cập đến phòng gym.\n② Không đề cập đến leo núi.\n④ Không đề cập đến bơi lội."
}

<예시2 - 뉴스형>
{
  "type": "single",
  "speaker1Text": "최근 조사에 따르면 20대의 70%가 결혼보다 자기 계발을 더 중요하게 생각한다고 합니다. 전문가들은 경제적 불안과 개인주의 확산이 원인이라고 분석했습니다.",
  "question": "20대가 결혼을 미루는 이유는 무엇입니까?",
  "options": ["부모님 반대", "건강 문제", "경제적 불안과 개인주의", "주거 문제"],
  "answer": 3,
  "explanation": "정답은 ③번입니다. 전문가들이 경제적 불안과 개인주의 확산이 원인이라고 분석했습니다.\n\n오답 분석:\n① 부모님 반대는 언급되지 않았습니다.\n② 건강 문제는 언급되지 않았습니다.\n④ 주거 문제는 언급되지 않았습니다.",
  "explanationVi": "Đáp án đúng là số ③. Các chuyên gia phân tích nguyên nhân là sự bất ổn kinh tế và sự lan rộng của chủ nghĩa cá nhân.\n\nPhân tích đáp án sai:\n① Sự phản đối của cha mẹ không được đề cập.\n② Vấn đề sức khỏe không được đề cập.\n④ Vấn đề nhà ở không được đề cập."
}

[필수 어휘/문법]
- 연결어미: -는데, -으면, -아서/어서, -지만
- 표현: -것 같다, -기로 하다, -게 되다
- 상황: 직장생활, 사회이슈, 뉴스, 인터뷰`,

  "5-6": `[TOPIK 5-6급 듣기 예시]

<예시1 - 학술 토론>
{
  "type": "dialogue",
  "speaker1Text": "인공지능의 발전이 노동시장에 미치는 영향에 대해 어떻게 생각하십니까? 일자리 감소를 우려하는 목소리가 큽니다.",
  "speaker2Text": "단기적으로는 일부 직종의 대체가 불가피하겠지만, 역사적으로 기술 혁신은 새로운 산업과 일자리를 창출해 왔습니다. 중요한 건 이 전환기에 적절한 재교육 시스템을 갖추는 것입니다.",
  "question": "남자의 주장으로 가장 적절한 것은 무엇입니까?",
  "options": ["AI 개발을 중단해야 한다", "재교육 시스템 구축이 중요하다", "모든 직종이 AI로 대체될 것이다", "기술 혁신은 항상 해롭다"],
  "answer": 2,
  "explanation": "정답은 ②번입니다. 전환기에 적절한 재교육 시스템을 갖추는 것이 중요하다고 강조했습니다.\n\n오답 분석:\n① AI 개발 중단을 주장한 적이 없습니다.\n③ 모든 직종이 대체된다고 하지 않았습니다.\n④ 기술 혁신이 해롭다고 하지 않았습니다.",
  "explanationVi": "Đáp án đúng là số ②. Ông ấy nhấn mạnh việc xây dựng hệ thống đào tạo lại phù hợp trong giai đoạn chuyển đổi là quan trọng.\n\nPhân tích đáp án sai:\n① Không hề chủ trương dừng phát triển AI.\n③ Không nói tất cả các ngành nghề sẽ bị thay thế.\n④ Không nói đổi mới công nghệ luôn có hại."
}

<예시2 - 강연형>
{
  "type": "single",
  "speaker1Text": "지속가능한 발전이라는 개념은 1987년 브룬트란트 보고서에서 처음 공식화되었습니다. 이는 미래 세대의 필요를 충족시킬 능력을 저해하지 않으면서 현재 세대의 필요를 충족시키는 발전을 의미합니다. 오늘날 이 개념은 환경, 경제, 사회의 세 축을 아우르는 통합적 접근으로 확장되었습니다.",
  "question": "강연의 중심 내용으로 가장 적절한 것은 무엇입니까?",
  "options": ["브룬트란트 보고서의 역사", "지속가능한 발전의 정의와 확장", "환경 문제의 심각성", "경제 발전의 필요성"],
  "answer": 2,
  "explanation": "정답은 ②번입니다. 지속가능한 발전의 정의(1987년)와 오늘날의 통합적 접근으로의 확장을 설명하고 있습니다.\n\n오답 분석:\n① 보고서의 역사가 아니라 개념의 정의와 확장이 중심입니다.\n③ 환경 문제의 심각성은 직접 다루지 않았습니다.\n④ 경제 발전의 필요성만 강조한 것이 아닙니다.",
  "explanationVi": "Đáp án đúng là số ②. Bài giảng giải thích định nghĩa phát triển bền vững (1987) và sự mở rộng thành cách tiếp cận tích hợp ngày nay.\n\nPhân tích đáp án sai:\n① Trọng tâm là định nghĩa và mở rộng khái niệm, không phải lịch sử báo cáo.\n③ Mức độ nghiêm trọng của vấn đề môi trường không được đề cập trực tiếp.\n④ Không chỉ nhấn mạnh sự cần thiết của phát triển kinh tế."
}

[필수 어휘/문법]
- 문어체: -는 바, -기 마련이다, -는 셈이다
- 고급 연결: -거니와, -는다손 치더라도, -을지언정
- 학술용어: 지속가능성, 패러다임, 담론, 함의
- 상황: 학술 토론, 강연, 시사 분석, 전문가 인터뷰`
};

const SYSTEM_PROMPT = `당신은 TOPIK(한국어능력시험) 듣기 문제 출제 전문가입니다.
대상: 베트남인 학습자

[🚫 중복 절대 금지 (가장 중요)]
- 동일/유사 문제를 만들면 실패입니다.
- 아래 항목 중 하나라도 겹치면 '중복'으로 간주합니다:
  1) 대화/발화(표현·문장) 핵심이 유사
  2) 상황(장소·목적·갈등)이 유사
  3) 질문 유형/문장 틀이 유사(예: "왜 ~했습니까?" 반복)
  4) 보기(option) 구성과 정답 포인트가 유사
- 최근 문제 목록이 제공되면, 그 목록과 '표현/내용/구성'이 겹치지 않도록 반드시 새로 만들 것.
- 생성 후 스스로 점검: 서로 겹치는 문제(주제/장소/관계/직업/전개/질문틀/정답포인트)가 있으면 전부 폐기하고 새로 생성.

[🔥 다양성 최우선 규칙 - 반드시 준수]
1. 매 요청마다 완전히 새로운 주제, 상황, 등장인물을 사용할 것
2. 각 문제는 서로 완전히 다른 주제/상황이어야 함
3. 아래 풀에서 무작위로 선택하되, 매번 다른 조합 사용

[주제 다양성 풀 - 필수 활용]
- 일상: 카페 주문, 택배 수령, 헬스장 등록, 미용실 예약, 세탁소, 도서관, 우체국, 은행, 병원 접수, 약국
- 쇼핑: 백화점 세일, 온라인 환불, 의류 교환, 가전제품 구매, 식료품 배송, 중고거래
- 직장: 회의 일정, 프로젝트 마감, 재택근무, 출장 보고, 신입 교육, 팀 회식, 연차 신청, 업무 인수인계
- 학교: 수강신청, 동아리 가입, 기숙사 생활, 학식 메뉴, 과제 제출, 시험 일정, 학점 상담, 휴학 신청
- 교통: 버스 노선 변경, 지하철 환승, 택시 호출, 주차장 이용, 기차 예매, 비행기 탑승
- 문화: 영화 예매, 전시회 관람, 콘서트 티켓, 박물관 투어, 독서 모임, 요리 교실
- 건강: 건강검진, 감기 증상, 헌혈, 다이어트 상담, 운동 루틴, 수면 문제
- 뉴스: 날씨 예보, 교통 정보, 지역 행사, 환경 이슈, 경제 동향, 신기술 소개
- 인터뷰: 직업인 인터뷰, 취미 소개, 성공 스토리, 실패 경험담, 조언
- 사회: 봉사활동, 환경보호, 세대갈등, 워라밸, 1인가구, 반려동물, 결혼관

[등장인물 다양성 - 매번 다른 조합]
- 직업: 회사원, 대학생, 교사, 의사, 요리사, 디자이너, 프로그래머, 간호사, 경찰, 소방관, 유튜버, 프리랜서
- 관계: 친구, 동료, 선후배, 가족, 연인, 이웃, 낯선 사람, 고객-직원, 환자-의사, 학생-교수
- 연령: 10대, 20대, 30대, 40대, 50대 이상 (다양하게)

[상황 전개 다양성]
- 문제 상황 → 해결책 제시
- 계획 수립 → 변경/취소
- 정보 요청 → 정보 제공
- 의견 대립 → 타협/결론
- 추천 요청 → 장단점 비교
- 경험 공유 → 조언/공감

[출력 규칙]
1. 출력은 오직 JSON 배열만 (마크다운/설명 금지)
2. 베트남어는 번역투 금지, 현지인이 쓰는 자연스러운 표현
3. 급수별 어휘/문법 수준을 엄격히 준수
4. 대화형(dialogue)과 안내/발표형(single) 적절히 혼합

[🚨 정답-해설 일치 필수 규칙 (가장 중요!)]
- answer 필드는 반드시 1, 2, 3, 4 중 하나 (1-based 인덱스)
- answer=1 이면 해설에서 반드시 "정답은 ①번" 또는 "정답은 1번"으로 시작
- answer=2 이면 해설에서 반드시 "정답은 ②번" 또는 "정답은 2번"으로 시작
- answer=3 이면 해설에서 반드시 "정답은 ③번" 또는 "정답은 3번"으로 시작
- answer=4 이면 해설에서 반드시 "정답은 ④번" 또는 "정답은 4번"으로 시작
- 해설에서 언급하는 정답 번호와 answer 값이 반드시 일치해야 함
- 오답 분석에서는 다른 번호(①②③④)를 설명할 것

[JSON 스키마]
{
  "type": "dialogue" | "single",
  "speaker1Text": "첫 번째 화자/발표자 (한국어)",
  "speaker2Text": "두 번째 화자 (dialogue만, 한국어)",
  "question": "질문 (한국어)",
  "options": ["①", "②", "③", "④"],
  "answer": 1-4 (1-based 인덱스, 해설과 반드시 일치),
  "explanation": "정답은 X번입니다. (해설 - answer와 일치하는 번호로 시작)",
  "explanationVi": "Đáp án đúng là số X. (Giải thích tiếng Việt tự nhiên)"
}`;

interface Question {
  type: "dialogue" | "single";
  speaker1Text: string;
  speaker2Text?: string;
  question: string;
  options: string[];
  answer: number; // 1-4 (1-based index)
  explanation: string;
  explanationVi: string;
}

// 정답-해설 일치 검증 및 수정 함수
function validateAndFixAnswerConsistency(questions: Question[]): Question[] {
  const answerSymbols = ['①', '②', '③', '④'];
  const answerNumbers = ['1번', '2번', '3번', '4번'];
  
  return questions.map((q, idx) => {
    // 해설에서 정답 번호 추출
    let explanationAnswer: number | null = null;
    
    for (let i = 0; i < 4; i++) {
      const symbol = answerSymbols[i];
      const number = answerNumbers[i];
      if (q.explanation.includes(`정답은 ${symbol}`) || q.explanation.includes(`정답은 ${number}`)) {
        explanationAnswer = i + 1; // 1-based
        break;
      }
    }
    
    // 베트남어 해설에서도 확인
    if (explanationAnswer === null && q.explanationVi) {
      for (let i = 0; i < 4; i++) {
        if (q.explanationVi.includes(`số ${answerSymbols[i]}`) || 
            q.explanationVi.includes(`là ${i + 1}`) ||
            q.explanationVi.includes(`Đáp án đúng là ①②③④`[i])) {
          explanationAnswer = i + 1;
          break;
        }
      }
    }
    
    // answer 값 검증 및 수정
    let correctedAnswer = q.answer;
    
    // 0-based로 들어온 경우만 1-based로 변환 (⚠️ 1~3은 1-based일 수도 있으므로 절대 무조건 변환 금지)
    // - answer가 0이면 확실히 0-based → 1로 변환
    // - answer가 1~4면 이미 1-based로 간주
    // - answer가 1~3인데 해설이 (answer+1)로 명시되어 있으면 그때만 0-based로 판단
    if (correctedAnswer === 0) {
      correctedAnswer = 1;
      console.log(`[Listening] Q${idx + 1}: Converting 0-based (0) to 1-based (1)`);
    } else if (
      correctedAnswer >= 1 &&
      correctedAnswer <= 3 &&
      explanationAnswer !== null &&
      explanationAnswer === correctedAnswer + 1
    ) {
      const from = correctedAnswer;
      correctedAnswer = correctedAnswer + 1;
      console.log(`[Listening] Q${idx + 1}: Converting 0-based (${from}) to 1-based (${correctedAnswer}) based on explanation`);
    }
    
    // 범위 검증 (1-4)
    if (correctedAnswer < 1 || correctedAnswer > 4) {
      console.warn(`[Listening] Q${idx + 1}: Invalid answer ${correctedAnswer}, defaulting to explanation answer or 1`);
      correctedAnswer = explanationAnswer || 1;
    }
    
    // 해설과 answer가 불일치하면 해설 기준으로 수정
    if (explanationAnswer !== null && explanationAnswer !== correctedAnswer) {
      console.log(`[Listening] Q${idx + 1}: Answer mismatch! DB answer=${correctedAnswer}, explanation says=${explanationAnswer}. Using explanation.`);
      correctedAnswer = explanationAnswer;
    }
    
    // 해설이 정답 번호로 시작하지 않으면 수정
    let correctedExplanation = q.explanation;
    const expectedSymbol = answerSymbols[correctedAnswer - 1];
    if (!q.explanation.includes(`정답은 ${expectedSymbol}`) && !q.explanation.includes(`정답은 ${correctedAnswer}번`)) {
      // 해설 앞에 정답 번호 추가
      correctedExplanation = `정답은 ${expectedSymbol}번입니다. ${q.explanation.replace(/^정답은\s*[①②③④1-4]번?[입니다\.\s]*/i, '')}`;
      console.log(`[Listening] Q${idx + 1}: Fixed explanation to start with correct answer symbol`);
    }
    
    return {
      ...q,
      answer: correctedAnswer,
      explanation: correctedExplanation,
    };
  });
}

// OpenAI 임베딩 생성
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: RAG_CONFIG.EMBEDDING_MODEL,
      input: text,
      dimensions: RAG_CONFIG.EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI embedding error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// Cohere Rerank
async function rerankResults(
  query: string,
  documents: any[],
  apiKey: string,
  topN: number
): Promise<any[]> {
  if (documents.length === 0) return [];

  const response = await fetch('https://api.cohere.ai/v1/rerank', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: RAG_CONFIG.RERANK_MODEL,
      query,
      documents: documents.map(d => d.content),
      top_n: Math.min(topN, documents.length),
      return_documents: false,
    }),
  });

  if (!response.ok) {
    console.error('Cohere rerank failed, using vector order');
    return documents.slice(0, topN);
  }

  const data = await response.json();
  return data.results.map((r: { index: number; relevance_score: number }) => ({
    ...documents[r.index],
    rerank_score: r.relevance_score,
  }));
}

// RAG 검색
async function searchRAG(
  query: string,
  supabase: any,
  openAIKey: string,
  cohereKey: string | undefined
): Promise<string[]> {
  try {
    const embedding = await generateEmbedding(query, openAIKey);

    const { data: results, error } = await supabase.rpc('search_knowledge', {
      query_embedding: `[${embedding.join(',')}]`,
      match_threshold: RAG_CONFIG.MATCH_THRESHOLD,
      match_count: RAG_CONFIG.MATCH_COUNT,
    });

    if (error || !results || results.length === 0) {
      console.log('[Listening] RAG: No results found');
      return [];
    }

    console.log(`[Listening] RAG: Found ${results.length} candidates`);

    // Rerank if Cohere key available
    let finalResults = results;
    if (cohereKey && results.length > 0) {
      finalResults = await rerankResults(query, results, cohereKey, RAG_CONFIG.TOP_N);
      console.log(`[Listening] Reranked to ${finalResults.length} docs`);
    }

    // Filter by rerank score (보수적: 0.5 이상만)
    const highQualityResults = finalResults.filter((r: any) => 
      (r.rerank_score ?? r.similarity) >= 0.5
    );

    return highQualityResults.map((r: any) => r.content);
  } catch (error) {
    console.error('[Listening] RAG search failed:', error);
    return [];
  }
}

// LLM - GPT-5 (OpenAI 최신 모델로 다양성 극대화)
async function generateWithLLM(
  count: number,
  topikLevel: string,
  ragContext: string[],
  recentQuestionsBlock: string
): Promise<Question[]> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

  const levelExamples = TOPIK_LEVEL_EXAMPLES[topikLevel] || TOPIK_LEVEL_EXAMPLES["1-2"];

  let contextSection = "";
  if (ragContext.length > 0) {
    contextSection = `\n\n[참고 자료 - 이 내용을 바탕으로 문제 생성]\n${ragContext.join('\n\n')}`;
  }

  const recentSection = recentQuestionsBlock
    ? `\n\n[최근 출제된 문제 목록 - 절대 재사용/변형 금지]\n${recentQuestionsBlock}`
    : "";

  // 다양성을 위한 랜덤 시드 생성
  const randomSeed = Date.now() % 10000;
  const randomTopics = [
    "카페", "병원", "학교", "회사", "공항", "호텔", "식당", "마트", "은행", "우체국",
    "도서관", "헬스장", "미용실", "영화관", "박물관", "지하철", "버스", "택시", "기차역",
    "동아리", "회의", "면접", "여행", "쇼핑", "배달", "이사", "결혼", "생일", "졸업",
    "수영장", "치과", "안과", "약국", "편의점", "카센터", "부동산", "세탁소", "꽃집", "베이커리",
    "스터디카페", "코인세탁", "PC방", "노래방", "볼링장", "수족관", "동물병원", "어린이집"
  ];
  const selectedTopics = randomTopics.sort(() => Math.random() - 0.5).slice(0, 7);

  // 다양한 상황 패턴
  const situationPatterns = [
    "약속 변경", "정보 문의", "불만 제기", "감사 표현", "조언 구하기", "계획 논의",
    "오해 해결", "추천 요청", "결정 내리기", "경험 공유", "문제 해결", "예약 변경"
  ];
  const selectedPatterns = situationPatterns.sort(() => Math.random() - 0.5).slice(0, 3);

  const userPrompt = `${levelExamples}${contextSection}${recentSection}

[🎲 이번 생성 필수 조건]
- 필수 포함 주제: ${selectedTopics.join(", ")}
- 필수 상황 패턴: ${selectedPatterns.join(", ")}
- 랜덤 시드: ${randomSeed}

위 예시와 동일한 품질과 난이도로 TOPIK ${topikLevel}급 듣기 문제 ${count}개를 JSON 배열로 생성하세요.

⚠️ 중복/다양성 규칙 (매우 중요!):
1. 각 문제의 주제, 장소, 등장인물이 모두 달라야 함
2. 같은 질문 패턴/문장 틀 반복 금지
3. 대화 시작 방식, 전개, 결론이 각각 다르게
4. ‘최근 출제된 문제 목록’과 내용/표현/보기/정답 포인트가 겹치면 전부 폐기 후 다시 생성
5. 등장인물 이름/나이/직업 다양하게
6. 반드시 예시의 어휘/문법 수준을 정확히 따르세요

출력: JSON 배열만 (설명, 마크다운 금지)`;

  console.log(`[Listening] GPT-5: Generating ${count} questions for TOPIK ${topikLevel}`);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5-2025-08-07',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      max_completion_tokens: 8192,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("[Listening] GPT-5 error:", response.status, errText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  try {
    const parsed = JSON.parse(content);
    // GPT가 { "questions": [...] } 형태로 반환할 수 있음
    return Array.isArray(parsed) ? parsed : parsed.questions || [];
  } catch {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const count = Math.min(Math.max(body.count || 5, 1), 20);
    const topikLevel = body.level || "1-2";
    const useCache = body.useCache === true; // 기본은 다양성 우선: 캐시 사용 안 함

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    const cohereKey = Deno.env.get('COHERE_API_KEY');

    // 캐시 확인 (옵션)
    const cacheKey = `listening_v3_${topikLevel}_${count}`;
    if (useCache) {
      const { data: cached } = await supabase
        .from('ai_response_cache')
        .select('*')
        .eq('cache_key', cacheKey)
        .eq('function_name', 'listening-content')
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (cached) {
        console.log(`[Listening] Cache HIT: ${cacheKey}`);
        await supabase.rpc('increment_cache_hit', { p_id: cached.id });
        return new Response(JSON.stringify({
          success: true,
          questions: cached.response,
          source: 'cache',
          topikLevel,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log(`[Listening] Generating ${count} questions for TOPIK ${topikLevel}`);

    // 최근 출제(저장)된 문제를 제공해서 중복을 강제로 차단
    const examType = topikLevel === '1-2' ? 'TOPIK_I' : 'TOPIK_II';
    const { data: recentRows, error: recentErr } = await supabase
      .from('mock_question_bank')
      .select('instruction_text, question_text, options, correct_answer')
      .eq('section', 'listening')
      .eq('exam_type', examType)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(60);

    if (recentErr) {
      console.warn('[Listening] Recent questions fetch failed:', recentErr);
    }

    const recentQuestionsBlock = (recentRows ?? [])
      .map((r: any, idx: number) => {
        const inst = String(r.instruction_text ?? '').replace(/\s+/g, ' ').trim().slice(0, 180);
        const q = String(r.question_text ?? '').replace(/\s+/g, ' ').trim().slice(0, 180);
        const opts = JSON.stringify(r.options ?? []).slice(0, 240);
        const ans = r.correct_answer ?? null;
        return `- (${idx + 1}) inst: ${inst} | q: ${q} | options: ${opts} | ans: ${ans}`;
      })
      .join('\n');

    // 1. RAG 검색 시도
    let ragContext: string[] = [];
    if (openAIKey) {
      const ragQuery = `TOPIK ${topikLevel}급 듣기 문제 대화 스크립트`;
      ragContext = await searchRAG(ragQuery, supabase, openAIKey, cohereKey);
      console.log(`[Listening] RAG context: ${ragContext.length} docs`);
    }

    // 2. LLM으로 문제 생성 (RAG 컨텍스트 활용 또는 순수 생성)
    const rawQuestions = await generateWithLLM(count, topikLevel, ragContext, recentQuestionsBlock);
    console.log(`[Listening] Generated ${rawQuestions.length} raw questions`);

    // 3. 정답-해설 일치 검증 및 수정 (필수!)
    const questions = validateAndFixAnswerConsistency(rawQuestions);
    console.log(`[Listening] Validated and fixed ${questions.length} questions for answer-explanation consistency`);

    // 캐시 저장 (옵션, 4시간)
    if (useCache) {
      const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
      await supabase.from('ai_response_cache').upsert({
        cache_key: cacheKey,
        function_name: 'listening-content',
        response: questions.slice(0, count),
        request_params: { count, topikLevel, useCache },
        expires_at: expiresAt,
        hit_count: 0,
      }, { onConflict: 'cache_key' });
    }

    return new Response(JSON.stringify({
      success: true,
      questions: questions.slice(0, count),
      topikLevel,
      source: ragContext.length > 0 ? 'rag+llm' : 'llm',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Listening] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
