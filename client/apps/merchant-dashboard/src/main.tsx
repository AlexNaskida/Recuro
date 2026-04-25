import "@/polyfills";
import { Buffer } from "buffer";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { PrivyAppProvider } from "./lib/privy";

globalThis.Buffer = Buffer;

createRoot(document.getElementById("root")!).render(
  <PrivyAppProvider>
    <App />
  </PrivyAppProvider>,
);
