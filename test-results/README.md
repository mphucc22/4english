# Kết quả kiểm thử 4ENGLISH

## Đợt kiểm thử mới nhất đã lưu

Đợt ngày **06/11/2026**, hoàn tất lượt trình duyệt lúc **19:59:11 giờ Việt Nam**:

| Nhóm | Kết quả | Nguồn đối chiếu |
| --- | --- | --- |
| Nghiệp vụ gốc | 23/23 đạt | [Báo cáo kiểm thử](../docs/BAO_CAO_KIEM_THU.md) |
| Node/API/logic | 127/127 đạt | [Báo cáo kiểm thử](../docs/BAO_CAO_KIEM_THU.md) |
| Trình duyệt thật | 51/51 đạt, 0 lỗi | [browser-results.json](browser-results.json), [browser.txt](browser.txt) |
| Ma trận màn hình | 133 lượt | `screenCoverage` trong [browser-results.json](browser-results.json) |
| Google Maps thật | Bản đồ cơ sở Cầu Giấy tải thành công | [Kết quả mạng và xác minh ảnh](public-live-map.json), [ảnh bản đồ](public-live-map.png) |

Đây là kết quả của lần chạy đã lưu, không phải một lượt kiểm thử mới được chạy mỗi khi sửa tài liệu hoặc push GitHub. `browser-results-selected.json` chỉ là lần chạy chọn một số ca; dùng `browser-results.json` để xem toàn bộ lượt chạy.

## Báo cáo lịch sử

Các tệp sau được giữ để đối chiếu các phiên bản trước, không dùng làm kết quả hiện tại:

- [verification-summary.json](verification-summary.json): đợt ngày 05/10/2026, 27 kịch bản trình duyệt.
- [gui-v2-summary.json](gui-v2-summary.json), `GUI_V2_Cases.csv`, `GUI_V2_ScreenCoverage.csv`: đợt ngày 18/10/2026, 44 ca GUI.
- `build.txt`, `unit-api.txt` và các tệp `v2.1-*`: log từ những lượt chạy trước; xem thời điểm và phiên bản ghi trong từng tệp.
- [before-v2.1](before-v2.1/): bằng chứng lỗi trước khi sửa.

Tên dự án, phiên bản trình duyệt hoặc số ca trong báo cáo cũ được giữ nguyên để bảo toàn lịch sử. Hướng dẫn chạy kiểm thử nằm trong [README chính](../README.md).
