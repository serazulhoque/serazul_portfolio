// These are public addresses and a publishable key, never admin credentials.
export const API_URL = "https://serazul-backend.vercel.app/api/public";
export const DATA_URL = "https://krtnmzfucyfgalxvnuwj.supabase.co/rest/v1";
export const PUBLIC_HEADERS = {
  apikey: "sb_publishable_JBm0UjGe5L4S2FfLxwimGw_E0PTjx0N",
};

// One place for HTTP errors, timeouts and cancellation. Never retry writes
// automatically: a timed-out submission may already have reached the server.
export async function requestJSON<T>(
  url: string,
  options: RequestInit = {},
  timeoutMs = 15000,
): Promise<T> {
  const controller = new AbortController();
  const cancel = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) cancel();
  else options.signal?.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(
    () =>
      controller.abort(
        new Error("The connection timed out. Please try again later."),
      ),
    timeoutMs,
  );
  try {
    const response = await fetch(url, {
      credentials: "omit",
      cache: "no-store",
      ...options,
      signal: controller.signal,
    });
    if (!response.ok)
      throw new Error(
        "The request could not be completed. Please try again later.",
      );
    return response.status === 204 ? (null as T) : await response.json();
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", cancel);
  }
}

export function readCache(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}
export function writeCache(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Cached content is optional when storage is unavailable or full. */
  }
}

// Keep background content updates from competing with the initial page render.
// The published snapshot is already visible in HTML, even on slow connections.
export function refreshAfterFirstPaint(work: () => void, signal: AbortSignal): void {
  if (typeof window === "undefined") return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const start = () => {
    if (signal.aborted) return;
    timer = setTimeout(() => { if (!signal.aborted) work(); }, 700);
  };
  if (document.readyState === "complete") start();
  else {
    window.addEventListener("load", start, { once: true, signal });
    // Do not stall refresh forever because of a slow image or analytics request.
    timer = setTimeout(() => {
      window.removeEventListener("load", start);
      if (!signal.aborted) work();
    }, 2400);
  }
  signal.addEventListener("abort", () => { if (timer) clearTimeout(timer); }, { once: true });
}
