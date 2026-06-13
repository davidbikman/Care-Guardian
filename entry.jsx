import React from "react";
import { createRoot } from "react-dom/client";
import App from "./dashboard.jsx";
window.__mount=()=>{ createRoot(document.getElementById("root")).render(<App/>); };
