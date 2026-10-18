# Đối chiếu báo cáo gốc và bản 2.0

Báo cáo gốc: ABC-English_Bao-cao-kiem-thu_4840749.md. ID B01–B19 dưới đây là nhóm lỗi, không phải số lần assert thất bại. Kiểm thử của bản mới được viết cho API/SQLite; không gán kết quả mới vào ca localStorage cũ đã thay kiến trúc.

| ID  | Nội dung trong báo cáo                                            | Cách xử lý trong bản mới                                                                                                  | Kiểm chứng           |
| --- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| B01 | Seed trùng lịch theo ngày, có thể trắng trang                     | Lớp A1 đợt sau dùng ca/phòng/giáo viên khác; bootstrap có màn hình lỗi; không reset tự động khi dữ liệu sai               | B01 (365 ngày), UI01 |
| B02 | Sửa lịch bỏ qua lịch học viên                                     | Kiểm tra mọi học viên đang đăng ký trước khi lưu; giữ ID buổi; lịch có lịch sử/yêu cầu dùng điều chỉnh từng buổi          | B02, C05, UI10       |
| B03 | Hoàn thành lớp khóa thu nợ                                        | Tách khoản phải thu khỏi trạng thái đào tạo, cho thu sau Hoàn thành và các đăng ký đóng có billableFee                    | B03/B04, UI06        |
| B04 | Kết thúc khi chưa học buổi nào                                    | Kết thúc bình thường cần đủ buổi điểm danh; quy tắc được ghi là giả định cần cô xác nhận                                  | B03/B04              |
| B05 | Điểm danh lớp chưa khai giảng                                     | Service và danh sách UI chỉ cho Đang học; cho sửa lịch sử Kết thúc                                                        | B05, UI10            |
| B06 | Chuyển lớp vượt quy tắc ghi danh                                  | Dùng chung eligible: active, đủ chỗ, cùng khóa/đợt, trùng lịch; kiểm tra lại lúc duyệt                                    | B06, BR-07, UI09     |
| B07 | Hai lịch học bù trùng nhau                                        | Kiểm tra cả yêu cầu học bù đang chờ/đã duyệt và lịch chính                                                                | B07                  |
| B08 | Buổi vắng bị ẩn do học viên khác                                  | Danh sách used lọc theo enrollmentId; hai học viên có thể xin cùng buổi vắng                                              | B08, UI14            |
| B09 | Lịch sử roster mất sau chuyển/bảo lưu; thêm người mới vào quá khứ | effectiveFrom/effectiveTo và bản ghi attendance giữ lịch sử; đóng đăng ký hủy yêu cầu tương lai chưa học                  | B09, UI09, UI14      |
| B10 | Mã lớp đếm theo số bản ghi nên trùng                              | Bộ đếm tăng theo nhóm trong meta; unique SQLite; giữ mã khi không đổi nhóm                                                | B10                  |
| B11 | Trạng thái hết hạn sửa rồi rollback                               | Trạng thái bảo lưu suy ra từ expires qua reservationStatus; học lại quá hạn bị từ chối mà không giả báo trạng thái đã lưu | B11                  |
| B12 | Service nhận hình thức/giờ/ngày không hợp lệ                      | Enum phương thức, tiền nguyên hữu hạn, ngày/HH:mm/weekday, giới hạn số buổi                                               | B12, API03           |
| B13 | localStorage sai cấu trúc gây trắng trang                         | Bỏ localStorage nghiệp vụ; validate bảng, tham chiếu, mã, dữ liệu khi đọc/khôi phục SQLite; lỗi có màn hình kết nối       | API08, UI13          |
| B14 | Lưu lỗi vẫn báo thành công                                        | Giao dịch SQLite commit trước phản hồi; lỗi ghi rollback; form giữ lỗi                                                    | API07                |
| B15 | Hai tab ghi đè dữ liệu cũ                                         | Action trên dữ liệu mới nhất, kiểm tra revision; polling ngoài dialog; requestId chống lặp phiếu                          | API05, API06, UI11   |
| B16 | Public đọc courses[0] khi rỗng                                    | Empty state, không truy cập phần tử đầu để mô tả số buổi chung                                                            | UI13                 |
| B17 | Kế toán nhấn lớp bị trả về dashboard                              | Cho xem Classes/ClassDetail; service vẫn cấm thay đổi lớp                                                                 | P-ketoan, UI06       |
| B18 | Đổi phòng sang chi nhánh khác làm hỏng lịch                       | CRUD qua service; chặn thuộc tính ảnh hưởng lớp/lịch khi đã được dùng; xóa có kiểm tra tham chiếu                         | B18/B19, API08       |
| B19 | Tên chỉ khoảng trắng được lưu                                     | Chuẩn hóa, kiểm tra trường bắt buộc tại service                                                                           | B18/B19, UI04, API10 |

## Bổ sung

- Hủy từng đăng ký có lý do, sổ số dư và hoàn số dư có chứng từ.
- Hủy phiếu thu sai, giữ chứng từ và cập nhật công nợ.
- Hết hạn giữ chỗ chờ phí, giải phóng chỗ và cộng tiền chưa sử dụng đúng một lần.
- Thu nợ sau khi học viên đóng đăng ký nhưng còn phần đã học phải trả.
- Điều chỉnh từng buổi chưa học, kiểm tra lịch người học bù và lưu lịch sử.
- Tìm/lọc ngày/phân trang sổ phiếu thu; chọn khoảng ngày điểm danh.
- Backend, SQLite, tài khoản băm, phiên thật, phân quyền/CSRF tại máy chủ.
- Sao lưu/khôi phục nghiệp vụ, nhật ký thao tác.
- Tách trang/form và service theo nghiệp vụ; mã được định dạng để nhóm dễ đọc.
- Giao diện navy/teal, nền sáng, SVG icon thống nhất, giảm hiệu ứng; kiểm tra desktop/mobile trên Chromium thật.

Những chính sách tài chính và kết thúc lớp mới phải được giảng viên chấp nhận trước khi nhóm dùng làm quy tắc chính thức. Những chức năng như miễn giảm, đóng lớp sớm, chấm điểm học viên, payroll giáo viên, cổng thanh toán ngân hàng chưa thuộc phạm vi bản này.
