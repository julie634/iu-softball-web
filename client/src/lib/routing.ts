/** Map old hash-router bookmarks (`#/roster/abc`) onto path URLs. */
export function pathFromLegacyHash(hash: string): string | null {
  if (!hash.startsWith("#/")) return null;
  const raw = hash.slice(1);
  if (!raw || raw === "/") return "/";
  const [pathPart, query = ""] = raw.split("?");
  const path = pathPart.replace(/^\/roster\/([^/]+)$/, "/player/$1");
  return query ? `${path}?${query}` : path;
}

export function redirectLegacyHashLocation(
  location: Pick<Location, "hash" | "search" | "pathname"> = window.location,
  replace: (url: string) => void = (url) => window.history.replaceState(null, "", url),
): string | null {
  const next = pathFromLegacyHash(location.hash);
  if (!next) return null;
  const search = location.search || "";
  replace(`${next}${search}`);
  return next;
}
