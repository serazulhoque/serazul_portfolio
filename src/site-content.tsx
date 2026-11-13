import { useMemo } from "react";
import {styleFor,type LayoutConfig} from "./site-layout";
import {useLiveSite} from "./live-site";

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
  const {items: rawItems, labels: rawLabels, fresh} = useLiveSite();
  const items = useMemo(() =>
    Array.isArray(rawItems) ? rawItems.filter(isEntry) : [],
  [rawItems]) as SiteEntry[];
  const labels = useMemo(() =>
    isLabels(rawLabels) ? rawLabels : {},
  [rawLabels]);
  return { items, entriesLoaded: fresh, labels, labelsLoaded: fresh };
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
