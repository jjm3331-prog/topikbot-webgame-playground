import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 대단원 정보 (unit_number -> title)
const UNITS: { [key: number]: string } = {
  1: "현대 문화와 전통문화",
  2: "자연과 환경",
  3: "일상생활과 여가 생활",
  4: "신체와 건강",
  5: "시간과 장소",
  6: "교통",
  7: "언어와 교육",
  8: "감정·감각·생각·판단",
  9: "문제와 해결",
  10: "관계 I",
  11: "관계 II",
  12: "경제와 생활",
  13: "법과 제도",
  14: "상태",
  15: "개념",
  16: "반의어 I",
  17: "반의어 II",
  18: "접사",
};

// Day -> Unit 매핑
const DAY_TO_UNIT: { [key: number]: number } = {
  1: 1, 2: 1, 3: 1,
  4: 2, 5: 2, 6: 2, 7: 2, 8: 2,
  9: 3, 10: 3, 11: 3, 12: 3,
  13: 4, 14: 4, 15: 4, 16: 4,
  17: 5, 18: 5, 19: 5, 20: 5, 21: 5,
  22: 6, 23: 6, 24: 6, 25: 6, 26: 6,
  27: 7, 28: 7, 29: 7, 30: 7, 31: 7,
  32: 8, 33: 8, 34: 8, 35: 8, 36: 8, 37: 8,
  38: 9, 39: 9, 40: 9, 41: 9,
  42: 10, 43: 10, 44: 10, 45: 10,
  46: 11, 47: 11, 48: 11, 49: 11,
  50: 12, 51: 12, 52: 12, 53: 12, 54: 12, 55: 12, 56: 12,
  57: 13, 58: 13, 59: 13, 60: 13, 61: 13,
  62: 14, 63: 14, 64: 14,
  65: 15, 66: 15, 67: 15, 68: 15,
  69: 16, 70: 16, 71: 16, 72: 16, 73: 16, 74: 16,
  75: 17, 76: 17, 77: 17, 78: 17, 79: 17,
  80: 18, 81: 18, 82: 18,
};

// Day 토픽 정보
const DAY_TOPICS: { [key: number]: string } = {
  1: "예술과 문화", 2: "전통과 유산 1", 3: "전통과 유산 2",
  4: "자연 1", 5: "자연 2", 6: "자연 3", 7: "날씨", 8: "환경",
  9: "음식", 10: "패션", 11: "집", 12: "여가 생활",
  13: "얼굴", 14: "몸", 15: "병", 16: "치료",
  17: "시간 1", 18: "시간 2", 19: "순서", 20: "장소 1", 21: "장소 2",
  22: "이동 1", 23: "이동 2", 24: "위치 1", 25: "위치 2", 26: "범위",
  27: "언어 1", 28: "언어 2", 29: "언어 3", 30: "교육 1", 31: "교육 2",
  32: "마음과 감정", 33: "감각 1", 34: "감각 2", 35: "생각 1", 36: "생각 2", 37: "판단",
  38: "문제와 해결 1", 39: "문제와 해결 2", 40: "문제와 해결 3", 41: "문제와 해결 4",
  42: "사람 1", 43: "사람 2", 44: "태도", 45: "인생",
  46: "관계 1", 47: "관계 2", 48: "관계 3", 49: "관계 4",
  50: "돈 1", 51: "돈 2", 52: "경제 1", 53: "경제 2", 54: "경제 3", 55: "업무", 56: "직업",
  57: "법 1", 58: "법 2", 59: "법 3", 60: "범죄", 61: "정치",
  62: "상태 1", 63: "상태 2", 64: "상태 3",
  65: "모양과 모습", 66: "개념 1", 67: "개념 2", 68: "개념 3",
  69: "반의어 1", 70: "반의어 2", 71: "반의어 3", 72: "반의어 4", 73: "반의어 5", 74: "반의어 6",
  75: "반의어 7", 76: "반의어 8", 77: "반의어 9", 78: "반의어 10", 79: "반의어 11",
  80: "접두사", 81: "접미사", 82: "사물",
};

interface HanjaRoot {
  meaning_ko: string;
  reading_ko: string;
  hanja: string;
  meaning_en: string;
  meaning_ja: string;
  meaning_zh: string;
  meaning_vi: string;
  words: HanjaWord[];
}

