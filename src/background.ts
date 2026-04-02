import { saveToStorage, removeFromStorage, getFromStorage } from "./controllers/storageController";
import { AGO_HEADER_HYPERLINK_DEFAULT, JIRA_HEADER_HYPERLINK_DEFAULT } from "./constants/constants";
import { StorageKey, StorageSchema } from "./types/storage-types";
import { saveAGOUrl, saveJiraUrl } from "./utils/url";
import { DEBUG_MODE } from "./utils/state";
import { OnMessageListener } from "./types/message-types";

/*********************************************************************************************************************
 * background.jsx is for the service worker which is always running in the background; however cannot access the DOM  *
 **********************************************************************************************************************/


/** Handles incoming extension messages */
const onMessageListener: OnMessageListener = (request, sender, sendResponse) => {
	(async () => {
		if (DEBUG_MODE) console.log("[BACKGROUND][onMessage] Received:", request.command, request.url);
		switch (request.command) {
			case "GET_TAB_ID":
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
				break;

			case "SAVE_JIRA_URL":
				const savedJira = await saveJiraUrl(request.url, request.jiraSprint);
				if (savedJira) sendResponse({ ok: true, message: "JIRA URL saved" });
				else {
					if (DEBUG_MODE)
						console.warn(
							"[BACKGROUND][onMessage] SAVE_JIRA_URL: Failed to save JIRA URL",
							request.url,
							"jiraSprint:",
							request.jiraSprint
						);
					sendResponse({ ok: false, error: "Failed: SAVE_JIRA_URL" });
				}
				break;

			case "SAVE_AGO_URL":
				const savedAgo = await saveAGOUrl(request.url, request.agoClientName);
				if (savedAgo) sendResponse({ ok: true, message: "AGO URL saved" });
				else {
					if (DEBUG_MODE)
						console.warn(
							"[BACKGROUND][onMessage] SAVE_AGO_URL: Failed to save AGO URL",
							request.url,
							"agoClientName:",
							request.agoClientName
						);
					sendResponse({ ok: false, error: "Failed: SAVE_AGO_URL" });
				}
				break;
		}
	})();
	return true;
};
chrome.runtime.onMessage.addListener(onMessageListener);

/*/ Initializes background service worker and settings on install */
chrome.runtime.onInstalled.addListener(async () => {
	//Only set default values if not present
	const defaults: Partial<StorageSchema> = {
		debug: false,
		jira_header_link: JIRA_HEADER_HYPERLINK_DEFAULT,
		ago_header_link: AGO_HEADER_HYPERLINK_DEFAULT,
	};

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

	//Reset on CHrome restart
	await removeFromStorage("cacheTabId");

	if (DEBUG_MODE) console.log("[BACKGROUND][onInstalled] Service Worker initialized");
});
