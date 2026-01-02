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
  meaning_ko?: string;
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

    console.log(`Processing Day ${dayNumber}...`);

    // Parse the markdown content for the specific day
    const parsedData = parseMarkdownForDay(markdown, dayNumber);

    if (!parsedData || parsedData.roots.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: `No data found for Day ${dayNumber}`, 
          debug: parsedData?.debug
        }),
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

    // Insert roots and words with deduplication
    let rootOrder = 0;
    let totalWords = 0;
    const insertedRootKeys = new Set<string>(); // For dedup: "hanja-reading"
    const insertedWordKeys = new Set<string>(); // For dedup: "word"
    
    for (const root of parsedData.roots) {
      const rootKey = `${root.hanja}-${root.reading_ko}`;
      
      // Skip duplicate roots
      if (insertedRootKeys.has(rootKey)) {
        console.log(`Skipping duplicate root: ${rootKey}`);
        continue;
      }
      insertedRootKeys.add(rootKey);

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

      if (rootError) {
        console.error("Root insert error:", rootError);
        throw rootError;
      }

      // Insert words for this root with deduplication
      let wordOrder = 0;
      for (const word of root.words) {
        const wordKey = word.word;
        
        // Skip duplicate words within this day
        if (insertedWordKeys.has(wordKey)) {
          console.log(`Skipping duplicate word: ${wordKey}`);
          continue;
        }
        insertedWordKeys.add(wordKey);

        const { error: wordError } = await supabaseClient
          .from("hanja_words")
          .insert({
            root_id: rootData.id,
            word: word.word,
            meaning_ko: word.meaning_ko || null,
            meaning_en: word.meaning_en,
            meaning_ja: word.meaning_ja,
            meaning_zh: word.meaning_zh,
            meaning_vi: word.meaning_vi,
            display_order: wordOrder++,
          });

        if (wordError) {
          console.error("Word insert error:", wordError);
          throw wordError;
        }
        totalWords++;
      }
    }

    console.log(`Day ${dayNumber}: ${rootOrder} roots (deduplicated), ${totalWords} words (deduplicated)`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        dayNumber, 
        rootsCount: rootOrder,
        wordsCount: totalWords
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

// Hanja character detection
function containsHanja(text: string): boolean {
  return /[一-龥々\u4e00-\u9fff\u3400-\u4dbf]/.test(text);
}

// Extract first hanja character from text
function extractFirstHanja(text: string): string {
  const match = text.match(/[一-龥々\u4e00-\u9fff\u3400-\u4dbf]/);
  return match ? match[0] : "";
}

// Check if line is a root header and extract info
function parseRootHeader(line: string, nextLine?: string): { meaning_ko: string; reading_ko: string; hanja: string } | null {
  const trimmed = line.trim();

  // Skip empty, images, tables, obvious exercise/choice lines
  if (!trimmed) return null;
  if (trimmed.startsWith("![")) return null;
  if (trimmed.startsWith("|")) return null;
  if (/^\d+\)/.test(trimmed)) return null;
  if (/^#{2,6}\s*\d+\./.test(trimmed)) return null; // Exercise headers like "#### 1."
  if (/^보기/.test(trimmed)) return null;
  if (trimmed.startsWith("①") || trimmed.startsWith("②") || trimmed.startsWith("③") || trimmed.startsWith("④")) return null;

  // Word lines contain many slashes; prevent false positives (e.g. "유료 pay / 有料 / ...")
  if ((trimmed.match(/\//g)?.length ?? 0) >= 2) return null;

  // ===== Pattern A: "### 그림 도圖" or "#### 전하다 전傳" =====
  const patternA = trimmed.match(
    /^#{2,4}\s+(.+?)\s+([가-힣/]+)\s*([一-龥々\u4e00-\u9fff\u3400-\u4dbf·]+)$/
  );
  if (patternA) {
    return {
      meaning_ko: patternA[1].trim(),
      reading_ko: patternA[2].trim(),
      hanja: extractFirstHanja(patternA[3]),
    };
  }

  // ===== Pattern B: "### 입入" (reading+hanja only) =====
  const patternB = trimmed.match(/^#{2,4}\s+([가-힣/]+)\s*([一-龥々\u4e00-\u9fff\u3400-\u4dbf·]+)$/);
  if (patternB) {
    return {
      meaning_ko: "",
      reading_ko: patternB[1].trim(),
      hanja: extractFirstHanja(patternB[2]),
    };
  }

  // ===== Pattern C: "있다 **존存**" (meaning + bold reading+hanja) =====
  const patternC = trimmed.match(
    /^(.+?)\s+\*\*([가-힣/]+)\s*([一-龥々\u4e00-\u9fff\u3400-\u4dbf]+)\*\*$/
  );
  if (patternC) {
    return {
      meaning_ko: patternC[1].replace(/\s+/g, " ").trim(),
      reading_ko: patternC[2].trim(),
      hanja: extractFirstHanja(patternC[3]),
    };
  }

  // ===== Pattern D: Two-line format (meaning line + next line "감鑑" or "**감鑑**") =====
  if (nextLine && /^[가-힣\s\/]+(?:하다)?$/.test(trimmed) && trimmed.length < 40) {
    const nextTrimmed = nextLine.trim();

    const hanjaPatterns = [
      /^([가-힣]+)\s*([一-龥々\u4e00-\u9fff\u3400-\u4dbf]+)$/,
      /^\*\*([가-힣]+)\s*([一-龥々\u4e00-\u9fff\u3400-\u4dbf]+)\*\*$/,
    ];

    for (const pattern of hanjaPatterns) {
      const match = nextTrimmed.match(pattern);
      if (match) {
        return {
          meaning_ko: trimmed.replace(/\s+/g, " ").trim(),
          reading_ko: match[1].trim(),
          hanja: extractFirstHanja(match[2]),
        };
      }
    }
  }

  // ===== Pattern E: Plain text format like "자취 적蹟·跡·迹" or "있다 유有" =====
  // NOTE: This must run after word-line guard above.
  const patternE = trimmed.match(
    /^(.+?)\s+([가-힣/]+)\s*([一-龥々\u4e00-\u9fff\u3400-\u4dbf·]+)$/
  );
  if (patternE && !trimmed.startsWith("#")) {
    return {
      meaning_ko: patternE[1].replace(/\s+/g, " ").trim(),
      reading_ko: patternE[2].trim(),
      hanja: extractFirstHanja(patternE[3]),
    };
  }

  return null;
}

// Check if line is a word line and extract info
function parseWordLine(line: string): HanjaWord | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  
  // Word line pattern: "지도 map / 地図 / 地图 / bản đồ"
  // Must have 4 slash-separated parts (Korean word + 4 translations)
  const parts = trimmed.split(/\s*\/\s*/);
  if (parts.length !== 4) return null;
  
  // First part should be "Korean word [optional hanja] English meaning"
  // Example: "지도 map" or "화면 picture, screen"
  const firstPart = parts[0].trim();
  
  // Extract Korean word and English meaning
  // Pattern: "한글단어 English meaning" or "한글단어 漢字 English meaning"
  const wordMatch = firstPart.match(/^([가-힣]+(?:\s*[一-龥々\u4e00-\u9fff]*)?)\s+(.+)$/);
  if (!wordMatch) return null;
  
  const koreanPart = wordMatch[1].trim();
  const englishMeaning = wordMatch[2].trim();
  
  // Clean Korean word (remove any hanja)
  const cleanWord = koreanPart.replace(/[一-龥々\u4e00-\u9fff]+/g, "").trim();
  if (!cleanWord) return null;
  
  return {
    word: cleanWord,
    meaning_en: englishMeaning,
    meaning_ja: parts[1].trim(),
    meaning_zh: parts[2].trim(),
    meaning_vi: parts[3].trim(),
  };
}

function parseMarkdownForDay(
  markdown: string,
  dayNumber: number
): { roots: HanjaRoot[]; debug?: { sectionStart: number; sectionEnd: number; sectionLines: number; selection?: string } } {
  const lines = markdown.split("\n");

  const dayHeaderRe = /^(?:#{1,6}\s*)?Day\s*0?(\d+)\b/i;
  const exerciseRe = /^#{2,6}\s*\d+\./; // Exercise headers like "#### 1."

  type Candidate = {
    start: number;
    end: number;
    rootHeaders: number;
  };

  const candidates: Candidate[] = [];

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].trim().match(dayHeaderRe);
    if (!match) continue;

    const foundDay = parseInt(match[1], 10);
    if (foundDay !== dayNumber) continue;

    let end = lines.length;
    for (let j = i + 1; j < lines.length; j++) {
      const t = lines[j].trim();

      const nextDayMatch = t.match(dayHeaderRe);
      if (nextDayMatch) {
        const nextDay = parseInt(nextDayMatch[1], 10);
        if (nextDay !== dayNumber) {
          end = j;
          break;
        }
      }

      // Unit header like "## 2." or "## 2" etc.
      if (/^##\s*\d+\.?\s*$/.test(t)) {
        end = j;
        break;
      }
    }

    // Ignore tiny candidates (TOC/answer-key lines like "Day 01" without content)
    if (end - i < 40) continue;

    let rootHeaders = 0;
    for (let k = i + 1; k < end; k++) {
      const t = lines[k].trim();
      if (exerciseRe.test(t)) break;
      const info = parseRootHeader(t, lines[k + 1]);
      if (info?.hanja) rootHeaders++;
    }

    candidates.push({ start: i, end, rootHeaders });
  }

  // Choose the candidate with the most root headers; on tie, choose the later one
  let best: Candidate | null = null;
  for (const c of candidates) {
    if (!best) {
      best = c;
      continue;
    }
    if (c.rootHeaders > best.rootHeaders) best = c;
    else if (c.rootHeaders === best.rootHeaders && c.start > best.start) best = c;
  }

  let sectionStart = best?.start ?? -1;
  let sectionEnd = best?.end ?? -1;
  let selection: "day-header" | "topic-fallback" = "day-header";

  // Fallback for Day 01 style where real content starts at the topic title (not a Day header).
  if (sectionStart === -1 || sectionEnd === -1 || (best?.rootHeaders ?? 0) === 0) {
    const topic = DAY_TOPICS[dayNumber];
    const nextTopic = DAY_TOPICS[dayNumber + 1];

    if (topic) {
      const topicRe = new RegExp(`^\\s*${topic.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\s*$`);
      const nextTopicRe = nextTopic
        ? new RegExp(`^\\s*${nextTopic.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\s*$`)
        : null;

      const startIdx = lines.findIndex((l) => topicRe.test(l.trim()));
      if (startIdx !== -1) {
        let endIdx = lines.length;
        for (let j = startIdx + 1; j < lines.length; j++) {
          const t = lines[j].trim();
          if (nextTopicRe && nextTopicRe.test(t)) {
            endIdx = j;
            break;
          }
          if (dayHeaderRe.test(t) && !t.match(dayHeaderRe)?.[1].startsWith("0")) {
            // keep scanning; do nothing (defensive)
          }
          if (/^##\s*\d+\.?\s*$/.test(t)) {
            endIdx = j;
            break;
          }
        }
        sectionStart = startIdx;
        sectionEnd = endIdx;
        selection = "topic-fallback";
      }
    }
  }

  if (sectionStart === -1 || sectionEnd === -1) {
    console.log(`Day ${dayNumber}: No section found`);
    return { roots: [], debug: { sectionStart: -1, sectionEnd: -1, sectionLines: 0, selection: "none" } };
  }

  const sectionLines = lines.slice(sectionStart, sectionEnd);

  console.log(
    `Day ${dayNumber}: Section from line ${sectionStart} to ${sectionEnd} (${sectionLines.length} lines), rootHeaders=${best?.rootHeaders ?? 0}, selection=${selection}`
  );

  // Parse the section to extract roots and words
  const roots: HanjaRoot[] = [];
  let currentRoot: HanjaRoot | null = null;
  let collectingMeanings = false;
  let meaningLines: string[] = [];
  let skipNextLine = false;

  for (let i = 0; i < sectionLines.length; i++) {
    if (skipNextLine) {
      skipNextLine = false;
      continue;
    }

    const line = sectionLines[i];
    const trimmed = line.trim();
    const nextLine = sectionLines[i + 1];

    // Stop when the exercises section begins
    if (exerciseRe.test(trimmed)) {
      break;
    }

    // Try to parse as root header
    const rootInfo = parseRootHeader(trimmed, nextLine);
    if (rootInfo && rootInfo.hanja) {
      // Save previous root if it has words
      if (currentRoot && currentRoot.words.length > 0) {
        roots.push(currentRoot);
      }

      currentRoot = {
        meaning_ko: rootInfo.meaning_ko,
        reading_ko: rootInfo.reading_ko,
        hanja: rootInfo.hanja,
        meaning_en: "",
        meaning_ja: "",
        meaning_zh: "",
        meaning_vi: "",
        words: [],
      };

      collectingMeanings = true;
      meaningLines = [];

      // If this was a two-line pattern, skip the next line
      if (nextLine && /^[가-힣\s\/]+(?:하다)?$/.test(trimmed) && trimmed.length < 40) {
        const nextTrimmed = nextLine.trim();
        if (/^(?:\*\*)?[가-힣]+\s*[一-龥々\u4e00-\u9fff\u3400-\u4dbf]+(?:\*\*)?$/.test(nextTrimmed)) {
          skipNextLine = true;
        }
      }

      continue;
    }

    // If we have a current root, try to collect meanings or words
    if (currentRoot) {
      // Collect root meanings (up to 4 lines after header: en, ja, zh, vi)
      if (collectingMeanings && meaningLines.length < 4) {
        const wordInfo = parseWordLine(trimmed);
        if (wordInfo) {
          collectingMeanings = false;
          if (meaningLines.length > 0) {
            currentRoot.meaning_en = meaningLines[0] || "";
            currentRoot.meaning_ja = meaningLines[1] || "";
            currentRoot.meaning_zh = meaningLines[2] || "";
            currentRoot.meaning_vi = meaningLines[3] || "";
          }
          currentRoot.words.push(wordInfo);
          continue;
        }

        // Meaning lines are short, no slashes, not headers
        if (trimmed && !trimmed.includes("/") && !trimmed.startsWith("#") && trimmed.length < 100) {
          meaningLines.push(trimmed);
          if (meaningLines.length === 4) {
            currentRoot.meaning_en = meaningLines[0] || "";
            currentRoot.meaning_ja = meaningLines[1] || "";
            currentRoot.meaning_zh = meaningLines[2] || "";
            currentRoot.meaning_vi = meaningLines[3] || "";
            collectingMeanings = false;
          }
          continue;
        }
      }

      const wordInfo = parseWordLine(trimmed);
      if (wordInfo) {
        currentRoot.words.push(wordInfo);
      }
    }
  }

  // Don't forget the last root
  if (currentRoot && currentRoot.words.length > 0) {
    roots.push(currentRoot);
  }

  // Log summary
  if (roots.length > 0) {
    console.log(`Day ${dayNumber}: Parsed ${roots.length} roots`);
    console.log(
      `  First root: ${roots[0].meaning_ko} ${roots[0].reading_ko}${roots[0].hanja}, ${roots[0].words.length} words`
    );
    if (roots.length > 1) {
      console.log(
        `  Second root: ${roots[1].meaning_ko} ${roots[1].reading_ko}${roots[1].hanja}, ${roots[1].words.length} words`
      );
    }
  } else {
    console.log(`Day ${dayNumber}: No roots parsed`);
  }

  return {
    roots,
    debug: {
      sectionStart,
      sectionEnd,
      sectionLines: sectionLines.length,
      selection,
    },
  };
}

