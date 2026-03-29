import { v4 as uuidv4 } from "uuid";
import { getFromStorage, saveToStorage } from "../controllers/storageController";
import { AGO_REGEX, JIRA_REGEX, MAX_LIST_LENGTH } from "../constants/constants";
import { JiraUrlListItem, StorageKey, UrlListItem } from "../types/storage-types";
import { DEBUG_MODE } from "./state";
import ENVIRONMENTS from "../constants/environments";

/** Derives display name for JIRA and AGO URLs */
export const getListEntryDisplayName = (url: string, jiraSprint: string | null, agoClientName: string | null) => {
  if (JIRA_REGEX.test(url)) {
    const match = url.match(JIRA_REGEX)!;
    const name = match[2] + (jiraSprint && jiraSprint.length > 0 ? ` [${jiraSprint}]` : "");
    if (DEBUG_MODE) console.log("[BACKGROUND][getListEntryDisplayName] JIRA name", name);
    return name;
  } else if (AGO_REGEX.test(url)) {
    const groups = url.match(AGO_REGEX);
    if (!groups || groups.length < 5) {
      if (DEBUG_MODE) console.log("[BACKGROUND][getListEntryDisplayName] Invalid AGO Match", url, groups);
      return "AGO";
    }

    const region = groups[2].toUpperCase();
    const environmentPrefix = (
      ENVIRONMENTS.find((e) => e.value === groups[3] || e.value === groups[4])?.prefix || "ENV"
    ).toUpperCase();
    const clientSuffix = groups[5];
    const planSuffix = groups[6];
    const display =
      agoClientName && agoClientName.length > 0
        ? `${region}-${environmentPrefix}-${agoClientName}`
        : `${region}-${environmentPrefix}-${clientSuffix}-${planSuffix}`;

    if (DEBUG_MODE)
      console.log(
        "[BACKGROUND][getListEntryDisplayName] AGO name",
        display,
        "from:",
        region,
        environmentPrefix,
        clientSuffix,
        planSuffix
      );
    return display;
  } else {
    if (DEBUG_MODE) console.error("[BACKGROUND][getListEntryDisplayName] No regex match", url);
    return false;
  }
};

/** Trims URL list to MAX_LIST_LENGTH removing oldest non-favorites */
export const evaluateMaxListLength = (urlList: UrlListItem[]) => {
  if (urlList.length > MAX_LIST_LENGTH) {
    urlList.sort((a, b) => new Date(a.lastVisited).getTime() - new Date(b.lastVisited).getTime());
    const idx = urlList.findIndex((u) => u.favorite === false);
    if (idx !== -1) urlList.splice(idx, 1);
  }
  if (DEBUG_MODE) console.log("[BACKGROUND][evaluateMaxListLength] List length", urlList.length);
  return urlList;
};

/** Processes and saves visited URLs into storage lists */
export const saveJiraUrl = async (url: string, jiraSprint: string) => {
  const isJiraUrl = JIRA_REGEX.test(url);
  if (!isJiraUrl) {
    if (DEBUG_MODE) console.log("[BACKGROUND][saveJiraUrl] Not Jira URL", url, JIRA_REGEX);
    return false;
  }

  const storageKey: StorageKey = "jiraUrlList";
  const { jiraUrlList } = await getFromStorage(storageKey);
  const urlList: JiraUrlListItem[] = Array.isArray(jiraUrlList) ? jiraUrlList : [];

  const capturedUrl = url.match(JIRA_REGEX)?.[1];
  if (DEBUG_MODE) console.log("[BACKGROUND][saveJiraUrl] Captured:", capturedUrl);

  if (!capturedUrl) {
    if (DEBUG_MODE) console.log("[BACKGROUND][saveJiraUrl] URL Not Captured", url);
    return false;
  }

  const displayName = getListEntryDisplayName(url, jiraSprint, null);
  if (!displayName) return false;

  let updatedUrlList = [];
  const existing = urlList.find((u) => u.url === capturedUrl);
  if (existing) {
    if (DEBUG_MODE) console.log("[BACKGROUND][saveJiraUrl] Revisiting:", displayName);
    existing.lastVisited = new Date().toISOString();
    if (!existing.preserveCustomName) existing.displayName = displayName;
    updatedUrlList = urlList;
  } else {
    urlList.push({
      id: uuidv4(),
      url: capturedUrl,
      displayName,
      lastVisited: new Date().toISOString(),
      favorite: false,
      preserveCustomName: false,
    });
    updatedUrlList = evaluateMaxListLength(urlList);
    if (DEBUG_MODE) console.log("[BACKGROUND][saveJiraUrl] New Entry:", capturedUrl);
  }

  await saveToStorage({ [storageKey]: updatedUrlList });
  if (DEBUG_MODE) console.log("[BACKGROUND][saveJiraUrl] Saved List", updatedUrlList.length);
  return true;
};

/** Save AGO URL to Storage List and update popup dropdowns */
export const saveAGOUrl = async (url: string, agoClientName: string) => {
  const isAgoUrl = AGO_REGEX.test(url);
  if (!isAgoUrl) {
    if (DEBUG_MODE) console.log("[BACKGROUND][saveAGOUrl] Not AGO URL", url, AGO_REGEX);
    return false;
  }

  const storageKey: StorageKey = "agoUrlList";
  const { agoUrlList } = await getFromStorage(storageKey);
  const urlList = Array.isArray(agoUrlList) ? agoUrlList : [];

  const capturedUrl = url.match(AGO_REGEX)?.[1];
  if (DEBUG_MODE) console.log("[BACKGROUND][saveAGOUrl] Captured:", capturedUrl);

  if (!capturedUrl) {
    if (DEBUG_MODE) console.log("[BACKGROUND][saveAGOUrl] URL Not Captured", url);
    return false;
  }

  const displayName = getListEntryDisplayName(url, null, agoClientName);
  if (!displayName) return false;

  let updatedUrlList = [];
  const existing = urlList.find((u) => u.url === capturedUrl);
  if (existing) {
    if (DEBUG_MODE) console.log("[BACKGROUND][saveAGOUrl] Revisiting:", displayName);
    existing.lastVisited = new Date().toISOString();
    if (!existing.preserveCustomName && !existing.favorite) existing.displayName = displayName;
    updatedUrlList = urlList;
  } else {
    urlList.push({
      id: uuidv4(),
      url: capturedUrl,
      displayName,
      lastVisited: new Date().toISOString(),
      favorite: false,
      preserveCustomName: false,
    });
    updatedUrlList = evaluateMaxListLength(urlList);
    if (DEBUG_MODE) console.log("[BACKGROUND][saveAGOUrl] New Entry:", capturedUrl);
  }

  await saveToStorage({ [storageKey]: updatedUrlList });
  if (DEBUG_MODE) console.log("[BACKGROUND][saveAGOUrl] Saved List", updatedUrlList.length);

  return true;
};