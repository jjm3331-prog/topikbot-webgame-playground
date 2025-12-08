import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

// Calculate text similarity (Levenshtein distance based)
function calculateSimilarity(original: string, recognized: string): number {
  const s1 = original.toLowerCase().replace(/[^가-힣a-z0-9]/g, '');
  const s2 = recognized.toLowerCase().replace(/[^가-힣a-z0-9]/g, '');
  
  if (s1.length === 0 && s2.length === 0) return 100;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  const matrix: number[][] = [];
  
  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const maxLen = Math.max(s1.length, s2.length);
  const distance = matrix[s1.length][s2.length];
  return Math.round((1 - distance / maxLen) * 100);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { audio, originalText } = await req.json();
    
    if (!audio) {
      throw new Error('No audio data provided');
    }

    if (!originalText) {
      throw new Error('No original text provided');
    }

    console.log('Processing audio for drama dubbing...');
    console.log('Original text:', originalText);

    // Process audio in chunks
    const binaryAudio = processBase64Chunks(audio);
    
    // Prepare form data for Whisper
    const formData = new FormData();
    const blob = new Blob([binaryAudio], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'ko'); // Korean language

    // Send to OpenAI Whisper
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Whisper API error:', errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const result = await response.json();
    const recognizedText = result.text || '';
    
    console.log('Recognized text:', recognizedText);

    // Calculate similarity
    const accuracy = calculateSimilarity(originalText, recognizedText);
    
    // Generate feedback based on accuracy
    let feedback = {
      korean: '',
      vietnamese: '',
      grade: '',
      emoji: ''
    };

    if (accuracy >= 90) {
      feedback = {
        korean: '완벽해요! 네이티브 수준이에요!',
        vietnamese: 'Hoàn hảo! Như người bản xứ!',
        grade: 'S',
        emoji: '🌟'
      };
    } else if (accuracy >= 75) {
      feedback = {
        korean: '아주 잘했어요! 조금만 더 연습하면 완벽해요!',
        vietnamese: 'Rất tốt! Luyện thêm một chút nữa sẽ hoàn hảo!',
        grade: 'A',
        emoji: '✨'
      };
    } else if (accuracy >= 60) {
      feedback = {
        korean: '잘하고 있어요! 계속 연습해봐요!',
        vietnamese: 'Đang tiến bộ! Hãy tiếp tục luyện tập!',
        grade: 'B',
        emoji: '👍'
      };
    } else if (accuracy >= 40) {
      feedback = {
        korean: '괜찮아요! 천천히 다시 해봐요!',
        vietnamese: 'Không sao! Hãy thử lại chậm rãi hơn!',
        grade: 'C',
        emoji: '💪'
      };
    } else {
      feedback = {
        korean: '힘내요! 다시 도전해봐요!',
        vietnamese: 'Cố lên! Hãy thử lại nhé!',
        grade: 'D',
        emoji: '🔄'
      };
    }

    return new Response(
      JSON.stringify({ 
        recognizedText,
        originalText,
        accuracy,
        feedback
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Drama dubbing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
