import { hydrateRoot, createRoot } from "react-dom/client";
import App from "./App";
import {installAmbientMusic} from "./ambient-music";
import "@fontsource/cardo/latin-400.css";
import "@fontsource/cardo/latin-400-italic.css";
import "@fontsource/lato/latin-400.css";
import "@fontsource/lato/latin-700.css";
import "@fontsource/roboto-mono/latin-600.css";
import "./globals.css";
import "./reference-motion.css";
import "./theme.css";

const root = document.getElementById("root")!;
if (root.hasChildNodes()) hydrateRoot(root, <App />);
else createRoot(root).render(<App />);

// The soundtrack is optional and has no visible controls.
installAmbientMusic();
