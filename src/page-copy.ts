import { useLiveSite } from "./live-site";
import { parsePageCopy } from "./page-copy-utils";
export { parsePageCopy } from "./page-copy-utils";

export function useLivePageCopy() {
  const { pageCopy } = useLiveSite();
  return parsePageCopy(pageCopy);
}
