/**CSS Selector for the JIRA title element */
export const JIRA_TITLE_SELECTOR = '[data-testid="issue-field-summary.ui.issue-field-summary-inline-edit--container"] h1';

/**CSS Selector for the JIRA sprint element in the issue view */
//Extract Sprint for URL Naming: document.querySelector('[data-testid="issue-field-sprint-readview-full.ui.sprint.sprint-content.view-sprint-content"] a');
export const JIRA_SPRINT_SELECTOR = '[data-testid="issue-field-sprint-readview-full.ui.sprint.sprint-content.view-sprint-content"] a';

/**CSS Selector for the JIRA status element in the issue view */
export const JIRA_STATUS_SELECTOR = 'button[id="issue.fields.status-view.status-button"] span';

/**CSS Selector for fetching AGO client name from the page */
//Extract Client Last Name for URL Naming: document.querySelector('[data-testid="issue-field-sprint-readview-full.ui.sprint.sprint-content.view-sprint-content"] a');
// export const AGO_CLIENT_NAME_ELEMENT_ID = "client-actions-dropdown";
export const AGO_CLIENT_NAME_SELECTOR = [
  "#client-actions-dropdown",
  "strong span.help-wrapper-yield.focus-ring", // based on test html page
].join(', ');

/**CSS Selector for AGO plan name from the DOM */
export const AGO_PLAN_NAME_SELECTOR = "button#plan-management-dropdown span.help-wrapper-yield strong";