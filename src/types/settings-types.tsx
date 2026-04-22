import { EnvironmentSelectionOption, RegionSelection, RouteSelection } from "./dropdown-types";

/******************************************************************************************************************************
 * EXTENSION SETTINGS                                                                                                         *
 * All Dynamic Information, available for export and import override (replace in entirety)                                    *
 *                                                                                                                            *
 * Current settings location:                                                                                                 *
 * - src/constants/constants.json                                                                                             *
 *                                                                                                                            *
 * Notes                                                                                                                      *
 * - Regex values are stored as strings so the settings object remains JSON-compatible for import/export and overwrite flows. *
 * - Validation is runtime-safe and intended for imported or externally loaded settings.                                      *
 ******************************************************************************************************************************/

export interface SETTINGS {
  CONSTANTS: {
    /*  Maximum number of stored URLs (favorites never removed) */
    MAX_LIST_LENGTH: number;

    /*  Interval (ms) for checking URL changes in content script */
    URL_SAVING_INTERVAL: number;

    /*  Interval (ms) for renaming AGO tab titles */
    AGO_TAB_RENAMING_INTERVAL: number;

    /*  Timeout (ms) for waiting on DOM elements */
    DOM_NAMING_TIMEOUT: number;

    /*  Interval (ms) for local cache polling */
    LOCAL_CACHE_INTERVAL: number;

    JIRA_HEADER_HYPERLINK: string;
    AGO_HEADER_HYPERLINK: string;
  };

  /* AGO Dropdown URL Routing */
  ENVIRONMENTS: EnvironmentSelectionOption[];
  REGIONS: RegionSelection[];
  ROUTES: RouteSelection[];

  routePreferences: {
    /* Deprioritized Route Labels | Some regex are general; so checking more specific routes.json first */
    ROUTE_DEPRIORITIZED_LABELS: string[];
  };

  regionPreferences: {
    /** Regions hosted in the UK use .co.uk */
    UK_HOSTED_TEST_REGIONS: string[];

    /** QA test regions use -qa instead of -test*/
    QA_TEST_REGIONS: string[];
  };

  /*********************
   * JIRA URL TRACKING *
   *********************/
  jiraTracking: {
    JIRA_SEARCH_URL_PREFIX: string;

    /*  Matches and captures base JIRA issue URL and ticket ID */
    JIRA_URL_REGEX: string;

    /*  Matches and captures JIRA ticket ID */
    JIRA_CODE_REGEX: string;

    /*  Selector for the JIRA sprint element in the issue view */
    JIRA_SPRINT_ELEMENT_SELECTOR: string;
  };

  /********************
   * AGO URL Tracking *
   ********************/
  agoTracking: {
    /*  Matches and captures company app URLs with region and environment */
    COMPANY_REGEX: string;

    /*  Matches and captures base AGO URL, region, environment, client, and plan IDs */
    AGO_URL_REGEX: string;

    /** Matches and captures base company URL, region, and environment */
    COMPANY_URL_REGEX: string;

    /*  Element ID for fetching AGO client name from the page */
    AGO_CLIENT_NAME_ELEMENT_ID: string;
  };

  others: {
    /** Matches and captures login URLs with region and environment */
    LOGIN_URL_REGEX: string;

    /** Matches and captures export page route */
    EXPORT_ROUTE_REGEX: string;

    /** Matches and captures import page route */
    IMPORT_ROUTE_REGEX: string;
  };
}

