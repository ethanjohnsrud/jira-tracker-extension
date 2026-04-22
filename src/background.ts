import { saveToStorage, removeFromStorage, getFromStorage, resetCacheStates } from "./controllers/storageController";
import { DEFAULT_STORAGE_STATE, StorageKey, StorageSchema } from "./types/storage-types";
import { DEBUG_MODE } from "./utils/state";
import { MessageHandlers, OnMessageListener } from "./types/message-types";

/*********************************************************************************************************************
 * background.jsx is for the service worker which is always running in the background; however cannot access the DOM  *
 **********************************************************************************************************************/

/** Handles incoming extension messages */
const msgHandlers: MessageHandlers = {
  GET_TAB_ID: async (request, sender, sendResponse) => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id !== undefined) {
        sendResponse({ ok: true, tabId: tab.id });
      } else {
        if (DEBUG_MODE) console.warn("[BACKGROUND][onMessage] GET_TAB_ID: Could not determine tab ID", tab);
        sendResponse({ ok: false, error: "Error: GET_TAB_ID | Could not determine tab ID" });
      }
    } catch (error) {
      if (DEBUG_MODE) console.warn("[BACKGROUND][onMessage] GET_TAB_ID error:", error);
      const errMsg = error instanceof Error ? error.message : "Unknown error in GET_TAB_ID";
      sendResponse({ ok: false, error: errMsg });
    }
  },
  SAVE_JIRA_URL: async (request, sender, sendResponse) => {
    sendResponse({ ok: false, error: "saveJiraUrl function can be used directly from content script" });
  },
  SAVE_AGO_URL: async (request, sender, sendResponse) => {
    sendResponse({ ok: false, error: "saveAGOUrl function can be used directly from content script" });
  },
};

const onMessageListener: OnMessageListener = (request, sender, sendResponse) => {
  if (DEBUG_MODE) console.log("[BACKGROUND][onMessage] Received:", request.command, request);
  const handler = msgHandlers[request.command];
  if (handler) handler(request as any, sender, sendResponse);
  return true;
};
chrome.runtime.onMessage.addListener(onMessageListener);

/*/ Initializes background service worker and settings on install */
chrome.runtime.onInstalled.addListener(async () => {
  //Only set default values if not present
  const defaults = DEFAULT_STORAGE_STATE;

  const defaultKeys = Object.keys(defaults) as StorageKey[];
  const existingDefaults = await getFromStorage(defaultKeys);

  const defaultsToSave: Partial<StorageSchema> = {};
  for (const key of defaultKeys) {
    if (existingDefaults[key] === undefined) {
      //@ts-ignore
      defaultsToSave[key] = defaults[key];
    }
  }
  if (Object.keys(defaultsToSave).length > 0) {
    await saveToStorage(defaultsToSave);
    if (DEBUG_MODE) console.log("[BACKGROUND][onInstalled] Defaults saved", defaultsToSave);
  }

  //Reset on Chrome restart
  await removeFromStorage(["cacheTabId", "nextTimerMS"]);

  if (DEBUG_MODE) console.log("[BACKGROUND][onInstalled] Service Worker initialized");
});

chrome.runtime.onStartup.addListener(async () => {
  await resetCacheStates();
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const { cacheTabId } = await getFromStorage(["cacheTabId"]);
  if (tabId === cacheTabId) await resetCacheStates();
});
