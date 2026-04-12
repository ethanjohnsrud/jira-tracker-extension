/************************************
 * Configuration & Timing Constants *
 * TODO: replace constants with dynamic values from storage
 ************************************/

import { StorageSchema } from "@/types/storage-types";

/*  Maximum number of stored URLs (favorites never removed) */
export const MAX_LIST_LENGTH = 100;

/*  Interval (ms) for checking URL changes in content script */
export const URL_SAVING_INTERVAL = 1000; //ms

/*  Interval (ms) for renaming AGO tab titles */
export const AGO_TAB_RENAMING_INTERVAL = 10000; //ms

/*  Timeout (ms) for waiting on DOM elements */
export const DOM_NAMING_TIMEOUT = 5000; //ms

/*  Interval (ms) for local cache polling */
export const LOCAL_CACHE_INTERVAL = 10000; //ms

/* Deprioritized Route Labels | Some regex are general; so checking more specific routes.json first */
export const ROUTE_DEPRIORITIZED_LABELS = ["Adviser Go", "My User"];

/***********************************
 * Environment & Region Constants
 ********************************* */
export const UK_HOSTED_TEST_REGIONS = ["UK", "IE"];

export const QA_TEST_REGIONS = ["IE", "AU"]; //Uses ie-qa instead of ie-test

//TODO Support ?selectedIssue=
// export const JIRA_REGEX = /^(?:https:\/\/company\.atlassian\.net\/browse\/([A-Z]{2,5}-\d{2,5})|https:\/\/company\.atlassian\.net\/jira\/software\/c\/projects\/[^/?#]+\/boards\/\d+\/backlog\?selectedIssue=([A-Z]{2,5}-\d{2,5}))$/;

/*********************
 * Header Hyperlinks *
 *********************/
export const JIRA_HEADER_HYPERLINK_DEFAULT = "https://www.google.com/";

export const AGO_HEADER_HYPERLINK_DEFAULT = "https://www.yahoo.com/";

export const DEFAULT_STORAGE_STATE: StorageSchema = {
  debug: false,
  jira_header_link: JIRA_HEADER_HYPERLINK_DEFAULT,
  ago_header_link: AGO_HEADER_HYPERLINK_DEFAULT,
  jiraUrlList: [],
  agoUrlList: [],
  tabOn: false,
  environment: "",
  region: "",
  route: "",
  nextTimerMS: 0,
  preferences: {
    debugMode: false,
    autoLogin: false,
    autoExportImport: false,
    renameAGOTab: false,
    localCacheClearing: false,
  },
  cacheTabId: undefined,
};

export const JIRA_SEARCH_URL_PREFIX = "https://jira.ethanjohnsrud.com/browse/";
