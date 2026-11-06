import { useStore } from "../store.jsx";
import { PublicPage } from "../public-layout.jsx";
import { Icon } from "../icons.jsx";
import { BranchMap } from "../components/branch-map.jsx";
import { consultHref, phoneHref } from "../lib/branch-public.js";

export function Contact() {
  const { db, site } = useStore();
  const contact = site?.contact || {};
  return <PublicPage>
    <section className="contact-hero prep-section">
      <div className="public-container">
        <nav className="public-breadcrumb" aria-label="Đường dẫn trang"><a href="/">Trang chủ</a><span>/</span><span aria-current="page">Liên hệ</span></nav>
        <p className="section-kicker">BẮT ĐẦU BẰNG MỘT CUỘC TRÒ CHUYỆN</p>
        <h1>Chọn nơi học.<br /><span>Kết nối với 4ENGLISH.</span></h1>
        <p className="section-description">Tra cứu thông tin cơ sở, tìm đường hoặc để lại nhu cầu để được tư vấn khóa học phù hợp.</p>
        <div className="contact-channels">
          {contact.hotline && <a href={phoneHref(contact.hotline)}><Icon name="leads" size={23} /><span>Hotline<b>{contact.hotline}</b></span></a>}
          {contact.email && <a href={`mailto:${contact.email}`}><Icon name="requests" size={23} /><span>Email<b>{contact.email}</b></span></a>}
          {contact.zaloUrl && <a href={contact.zaloUrl} target="_blank" rel="noopener noreferrer"><Icon name="chat" size={23} /><span>Trao đổi trực tiếp<b>Zalo 4ENGLISH</b></span></a>}
          {contact.facebookUrl && <a href={contact.facebookUrl} target="_blank" rel="noopener noreferrer"><Icon name="globe" size={23} /><span>Theo dõi thông tin<b>Facebook 4ENGLISH</b></span></a>}
          <a href="/tu-van"><Icon name="book" size={23} /><span>Chọn khóa và cơ sở<b>Nhận tư vấn học tập</b></span></a>
        </div>
        <p className="contact-hours"><Icon name="clock" size={18} />{contact.hours || "Liên hệ cơ sở trước khi đến để xác nhận giờ đón tiếp và lịch tư vấn."}</p>
      </div>
    </section>
    <section className="prep-section contact-locations">
      <div className="public-container">
        <div className="new-section-heading"><div><p className="section-kicker">CƠ SỞ THUẬN TIỆN CHO BẠN</p><h2>Thông tin liên hệ từng cơ sở</h2></div></div>
        <div className="contact-location-grid">
          {db.branches.map((branch) => <article className="contact-location" key={branch.id}>
            <div className="contact-location-copy"><span className="contact-location-icon"><Icon name="pin" size={25} /></span><h3><a href={`/co-so/${encodeURIComponent(branch.id)}`}>{branch.name}</a></h3><p>{branch.address || "Địa chỉ đang được cập nhật."}</p>
              {branch.phone && <a className="detail-text-link" href={phoneHref(branch.phone)}><Icon name="leads" size={17} />{branch.phone}</a>}
              <div className="contact-location-actions"><a href={`/co-so/${encodeURIComponent(branch.id)}`}>Xem lịch lớp<Icon name="arrow" size={16} /></a><a href={consultHref({ branchId: branch.id })}>Tư vấn tại cơ sở</a></div>
            </div><BranchMap branch={branch} compact />
          </article>)}
        </div>
        {!db.branches.length && <p className="detail-empty">Thông tin cơ sở đang được cập nhật. Bạn có thể quay lại sau.</p>}
      </div>
    </section>
  </PublicPage>;
}

