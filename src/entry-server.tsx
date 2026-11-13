import { renderToString } from "react-dom/server";
import type { ReactNode } from "react";
import App, {AskMePage,BlogPage,AboutPage,ContactPage} from "./App";
import Gallery from "./gallery";
import SiteDesign from "./site-design";
import {LiveSiteProvider} from "./live-site";

export function render() { return renderToString(<App />); }

// Use exactly the same provider and layout as the browser on clean URLs.
// Otherwise hydration can briefly replay older database text or styling.
function renderPage(page: ReactNode) {
  return renderToString(<LiveSiteProvider><SiteDesign/>{page}</LiveSiteProvider>);
}
export function renderAskMe() { return renderPage(<AskMePage />); }
export function renderBlog() { return renderPage(<BlogPage />); }
export function renderAbout() { return renderPage(<AboutPage />); }
export function renderGallery() { return renderPage(<Gallery />); }
export function renderContact() { return renderPage(<ContactPage />); }
