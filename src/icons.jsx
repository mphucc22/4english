const paths = {
  menu: "M4 6h16 M4 12h16 M4 18h16",
  clock: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20 M12 6v6l4 2",
  chat: "M21 11a9 9 0 0 1-9 9H3l2-5a9 9 0 1 1 16-4 M8 10h8 M8 14h5",
  sparkles:
    "m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z M20 2v4 M18 4h4 M3 18v4 M1 20h4",
  "arrow-left": "M20 12H4 m6-6-6 6 6 6",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12 M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
  "eye-off":
    "m3 3 18 18 M10 5a13 13 0 0 1 2 0c6 0 10 7 10 7a21 21 0 0 1-4 5 M6 6a22 22 0 0 0-4 6s4 7 10 7a13 13 0 0 0 5-1 M10 10a3 3 0 0 0 4 4",
  chevron: "m6 9 6 6 6-6",
  dashboard: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  classes: "M4 21V5l8-3 8 3v16 M8 9h1 M15 9h1 M8 13h1 M15 13h1 M10 21v-4h4v4",
  timetable:
    "M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2 M7 2v4 M17 2v4 M3 10h18 M8 14h2 M14 14h2 M8 17h2",
  students: "m2 8 10-5 10 5-10 5z M6 10v6c4 3 8 3 12 0v-6 M22 8v8",
  enrollments: "M5 3h10l4 4v14H5z M14 3v5h5 M8 12h8 M8 16h5",
  payments: "M3 5h18v14H3z M3 10h18 M6 15h4",
  requests: "M3 5h18v14H3z M3 5l9 8 9-8",
  attendance: "M8 3H4v18h16V3h-4 M8 2h8v4H8z m0 12 3 3 5-6",
  staff:
    "M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M1 21v-3a7 7 0 0 1 14 0v3 M16 4a4 4 0 0 1 0 8 M19 15a6 6 0 0 1 4 6",
  master:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2",
  leads: "M4 3h5l1 5-3 2a15 15 0 0 0 7 7l2-3 5 1v5c-9 2-19-8-17-17",
  reports: "M4 3v18h18 M8 17v-4 M13 17V8 M18 17V4",
  system: "M3 3h18v14H3z M8 21h8 M12 17v4 M7 7h10 M7 11h5",
  book: "M12 5C7 2 3 3 2 4v16c4-2 7-1 10 1 3-2 6-3 10-1V4c-1-1-5-2-10 1z M12 5v16",
  arrow: "M4 12h16 m-6-6 6 6-6 6",
  check: "m5 12 4 4L19 6",
  close: "m6 6 12 12 M6 18 18 6",
  logout: "M9 4H3v16h6 M10 12h12 m-4-4 4 4-4 4",
  shield: "m12 2 9 4v6c0 5-4 8-9 10-5-2-9-5-9-10V6z m-4 10 3 3 5-6",
  globe:
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20 M2 12h20 M12 2c-5 5-5 15 0 20 5-5 5-15 0-20",
  search: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 m5 12 6 6",
  pin: "M12 22s8-8 8-14a8 8 0 0 0-16 0c0 6 8 14 8 14 M12 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
  money: "M12 2v20 M17 6H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H6",
  refresh:
    "M3 10a9 9 0 0 1 16-5l2 3 M21 3v5h-5 M21 14A9 9 0 0 1 5 19l-2-3 M3 21v-5h5",
};
export function Icon({ name = "book", size = 20, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={paths[name] || paths.book} />
    </svg>
  );
}
export function Brand({ compact = false, dark = false }) {
  return (
    <a href="/" className={`brand ${dark ? "brand-dark" : ""}`}>
      <span className="brand-mark">
        <svg viewBox="0 0 36 36" fill="none" aria-hidden="true">
          <path
            d="M20 7 9 22h18 M22 7v23"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span>
        <b>
          4<span className="brand-english">ENGLISH</span>
        </b>
        {!compact && <small>HỌC TỰ TIN · VƯƠN XA HƠN</small>}
      </span>
    </a>
  );
}
