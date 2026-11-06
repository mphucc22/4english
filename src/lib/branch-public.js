// Used both when saving a branch and when rendering data restored from a backup.
export function googleMapsEmbedUrl(value) {
  if (typeof value !== "string" || value.length > 4096) return "";
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && !url.username && !url.password && !url.port && !url.hash &&
      ["www.google.com", "maps.google.com"].includes(url.hostname) &&
      ["/maps/embed", "/maps/embed/"].includes(url.pathname) ? url.href : "";
  } catch { return ""; }
}

// Search/directions always use the stored address, never invented coordinates.
export function branchMapUrls(branch) {
  const address = typeof branch?.address === "string" ? branch.address.trim() : "";
  if (!address) return null;
  const query = encodeURIComponent(address);
  return {
    address,
    embed: googleMapsEmbedUrl(branch.mapEmbedUrl) || `https://www.google.com/maps?q=${query}&output=embed&hl=vi&z=16`,
    search: `https://www.google.com/maps/search/?api=1&query=${query}`,
    directions: `https://www.google.com/maps/dir/?api=1&destination=${query}`,
  };
}

export function consultHref({ courseId = "", branchId = "", classId = "" } = {}) {
  const params = new URLSearchParams();
  if (branchId) params.set("branch", branchId);
  if (classId) params.set("class", classId);
  return `/tu-van${courseId ? `/${encodeURIComponent(courseId)}` : ""}${params.size ? `?${params}` : ""}`;
}

export function branchPublicData(db, id) {
  const branch = (db.branches || []).find((item) => item.id === id);
  if (!branch) return null;
  const courses = db.courses || [];
  const courseIds = new Set(courses.map((course) => course.id));
  const classes = (db.classes || []).filter((item) =>
    item.branchId === id && item.status === "Mở đăng ký" && courseIds.has(item.courseId),
  ).sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)) || String(a.code).localeCompare(String(b.code)));
  const offeredIds = new Set(classes.map((item) => item.courseId));
  return {
    branch,
    classes,
    courses: courses.filter((course) => offeredIds.has(course.id)),
  };
}

export function phoneHref(phone) {
  const number = String(phone || "").replace(/[^\d+]/g, "");
  return /^\+?\d{7,15}$/.test(number) ? `tel:${number}` : "";
}
