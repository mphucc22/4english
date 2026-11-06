# Giao diện 4ENGLISH — cập nhật 06/11/2026

Giao diện lấy cảm hứng từ cách tổ chức trang học ngoại ngữ của PREP, với xanh dương chủ đạo, nền sáng, tiêu đề lớn và các thẻ khóa học. Tên, logo và nội dung dùng thương hiệu 4ENGLISH.

## Những phần đã sửa và bổ sung

1. Tăng chữ nội dung, nhãn và độ tương phản; tăng vùng bấm trên điện thoại. Ô nhập trên điện thoại dùng chữ 16 px.
2. Dùng tên **Cổng nhân viên** để phân biệt hệ thống quản lý với trang giới thiệu khóa học.
3. Bổ sung trang chi tiết cho mỗi khóa: đối tượng phù hợp, nội dung định hướng, số buổi, học phí và lớp đang nhận đăng ký.
4. Thẻ khóa học có hai nút **Xem chi tiết** và **Nhận tư vấn**. Từ trang chi tiết hoặc kết quả bài thử, nút tư vấn chọn sẵn đúng chương trình.
5. Bổ sung giới thiệu giảng viên từ dữ liệu hiện có. Chỉ giảng viên đang dạy được đưa ra trang công khai; không công khai số điện thoại và email cá nhân.
6. Bổ sung bài thử đầu vào 10 câu, chọn mục tiêu, quay lại sửa đáp án, chấm điểm, giải thích đáp án, gợi ý khóa học và làm lại.
7. Điều chỉnh cuộn trang để thanh điều hướng không che phần đầu câu hỏi và kết quả bài thử.
8. Kiểm tra lại các màn hình quản lý, biểu mẫu và luồng nghiệp vụ bằng trình duyệt thật. Kết quả chi tiết ở [KIEM_THU_GUI.md](KIEM_THU_GUI.md).
9. Mỗi cơ sở có trang riêng: thông tin liên hệ, giờ đón tiếp khi có dữ liệu, bản đồ Google Maps và những chương trình có lớp đang nhận đăng ký tại cơ sở đó. Thẻ cơ sở ở trang chủ cũng có bản đồ và nút xem chi tiết.
10. Tư vấn giữ đúng khóa, cơ sở và lớp khi đi từ lịch khai giảng. Form cho chọn khung giờ liên hệ, xác nhận ngay trên trang và trả mã yêu cầu; nhân viên xem lại được lớp, lịch và cơ sở tại thời điểm gửi.
11. Trang khóa học có mục tiêu luyện tập, điều kiện tham khảo, lộ trình ba nhóm nội dung, bài luyện thử có giải thích và tài liệu tải về cho sáu chương trình. Thời lượng buổi học tính từ lịch lớp; tên giáo trình chưa xác nhận được để lại cho cơ sở tư vấn.
12. Bổ sung trang liên hệ, thông tin quyền riêng tư, hướng dẫn đăng ký và cấu hình hotline/email/Zalo/Facebook/giờ tư vấn bằng dữ liệu đã xác nhận. Tách chế độ demo với chế độ vận hành.
13. Ảnh thương hiệu không có người, có các bản WebP cho điện thoại. Chuyển động có nút tạm dừng, ghi nhớ lựa chọn, giảm chuyển động theo hệ thống và dừng hiệu ứng nền khi ra khỏi màn hình.
14. URL công khai dễ đọc; tiêu đề, mô tả, canonical và Open Graph riêng cho từng khóa/cơ sở được trả cả từ máy chủ. Bổ sung robots.txt và sitemap.xml, loại trang nội bộ khỏi danh sách công khai.

Bài thử chỉ tham khảo ngữ pháp và từ vựng; không xác nhận trình độ CEFR hoặc quy đổi điểm IELTS. Nội dung chi tiết của khóa học mang tính định hướng và được trung tâm xác nhận khi tư vấn.

## Chạy trong VS Code

Yêu cầu Node.js 24 trở lên. Mở thư mục có `package.json`, sau đó chạy:

```powershell
npm ci
npm run dev
```

