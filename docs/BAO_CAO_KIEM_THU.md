# Báo cáo kiểm thử 4ENGLISH 2.1

## Cập nhật website và Google Maps — 06/11/2026

Lượt trình duyệt cuối hoàn tất lúc **19:59:11 ngày 06/11/2026 (giờ Việt Nam)**, Chrome **156.0.8078.81** headless trên Windows, Node.js 24.15.0. Kiểm tra production build với backend và SQLite riêng của ca kiểm thử; không sửa cơ sở dữ liệu đang dùng của người dùng.

| Kiểm tra | Kết quả |
| --- | --- |
| `npm run build` | Thành công |
| Quy tắc nghiệp vụ gốc | 23/23 đạt |
| Node/API/logic, bao gồm cơ sở và tư vấn mới | 127/127 đạt |
| Trình duyệt: UI01–UI47 và 4 ca mở trang theo vai trò | 51/51 đạt |
| Lượt kiểm tra màn hình trong ma trận | 133 |

Các luồng mới: trang riêng cả 4 cơ sở và bản đồ, CTA giữ khóa–cơ sở–lớp, biên nhận được lưu thật, 6 bài luyện và tài liệu tải về, URL sạch mở trực tiếp, metadata, tạm dừng/giảm chuyển động, lớp đóng trong lúc khách điền form và chế độ vận hành ẩn demo. Các luồng thu phí, điểm danh, chuyển lớp, bảo lưu, tài khoản và xung đột dữ liệu cũng đã được chạy lại.

Lỗi đường dẫn tài nguyên tương đối làm URL sâu bị trắng trang đã được sửa bằng Vite base `/`; xác nhận lại bằng các ca mở URL trực tiếp. Hai ca kiểm tra thông báo tư vấn đã cập nhật sang biên nhận mới, thay vì thông báo toast cũ.

Kiểm thử giao diện tự động chặn mạng Google để kiểm tra tích hợp ổn định. Xác minh mạng Google Maps được chạy riêng: iframe cơ sở Cầu Giấy chuyển 301 tới trang nhúng HTTP 200, 10 ô bản đồ HTTP 200, không có lỗi CSP; ảnh chụp cho thấy ghim tại 88 Xuân Thủy. Các URL của cả 4 cơ sở khớp địa chỉ đang lưu. Điều này xác nhận bản đồ theo địa chỉ, không xác minh quyền sở hữu thương hiệu tại địa điểm.

Bằng chứng: [JSON toàn bộ lượt trình duyệt](../test-results/browser-results.json), [tóm tắt lượt mới nhất](../test-results/browser.txt), [ảnh bản đồ thật](../test-results/public-live-map.png), [kiểm tra mạng bản đồ](../test-results/public-live-map.json). Hướng dẫn dùng và cấu hình ở [GIAO_DIEN_MOI.md](GIAO_DIEN_MOI.md).

## Báo cáo trước đây — giữ để đối chiếu

Mã gốc: `48407496124d5fe4e44f332259b43665f02a2de3`. Thời điểm hoàn tất lượt Chromium: 2026-10-05T04:05:22.754Z (UTC). Xem JSON/log trong `test-results` để đối chiếu. Bộ kiểm thử này chạy trên bản mới, không đổi kết quả thất bại của báo cáo gốc thành Passed.

## Kết quả thực thi

| Kiểm tra                                       | Kết quả                                            |
| ---------------------------------------------- | -------------------------------------------------- |
| 23 ca nghiệp vụ gốc, giữ quy tắc được kiểm tra | 23 Passed / 0 Failed                               |
| Ca hồi quy nghiệp vụ mới                       | 18 Passed / 0 Failed                               |
| API thật và SQLite thật                        | 16 Passed / 0 Failed                               |
| Khởi động dev + Vite proxy + đăng nhập         | 1 Passed / 0 Failed                                |
| Kịch bản trình duyệt thật                      | 27 Passed / 0 Failed                               |
| Khởi tạo seed theo lịch                        | 365/365 ngày năm 2026 hợp lệ, nằm trong một ca B01 |
| Build production                               | Passed                                             |
| npm audit                                      | 0 lỗ hổng được báo tại thời điểm chạy              |

Tổng cộng **58 ca nghiệp vụ/API/dev + 27 kịch bản Chromium = 85 ca/kịch bản**, mỗi ca có thể gồm nhiều bước/assert. Ca UI19 dùng origin HTTP giả lập và chuyển tiếp request tới backend thật, kiểm tra trường hợp trình duyệt không ở secure context vẫn tạo mã giao dịch và hiển thị thông báo. Không dùng ca này làm bằng chứng đã chạy hai máy LAN. 4 kịch bản mở trang theo vai trò kiểm tra tổng cộng 28 lượt mở trang (13 quản lý, 7 ghi danh, 5 kế toán, 3 giáo viên). 365 ngày trong B01 không cộng thêm vào tổng số ca.

Môi trường thực hiện: Linux, Node.js 24.19.0, Chromium 153.0.8010.0 chạy headless. Trình duyệt mở React production build và gọi backend Node/SQLite thật, không thay fetch bằng dữ liệu giả. Các fixture chuẩn bị tình huống trước từng ca được ghi rõ trong mã. CSDL tạm tự xóa khi chạy xong, không làm thay đổi CSDL demo của người dùng.

## Những tình huống đã được kiểm tra