interface HanjaWord {
  word: string;
  meaning_en: string;
  meaning_ja: string;
  meaning_zh: string;
  meaning_vi: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { markdown, dayNumber } = await req.json();

    if (!markdown || !dayNumber) {
      return new Response(
        JSON.stringify({ error: "markdown and dayNumber are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the markdown content for the specific day
    const parsedData = parseMarkdownForDay(markdown, dayNumber);

    if (!parsedData || parsedData.roots.length === 0) {
      return new Response(
        JSON.stringify({ error: `No data found for Day ${dayNumber}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get or create unit
    const unitNumber = DAY_TO_UNIT[dayNumber] || 1;
    const unitTitle = UNITS[unitNumber] || "기타";

    let { data: unitData } = await supabaseClient
      .from("hanja_units")
      .select("id")
      .eq("unit_number", unitNumber)
      .single();

    if (!unitData) {
      const { data: newUnit, error: unitError } = await supabaseClient
        .from("hanja_units")
        .insert({ unit_number: unitNumber, title_ko: unitTitle })
        .select("id")
        .single();

      if (unitError) throw unitError;
      unitData = newUnit;
    }

    // Get or create day
    const dayTopic = DAY_TOPICS[dayNumber] || `Day ${dayNumber}`;

    let { data: dayData } = await supabaseClient
      .from("hanja_days")
      .select("id")
      .eq("day_number", dayNumber)
      .single();

    if (!dayData) {
      const { data: newDay, error: dayError } = await supabaseClient
        .from("hanja_days")
        .insert({ 
          unit_id: unitData.id, 
          day_number: dayNumber, 
          topic_ko: dayTopic 
        })
        .select("id")
        .single();

      if (dayError) throw dayError;
      dayData = newDay;
    }

    // Delete existing roots and words for this day (to allow re-import)
    await supabaseClient
      .from("hanja_roots")
      .delete()
      .eq("day_id", dayData.id);

    // Insert roots and words
    let rootOrder = 0;
    for (const root of parsedData.roots) {
      const { data: rootData, error: rootError } = await supabaseClient
        .from("hanja_roots")
        .insert({
          day_id: dayData.id,
          hanja: root.hanja,
          reading_ko: root.reading_ko,
          meaning_ko: root.meaning_ko,
          meaning_en: root.meaning_en,
          meaning_ja: root.meaning_ja,
          meaning_zh: root.meaning_zh,
          meaning_vi: root.meaning_vi,
          display_order: rootOrder++,
        })
        .select("id")
        .single();

      if (rootError) throw rootError;

      // Insert words for this root
      let wordOrder = 0;
      for (const word of root.words) {
        const { error: wordError } = await supabaseClient
          .from("hanja_words")
          .insert({
            root_id: rootData.id,
            word: word.word,
            meaning_en: word.meaning_en,
            meaning_ja: word.meaning_ja,
            meaning_zh: word.meaning_zh,
            meaning_vi: word.meaning_vi,
            display_order: wordOrder++,
          });

        if (wordError) throw wordError;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        dayNumber, 
        rootsCount: parsedData.roots.length,
        wordsCount: parsedData.roots.reduce((acc, r) => acc + r.words.length, 0)
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function parseMarkdownForDay(markdown: string, dayNumber: number): { roots: HanjaRoot[] } {
  const roots: HanjaRoot[] = [];
  const lines = markdown.split("\n");

  // Find the start of the target day section
  // Pattern: "Day 01 예술과 문화" or "### Day 01"
  const dayStr = String(dayNumber).padStart(2, "0");
  const dayPattern = new RegExp(`Day\\s*${dayStr}\\b`, "i");
  const nextDayPattern = /Day\s*\d{2}\b/i;

  let inTargetDay = false;
  let dayContent: string[] = [];
  let foundDayHeader = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for day header
    if (dayPattern.test(line)) {
      inTargetDay = true;
      foundDayHeader = true;
      continue;
    }

    if (inTargetDay) {
      // Check for next day or unit header
      if (foundDayHeader && nextDayPattern.test(line) && !dayPattern.test(line)) {
        break; // Next day found, stop
      }
      // Also stop at unit headers like "## 2"
      if (/^##\s*\d+\s*$/.test(line.trim())) {
        break;
      }
      dayContent.push(line);
    }
  }

  if (dayContent.length === 0) {
    console.log(`No content found for Day ${dayNumber}`);
    return { roots };
  }

  console.log(`Found ${dayContent.length} lines for Day ${dayNumber}`);

  // Parse roots from day content
  // Pattern: ### 한글의미 한자음漢字 (e.g., "### 그림 도圖")
  // Alternative: "### 그림 화畫" or "#### 보여주다/행하다 연演"
  const rootPattern = /^#{2,4}\s+(.+?)\s+([가-힣]+)([一-龥々]+)$/;

  let currentRoot: HanjaRoot | null = null;
  let meaningBuffer: string[] = [];
  let wordsBuffer: string[] = [];
  let parsingState: "meanings" | "words" | "idle" = "idle";

  for (let i = 0; i < dayContent.length; i++) {
    const line = dayContent[i].trim();

    // Skip empty lines, images, and tables
    if (!line || line.startsWith("![") || line.startsWith("| ") || line.startsWith("|")) continue;

    // Check for root header
    const rootMatch = line.match(rootPattern);

    if (rootMatch) {
      // Save previous root if exists
      if (currentRoot && (wordsBuffer.length > 0 || meaningBuffer.length > 0)) {
        if (wordsBuffer.length > 0) {
          currentRoot.words = parseWords(wordsBuffer);
        }
        roots.push(currentRoot);
      }

      const meaningKo = rootMatch[1].replace(/[\/\\]/g, "/").trim();
      const readingKo = rootMatch[2];
      const hanja = rootMatch[3];

      currentRoot = {
        meaning_ko: meaningKo,
        reading_ko: readingKo,
        hanja: hanja,
        meaning_en: "",
        meaning_ja: "",
        meaning_zh: "",
        meaning_vi: "",
        words: [],
      };

      meaningBuffer = [];
      wordsBuffer = [];
      parsingState = "meanings";
      continue;
    }

    if (currentRoot) {
      // Parse meaning lines (4 lines after root header)
      if (parsingState === "meanings") {
        // Check if this line looks like a word line
        if (/^[가-힣]+\s+.+\s*\//.test(line)) {
          // This is a word line, switch to words mode
          parsingState = "words";
          wordsBuffer.push(line);
        } else if (meaningBuffer.length < 4) {
          meaningBuffer.push(line);
          if (meaningBuffer.length === 4) {
            // English, Japanese, Chinese, Vietnamese in order
            currentRoot.meaning_en = meaningBuffer[0] || "";
            currentRoot.meaning_ja = meaningBuffer[1] || "";
            currentRoot.meaning_zh = meaningBuffer[2] || "";
            currentRoot.meaning_vi = meaningBuffer[3] || "";
            parsingState = "words";
          }
        }
        continue;
      }

      // Parse word lines
      if (parsingState === "words") {
        // Word pattern: 단어 English / Japanese / Chinese / Vietnamese
        if (/^[가-힣]+\s+.+\s*\//.test(line)) {
          wordsBuffer.push(line);
        }
      }
    }
  }

  // Don't forget the last root
  if (currentRoot && (wordsBuffer.length > 0 || meaningBuffer.length > 0)) {
    if (wordsBuffer.length > 0) {
      currentRoot.words = parseWords(wordsBuffer);
    }
    roots.push(currentRoot);
  }

  console.log(`Parsed ${roots.length} roots for Day ${dayNumber}`);

  return { roots };
}

function parseWords(lines: string[]): HanjaWord[] {
  const words: HanjaWord[] = [];

  for (const line of lines) {
    // Pattern: 가요 pop(ular) song, K-pop / 歌谣 / 歌曲 / bài hát
    const parts = line.split(" / ");
    if (parts.length >= 1) {
      // First part has Korean word and English meaning
      const firstPart = parts[0];
      const wordMatch = firstPart.match(/^([가-힣]+)\s+(.+)$/);

      if (wordMatch) {
        words.push({
          word: wordMatch[1],
          meaning_en: wordMatch[2].trim(),
          meaning_ja: parts[1]?.trim() || "",
          meaning_zh: parts[2]?.trim() || "",
          meaning_vi: parts[3]?.trim() || "",
        });
      }
    }
  }

  return words;
}
