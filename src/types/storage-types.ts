/*
 * STORAGE CONTENT TYPES
 * Currently collecting the actual types and interfaces used in the legacy code.
 * Later we will refactor as we go.
 */
import { AGOListItem, JiraListItem } from "./list-types";
import { LoginCredentials } from "./dropdown-types";
import { SETTINGS, DEFAULT_SETTINGS } from "./settings-types";

export type JiraUrlListItem = JiraListItem;
export type AgoUrlListItem = AGOListItem;

export interface Preferences {
  /**Used in `src/utils/state.ts` for `DEBUG_MODE` variable */
  debugMode: boolean;
  autoLogin: boolean;
  autoExportImport: boolean;
  renameAGOTab: boolean; // TODO: implement
  /**Implemented in `clearCache()` in `src/utils/cache.ts` */
  localCacheClearing: boolean;
}

export interface StorageSchema {
  jiraUrlList: JiraUrlListItem[];
  agoUrlList: AgoUrlListItem[];
  /**@deprecated - use `preferences.debugMode` instead */
  debug: boolean;
  jira_header_link: string;
  ago_header_link: string;
  tabOn: boolean | `${boolean}`;
  environment: string;
  region: string;
  route: string;
  nextTimerMS: number;
  settings: SETTINGS;
  preferences: Preferences;
  cacheTabId?: number;
  loginCredentials?: LoginCredentials[];
}

export type StorageKey = keyof StorageSchema;
export type URLItemListKey = Extract<StorageKey, "jiraUrlList" | "agoUrlList">;

interface StorageChange<T> {
  /** The new value of the item, if there is a new value. */
  newValue?: T;
  /** The old value of the item, if there was an old value. */
  oldValue?: T;
}

export type StorageChangeCallback = (
  changes: { [key in StorageKey]?: StorageChange<StorageSchema[key]> },
  areaName: chrome.storage.AreaName
) => void;

export const DEFAULT_STORAGE_STATE: StorageSchema = {
  debug: false,
  jira_header_link: DEFAULT_SETTINGS.CONSTANTS.JIRA_HEADER_HYPERLINK,
  ago_header_link: DEFAULT_SETTINGS.CONSTANTS.AGO_HEADER_HYPERLINK,
  jiraUrlList: [],
  agoUrlList: [],
  tabOn: false,
  environment: "",
  region: "",
  route: "",
  nextTimerMS: 0,
  settings: DEFAULT_SETTINGS,
  preferences: {
    debugMode: false,
    autoLogin: false,
    autoExportImport: false,
    renameAGOTab: false,
    localCacheClearing: false,
  },
  cacheTabId: undefined,
};
