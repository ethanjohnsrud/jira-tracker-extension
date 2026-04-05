import { formatDate } from "date-fns";
import { DOM_NAMING_TIMEOUT } from "../constants/constants";
import { DEBUG_MODE } from "./state";
import { AGO_CLIENT_NAME_SELECTOR, AGO_PLAN_NAME_SELECTOR, JIRA_SPRINT_SELECTOR, JIRA_STATUS_SELECTOR, JIRA_TITLE_SELECTOR } from "../constants/dom-selectors";

/** Wait for a DOM element to appear 
 *
 * Utility used for extracting elements after page loads
 */
export async function waitForDOM<T>(fetchElement: () => T): Promise<T> {
  return new Promise((resolve, reject) => {
    const observer = new MutationObserver(() => {
      const element = fetchElement();
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element not found within ${DOM_NAMING_TIMEOUT}ms`));
    }, DOM_NAMING_TIMEOUT);
  });
};

/**@returns if element exists returns immediately, otherwise waits for element to appear */
export async function getElement<T extends HTMLElement>(selector: string): Promise<T | null> {
  const el = document.querySelector<T>(selector);
  if (el) return el;

  return waitForDOM(() => document.querySelector<T>(selector));
};

export async function extractJiraTitle(): Promise<string> {
  try {
    const titleElement = await getElement(JIRA_TITLE_SELECTOR);
    if (DEBUG_MODE) console.log("[extractJiraTitle] Element text:", titleElement?.innerText);
    const rawText = titleElement?.innerText?.trim() || "";
    if (!rawText) {
      if (DEBUG_MODE) console.log("[extractJiraTitle] No title found");
      return "";
    }
    return rawText;
  } catch (error) {
    if (DEBUG_MODE) console.warn("[extractJiraTitle] Error:", error);
    return "";
  }
}

/** Extract the current JIRA sprint identifier */
export async function extractJiraSprint(): Promise<string> {
  try {
    const sprintElement = await getElement(JIRA_SPRINT_SELECTOR);
    if (DEBUG_MODE) console.log("[extractJiraSprint] Element text:", sprintElement?.innerText);
    const rawText = sprintElement?.innerText?.trim() || "";
    if (!rawText) {
      if (DEBUG_MODE) console.log("[extractJiraSprint] No sprint found");
      return "";
    }
    const cleanText = rawText.replace(/(\d+)(st|nd|rd|th)/, "$1");
    const parsed = Date.parse(cleanText);
    let value = isNaN(parsed) ? rawText : new Date(parsed);
    if (value instanceof Date && !isNaN(value.getTime())) {
      return formatDate(value, "MMM-dd"); //returns format like "Mar-17"
    }
    if (value === "ACTIVE") return "ACT";
    if (value === "Backlog" || value === "TRIAGED") return "";
    return "";
  } catch (error) {
    if (DEBUG_MODE) console.warn("[extractJiraSprint] Error:", error);
    return "";
  }
};


/**Extracts the current JIRA status and return it's acronym */
export async function extractJiraStatus(): Promise<string> {
  try {
    const statusElement = await getElement(JIRA_STATUS_SELECTOR);
    if (DEBUG_MODE) console.log("[extractJiraStatus] Element text:", statusElement?.innerText);
    const rawText = statusElement?.innerText?.trim() || "";
    if (!rawText) {
      if (DEBUG_MODE) console.log("[extractJiraStatus] No status found");
      return "";
    }
    const acronym = rawText.split(/\s+/).map((word) => word[0].toUpperCase()).join("");
    if (DEBUG_MODE) console.log("[extractJiraStatus] Acronym:", acronym);
    return acronym;
  } catch (error) {
    if (DEBUG_MODE) console.warn("[extractJiraStatus] Error:", error);
    return "";
  }
}

export async function extractAGOPlanName(): Promise<string> {
  try {
    const element = await getElement(AGO_PLAN_NAME_SELECTOR);
    if (DEBUG_MODE) console.log("[extractAGOPlanName] Element text:", element?.innerText);
    const rawText = element?.innerText?.trim() || "";
    if (!rawText) {
      if (DEBUG_MODE) console.log("[extractAGOPlanName] No plan name found");
      return "";
    }
    return rawText;
  } catch (error) {
    if (DEBUG_MODE) console.warn("[extractAGOPlanName] Error:", error);
    return "";
  }
}

/** Extract AGO clientFullName and clientLastName.
 * @returns If innerText is `Campbell, John & Julia` 
 *          clientFullName = `John & Julia Campbell`,clientLastName = `Campbell`
 */
export async function extractAGOClientName(): Promise<{ clientFullName: string, clientLastName: string; }> {
  try {
    const element = await getElement(AGO_CLIENT_NAME_SELECTOR);
    if (DEBUG_MODE) console.log("[extractAGOClientName] Element text:", element?.innerText);
    const text = element?.innerText?.trim() || "";
    if (!text) {
      if (DEBUG_MODE) console.log("[extractAGOClientName] No client name");
      return { clientFullName: "", clientLastName: "" };
    }
    return { clientFullName: text, clientLastName: text.split(",")[0].trim() };
  } catch (error) {
    if (DEBUG_MODE) console.warn("[extractAGOClientName] Error:", error);
    return { clientFullName: "", clientLastName: "" };
  }
};