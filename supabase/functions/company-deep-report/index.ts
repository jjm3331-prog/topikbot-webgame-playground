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

    const systemPrompt = `Bạn là chuyên gia nghiên cứu doanh nghiệp Hàn Quốc cấp cao, chuyên TÌM KIẾM THÔNG TIN ẨN và khó tìm cho người Việt Nam muốn làm việc tại Hàn Quốc.

NHIỆM VỤ QUAN TRỌNG:
- Bạn PHẢI tìm kiếm TOÀN BỘ nguồn thông tin có thể: blog cá nhân, diễn đàn, JobPlanet (잡플래닛), Blind (블라인드), Glassdoor, LinkedIn, Reddit, Naver Cafe, Naver Blog, Daum Cafe, Tistory, Velog, các trang review công ty Hàn Quốc
- Bạn PHẢI tìm các bài viết của nhân viên hiện tại, cựu nhân viên, ứng viên đã phỏng vấn
- Bạn PHẢI tổng hợp thông tin từ các nguồn ẩn danh, review thực tế của người trong cuộc
- KHÔNG BAO GIỜ nói "thông tin không có sẵn" hoặc "không tìm thấy" - hãy tìm kiếm sâu hơn từ mọi nguồn có thể
- Nếu không có thông tin chính xác, hãy ước tính dựa trên ngành nghề, quy mô công ty, và các nguồn tương tự

QUAN TRỌNG: 
- Luôn trả lời bằng TIẾNG VIỆT
- Chỉ giữ lại tên công ty, thuật ngữ chuyên ngành bằng tiếng Hàn/Anh khi cần thiết
- Định dạng phản hồi bằng Markdown với các phần rõ ràng
- KHÔNG BAO GIỜ bao gồm thẻ <think> hoặc bất kỳ thẻ suy luận nào trong phản hồi`;

    const userPrompt = `Hãy viết báo cáo CHUYÊN SÂU về công ty ${companyName}.

⚠️ YÊU CẦU TÌM KIẾM CỰC KỲ QUAN TRỌNG:
- Tìm kiếm trên JobPlanet (잡플래닛), Blind (블라인드), Glassdoor, LinkedIn
- Tìm kiếm các blog cá nhân: Naver Blog, Tistory, Velog, Medium
- Tìm kiếm các diễn đàn: Naver Cafe, Daum Cafe, Reddit, Quora
- Tìm kiếm các bài viết review công ty từ nhân viên hiện tại/cựu nhân viên
- Tìm kiếm các bài chia sẻ kinh nghiệm phỏng vấn
- Tìm kiếm thông tin về lương từ các nguồn ẩn danh

Bao gồm các phần sau (BẮT BUỘC phải có thông tin cụ thể cho MỖI phần):

## 1. Tổng Quan Công Ty (회사 개요)
- Năm thành lập, địa điểm trụ sở chính, lĩnh vực kinh doanh chính
- Doanh thu gần đây, số lượng nhân viên và thông tin cơ bản khác
- Thông tin về các chi nhánh/nhà máy tại Việt Nam (nếu có)

## 2. Thông Tin Lương (연봉 정보)
- Mức lương dự kiến cho nhân viên mới/có kinh nghiệm (TÌM TỪ JobPlanet, Blind, Glassdoor)
- Cơ cấu thưởng hiệu suất, bonus (Tết, hiệu suất, cổ phiếu)
- Phúc lợi chi tiết (ký túc xá, phụ cấp ăn, phí đi lại, bảo hiểm, nghỉ phép, v.v.)
- So sánh với mức lương trung bình ngành

## 3. Văn Hóa Công Ty (기업 문화)
- Môi trường và không khí làm việc thực tế (TÌM TỪ review của nhân viên)
- Đánh giá Work-Life Balance thực tế (giờ làm thêm, áp lực công việc)
- Thái độ đối với nhân viên người nước ngoài
- Cơ hội thăng tiến và phát triển
- Điểm mạnh và điểm yếu của văn hóa công ty (từ review thực tế)

## 4. Review Phỏng Vấn (면접 후기)
- Quy trình phỏng vấn chi tiết (số vòng, hình thức, thời gian)
- Các câu hỏi phỏng vấn THỰC TẾ thường gặp (từ các bài chia sẻ kinh nghiệm)
- Mẹo phỏng vấn cụ thể cho công ty này
- Độ khó phỏng vấn và tỷ lệ đậu ước tính

## 5. Tin Tức & Xu Hướng Mới Nhất (최신 뉴스)
- Tin tức quan trọng gần đây của công ty
- Xu hướng tuyển dụng và các vị trí đang tìm kiếm
- Triển vọng tương lai và kế hoạch mở rộng

Hãy tập trung vào thông tin THỰC SỰ HỮU ÍCH và KHÓ TÌM cho người Việt Nam muốn xin việc tại công ty này. KHÔNG nói "không có thông tin" - hãy tìm kiếm sâu hơn!`;

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
        max_tokens: 8000,
        search_recency_filter: 'year',
        return_citations: true,
        search_domain_filter: [],
        web_search_options: {
          search_context_size: 'high'
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    let report = data.choices[0]?.message?.content || '';
    const citations = data.citations || [];

    // Filter out <think> tags and their content
    report = report.replace(/<think>[\s\S]*?<\/think>/gi, '');
    // Also filter out any remaining think-related patterns
    report = report.replace(/<\/?think>/gi, '');
    // Clean up extra whitespace that might be left
    report = report.replace(/^\s*\n\s*\n/gm, '\n\n').trim();

    console.log(`Report generated successfully for ${companyName}, citations: ${citations.length}`);

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
