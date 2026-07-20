import React from "react";
import { createRoot } from "react-dom/client";

import "antd/dist/reset.css";
import App from "@/app/App";
import "@/app/styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
