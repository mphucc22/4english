# Kế hoạch kiểm thử ABC English 2.1

## Mục tiêu và phạm vi

Kiểm tra lỗi đã nêu trong báo cáo gốc, luồng đào tạo DT06, công nợ và các thay đổi kiến trúc/giao diện. Bản mới chạy React–Node–SQLite; dữ liệu mẫu dùng cho bài tập. Các định mức là giả định ở QUY_TAC_CAN_XAC_NHAN.md.

Trong phạm vi: đăng nhập/đăng xuất/đổi mật khẩu và phân quyền; CRUD có tham chiếu; lớp/lịch/ghi danh; thu phí/công nợ; duyệt hoặc từ chối bảo lưu/chuyển lớp/học bù; lịch sử điểm danh; hết hạn giữ chỗ; hủy/hoàn; hai phiên cùng sửa; lỗi ghi; backup/restore; public tư vấn; responsive.

Ngoài phạm vi: thực chuyển tiền qua ngân hàng, Google OAuth, mua hàng/giỏ hàng (thuộc đề OSS khác); kiểm thử tải lớn, trung tâm thật, pháp lý dữ liệu thật; payroll/chấm điểm/miễn giảm; triển khai Internet/HTTPS. Không mô phỏng các phần đó thành kết quả Passed.

## Mức kiểm thử và công cụ

| Mức                 | Công cụ                                        | Dữ liệu                                         |
| ------------------- | ---------------------------------------------- | ----------------------------------------------- |
| Nghiệp vụ           | Node, assertions; 23 ca cũ + rules.test.js     | Seed.minimal và fixture tách biệt               |
| Tích hợp API/SQLite | node:test, fetch, SQLite thật                  | File SQLite tạm, từng phiên cookie              |
| Khởi động dev/proxy | Tiến trình Node chạy scripts/dev.js, HTTP thật | CSDL/cổng tạm                                   |
| Giao diện hệ thống  | Playwright, Chromium thật                      | React production build + backend thật, CSDL tạm |
| Kiểm tra thị giác   | Ảnh public/admin desktop/mobile                | 1440 px và 390 px                               |

## Phân công mẫu cho nhóm

Chưa có tên thành viên và ngày nộp thật nên đây là khung để nhóm điền, không phải nhật ký đã thực hiện.

| Vai trò                | Nhiệm vụ                                                     | Đầu ra                                         |
| ---------------------- | ------------------------------------------------------------ | ---------------------------------------------- |
| Trưởng nhóm            | Chốt quy tắc với cô, quản lý yêu cầu/bug, quyết định phạm vi | Quy tắc được duyệt, kế hoạch, liên kết yêu cầu |
| Kiểm thử nghiệp vụ     | Lớp/ghi danh/bảo lưu/chuyển/học bù, biên và rollback         | Test case và bằng chứng                        |
| Kiểm thử API/tài chính | Quyền, phiên, công nợ, hoàn/hủy, xung đột/lưu lỗi            | Log API/bug và ca hồi quy                      |
| Kiểm thử UI            | Vai trò, form, bàn phím, desktop/mobile, nhập liệu           | Ảnh, video/bước tái hiện, kết quả thực tế      |

Nhóm 3 người gộp nhiệm vụ API/tài chính với trưởng nhóm hoặc kiểm thử nghiệp vụ. Tạo Jira/điền template riêng khi môn kiểm thử yêu cầu; gói này không tạo Jira hay mời thành viên thay nhóm.

## Điều kiện chạy, dừng và hoàn tất

- Vào kiểm thử: npm ci hoàn tất, có build, xác định chính sách áp dụng, không dùng dữ liệu học viên thật.
- Tạm dừng: backend không khởi động, lỗi mất dữ liệu/chứng từ, lỗi tài chính sai số chưa biết nguyên nhân, build lỗi; giữ log và bản sao lưu trước sửa.
- Tiếp tục: sửa nguyên nhân, ca tái hiện đạt và kiểm thử các luồng ảnh hưởng.
- Hoàn tất: các ca tự động hiện có Passed; build đạt; kiểm tra desktop/mobile; ghi rõ phần chưa kiểm tra, quy tắc chưa được duyệt và hạn chế môi trường.

## Bàn giao

Mã nguồn, package-lock, hướng dẫn chạy, kiểm thử chạy được, kết quả thực thi, ảnh chụp, bảng đối chiếu lỗi và giả định. CSDL làm việc không đi cùng ZIP; tự tạo dữ liệu mẫu khi khởi động.

Test case bổ sung trước buổi bảo vệ: chạy trên máy Windows của nhóm; kiểm tra Edge/Chrome có cỡ chữ hoặc mức zoom khác; chạy demo đồng thời từ hai máy LAN; xác nhận chính sách phí/hết hạn với cô và cập nhật ca tương ứng. Đây là ca đề nghị/chưa được xác nhận, không gán Passed.

## Hồi quy bổ sung bản 2.1

- API14: hai phiên cùng revision, phiên thứ nhất sửa học viên; reset từ phiên cũ nhận 409 và không xóa học viên mới.
- API15: JSON null/mảng/primitive, backup thiếu db; nhận 422, dữ liệu không thay đổi.
- API16: tám lần đăng nhập sai cùng username đã chuẩn hóa; lần tiếp theo nhận 429 dù đổi khoảng trắng/hoa-thường.
- UI20: backend đã commit khoản thu nhưng trình duyệt không nhận phản hồi; đóng form, polling, gửi lại cùng nội dung chỉ còn một phiếu.
- UI21: giữ phản hồi polling thật, lưu học viên rồi trả phản hồi cũ; học viên mới vẫn trên màn hình.
- UI22: trì hoãn polling trước đăng nhập và đăng xuất; không đảo trạng thái tài khoản.
- UI23: làm thất bại request polling, kiểm tra thông báo trên mobile rồi kết nối lại tới API thật.

Network fixture dùng Playwright giữ/abort phản hồi của backend thật để tái hiện lỗi; không thay bằng dữ liệu giả. Tham khảo BO_SUNG_V2.1.md và kết quả thực thi trong test-results.
