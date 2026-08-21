import { createRoot } from "react-dom/client";
import { inject } from "@vercel/analytics";
import App from "./App";
import "./index.css";
import { redirectLegacyHashLocation } from "@/lib/routing";

inject();
redirectLegacyHashLocation();

createRoot(document.getElementById("root")!).render(<App />);
