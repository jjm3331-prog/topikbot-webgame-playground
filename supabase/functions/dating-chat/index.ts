import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation helpers
function validateString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed.length > 0 ? trimmed : null;
}

function validateNumber(value: unknown, min: number, max: number): number {
  const num = typeof value === 'number' ? value : 0;
  return Math.max(min, Math.min(max, num));
}

function validateConversationHistory(history: unknown): Array<{role: string; content: string}> {
  if (!Array.isArray(history)) return [];
  return history
    .filter((item): item is {role: unknown; content: unknown} => 
      typeof item === 'object' && item !== null)
    .map(item => ({
      role: item.role === 'assistant' ? 'model' : 'user',
      content: validateString(item.content, 1000) || ''
    }))
    .filter(item => item.content.length > 0)
    .slice(-20);
}

// Get language-specific response template
function getLanguageTemplate(lang: string): { affinityUpMsg: string; affinityDownMsg: string; reasonFormat: string } {
  const templates: Record<string, { affinityUpMsg: string; affinityDownMsg: string; reasonFormat: string }> = {
    ko: { affinityUpMsg: '호감도 상승', affinityDownMsg: '호감도 하락', reasonFormat: '한국어' },
    vi: { affinityUpMsg: 'Thiện cảm tăng', affinityDownMsg: 'Thiện cảm giảm', reasonFormat: 'tiếng Việt' },
    en: { affinityUpMsg: 'Affinity up', affinityDownMsg: 'Affinity down', reasonFormat: 'English' },
    ja: { affinityUpMsg: '好感度アップ', affinityDownMsg: '好感度ダウン', reasonFormat: '日本語' },
    zh: { affinityUpMsg: '好感度上升', affinityDownMsg: '好感度下降', reasonFormat: '中文' },
    ru: { affinityUpMsg: 'Симпатия выросла', affinityDownMsg: 'Симпатия упала', reasonFormat: 'русский' },
    uz: { affinityUpMsg: 'Hamdardlik oshdi', affinityDownMsg: 'Hamdardlik kamaydi', reasonFormat: 'O\'zbek' },
  };
  return templates[lang] || templates.ko;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    // Validate and sanitize inputs
    const message = validateString(body.message, 500);
    const npcName = validateString(body.npcName, 50) || 'Unknown';
    const npcMbti = validateString(body.npcMbti, 10) || 'INFP';
    const npcJob = validateString(body.npcJob, 50) || '직장인';
    const currentAffinity = validateNumber(body.currentAffinity, 0, 100);
    const conversationHistory = validateConversationHistory(body.conversationHistory);
    const userLang = validateString(body.language, 5) || 'ko';
    
    const langTemplate = getLanguageTemplate(userLang);

    if (!message) {
      return new Response(JSON.stringify({ 
        error: "Message is required",
        response: userLang === 'vi' ? "Vui lòng nhập tin nhắn 😊" : 
                  userLang === 'en' ? "Please enter a message 😊" :
                  userLang === 'ja' ? "メッセージを入力してください 😊" :
                  userLang === 'zh' ? "请输入消息 😊" :
                  userLang === 'ru' ? "Пожалуйста, введите сообщение 😊" :
                  userLang === 'uz' ? "Iltimos, xabar yozing 😊" :
                  "메시지를 입력해주세요 😊",
        affinityChange: 0,
        reason: ""
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Dating chat request:', { messageLength: message.length, npcName, npcMbti, currentAffinity, userLang });

    // Get translation label based on user language
    const getTranslationLabel = (lang: string): string => {
      const labels: Record<string, string> = {
        ko: '번역',
        vi: 'Dịch',
        en: 'Translation',
        ja: '翻訳',
        zh: '翻译',
        ru: 'Перевод',
        uz: 'Tarjima',
      };
      return labels[lang] || 'Translation';
    };

    const translationLabel = getTranslationLabel(userLang);

    const systemPrompt = `You are ${npcName}, a charming ${npcJob} with ${npcMbti} personality on a Korean dating app.

**Your Character:**
- Name: ${npcName}
- Job: ${npcJob}  
- MBTI: ${npcMbti}
- Current affinity: ${currentAffinity}/100

**CRITICAL LANGUAGE RULE:**
The user's interface language is: ${userLang} (${langTemplate.reasonFormat})
You MUST provide translations in ${langTemplate.reasonFormat} - NOT English (unless ${userLang} is 'en').

**Translation Language Map:**
- vi = Vietnamese (tiếng Việt) → Translate to Vietnamese
- ja = Japanese (日本語) → Translate to Japanese  
- zh = Chinese (中文) → Translate to Chinese
- ru = Russian (русский) → Translate to Russian
- uz = Uzbek (O'zbek) → Translate to Uzbek
- en = English → Translate to English
- ko = Korean → No translation needed (already Korean)

**CRITICAL RULES:**
1. Stay in character as ${npcName} at ALL times
2. Respond naturally like a real Korean person texting
3. Use Korean MZ generation texting style (casual, cute, with appropriate emojis)
4. React to the user's Korean language ability - be encouraging but also naturally respond
5. If affinity is high (70+), be more flirty and intimate
6. If affinity is low (<30), be more reserved
7. MUST translate to ${langTemplate.reasonFormat} - NEVER translate to English if user language is not English!

**Affinity Change Rules:**
- Natural, witty Korean expressions: +10 to +15
- Normal, decent conversation: +5
- Awkward or basic expressions: 0
- Rude or inappropriate: -10 to -15
- Too short or lazy responses: -5

**Response Format (MUST be valid JSON):**
{
  "response": "Korean message\\n\\n(${translationLabel}: ${langTemplate.reasonFormat} translation here)",
  "affinityChange": number between -15 and +15,
  "reason": "Why affinity changed (brief, in ${langTemplate.reasonFormat})"
}

${userLang === 'vi' ? `Example for Vietnamese user:
{
  "response": "앗 진짜?? 나도 그거 완전 좋아해! 우리 취향 잘 맞는 듯~ 😊\\n\\n(Dịch: Ôi thật sao?? Mình cũng thích cái đó lắm! Có vẻ chúng ta hợp gu nhau~)",
  "affinityChange": 10,
  "reason": "Thể hiện sự quan tâm và có sở thích chung"
}` : userLang === 'ja' ? `Example for Japanese user:
{
  "response": "앗 진짜?? 나도 그거 완전 좋아해! 우리 취향 잘 맞는 듯~ 😊\\n\\n(翻訳: えっ本当？？私もそれ大好き！趣味合いそうだね~)",
  "affinityChange": 10,
  "reason": "共通の趣味があり興味を示した"
}` : userLang === 'zh' ? `Example for Chinese user:
{
  "response": "앗 진짜?? 나도 그거 완전 좋아해! 우리 취향 잘 맞는 듯~ 😊\\n\\n(翻译: 哎真的吗？？我也超喜欢那个！感觉我们挺合得来~)",
  "affinityChange": 10,
  "reason": "展现了真诚的兴趣和共同爱好"
}` : userLang === 'ru' ? `Example for Russian user:
{
  "response": "앗 진짜?? 나도 그거 완전 좋아해! 우리 취향 잘 맞는 듯~ 😊\\n\\n(Перевод: Ой правда?? Мне тоже это очень нравится! Похоже у нас схожие вкусы~)",
  "affinityChange": 10,
  "reason": "Проявил интерес и нашёл общие увлечения"
}` : userLang === 'uz' ? `Example for Uzbek user:
{
  "response": "앗 진짜?? 나도 그거 완전 좋아해! 우리 취향 잘 맞는 듯~ 😊\\n\\n(Tarjima: Voy rostdan?? Men ham buni juda yaxshi ko'raman! Bizning didlarimiz mos kelayotganga o'xshaydi~)",
  "affinityChange": 10,
  "reason": "Qiziqish ko'rsatdi va umumiy qiziqishlari bor"
}` : `Example response format:
{
  "response": "앗 진짜?? 나도 그거 완전 좋아해! 우리 취향 잘 맞는 듯~ 😊\\n\\n(Translation: Really?? I love that too! Seems like we have similar tastes~)",
  "affinityChange": 10,
  "reason": "Showed genuine interest and shared a common interest"
}`}

Remember:
- Be playful and charming like a real dating app match
- When affinity reaches 100, you can confess your feelings
- Keep responses conversational and not too long
- ALWAYS translate to ${langTemplate.reasonFormat}, NOT to English (unless user is English)!`;

    // Convert to Gemini format
    const contents = [
      ...conversationHistory.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      })),
      { role: 'user', parts: [{ text: message }] }
    ];

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 1024,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit',
          response: userLang === 'vi' ? "Vui lòng thử lại sau 😅" :
                    userLang === 'en' ? "Please try again later 😅" :
                    userLang === 'ja' ? "後でもう一度お試しください 😅" :
                    userLang === 'zh' ? "请稍后再试 😅" :
                    userLang === 'ru' ? "Попробуйте позже 😅" :
                    userLang === 'uz' ? "Keyinroq qayta urinib ko'ring 😅" :
                    "잠시 후 다시 시도해주세요 😅",
          affinityChange: 0,
          reason: ""
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) {
      throw new Error('Empty response from AI');
    }
    
    // Parse JSON response
    let parsedResponse;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Content:', content);
      // Use the content as-is if JSON parsing fails
      parsedResponse = {
        response: content.replace(/```json|```/g, '').trim(),
        affinityChange: 5,
        reason: userLang === 'vi' ? "Cuộc trò chuyện tiếp tục" :
                userLang === 'en' ? "Conversation continued" :
                userLang === 'ja' ? "会話が続いています" :
                userLang === 'zh' ? "对话继续" :
                userLang === 'ru' ? "Разговор продолжается" :
                userLang === 'uz' ? "Suhbat davom etmoqda" :
                "대화가 진행되었어요"
      };
    }

    // Ensure response has required fields
    if (!parsedResponse.response) {
      parsedResponse.response = content;
    }

    // Sanitize output
    parsedResponse.affinityChange = validateNumber(parsedResponse.affinityChange, -15, 15);

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Dating chat error:', errorMessage);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      response: "죄송해요, 잠시 문제가 생겼어요... 다시 말해줄래요? 😅\n\n(Sorry, there was a small issue... Can you say that again?)",
      affinityChange: 0,
      reason: ""
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
