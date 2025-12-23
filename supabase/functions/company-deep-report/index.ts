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

    const systemPrompt = `Bạn là chuyên gia nghiên cứu doanh nghiệp Hàn Quốc cấp cao với 20 năm kinh nghiệm trong ngành tuyển dụng quốc tế, chuyên TÌM KIẾM THÔNG TIN ẨN và khó tìm cho người Việt Nam muốn làm việc tại Hàn Quốc.

## NGUYÊN TẮC BẮT BUỘC:

### 1. CHÍNH XÁC THUẬT NGỮ CHUYÊN NGÀNH (CỰC KỲ QUAN TRỌNG)
**Bán dẫn/Semiconductor:**
- **IDM (Integrated Device Manufacturer)**: Công ty sản xuất chip toàn diện (thiết kế + sản xuất). Ví dụ: Samsung, SK Hynix, Intel
- **Fabless**: Công ty CHỈ thiết kế chip, KHÔNG có nhà máy sản xuất. Ví dụ: Nvidia, AMD, Qualcomm
- **Foundry**: Công ty CHỈ sản xuất chip theo đơn đặt hàng. Ví dụ: TSMC, Samsung Foundry
- **Fab (Fabrication Plant)**: Nhà máy sản xuất chip/wafer, nơi có phòng sạch (Cleanroom)
- **8 công đoạn chính**: Wafer Fabrication, Oxidation, Photolithography, Etching, Deposition, Ion Implantation, CMP, Packaging/Test

**TUYỆT ĐỐI KHÔNG NHẦM LẪN**: 
- SK Hynix, Samsung Electronics = IDM (có Fab)
- Nvidia, AMD = Fabless (KHÔNG có Fab)

### 2. ĐỘ CHÍNH XÁC DỮ LIỆU TÀI CHÍNH
- LUÔN ghi rõ năm của số liệu: "Doanh thu năm 2024: XX tỷ Won"
- LUÔN ghi nguồn: "(Theo báo cáo tài chính Q3/2024)"
- Phân biệt: Doanh thu thực tế vs Dự kiến vs Mục tiêu
- Đơn vị tiền tệ chính xác: tỷ Won (조 원), triệu Won (백만 원)

### 3. CHẤT LƯỢNG VĂN BẢN
- KHÔNG BAO GIỜ trộn lẫn ký tự từ ngôn ngữ khác (日本語, 中文, etc.)
- Sử dụng tiếng Việt chuẩn, dấu đầy đủ
- Số liệu viết đúng định dạng: 66.193 nghìn tỷ → 66,193 nghìn tỷ hoặc 66.2 nghìn tỷ

### 4. THÔNG TIN PHỎNG VẤN CHI TIẾT (BẮT BUỘC)
- **Thi tuyển năng lực**: SKCT (SK Competency Test), GSAT (Samsung), HMAT (Hyundai)
- **Câu hỏi kỹ thuật phổ biến**: Giải thích quy trình 8 công đoạn, nguyên lý DRAM/NAND, yield improvement
- **Câu hỏi hành vi**: Tình huống teamwork, xử lý deadline, kinh nghiệm làm việc ca đêm
- **Tip chuẩn bị**: Nghiên cứu sản phẩm chủ lực, tin tức M&A gần đây, đối thủ cạnh tranh

### 5. NGUỒN TÌM KIẾM (TÌM SÂU)
- JobPlanet (잡플래닛), Blind (블라인드), Glassdoor, LinkedIn
- Naver Blog, Tistory, Velog, Medium
- Naver Cafe, Daum Cafe, Reddit, Quora
- Báo cáo tài chính chính thức, thông cáo báo chí

## QUAN TRỌNG: 
- Luôn trả lời bằng TIẾNG VIỆT chuẩn
- Chỉ giữ tên công ty, thuật ngữ chuyên ngành bằng tiếng Hàn/Anh khi cần thiết
- Định dạng Markdown rõ ràng với emoji phù hợp
- KHÔNG BAO GIỜ bao gồm thẻ <think> hoặc bất kỳ thẻ suy luận nào
- KHÔNG BAO GIỜ nói "thông tin không có sẵn" - hãy ước tính dựa trên ngành nghề, quy mô`;

    const userPrompt = `Hãy viết báo cáo CHUYÊN SÂU HOÀN HẢO về công ty ${companyName}.

⚠️ LƯU Ý ĐẶC BIỆT:
- Xác định chính xác loại hình công ty (IDM/Fabless/Foundry nếu là bán dẫn)
- Mọi số liệu tài chính PHẢI kèm năm và nguồn
- KHÔNG trộn lẫn ký tự từ ngôn ngữ khác

📍 TÌM KIẾM TRÊN:
- JobPlanet (잡플래닛), Blind (블라인드), Glassdoor, LinkedIn
- Naver Blog, Tistory, Velog, Medium, các blog cá nhân
- Naver Cafe, Daum Cafe, Reddit, Quora
- Review từ nhân viên hiện tại/cựu nhân viên
- Báo cáo tài chính, thông cáo báo chí chính thức

## 1. 🏢 Tổng Quan Công Ty (회사 개요)
- Năm thành lập, trụ sở chính, lĩnh vực kinh doanh
- **Loại hình**: IDM/Fabless/Foundry/Tập đoàn đa ngành (giải thích rõ)
- Doanh thu **năm 2024** (ghi rõ nguồn), số lượng nhân viên
- Sản phẩm/dịch vụ chủ lực, thị phần toàn cầu
- Chi nhánh/nhà máy tại Việt Nam (nếu có)

## 2. 💰 Thông Tin Lương & Phúc Lợi (연봉 정보)
- Mức lương theo cấp bậc (신입/경력) - nguồn: JobPlanet, Blind
- **Cơ cấu thưởng chi tiết**: 
  - Thưởng cố định (Tết Nguyên đán, Chuseok)
  - Thưởng hiệu suất (PS - Profit Sharing)
  - Thưởng khuyến khích (PI - Performance Incentive)
  - RSU/Stock Options (nếu có)
- **Phúc lợi**: Ký túc xá, phụ cấp ăn/đi lại, bảo hiểm, nghỉ phép, đào tạo
- So sánh với mức trung bình ngành và đối thủ cạnh tranh

## 3. 🏠 Văn Hóa Công Ty (기업 문화)
- Môi trường làm việc thực tế (từ review nhân viên)
- **Work-Life Balance**: Giờ làm thêm trung bình, OT có trả lương không
- Hệ thống làm việc ca (nếu là nhà máy Fab/sản xuất)
- Thái độ với nhân viên nước ngoài, hỗ trợ visa
- Cơ hội thăng tiến, chương trình đào tạo
- **Điểm mạnh/yếu** từ review thực tế (trích dẫn nếu có)

## 4. 📝 Quy Trình & Kinh Nghiệm Phỏng Vấn (면접 후기)
- **Quy trình tuyển dụng**: Số vòng, hình thức (online/offline), thời gian
- **Bài thi năng lực** (nếu có): SKCT, GSAT, HMAT, hoặc thi riêng
- **Câu hỏi phỏng vấn THỰC TẾ** (ít nhất 5 câu):
  - Câu hỏi kỹ thuật/chuyên môn
  - Câu hỏi hành vi/tình huống
  - Câu hỏi về động lực làm việc
- **Mẹo phỏng vấn cụ thể** cho công ty này
- Tỷ lệ cạnh tranh, độ khó phỏng vấn (1-5 sao)

## 5. 📰 Tin Tức & Xu Hướng Mới Nhất (최신 뉴스)
- Tin tức quan trọng trong 6 tháng gần đây
- Kế hoạch đầu tư, mở rộng, M&A
- Xu hướng tuyển dụng: Vị trí đang tìm, kỹ năng ưu tiên
- Triển vọng tương lai của công ty và ngành

## 6. 🎯 Lời Khuyên Cho Ứng Viên Việt Nam
- Kỹ năng cần chuẩn bị (tiếng Hàn, chuyên môn, soft skills)
- Lộ trình apply tối ưu
- Những điều cần lưu ý đặc biệt
- Tài liệu tham khảo hữu ích

---
💡 Tập trung vào thông tin THỰC SỰ HỮU ÍCH, CỤ THỂ và KHÓ TÌM. Mỗi thông tin phải có giá trị thực tiễn cho người Việt Nam muốn xin việc tại công ty này.`;

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
    report = report.replace(/<\/?think>/gi, '');
    
    // Fix encoding errors - remove mixed language characters
    report = report.replace(/[\u3040-\u309F\u30A0-\u30FF]/g, ''); // Remove Japanese hiragana/katakana
    report = report.replace(/[\u4E00-\u9FFF]/g, (match: string) => {
      // Keep only common Chinese characters used in Korean company names
      const allowedChars = ['株', '式', '會', '社', '有', '限', '公', '司'];
      return allowedChars.includes(match) ? match : '';
    });
    
    // Fix common OCR/encoding issues in Vietnamese
    report = report.replace(/nghìん/g, 'nghìn');
    report = report.replace(/nghìu/g, 'nghìn');
    report = report.replace(/tỷん/g, 'tỷ');
    
    // Clean up extra whitespace
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
