import { renderToString } from "react-dom/server";
import App, {AskMePage,BlogPage,AboutPage} from "./App";
import Gallery from "./gallery";
import SiteDesign from "./site-design";
export function render() { return renderToString(<App />); }

export function renderAskMe() { return renderToString(<AskMePage />); }

export function renderBlog(){ return renderToString(<BlogPage />); }

export function renderAbout(){ return renderToString(<><SiteDesign/><AboutPage/></>); }
export function renderGallery(){ return renderToString(<><SiteDesign/><Gallery/></>); }