Mở http://localhost:5173 và giữ terminal đang chạy. Các lần sau chỉ cần `npm run dev`.

Nếu cập nhật một bản đang sử dụng, giữ lại cơ sở dữ liệu trong thư mục `data/`. Không bấm khôi phục demo để cập nhật mã nguồn. Các trường tư vấn mới được lưu trong bản ghi SQLite hiện có; không cần reset dữ liệu. Khi vừa sửa backend hoặc cấu hình môi trường, dừng terminal cũ và chạy lại `npm run dev` để nạp mã máy chủ mới.

## Các địa chỉ trong ứng dụng

| Đường dẫn | Nội dung |
| --- | --- |
| `/` | Trang giới thiệu |
| `/co-so/br1` | Ví dụ trang cơ sở Cầu Giấy và bản đồ |
| `/khoa-hoc/co2` | Ví dụ trang chi tiết khóa A1 |
| `/kiem-tra-dau-vao` | Bài thử đầu vào |
| `/tu-van/co2?branch=br1` | Tư vấn và chọn sẵn khóa A1, cơ sở Cầu Giấy |
| `/lien-he` | Liên hệ, giờ đón tiếp và bản đồ các cơ sở |
| `/chinh-sach-bao-mat` | Thông tin về cách tiếp nhận dữ liệu tư vấn |
| `/dieu-khoan` | Hướng dẫn đăng ký học |
| `/dang-nhap` | Đăng nhập dành cho nhân viên |
| `#/app/dashboard` | Tổng quan sau khi đăng nhập |

Trang nhân viên vẫn dùng xác thực và phân quyền trên máy chủ. Bài thử đầu vào không ghi dữ liệu nghiệp vụ. Gửi tư vấn trong bản chạy tại máy vẫn được lưu qua API hiện có.

Các đường dẫn `#/course/...`, `#/consult/...`, `#/branch/...` và `#/placement` cũ vẫn dùng được. Liên kết tư vấn từ một lớp kèm `class` và `branch`; máy chủ kiểm tra lớp có đang nhận đăng ký và thuộc đúng khóa/cơ sở. Khi lớp thay đổi trong lúc điền form, khách cần chọn lại hoặc chủ động bỏ lựa chọn lớp trước khi gửi.

## Bản đồ và thông tin cơ sở

Bản đồ mặc định tra theo địa chỉ đang lưu trong danh mục. Người quản trị toàn hệ thống cập nhật địa chỉ/điện thoại tại **Danh mục → Chi nhánh**; quản lý cơ sở tiếp tục quản lý nghiệp vụ trong phạm vi được giao. Địa chỉ mẫu chưa phải là xác nhận một địa điểm mang thương hiệu 4ENGLISH ngoài thực tế. Không tự tạo tọa độ hay ảnh chụp cơ sở giả.

Biểu mẫu chi nhánh có **Giờ hoạt động** và **URL nhúng Google Maps** riêng cho từng cơ sở. Nếu đã có ghim chính xác, mở Google Maps → Chia sẻ → Nhúng bản đồ, sao chép riêng giá trị `src="..."` và dán URL đó vào trường nhúng; không dán cả thẻ iframe. Chỉ chấp nhận URL HTTPS của Google Maps Embed. Để trống URL để quay về tra theo địa chỉ; để trống giờ riêng để dùng giờ chung hoặc lời nhắc liên hệ cơ sở. Danh mục này chỉ quản trị toàn hệ thống được sửa.

Iframe tải lười, có tiêu đề theo cơ sở và có hai liên kết **Mở Google Maps**, **Chỉ đường**. CSP chỉ cho phép khung bản đồ từ các miền Google đã khai báo. Google hướng dẫn lấy mã nhúng tại https://support.google.com/maps/answer/7101463?hl=vi.

## Chế độ vận hành và liên hệ

Mặc định `npm run dev` giữ chế độ demo của dự án học tập. Để chạy production build có chức năng demo bị ẩn và API reset bị khóa:

