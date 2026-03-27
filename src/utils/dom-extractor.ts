import { AGO_CLIENT_NAME_ELEMENT_ID, DOM_NAMING_TIMEOUT, JIRA_SPRINT_ELEMENT_SELECTOR } from "../constants/constants";

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

/** Extract the current JIRA sprint identifier */
export async function extractJiraSprint(DEBUG_MODE = false): Promise<string> {
  try {
    const sprintElement = await waitForDOM(() => document.querySelector<HTMLElement>(JIRA_SPRINT_ELEMENT_SELECTOR));
    if (DEBUG_MODE) console.log("[CONTENT][extractJiraSprint] Element text:", sprintElement?.innerText);
    const rawText = sprintElement?.innerText?.trim() || "";
    if (!rawText) {
      if (DEBUG_MODE) console.log("[CONTENT][extractJiraSprint] No sprint found");
      return "";
    }
    const cleanText = rawText.replace(/(\d+)(st|nd|rd|th)/, "$1");
    const parsed = Date.parse(cleanText);
    let value = isNaN(parsed) ? rawText : new Date(parsed);
    if (value instanceof Date && !isNaN(value.getTime()))
      return value.toLocaleDateString("en-US", { month: "short", day: "numeric" }).replace(",", "").replace(" ", "-");
    if (value === "ACTIVE") return "ACT";
    if (value === "Backlog" || value === "TRIAGED") return "";
    return "";
  } catch (error) {
    if (DEBUG_MODE) console.warn("[CONTENT][extractJiraSprint] Error:", error);
    return "";
  }
};

/** Extract AGO client last name from page */
export async function extractAGOClientLastName(DEBUG_MODE = false): Promise<string> {
  try {
    const element = await waitForDOM(() => document.getElementById(AGO_CLIENT_NAME_ELEMENT_ID));
    if (DEBUG_MODE) console.log("[CONTENT][extractAGOClientLastName] Element text:", element?.innerText);
    const text = element?.innerText?.trim() || "";
    if (!text) {
      if (DEBUG_MODE) console.log("[CONTENT][extractAGOClientLastName] No client name");
      return "";
    }
    return text.split(",")[0].trim();
  } catch (error) {
    if (DEBUG_MODE) console.warn("[CONTENT][extractAGOClientLastName] Error:", error);
    return "";
  }
};