# Hồ sơ và tài khoản giáo viên

**Danh mục → Giáo viên** quản lý hồ sơ gốc: mã, họ tên, liên hệ, chuyên môn, cơ sở giảng dạy và trạng thái. **Nhân viên** quản lý tài khoản đăng nhập liên kết với hồ sơ đó. Một hồ sơ có tối đa một tài khoản giáo viên; người chưa được cấp tài khoản vẫn có thể được xếp lịch dạy.

## Tạo giáo viên và cấp đăng nhập

1. Quản trị toàn hệ thống hoặc quản lý cơ sở vào **Danh mục → Giáo viên → + Thêm**, nhập thông tin và chọn cơ sở giảng dạy thuộc phạm vi được giao, rồi lưu. Khi quản lý cơ sở đang chọn riêng một cơ sở trên thanh phía trên, hồ sơ mới chỉ được gắn với cơ sở đang chọn.
2. Vào **Nhân viên → + Thêm nhân viên**, chọn vai trò **Giáo viên** và chọn **Hồ sơ giáo viên liên kết**.
3. Tên và cơ sở tự lấy từ hồ sơ; nhập tên đăng nhập, mật khẩu rồi lưu. Hồ sơ đã có tài khoản không xuất hiện trong lựa chọn cấp mới.
4. Quản lý cơ sở được tạo và chỉnh hồ sơ, cấp tài khoản khi toàn bộ cơ sở công tác thuộc phạm vi của mình. Hồ sơ có cơ sở ngoài phạm vi chỉ được xem; quản trị toàn hệ thống hoặc người quản lý đủ các cơ sở liên quan xử lý việc điều chỉnh.

Danh mục hiển thị hồ sơ đã có tài khoản hay chưa. Mục Nhân viên hiển thị tên đăng nhập, giáo viên liên kết, phạm vi và trạng thái đăng nhập.

## Đổi thông tin và lịch dạy

Sửa tên hoặc cơ sở tại **Danh mục → Giáo viên**; tài khoản liên kết cập nhật cùng giao dịch, giữ tên đăng nhập và mật khẩu. Form tài khoản không cho nhập một tên hoặc phạm vi khác với hồ sơ.

Quản lý phụ trách nhiều cơ sở chọn **Các cơ sở được giao** trước khi sửa giáo viên công tác tại nhiều cơ sở đó. Cả cơ sở đang có và cơ sở được thêm vào hồ sơ đều phải thuộc phạm vi được phép; không thể đổi một hồ sơ ngoài quyền thành hồ sơ của mình. Nút sửa/xóa được ẩn khi phạm vi không đủ. Hồ sơ đã được tài khoản hoặc lịch dạy tham chiếu được giữ để bảo toàn lịch sử.

Xếp lịch lớp và đổi buổi chỉ chọn giáo viên đang dạy, được phân công tại cơ sở của lớp. Khi bỏ một cơ sở khỏi hồ sơ hoặc cho giáo viên nghỉ, cần phân công lại các buổi chưa học từ hôm nay trở đi tại các lớp đang hoạt động trước. Lịch sử giảng dạy vẫn được giữ.

## Khóa và mở lại tài khoản

- Đánh dấu **Khóa đăng nhập** khi sửa tài khoản để tạm khóa. Thao tác này không đổi hồ sơ nghề nghiệp và không xóa lịch dạy.
- Hồ sơ chuyển sang **Nghỉ** sẽ không đăng nhập được. Các phiên đăng nhập hiện có bị hủy khi khóa hoặc cho nghỉ.
- Cho giáo viên dạy lại hoặc bỏ khóa yêu cầu đăng nhập lại; cookie đã bị hủy không hoạt động trở lại. Bỏ trạng thái nghỉ không tự bỏ một khóa thủ công.
- Tài khoản đang đăng nhập không tự khóa được; hệ thống phải còn ít nhất một quản trị toàn hệ thống chưa bị khóa.

## Nâng cấp dữ liệu cũ

Khởi động lại backend để nâng cấp. Database đã có phân quyền cơ sở được sao lưu vào tệp có hậu tố `.before-teachers.sqlite` trước lần nâng cấp đầu tiên. Nếu đồng thời nâng cấp cả phân quyền cơ sở, bản phục hồi mang hậu tố `.before-branches.sqlite`.

Hệ thống đồng bộ tên từ hồ sơ và giữ phạm vi tài khoản hiện có. Với hồ sơ chưa có tài khoản, cơ sở công tác được suy ra từ lịch dạy cũ; hồ sơ chưa có phân công cần được quản trị kiểm tra trước khi xếp lịch mới.

Nếu dữ liệu cũ có nhiều tài khoản gắn cùng một giáo viên, các tài khoản đó được giữ lại và khóa để đối chiếu. Quản trị chuyển liên kết hoặc xóa tài khoản trùng, rồi mở khóa tài khoản được giữ. Không tự chọn một tài khoản làm chủ hoặc xóa thông tin đăng nhập trong quá trình nâng cấp.

Khôi phục dữ liệu và khôi phục demo giữ phạm vi của tài khoản hiện có; không tự mở rộng phạm vi giáo viên theo dữ liệu mẫu trong tệp.
