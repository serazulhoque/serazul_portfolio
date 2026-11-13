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

// This is a single, authoritative fetch for all dashboard-managed public data.
// Unlike build-time snapshots, successful requests reflect the database now.
async function getFreshSiteData(signal: AbortSignal): Promise<LiveSiteData> {
  const [page, entries, labels, design] = await Promise.all([
    requestJSON<unknown>(DATA_URL + "/page_sections?select=*&id=eq.1", { headers: PUBLIC_HEADERS, signal }),
    requestJSON<unknown>(DATA_URL +
      "/site_content_entries?select=id,section,kind,title,subtitle,body,date_label,sort_order&is_published=eq.true&order=sort_order.asc,created_at.asc&limit=300",
      { headers: PUBLIC_HEADERS, signal }),
    requestJSON<unknown>(DATA_URL + "/site_editable_text?select=key,value&limit=100",
      { headers: PUBLIC_HEADERS, signal }),
    requestJSON<unknown>(DATA_URL + "/site_design_settings?select=*&id=eq.1",
      { headers: PUBLIC_HEADERS, signal })
  ]);
  if (!Array.isArray(page) || !page[0] || typeof page[0].hero_line_one !== "string" ||
      !Array.isArray(entries) || !Array.isArray(labels) ||
      !Array.isArray(design) || !design[0] || typeof design[0] !== "object") {
    throw new Error("Published content is incomplete.");
  }
  const text: Record<string, string> = {};
  for (const item of labels) {
    if (item && typeof item.key === "string" && typeof item.value === "string")
      text[item.key] = item.value;
  }
  return { pageCopy: page[0], items: entries, labels: text,
    design: design[0] as Record<string, unknown>, fresh: true };
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
      const message = document.getElementById("site-content-loading");
      if (message) message.textContent = "Loading the latest website content…";
      try {
        const next = await getFreshSiteData(controller.signal);
        if (active && !controller.signal.aborted) setData(next);
      } catch {
        if (active && !controller.signal.aborted) {
          document.documentElement.dataset.siteFresh = "error";
          if (message) {
            message.replaceChildren();
            const note = document.createElement("p");
            note.textContent = "The latest content could not be loaded. The older version is being hidden.";
            const retryLink = document.createElement("a");
            retryLink.href = window.location.href;
            retryLink.textContent = "Try again";
            message.append(note, retryLink);
          }
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
