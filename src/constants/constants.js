/************************************
 * Configuration & Timing Constants *
 ************************************/
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
export const UK_HOSTED_TEST_REGIONS = ['UK', 'COUTTS', 'BARC', 'SPW', 'IE', 'BOI'];

export const QA_TEST_REGIONS = ['TD', 'TDR', 'BMO', 'SPW', 'COUTTS', 'BARC', 'SPW', 'BOI']; //Uses bmo-qa instead of bmo-test


/*********************
 * JIRA URL TRACKING *
 *********************/
/*  Matches and captures base JIRA issue URL and ticket ID */
export const JIRA_REGEX = /^(https:\/\/voyant\.atlassian\.net\/browse\/([a-zA-Z]{2,5}-[0-9]{3,4}))/;

/*  Selector for the JIRA sprint element in the issue view */
//Extract Sprint for URL Naming: document.querySelector('[data-testid="issue-field-sprint-readview-full.ui.sprint.sprint-content.view-sprint-content"] a');
export const JIRA_SPRINT_ELEMENT_SELECTOR = '[data-testid="issue-field-sprint-readview-full.ui.sprint.sprint-content.view-sprint-content"] a';


/********************
 * AGO URL Tracking *  
 ********************/
/*  Matches and captures base AGO URL, region, environment, client, and plan IDs */
// [Group #1] Captures full URL through plan ID but excludes sub-route
// [Group #2] Region (CA/UK/IE/US/AU) | [Group #3] Environment planwithvoyant (integrations/staging/test) | [Group #4] Environment (local) | [Group #5] 5-chars-ending client ID | [Group #6] 5-chars-ending plan ID
export const AGO_REGEX = /^(https:\/\/([a-zA-Z]{2,7})[-.](?:([a-z]+)\.planwithvoyant\.(?:co\.uk|com)|(localhost\.tld:[0-9]{4}))\/advisergo\/#\/[a-f0-9]{27}([a-f0-9]{5})\/[a-f0-9]{27}([a-f0-9]{5}))/;

/*  Element ID for fetching AGO client name from the page */
//Extract Client Last Name for URL Naming: document.querySelector('[data-testid="issue-field-sprint-readview-full.ui.sprint.sprint-content.view-sprint-content"] a');
export const AGO_CLIENT_NAME_ELEMENT_ID = "client-actions-dropdown";


/***********************
 * VOYANT URL Tracking *             
 ***********************/
/*  Matches and captures VOYANT app URLs with region and environment */
// [Group #1] Captures full URL through plan ID but excludes sub-route | [Group #2] Region (CA/UK/IE/US/AU) | [Group #3] Environment planwithvoyant (integrations/staging/test) 
export const VOYANT_REGEX = /^(https:\/\/([a-zA-Z]{2,7})[-.](?:([a-z]+)\.planwithvoyant\.(?:co\.uk|com)|(localhost\.tld:[0-9]{4})).+)/;


/*********************
 * Header Hyperlinks *
 *********************/
export const JIRA_HEADER_HYPERLINK_DEFAULT = 'https://www.atlassian.com/software/jira';

export const AGO_HEADER_HYPERLINK_DEFAULT = 'https://planwithvoyant.com/us/home';
