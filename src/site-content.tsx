import snapshot from "./site-snapshot.json";
import { useEffect, useState } from "react";
import {styleFor,type LayoutConfig} from "./site-layout";
import {
  DATA_URL,
  PUBLIC_HEADERS,
  requestJSON,
  refreshAfterFirstPaint
} from "./public-api";

export type SiteEntry = {
  id: string;
  section: "home" | "about" | "contact" | "publications" | "exploring";
  kind: "story" | "timeline" | "experience";
  title: string;
  subtitle: string;
  body: string;
  date_label: string;
  sort_order: number;
};
type SiteData = {
  items: SiteEntry[];
  entriesLoaded: boolean;
  labels: Record<string, string>;
  labelsLoaded: boolean;
};
function isEntry(value: unknown): value is SiteEntry {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    ["id", "section", "kind", "title", "subtitle", "body", "date_label"].every(
      (key) => typeof item[key] === "string",
    ) &&
    typeof item.sort_order === "number" &&
    Number.isFinite(item.sort_order)
  );
}
function isLabels(value: unknown): value is Record<string, string> {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.values(value).every((text) => typeof text === "string")
  );
}
export function useSiteContent(): SiteData {
  const [items, setItems] = useState<SiteEntry[]>(() => snapshot.items.filter(isEntry) as SiteEntry[]);
  const [entriesLoaded, setEntriesLoaded] = useState(snapshot.pageCopy !== null);
  const [labels, setLabels] = useState<Record<string, string>>(() => isLabels(snapshot.labels) ? snapshot.labels : {});
  const [labelsLoaded, setLabelsLoaded] = useState(snapshot.pageCopy !== null);
  useEffect(() => {
    const controller = new AbortController();
    refreshAfterFirstPaint(() => {
    requestJSON<unknown>(
      DATA_URL +
        "/site_content_entries?select=id,section,kind,title,subtitle,body,date_label,sort_order&is_published=eq.true&order=sort_order.asc,created_at.asc&limit=300",
      { signal: controller.signal, cache: "no-store", headers: PUBLIC_HEADERS },
    )
      .then((data) => {
        if (controller.signal.aborted || !Array.isArray(data)) return;
        const valid = data.filter(isEntry);
        setItems(previous => JSON.stringify(previous) === JSON.stringify(valid) ? previous : valid);
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setEntriesLoaded(true);
      });
    requestJSON<unknown>(
      DATA_URL + "/site_editable_text?select=key,value&limit=100",
      { signal: controller.signal, cache: "no-store", headers: PUBLIC_HEADERS },
    )
      .then((data) => {
        if (controller.signal.aborted || !Array.isArray(data)) return;
        const values: Record<string, string> = {};
        for (const item of data)
          if (
            item &&
            typeof item.key === "string" &&
            typeof item.value === "string"
          )
            values[item.key] = item.value;
        setLabels(previous => JSON.stringify(previous) === JSON.stringify(values) ? previous : values);
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setLabelsLoaded(true);
      });
    }, controller.signal);
    return () => controller.abort();
  }, []);
  return { items, entriesLoaded, labels, labelsLoaded };
}
export function textValue(
  values: Record<string, string>,
  key: string,
  fallback: string,
): string {
  return typeof values[key] === "string" ? values[key] : fallback;
}
export function ContentStories({
  items,
  section,
  layout,
  page,
}: {
  items: SiteEntry[];
  section: SiteEntry["section"];
  layout?:LayoutConfig;
  page?:"home"|"blog";
}) {
  const stories = items.filter(
    (i) => i.section === section && i.kind === "story"
      && (!page||layout?.content_pages?.[i.id]?.[page]!==false),
  );
  if (!stories.length) return null;
  return (
    <div className="extra-stories wrap" aria-label={"More about " + section}>
      {stories.map((item) => (
        <article key={item.id} className="extra-story">
          {item.date_label && (
            <span className="extra-story-kicker">{item.date_label}</span>
          )}
          <h3 data-edit-key={"content:"+item.id+":title"} style={layout?styleFor(layout,"content:"+item.id,"title"):undefined}>{item.title}</h3>
          {item.subtitle && (
            <p className="extra-story-subtitle">{item.subtitle}</p>
          )}
          {item.body && <p className="extra-story-body" data-edit-key={"content:"+item.id+":body"} style={layout?styleFor(layout,"content:"+item.id,"body"):undefined}>{item.body}</p>}
        </article>
      ))}
    </div>
  );
}