export const DEFAULT_SETTINGS: SETTINGS = {
  CONSTANTS: {
    MAX_LIST_LENGTH: 100,
    URL_SAVING_INTERVAL: 1000,
    AGO_TAB_RENAMING_INTERVAL: 10000,
    DOM_NAMING_TIMEOUT: 5000,
    LOCAL_CACHE_INTERVAL: 10000,
    JIRA_HEADER_HYPERLINK: "https://www.google.com/",
    AGO_HEADER_HYPERLINK: "https://www.yahoo.com/",
  },

  ENVIRONMENTS: [
    { label: "Local", value: "localhost", prefix: "LOC" },
    { label: "Integrations", value: "integrations", prefix: "INT" },
    { label: "Staging", value: "staging", prefix: "STAG" },
    { label: "Test", value: "test", prefix: "TEST" },
  ],

  REGIONS: [
    { label: "UK", value: "uk" },
    { label: "IE", value: "ie" },
    { label: "CA", value: "ca" },
    { label: "US", value: "us" },
    { label: "AU", value: "au" },
    { label: "UNI", value: "uni" },
  ],

  ROUTES: [
    {
      label: "Adviser Go",
      value: "advisergo",
      regex: "(home\\/#\\/login|advisergo\\/#\\/)",
    },
    {
      label: "Import",
      value: "advisergo/#/advisor/integration",
      regex: "advisergo\\/#\\/advisor\\/integration",
    },
    {
      label: "Features",
      value: "voyant/main/advisergofeatures/list",
      regex: "voyant\\/main\\/advisergofeatures",
    },
    {
      label: "Version",
      value: "voyant/version.txt",
      regex: "version\\.txt",
    },
    {
      label: "Release Notes",
      value: "advisergo/#/advisor/clients?releaseNotes=true",
      regex: "releaseNotes=true",
    },
    {
      label: "My User",
      value: "voyant/main/user/view",
      regex: "voyant\\/main\\/user",
    },
    {
      label: "Logs",
      value: "voyant/main/admin/logs/logfiles",
      regex: "voyant\\/main\\/admin\\/logs\\/logfiles",
    },
    {
      label: "Cache",
      value: "voyant/main/admin/view/ehcache?cacheName=calculationCache&cmd=flush&Submit=Submit",
      regex: "voyant\\/main\\/admin\\/view\\/ehcache",
    }
  ],

  routePreferences: {
    ROUTE_DEPRIORITIZED_LABELS: ["Adviser Go", "My User"],
  },

  regionPreferences: {
    UK_HOSTED_TEST_REGIONS: ["UK", "IE"],
    QA_TEST_REGIONS: ["IE", "AU"],
  },

  jiraTracking: {
    JIRA_SEARCH_URL_PREFIX: "https://jira.ethanjohnsrud.com/browse/",

    JIRA_URL_REGEX:
      "^(https:\\/\\/jira\\.ethanjohnsrud\\.com)\\/(?:browse\\/|jira\\/software\\/c\\/projects\\/[^\\/?#]+\\/boards\\/\\d+\\/backlog\\?selectedIssue=)(?<jiraCode>[A-Z]{2,5}-\\d{2,5})$",

    JIRA_CODE_REGEX: "^[a-zA-Z]{2,10}-\\d{1,10}$",
    //Extract Sprint for URL Naming: document.querySelector('[data-testid="issue-field-sprint-readview-full.ui.sprint.sprint-content.view-sprint-content"] a');
    JIRA_SPRINT_ELEMENT_SELECTOR:
      '[data-testid="issue-field-sprint-readview-full.ui.sprint.sprint-content.view-sprint-content"] a',
  },

  agoTracking: {
    // [Group #1] Captures full matched URL | [Group #2] Region | [Group #3] Environment domain (integrations/staging/test/qa) | [Group #4] Localhost marker
    COMPANY_REGEX: "^(https:\/\/([a-zA-Z]{2,7})(?:-([a-z]+)\.ethanjohnsrud\.com|(\.localhost\.ethanjohnsrud\.com)).+)",

    // [Group #1] Captures full URL through plan ID but excludes sub-route
    // [Group #2] Region | [Group #3] Environment domain (integrations/staging/test/qa) | [Group #4] 5-chars-ending client ID | [Group #5] 5-chars-ending plan ID
    AGO_URL_REGEX:
      "^https:\\/\\/(?<region>[a-zA-Z]{2,7})(?:[-.](?<environment>[a-z]+)[a-z.]+)\\/(?<route>advisergo)\\/#\\/(?<clientID>[a-f0-9]{27}[a-f0-9]{5})\\/(?<planID>[a-f0-9]{27}[a-f0-9]{5})",

    COMPANY_URL_REGEX: "^https:\\/\\/(?<region>[a-zA-Z]{2,7})(?:[-.](?<environment>[a-z]+)[a-z.]+)\\/(?<route>advisergo)\\/",

    //Extract Client Last Name for URL Naming: document.querySelector('[data-testid="issue-field-sprint-readview-full.ui.sprint.sprint-content.view-sprint-content"] a');
    AGO_CLIENT_NAME_ELEMENT_ID: "client-actions-dropdown",
  },

  others: {
    LOGIN_URL_REGEX: "^https:\\/\\/(?<region>[a-zA-Z]{2,7})(?:[-.](?<environment>[a-z]+)[a-z.]+)",
    EXPORT_ROUTE_REGEX: "\\/client-export",
    IMPORT_ROUTE_REGEX: "\\/client-import|\\/integration",
  }
};

