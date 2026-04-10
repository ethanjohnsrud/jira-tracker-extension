/*
 * STORAGE CONTENT TYPES
 * Currently collecting the actual types and interfaces used in the legacy code.
 * Later we will refactor as we go.
 */

import { AGOListItem, JiraListItem } from "./list-types";

export type JiraUrlListItem = JiraListItem;
export type AgoUrlListItem = AGOListItem;

export interface Preferences {
  debugMode: boolean;
  autoLogin: boolean;
  jiraTabRenaming: boolean;
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

export type StorageChangeCallback = (
  changes: { [key in StorageKey]?: chrome.storage.StorageChange },
  areaName: chrome.storage.AreaName
) => void;