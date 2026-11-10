import { renderToString } from "react-dom/server";
import App, {AskMePage,BlogPage} from "./App";
export function render() { return renderToString(<App />); }

export function renderAskMe() { return renderToString(<AskMePage />); }

export function renderBlog(){ return renderToString(<BlogPage />); }
