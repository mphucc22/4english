// Preserve records and credentials while making teacher profiles authoritative.
export function migrateTeacherData(db) {
  if ((db.meta.teacherIdentityVersion || 0) > 1)
    throw Error("Phiên bản hồ sơ giáo viên mới hơn phần mềm hiện tại.");
  if (db.meta.teacherIdentityVersion === 1) return false;
  const existingBranches = new Set(db.branches.map((branch) => branch.id));
  for (const user of db.users)
    if (user.disabled === undefined) user.disabled = false;

  for (const teacher of db.teachers) {
    const accounts = db.users.filter((user) => user.role === "teacher" && user.teacherId === teacher.id);
    if (!Array.isArray(teacher.branchIds)) {
      // Preserve existing login grants. A timetable alone never expands an
      // existing account's authority during this upgrade.
      const inferred = accounts.length
        ? accounts.flatMap((user) => user.branchIds || [])
        : [
          ...db.sessions.filter((session) => session.teacherId === teacher.id)
            .map((session) => db.classes.find((klass) => klass.id === session.classId)?.branchId),
          ...db.classes.filter((klass) => klass.teacherId === teacher.id).map((klass) => klass.branchId),
        ];
      teacher.branchIds = [...new Set(inferred.filter((id) => existingBranches.has(id)))];
    }
    for (const user of accounts) {
      user.name = teacher.name;
      user.branchIds = [...teacher.branchIds];
      if (accounts.length > 1) {
        // Keep every username and password; an administrator resolves the
        // duplicate links explicitly before any of these accounts can log in.
        user.disabled = true;
        user.teacherLinkConflict = true;
      }
    }
  }
  db.meta.teacherIdentityVersion = 1;
  return true;
}
