import { canonicalPath } from "./navigation.js";

export function pageMeta(segments, db, site = {}) {
  const [route, id] = segments;
  const course = route === "course" && db.courses.find((item) => item.id === id);
  const branch = route === "branch" && db.branches.find((item) => item.id === id);
  let title = "4ENGLISH · Học tự tin, vươn xa hơn";
  let description = "Khám phá chương trình tiếng Anh, học phí và lịch khai giảng tại 4ENGLISH. Chọn cơ sở và lộ trình phù hợp với bạn.";
  if (course) { title = `${course.name} | 4ENGLISH`; description = `${course.desc} Xem học phí, số buổi và lịch lớp đang nhận đăng ký.`; }
  else if (branch) { title = `${branch.name} | Địa chỉ và lịch lớp`; description = `${branch.name}: ${branch.address}. Xem bản đồ, thông tin liên hệ và các lớp đang mở đăng ký tại cơ sở.`; }
  else if (route === "section" && id === "khoa-hoc") title = "Các chương trình tiếng Anh | 4ENGLISH";
  else if (route === "section" && id === "chi-nhanh") title = "Hệ thống cơ sở | 4ENGLISH";
  else if (route === "placement") { title = "Kiểm tra đầu vào tiếng Anh | 4ENGLISH"; description = "Thử bài kiểm tra ngữ pháp, từ vựng và tham khảo chương trình phù hợp với mục tiêu của bạn."; }
  else if (route === "contact") { title = "Liên hệ và tư vấn | 4ENGLISH"; description = "Chọn cơ sở 4ENGLISH, tìm đường trên Google Maps và gửi yêu cầu tư vấn khóa học."; }
  else if (route === "privacy") title = "Thông tin và quyền riêng tư | 4ENGLISH";
  else if (route === "terms") title = "Hướng dẫn đăng ký học | 4ENGLISH";
  else if (route === "consult") title = "Đăng ký nhận tư vấn | 4ENGLISH";
  else if (route === "login" || route === "app") title = "Cổng nhân viên | 4ENGLISH";
  const known = [undefined, "section", "course", "branch", "placement", "contact", "privacy", "terms", "consult", "login", "app"].includes(route);
  const missing = !known || (route === "course" && !course) || (route === "branch" && !branch);
  if (missing) title = "Không tìm thấy trang | 4ENGLISH";
  return { title, description, path: canonicalPath(segments), noindex: site.demoMode !== false || missing || ["app", "login", "consult"].includes(route) };
}