- Seed mọi ngày 2026; mã lớp sau xóa/sửa, lịch học viên, phòng/giáo viên, thời gian/enum/tiền không hợp lệ.
- Chặn kết thúc khi thiếu buổi; thu nợ của học viên Hoàn thành; công nợ không phụ thuộc trạng thái đào tạo.
- Revalidate chuyển lớp/cùng khóa/đợt/active, rollback khi hết chỗ, chuyển nội bộ không nhân doanh thu.
- Bảo lưu ở biên 50%, công thức khoản chưa sử dụng, học lại đúng một lần, phiếu quá hạn bị chặn.
- Hai lịch học bù chồng giờ; hai người cùng vắng một buổi vẫn dùng được form; duyệt rồi điểm danh học bù.
- Giữ roster lịch sử sau chuyển; người mới không được đưa vào buổi trước ngày đăng ký; không điểm danh lớp chưa mở.
- Hết hạn chỗ chờ phí và trả tiền đúng một lần; hủy cá nhân/hoàn số dư; hủy phiếu sai vẫn giữ lịch sử.
- Xác thực/đăng xuất/đổi mật khẩu thật; dữ liệu công khai và dữ liệu giáo viên không lộ mật khẩu/phiếu thu; CSRF/Origin/quyền tại máy chủ.
- Hai phiên/tab stale nhận 409; gửi lại cùng requestId không lập phiếu hai lần; lỗi SQLite cố ý được rollback, không báo thành công.
- Sao lưu không có mật khẩu; khôi phục thiếu bảng/tham chiếu sai bị từ chối; reload SQLite vẫn có dữ liệu đã ghi.
- Public tư vấn, các trang theo quyền, empty state, localStorage cũ sai không ảnh hưởng bản mới.
- Desktop 1440 px và mobile 390 px: public và admin không tràn ngang trang; bảng cuộn trong khung. Ảnh thực tế nằm ở test-results/01–04; ảnh 05 kiểm tra thông báo mất đồng bộ trên mobile.

## Lượt rà soát tiếp theo của bản 2.1

Tái hiện thêm 3 lỗi API và 3 lỗi trình duyệt trên mã 2.0 trước khi sửa; log và ảnh trước sửa nằm trong `test-results/before-v2.1`. Sau sửa, 3 ca API mới và 4 ca Chromium mới đều đạt trong lượt chạy toàn bộ. Ca UI23 bổ sung kiểm tra thông báo mất kết nối; không tính nó vào 6 lỗi đã tái hiện trên baseline.

- API14 chặn reset demo từ revision cũ, giữ dữ liệu vừa tạo của phiên khác.
- API15 từ chối JSON null/mảng/primitive và backup thiếu db bằng 422, không thay CSDL.
- API16 đếm cùng khóa username đã chuẩn hóa khi thử đăng nhập.
- UI20 backend đã lưu phiếu nhưng route bị abort trước khi client nhận kết quả; sau polling và gửi lại cùng nội dung chỉ có một phiếu.
- UI21 giữ phản hồi GET thật rồi trả sau khi lưu học viên; màn hình giữ dữ liệu mới.
- UI22 trì hoãn GET trước đăng nhập/đăng xuất; không đảo trạng thái phiên.
- UI23 làm thất bại GET polling, kiểm tra banner mobile và nút kết nối lại.

Các ca UI20–23 dùng Playwright điều khiển thời điểm hoặc thất bại mạng **trên request tới backend thật**; không trả một bộ dữ liệu tự viết thay API. Điều kiện cố ý này có trong mã test.

## Điều chỉnh test và giới hạn

Ca FR-11 cũ đưa một buổi học từ tương lai về hôm qua nhưng vẫn giữ ngày ghi danh hôm nay. Fixture đã được sửa để ngày hiệu lực đăng ký trước buổi kiểm tra; trường hợp ghi danh sau buổi được kiểm tra riêng ở B09. Đây là sửa setup cho đúng tình huống, không bỏ kiểm tra quyền/điểm danh. Các ca mới về kết thúc và trạng thái bảo lưu hết hạn kiểm tra chính sách mới được ghi ở QUY_TAC_CAN_XAC_NHAN.md.

Đã sửa một lỗi phạm vi biến LIVE khi tách service; ca cũ phát hiện và lượt cuối đã đạt. Trong kiểm thử browser, bước đổi mật khẩu từng chạy tiếp trước khi logout hoàn tất; đã sửa test để chờ trang giới thiệu rồi đăng nhập lại. Không ghi các lượt thử thất bại ban đầu thành kết quả cuối cùng.

**Chưa thực hiện trên máy Windows của người dùng, Edge, Safari/Firefox hoặc hai máy LAN thật.** Hướng dẫn Windows dùng các lệnh npm/Node có thể chạy đa nền tảng; DEV01 kiểm tra khởi động thực trên môi trường Linux. Nhóm nên chạy lại trên máy sẽ bảo vệ. Chưa kiểm thử tải lớn, Internet/HTTPS, luồng chi tiền thật hay một kỳ học vận hành thật. Những giới hạn đó không được đánh dấu Passed.

Các công thức phí, ngưỡng sĩ số, giữ chỗ 7 ngày và điều kiện kết thúc là giả định cần cô duyệt. Hồ sơ khảo sát, use case/UML và template nộp môn học vẫn do nhóm hoàn thiện theo yêu cầu M1–M4.

Mã retry phía trình duyệt được giữ trong bộ nhớ tab. Không dùng UI20 làm bằng chứng chống trùng sau tải lại toàn bộ trang, đóng tab, đăng xuất hay tạo khoản thu khác nội dung. Trong các trường hợp đó cần đối chiếu sổ phiếu trước khi ghi thu mới.

Kiểm tra bổ sung UI22 với phản hồi login được giữ 4,5 giây: không khởi tạo polling trong lúc đổi phiên, rồi đăng nhập thành công. Lượt chạy chọn riêng này đạt 1/1, ghi ở `v2.1-auth-pending-browser.txt` và `browser-results-selected.json`; đây là chạy lại cùng UI22, không cộng thêm vào 85 ca/kịch bản.
