# Báo cáo kiểm thử giao diện 4ENGLISH

## Lượt cập nhật 06/11/2026

Chrome 156.0.8078.81 headless trên Windows: **51/51 ca trình duyệt đạt**, **133 lượt màn hình** trong ma trận. Build thành công; bộ nghiệp vụ/API/logic đạt **150/150** (23 ca gốc + 127 ca Node). Chi tiết phạm vi, bản đồ Google thật và bằng chứng ở [báo cáo kiểm thử mới nhất](BAO_CAO_KIEM_THU.md#cập-nhật-website-và-google-maps--06112026).

Trang cơ sở, tư vấn giữ đúng lớp, bài luyện, URL công khai và metadata được kiểm tra ở UI41–UI44; chuyển động ở UI45; lớp ngừng nhận đăng ký khi form đang mở ở UI46; chế độ vận hành và thông tin liên hệ ở UI47. Bản đồ thật được xác minh riêng, các ca GUI thông thường chặn mạng Google để tránh phụ thuộc dịch vụ ngoài.

## Lượt 18/10/2026 — thông tin lịch sử

Thực hiện lúc **18/10/2026 23:36:08 (giờ Việt Nam)**. Trình duyệt thực thi: **Chromium 141.0.7390.37**, chế độ headless trên Linux; Node.js 24.19.0, Playwright 1.63.0.

## Kết quả

| Nhóm kiểm tra | Kết quả |
| --- | --- |
| Build giao diện | Thành công |
| Ca quy tắc nghiệp vụ | 23/23 đạt |
| Ca Node/API/logic | 43/43 đạt |
| Ca GUI trên trình duyệt thật | 44/44 đạt |
| Lượt kiểm tra màn hình được ghi nhận trong ma trận | 115 |

GUI được thao tác qua trình duyệt với **API và SQLite thật của ứng dụng**, trên cơ sở dữ liệu tạm riêng. Không giả phản hồi API để thay cho thao tác nghiệp vụ, trừ các ca cố ý mô phỏng mất mạng/phản hồi chậm. Bản xem trước trực tuyến dùng dữ liệu mẫu và không phải máy chủ dùng cho các kiểm tra nghiệp vụ này.

## Phạm vi màn hình quản lý

Mỗi màn hình trong ma trận được kiểm tra ở **1440, 768 và 390 px**. Đây là 5 tài khoản thuộc 4 vai trò; hai tài khoản giáo viên được kiểm tra riêng.

| Tài khoản mẫu | Vai trò | Màn hình | Lượt kiểm tra |
| --- | --- | --- | --- |
| `quanly` | Quản lý | 13 màn hình và chi tiết 6 lớp | 57 |
| `ghidanh` | Ghi danh | 7 màn hình được phân quyền | 21 |
| `ketoan` | Kế toán | 5 màn hình được phân quyền | 15 |
| `gv1` | Giáo viên 1 | Tổng quan, thời khóa biểu, điểm danh | 9 |
| `gv2` | Giáo viên 2 | Tổng quan, thời khóa biểu, điểm danh | 9 |

Trang công khai được kiểm tra thêm ở **320, 390, 768 và 1440 px**, đưa tổng ma trận lên 115 lượt. Ma trận cũng kiểm tra tràn ngang và lỗi JavaScript trong các ca GUI.

Các màn hình quản lý gồm: tổng quan, lớp học, thời khóa biểu, học viên, đăng ký học, học phí, yêu cầu học tập, điểm danh, nhân viên, danh mục, tư vấn, báo cáo và hệ thống. Chi tiết cả 6 lớp và 5 tab danh mục cũng được mở kiểm tra.

## Các luồng đã chạy

- Đăng nhập sai/đúng, đăng nhập 5 tài khoản, đăng xuất, phân quyền, đổi mật khẩu và hiện/ẩn mật khẩu.
- Thêm/sửa/xóa học viên; hủy hộp thoại không ghi dữ liệu; thao tác bàn phím Tab, Shift+Tab và Escape trong hộp thoại.
- Tạo lớp, xếp lịch, mở đăng ký, ghi danh, thu phí, hủy lớp và xử lý công nợ.
- Bảo lưu, học lại, chuyển lớp, học bù, duyệt/từ chối yêu cầu, điểm danh và đổi buổi học.
- Hủy đăng ký, hoàn số dư và hủy phiếu thu có lưu lịch sử.
- Sao lưu/khôi phục JSON; hai tab ghi đồng thời; phản hồi cũ; mất kết nối và gửi lại giao dịch không lập trùng phiếu.
- Tìm/lọc khóa học, lọc cơ sở, xem chi tiết 6 khóa, xử lý khóa không tồn tại và danh sách rỗng.
- Nút tư vấn chọn đúng khóa; gửi tư vấn qua API; nhân viên đổi trạng thái và tải lại vẫn giữ dữ liệu.
- Giảng viên đang dạy hiển thị đúng; giảng viên nghỉ và thông tin liên hệ cá nhân không được công khai.
- Menu điện thoại, đóng bằng Escape, liên kết bỏ qua điều hướng và mở/đóng FAQ.
- Bài thử đầu vào: câu bỏ trống, quay lại sửa đáp án, điểm 0/10, điểm 10/10, mục tiêu IELTS, đáp án/giải thích, gợi ý khóa, làm lại và sử dụng trên màn hình 320 px.
- Thanh điều hướng không che phần đầu câu hỏi/kết quả bài thử sau khi cuộn.
- Điều hướng tuần của thời khóa biểu, lọc cơ sở và nút in báo cáo. Chế độ in ẩn điều hướng và tạo được dữ liệu PDF.

## Bằng chứng và cách chạy lại

- `test-results/browser-results.json`: kết quả thực thi từng ca và toàn bộ ma trận màn hình.
- `test-results/GUI_V2_Cases.csv`: danh sách 44 ca GUI.
- `test-results/GUI_V2_ScreenCoverage.csv`: 115 lượt mở màn hình.
- `test-results/gui-v2-summary.json`: tổng hợp kiểm tra bản giao diện này.
- `test-results/01-public-desktop.png` đến `11-placement-desktop.png`: ảnh kiểm tra tiêu biểu.

```powershell
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

Nếu dùng Chromium đã cài riêng, biến `CHROMIUM_PATH` cho phép chỉ định tệp thực thi. Lượt kiểm tra này dùng Chromium Headless Shell 141.0.7390.37; không thay đổi phiên bản dependency của dự án.

## Giới hạn thực tế

Chưa kiểm tra trên Safari/iPhone thật hoặc Chrome/Edge trên Windows. Kiểm tra màn hình nhỏ là thay đổi viewport trong Chromium, không thay thế hoàn toàn thiết bị cảm ứng thật. Kiểm tra in xác nhận thao tác gọi hàm in, kiểu hiển thị khi in và tạo PDF; không vận hành hộp thoại máy in của Windows. Các ca đạt xác nhận phạm vi đã mô tả, không phải bảo đảm mọi dữ liệu đầu vào hoặc mọi trình duyệt đều không thể gặp lỗi.
