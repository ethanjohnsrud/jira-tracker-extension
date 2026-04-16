import { getFromStorage, getSettings, saveToStorage } from "@/controllers/storageController";
import {
  extractAGOClientName,
  extractAGOPlanName,
  extractJiraSprint,
  extractJiraStatus,
  extractJiraTitle,
} from "@/utils/dom-extractor";
import { createCacheURL, startCachePolling, stopCachePolling } from "@/utils/cache";
import { DEBUG_MODE, stateInitPromise } from "@/utils/state";
import { sendMessage } from "@/controllers/messageController";
import { IErrorMsgResponse } from "@/types/message-types";
import { isAgoUrl, isCompanyUrl, isJiraUrl, parseAGOUrl, parseCompanyUrl, saveAGOUrl, saveJiraUrl } from "@/utils/url";
import { initAutoLogin } from "@/content/auto-login";
import { initAutoExportImport } from "@/content/auto-export-import";

/* **********************************************************
 * content.jsx | Used for is for manipulating the DOM        *
 * Runs in current tab, so console.log will be under inspect *
 *************************************************************/

let currentUrl = "";
let thisTabId: number | null = null;

/** Send URL save request to background script */
const saveUrl = async (url: string = currentUrl): Promise<void> => {
  if (DEBUG_MODE) console.log("[CONTENT][saveUrl] URL:", url);
  if (await isJiraUrl(url)) {
    const [jiraTitle, jiraSprint, jiraStatus] = await Promise.all([
      extractJiraTitle(),
      extractJiraSprint(),
      extractJiraStatus(),
    ]);
    if (DEBUG_MODE) console.log("[CONTENT][saveUrl] Sending SAVE_JIRA_URL", { url, jiraTitle, jiraSprint, jiraStatus });

    const saved = await saveJiraUrl({ url, jiraTitle, jiraSprint, jiraStatus });
    if (DEBUG_MODE) console.log("[CONTENT][saveUrl] Saved JIRA URL", saved);
    // await sendMessage({ command: "SAVE_JIRA_URL", url, jiraTitle, jiraSprint, jiraStatus });
  } else if (await isCompanyUrl(url)) {
    //Dropdown storage (for popup)
    const parsedCompanyUrl = await parseCompanyUrl(url);
    if (DEBUG_MODE) console.log("[CONTENT][saveUrl] parsed Company URL", parsedCompanyUrl);
    if (parsedCompanyUrl) {
      const { region, environment, route } = parsedCompanyUrl;
      if (DEBUG_MODE) console.log("[CONTENT][saveUrl] saving dropdowns", { region, environment, route });
      await saveToStorage({ region, environment, route });
      if (DEBUG_MODE) console.log("[CONTENT][saveUrl] saved dropdowns");
    }

    //Save AGO Plan URL
    if (await isAgoUrl(url)) {
      const parsedAgoUrl = await parseAGOUrl(url);
      if (!parsedAgoUrl) return console.error("[CONTENT][saveUrl] Failed to parse AGO URL", url);
      const [{ clientFullName, clientLastName }, agoPlanName] = await Promise.all([
        extractAGOClientName(),
        extractAGOPlanName(),
      ]);
      if (DEBUG_MODE)
        console.log("[CONTENT][saveUrl] Sending SAVE_AGO_URL", {
          url,
          clientFullName,
          clientLastName,
          agoPlanName,
          ...parsedAgoUrl,
        });

      const saved = await saveAGOUrl({
        clientFullName,
        clientLastName,
        agoClientName: clientFullName,
        agoPlanName,
        ...parsedAgoUrl,
      });
      if (DEBUG_MODE) console.log("[CONTENT][saveUrl] Saved AGO URL", saved);
    }

    //Update
    createCacheURL(url);
  } else {
    if (DEBUG_MODE) console.log("[CONTENT][saveUrl] URL not tracked", url);
  }

  //Update regardless
  currentUrl = window.location.href;
};

/** Initialize AGO tab renaming based on storage setting */
const initializeAGOTabRenaming = async (): Promise<void> => {
  const settings = await getSettings();
  const renameAGOTab = async (url = currentUrl): Promise<void> => {
    const { tabOn, preferences } = await getFromStorage(["tabOn", "preferences"]);
    if (!preferences?.renameAGOTab) {
      if (DEBUG_MODE) console.log("[CONTENT][renameAGOTab] Renaming AGO tab is disabled");
      return;
    }
    if (DEBUG_MODE) console.log("[CONTENT][renameAGOTab] tabOn:", tabOn, "URL:", url);

    const matched = url.match(settings.agoTracking.AGO_URL_REGEX);
    if (tabOn && matched) {
      const { agoUrlList = [] } = await getFromStorage("agoUrlList");
      const item = agoUrlList.find((u) => u.url === matched[1]);
      if (item?.displayName) {
        const parts = item.displayName.split("-");
        const first = parts[0]?.toLowerCase();
        const isPref = settings.REGIONS.some((r) => r.value.toLowerCase() === first);
        document.title = isPref ? parts.slice(1).join("-") : item.displayName;
        if (DEBUG_MODE) console.log("[CONTENT][renameAGOTab] New title:", document.title);
      }
    }
  };
  setInterval(renameAGOTab, settings.CONSTANTS.AGO_TAB_RENAMING_INTERVAL);
  renameAGOTab();
};

/** Initialize URL-saving interval */
const initializeTabURLSaving = async (): Promise<void> => {
  const settings = await getSettings();
  setInterval(() => {
    if (currentUrl !== window.location.href) {
      currentUrl = window.location.href;
      if (DEBUG_MODE) console.log("[CONTENT][initializeTabURLSaving] New URL:", currentUrl);
      saveUrl(currentUrl);
    }
  }, settings.CONSTANTS.URL_SAVING_INTERVAL);
};

// Listen for cacheTabId changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local" && changes.cacheTabId) {
    const id = changes.cacheTabId.newValue;
    if (id === thisTabId) startCachePolling();
    else stopCachePolling();
  }
});

/****************************************************
 *              Initialize Content Script           *
 ****************************************************/
const initialize = async () => {
  if (stateInitPromise) await stateInitPromise;

  //Set global variables
  await createCacheURL(window.location.href);

  // Get and cache this tab's ID
  sendMessage<"GET_TAB_ID">({ command: "GET_TAB_ID" }).then(async (response) => {
    if (DEBUG_MODE) console.log("[CONTENT][initTabId] Response:", response);
    if (response.ok && response.tabId !== undefined) {
      thisTabId = response.tabId;
      if (DEBUG_MODE) console.log("[CONTENT][initTabId] Tab ID:", thisTabId);

      // Check if this tab should start polling
      const { cacheTabId } = await getFromStorage("cacheTabId");
      if (cacheTabId === thisTabId) startCachePolling();
    } else {
      const errRes = response as IErrorMsgResponse;
      if (DEBUG_MODE) console.warn("[CONTENT][initTabId] Failed to get tab ID:", errRes.error);
    }
  });

  // Run other initializations
  await initializeAGOTabRenaming();
  await initializeTabURLSaving(); //Updates currentUrl

  if (DEBUG_MODE) console.log("[CONTENT][init] Content script initialized");

  // Wait for DOM before initializing Auto Login
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initAutoLogin();
      initAutoExportImport();
    });
  } else {
    initAutoLogin();
    initAutoExportImport();
  }
};

// Call the initializer
initialize();
