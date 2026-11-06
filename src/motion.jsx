import { useLayoutEffect, useRef } from "react";

// Enhance existing content without delaying data, navigation, or form updates.
const REVEAL_TARGETS = [
  ".prep-hero-copy > *",
  ".learning-art",
  ".prep-facts",
  ".new-section-heading",
  ".course-toolbar",
  ".prep-course-card",
  ".journey-image",
  ".journey-step",
  ".teacher-card",
  ".open-class",
  ".promise-grid > div:first-child",
  ".promise-item",
  ".prep-branch",
  ".consult-copy",
  ".consult-form",
  ".faq-grid > div:first-child",
  ".faq-list details",
  ".footer-main > div",
  ".course-detail-grid > *",
  ".detail-content-grid > div",
  ".placement-intro",
  ".placement-quiz",
  ".placement-result-summary",
  ".placement-recommendation",
  ".quiz-review",
  ".login-story-content > *",
  ".login-form",
].join(",");
const SCENES = ".prep-hero, .learning-art[data-parallax], .skill-ribbon";
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const readPaused = () => {
  try { return localStorage.getItem("4english.motion.paused") === "1"; }
  catch { return false; }
};

export function MotionRoot({ children }) {
  const scope = useRef(null);

  useLayoutEffect(() => {
    const root = scope.current;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    let paused = readPaused();
    let stop = () => {};

    const configure = () => {
      stop();
      const enabled = !preference.matches && !paused && !!window.IntersectionObserver;
      root.classList.toggle("motion-paused", paused);
      root.classList.toggle("motion-reduced", preference.matches);
      root.classList.toggle("motion-enhanced", enabled);
      root.classList.toggle("motion-inactive", document.hidden);

      const seen = new WeakSet();
      const pending = new Set();
      const additions = new Set();
      const scenes = new Map();
      let frame = 0;
      let scrollFrame = 0;
      const show = (element) => {
        if (element.dataset.motion !== "pending") return;
        element.dataset.motion = "visible";
        pending.delete(element);
        observer?.unobserve(element);
      };
      const observer = enabled ? new IntersectionObserver(
        (entries) => {
          for (const entry of entries)
            if (entry.isIntersecting) show(entry.target);
        },
        { threshold: 0, rootMargin: "0px 0px -12px 0px" },
      ) : null;
      const sceneObserver = enabled ? new IntersectionObserver((entries) => {
        for (const entry of entries)
          entry.target.dataset.motionActive = entry.isIntersecting ? "true" : "false";
      }, { threshold: 0 }) : null;
      const updateScroll = () => {
        scrollFrame = 0;
        const distance = document.documentElement.scrollHeight - window.innerHeight;
        root.style.setProperty("--page-progress", String(distance > 0 ? clamp(window.scrollY / distance, 0, 1) : 0));
        root.dataset.scrolled = window.scrollY > 24 ? "true" : "false";
        for (const scene of scenes.keys()) {
          if (!scene.hasAttribute("data-parallax") || scene.dataset.motionActive === "false") continue;
          const bounds = scene.getBoundingClientRect();
          scene.style.setProperty("--scroll-y", String(clamp(-bounds.top * 0.045, -10, 18)));
        }
      };
      const scheduleScroll = () => {
        if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
      };
      const registerScene = (scene) => {
        if (scenes.has(scene)) return;
        scene.dataset.motionActive = "true";
        sceneObserver?.observe(scene);
        const reset = () => {
          scene.style.setProperty("--pointer-x", "0");
          scene.style.setProperty("--pointer-y", "0");
        };
        const move = (event) => {
          if (event.pointerType === "touch") return;
          const bounds = scene.getBoundingClientRect();
          scene.style.setProperty("--pointer-x", String(clamp((event.clientX - bounds.left) / bounds.width * 2 - 1, -1, 1)));
          scene.style.setProperty("--pointer-y", String(clamp((event.clientY - bounds.top) / bounds.height * 2 - 1, -1, 1)));
        };
        const hasPointer = pointer.matches && scene.hasAttribute("data-parallax");
        if (hasPointer) {
          scene.addEventListener("pointermove", move, { passive: true });
          scene.addEventListener("pointerleave", reset);
        }
        scenes.set(scene, () => {
          if (hasPointer) {
            scene.removeEventListener("pointermove", move);
            scene.removeEventListener("pointerleave", reset);
          }
          sceneObserver?.unobserve(scene);
          delete scene.dataset.motionActive;
          for (const key of ["--pointer-x", "--pointer-y", "--scroll-y"])
            scene.style.removeProperty(key);
        });
      };
      const scan = (node) => {
        if (!enabled) return;
        for (const scene of [
          ...(node.matches(SCENES) ? [node] : []), ...node.querySelectorAll(SCENES),
        ]) registerScene(scene);
        const elements = [
          ...(node.matches(REVEAL_TARGETS) ? [node] : []),
          ...node.querySelectorAll(REVEAL_TARGETS),
        ];
        for (const element of elements) {
          if (seen.has(element)) continue;
          seen.add(element);
          const bounds = element.getBoundingClientRect();
          // Keep deep links, focused fields, and already-scrolled content visible.
          if (
            bounds.bottom <= 0 ||
            !bounds.height ||
            element.contains(document.activeElement)
          )
            continue;
          const siblings = [...element.parentElement.children].filter((sibling) =>
            sibling.matches(REVEAL_TARGETS),
          );
          element.style.setProperty(
            "--reveal-delay",
            `${Math.min(Math.max(siblings.indexOf(element), 0), 4) * 80}ms`,
          );
          element.dataset.motion = "pending";
          pending.add(element);
          observer?.observe(element);
        }
      };
      const mutations = window.MutationObserver ? new MutationObserver((records) => {
        for (const record of records)
          for (const node of record.addedNodes)
            if (node.nodeType === 1) additions.add(node);
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          for (const element of pending) {
            if (root.contains(element)) continue;
            observer?.unobserve(element);
            pending.delete(element);
          }
          for (const [scene, release] of scenes)
            if (!root.contains(scene)) { release(); scenes.delete(scene); }
          for (const node of additions)
            if (root.contains(node)) scan(node);
          additions.clear();
          scheduleScroll();
        });
      }) : null;
      const revealFocused = (event) => {
        for (const element of pending)
          if (element.contains(event.target)) show(element);
      };
      const onVisibility = () => {
        root.classList.toggle("motion-inactive", document.hidden);
        if (!document.hidden) scheduleScroll();
      };

      scan(root);
      updateScroll();
      mutations?.observe(root, { childList: true, subtree: true });
      root.addEventListener("focusin", revealFocused);
      root.addEventListener("beforematch", revealFocused);
      window.addEventListener("scroll", scheduleScroll, { passive: true });
      window.addEventListener("resize", scheduleScroll, { passive: true });
      document.addEventListener("visibilitychange", onVisibility);
      stop = () => {
        cancelAnimationFrame(frame);
        cancelAnimationFrame(scrollFrame);
        mutations?.disconnect();
        observer?.disconnect();
        sceneObserver?.disconnect();
        for (const release of scenes.values()) release();
        root.removeEventListener("focusin", revealFocused);
        root.removeEventListener("beforematch", revealFocused);
        window.removeEventListener("scroll", scheduleScroll);
        window.removeEventListener("resize", scheduleScroll);
        document.removeEventListener("visibilitychange", onVisibility);
        for (const element of root.querySelectorAll("[data-motion]")) {
          delete element.dataset.motion;
          element.style.removeProperty("--reveal-delay");
        }
      };
    };
    const changeMotion = (event) => {
      if (typeof event.detail?.paused !== "boolean") return;
      paused = event.detail.paused;
      configure();
    };
    const syncStorage = (event) => {
      if (event.key !== "4english.motion.paused") return;
      paused = event.newValue === "1";
      window.dispatchEvent(new CustomEvent("4english:motion-change", { detail: { paused } }));
    };

    configure();
    preference.addEventListener("change", configure);
    pointer.addEventListener("change", configure);
    window.addEventListener("4english:motion-change", changeMotion);
    window.addEventListener("storage", syncStorage);
    return () => {
      stop();
      preference.removeEventListener("change", configure);
      pointer.removeEventListener("change", configure);
      window.removeEventListener("4english:motion-change", changeMotion);
      window.removeEventListener("storage", syncStorage);
    };
  }, []);

  return <div ref={scope} className="motion-root">{children}</div>;
}
