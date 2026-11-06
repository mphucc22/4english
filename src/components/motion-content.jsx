// Keep a single readable phrase for assistive technology while CSS animates
// the visual words. Whitespace stays as text so wrapping remains natural.
export function MotionText({ text = "", startIndex = 0, className = "" }) {
  let wordIndex = startIndex;
  return (
    <span className={`motion-text ${className}`.trim()}>
      <span className="visually-hidden">{text}</span>
      <span className="motion-text-visual" aria-hidden="true">
        {text.split(/(\s+)/u).map((token, index) => {
          if (!token || /^\s+$/u.test(token)) return token;
          const order = wordIndex++;
          return (
            <span className="motion-word" key={`${index}-${token}`}>
              <span style={{ "--word-index": order }}>{token}</span>
            </span>
          );
        })}
      </span>
    </span>
  );
}

const SKILLS = [
  "Tiếng Anh giao tiếp",
  "Luyện thi IELTS",
  "Tiếng Anh thiếu nhi",
  "Tự tin mở lời",
  "Học theo lộ trình",
];

export function SkillRibbon() {
  return (
    <div className="skill-ribbon" aria-label="Cùng 4ENGLISH mở rộng khả năng">
      <div className="skill-ribbon-track">
        {[0, 1].map((copy) => (
          <ul className="skill-ribbon-list" key={copy} aria-hidden={copy === 1 ? true : undefined}>
            {SKILLS.map((skill) => (
              <li key={skill}>
                <span className="skill-ribbon-star" aria-hidden="true">✦</span>
                {skill}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
