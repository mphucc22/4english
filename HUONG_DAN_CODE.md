# Hướng dẫn đọc mã 4ENGLISH 2.1

## Cấu trúc và cách phân công

| Nhóm mã                                    | Trách nhiệm                                                                                                       | Thành viên có thể phụ trách |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | --------------------------- |
| src/pages/public.jsx, icons.jsx, index.css | Trang giới thiệu, đăng nhập, thương hiệu, màu, responsive                                                         | Giao diện                   |
| src/pages/_.jsx, src/forms/_.jsx           | Mỗi trang và form nghiệp vụ riêng; pages.jsx/forms.jsx là các tệp re-export tương thích                           | Giao diện nghiệp vụ         |
| src/lib/rules.js                           | Tiện ích chung và khởi tạo dịch vụ; class/enrollment/request/attendance/report/staff-rules.js tách theo nghiệp vụ | Nghiệp vụ đào tạo           |
| src/lib/extra-rules.js                     | Sổ số dư, hoàn/hủy phí, hết hạn, điều chỉnh buổi                                                                  | Nghiệp vụ tài chính         |
| src/lib/master-rules.js                    | Validation và CRUD danh mục                                                                                       | Dữ liệu nền                 |
| server/database.js                         | SQLite, bảng, ràng buộc, transaction, băm mật khẩu lúc lưu                                                        | Backend                     |
| server/auth.js                             | Xác thực, cookie phiên, kiểm tra mật khẩu                                                                         | Backend                     |
| server/services/actions.js                 | Danh sách action được phép, dữ liệu theo vai trò                                                                  | Backend                     |
| server/app.js                              | HTTP/API, CSRF, version, idempotency, backup/restore                                                              | Backend                     |
| tests/*, src/lib/tests.js                  | Kiểm thử nghiệp vụ, API và Chromium thật                                                                          | Kiểm thử                    |

Không sửa dữ liệu bằng `db.students.push`, `Object.assign` hoặc localStorage trong component. UI gọi `execute('tênAction', ...args)` và `await` kết quả. Các phép đọc/tính toán R.paid/R.due/R.sessions được dùng ở UI; các phép ghi được chạy lại tại máy chủ với user lấy từ phiên đăng nhập.

Form chờ phản hồi, khóa nút trong khi gửi, giữ form và báo lỗi nếu validation/transaction thất bại. Hộp thoại hỗ trợ Escape, giữ focus trong dialog, trả focus sau đóng. Phiên bản tại lúc mở form được giữ để phát hiện xung đột dữ liệu từ tab khác.

## API

| Đường dẫn                 | Quyền                        | Mục đích                                     |
| ------------------------- | ---------------------------- | -------------------------------------------- |
| GET /api/health           | Công khai                    | Tình trạng máy chủ                           |
| GET /api/state            | Tùy phiên                    | Snapshot phù hợp quyền; user và csrf         |
| POST /api/login           | Công khai                    | username/password, tạo phiên                 |
| POST /api/leads           | Công khai, giới hạn tần suất | Nhận yêu cầu tư vấn đã kiểm tra              |
| POST /api/command         | Đăng nhập + CSRF             | action,args,revision,requestId               |
| POST /api/logout          | Đăng nhập + CSRF             | Thu hồi phiên hiện tại                       |
| POST /api/change-password | Đăng nhập + CSRF             | Kiểm tra mật khẩu cũ, thu hồi các phiên khác |
| GET /api/backup           | Quản lý                      | JSON nghiệp vụ, không mật khẩu               |
| POST /api/restore         | Quản lý + CSRF               | Khôi phục có kiểm tra, giữ tài khoản         |
| POST /api/reset           | Quản lý + CSRF               | Reset dữ liệu mẫu có xác nhận                |

Quyền được kiểm tra tại service; không tin role hoặc user ID gửi từ trình duyệt. Giáo viên chỉ nhận buổi mình phụ trách, roster liên quan; không nhận phiếu thu/số dư/liên hệ riêng của học viên. Kế toán xem lớp để theo dõi công nợ, không có quyền chỉnh lớp.

## SQLite

Có các bảng users, branches, rooms, courses, terms, teachers, students, classes, sessions, enrollments, payments, attendance, requests, reservations, leads, balanceLedger, refunds, audit; thêm settings, auth_sessions và operations cho máy chủ.

Mỗi bảng nghiệp vụ có ID chính và payload JSON. Các khóa liên kết quan trọng là cột riêng có khóa ngoại (lớp–khóa/chi nhánh/đợt; buổi–lớp/phòng/giáo viên; đăng ký–học viên/lớp; thu–đăng ký/học viên; điểm danh–buổi/đăng ký/học viên; bảo lưu/số dư/hoàn–học viên). Có unique index cho mã lớp, tên đăng nhập, cặp buổi–đăng ký điểm danh. Mật khẩu băm nằm ở cột password_hash, không nằm trong payload gửi cho frontend.

Adapter tải dữ liệu thành cấu trúc mảng để dùng chung service JavaScript, và ghi lại các bảng trong **một transaction SQLite**. Lỗi kiểm tra hoặc lỗi ghi trả rollback trước phản hồi. Cách này phù hợp dữ liệu demo và giúp sửa từ bản cũ; chưa tối ưu cho hàng trăm người thao tác hoặc CSDL rất lớn. Nếu vận hành thật, bước tiếp là chuẩn hóa các thuộc tính thành cột và cập nhật những dòng thay đổi, thêm migration, triển khai HTTPS và vận hành sao lưu. Không cần làm các bước đó để chạy demo môn học.

## Khi đổi quy tắc

1. Đọc docs/QUY_TAC_CAN_XAC_NHAN.md và chốt với giảng viên.
2. Sửa service thay vì chỉ đổi giao diện.
3. Cập nhật ca kiểm thử đúng quy tắc được chấp nhận.
4. Chạy npm test, npm run build, npm run test:browser.
5. Ghi thay đổi vào báo cáo và cập nhật đặc tả use case/UML của nhóm.

PDF hướng dẫn cũ không được đưa vào bản 2.0 để tránh mô tả sai cơ chế localStorage. README và hướng dẫn này là tài liệu cho bản mới.
