import { useMemo } from "react";
import { ChevronLeft, Mail, Phone, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { useAutoTranslate } from "@/hooks/useAutoTranslate";

const PRIVACY_MD_VI = `# Chính Sách Bảo Mật Thông Tin Cá Nhân (Privacy Policy)

*Cập nhật lần cuối: Tháng 1, 2025*

## ■ Các mục thông tin cá nhân thu thập
Công ty thu thập các thông tin cá nhân sau đây nhằm phục vụ đăng ký thành viên, tư vấn, đăng ký dịch vụ, v.v.:

**Các mục thu thập:**
Họ tên, ngày sinh, giới tính, ID đăng nhập, mật khẩu, câu hỏi bảo mật và câu trả lời, số điện thoại nhà riêng, địa chỉ nhà riêng, số điện thoại di động, email, nghề nghiệp, tên công ty, phòng ban, chức vụ, điện thoại công ty, sở thích, tình trạng hôn nhân, ngày kỷ niệm, thông tin người giám hộ hợp pháp, số định danh cá nhân (CMND/CCCD), lịch sử sử dụng dịch vụ, nhật ký truy cập, địa chỉ IP truy cập, lịch sử thanh toán

**Phương thức thu thập:** Website (đăng ký thành viên), biểu mẫu giấy

## ■ Mục đích thu thập và sử dụng thông tin cá nhân
Công ty sử dụng thông tin cá nhân đã thu thập cho các mục đích sau:
- Thực hiện hợp đồng cung cấp dịch vụ và thanh toán phí dịch vụ, cung cấp nội dung, mua bán và giao nhận hàng hóa, gửi hóa đơn và các tài liệu liên quan
- Quản lý thành viên: Xác minh danh tính, định danh cá nhân, xác nhận độ tuổi, kiểm tra việc đồng ý của người giám hộ hợp pháp khi thu thập thông tin trẻ em dưới 14 tuổi, truyền đạt các thông báo, sử dụng cho mục đích marketing và quảng cáo
- Phân tích tần suất truy cập hoặc thống kê việc sử dụng dịch vụ của thành viên

## ■ Thời gian lưu trữ và sử dụng thông tin cá nhân
Công ty sẽ hủy bỏ thông tin cá nhân ngay khi mục đích thu thập và sử dụng được hoàn thành mà không có ngoại lệ.

## ■ Quy trình và phương thức hủy bỏ thông tin cá nhân
Sau khi hoàn thành mục đích thu thập và sử dụng, thông tin cá nhân sẽ được hủy ngay lập tức theo quy trình và phương thức.

## ■ Việc cung cấp thông tin cá nhân
Công ty không cung cấp thông tin cá nhân của người dùng cho bên ngoài, trừ các trường hợp:
- Có sự đồng ý trước của người dùng
- Theo quy định pháp luật hoặc theo yêu cầu của cơ quan điều tra

## ■ Ủy thác xử lý thông tin cá nhân
Công ty không ủy thác thông tin cá nhân của khách hàng cho bên thứ ba khi chưa có sự đồng ý.

## ■ Quyền và cách thức thực hiện quyền của người dùng
Người dùng có quyền truy cập/sửa đổi thông tin cá nhân, và yêu cầu hủy đăng ký theo quy định.

## ■ Cookie
Công ty vận hành cookie để cải thiện dịch vụ. Người dùng có thể từ chối cookie trong cài đặt trình duyệt.

## ■ Dịch vụ xử lý khiếu nại liên quan đến thông tin cá nhân
Công ty chỉ định bộ phận liên quan và người phụ trách bảo vệ thông tin cá nhân.

### Người phụ trách bảo vệ thông tin cá nhân
- Tên: Jang Jinmin (장진민)
- Điện thoại: (+82) 10-8647-0485
- Email: jjm3331@naver.com
`;

const Privacy = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const { text: translated } = useAutoTranslate(PRIVACY_MD_VI, { sourceLanguage: "vi" });

  const md = useMemo(() => (i18n.language === "vi" ? PRIVACY_MD_VI : translated), [i18n.language, translated]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CleanHeader />

      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <nav className="mb-6" aria-label="breadcrumb">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">{t("common.back")}</span>
          </button>
        </nav>

        <article className="prose prose-lg dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>

          <section className="mt-10 not-prose">
            <div className="bg-gradient-to-br from-primary/10 to-korean-purple/10 p-6 rounded-2xl border border-border">
              <h2 className="font-heading font-bold text-lg mb-4 text-foreground">
                {t("privacy.contactTitle", { defaultValue: "Người phụ trách bảo vệ thông tin cá nhân" })}
              </h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-primary" />
                  <span className="text-muted-foreground">Jang Jinmin (장진민)</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-primary" />
                  <span className="text-muted-foreground">(+82) 10-8647-0485</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-primary" />
                  <a href="mailto:jjm3331@naver.com" className="text-primary hover:underline">
                    jjm3331@naver.com
                  </a>
                </div>
              </div>
            </div>
          </section>
        </article>
      </main>

      <AppFooter />
    </div>
  );
};

export default Privacy;
