import { createRoot } from "react-dom/client";
import "./index.css";
import "./public.css";
import "./motion.css";
import App from "./App.jsx";
import { MotionRoot } from "./motion.jsx";

createRoot(document.getElementById("root")).render(
  <MotionRoot>
    <App />
  </MotionRoot>,
);
