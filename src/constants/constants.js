export const MAX_LIST_LENGTH = 100; //will not remove favorites

export const URL_SAVING_INTERVAL = 1000; //ms
export const AGO_TAB_RENAMING_INTERVAL = 10000; //ms
export const DOM_NAMING_TIMEOUT = 5000; //ms
export const LOCAL_CACHE_INTERVAL = 10000; //ms

//Test Environment URL Navigation
export const UK_HOSTED_TEST_REGIONS = ['UK', 'COUTTS', 'BARC', 'SPW', 'IE', 'BOI'];
export const QA_TEST_REGIONS = ['TD', 'TDR', 'BMO', 'SPW', 'COUTTS', 'BARC', 'SPW', 'BOI']; //Uses bmo-qa instead of bmo-test

/* JIRA URL MATCHING & CAPTURE REGEX */
// [Group #1] Capture full URL; excludes subroutes
// [Group #2] Ticket Marker (AGO-3065, CA-719)
export const JIRA_REGEX = /^(https:\/\/voyant\.atlassian\.net\/browse\/([a-zA-Z]{2,5}-[0-9]{3,4}))/;

//Extract Sprint for URL Naming: document.querySelector('[data-testid="issue-field-sprint-readview-full.ui.sprint.sprint-content.view-sprint-content"] a');
export const JIRA_SPRINT_ELEMENT_SELECTOR = '[data-testid="issue-field-sprint-readview-full.ui.sprint.sprint-content.view-sprint-content"] a';


/* AGO URL MATCHING & CAPTURE REGEX */
// [Group #1] Captures full URL through plan ID but excludes sub-route
// [Group #2] Region (CA/UK/IE/US/AU) | [Group #3] Environment planwithvoyant (integrations/staging/test) | [Group #4] Environment (local) | [Group #5] 5-chars-ending client ID | [Group #6] 5-chars-ending plan ID
export const AGO_REGEX = /^(https:\/\/([a-zA-Z]{2,7})[-.](?:([a-z]+)\.planwithvoyant\.(?:co\.uk|com)|(localhost\.tld:[0-9]{4}))\/advisergo\/#\/[a-f0-9]{27}([a-f0-9]{5})\/[a-f0-9]{27}([a-f0-9]{5}))/;

//Extract Client Last Name for URL Naming: document.querySelector('[data-testid="issue-field-sprint-readview-full.ui.sprint.sprint-content.view-sprint-content"] a');
export const AGO_CLIENT_NAME_ELEMENT_ID = "client-actions-dropdown";


/* VOYANT URL MATCHING */
// [Group #1] Captures full URL through plan ID but excludes sub-route | [Group #2] Region (CA/UK/IE/US/AU) | [Group #3] Environment planwithvoyant (integrations/staging/test) 
export const VOYANT_REGEX = /^(https:\/\/([a-zA-Z]{2,7})[-.](?:([a-z]+)\.planwithvoyant\.(?:co\.uk|com)|(localhost\.tld:[0-9]{4})).+)/;



/* MATCHING URLS */
// export const JIRA_URL_MATCHING_REGEX = /voyant\.atlassian\.net\/browse\/([A-Z]{2,5}-[0-9]{3,4})/;
// export const AGO_URL_MATCHING_REGEX = /^https:\/\/[a-z\-]+\.planwithvoyant\.com\/advisergo\/#\/[a-f0-9]{32}\/[a-f0-9]+(\/.*)?$/;

// /* Capture Display Name From URL */
// export const AGO_CAPTURE_NAMING_REGEX = /^https:\/\/([a-z]+)-([a-z]+)\.planwithvoyant\.com\/advisergo\/#\/[a-z0-9]+([a-z0-9]{5})\/[a-z0-9]+([a-z0-9]{5})(\/.*)?$/;




// export const AGO_CAPTURE_URL_PARTS_REGEX = /^(https:\/\/([a-zA-Z]{2,5})-([a-zA-Z]+)\.planwithvoyant\.(?:co\.uk|com)\/advisergo\/#\/[a-f0-9]{27}([a-f0-9]{5})\/[a-f0-9]{27}([a-f0-9]{5}))/;

// /* Capture Save URL | (This includes plan ids, but excludes subRoutes) */
// export const JIRA_CAPTURE_SAVE_URL_REGEX = /^(https:\/\/[^\/]+\/browse\/[^\/]+)/;

// export const AGO_CLIENT_CAPTURE_URL_REGEX = /^(https:\/\/[a-z]{2,5}-[a-z]+\.planwithvoyant\.(?:co\.uk|com)\/advisergo\/#\/[^\/]{32}\/)/;
// export const AGO_PLAN_CAPTURE_URL_REGEX = /^(https:\/\/[a-z]{2,5}-[a-z]+\.planwithvoyant\.(?:co\.uk|com)\/advisergo\/#\/[^\/]{32}\/[^\/]{32}\/)/;


/* List Header Labels Links */
export const JIRA_HEADER_HYPERLINK = "https://voyant.atlassian.net/jira/software/c/projects/MAS/boards/17/backlog?assignee=628b9248d5ec4f0069e7776e";
export const AGO_HEADER_HYPERLINK = "https://planwithvoyant.com/us/home";
