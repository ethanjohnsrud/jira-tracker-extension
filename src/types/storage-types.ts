/*
 * STORAGE CONTENT TYPES
 * Currently collecting the actual types and interfaces used in the legacy code.
 * Later we will refactor as we go.
 */

import { AGOListItem, JiraListItem } from "./list-types";

export type JiraUrlListItem = JiraListItem;
export type AgoUrlListItem = AGOListItem;

export interface Preferences {
  /**Used in `src/utils/state.ts` for `DEBUG_MODE` variable */
  debugMode: boolean;
  autoLogin: boolean; // TODO: implement
  jiraTabRenaming: boolean; // TODO: implement
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
  preferences: Preferences;
  cacheTabId?: number;
}

export type StorageKey = keyof StorageSchema;

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