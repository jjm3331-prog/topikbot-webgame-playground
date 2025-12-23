import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyName } = await req.json();

    if (!companyName) {
      return new Response(
        JSON.stringify({ error: 'Company name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!PERPLEXITY_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Perplexity API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating deep report for: ${companyName}`);

    const systemPrompt = `Bạn là chuyên gia nghiên cứu doanh nghiệp Hàn Quốc, chuyên cung cấp phân tích công ty toàn diện cho người Việt Nam muốn làm việc tại Hàn Quốc.

Nhiệm vụ của bạn là cung cấp báo cáo chi tiết, chính xác và hữu ích về các công ty Hàn Quốc.

QUAN TRỌNG: Luôn trả lời bằng TIẾNG VIỆT. Chỉ giữ lại tên công ty, thuật ngữ chuyên ngành bằng tiếng Hàn/Anh khi cần thiết.
Định dạng phản hồi bằng Markdown với các phần rõ ràng.`;

    const userPrompt = `Hãy viết báo cáo chuyên sâu về công ty ${companyName}.

Bao gồm các phần sau:

## 1. Tổng Quan Công Ty (회사 개요)
- Năm thành lập, địa điểm trụ sở chính, lĩnh vực kinh doanh chính
- Doanh thu gần đây, số lượng nhân viên và thông tin cơ bản khác

## 2. Thông Tin Lương (연봉 정보)
- Mức lương dự kiến cho nhân viên mới/có kinh nghiệm
- Cơ cấu thưởng hiệu suất, bonus
- Phúc lợi (ký túc xá, phụ cấp ăn, phí đi lại, v.v.)

## 3. Văn Hóa Công Ty (기업 문화)
- Môi trường và không khí làm việc
- Đánh giá Work-Life Balance
- Thái độ đối với nhân viên người nước ngoài

## 4. Review Phỏng Vấn (면접 후기)
- Quy trình phỏng vấn thông thường
- Các câu hỏi phỏng vấn thường gặp
- Mẹo phỏng vấn

## 5. Tin Tức & Xu Hướng Mới Nhất (최신 뉴스)
- Tin tức quan trọng gần đây của công ty
- Xu hướng tuyển dụng
- Triển vọng tương lai

Hãy tập trung vào thông tin thực sự hữu ích cho người Việt Nam muốn xin việc tại công ty này.`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-reasoning-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const report = data.choices[0]?.message?.content || '';
    const citations = data.citations || [];

    console.log(`Report generated successfully for ${companyName}`);

    return new Response(
      JSON.stringify({ report, citations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Company report error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate report';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
