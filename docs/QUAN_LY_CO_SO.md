# Quản lý từng cơ sở trong 4ENGLISH

Mọi cơ sở dùng chung một backend và database. Quyền truy cập được kiểm tra tại máy chủ theo tài khoản và cơ sở của bản ghi; bộ chọn trên giao diện chọn phạm vi đang làm việc.

## Thiết lập ban đầu

1. Khởi động lại backend sau khi cập nhật code. Khi dùng bản build, cần build lại trước khi chạy `npm start`.
2. Đăng nhập tài khoản quản trị toàn hệ thống hiện có (tài khoản demo: `quanly`).
3. Vào **Danh mục → Chi nhánh** để kiểm tra tên, địa chỉ và thông tin liên hệ của các cơ sở.
4. Vào **Nhân viên → + Thêm nhân viên**. Chọn vai trò **Quản lý cơ sở**, nhập thông tin đăng nhập và đánh dấu cơ sở được giao, rồi lưu.
5. Tạo hoặc sửa tài khoản ghi danh, kế toán và chọn cơ sở được giao. Với giáo viên, khai báo cơ sở công tác tại **Danh mục → Giáo viên**, rồi chọn hồ sơ đó khi cấp tài khoản; tên và cơ sở của tài khoản tự đồng bộ theo hồ sơ. Xem [hướng dẫn quản lý giáo viên](QUAN_LY_GIAO_VIEN.md).
6. Đăng nhập bằng tài khoản mới để kiểm tra phạm vi. Nếu tài khoản phụ trách nhiều cơ sở, chọn cơ sở tại thanh trên cùng.

Không tự tạo thêm tài khoản hay mật khẩu khi nâng cấp database. Quản trị viên chủ động cấp tài khoản qua giao diện.

## Vai trò và phạm vi

| Vai trò | Công việc |
| --- | --- |
| Quản trị toàn hệ thống | Tất cả cơ sở, danh mục chung, phân công quản lý, sao lưu/khôi phục và nhật ký tổng |
| Quản lý cơ sở | Lớp, phòng, hồ sơ giáo viên, học viên, ghi danh, học phí, duyệt yêu cầu, điểm danh và báo cáo trong phạm vi được giao |
| Nhân viên ghi danh | Hồ sơ học viên thuộc quyền quản lý, đăng ký học, yêu cầu học tập và tư vấn của cơ sở |
| Kế toán | Thu học phí và báo cáo thuộc cơ sở được giao |
| Giáo viên | Các buổi được phân công trong cơ sở được giao, danh sách học viên và điểm danh |

Quản lý cơ sở chỉ tạo/sửa tài khoản ghi danh, kế toán hoặc giáo viên có toàn bộ phạm vi nằm trong các cơ sở mình phụ trách. Họ không cấp vai trò quản lý, sửa quyền của chính mình hoặc quản lý tài khoản có cơ sở ngoài phạm vi.

Khóa học, đợt đào tạo và danh mục cơ sở được quản trị toàn hệ thống chỉnh sửa. Quản lý cơ sở được tạo/sửa giáo viên và phòng học trong phạm vi được giao, rồi cấp tài khoản giáo viên tại mục **Nhân viên**. Với hồ sơ giáo viên phụ trách nhiều cơ sở, cần có quyền trên toàn bộ các cơ sở đang có và được thêm vào; nếu tất cả đều được giao cho mình, chọn **Các cơ sở được giao** trước khi sửa.

## Làm việc hằng ngày

- **Cơ sở đang quản lý:** chọn trên thanh trên cùng. Quản trị có mục **Tất cả cơ sở**; tài khoản được giao nhiều cơ sở có mục **Các cơ sở được giao**. Chuyển cơ sở đóng hộp thoại đang mở để tránh lưu nhầm dữ liệu.
- **Lớp học / Thời khóa biểu:** tạo lớp tại cơ sở được chọn, xếp phòng của đúng cơ sở và giáo viên phù hợp. Máy chủ vẫn kiểm tra trùng lịch giáo viên/học viên trên toàn hệ thống.
- **Học viên:** một hồ sơ chung có cơ sở quản lý chính. Cơ sở khác có đăng ký liên quan được xem hồ sơ nhưng không tự sửa hồ sơ do cơ sở khác quản lý. Các đăng ký, phiếu thu và lịch sử ngoài phạm vi được ẩn.
- **Học phí / Báo cáo:** phiếu thu giữ cơ sở phát sinh. Số dư tại cơ sở A không dùng thanh toán hoặc hoàn tiền tại cơ sở B.
- **Tư vấn:** form công khai chọn cơ sở tiếp nhận. Yêu cầu cũ chưa có cơ sở nằm trong phạm vi quản trị toàn hệ thống.
- **Chuyển lớp / Học lại / Học bù giữa cơ sở:** người thực hiện phải có quyền tại tất cả cơ sở liên quan. Quản lý chỉ phụ trách một cơ sở liên hệ quản trị toàn hệ thống để xử lý luồng liên cơ sở. Chọn phạm vi bao gồm cả nguồn và đích khi thao tác.

## Dữ liệu cũ

Lần đầu backend mở dữ liệu cũ, hệ thống tạo bản phục hồi `data/abc-english.sqlite.before-branches.sqlite` nếu chưa có, rồi nâng cấp trong một giao dịch. Tài khoản, mật khẩu, ID, học viên, phiếu thu và số dư được giữ lại; không khôi phục demo để nâng cấp.

- Quản lý cũ trở thành quản trị toàn hệ thống.
- Nhân viên ghi danh/kế toán cũ chưa có phân công nhận danh sách cơ sở trống. Quản trị vào **Nhân viên → Sửa → Cơ sở được giao** để phân công; trong thời gian đó, họ thấy thông báo **Chưa được giao cơ sở**.
- Giáo viên cũ được gắn các cơ sở suy ra từ buổi dạy đã phân công. Quản trị có thể kiểm tra và điều chỉnh.
- Cơ sở của đăng ký/phiếu thu/bảo lưu được suy ra từ lớp liên quan. Số dư không xác định được nguồn được giữ riêng để quản trị đối chiếu; không tự gán vào một cơ sở bất kỳ.

Database và định dạng sao lưu tiếp tục dùng tên kỹ thuật cũ để tương thích. Không đổi tên file database để đổi thương hiệu.

## Kiểm tra

Kiểm thử nghiệp vụ và API chạy trên database tạm, kiểm tra đọc/ghi chéo cơ sở, giả ID, cấp quyền vượt phạm vi, chuyển ngữ cảnh, giao dịch gửi lại sau khi thu hồi quyền, nguồn số dư và nâng cấp dữ liệu cũ.

```powershell
node run-tests.js
node --test --test-isolation=none tests/api.test.js tests/rules.test.js tests/placement.test.js tests/branch-access.test.js tests/branch-finance.test.js tests/branch-staff.test.js tests/branch-api.test.js tests/branch-migration.test.js
```
