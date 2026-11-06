# Thay đổi của bản 2.1

## 06/11/2026 — Website 4ENGLISH và trang cơ sở

- Trang riêng từng cơ sở, Google Maps và chỉ đường lấy từ địa chỉ đang lưu; có trường giờ hoạt động và URL nhúng ghim chính xác, chỉ quản trị toàn hệ thống sửa.
- Tư vấn giữ khóa/cơ sở/lớp, giờ liên hệ và ảnh chụp thông tin lớp; biên nhận ngay trong form. Lớp ngừng nhận đăng ký trong lúc điền form sẽ được cảnh báo và chặn gửi đến khi khách chọn lại.
- Lộ trình, mục tiêu tham khảo, bài luyện tương tác và tài liệu tải về cho sáu chương trình; không thêm cam kết/giáo trình chưa xác nhận.
- Trang liên hệ, quyền riêng tư, hướng dẫn đăng ký; chế độ vận hành ẩn tài khoản mẫu và chặn reset demo ở máy chủ.
- Ảnh không có người; WebP responsive giảm khoảng 92% dung lượng ảnh hero. Tạm dừng/giảm chuyển động và ngừng hiệu ứng nền khi ra ngoài màn hình.
- URL công khai, metadata riêng từ server/client, Open Graph, canonical, robots và sitemap. Giữ tương thích liên kết hash cũ, sửa base tài nguyên để refresh URL sâu hoạt động.
- Hướng dẫn cấu hình: `docs/GIAO_DIEN_MOI.md`; biến môi trường mẫu: `.env.production.example`.

## Các thay đổi trước đó

- Chặn reset demo từ revision cũ; khôi phục có xung đột tải dữ liệu mới và giữ dialog để người dùng kiểm tra.
- Giữ requestId của thao tác chưa xác nhận theo tài khoản/nội dung, độc lập revision; retry sau polling không tạo thêm phiếu thu.
- Không nhận snapshot polling cũ hơn revision hiện có; bỏ phản hồi polling thuộc lần đăng nhập/đăng xuất trước và tạm ngừng polling trong lúc đổi phiên.
- Từ chối JSON null/mảng/primitive và backup thiếu db bằng lỗi đầu vào 422, không lỗi máy chủ 500.
- Chuẩn hóa tên đăng nhập giống nhau khi tìm tài khoản và đếm lần thử, tránh tách giới hạn bằng khoảng trắng/hoa-thường.
- Thông báo mất đồng bộ và nút kết nối lại, responsive theo bảng màu chung.
- Thêm 3 ca API và 4 kịch bản Chromium, lưu bằng chứng tái hiện trước khi sửa, cập nhật hướng dẫn nâng cấp giữ CSDL.

Giữ nguyên schema SQLite 2 và định dạng sao lưu ABC-English-v2. Kết quả thực thi và giới hạn ở BAO_CAO_KIEM_THU.md. Không tự nhập dữ liệu localStorage cũ.

# Thay đổi của bản 2.0

- Sửa 19 nhóm vấn đề trong báo cáo gốc; xem DOI_CHIEU_LOI.md.
- Chuyển localStorage và tài khoản mật khẩu rõ sang backend Node + SQLite, phiên cookie và scrypt.
- Tạo mã giao dịch bằng getRandomValues để demo HTTP qua IP mạng LAN vẫn lưu và hiện thông báo được.
- Đồng bộ dữ liệu nhiều tab/tài khoản bằng một máy chủ; chống ghi đè và gửi lặp khoản thu.
- Hoàn thiện các luồng công nợ sau hoàn thành, roster lịch sử, chuyển/bảo lưu/học bù, hết hạn giữ chỗ.
- Thêm hủy cá nhân, sổ số dư, ghi hoàn tiền, hủy phiếu sai, điều chỉnh từng buổi, backup/restore/audit.
- Tách trang React, form và dịch vụ nghiệp vụ; định dạng mã để dễ phân công.
- Dùng một hệ màu navy/teal và icon SVG chung cho public/login/admin; bỏ hiệu ứng nhiều màu, emoji điều hướng và lời chứng thực mẫu chưa có căn cứ.
- Viết lại hướng dẫn chạy, kế hoạch/traceability và tài liệu các giả định. Bỏ PDF hướng dẫn cũ do mô tả localStorage không còn đúng.

Bản gốc được giữ riêng để đối chiếu. ZIP mới tạo dữ liệu mẫu trong SQLite khi chạy lần đầu; không tự nhập dữ liệu localStorage cũ và không chứa dữ liệu làm việc thật.
