import { useEffect, useRef, useState } from "react";
import { useStore } from "../store.jsx";
import { Btn, Fld, In, Sel } from "../ui.jsx";
import { Icon } from "../icons.jsx";
import { request } from "../lib/api.js";
import { R } from "../lib/rules.js";

export function LeadForm({ selection, onSelectionChange, notice = "" }) {
  const { db } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState(null);
  const lock = useRef(false);
  const confirmation = useRef(null);
  const { courseId = "", branchId = "", classId = "" } = selection;
  const classes = db.classes.filter((item) => item.status === "Mở đăng ký" &&
    (!courseId || item.courseId === courseId) && (!branchId || item.branchId === branchId));
  const selectedClass = classes.find((item) => item.id === classId);
  const unavailableClass = Boolean(classId && !selectedClass);
  useEffect(() => {
    if (receipt) confirmation.current?.focus();
  }, [receipt]);
  // Changing a navigation selection opens a fresh form without losing typing to polling.
  useEffect(() => { setReceipt(null); setError(""); }, [courseId, branchId, classId]);
  const change = (field, value) => {
    const next = { ...selection, [field]: value, classId: "" };
    if (field === "classId") {
      const item = classes.find((entry) => entry.id === value);
      next.classId = item?.id || "";
      if (item) { next.courseId = item.courseId; next.branchId = item.branchId; }
    }
    onSelectionChange(next);
  };
  const submit = async (event) => {
    event.preventDefault();
    if (lock.current) return;
    if (unavailableClass) { setError("Lớp vừa chọn đã thay đổi. Hãy chọn lại lớp hoặc chọn Chưa chọn lớp cụ thể trước khi gửi."); return; }
    lock.current = true;
    setBusy(true); setError("");
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await request("leads", { body: payload });
      setReceipt(response.receipt || {
        name: payload.name, phone: payload.phone,
        course: db.courses.find((item) => item.id === payload.courseId)?.name,
        branchName: db.branches.find((item) => item.id === payload.branchId)?.name,
        classCode: selectedClass?.code, classSchedule: selectedClass ? R.scheduleText(selectedClass) : "",
        contactTimeLabel: "Theo thời gian bạn đã chọn",
      });
    } catch (failure) { setError(failure.message); }
    finally { lock.current = false; setBusy(false); }
  };
  if (receipt) return (
    <div className="consult-form consult-confirmation" role="status">
      <span className="consult-success-icon"><Icon name="check" size={32} /></span>
      <p className="section-kicker">YÊU CẦU ĐÃ ĐƯỢC LƯU</p>
      <h3 ref={confirmation} tabIndex={-1}>Đã nhận yêu cầu tư vấn</h3>
      <p>Cảm ơn {receipt.name}. Nhân viên sẽ liên hệ qua số <b>{receipt.phone}</b> để xác nhận nhu cầu và lịch phù hợp.</p>
      <dl className="consult-receipt">
        {[
          ["Mã yêu cầu", receipt.id], ["Khóa quan tâm", receipt.course],
          ["Cơ sở", receipt.branchName], ["Lớp quan tâm", receipt.classCode],
          ["Lịch lớp", receipt.classSchedule], ["Khung giờ liên hệ", receipt.contactTimeLabel],
        ].filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      <p className="consult-follow-up">Yêu cầu tư vấn chưa phải xác nhận ghi danh hoặc giữ chỗ. Trung tâm sẽ trao đổi với bạn trước khi đăng ký học.</p>
      <button type="button" className="prep-button" onClick={() => setReceipt(null)}>Gửi yêu cầu khác<Icon name="arrow" size={18} /></button>
      {receipt.branchId && <a className="detail-text-link" href={`/co-so/${encodeURIComponent(receipt.branchId)}`}>Xem thông tin cơ sở<Icon name="pin" size={17} /></a>}
    </div>
  );
  return (
    <form className="consult-form" onSubmit={submit} aria-busy={busy}>
      <span className="consult-form-label"><Icon name="requests" size={18} />KẾT NỐI VỚI 4ENGLISH</span>
      <h3>Nhận tư vấn lộ trình học</h3>
      <p>Chọn nhu cầu của bạn. 4ENGLISH sẽ trao đổi trước khi ghi danh.</p>
      {notice && <p className="consult-context-notice" role="status">{notice}</p>}
      <fieldset disabled={busy} className="consult-fields">
        <legend className="visually-hidden">Thông tin liên hệ và chương trình quan tâm</legend>
        <div className="consult-form-grid">
          <Fld label="Họ và tên"><In required name="name" autoComplete="name" placeholder="Nhập họ và tên của bạn" maxLength={120} /></Fld>
          <Fld label="Số điện thoại"><In required name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="Nhập số điện thoại" pattern={"[+0-9 .\\-]{9,20}"} maxLength={20} /></Fld>
        </div>
        <Fld label="Khóa quan tâm"><Sel required name="courseId" ph="Chọn chương trình bạn quan tâm" value={courseId} onChange={(event) => change("courseId", event.target.value)} options={db.courses.map((item) => [item.id, item.name])} /></Fld>
        <Fld label="Cơ sở muốn học"><Sel required name="branchId" ph="Chọn cơ sở thuận tiện cho bạn" value={branchId} onChange={(event) => change("branchId", event.target.value)} options={db.branches.map((item) => [item.id, item.name])} /></Fld>
        <Fld label="Lớp quan tâm (không bắt buộc)"><Sel name="classId" ph="Chưa chọn lớp cụ thể" value={classId} onChange={(event) => change("classId", event.target.value)} options={[...(unavailableClass ? [[classId, "Lớp đã thay đổi · vui lòng chọn lại"]] : []), ...classes.map((item) => [item.id, `${item.code} · ${R.scheduleText(item)}`])]} /></Fld>
        {unavailableClass && <p className="consult-context-notice" role="alert">Lớp vừa chọn đã ngừng nhận đăng ký hoặc không còn phù hợp. Bạn hãy chọn lại lớp, hoặc chọn “Chưa chọn lớp cụ thể” để tiếp tục tư vấn.</p>}
        {selectedClass && <p className="consult-class-summary"><Icon name="timetable" size={17} />Đang chọn lớp {selectedClass.code} · {R.scheduleText(selectedClass)}</p>}
        <Fld label="Khung giờ thuận tiện để liên hệ"><Sel name="contactTime" defaultValue="any" options={[["any", "Khi thuận tiện"], ["morning", "Buổi sáng"], ["afternoon", "Buổi chiều"], ["evening", "Buổi tối"]]} /></Fld>
        <Fld label="Mục tiêu hoặc thời gian học mong muốn"><textarea name="note" placeholder="Ví dụ: Tôi muốn học giao tiếp vào buổi tối" rows={3} maxLength={500} /></Fld>
      </fieldset>
      {error && <p role="alert" className="consult-error">{error}</p>}
      <Btn disabled={busy || unavailableClass || !db.courses.length || !db.branches.length} type="submit" className="consult-submit">{busy ? "Đang gửi…" : "Gửi yêu cầu tư vấn"}<Icon name="arrow" size={19} /></Btn>
      <p className="consult-privacy"><Icon name="shield" size={15} /><span>Thông tin dùng để tiếp nhận và xử lý yêu cầu tư vấn. <a href="/chinh-sach-bao-mat">Xem thông tin quyền riêng tư</a>.</span></p>
    </form>
  );
}
