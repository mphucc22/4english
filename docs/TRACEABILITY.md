# Liên kết yêu cầu – kiểm thử

Mã FR/BR ở bảng này là mã nội bộ của bản sửa. Nhóm đối chiếu với mã chính thức trong sheet/template của cô trước khi nộp. Một ca có thể kiểm tra nhiều assert hoặc bước; số ca không phải số chức năng.

| Yêu cầu                                         | Ca nghiệp vụ/API            | Ca Chromium                                   |
| ----------------------------------------------- | --------------------------- | --------------------------------------------- |
| FR-01 Đăng nhập, phiên, đăng xuất               | API02, API03, API11, API16  | UI02, UI22                                    |
| FR-02 Vai trò, quyền và tài khoản               | NFR-01, FR-13, API03/04/12  | P-quanly/P-ghidanh/P-ketoan/P-gv1, UI03, UI07 |
| FR-03 Đổi mật khẩu                              | API11                       | UI17                                          |
| FR-04 Danh mục/học viên hợp lệ                  | B18/B19, API08              | UI04                                          |
| FR-05 Tạo/sửa/xóa lớp                           | FR-12, B10                  | UI05                                          |
| BR-01 Đủ sĩ số xác nhận mở                      | BR-01, BR-02                | UI05 (mở đăng ký, chưa xác nhận khai giảng)   |
| BR-02 Lịch phòng/giáo viên/học viên             | BR-03, BR-04, B02, B12, C05 | UI05, UI10                                    |
| FR-06 Ghi danh/chỗ chờ phí                      | B06, C01, BR-02             | UI05                                          |
| FR-07 Thu phí và công nợ độc lập trạng thái học | FR-10, B03/B04, API06/07    | UI06, UI20                                    |
| FR-08 Bảo lưu/học lại                           | BR-05/06, B11, C02          | UI09                                          |
| FR-09 Chuyển lớp có revalidate/rollback         | BR-07/08, B06               | UI09                                          |
| FR-10 Học bù/biên/trùng lịch                    | BR-09, B07/B08              | UI14                                          |
| FR-11 Điểm danh đúng vai trò/lịch sử            | FR-11, B05/B09              | UI10, UI14                                    |
| FR-12 Kết thúc lớp hợp lệ                       | B03/B04                     | UI06 (fixture kết thúc để kiểm tra thu nợ)    |
| FR-13 Hủy đăng ký/hoàn/hủy phiếu                | C03/C04                     | UI15/UI16                                     |
| FR-14 Báo cáo thu ngoài/công nợ                 | B03/B04, BR-08              | P-quanly/P-ketoan                             |
| FR-15 Tư vấn public                             | API10                       | UI08                                          |
| NFR-01 Dữ liệu dùng chung/xung đột              | API05/06/09                 | UI11, UI21, UI22, UI23                        |
| NFR-02 Đầu vào và sai cấu trúc                  | B12, B18/B19, API08/10/15   | UI04/UI13                                     |
| NFR-03 Sao lưu/khôi phục/audit                  | API08, API13/14/15          | UI12, P-quanly                                |
| NFR-04 Khởi động/đóng gói                       | DEV01, npm run build        | UI01, tất cả luồng production                 |
| NFR-05 Responsive/màu/icon                      | —                           | UI01/UI03 và ảnh 01–04                        |

Chi tiết bước tự động nằm trong src/lib/tests.js và tests/\*.js. Kết quả thực thi ở test-results và BAO_CAO_KIEM_THU.md. Không dùng test setup trực tiếp chỉnh CSDL làm bằng chứng rằng thao tác đó đã được bấm trên UI: từng ca đã ghi rõ mục đích và fixture trong mã.
