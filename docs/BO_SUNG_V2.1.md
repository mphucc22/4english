# Rà soát tiếp theo — ABC English 2.1

Lượt này giữ kiến trúc/schema và bảng màu của bản 2.0, tập trung lỗi đồng bộ và đầu vào. Các ca mới đã chạy trên baseline trước khi sửa; không chỉ suy luận từ việc đọc mã.

| ID  | Cách tái hiện và kết quả baseline                                                                                                         | Cách sửa                                                                                                              | Kiểm chứng  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------- |
| D01 | Hai phiên cùng revision; tạo học viên rồi reset từ phiên cũ. Baseline trả 200 và xóa cập nhật mới.                                        | Kiểm tra revision trong cùng transaction trước Seed/reset. UI xử lý 409, tải dữ liệu mới và giữ hộp thoại.            | API14       |
| D02 | Gửi JSON null hoặc backup thiếu db. Baseline trả lỗi 500.                                                                                 | Kiểm tra top-level JSON là object, kiểm tra cấu trúc backup trước khi thay users/validate. Trả 422, không lưu.        | API15       |
| D03 | Tám lần thử sai cùng username nhưng đổi khoảng trắng/hoa-thường, lần tiếp theo vẫn 401.                                                   | Dùng một username trim/lowercase cho cả tìm tài khoản và khóa giới hạn. Lần thứ chín nhận 429.                        | API16       |
| D04 | Backend đã ghi khoản thu, client mất phản hồi; đóng form, polling rồi gửi lại cùng nội dung. Baseline tăng từ 26 lên 28 phiếu thay vì 27. | Giữ requestId theo tài khoản/action/args, không đưa revision vào khóa retry; lỗi mạng/500 chưa xác nhận không xóa mã. | UI20, API06 |
| D05 | Giữ phản hồi polling cũ, lưu học viên mới rồi trả phản hồi cũ. Baseline học viên còn trong SQLite nhưng biến mất trên màn hình.           | Không apply snapshot cũ hơn revision hiện tại trong cùng tài khoản.                                                   | UI21        |
| D06 | Polling trước login trả sau login hoặc polling trước logout trả sau logout. Baseline đảo trạng thái màn hình theo dữ liệu phiên cũ.       | Mỗi lần login/logout tăng epoch; bỏ phản hồi polling thuộc epoch trước và tạm ngừng polling khi đang đổi phiên.                                               | UI22        |

Bổ sung UX: polling thất bại hiện thông báo hổ phách rằng dữ liệu có thể chưa cập nhật, kèm nút Kết nối lại. Sau GET thành công thông báo được xóa; UI23 kiểm tra trên màn hình 390 px, không tràn ngang. Giữ navy/teal của public/admin; không đổi tên vai trò hay chính sách học phí.

## Bằng chứng

- Trước sửa: `test-results/before-v2.1/v2.1-before-api.txt` (13 đạt, 3 lỗi mới); `v2.1-before-browser.txt` (0/3 ca mới đạt), kèm ảnh UI20–22.
- Sau sửa toàn bộ: `test-results/unit-api.txt`, `browser.txt`, `browser-results.json`, `TestCase_Results.csv`, `verification-summary.json`.
- Tổng lượt cuối: 23 legacy + 18 hồi quy nghiệp vụ + 16 API + 1 dev = 58; 27 kịch bản Chromium; tổng 85 ca/kịch bản. Seed 365 ngày nằm trong một ca, không cộng vào tổng.
- Các ca mạng giữ/abort request thật với fixture CSDL tạm. Không dùng dữ liệu giả để gán Passed.

## Giới hạn

Chưa kiểm tra trên Windows của người dùng hoặc hai máy LAN thật; không có kết quả tải lớn/Internet/chi tiền thật. Bộ nhớ retry không tồn tại sau reload/đóng tab/logout. Nếu đã rời tab hoặc thay đổi nội dung khoản thu sau lỗi mạng, đối chiếu sổ phiếu trước khi tạo khoản thu mới. Chính sách học phí và các định mức ở QUY_TAC_CAN_XAC_NHAN.md vẫn cần cô duyệt.

## Nâng cấp

Dừng bản 2.0 trước khi sao chép `data/abc-english.sqlite` sang bản 2.1. Schema vẫn là 2, không đổi version trong backup JSON. Hướng dẫn chi tiết nằm trong README.md. Không dùng Khôi phục demo để nâng cấp dữ liệu làm việc.
