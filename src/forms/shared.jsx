import { R, CFG } from "../lib/rules.js";
export const Hint = ({ children }) => (
  <p className="mt-2 text-sm text-slate-500">{children}</p>
);
export const seats = (db, c) => CFG.maxStudents - R.live(db, c.id).length;
