import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/gowun-dodum/400.css";
import "./index.css";
import App from "./App";
import { AuthGate } from "./components/auth-gate";
document.title = "홀로서기 상담관리";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthGate>
      <App />
    </AuthGate>
  </React.StrictMode>,
);