1. Sao chép `.env.production.example` thành `.env.production` và điền các thông tin đã xác nhận; để trống trường chưa có.
2. Chạy `npm run build`, sau đó `npm run start:production`.
3. Mở địa chỉ máy chủ in ra trong terminal. Cổng mặc định là 3001. Dừng bản dev trước nếu đang chiếm cùng cổng.

| Biến | Nội dung |
| --- | --- |
| `ABC_PUBLIC_URL` | Origin chính thức của website, ví dụ tên miền bạn sở hữu; dùng cho canonical và sitemap |
| `ABC_HOTLINE` | Hotline chung |
| `ABC_CONTACT_EMAIL` | Email tiếp nhận liên hệ |
| `ABC_OPENING_HOURS` | Giờ tư vấn/đón tiếp chung, dùng khi cơ sở chưa có giờ riêng |
| `ABC_ZALO_URL` | Liên kết Zalo HTTPS trên zalo.me hoặc oa.zalo.me |
| `ABC_FACEBOOK_URL` | Liên kết Facebook HTTPS của trung tâm |

`npm run start:production` giữ cơ sở dữ liệu hiện tại, không xóa dữ liệu hoặc tự chuyển dữ liệu mẫu thành dữ liệu thật. Chế độ vận hành ẩn tài khoản mẫu trên màn đăng nhập, nhãn bản học tập ở footer và nút khôi phục demo; máy chủ cũng từ chối API reset. Nếu tự chạy `npm start`, có thể đặt `ABC_DEMO_MODE=false` để chọn cùng chế độ.

Trong chế độ demo, metadata và robots yêu cầu không lập chỉ mục; sitemap không liệt kê dữ liệu. Chế độ vận hành tạo sitemap từ các khóa/cơ sở hiện có, không đưa trang nhân viên và yêu cầu tư vấn vào sitemap. Nội dung giới thiệu không giả cam kết điểm thi, giáo trình đã phê duyệt hay đánh giá học viên.

## Các tệp chính

| Tệp | Nội dung |
| --- | --- |
| `src/public-layout.jsx` | Header, footer, menu và liên kết giữa các trang công khai |
| `src/pages/public.jsx` | Trang giới thiệu, bộ lọc, giảng viên, tư vấn và đăng nhập |
| `src/pages/course-detail.jsx` | Chi tiết khóa học và lịch lớp |
| `src/pages/branch-detail.jsx`, `src/components/branch-map.jsx` | Trang cơ sở và bản đồ dùng chung |
| `src/components/lead-form.jsx` | Form tư vấn theo khóa/cơ sở/lớp và biên nhận |
| `src/pages/contact.jsx` | Liên hệ, thông tin quyền riêng tư, hướng dẫn đăng ký |
| `src/lib/navigation.js`, `src/lib/page-meta.js` | URL công khai và metadata dùng chung frontend/backend |
| `src/pages/placement.jsx` | Giao diện làm bài và xem kết quả |
| `src/lib/placement.js` | Câu hỏi, chấm điểm và quy tắc gợi ý chương trình |
| `src/lib/course-content.js` | Nội dung định hướng của khóa học |
| `src/public.css` | Giao diện công khai, khả năng đọc, responsive, chi tiết khóa học và bài thử đầu vào |
| `src/motion.css`, `src/motion.jsx` | Hiệu ứng chuyển động và tùy chọn tạm dừng |
| `tests/gui-redesign.js` | Các kiểm tra GUI bổ sung |
| `tests/browser-run.js` | Bộ kiểm tra GUI chung |
| `tests/public-site.js` | Kiểm tra trang cơ sở, bản đồ, tư vấn, bài mẫu và chế độ vận hành |

Các quy tắc trước đây trong `src/experience.css` đã được hợp nhất vào cuối `src/public.css`, giữ nguyên thứ tự để bảo toàn giao diện. `src/main.jsx` chỉ nạp một tệp CSS giao diện công khai, sau đó nạp hiệu ứng chuyển động.

Ảnh đầu trang dùng `public/images/4english-study-space-1448.webp` với các bản 480/768 px cho màn hình nhỏ. Ảnh tạo bằng `imagegen` tích hợp, theo phong cách ảnh chụp góc học tiếng Anh có nhận diện 4ENGLISH, không có người. Khung giữ tỷ lệ 4:3. Bản lớn nhất giảm từ 2,23 MB PNG xuống khoảng 173 KB WebP (92,2%).

