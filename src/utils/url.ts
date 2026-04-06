import { getFromStorage, saveToStorage } from "../controllers/storageController";
import { MAX_LIST_LENGTH } from "../constants/constants";
import { JiraUrlListItem, StorageKey } from "../types/storage-types";
import { DEBUG_MODE } from "./state";
import ENVIRONMENTS from "../constants/environments";
import { AGO_URL_REGEX, COMPANY_URL_REGEX, JIRA_URL_REGEX } from "../constants/regex";
import { UrlListItem } from "../types/list-types";

const createId = () => crypto.randomUUID();

export const isJiraUrl = (url: string): boolean => {
  return JIRA_URL_REGEX.test(url);
};

export const isAgoUrl = (url: string): boolean => {
  return AGO_URL_REGEX.test(url);
};

export const isCompanyUrl = (url: string): boolean => {
  return COMPANY_URL_REGEX.test(url);
};

export const parseJiraUrl = (url: string): { jiraCode: string; capturedUrl: string; } | null => {
  const match = url.match(JIRA_URL_REGEX);
  if (!match) return null;
  if (DEBUG_MODE) console.log("[parseJiraUrl] JIRA match", match);
  if (match.groups?.jiraCode) return { jiraCode: match.groups.jiraCode, capturedUrl: match[0] };
  return null;
};


export type ParsedCompanyUrl = {
  capturedUrl: string;
  region?: string;
  environment?: string;
  route?: string;
};

export const parseCompanyUrl = (url: string): ParsedCompanyUrl | null => {
  const match = url.match(COMPANY_URL_REGEX);
  if (!match) return null;
  if (DEBUG_MODE) console.log("[parseCompanyUrl] match", match);
  return {
    capturedUrl: match[0],
    region: match.groups?.region,
    environment: match.groups?.environment,
    route: match.groups?.route,
  };
};

export type ParsedAGOUrl = {
  capturedUrl: string;
  region: string;
  environment: string;
  route: string;
  clientID: string;
  planID: string;
};

export const parseAGOUrl = (url: string): ParsedAGOUrl | null => {
  const match = url.match(AGO_URL_REGEX);
  if (!match) return null;
  if (DEBUG_MODE) console.log("[parseAGOUrl] match", match);
  return {
    region: match.groups?.region || "",
    environment: match.groups?.environment || "",
    route: match.groups?.route || "",
    clientID: match.groups?.clientID || "",
    planID: match.groups?.planID || "",
    capturedUrl: match[0]
  };
};

/** Derives display name for JIRA and AGO URLs */
export const getListEntryDisplayName = (url: string, jiraSprint: string | null, agoClientName: string | null) => {
  if (isJiraUrl(url)) {
    const parsedJiraUrl = parseJiraUrl(url)!;
    const name = parsedJiraUrl.jiraCode
      + (jiraSprint && jiraSprint.length > 0 ? ` [${jiraSprint}]` : "");
    if (DEBUG_MODE) console.log("[getListEntryDisplayName] JIRA name", name);
    return name;
  } else if (isAgoUrl(url)) {
    const groups = url.match(AGO_URL_REGEX);
    if (!groups || groups.length < 5) {
      if (DEBUG_MODE) console.log("[getListEntryDisplayName] Invalid AGO Match", url, groups);
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
export const saveJiraUrl = async (props: { url: string, jiraTitle: string, jiraSprint: string, jiraStatus: string; }) => {
  const { url, jiraSprint, jiraTitle, jiraStatus } = props;
  if (!isJiraUrl(url)) {
    if (DEBUG_MODE) console.log("[saveJiraUrl] Not Jira URL", url, JIRA_URL_REGEX);
    return false;
  }

  const storageKey: StorageKey = "jiraUrlList";
  const { jiraUrlList } = await getFromStorage(storageKey);
  const urlList: JiraUrlListItem[] = Array.isArray(jiraUrlList) ? jiraUrlList : [];

  const parsedJiraUrl = parseJiraUrl(url);
  const { jiraCode, capturedUrl } = parsedJiraUrl;
  if (DEBUG_MODE) console.log("[saveJiraUrl] Captured:", capturedUrl);

  if (!capturedUrl) {
    if (DEBUG_MODE) console.log("[saveJiraUrl] URL Not Captured", url);
    return false;
  }

  const displayName = getListEntryDisplayName(url, jiraSprint, null);
  if (!displayName) return false;

  let updatedUrlList = [];
  const existing = urlList.find((u) => u.url === capturedUrl);
  const nowDate = new Date();
  if (existing) {
    if (DEBUG_MODE) console.log("[saveJiraUrl] Revisiting:", displayName);
    existing.lastVisited = nowDate.toISOString();
    existing.lastVisitedMS = nowDate.getTime();
    if (!existing.preserveCustomName) existing.displayName = displayName;
    updatedUrlList = urlList;
  } else {
    urlList.push({
      id: createId(),
      type: "jira",
      jiraCode,
      sprint: jiraSprint,
      title: jiraTitle,
      status: jiraStatus,
      originalUrl: url,
      url: capturedUrl,
      displayName,
      preserveCustomName: false,
      lastVisitedMS: nowDate.getTime(),
      lastVisited: nowDate.toISOString(),
      favorite: false,
    });
    updatedUrlList = evaluateMaxListLength(urlList);
    if (DEBUG_MODE) console.log("[saveJiraUrl] New Entry:", capturedUrl);
  }

  await saveToStorage({ [storageKey]: updatedUrlList });
  if (DEBUG_MODE) console.log("[saveJiraUrl] Saved List", updatedUrlList.length);
  return true;
};

/** Save AGO URL to Storage List and update popup dropdowns */
export const saveAGOUrl = async (props: ParsedAGOUrl & { agoClientName: string, agoPlanName: string, clientFullName: string, clientLastName: string; }) => {
  const { capturedUrl: url, agoClientName, region, environment, route, clientID, planID, agoPlanName, clientFullName, clientLastName } = props;

  if (!isAgoUrl(url)) {
    if (DEBUG_MODE) console.log("[saveAGOUrl] Not AGO URL", url, AGO_URL_REGEX);
    return false;
  }

  const storageKey: StorageKey = "agoUrlList";
  const { agoUrlList } = await getFromStorage(storageKey);
  const urlList = Array.isArray(agoUrlList) ? agoUrlList : [];

  const capturedUrl = url.match(AGO_URL_REGEX)?.[1];
  if (DEBUG_MODE) console.log("[saveAGOUrl] Captured:", capturedUrl);

  if (!capturedUrl) {
    if (DEBUG_MODE) console.log("[saveAGOUrl] URL Not Captured", url);
    return false;
  }

  const displayName = getListEntryDisplayName(url, null, agoClientName);
  if (!displayName) return false;

  let updatedUrlList = [];
  const nowDate = new Date();
  const existing = urlList.find((u) => u.url === capturedUrl);
  if (existing) {
    if (DEBUG_MODE) console.log("[saveAGOUrl] Revisiting:", displayName);
    existing.lastVisited = nowDate.toISOString();
    existing.lastVisitedMS = nowDate.getTime();
    if (!existing.preserveCustomName && !existing.favorite) existing.displayName = displayName;
    updatedUrlList = urlList;
  } else {
    urlList.push({
      id: createId(),
      url: capturedUrl,
      type: "ago",
      region,
      environment,
      route,
      clientFullName,
      clientLastName,
      displayName,
      planName: agoPlanName,
      originalUrl: url,
      lastVisitedMS: nowDate.getTime(),
      lastVisited: nowDate.toISOString(),
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
