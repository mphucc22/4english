# 4ENGLISH — DT06, bản hoàn thiện 2.1

Đã bổ sung quản lý theo cơ sở: tài khoản **Quản trị toàn hệ thống** quản lý chung; tài khoản **Quản lý cơ sở**, ghi danh, kế toán và giáo viên chỉ thao tác trong phạm vi được giao. Xem [hướng dẫn quản lý từng cơ sở](docs/QUAN_LY_CO_SO.md) để tạo tài khoản, giao cơ sở và nâng cấp dữ liệu cũ.

Hồ sơ giáo viên và tài khoản đăng nhập đã được đồng bộ tên, cơ sở công tác và trạng thái truy cập; xem [hướng dẫn giáo viên và tài khoản](docs/QUAN_LY_GIAO_VIEN.md).

Giao diện được thiết kế lại theo hướng xanh dương, lấy cảm hứng từ PREP; đã bổ sung chi tiết khóa học, giảng viên và bài thử đầu vào. Xem [hướng dẫn giao diện mới](docs/GIAO_DIEN_MOI.md) và [báo cáo kiểm thử GUI](docs/KIEM_THU_GUI.md).

Website có trang riêng từng cơ sở và Google Maps, tư vấn giữ đúng lớp/cơ sở, bài học mẫu, trang liên hệ và chế độ vận hành. Xem [cách cập nhật vị trí, liên hệ và chạy bản vận hành](docs/GIAO_DIEN_MOI.md#bản-đồ-và-thông-tin-cơ-sở). Sau khi cập nhật mã máy chủ, dừng terminal cũ rồi chạy lại `npm run dev`.

React là giao diện; Node.js là máy chủ; SQLite là dữ liệu dùng chung. Bản này chạy cục bộ và có dữ liệu mẫu để bảo vệ bài tập. Không còn lưu nghiệp vụ bằng localStorage, không đăng nhập bằng cách tìm mật khẩu trên giao diện.

## Chạy trong Visual Studio Code (Windows)

1. Cài **Node.js 24 LTS** từ https://nodejs.org/ và mở lại VS Code nếu vừa cài Node.
2. Giải nén ZIP, chọn **File → Open Folder** và mở thư mục có `package.json`.
3. Mở **Terminal → New Terminal**, chạy:

```powershell
node --version
npm ci
npm run dev
```

4. Mở **http://localhost:5173**. Giữ terminal đang chạy. Một lệnh chạy cả giao diện và backend; không cần cài SQLite riêng.
5. Dừng bằng **Ctrl+C**. Lần chạy sau chỉ cần `npm run dev`.

Nếu Node nhỏ hơn 24, cập nhật Node trước khi chạy. Nếu cổng đã được dùng, dừng terminal chạy bản khác. PowerShell chặn `npm.ps1` thì dùng `npm.cmd ci` và `npm.cmd run dev`, hoặc chọn terminal Command Prompt trong VS Code. Không cần `npm audit fix --force`.

## Nâng cấp từ bản 2.0

1. Tải sao lưu ở **Hệ thống** rồi dừng terminal của bản cũ bằng Ctrl+C.
2. Giải nén bản 2.1 vào thư mục riêng. Nếu muốn giữ toàn bộ học viên, khoản thu và tài khoản, sao chép `data/abc-english.sqlite` của bản cũ đã dừng vào thư mục `data` của bản 2.1 trước lần chạy đầu.
3. Chạy `npm ci` rồi `npm run dev` ở bản 2.1. Kiểm tra học viên/phiếu thu và đăng nhập bằng tài khoản hiện có. Không bấm Khôi phục demo để nâng cấp.

Nếu không sao chép CSDL, bản mới tạo dữ liệu mẫu riêng. Bản 2.1 giữ schema 2 và định dạng sao lưu `ABC-English-v2`; không cần đổi tên phiên bản trong JSON. Không sao chép CSDL khi máy chủ còn đang ghi.

## Tài khoản mẫu

| Tên đăng nhập | Vai trò                  | Mật khẩu ban đầu |
| ------------- | ------------------------ | ---------------- |
| quanly        | Quản lý đào tạo          | 123456           |
| ghidanh       | Nhân viên ghi danh       | 123456           |
| ketoan        | Kế toán                  | 123456           |
| gv1           | Giáo viên Nguyễn Thu Hà  | 123456           |
| gv2           | Giáo viên Trần Minh Quân | 123456           |

Đổi mật khẩu ở cuối thanh bên. Quản lý tạo tài khoản tại **Nhân viên**. Mật khẩu được băm bằng scrypt; không có trong dữ liệu gửi về trình duyệt. Cookie phiên có HttpOnly, SameSite=Strict, thời hạn 8 giờ. Thao tác ghi yêu cầu mã CSRF và kiểm tra quyền tại máy chủ.

## Dữ liệu mẫu và dữ liệu dùng chung

Đây là hai khái niệm khác nhau: dữ liệu ban đầu là **mẫu**, nhưng mọi tab/tài khoản của cùng máy chủ làm việc trên **một SQLite**. Lần chạy đầu tự tạo `data/abc-english.sqlite`, gồm 4 chi nhánh, 6 chương trình, 6 lớp, 20 học viên và 29 đăng ký. Ngày/lịch mẫu được sinh theo thời điểm khởi tạo, không sinh lại mỗi lần mở web. Hai yêu cầu mẫu có thể ít hơn nếu ngày khởi tạo khiến điều kiện không hợp lệ.

Trang tự làm mới dữ liệu khoảng 4 giây khi không mở hộp thoại. Trong khi nhập form, giữ phiên bản dữ liệu đã mở; nếu có người khác ghi trước, máy chủ trả lỗi xung đột và không ghi đè. Kiểm tra thông tin và lưu lại. Khoản thu được gắn mã giao dịch để gửi lại cùng giao dịch không lập phiếu hai lần. Trong bản 2.1, mã gửi lại được giữ ngay cả khi polling đã tải phiên bản mới. Sau lỗi mạng chưa xác nhận kết quả, có thể kiểm tra sổ phiếu hoặc gửi lại **cùng nội dung trong tab đang mở**. Nếu đã tải lại cả trang/đóng tab/đăng xuất, hãy đối chiếu phiếu thu trước khi tạo khoản thu mới; bộ nhớ retry không tồn tại qua các thao tác đó.

Phản hồi làm mới cũ không thay thế dữ liệu vừa lưu hoặc đảo trạng thái đăng nhập/đăng xuất. Khi mất kết nối, có thông báo màu hổ phách và nút **Kết nối lại**; dữ liệu hiển thị có thể chưa cập nhật. Khi khôi phục demo hoặc khôi phục dữ liệu từ tệp, phiên dữ liệu cũ bị từ chối để tránh xóa các thay đổi mới của người khác.

Nếu nhóm cần dùng nhiều máy trong cùng mạng LAN, chọn **một máy chạy máy chủ**, rồi mở địa chỉ IP của máy đó trên các máy còn lại. Ví dụ trong PowerShell của máy chủ:

```powershell
$env:HOST="0.0.0.0"
npm run dev
```

Mở `http://IP-MAY-CHU:5173` trên máy khác, cho phép Node qua Windows Firewall trong mạng riêng nếu cần. Mỗi thành viên dùng tài khoản riêng. Chạy một bản độc lập trên từng máy sẽ tạo nhiều CSDL riêng. Dùng tài khoản và thông tin giả cho buổi demo.

## Các luồng chính

- **Lớp học:** tạo Nháp → xếp lịch → mở đăng ký → ghi danh → thu đủ mức xác nhận → xác nhận mở → điểm danh → kết thúc khi đủ buổi.
- **Lịch:** kiểm tra phòng, giáo viên, học viên và học bù; đổi từng buổi chưa điểm danh với lý do, giữ ID và lịch sử điều chỉnh.
- **Học phí:** tiền mặt/chuyển khoản là ghi nhận thu nội bộ; số dư là bù trừ. Thu nợ được cả sau hoàn thành, chuyển hoặc hủy nếu còn học phí phải thu. Không có cổng thanh toán ngân hàng trong DT06.
- **Yêu cầu học tập:** ghi danh tạo bảo lưu/chuyển lớp/học bù; quản lý duyệt hoặc từ chối; máy chủ kiểm tra lại lúc duyệt.
- **Bảo lưu:** học lại cùng khóa; khoản bảo lưu chỉ được sử dụng một lần; trạng thái hết hạn suy ra từ ngày.
- **Hủy cá nhân:** quản lý nhập lý do, phần học phí chưa sử dụng chuyển vào số dư. Hoàn tiền từ số dư tại **Học viên → Hồ sơ → Hoàn tiền**; đây là ghi sổ chi, cần đối chiếu khoản chi thực tế.
- **Phiếu sai:** quản lý hủy phiếu tại Học phí, giữ chứng từ trong lịch sử. Đăng ký đã chuyển/bảo lưu/hủy dùng luồng hoàn số dư thay vì hủy phiếu gốc.
- **Giữ chỗ:** đăng ký chưa đạt ngưỡng xác nhận tự hết hạn khi được máy chủ kiểm tra sau hạn. Trả học phí chưa sử dụng vào số dư và giải phóng chỗ đúng một lần.
- **Tư vấn:** khách gửi thông tin, nhân viên ghi danh nhận và cập nhật trạng thái từ cùng máy chủ.
- **Hệ thống:** quản lý tải/khôi phục sao lưu JSON và xem nhật ký thao tác.

## Sao lưu và chuyển máy

Tải **Hệ thống → Tải bản sao lưu** trước khi thao tác lớn. Tệp JSON có dữ liệu nghiệp vụ, không có mật khẩu/hash. Khôi phục giữ nguyên tài khoản hiện có; tài khoản giáo viên cần vẫn liên kết đúng giáo viên trong tệp. Tệp thiếu bảng, mã trùng hoặc đứt liên kết bị từ chối trong một giao dịch.

Muốn chuyển toàn bộ hệ thống kèm tài khoản/mật khẩu: dừng terminal trước, sao chép `data/abc-english.sqlite` sang thư mục data của bản mới rồi khởi động. Không đưa CSDL thật chứa thông tin học viên lên Git. Dữ liệu mẫu khôi phục bằng nút **Khôi phục demo**; thao tác này thay dữ liệu nghiệp vụ, giữ tài khoản hiện tại và giáo viên liên kết tài khoản, cần sao lưu trước.

**Dữ liệu localStorage của bản cũ không tự nhập.** Bản này mở CSDL mới và giữ bản gốc để đối chiếu. Không xóa dữ liệu trình duyệt của bản cũ. Nếu cần chuyển dữ liệu cũ đã nhập thật, cần một tệp xuất đầy đủ để kiểm tra và chuyển đổi riêng; không đổi trực tiếp tên phiên bản rồi nhập.

## Kiểm thử và build

```powershell
npm test
npm run build
npm start
```

Sau build, `npm start` phục vụ cả API và giao diện tại **http://localhost:3001**. `npm run preview` chỉ xem giao diện build; để sử dụng nghiệp vụ hãy dùng `npm start`.

Kiểm thử trình duyệt thật (tùy chọn, cài Chromium lần đầu):

```powershell
npx playwright install chromium
npm run build
npm run test:browser
```

Kiểm thử chạy trên CSDL tạm, không sửa CSDL làm việc. Kết quả browser và ảnh màn hình được ghi vào `test-results`. Xem báo cáo thực thi được đóng gói ở `docs/BAO_CAO_KIEM_THU.md`.

## Tài liệu trong ZIP

- `docs/BAO_CAO_KIEM_THU.md`: kết quả chạy thật và phạm vi kiểm tra.
- `docs/DOI_CHIEU_LOI.md`: 19 nhóm lỗi của báo cáo cũ và cách sửa.
- `docs/BO_SUNG_V2.1.md`: các lỗi mới tái hiện, cách sửa và bằng chứng trước/sau của lượt rà soát tiếp theo.
- `docs/QUY_TAC_CAN_XAC_NHAN.md`: giả định nghiệp vụ cần hỏi cô.
- `docs/TEST_PLAN.md`, `docs/TRACEABILITY.md`: kế hoạch và liên kết yêu cầu với ca tự động.
- `HUONG_DAN_CODE.md`: cấu trúc mã, API và cách phân công nhóm.

Đối với môn Phân tích thiết kế hướng đối tượng, nhóm vẫn cần tự làm hồ sơ khảo sát, đặc tả use case, UML, thiết kế CSDL/giao diện và báo cáo theo mẫu cô. Việc có backend giúp demo nhất quán; không thay thế các sản phẩm M1–M4. Bản 2.1 là bản học tập, chưa phải hệ thống đã triển khai vận hành cho một trung tâm thật.
