import { ChevronLeft, Mail, Phone, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MegaMenu from "@/components/MegaMenu";
import AppFooter from "@/components/AppFooter";

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MegaMenu />

      <main className="flex-1 pt-[76px] container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back</span>
          </button>
        </div>
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <h1 className="font-heading text-4xl font-bold mb-8">Chính Sách Bảo Mật Thông Tin Cá Nhân (Privacy Policy)</h1>
          
          <p className="text-muted-foreground text-lg mb-8">
            Cập nhật lần cuối: Tháng 1, 2025
          </p>

          {/* Mục 1: Các mục thông tin cá nhân thu thập */}
          <section className="mb-8">
            <h2 className="font-heading text-2xl font-bold mb-4">■ Các mục thông tin cá nhân thu thập</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Công ty thu thập các thông tin cá nhân sau đây nhằm phục vụ đăng ký thành viên, tư vấn, đăng ký dịch vụ, v.v.:
            </p>
            <div className="bg-muted/30 p-4 rounded-lg border border-border mb-4">
              <p className="text-muted-foreground mb-2"><strong>Các mục thu thập:</strong></p>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Họ tên, ngày sinh, giới tính, ID đăng nhập, mật khẩu, câu hỏi bảo mật và câu trả lời, số điện thoại nhà riêng, địa chỉ nhà riêng, số điện thoại di động, email, nghề nghiệp, tên công ty, phòng ban, chức vụ, điện thoại công ty, sở thích, tình trạng hôn nhân, ngày kỷ niệm, thông tin người giám hộ hợp pháp, số định danh cá nhân (CMND/CCCD), lịch sử sử dụng dịch vụ, nhật ký truy cập, địa chỉ IP truy cập, lịch sử thanh toán
              </p>
            </div>
            <div className="bg-muted/30 p-4 rounded-lg border border-border">
              <p className="text-muted-foreground mb-2"><strong>Phương thức thu thập:</strong></p>
              <p className="text-muted-foreground text-sm">Website (đăng ký thành viên), biểu mẫu giấy</p>
            </div>
          </section>

          {/* Mục 2: Mục đích thu thập và sử dụng */}
          <section className="mb-8">
            <h2 className="font-heading text-2xl font-bold mb-4">■ Mục đích thu thập và sử dụng thông tin cá nhân</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Công ty sử dụng thông tin cá nhân đã thu thập cho các mục đích sau:
            </p>
            <ul className="list-disc ml-6 space-y-2 text-muted-foreground">
              <li>Thực hiện hợp đồng cung cấp dịch vụ và thanh toán phí dịch vụ, cung cấp nội dung, mua bán và giao nhận hàng hóa, gửi hóa đơn và các tài liệu liên quan</li>
              <li>Quản lý thành viên: Xác minh danh tính, định danh cá nhân, xác nhận độ tuổi, kiểm tra việc đồng ý của người giám hộ hợp pháp khi thu thập thông tin trẻ em dưới 14 tuổi, truyền đạt các thông báo, sử dụng cho mục đích marketing và quảng cáo</li>
              <li>Phân tích tần suất truy cập hoặc thống kê việc sử dụng dịch vụ của thành viên</li>
            </ul>
          </section>

          {/* Mục 3: Thời gian lưu trữ */}
          <section className="mb-8">
            <h2 className="font-heading text-2xl font-bold mb-4">■ Thời gian lưu trữ và sử dụng thông tin cá nhân</h2>
            <p className="text-muted-foreground leading-relaxed">
              Công ty sẽ hủy bỏ thông tin cá nhân ngay khi mục đích thu thập và sử dụng được hoàn thành mà không có ngoại lệ.
            </p>
          </section>

          {/* Mục 4: Quy trình hủy bỏ */}
          <section className="mb-8">
            <h2 className="font-heading text-2xl font-bold mb-4">■ Quy trình và phương thức hủy bỏ thông tin cá nhân</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Sau khi hoàn thành mục đích thu thập và sử dụng, thông tin cá nhân sẽ được hủy ngay lập tức theo quy trình và phương thức như sau:
            </p>
            <div className="space-y-4">
              <div className="bg-muted/30 p-4 rounded-lg border border-border">
                <p className="text-muted-foreground mb-2"><strong>Quy trình hủy:</strong></p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Thông tin cá nhân của thành viên được chuyển sang cơ sở dữ liệu riêng biệt (đối với hồ sơ giấy sẽ được lưu trong hòm tài liệu riêng) và lưu trữ trong thời gian nhất định theo chính sách nội bộ và các quy định pháp luật liên quan trước khi bị hủy. Thông tin chuyển sang cơ sở dữ liệu riêng này không được sử dụng cho mục đích khác ngoài trừ trường hợp pháp luật yêu cầu.
                </p>
              </div>
              <div className="bg-muted/30 p-4 rounded-lg border border-border">
                <p className="text-muted-foreground mb-2"><strong>Phương thức hủy:</strong></p>
                <p className="text-muted-foreground text-sm">
                  Thông tin cá nhân lưu trữ dưới dạng tập tin điện tử sẽ bị xóa bằng phương pháp kỹ thuật không thể khôi phục.
                </p>
              </div>
            </div>
          </section>

          {/* Mục 5: Việc cung cấp thông tin */}
          <section className="mb-8">
            <h2 className="font-heading text-2xl font-bold mb-4">■ Việc cung cấp thông tin cá nhân</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Công ty không cung cấp thông tin cá nhân của người dùng cho bên ngoài, trừ các trường hợp sau:
            </p>
            <ul className="list-disc ml-6 space-y-2 text-muted-foreground">
              <li>Có sự đồng ý trước của người dùng</li>
              <li>Theo quy định pháp luật hoặc theo yêu cầu của cơ quan điều tra trong quá trình điều tra theo trình tự và phương pháp được quy định bởi pháp luật</li>
            </ul>
          </section>

          {/* Mục 6: Ủy thác xử lý */}
          <section className="mb-8">
            <h2 className="font-heading text-2xl font-bold mb-4">■ Ủy thác xử lý thông tin cá nhân</h2>
            <p className="text-muted-foreground leading-relaxed">
              Công ty không ủy thác thông tin cá nhân của khách hàng cho bên thứ ba khi chưa có sự đồng ý của khách hàng. Nếu có nhu cầu ủy thác trong tương lai, công ty sẽ thông báo đến khách hàng về đơn vị ủy thác và nội dung công việc ủy thác, đồng thời nếu cần sẽ xin sự đồng ý trước của khách hàng.
            </p>
          </section>

          {/* Mục 7: Quyền của người dùng */}
          <section className="mb-8">
            <h2 className="font-heading text-2xl font-bold mb-4">■ Quyền và cách thức thực hiện quyền của người dùng và đại diện hợp pháp</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Người dùng và đại diện hợp pháp của họ có quyền truy cập, sửa đổi thông tin cá nhân của bản thân hoặc trẻ em dưới 14 tuổi đã đăng ký bất cứ lúc nào, cũng như yêu cầu hủy đăng ký.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Để truy cập hoặc sửa đổi thông tin cá nhân, người dùng có thể sử dụng mục 'Thay đổi thông tin cá nhân' (hoặc 'Sửa thông tin thành viên'). Để hủy đăng ký (thu hồi đồng ý), người dùng nhấn "Rút khỏi thành viên" và trải qua bước xác minh danh tính để thực hiện truy cập, chỉnh sửa hoặc hủy bỏ trực tiếp. Ngoài ra, người dùng có thể liên hệ với người phụ trách bảo vệ thông tin cá nhân bằng văn bản, điện thoại hoặc email để được xử lý kịp thời.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Nếu đã yêu cầu chỉnh sửa thông tin sai, công ty sẽ không sử dụng hoặc cung cấp thông tin đó cho đến khi hoàn tất việc chỉnh sửa. Trong trường hợp thông tin sai đã được cung cấp cho bên thứ ba, công ty sẽ thông báo kịp thời kết quả chỉnh sửa tới bên thứ ba đó để sửa đổi.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Thông tin cá nhân bị hủy hoặc xoá theo yêu cầu của người dùng hoặc đại diện hợp pháp sẽ được xử lý theo "Thời gian lưu trữ và sử dụng thông tin cá nhân của công ty" và không được phép mở xem hoặc sử dụng cho mục đích khác.
            </p>
          </section>

          {/* Mục 8: Cookie */}
          <section className="mb-8">
            <h2 className="font-heading text-2xl font-bold mb-4">■ Việc cài đặt, vận hành và từ chối thiết bị thu thập thông tin tự động (cookie)</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Công ty vận hành các "cookie" và các thiết bị tương tự giúp lưu trữ và truy xuất thông tin của quý khách thường xuyên. Cookie là tập tin văn bản nhỏ được gửi từ server vận hành website tới trình duyệt của quý khách và được lưu trên ổ cứng máy tính.
            </p>
            <div className="bg-muted/30 p-4 rounded-lg border border-border mb-4">
              <p className="text-muted-foreground mb-2"><strong>Mục đích sử dụng cookie:</strong></p>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Phân tích tần suất truy cập và thời gian truy cập của thành viên và không thành viên, xác định sở thích và lĩnh vực quan tâm, theo dõi dấu vết truy cập, xác định mức độ tham gia các sự kiện cũng như số lần truy cập để cung cấp dịch vụ cá nhân hóa và marketing mục tiêu.
              </p>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Quý khách có quyền chọn cho phép hoặc từ chối sử dụng cookie. Quý khách có thể thiết lập trình duyệt web để chấp nhận tất cả cookie, hỏi mỗi lần cookie được lưu hoặc từ chối tất cả cookie.
            </p>
            <div className="bg-muted/30 p-4 rounded-lg border border-border mb-4">
              <p className="text-muted-foreground mb-2"><strong>Hướng dẫn từ chối cài đặt cookie:</strong></p>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Ví dụ đối với Internet Explorer: Công cụ trên thanh trình duyệt → Tùy chọn Internet → Quyền riêng tư.
              </p>
            </div>
            <p className="text-muted-foreground leading-relaxed text-sm italic">
              Tuy nhiên, nếu quý khách từ chối cài đặt cookie, việc cung cấp dịch vụ có thể gặp khó khăn.
            </p>
          </section>

          {/* Mục 9: Liên hệ */}
          <section className="mb-8">
            <h2 className="font-heading text-2xl font-bold mb-4">■ Dịch vụ xử lý khiếu nại liên quan đến thông tin cá nhân</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Công ty chỉ định bộ phận liên quan và người phụ trách bảo vệ thông tin cá nhân nhằm bảo vệ và xử lý các khiếu nại liên quan thông tin cá nhân như sau:
            </p>
            
            <div className="bg-gradient-to-br from-primary/10 to-korean-purple/10 p-6 rounded-2xl border border-border">
              <h3 className="font-heading font-bold text-lg mb-4 text-foreground">Người phụ trách bảo vệ thông tin cá nhân</h3>
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
                  <a href="mailto:jjm3331@naver.com" className="text-primary hover:underline">jjm3331@naver.com</a>
                </div>
              </div>
            </div>

            <p className="text-muted-foreground leading-relaxed mt-6">
              Quý khách có thể báo cáo các khiếu nại liên quan đến bảo vệ thông tin cá nhân phát sinh trong quá trình sử dụng dịch vụ của công ty cho người phụ trách hoặc bộ phận liên quan. Công ty cam kết sẽ trả lời kịp thời và đầy đủ các báo cáo của người dùng.
            </p>
          </section>
        </div>
      </main>

      <AppFooter />
    </div>
  );
};

export default Privacy;