Ảnh hành trình học đã thay bằng `public/images/4english-learning-journey-1536.webp` và các bản 480/768 px, được tạo bằng `imagegen`, không có người hay bộ phận cơ thể. Hai PNG/JPG cũ không còn được đóng gói. Các ảnh là minh họa thương hiệu, không mô tả phòng học thực tế của một cơ sở cụ thể.

<details>
<summary>Prompt tạo ảnh đầu trang (imagegen tích hợp)</summary>

```text
Use case: product-mockup.
Asset type: photorealistic hero photograph for the Vietnamese English-learning website 4ENGLISH.
Primary request: an inviting, lively English-study workspace related to 4ENGLISH, with absolutely no people.
Scene/backdrop: a clean contemporary study desk in a bright language-learning room, soft daylight through a window, calm royal-blue and white palette with warm pale wood. A small green plant adds a natural accent.
Subject: an open laptop showing a tasteful blue English-learning screen with the exact word "4ENGLISH", a pair of blue over-ear headphones beside it, an open English workbook, a neat notebook and pen, and a few small vocabulary flashcards. A hardcover blue book standing behind the laptop bears exactly "4ENGLISH" and below it the small words "ENGLISH PRACTICE". Laptop screen and book typography are crisp and readable. No other prominent text.
Style/medium: highly realistic professional product and interior photography, believable materials, realistic paper, keyboard, headphones and glass, soft natural shadows, editorial education campaign.
Composition/framing: landscape 4:3, eye-level three-quarter view looking slightly down at the desk, balanced group of objects filling central two thirds, the laptop and 4ENGLISH book are the visual focus, all important brand text and objects sit comfortably inside the central 80 percent, leave a little breathing room for the website's existing floating decorative cards. Rich but uncluttered composition, use real physical study objects rather than floating digital icons.
Lighting/mood: bright natural daylight, fresh, energetic, welcoming and aspirational, balanced exposure, blue accents, true-to-life color.
Constraints: absolutely no people, faces, hands, arms, body parts, silhouettes, human reflections, human photos, portraits, avatars, or person-shaped icons anywhere, including book covers, laptop screen, reflections and background. No website mockup, no floating UI, no fake interface cards, no overlaid slogans, no watermark, no cartoon or illustration. Output only the photograph. Exact brand is "4ENGLISH".
```

</details>

<details>
<summary>Prompt tạo ảnh hành trình học (imagegen tích hợp)</summary>

```text
Use case: photorealistic-natural.
Asset type: supporting landscape photograph for the learning journey section of the 4ENGLISH English-center website.
Primary request: a realistic, lively overhead photograph of an English study setup with no people or body parts.
Scene and subject: a pale oak desk with an open English vocabulary workbook, a simple royal blue notebook embossed with exactly "4ENGLISH", blue pen, a compact weekly planner with neat checkmarks, and several vocabulary flashcards with simple English words. Include blue headphones partly visible at one edge and a small green plant. The workbook has believable lightly printed exercises and generous white space.
Composition: landscape 3:2, overhead or gently angled flat lay, visual focus on the open workbook and 4ENGLISH notebook in the central 75 percent; clear organized study materials, leave the bottom quarter fairly calm for a separate website caption. Distinct from a laptop hero photograph: no laptop.
Lighting: bright soft morning daylight, natural gentle shadows, warm wood, crisp whites and royal blue accents, photographic paper and fabric textures, inviting editorial product photography.
Constraints: absolutely no people, hands, faces, body parts, silhouettes, portraits, human reflections or human imagery anywhere. No cartoon, no floating UI, no website mockup, no watermark, no overlaid text. Exact brand spelling "4ENGLISH".
```

</details>

Bản xem trước trực tuyến dùng dữ liệu mẫu và không lưu các thay đổi nghiệp vụ. Bản mã nguồn tải xuống chạy đầy đủ API Node.js và SQLite như dự án gốc.
