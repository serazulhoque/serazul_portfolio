import snapshot from "./site-snapshot.json" with { type: "json" };
import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { DATA_URL, PUBLIC_HEADERS, requestJSON } from "./public-api";

export type LiveSiteData = {
  pageCopy: unknown;
  items: unknown[];
  labels: Record<string, string>;
  design: Record<string, unknown>;
  fresh: boolean;
};

const initial: LiveSiteData = {
  pageCopy: snapshot.pageCopy,
  items: snapshot.items,
  labels: snapshot.labels,
  design: { layout_config: snapshot.layout },
  fresh: false
};

const SiteContext = createContext<LiveSiteData>(initial);
export const useLiveSite = () => useContext(SiteContext);

// The head begins the request while the browser downloads the React bundle.
// Reuse that request here to avoid starting the network round-trip after hydration.
declare global {
  interface Window {
    __portfolioFreshRequest?: Promise<unknown>;
  }
}
const PORTFOLIO_URL = DATA_URL + "/rpc/get_portfolio_public_content";

async function getFreshSiteData(signal: AbortSignal): Promise<LiveSiteData> {
  const prefetched = window.__portfolioFreshRequest;
  window.__portfolioFreshRequest = undefined;
  let result = prefetched ? await prefetched : null;
  if (!result)
    result = await requestJSON<unknown>(PORTFOLIO_URL, {
      headers: PUBLIC_HEADERS, signal
    }, 10000);
  if (signal.aborted) throw new Error("Cancelled");
  if (!result || typeof result !== "object" || Array.isArray(result))
    throw new Error("Published content is unavailable.");

  const data = result as Record<string, unknown>;
  const page = data.pageCopy;
  const items = data.items;
  const labels = data.labels;
  const design = data.design;
  if (!page || typeof page !== "object" || Array.isArray(page) ||
      typeof (page as Record<string, unknown>).hero_line_one !== "string" ||
      !Array.isArray(items) ||
      !labels || typeof labels !== "object" || Array.isArray(labels) ||
      !design || typeof design !== "object" || Array.isArray(design))
    throw new Error("Published content is incomplete.");

  const publicLabels: Record<string, string> = {};
  for (const [key, value] of Object.entries(labels))
    if (typeof value === "string") publicLabels[key] = value;
  return {
    pageCopy: page,
    items,
    labels: publicLabels,
    design: design as Record<string, unknown>,
    fresh: true
  };
}

export function LiveSiteProvider({ children }: { children: ReactNode }) {
  // Server HTML and the first hydration render must agree. The early head script
  // hides the old build snapshot until an up-to-date response has been committed.
  const [data, setData] = useState<LiveSiteData>(initial);
  const [attempt, setAttempt] = useState(0);

  useLayoutEffect(() => {
    if (!data.fresh) return;
    // Child layout effects update live theme/design before the page is shown.
    const frame = requestAnimationFrame(() => {
      document.documentElement.dataset.siteFresh = "ready";
    });
    return () => cancelAnimationFrame(frame);
  }, [data]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    async function refresh() {
      document.documentElement.dataset.siteFresh = "loading";
      try {
        const next = await getFreshSiteData(controller.signal);
        if (active && !controller.signal.aborted) setData(next);
      } catch {
        if (active && !controller.signal.aborted) {
          document.documentElement.dataset.siteFresh = "error";
        }
      }
    }
    void refresh();
    return () => { active = false; controller.abort(); };
  }, [attempt]);

  // A tab returning from the admin dashboard or browser back/forward cache must
  // recheck the database rather than revealing the old in-memory version.
  useEffect(() => {
    const onReturn = (event: PageTransitionEvent) => {
      if (event.persisted) setAttempt(value => value + 1);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") setAttempt(value => value + 1);
    };
    const onLeave = () => {
      if (document.documentElement.dataset.siteFresh === "ready")
        document.documentElement.dataset.siteFresh = "loading";
    };
    window.addEventListener("pageshow", onReturn);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pagehide", onLeave);
    return () => {
      window.removeEventListener("pageshow", onReturn);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pagehide", onLeave);
    };
  }, []);

  return <SiteContext.Provider value={data}>{children}</SiteContext.Provider>;
}
