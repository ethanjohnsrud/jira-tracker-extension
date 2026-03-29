/*
 * STORAGE CONTENT TYPES
 * Currently collecting the actual types and interfaces used in the legacy code.
 * Later we will refactor as we go.
 */

export interface UrlListItem {
  id: string;
  url: string;
  displayName: string;
  lastVisited: string;
  favorite: boolean;
  preserveCustomName: boolean;
}

export interface JiraUrlListItem extends UrlListItem { }
export interface AgoUrlListItem extends UrlListItem { }

export interface StorageSchema {
  jiraUrlList: JiraUrlListItem[];
  agoUrlList: AgoUrlListItem[];
  debug: boolean;
  jira_header_link: string;
  ago_header_link: string;
  tabOn: boolean | `${boolean}`;
  environment: string;
  region: string;
  route: string;
  nextTimerMS: number;
  cacheTabId?: number;
}

export type StorageKey = keyof StorageSchema;