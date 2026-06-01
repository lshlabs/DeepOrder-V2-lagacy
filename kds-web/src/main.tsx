import React from "react";
import { createRoot } from "react-dom/client";

function App() {
  return (
    <main>
      <h1>DeepOrder KDS</h1>
      <p>KDS Web skeleton is ready.</p>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

