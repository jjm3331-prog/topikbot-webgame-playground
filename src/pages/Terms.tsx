import { useMemo } from "react";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";
import { useAutoTranslate } from "@/hooks/useAutoTranslate";

const TERMS_MD_VI = `# Điều Khoản Sử Dụng (Terms of Use)

*Cập nhật lần cuối: Tháng 1, 2025*

## Điều 1. Mục Đích
Điều khoản sử dụng này có mục đích quy định các điều kiện và quy tắc vận hành dịch vụ của "LUKATO AI" (sau đây gọi là "Trang Web"). Bằng việc truy cập hoặc sử dụng dịch vụ, người sử dụng, dù đã đăng ký hay không, đồng ý đã đọc, hiểu và chịu sự ràng buộc bởi các điều khoản này.

## Điều 2. Định Nghĩa Thuật Ngữ
Các thuật ngữ chính được sử dụng trong điều khoản này được định nghĩa như sau:
- ① "Dịch vụ" là các dịch vụ mà thành viên có thể sử dụng trên Trang Web, bất kể thiết bị đầu cuối (PC, thiết bị di động có dây hoặc không dây, v.v.)
- ② "Người sử dụng" là các thành viên và không thành viên truy cập và sử dụng dịch vụ theo điều khoản này
- ③ "Thành viên" là khách hàng đã đăng ký, ký kết hợp đồng sử dụng dịch vụ với công ty và sử dụng dịch vụ do công ty cung cấp
- ④ "Không thành viên" là người sử dụng dịch vụ mà không đăng ký thành viên
- ⑤ "Hợp đồng sử dụng" là hợp đồng ký kết giữa Trang Web và thành viên liên quan đến việc sử dụng dịch vụ
- ⑥ "ID thành viên" là chuỗi ký tự và số duy nhất được cung cấp để nhận diện và sử dụng dịch vụ
- ⑦ "Mật khẩu" là ký tự, số hoặc kết hợp do thành viên tự thiết lập để xác nhận và bảo mật tài khoản
- ⑧ "Người vận hành" là người mở và quản lý trang web dịch vụ
- ⑨ "Chấm dứt" là việc thành viên hủy bỏ hợp đồng sử dụng

## Điều 3. Quy Định Ngoài Điều Khoản
Người vận hành có thể ban hành thêm các chính sách vận hành khi cần thiết và trong trường hợp có sự chồng lấn giữa chính sách này và điều khoản vận hành, chính sách vận hành được ưu tiên áp dụng.

## Điều 4. Ký Kết Hợp Đồng Sử Dụng
- ① Hợp đồng sử dụng được hình thành khi người đăng ký làm thành viên đồng ý với điều khoản này và được người vận hành chấp thuận
- ② Người muốn đăng ký làm thành viên đồng ý với các điều khoản khi hoàn tất đăng ký sử dụng dịch vụ trên Trang Web

## Điều 5. Đăng Ký Thành Viên
- ① Người sử dụng có thể đăng ký thành viên miễn phí bằng cách điền thông tin theo mẫu do công ty cung cấp và đồng ý với các điều khoản
- ② Tất cả thông tin thành viên ghi trong mẫu đăng ký phải là thông tin thật và chính xác; người cung cấp thông tin sai có thể không được bảo vệ pháp luật và bị xử lý theo quy định
- ③ Hợp đồng sử dụng hình thành khi công ty chấp nhận đơn đăng ký; công ty có quyền từ chối hoặc hủy bỏ hợp đồng trong các trường hợp:
  - Người đăng ký từng mất tư cách thành viên theo điều khoản này, trừ trường hợp được chấp thuận tái đăng ký
  - Khai báo thông tin sai hoặc không đầy đủ theo yêu cầu công ty
  - Các trường hợp do lỗi của người sử dụng hoặc vi phạm quy định khác
- ④ Thành viên phải cập nhật thông tin khi có thay đổi trong thời gian hợp lý

## Điều 6. Nghĩa Vụ Của Công Ty
- ① Công ty phải giải quyết nhanh chóng các khiếu nại hợp lý của thành viên; trong trường hợp khó khăn vì lý do cá nhân có thể thông báo sau hoặc liên hệ bằng tin nhắn, email
- ② Người vận hành phải đảm bảo sự vận hành ổn định và nhanh chóng khắc phục sự cố liên quan đến trang web. Tuy nhiên, trong trường hợp thiên tai hoặc lý do bất khả kháng, có thể tạm đình chỉ dịch vụ
- ③ Công ty không chịu trách nhiệm các sự cố do lỗi thành viên hoặc gián đoạn truyền thông

## Điều 7. Nghĩa Vụ Của Thành Viên
- ① Thành viên phải tuân thủ các quy định trong điều khoản, chính sách vận hành, thông báo và pháp luật liên quan, không được làm ảnh hưởng hoặc gây thiệt hại đến trang web
- ② Không được chuyển quyền sử dụng dịch vụ hoặc địa vị hợp đồng cho người khác mà không có sự đồng ý của Trang Web
- ③ Thành viên phải bảo mật ID và mật khẩu, không được cung cấp cho bên thứ ba khi chưa có đồng ý
- ④ Không được xâm phạm quyền sở hữu trí tuệ hoặc quyền khác của người vận hành hoặc bên thứ ba

## Điều 8. Thời Gian Sử Dụng Dịch Vụ
- ① Dịch vụ được cung cấp 24/7 trừ khi có sự cố hoặc bảo trì; thời gian bảo trì sẽ được thông báo trước
- ② Dịch vụ có thể bị gián đoạn đột xuất mà không thông báo trước trong các trường hợp:
  - Kiểm tra, nâng cấp hệ thống khẩn cấp
  - Tình trạng khẩn cấp quốc gia, thiên tai, mất điện
  - Đóng dịch vụ của nhà cung cấp viễn thông
  - Tình trạng quá tải gây gián đoạn dịch vụ
- ③ Trong trường hợp gián đoạn theo khoản trên, Trang Web sẽ thông báo cho thành viên; nếu không thể thông báo trước vì lý do khách quan thì sẽ thông báo sau

## Điều 9. Rút Khỏi Thành Viên và Mất Tư Cách
- ① Thành viên có thể yêu cầu hủy hợp đồng bất cứ lúc nào; công ty sẽ xử lý theo quy định pháp luật
- ② Công ty có quyền hủy hợp đồng hoặc đình chỉ dịch vụ mà không cần thông báo trong các trường hợp sau:
  - Sử dụng dịch vụ trái mục đích gây ảnh hưởng xã hội
  - Cung cấp thông tin sai khi đăng ký
  - Gây trở ngại hoặc chiếm đoạt thông tin người khác
  - Vi phạm pháp luật hoặc quy định trong điều khoản gây tổn hại uy tín
  - Các hành vi khác làm tổn hại uy tín dịch vụ
  - Vi phạm điều kiện sử dụng do công ty quy định

## Điều 10. Giới Hạn Sử Dụng Dịch Vụ
Thành viên không được thực hiện các hành vi sau và công ty có quyền hạn chế, đình chỉ hoặc hủy hợp đồng nếu phát hiện:
- ① Khai báo thông tin sai khi đăng ký hoặc chỉnh sửa
- ② Phá hoại hoặc chiếm đoạt dịch vụ người khác
- ③ Giả mạo nhân viên hoặc người liên quan của Trang Web
- ④ Xâm phạm quyền nhân cách hoặc sở hữu trí tuệ người khác
- ⑤ Sử dụng ID người khác trái phép
- ⑥ Thu thập, lưu trữ, công khai thông tin cá nhân người khác không đồng ý
- ⑦ Hành vi bị đánh giá liên quan đến tội phạm
- ⑧ Các hành vi vi phạm pháp luật khác

## Điều 11. Quản Lý Bài Viết
- ① Bài viết gồm hình ảnh, văn bản, video, âm thanh do thành viên đăng trên trang web
- ② Công ty không chịu trách nhiệm các thiệt hại do bài viết gây ra, trừ khi có cố ý hoặc sơ suất lớn
- ③ Thành viên không được đăng nội dung vi phạm trật tự công cộng, quyền sở hữu trí tuệ hoặc quyền khác của người khác
- ④ Công ty có quyền xoá nội dung vi phạm mà không cần đồng ý thành viên trong các trường hợp: làm tổn hại danh dự, xúc phạm người khác; nội dung tục tĩu/đồi trụy; nội dung chính trị/tôn giáo không phù hợp; nội dung liên quan tội phạm; vi phạm quyền sở hữu trí tuệ và quyền khác; vi phạm quy định pháp luật hoặc quy định công ty
- ⑤ Công ty có thể xoá hoặc di chuyển bài viết theo yêu cầu của cơ quan công quyền mà không cần đồng ý thành viên

## Điều 12. Quyền Sở Hữu Bài Viết
- ① Bản quyền các tác phẩm do công ty tạo ra thuộc về công ty
- ② Bản quyền bài viết do thành viên đăng thuộc về tác giả
- ③ Bài viết có thể được chỉnh sửa, sao chép hoặc biên tập trong phạm vi cần thiết để hiển thị trên kết quả tìm kiếm, dịch vụ hoặc quảng bá; đồng thời tuân thủ luật bản quyền
- ④ Công ty phải xin phép thành viên nếu muốn sử dụng bài viết theo cách khác ngoài mục đích trên

## Điều 13. Bồi Thường Thiệt Hại
- ① Mọi trách nhiệm dân sự, hình sự phát sinh từ việc sử dụng trang web thuộc về thành viên trước tiên
- ② Công ty không chịu trách nhiệm bồi thường khi thiệt hại phát sinh do thiên tai hoặc lỗi cố ý, vô ý của thành viên

## Điều 14. Miễn Trừ Trách Nhiệm
Người vận hành không chịu trách nhiệm trong các trường hợp: thành viên không đạt được lợi ích mong đợi hoặc tổn thất do lựa chọn sử dụng dịch vụ; lỗi do hệ thống dịch vụ/nhà cung cấp viễn thông/các sự cố khách quan khác; dữ liệu do thành viên đăng tải; hoạt động giữa thành viên hoặc với bên thứ ba; độ xác thực/độ tin cậy của dữ liệu; giao dịch hàng hóa; tranh chấp do lỗi người dùng; virus hoặc nguyên nhân bất khả kháng.

## Điều 15. Giải Quyết Tranh Chấp
- ① Công ty và thành viên phải nỗ lực giải quyết tranh chấp phát sinh liên quan đến dịch vụ một cách hoà bình
- ② Mọi tranh chấp đều áp dụng luật pháp Hàn Quốc
- ③ Tòa án giải quyết tranh chấp là tòa án theo luật tố tụng dân sự Hàn Quốc
- ④ Trường hợp thành viên có địa chỉ ở nước ngoài, tòa án có thẩm quyền là Tòa án Trung tâm Seoul, Hàn Quốc
`;

const Terms = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const { text: translated } = useAutoTranslate(TERMS_MD_VI, { sourceLanguage: "vi" });

  const md = useMemo(() => {
    // Vietnamese is the canonical legal text in this project.
    return i18n.language === "vi" ? TERMS_MD_VI : translated;
  }, [i18n.language, translated]);

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
        </article>
      </main>

      <AppFooter />
    </div>
  );
};

export default Terms;