export function InformationPage({ type }) {
  const privacy = type === "privacy";
  return <PublicPage>
    <section className="prep-section public-information">
      <div className="public-container">
        <nav className="public-breadcrumb" aria-label="Đường dẫn trang"><a href="/">Trang chủ</a><span>/</span><span aria-current="page">{privacy ? "Quyền riêng tư" : "Hướng dẫn đăng ký"}</span></nav>
        <p className="section-kicker">THÔNG TIN RÕ RÀNG, HỌC TẬP AN TÂM</p>
        <h1>{privacy ? "Thông tin và quyền riêng tư" : "Hướng dẫn đăng ký học"}</h1>
        {privacy ? <div className="information-body">
          <section><h2>Thông tin khi gửi yêu cầu tư vấn</h2><p>Biểu mẫu tiếp nhận họ tên, số điện thoại, khóa học, cơ sở, lớp quan tâm nếu có, khung giờ liên hệ và ghi chú bạn chủ động cung cấp. Không gửi mật khẩu, thông tin thanh toán hoặc giấy tờ cá nhân trong phần ghi chú.</p></section>
          <section><h2>Mục đích sử dụng</h2><p>Thông tin được lưu trong hệ thống để nhân sự được phân quyền tiếp nhận, liên hệ và cập nhật tình trạng tư vấn. Nội dung yêu cầu không được hiển thị trên trang công khai.</p></section>
          <section><h2>Điều chỉnh thông tin đã gửi</h2><p>Nếu cần sửa thông tin liên hệ, dừng tư vấn hoặc trao đổi về việc lưu giữ thông tin, bạn có thể liên hệ cơ sở đã chọn và cung cấp mã yêu cầu. Cơ sở sẽ xác nhận danh tính và hướng xử lý phù hợp.</p></section>
          <section><h2>Bản đồ và tùy chọn trình duyệt</h2><p>Các trang cơ sở nhúng Google Maps để tra cứu địa chỉ. Khi bản đồ được tải, trình duyệt kết nối với Google theo chính sách của dịch vụ đó. Bạn có thể dùng liên kết chỉ đường để mở bản đồ riêng.</p><p>Website lưu tùy chọn tạm dừng chuyển động trên trình duyệt. Cổng nhân viên sử dụng cookie phiên để duy trì đăng nhập.</p></section>
        </div> : <div className="information-body">
          <section><h2>1. Tìm chương trình và cơ sở</h2><p>Xem học phí, số buổi, đối tượng và lịch lớp đang nhận đăng ký. Bài thử đầu vào hỗ trợ tham khảo ngữ pháp và từ vựng; kết quả không phải chứng chỉ hay xác nhận trình độ toàn diện.</p></section>
          <section><h2>2. Gửi nhu cầu tư vấn</h2><p>Chọn khóa, cơ sở, lớp nếu đã có lịch phù hợp và khung giờ thuận tiện để liên hệ. Sau khi gửi thành công, bạn nhận xác nhận và mã yêu cầu ngay trên trang.</p></section>
          <section><h2>3. Xác nhận với nhân viên</h2><p>Nhân viên trao đổi về trình độ, lịch học, tình trạng lớp, tài liệu và điều kiện ghi danh. Yêu cầu tư vấn chưa tạo đăng ký học hoặc giữ chỗ. Giờ đón tiếp, giáo trình và các chi phí liên quan cần được xác nhận với cơ sở trước khi quyết định.</p></section>
          <section><h2>4. Hoàn tất ghi danh</h2><p>Thực hiện theo hướng dẫn chính thức của cơ sở, kiểm tra thông tin khóa và lớp trên chứng từ. Nếu cần bảo lưu, chuyển lớp, học bù hoặc điều chỉnh học phí, liên hệ nhân viên để được kiểm tra điều kiện theo đăng ký thực tế.</p></section>
        </div>}
        <div className="information-actions"><a className="prep-button" href="/lien-he">Liên hệ cơ sở<Icon name="arrow" size={18} /></a><a className="detail-text-link" href="/tu-van">Nhận tư vấn</a></div>
      </div>
    </section>
  </PublicPage>;
}

export function NotFound() {
  return <PublicPage><section className="prep-section"><div className="public-container missing-course"><Icon name="search" size={45} /><h1>Không tìm thấy trang</h1><p>Đường dẫn có thể đã thay đổi. Bạn có thể xem chương trình hoặc tìm cơ sở phù hợp.</p><a className="prep-button" href="/">Về trang chủ<Icon name="arrow" size={19} /></a></div></section></PublicPage>;
}
