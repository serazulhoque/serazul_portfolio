import { renderToString } from "react-dom/server";
import App, {AskMePage} from "./App";
export function render() { return renderToString(<App />); }

export function renderAskMe() { return renderToString(<AskMePage />); }
