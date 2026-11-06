const aliases = {
  "khoa-hoc": "course", "co-so": "branch", "tu-van": "consult",
  "kiem-tra-dau-vao": "placement", "lien-he": "contact",
  "chinh-sach-bao-mat": "privacy", "dieu-khoan": "terms", "dang-nhap": "login",
};
const sections = new Set(["khoa-hoc", "lo-trinh", "giang-vien", "lop-mo", "chi-nhanh", "tu-van"]);
const decode = (value) => { try { return decodeURIComponent(value); } catch { return ""; } };

// Old shared hash links remain valid alongside public URLs served by Node/Vite.
export function parseLocation({ pathname = "/", search = "", hash = "" } = {}) {
  const legacy = /^#\//.test(hash);
  const source = legacy ? hash.slice(1) : pathname;
  const [path, query = ""] = source.split("?");
  const parts = path.split("/").filter(Boolean).map(decode);
  const params = new URLSearchParams(legacy ? query : search);
  if (!legacy && parts.length) {
    const first = parts[0];
    if (first === "khoa-hoc" && parts.length === 1) return { segments: ["section", "khoa-hoc"], params };
    if (first === "co-so" && parts.length === 1) return { segments: ["section", "chi-nhanh"], params };
    parts[0] = Object.hasOwn(aliases, first) ? aliases[first] : "not-found";
  }
  if (!parts.length && hash && sections.has(hash.slice(1)))
    return { segments: ["section", hash.slice(1)], params };
  return { segments: parts, params };
}

export function canonicalPath(segments = []) {
  const [route, id] = segments;
  const paths = { course: "khoa-hoc", branch: "co-so", consult: "tu-van", placement: "kiem-tra-dau-vao", contact: "lien-he", privacy: "chinh-sach-bao-mat", terms: "dieu-khoan", login: "dang-nhap" };
  const path = Object.hasOwn(paths, route) ? paths[route] : "";
  if (path) return `/${path}${id && ["course", "branch", "consult"].includes(route) ? `/${encodeURIComponent(id)}` : ""}`;
  if (route === "section" && id === "khoa-hoc") return "/khoa-hoc";
  if (route === "section" && id === "chi-nhanh") return "/co-so";
  return "/";
}
