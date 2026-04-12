/*********************
 * JIRA URL TRACKING *
 *********************/
/*  Matches and captures base JIRA issue URL and ticket ID */
// export const JIRA_REGEX = /^https:\/\/company\.atlassian\.net\/(?:browse\/|jira\/software\/c\/projects\/[^/?#]+\/boards\/\d+\/backlog\?selectedIssue=)([A-Z]{2,5}-\d{2,5})$/;
// export const JIRA_REGEX = /^(https:\/\/jira\.ethanjohnsrud\.com\/(?:browse\/|jira\/software\/c\/projects\/[^\/?#]+\/boards\/\d+\/backlog\?selectedIssue=)([A-Z]{2,5}-\d{2,5}))$/;

/** Matches and captures base JIRA issue URL and ticket ID */
export const JIRA_URL_REGEX =
  /^(https:\/\/jira\.ethanjohnsrud\.com)\/(?:browse\/|jira\/software\/c\/projects\/[^\/?#]+\/boards\/\d+\/backlog\?selectedIssue=)(?<jiraCode>[A-Z]{2,5}-\d{2,5})$/;

/********************
 * AGO URL Tracking *
 ********************/
/*  Matches and captures base AGO URL, region, environment, client, and plan IDs */
// [Group #1] Captures full URL through plan ID but excludes sub-route
// [Group #2] Region (CA/UK/IE/US/AU) | [Group #3] Environment domain (integrations/staging/test) | [Group #4] Environment (local) | [Group #5] 5-chars-ending client ID | [Group #6] 5-chars-ending plan ID
// export const AGO_REGEX = /^(https:\/\/([a-zA-Z]{2,7})[-.](?:([a-z]+)\.domain\.(?:co\.uk|com)|(localhost\.tld:[0-9]{4}))\/advisergo\/#\/[a-f0-9]{27}([a-f0-9]{5})\/[a-f0-9]{27}([a-f0-9]{5}))/;
// export const AGO_URL_REGEX = /^(https:\/\/([a-zA-Z]{2,7})(?:-([a-z]+)\.ethanjohnsrud\.com|(\.localhost\.ethanjohnsrud\.com))\/advisergo\/#\/[a-f0-9]{27}([a-f0-9]{5})\/[a-f0-9]{27}([a-f0-9]{5}))/;
export const AGO_URL_REGEX =
  /^https:\/\/(?<region>[a-zA-Z]{2,7})(?:[-.](?<environment>[a-z]+)[a-z.]+)\/(?<route>advisergo)\/#\/(?<clientID>[a-f0-9]{27}[a-f0-9]{5})\/(?<planID>[a-f0-9]{27}[a-f0-9]{5})/;

/***********************
 * company URL Tracking *
 ***********************/
/*  Matches and captures company app URLs with region and environment */
// [Group #1] Captures full URL through plan ID but excludes sub-route | [Group #2] Region (CA/UK/IE/US/AU) | [Group #3] Environment domain (integrations/staging/test)
// export const COMPANY_REGEX = /^(https:\/\/([a-zA-Z]{2,7})[-.](?:([a-z]+)\.domain\.(?:co\.uk|com)|(localhost\.tld:[0-9]{4})).+)/;
// export const COMPANY_REGEX = /^(https:\/\/([a-zA-Z]{2,7})(?:-([a-z]+)\.ethanjohnsrud\.com|(\.localhost\.ethanjohnsrud\.com)).+)/;
export const COMPANY_URL_REGEX =
  /^https:\/\/(?<region>[a-zA-Z]{2,7})(?:[-.](?<environment>[a-z]+)[a-z.]+)\/(?<route>advisergo)\//;

export const LOGIN_URL_REGEX = /^https:\/\/(?<region>[a-zA-Z]{2,7})(?:[-.](?<environment>[a-z]+)[a-z.]+)/;

export const JIRA_CODE_REGEX = /^[A-Z]{2,10}-\d{1,10}$/i;
