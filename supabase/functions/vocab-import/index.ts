import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// EUC-KR/CP949 디코딩을 위한 매핑 (한국어 CSV 파일용)
// CSV 데이터 구조: 전체 번호, 등급별 번호, 등급, 표제어, 품사, 결합정보이름, 국제통용표준개발(1-4단계), 비고
interface VocabularyRow {
  seq_no: number;
  level_seq: number;
  level: number;
  word: string;
  word_code: string;
  pos: string;
  example_phrase: string;
  difficulty: string;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseLevelToNumber(levelStr: string): number {
  // "1급", "2급", etc. -> 1, 2, etc.
  const match = levelStr.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
}

function difficultyFromLevel(level: number): string {
  if (level <= 2) return '초급';
  if (level <= 4) return '중급';
  return '고급';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { csvData, action } = await req.json();

    if (action === 'check') {
      // Check current vocabulary count
      const { count } = await supabase
        .from('topik_vocabulary')
        .select('*', { count: 'exact', head: true });
      
      return new Response(JSON.stringify({ 
        success: true, 
        count: count || 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!csvData) {
      return new Response(JSON.stringify({ error: 'csvData is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[Vocab Import] Starting CSV parsing...');
    
    // Parse CSV data
    const lines = csvData.split('\n').filter((line: string) => line.trim());
    const header = lines[0];
    const dataLines = lines.slice(1);
    
    console.log(`[Vocab Import] Found ${dataLines.length} vocabulary entries`);
    
    const vocabularyItems: VocabularyRow[] = [];
    
    for (const line of dataLines) {
      const cols = parseCSVLine(line);
      if (cols.length < 7) continue;
      
      const seqNo = parseInt(cols[0], 10);
      if (isNaN(seqNo)) continue;
      
      const levelSeq = parseInt(cols[1], 10) || 0;
      const level = parseLevelToNumber(cols[2]);
      const word = cols[3].replace(/\d+$/, '').trim(); // Remove trailing numbers like "가격02"
      const wordCode = cols[3];
      const pos = cols[4];
      const examplePhrase = cols[5];
      const difficulty = difficultyFromLevel(level);
      
      vocabularyItems.push({
        seq_no: seqNo,
        level_seq: levelSeq,
        level,
        word,
        word_code: wordCode,
        pos,
        example_phrase: examplePhrase,
        difficulty,
      });
    }
    
    console.log(`[Vocab Import] Parsed ${vocabularyItems.length} valid entries`);
    
    // Batch insert in chunks of 500
    const chunkSize = 500;
    let inserted = 0;
    let errors = 0;
    
    for (let i = 0; i < vocabularyItems.length; i += chunkSize) {
      const chunk = vocabularyItems.slice(i, i + chunkSize);
      
      const { error } = await supabase
        .from('topik_vocabulary')
        .upsert(chunk, { onConflict: 'seq_no' });
      
      if (error) {
        console.error(`[Vocab Import] Chunk ${i}-${i + chunk.length} error:`, error);
        errors += chunk.length;
      } else {
        inserted += chunk.length;
        console.log(`[Vocab Import] Inserted chunk ${i}-${i + chunk.length}`);
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      total: vocabularyItems.length,
      inserted,
      errors,
      message: `Successfully imported ${inserted} vocabulary items`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('[Vocab Import] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
