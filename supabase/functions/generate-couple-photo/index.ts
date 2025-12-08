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
    const { npcName, npcJob, userDescription } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Generating couple photo for:', { npcName, npcJob, userDescription });

    const prompt = `A beautiful romantic couple photo in a Seoul cityscape at sunset. 
The scene shows a cute Korean couple in their mid-20s on a romantic date.
One person is described as: ${userDescription || 'an attractive young person in casual Korean fashion'}.
The other person (${npcName}) works as a ${npcJob} and has a charming, attractive appearance.
They are looking at each other lovingly with the Seoul skyline and N Seoul Tower in the background.
The lighting is warm and romantic with a pink/purple sunset sky.
Style: High quality, romantic K-drama aesthetic, soft focus background, professional photography style.
Aspect ratio: 1:1 square format for social media.
Ultra high resolution, dreamy and romantic atmosphere.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limited. Please try again later.",
          errorVi: "Vượt quá giới hạn. Vui lòng thử lại sau."
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "Please add credits to continue.",
          errorVi: "Vui lòng thêm credits để tiếp tục."
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');
    
    // Extract image from response
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageUrl) {
      throw new Error('No image generated');
    }

    return new Response(JSON.stringify({ 
      imageUrl,
      message: "커플 사진이 생성되었어요! 💕"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Couple photo generation error:', errorMessage);
    return new Response(JSON.stringify({ 
      error: errorMessage,
      errorVi: "Lỗi khi tạo ảnh couple"
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
