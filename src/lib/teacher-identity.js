// A teacher profile owns their identity and work locations. A login is optional.
export const sameBranchIds = (left, right) =>
  Array.isArray(left) && Array.isArray(right) &&
  new Set(left).size === new Set(right).size &&
  left.every((id) => right.includes(id));

export const teacherAccount = (db, teacherId) =>
  db.users.find((user) => user.role === "teacher" && user.teacherId === teacherId);

export function canTeacherWorkAt(db, teacherId, branchId) {
  const teacher = db.teachers.find((item) => item.id === teacherId);
  return !!teacher && teacher.status === "Đang dạy" &&
    Array.isArray(teacher.branchIds) && teacher.branchIds.includes(branchId);
}

export function isLoginAllowed(db, user) {
  if (!user || user.disabled === true || user.teacherLinkConflict === true) return false;
  if (user.role !== "teacher") return true;
  const teacher = db.teachers.find((item) => item.id === user.teacherId);
  return !!teacher && teacher.status === "Đang dạy" &&
    db.users.filter((item) => item.role === "teacher" && item.teacherId === user.teacherId).length === 1 &&
    sameBranchIds(user.branchIds, teacher.branchIds);
}
