# Quy tắc nghiệp vụ cần giảng viên xác nhận

Các giá trị dưới đây là giả định triển khai cho demo DT06, không phải kết quả phỏng vấn giảng viên. Đề chỉ mô tả các nhóm nghiệp vụ và chưa đưa đầy đủ định mức/công thức.

| Quy tắc                  | Mặc định                                                                  | Vị trí            |
| ------------------------ | ------------------------------------------------------------------------- | ----------------- |
| Tối thiểu mở lớp         | 10 học viên đã xác nhận                                                   | CFG.minStudents   |
| Sĩ số tối đa             | 20, đồng thời không vượt sức chứa phòng                                   | CFG.maxStudents   |
| Ngưỡng xác nhận chỗ      | Đã đóng ít nhất 50% học phí                                               | CFG.minPaidPct    |
| Hạn giữ chỗ chờ phí      | 7 ngày, hết hạn sau ngày holdExpires                                      | CFG.pendingDays   |
| Bảo lưu                  | Đã học không quá 50% số buổi, lớp Đang học                                | CFG.maxReservePct |
| Thời hạn bảo lưu         | 3 tháng; ngày cuối tháng được chốt hợp lệ                                 | CFG.reserveMonths |
| Học bù                   | Tối đa 2 yêu cầu chờ/duyệt mỗi đăng ký; cùng khóa, khác lớp, có buổi Vắng | CFG.maxMakeup     |
| Nhập học muộn            | Chấp nhận khi lớp đã học không quá 2 buổi                                 | CFG.lateJoin      |
| Kết thúc lớp bình thường | Điểm danh đủ tất cả buổi                                                  | finishClass       |

## Công thức học phí đề xuất ở bản 2.0

Học phí đã sử dụng = làm tròn(học phí đăng ký × số buổi đã học trong thời gian đăng ký / tổng số buổi của lớp).

Học phí có thể chuyển/bảo lưu/hủy trả số dư = max(0, đã đóng − học phí đã sử dụng).

Ví dụ học phí 3.600.000, đã đóng 1.800.000, lớp học 12/24 buổi: đã sử dụng 1.800.000, tín dụng còn lại 0. Khi đã đóng đủ 3.600.000 và học 6/24 buổi, tín dụng còn 2.700.000. Buổi vắng của lớp vẫn tính là dịch vụ đã thực hiện; học bù là quyền hỗ trợ riêng.

Sau chuyển/bảo lưu/hủy, học phí phải thu của đăng ký gốc được chốt bằng phần đã sử dụng. Nếu đã đóng ít hơn phần này thì vẫn thu được khoản thiếu. Lớp mới tính học phí khóa mới, nhận tín dụng chưa sử dụng; dư vượt phí lớp mới vào số dư học viên. Không cộng khoản chuyển nội bộ vào tiền thu ngoài.

Khi hủy lớp chưa khai giảng, trả toàn bộ khoản đã đóng vào số dư. Khi hết hạn giữ chỗ cá nhân, trả phần chưa sử dụng. Quản lý hoàn tiền từ số dư có lý do/chứng từ. Phiếu bảo lưu hết hạn không tự biến thành tiền mặt/số dư: cần hỏi chính sách hoàn phí khi quá hạn.

Đây là thay đổi so với cách tính cũ `đã đóng × tỷ lệ buổi còn lại` và chuyển toàn bộ tiền dù đã học. Nếu cô chọn chính sách khác, chỉnh dịch vụ `R.consumed` và các ca C02/BR-05/BR-08 tương ứng trước khi demo. Chưa có luồng đóng lớp sớm hoặc miễn/giảm học phí thủ công; tránh ghi nhận hoàn thành khi chưa đủ buổi.

## Ranh giới ngày và lịch sử

Ngày nghiệp vụ dùng múi giờ Việt Nam trên máy chủ. Thời gian đăng ký có ngày bắt đầu/ngày đóng; lịch sử điểm danh đã ghi luôn được giữ. Người ghi danh sau buổi học không được thêm vào roster quá khứ. Khi đóng đăng ký, hủy các yêu cầu đang chờ và buổi học bù tương lai chưa thực hiện của đăng ký đó. Yêu cầu đã học và điểm danh cũ vẫn giữ.

Hạn giữ chỗ được quét mỗi khi API đọc/ghi. Nếu máy chủ tắt, lần truy cập tiếp theo xử lý các đăng ký quá hạn; không yêu cầu một tiến trình chạy nền trên máy tắt. Khi thành viên mở form lâu và dữ liệu thay đổi, máy chủ từ chối bản cũ để tránh ghi đè.
