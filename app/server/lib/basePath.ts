import { getHomeUrl } from "app/server/lib/gristSettings";

import * as http from "http";

/**
 * Support for hosting Grist under a base path (e.g. https://example.com/grist/).
 *
 * The base path is configured with the GRIST_BASE_PATH environment variable, and
 * defaults to the path component of APP_HOME_URL. When set, incoming request URLs
 * have the prefix stripped before routing (so the reverse proxy may forward request
 * paths unchanged), and generated URLs and redirects have the prefix prepended.
 * Requests without the prefix keep working, so health checks and internal
 * (in-network) traffic are unaffected.
 */

let _cachedBasePath: string | undefined;

/**
 * Normalize a base path: ensure a leading slash, remove trailing slashes.
 * Returns "" for an unset or root ("/") base path.
 */
export function normalizeBasePath(basePath: string | undefined): string {
  if (!basePath) { return ""; }
  const withLeadingSlash = basePath.startsWith("/") ? basePath : `/${basePath}`;
  return withLeadingSlash.replace(/\/+$/, "");
}

/**
 * The normalized base path Grist is hosted under, or "" when hosted at the root.
 * Read from GRIST_BASE_PATH, else derived from the path of APP_HOME_URL. Setting
 * GRIST_BASE_PATH to an empty string forces hosting at the root.
 */
export function getAppBasePath(): string {
  if (_cachedBasePath === undefined) {
    let basePath = process.env.GRIST_BASE_PATH;
    if (basePath === undefined) {
      const homeUrl = getHomeUrl();
      if (homeUrl) {
        try {
          basePath = new URL(homeUrl).pathname;
        } catch {
          basePath = "";
        }
      }
    }
    _cachedBasePath = normalizeBasePath(basePath);
  }
  return _cachedBasePath;
}

/** Reset the cached base path; used by tests when the environment changes. */
export function resetAppBasePathCache(): void {
  _cachedBasePath = undefined;
}

/**
 * Prefix a root-absolute path (optionally with query) with the configured base path.
 */
export function prependAppBasePath(path: string): string {
  return getAppBasePath() + path;
}

/**
 * Remove the configured base path prefix from req.url, if present. Idempotent:
 * the request is marked, so running both at the raw webserver level and as
 * express middleware cannot strip a matching path twice. Only whole path
 * segments match, so a base path of "/grist" does not affect "/gristly/doc".
 */
export function stripBasePathFromRequest(req: http.IncomingMessage): void {
  const basePath = getAppBasePath();
  const anyReq = req as http.IncomingMessage & { _gristBasePathStripped?: boolean };
  if (!basePath || anyReq._gristBasePathStripped) { return; }
  anyReq._gristBasePathStripped = true;
  const url = req.url || "";
  if (url === basePath || url.startsWith(`${basePath}/`) || url.startsWith(`${basePath}?`)) {
    const stripped = url.slice(basePath.length);
    req.url = stripped.startsWith("?") ? `/${stripped}` : (stripped || "/");
  }
}

/**
 * Join a URL that may itself contain a path (such as APP_HOME_URL with a base
 * path) with a relative or root-absolute path. Unlike `new URL(relPath, base)`,
 * a root-absolute relPath does not discard the base URL's own path.
 */
export function joinUrlWithPath(baseUrl: string, relPath: string = ""): string {
  const url = new URL(baseUrl);
  if (!relPath) { return url.href; }
  const queryIndex = relPath.indexOf("?");
  const pathPart = queryIndex >= 0 ? relPath.slice(0, queryIndex) : relPath;
  const queryPart = queryIndex >= 0 ? relPath.slice(queryIndex) : "";
  url.pathname = url.pathname.replace(/\/+$/, "") +
    (pathPart.startsWith("/") ? pathPart : `/${pathPart}`);
  if (queryPart) { url.search = queryPart; }
  return url.href;
}
