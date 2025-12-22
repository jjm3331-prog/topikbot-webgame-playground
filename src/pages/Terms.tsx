import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MegaMenu from "@/components/MegaMenu";
import AppFooter from "@/components/AppFooter";

const Terms = () => {
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
          <h1 className="font-heading text-4xl font-bold mb-8">Điều Khoản Sử Dụng (Terms of Use)</h1>
          
          <p className="text-muted-foreground text-lg mb-8">
            Cập nhật lần cuối: Tháng 1, 2025
          </p>

          {/* Điều 1 */}
          <section className="mb-8">
            <h2 className="font-heading text-2xl font-bold mb-4">Điều 1. Mục Đích</h2>
            <p className="text-muted-foreground leading-relaxed">
              Điều khoản sử dụng này có mục đích quy định các điều kiện và quy tắc vận hành dịch vụ của "LUKATO AI" (sau đây gọi là "Trang Web"). Bằng việc truy cập hoặc sử dụng dịch vụ, người sử dụng, dù đã đăng ký hay không, đồng ý đã đọc, hiểu và chịu sự ràng buộc bởi các điều khoản này.
            </p>
          </section>

          {/* Điều 2 */}
          <section className="mb-8">
            <h2 className="font-heading text-2xl font-bold mb-4">Điều 2. Định Nghĩa Thuật Ngữ</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Các thuật ngữ chính được sử dụng trong điều khoản này được định nghĩa như sau:
            </p>
            <ul className="list-none space-y-3 text-muted-foreground">
              <li>① "Dịch vụ" là các dịch vụ mà thành viên có thể sử dụng trên Trang Web, bất kể thiết bị đầu cuối (PC, thiết bị di động có dây hoặc không dây, v.v.)</li>
              <li>② "Người sử dụng" là các thành viên và không thành viên truy cập và sử dụng dịch vụ theo điều khoản này</li>
              <li>③ "Thành viên" là khách hàng đã đăng ký, ký kết hợp đồng sử dụng dịch vụ với công ty và sử dụng dịch vụ do công ty cung cấp</li>
              <li>④ "Không thành viên" là người sử dụng dịch vụ mà không đăng ký thành viên</li>
              <li>⑤ "Hợp đồng sử dụng" là hợp đồng ký kết giữa Trang Web và thành viên liên quan đến việc sử dụng dịch vụ</li>
              <li>⑥ "ID thành viên" là chuỗi ký tự và số duy nhất được cung cấp để nhận diện và sử dụng dịch vụ</li>
              <li>⑦ "Mật khẩu" là ký tự, số hoặc kết hợp do thành viên tự thiết lập để xác nhận và bảo mật tài khoản</li>
              <li>⑧ "Người vận hành" là người mở và quản lý trang web dịch vụ</li>
              <li>⑨ "Chấm dứt" là việc thành viên hủy bỏ hợp đồng sử dụng</li>
            </ul>
          </section>

          {/* Điều 3 */}
          <section className="mb-8">
            <h2 className="font-heading text-2xl font-bold mb-4">Điều 3. Quy Định Ngoài Điều Khoản</h2>
            <p className="text-muted-foreground leading-relaxed">
              Người vận hành có thể ban hành thêm các chính sách vận hành khi cần thiết và trong trường hợp có sự chồng lấn giữa chính sách này và điều khoản vận hành, chính sách vận hành được ưu tiên áp dụng.
            </p>
          </section>

          {/* Điều 4 */}
          <section className="mb-8">
            <h2 className="font-heading text-2xl font-bold mb-4">Điều 4. Ký Kết Hợp Đồng Sử Dụng</h2>
            <ul className="list-none space-y-3 text-muted-foreground">
              <li>① Hợp đồng sử dụng được hình thành khi người đăng ký làm thành viên đồng ý với điều khoản này và được người vận hành chấp thuận</li>
              <li>② Người muốn đăng ký làm thành viên đồng ý với các điều khoản khi hoàn tất đăng ký sử dụng dịch vụ trên Trang Web</li>
            </ul>
          </section>

          {/* Điều 5 */}
          <section className="mb-8">
            <h2 className="font-heading text-2xl font-bold mb-4">Điều 5. Đăng Ký Thành Viên</h2>
            <ul className="list-none space-y-3 text-muted-foreground">
              <li>① Người sử dụng có thể đăng ký thành viên miễn phí bằng cách điền thông tin theo mẫu do công ty cung cấp và đồng ý với các điều khoản</li>
              <li>② Tất cả thông tin thành viên ghi trong mẫu đăng ký phải là thông tin thật và chính xác; người cung cấp thông tin sai có thể không được bảo vệ pháp luật và bị xử lý theo quy định</li>
              <li>③ Hợp đồng sử dụng hình thành khi công ty chấp nhận đơn đăng ký; công ty có quyền từ chối hoặc hủy bỏ hợp đồng trong các trường hợp:
                <ul className="list-disc ml-8 mt-2 space-y-1">
                  <li>Người đăng ký từng mất tư cách thành viên theo điều khoản này, trừ trường hợp được chấp thuận tái đăng ký</li>
                  <li>Khai báo thông tin sai hoặc không đầy đủ theo yêu cầu công ty</li>
                  <li>Các trường hợp do lỗi của người sử dụng hoặc vi phạm quy định khác</li>
                </ul>
              </li>
              <li>④ Thành viên phải cập nhật thông tin khi có thay đổi trong thời gian hợp lý</li>
            </ul>
          </section>

          {/* Điều 6 */}
          <section className="mb-8">
            <h2 className="font-heading text-2xl font-bold mb-4">Điều 6. Nghĩa Vụ Của Công Ty</h2>
            <ul className="list-none space-y-3 text-muted-foreground">
              <li>① Công ty phải giải quyết nhanh chóng các khiếu nại hợp lý của thành viên; trong trường hợp khó khăn vì lý do cá nhân có thể thông báo sau hoặc liên hệ bằng tin nhắn, email</li>
              <li>② Người vận hành phải đảm bảo sự vận hành ổn định và nhanh chóng khắc phục sự cố liên quan đến trang web. Tuy nhiên, trong trường hợp thiên tai hoặc lý do bất khả kháng, có thể tạm đình chỉ dịch vụ</li>
              <li>③ Công ty không chịu trách nhiệm các sự cố do lỗi thành viên hoặc gián đoạn truyền thông</li>
            </ul>
          </section>

          {/* Điều 7 */}
          <section className="mb-8">
            <h2 className="font-heading text-2xl font-bold mb-4">Điều 7. Nghĩa Vụ Của Thành Viên</h2>
            <ul className="list-none space-y-3 text-muted-foreground">
              <li>① Thành viên phải tuân thủ các quy định trong điều khoản, chính sách vận hành, thông báo và pháp luật liên quan, không được làm ảnh hưởng hoặc gây thiệt hại đến trang web</li>
              <li>② Không được chuyển quyền sử dụng dịch vụ hoặc địa vị hợp đồng cho người khác mà không có sự đồng ý của Trang Web</li>
              <li>③ Thành viên phải bảo mật ID và mật khẩu, không được cung cấp cho bên thứ ba khi chưa có đồng ý</li>
              <li>④ Không được xâm phạm quyền sở hữu trí tuệ hoặc quyền khác của người vận hành hoặc bên thứ ba</li>
            </ul>
          </section>

          {/* Điều 8 */}
          <section className="mb-8">
            <h2 className="font-heading text-2xl font-bold mb-4">Điều 8. Thời Gian Sử Dụng Dịch Vụ</h2>
            <ul className="list-none space-y-3 text-muted-foreground">
              <li>① Dịch vụ được cung cấp 24/7 trừ khi có sự cố hoặc bảo trì; thời gian bảo trì sẽ được thông báo trước</li>
              <li>② Dịch vụ có thể bị gián đoạn đột xuất mà không thông báo trước trong các trường hợp:
                <ul className="list-disc ml-8 mt-2 space-y-1">
                  <li>Kiểm tra, nâng cấp hệ thống khẩn cấp</li>
                  <li>Tình trạng khẩn cấp quốc gia, thiên tai, mất điện</li>
                  <li>Đóng dịch vụ của nhà cung cấp viễn thông</li>
                  <li>Tình trạng quá tải gây gián đoạn dịch vụ</li>
                </ul>
              </li>
              <li>③ Trong trường hợp gián đoạn theo khoản trên, Trang Web sẽ thông báo cho thành viên; nếu không thể thông báo trước vì lý do khách quan thì sẽ thông báo sau</li>
            </ul>
          </section>

          {/* Điều 9 */}
          <section className="mb-8">
            <h2 className="font-heading text-2xl font-bold mb-4">Điều 9. Rút Khỏi Thành Viên và Mất Tư Cách</h2>
            <ul className="list-none space-y-3 text-muted-foreground">
              <li>① Thành viên có thể yêu cầu hủy hợp đồng bất cứ lúc nào; công ty sẽ xử lý theo quy định pháp luật</li>
              <li>② Công ty có quyền hủy hợp đồng hoặc đình chỉ dịch vụ mà không cần thông báo trong các trường hợp sau:
                <ul className="list-disc ml-8 mt-2 space-y-1">
                  <li>Sử dụng dịch vụ trái mục đích gây ảnh hưởng xã hội</li>
                  <li>Cung cấp thông tin sai khi đăng ký</li>
                  <li>Gây trở ngại hoặc chiếm đoạt thông tin người khác</li>
                  <li>Vi phạm pháp luật hoặc quy định trong điều khoản gây tổn hại uy tín</li>
                  <li>Các hành vi khác làm tổn hại uy tín dịch vụ</li>
                  <li>Vi phạm điều kiện sử dụng do công ty quy định</li>
                </ul>
              </li>
            </ul>
          </section>

          {/* Điều 10 */}
          <section className="mb-8">
            <h2 className="font-heading text-2xl font-bold mb-4">Điều 10. Giới Hạn Sử Dụng Dịch Vụ</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Thành viên không được thực hiện các hành vi sau và công ty có quyền hạn chế, đình chỉ hoặc hủy hợp đồng nếu phát hiện:
            </p>
            <ul className="list-none space-y-3 text-muted-foreground">
              <li>① Khai báo thông tin sai khi đăng ký hoặc chỉnh sửa</li>
              <li>② Phá hoại hoặc chiếm đoạt dịch vụ người khác</li>
              <li>③ Giả mạo nhân viên hoặc người liên quan của Trang Web</li>
              <li>④ Xâm phạm quyền nhân cách hoặc sở hữu trí tuệ người khác</li>
              <li>⑤ Sử dụng ID người khác trái phép</li>
              <li>⑥ Thu thập, lưu trữ, công khai thông tin cá nhân người khác không đồng ý</li>
              <li>⑦ Hành vi bị đánh giá liên quan đến tội phạm</li>
              <li>⑧ Các hành vi vi phạm pháp luật khác</li>
            </ul>
          </section>

          {/* Điều 11 */}
          <section className="mb-8">
            <h2 className="font-heading text-2xl font-bold mb-4">Điều 11. Quản Lý Bài Viết</h2>
            <ul className="list-none space-y-3 text-muted-foreground">
              <li>① Bài viết gồm hình ảnh, văn bản, video, âm thanh do thành viên đăng trên trang web</li>
              <li>② Công ty không chịu trách nhiệm các thiệt hại do bài viết gây ra, trừ khi có cố ý hoặc sơ suất lớn</li>
              <li>③ Thành viên không được đăng nội dung vi phạm trật tự công cộng, quyền sở hữu trí tuệ hoặc quyền khác của người khác</li>
              <li>④ Công ty có quyền xoá nội dung vi phạm mà không cần đồng ý thành viên trong các trường hợp:
                <ul className="list-disc ml-8 mt-2 space-y-1">
                  <li>Làm tổn hại danh dự, xúc phạm người khác</li>
                  <li>Nội dung tục tĩu, đồi trụy</li>
                  <li>Nội dung chính trị hoặc tôn giáo không phù hợp</li>
                  <li>Nội dung liên quan tội phạm</li>
                  <li>Vi phạm quyền sở hữu trí tuệ và quyền khác</li>
                  <li>Vi phạm quy định pháp luật hoặc quy định công ty</li>
                </ul>
              </li>
              <li>⑤ Công ty có thể xoá hoặc di chuyển bài viết theo yêu cầu của cơ quan công quyền mà không cần đồng ý thành viên</li>
            </ul>
          </section>

          {/* Điều 12 */}
          <section className="mb-8">
            <h2 className="font-heading text-2xl font-bold mb-4">Điều 12. Quyền Sở Hữu Bài Viết</h2>
            <ul className="list-none space-y-3 text-muted-foreground">
              <li>① Bản quyền các tác phẩm do công ty tạo ra thuộc về công ty</li>
              <li>② Bản quyền bài viết do thành viên đăng thuộc về tác giả</li>
              <li>③ Bài viết có thể được chỉnh sửa, sao chép hoặc biên tập trong phạm vi cần thiết để hiển thị trên kết quả tìm kiếm, dịch vụ hoặc quảng bá; đồng thời tuân thủ luật bản quyền</li>
              <li>④ Công ty phải xin phép thành viên nếu muốn sử dụng bài viết theo cách khác ngoài mục đích trên</li>
            </ul>
          </section>

          {/* Điều 13 */}
          <section className="mb-8">
            <h2 className="font-heading text-2xl font-bold mb-4">Điều 13. Bồi Thường Thiệt Hại</h2>
            <ul className="list-none space-y-3 text-muted-foreground">
              <li>① Mọi trách nhiệm dân sự, hình sự phát sinh từ việc sử dụng trang web thuộc về thành viên trước tiên</li>
              <li>② Công ty không chịu trách nhiệm bồi thường khi thiệt hại phát sinh do thiên tai hoặc lỗi cố ý, vô ý của thành viên</li>
            </ul>
          </section>

          {/* Điều 14 */}
          <section className="mb-8">
            <h2 className="font-heading text-2xl font-bold mb-4">Điều 14. Miễn Trừ Trách Nhiệm</h2>
            <ul className="list-none space-y-3 text-muted-foreground">
              <li>① Người vận hành không chịu trách nhiệm nếu thành viên không đạt được lợi ích mong đợi hoặc tổn thất do lựa chọn sử dụng dịch vụ</li>
              <li>② Người vận hành không chịu trách nhiệm khi lỗi do hệ thống dịch vụ, nhà cung cấp viễn thông hoặc các sự cố khách quan khác</li>
              <li>③ Người vận hành không chịu trách nhiệm về dữ liệu do thành viên đăng tải</li>
              <li>④ Người vận hành không chịu trách nhiệm khi lỗi gây ra bởi thành viên</li>
              <li>⑤ Người vận hành không chịu trách nhiệm về các hoạt động giữa thành viên hoặc với bên thứ ba</li>
              <li>⑥ Người vận hành không chịu trách nhiệm về độ xác thực, tin cậy của dữ liệu hoặc tài liệu trên trang web</li>
              <li>⑦ Người vận hành không chịu trách nhiệm về thiệt hại do giao dịch hàng hóa giữa thành viên hoặc với bên thứ ba</li>
              <li>⑧ Người vận hành không chịu trách nhiệm về tranh chấp do lỗi của người dùng</li>
              <li>⑨ Người vận hành không chịu trách nhiệm các thiệt hại do sự cố hệ thống, virus hoặc nguyên nhân bất khả kháng khác</li>
            </ul>
          </section>

          {/* Điều 15 */}
          <section className="mb-8">
            <h2 className="font-heading text-2xl font-bold mb-4">Điều 15. Giải Quyết Tranh Chấp</h2>
            <ul className="list-none space-y-3 text-muted-foreground">
              <li>① Công ty và thành viên phải nỗ lực giải quyết tranh chấp phát sinh liên quan đến dịch vụ một cách hoà bình</li>
              <li>② Mọi tranh chấp đều áp dụng luật pháp Hàn Quốc</li>
              <li>③ Tòa án giải quyết tranh chấp là tòa án theo luật tố tụng dân sự Hàn Quốc</li>
              <li>④ Trường hợp thành viên có địa chỉ ở nước ngoài, tòa án có thẩm quyền là Tòa án Trung tâm Seoul, Hàn Quốc</li>
            </ul>
          </section>
        </div>
      </main>

      <AppFooter />
    </div>
  );
};

export default Terms;