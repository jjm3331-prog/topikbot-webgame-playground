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
          debug: { linesScanned: parsedData?.debug?.linesScanned || 0 }
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

    // Insert roots and words
    let rootOrder = 0;
    let totalWords = 0;
    
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

      if (rootError) {
        console.error("Root insert error:", rootError);
        throw rootError;
      }

      // Insert words for this root
      let wordOrder = 0;
      for (const word of root.words) {
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

    console.log(`Day ${dayNumber}: ${parsedData.roots.length} roots, ${totalWords} words`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        dayNumber, 
        rootsCount: parsedData.roots.length,
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

function parseMarkdownForDay(
  markdown: string,
  dayNumber: number
): { roots: HanjaRoot[]; debug?: { linesScanned: number } } {
  const lines = markdown.split("\n");

  // Helper: parse a single day section (already sliced) into roots/words.
  const parseDaySection = (dayLines: string[]) => {
    const roots: HanjaRoot[] = [];

    let currentRoot: HanjaRoot | null = null;
    let collectingMeanings = false;
    let meaningLines: string[] = [];

    for (let i = 0; i < dayLines.length; i++) {
      const line = dayLines[i];
      const trimmedLine = line.trim();

      // Skip empty lines, images, tables, exercise numbers
      if (!trimmedLine) continue;
      if (trimmedLine.startsWith("![")) continue;
      if (trimmedLine.startsWith("|")) continue;
      if (/^\d+\)/.test(trimmedLine)) continue; // Skip answer choices like "1)"
      if (/^##\s*\d+\./.test(trimmedLine)) continue; // Skip exercise headers like "## 1."
      if (/^보기/.test(trimmedLine)) continue; // Skip "보기" (examples)

      // Root header pattern:
      // - "### 그림 도圖" / "#### 전하다 전傳"
      // - "자취 적蹟·跡·迹" (no #)
      // - Pattern for "반의어" sections: "차다  \n만滿" (two lines)
      // - Pattern with bold: "### 입入" or "들어가다 **입入**"
      const rootHeaderPatterns = [
        /^#{2,4}\s+(.+?)\s+([가-힣/]+)\s*([一-龥々\u4e00-\u9fff\u3400-\u4dbf·]+)$/,
        /^([가-힣/]+)\s+([가-힣/]+)\s*([一-龥々\u4e00-\u9fff\u3400-\u4dbf·]+)$/, // Without #
        // "### 입入" pattern (combined reading+hanja after ###)
        /^#{2,4}\s+([가-힣/]+)\s*([一-龥々\u4e00-\u9fff\u3400-\u4dbf·]+)$/,
        // "들어가다 **입入**" pattern with bold
        /^([가-힣/\s]+?)\s+\*\*([가-힣/]+)([一-龥々\u4e00-\u9fff\u3400-\u4dbf·]+)\*\*$/,
      ];

      let rootMatch: RegExpMatchArray | null = null;
      let patternIndex = -1;
      for (let p = 0; p < rootHeaderPatterns.length; p++) {
        const match = trimmedLine.match(rootHeaderPatterns[p]);
        if (match) {
          rootMatch = match;
          patternIndex = p;
          break;
        }
      }

      // NEW: Two-line root pattern for various sections
      // Line 1: Korean meaning (e.g., "차다" or "강하다" or "느끼다")
      // Line 2: Reading + Hanja (e.g., "만滿" or "강强" or "감感")
      if (!rootMatch) {
        // Flexible Korean meaning pattern (may include /, space, or end with 하다)
        if (/^[가-힣\/\s]+(?:하다)?$/.test(trimmedLine) && trimmedLine.length < 30) {
          // Check if next line has reading+hanja pattern (with or without bold)
          const nextLine = dayLines[i + 1]?.trim();
          if (nextLine) {
            // Pattern: "감感" or "**감感**" or "감감" (duplicate like 감감)
            const hanjaPatterns = [
              /^([가-힣]+)([一-龥々\u4e00-\u9fff\u3400-\u4dbf]+)$/, // Simple: 만滿
              /^\*\*([가-힣]+)([一-龥々\u4e00-\u9fff\u3400-\u4dbf]+)\*\*$/, // Bold: **만滿**
              /^([가-힣]+)\s*([一-龥々\u4e00-\u9fff\u3400-\u4dbf]+)$/, // With space: 만 滿
            ];
            
            for (const pattern of hanjaPatterns) {
              const hanjaMatch = nextLine.match(pattern);
              if (hanjaMatch) {
                // Save previous root if it has words
                if (currentRoot && currentRoot.words.length > 0) {
                  roots.push(currentRoot);
                }

                currentRoot = {
                  meaning_ko: trimmedLine.replace(/\s+/g, ' ').trim(),
                  reading_ko: hanjaMatch[1],
                  hanja: hanjaMatch[2].charAt(0),
                  meaning_en: "",
                  meaning_ja: "",
                  meaning_zh: "",
                  meaning_vi: "",
                  words: [],
                };

                collectingMeanings = true;
                meaningLines = [];
                i++; // Skip the next line (reading+hanja)
                break;
              }
            }
            if (currentRoot && collectingMeanings) continue;
          }
        }
      }

      if (rootMatch) {
        // Save previous root if it has words
        if (currentRoot && currentRoot.words.length > 0) {
          roots.push(currentRoot);
        }

        let meaningKo: string, readingKo: string, hanja: string;
        
        if (patternIndex === 2) {
          // Pattern: "### 입入" (no meaning, just reading+hanja)
          meaningKo = "";
          readingKo = rootMatch[1].trim();
          hanja = rootMatch[2].replace(/[·]/g, "");
        } else if (patternIndex === 3) {
          // Pattern: "들어가다 **입入**" (meaning, then bold reading+hanja)
          meaningKo = rootMatch[1].trim();
          readingKo = rootMatch[2].trim();
          hanja = rootMatch[3].replace(/[·]/g, "");
        } else {
          // Original patterns
          meaningKo = rootMatch[1].trim();
          readingKo = rootMatch[2].trim();
          hanja = rootMatch[3]?.replace(/[·]/g, "") || "";
        }

        currentRoot = {
          meaning_ko: meaningKo,
          reading_ko: readingKo,
          hanja: hanja.charAt(0), // Take just the first hanja character
          meaning_en: "",
          meaning_ja: "",
          meaning_zh: "",
          meaning_vi: "",
          words: [],
        };

        collectingMeanings = true;
        meaningLines = [];
        continue;
      }

      if (currentRoot) {
        // Collect root meanings (up to 4 lines after header)
        if (collectingMeanings && meaningLines.length < 4) {
          // If this looks like a word line, stop collecting meanings
          if (/^[가-힣]+(?:\s+[가-힣]+)?\s+.+\//.test(trimmedLine)) {
            collectingMeanings = false;
            if (meaningLines.length > 0) {
              currentRoot.meaning_en = meaningLines[0] || "";
              currentRoot.meaning_ja = meaningLines[1] || "";
              currentRoot.meaning_zh = meaningLines[2] || "";
              currentRoot.meaning_vi = meaningLines[3] || "";
            }
          } else if (!trimmedLine.includes("/") && !trimmedLine.startsWith("#")) {
            meaningLines.push(trimmedLine);
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

        // Word line pattern: "지도 map / 地図 / 地图 / bản đồ"
        const wordMatch = trimmedLine.match(
          /^([가-힣]+(?:\s*[一-龥々\u4e00-\u9fff]*)?)\s+(.+?)\s*\/\s*(.+?)\s*\/\s*(.+?)\s*\/\s*(.+)$/
        );

        if (wordMatch) {
          const koreanWord = wordMatch[1].trim();
          const cleanWord = koreanWord
            .replace(/[一-龥々\u4e00-\u9fff]+/g, "")
            .trim();

          currentRoot.words.push({
            word: cleanWord || koreanWord,
            meaning_en: wordMatch[2].trim(),
            meaning_ja: wordMatch[3].trim(),
            meaning_zh: wordMatch[4].trim(),
            meaning_vi: wordMatch[5].trim(),
          });
        }
      }
    }

    if (currentRoot && currentRoot.words.length > 0) {
      roots.push(currentRoot);
    }

    return roots;
  };

  // The markdown includes multiple occurrences of the same "Day NN" (cover, contents, exercises).
  // We scan all occurrences and choose the first one that parses into actual roots.
  // NEW STRATEGY: Look for the ACTUAL content by searching for "Day NN" followed by the topic name,
  // and then look for the ### Hanja root headers which indicate actual content.
  
  const dayHeaderRe = /^(?:#{1,4}\s*)?Day\s*0?(\d+)\b/i;
  const dayTopic = DAY_TOPICS[dayNumber];
  let candidateCount = 0;
  
  // Strategy 1: Find the main content section (after "Day XX Topic" and contains ### roots)
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    const m = t.match(dayHeaderRe);
    if (!m) continue;

    const foundDay = parseInt(m[1], 10);
    if (foundDay !== dayNumber) continue;

    candidateCount++;
    
    // Find the next Day header to determine section end
    let sectionEnd = lines.length;
    for (let j = i + 1; j < lines.length; j++) {
      const tt = lines[j].trim();
      const nextDayMatch = tt.match(dayHeaderRe);
      if (nextDayMatch) {
        const nextDay = parseInt(nextDayMatch[1], 10);
        // Only break if it's a different day
        if (nextDay !== dayNumber) {
          sectionEnd = j;
          break;
        }
      }
      // Also break on unit headers like "## 2" or "## 현대 문화와 전통문화"
      if (/^##\s+\d+\s*$/.test(tt)) {
        sectionEnd = j;
        break;
      }
    }

    // Slice the full section from current Day header to next Day/Unit header
    const section = lines.slice(i + 1, sectionEnd);
    
    const roots = parseDaySection(section);
    if (roots.length > 0) {
      console.log(
        `Day ${dayNumber}: selected occurrence #${candidateCount} (sectionLines=${section.length}, roots=${roots.length})`
      );

      console.log(
        `First root: ${roots[0].meaning_ko} ${roots[0].reading_ko}${roots[0].hanja}, ${roots[0].words.length} words`
      );
      if (roots.length > 1) {
        console.log(
          `Second root: ${roots[1].meaning_ko} ${roots[1].reading_ko}${roots[1].hanja}, ${roots[1].words.length} words`
        );
      }

      return { roots, debug: { linesScanned: section.length } };
    }
  }

  // Strategy 2: Fallback - search for the topic name directly followed by ### hanja roots
  if (dayTopic) {
    console.log(`Day ${dayNumber}: trying fallback with topic "${dayTopic}"`);
    
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim();
      // Look for the topic name as a standalone line (after image)
      if (t === dayTopic) {
        // Find section end (next Day or Unit)
        let sectionEnd = lines.length;
        for (let j = i + 1; j < lines.length; j++) {
          const tt = lines[j].trim();
          if (dayHeaderRe.test(tt) || /^##\s+\d+\s*$/.test(tt)) {
            sectionEnd = j;
            break;
          }
        }
        
        const section = lines.slice(i, sectionEnd);
        const roots = parseDaySection(section);
        
        if (roots.length > 0) {
          console.log(
            `Day ${dayNumber}: fallback found via topic (sectionLines=${section.length}, roots=${roots.length})`
          );
          return { roots, debug: { linesScanned: section.length } };
        }
      }
    }
  }

  console.log(
    `Day ${dayNumber}: no valid section found (candidates=${candidateCount}, totalLines=${lines.length})`
  );
  return { roots: [], debug: { linesScanned: lines.length } };
}

