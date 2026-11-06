import { useEffect } from "react";
import { useStore, useRoute } from "../store.jsx";
import { pageMeta } from "../lib/page-meta.js";

function setMeta(key, value, property = false) {
  const attr = property ? "property" : "name";
  let tag = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!tag) { tag = document.createElement("meta"); tag.setAttribute(attr, key); document.head.append(tag); }
  tag.content = value;
}
export function PageMetadata() {
  const { db, site } = useStore();
  const { segments } = useRoute();
  const { title, description, path, noindex } = pageMeta(segments, db, site);
  const origin = site?.publicUrl || location.origin;
  useEffect(() => {
    document.title = title;
    setMeta("description", description);
    setMeta("robots", noindex ? "noindex, nofollow" : "index, follow");
    setMeta("og:title", title, true);
    setMeta("og:description", description, true);
    setMeta("og:site_name", "4ENGLISH", true);
    setMeta("og:type", "website", true);
    setMeta("og:locale", "vi_VN", true);
    setMeta("og:image", `${origin}/images/4english-study-space-1448.webp`, true);
    setMeta("og:image:alt", "Góc học tiếng Anh mang nhận diện 4ENGLISH", true);
    setMeta("og:url", origin + path, true);
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.append(canonical); }
    canonical.href = origin + path;
  }, [title, description, path, noindex, origin]);
  return null;
}
