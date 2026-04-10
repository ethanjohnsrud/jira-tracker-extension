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

export const AUTO_LOGIN_SELECTORS = {
  LOCALHOST_PROTECTED: {
    DETAILS_BUTTON: "#details-button",
    PROCEED_LINK: "#proceed-link",
  },
  LOCALHOST_LOGIN: {
    USERNAME: "#j_username",
    PASSWORD: "#j_password",
    SUBMIT_BUTTON: 'input[name="login"]',
  },
  TWO_STEP_LOGIN: {
    STEP_1_USERNAME: "#form-login-step-1-username",
    STEP_1_FORM: "#login-step-1-form",
    STEP_1_CONTINUE_BUTTON: 'button[data-test-get-auth-info="true"], #login-step-1-form button[type="submit"]',
    STEP_2_PASSWORD: "#form-login-default-step-2-pw",
    STEP_2_LOGIN_BUTTON: 'button[data-test-login="true"], #login-step-2-form button[type="submit"]',
  },
  BASIC_LOGIN: {
    USERNAME: '.test-login-userName, [data-test-username="true"] input, #id',
    PASSWORD: '.test-login-password, [data-test-password="true"] input, #pw',
    SUBMIT_BUTTON: '.test-login-loginButton, [data-test-login="true"], button[type="submit"]',
  }
};