/* Use for Importing Settings Override */
export const validateSettings = (object: Object, debugMode: boolean): boolean => {
  let valid = true;
  const settings = object as Partial<SETTINGS>;

  if (typeof settings.CONSTANTS?.MAX_LIST_LENGTH !== "number") {
    if (debugMode) console.log("[Settings Validation] Failed: invalid CONSTANTS.MAX_LIST_LENGTH.");
    valid = false;
  }
  if (typeof settings.CONSTANTS?.URL_SAVING_INTERVAL !== "number") {
    if (debugMode) console.log("[Settings Validation] Failed: invalid CONSTANTS.URL_SAVING_INTERVAL.");
    valid = false;
  }
  if (typeof settings.CONSTANTS?.AGO_TAB_RENAMING_INTERVAL !== "number") {
    if (debugMode) console.log("[Settings Validation] Failed: invalid CONSTANTS.AGO_TAB_RENAMING_INTERVAL.");
    valid = false;
  }
  if (typeof settings.CONSTANTS?.DOM_NAMING_TIMEOUT !== "number") {
    if (debugMode) console.log("[Settings Validation] Failed: invalid CONSTANTS.DOM_NAMING_TIMEOUT.");
    valid = false;
  }
  if (typeof settings.CONSTANTS?.LOCAL_CACHE_INTERVAL !== "number") {
    if (debugMode) console.log("[Settings Validation] Failed: invalid CONSTANTS.LOCAL_CACHE_INTERVAL.");
    valid = false;
  }
  if (!settings.CONSTANTS?.JIRA_HEADER_HYPERLINK) {
    if (debugMode) console.log("[Settings Validation] Failed: invalid CONSTANTS.JIRA_HEADER_HYPERLINK.");
    valid = false;
  }
  if (!settings.CONSTANTS?.AGO_HEADER_HYPERLINK) {
    if (debugMode) console.log("[Settings Validation] Failed: invalid CONSTANTS.AGO_HEADER_HYPERLINK.");
    valid = false;
  }

  for (const environment of settings.ENVIRONMENTS || []) {
    try {
      if (
        !environment.label ||
        !environment.value ||
        !environment.prefix ||
        (settings.ENVIRONMENTS || []).filter((item) => item?.value === environment.value).length > 1
      )
        throw new Error("Invalid ENVIRONMENTS item.");
    } catch (error) {
      if (debugMode) console.log("[Settings Validation] Failed: invalid ENVIRONMENTS item.", environment, error);
      valid = false;
    }
  }

  for (const region of settings.REGIONS || []) {
    try {
      if (
        !region.label ||
        !region.value ||
        (settings.REGIONS || []).filter((item) => item?.value === region.value).length > 1
      )
        throw new Error("Invalid REGIONS item.");
    } catch (error) {
      if (debugMode) console.log("[Settings Validation] Failed: invalid REGIONS item.", region, error);
      valid = false;
    }
  }

  for (const route of settings.ROUTES || []) {
    try {
      if (
        !route.label ||
        !route.value ||
        !route.regex ||
        (settings.ROUTES || []).filter((item) => item?.value === route.value).length > 1
      )
        throw new Error("Invalid ROUTES item.");
      new RegExp(route.regex);
    } catch (error) {
      if (debugMode) console.log("[Settings Validation] Failed: invalid ROUTES item.", route, error);
      valid = false;
    }
  }

  if (!Array.isArray(settings.routePreferences?.ROUTE_DEPRIORITIZED_LABELS)) {
    if (debugMode) console.log("[Settings Validation] Failed: invalid routePreferences.ROUTE_DEPRIORITIZED_LABELS.");
    valid = false;
  }

  if (!Array.isArray(settings.regionPreferences?.UK_HOSTED_TEST_REGIONS)) {
    if (debugMode) console.log("[Settings Validation] Failed: invalid regionPreferences.UK_HOSTED_TEST_REGIONS.");
    valid = false;
  }
  if (!Array.isArray(settings.regionPreferences?.QA_TEST_REGIONS)) {
    if (debugMode) console.log("[Settings Validation] Failed: invalid regionPreferences.QA_TEST_REGIONS.");
    valid = false;
  }

  if (!settings.jiraTracking?.JIRA_SEARCH_URL_PREFIX) {
    if (debugMode) console.log("[Settings Validation] Failed: invalid jiraTracking.JIRA_SEARCH_URL_PREFIX.");
    valid = false;
  }
  try {
    if (!settings.jiraTracking?.JIRA_URL_REGEX) {
      if (debugMode) console.log("[Settings Validation] Failed: invalid jiraTracking.JIRA_URL_REGEX.");
      valid = false;
    } else {
      new RegExp(settings.jiraTracking.JIRA_URL_REGEX);
    }
  } catch (error) {
    if (debugMode) console.log("[Settings Validation] Failed: invalid jiraTracking.JIRA_URL_REGEX.", error);
    valid = false;
  }
  if (!settings.jiraTracking?.JIRA_SPRINT_ELEMENT_SELECTOR) {
    if (debugMode) console.log("[Settings Validation] Failed: invalid jiraTracking.JIRA_SPRINT_ELEMENT_SELECTOR.");
    valid = false;
  }

  try {
    if (!settings.agoTracking?.COMPANY_REGEX) {
      if (debugMode) console.log("[Settings Validation] Failed: invalid agoTracking.companyTrackingRegex.");
      valid = false;
    } else {
      new RegExp(settings.agoTracking.COMPANY_REGEX);
    }
  } catch (error) {
    if (debugMode) console.log("[Settings Validation] Failed: invalid agoTracking.companyTrackingRegex.", error);
    valid = false;
  }

  try {
    if (!settings.agoTracking?.AGO_URL_REGEX) {
      if (debugMode) console.log("[Settings Validation] Failed: invalid agoTracking.AGO_REGEX.");
      valid = false;
    } else {
      new RegExp(settings.agoTracking.AGO_URL_REGEX);
    }
  } catch (error) {
    if (debugMode) console.log("[Settings Validation] Failed: invalid agoTracking.AGO_REGEX.", error);
    valid = false;
  }

  if (!settings.agoTracking?.AGO_CLIENT_NAME_ELEMENT_ID) {
    if (debugMode) console.log("[Settings Validation] Failed: invalid agoTracking.AGO_CLIENT_NAME_ELEMENT_ID.");
    valid = false;
  }

  if (debugMode) console.log(`[Settings Validation] ${valid ? "Passed" : "Failed"}`);

  return valid;
};
