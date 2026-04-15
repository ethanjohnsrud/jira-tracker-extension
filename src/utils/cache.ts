import { getFromStorage, saveToStorage, getSettings } from "../controllers/storageController";
import { DEBUG_MODE } from "./state";
import { isAgoUrl } from "./url";
import { AGO_URL_REGEX } from "../constants/regex";

/* Interval Clear Cache */
let cacheInterval: ReturnType<typeof setInterval> | null = null;
let cacheUrl: string = "";

/** Create cache URL for local AGO environment */
export async function createCacheURL(url: string): Promise<string | null> {
  if (!isAgoUrl(url)) {
    if (DEBUG_MODE) console.log("[createCacheURL] Not an AGO URL");
    return null;
  }
  const matched = url.match(AGO_URL_REGEX);
  if (!matched || matched.length < 4) {
    if (DEBUG_MODE) console.log("[createCacheURL] Regex failed", matched);
    return null;
  }
  const settings = await getSettings();
  const regionValue = matched[2];
  const environmentValue = matched[4];
  const localEnvironmentValue = settings.ENVIRONMENTS.find((l) => l.label === "Local")?.value;
  if (environmentValue !== localEnvironmentValue) {
    if (DEBUG_MODE) console.log("[createCacheURL] Not local environment");
    return null;
  }
  const cacheRoute = settings.ROUTES.find((r) => r.label === "Cache");
  if (!cacheRoute) {
    if (DEBUG_MODE) console.error("[createCacheURL] Cache route not found");
    return null;
  }
  cacheUrl = `https://${regionValue}.${environmentValue}/${cacheRoute.value}`;
  if (DEBUG_MODE) console.log("[createCacheURL] cacheUrl:", cacheUrl);
  return cacheUrl;
}

/**
 * Clears the local cache by making a GET request to the cache URL.
 * @returns True if cache was cleared, false otherwise
 */
export async function clearCache(): Promise<boolean> {
  if (!cacheUrl || cacheUrl.length === 0) {
    if (DEBUG_MODE) console.log("[CONTENT][clearCache] Blocked", cacheUrl);
    return false;
  }
  try {
    const { preferences } = await getFromStorage("preferences");
    if (!preferences?.localCacheClearing) {
      if (DEBUG_MODE) console.log("[CONTENT][clearCache] disabled");
      return false;
    }
    const res = await fetch(cacheUrl, { method: "GET", credentials: "include" }); // includes cookies automatically from content context
    if (res.status !== 200) {
      if (DEBUG_MODE) console.warn("[CONTENT][clearCache] Unavailable", res.status, cacheUrl);
      return false;
    }
    if (DEBUG_MODE) console.log("[CONTENT][clearCache] Cleared", res.status, cacheUrl);
    return true;
  } catch (e) {
    if (DEBUG_MODE) console.error("[CONTENT][clearCache] Error:", e);
    return false;
  }
}

/** Start the cache polling interval */
export async function startCachePolling(): Promise<void> {
  stopCachePolling();
  if (cacheUrl && cacheUrl.length > 10) {
    if (DEBUG_MODE) console.log("[startCachePolling] Starting", cacheUrl);
    const settings = await getSettings();
    cacheInterval = setInterval(async () => {
      await clearCache();
      const nextDate = new Date(Date.now() + settings.CONSTANTS.LOCAL_CACHE_INTERVAL);
      await saveToStorage({ nextTimerMS: nextDate.getTime() });
    }, settings.CONSTANTS.LOCAL_CACHE_INTERVAL);

    //Execute Immediately:
    await clearCache();
  } else {
    if (DEBUG_MODE) console.log("[startCachePolling] Invalid URL", cacheUrl);
  }
}

/** Stop the cache polling interval */
export async function stopCachePolling(): Promise<void> {
  if (cacheInterval) {
    clearInterval(cacheInterval);
    cacheInterval = null;
    if (DEBUG_MODE) console.log("[CONTENT][stopCachePolling] Stopped");
  }
}
