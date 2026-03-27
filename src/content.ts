import { getFromStorage, saveToStorage } from "./controllers/storageController";
import {
	JIRA_REGEX,
	COMPANY_REGEX,
	AGO_REGEX,
	URL_SAVING_INTERVAL,
	AGO_TAB_RENAMING_INTERVAL,
} from "./constants/constants";
import REGIONS from "./constants/regions";
import { extractAGOClientLastName, extractJiraSprint } from "./utils/dom-extractor";
import { createCacheURL, startCachePolling, stopCachePolling } from "./utils/cache";

/* **********************************************************
 * content.jsx | Used for is for manipulating the DOM        *
 * Runs in current tab, so console.log will be under inspect *
 *************************************************************/

/* Global */
let DEBUG_MODE = false;
let currentUrl = "";

let thisTabId = null;

/** Send URL save request to background script */
const saveUrl = async (url: string = currentUrl): Promise<void> => {
	if (JIRA_REGEX.test(url)) {
		const jiraSprint = await extractJiraSprint();
		if (DEBUG_MODE) console.log("[CONTENT][saveUrl] Sending SAVE_JIRA_URL", url, jiraSprint);

		await chrome.runtime.sendMessage({
			command: "SAVE_JIRA_URL",
			url,
			jiraSprint,
		});
	} else if (COMPANY_REGEX.test(url)) {
		//Dropdown storage (for popup)
		const matched = url.match(COMPANY_REGEX);
		if (matched && matched.length >= 4) {
			const route = matched[1];
			const region = matched[2];
			const environment = matched[3] || matched[4];

			await saveToStorage({ region, environment, route });
			if (DEBUG_MODE) console.log("[CONTENT][saveUrl] Saved dropdowns:", region, environment, route);
		}

		//Save AGO Plan URL
		if (AGO_REGEX.test(url)) {
			const agoClientName = await extractAGOClientLastName(DEBUG_MODE);
			if (DEBUG_MODE) console.log("[CONTENT][saveUrl] Sending SAVE_AGO_URL", url, agoClientName);

			await chrome.runtime.sendMessage({
				command: "SAVE_AGO_URL",
				url,
				agoClientName,
			});
		}

		//Update
		createCacheURL(url, DEBUG_MODE);
	} else {
		if (DEBUG_MODE) console.log("[CONTENT][saveUrl] URL not tracked", url);
	}

	//Update regardless
	currentUrl = window.location.href;
};

/** Initialize AGO tab renaming based on storage setting */
const initializeAGOTabRenaming = async (): Promise<void> => {
	const renameAGOTab = async (url = currentUrl): Promise<void> => {
		const tabOn = await getFromStorage("tabOn");
		if (DEBUG_MODE) console.log("[CONTENT][renameAGOTab] tabOn:", tabOn, "URL:", url);

		const matched = url.match(AGO_REGEX);
		if (tabOn && matched) {
			const storedList = (await getFromStorage("agoUrlList")) || [];
			const item = storedList.find((u) => u.url === matched[1]);
			if (item?.displayName) {
				const parts = item.displayName.split("-");
				const first = parts[0]?.toLowerCase();
				const isPref = REGIONS.some((r) => r.value.toLowerCase() === first);
				document.title = isPref ? parts.slice(1).join("-") : item.displayName;
				if (DEBUG_MODE) console.log("[CONTENT][renameAGOTab] New title:", document.title);
			}
		}
	};
	setInterval(renameAGOTab, AGO_TAB_RENAMING_INTERVAL);
	renameAGOTab();
};

/** Initialize URL-saving interval */
const initializeTabURLSaving = async (): Promise<void> => {
	setInterval(() => {
		if (currentUrl !== window.location.href) {
			currentUrl = window.location.href;
			if (DEBUG_MODE) console.log("[CONTENT][initializeTabURLSaving] New URL:", currentUrl);
			saveUrl(currentUrl);
		}
	}, URL_SAVING_INTERVAL);
};

// Listen for cacheTabId changes
chrome.storage.onChanged.addListener((changes, namespace) => {
	if (namespace === "local" && changes.cacheTabId) {
		const id = changes.cacheTabId.newValue;
		if (id === thisTabId) startCachePolling(DEBUG_MODE);
		else stopCachePolling(DEBUG_MODE);
	}
});

/****************************************************
 *              Initialize Content Script           *
 ****************************************************/
const initialize = async () => {
	// Set DEBUG_MODE from storage
	DEBUG_MODE = (await getFromStorage("debug")) === true;
	if (DEBUG_MODE) console.log("[CONTENT][init] DEBUG_MODE enabled");

	//Set global variables
	await createCacheURL(window.location.href);

	// Get and cache this tab's ID
	chrome.runtime.sendMessage({ command: "GET_TAB_ID" }, (response) => {
		if (DEBUG_MODE) console.log("[CONTENT][initTabId] Response:", response);
		if (response?.tabId !== undefined) {
			thisTabId = response.tabId;
			if (DEBUG_MODE) console.log("[CONTENT][initTabId] Tab ID:", thisTabId);

			// Check if this tab should start polling
			chrome.storage.local.get(["cacheTabId"], (result) => {
				if (result.cacheTabId === thisTabId) startCachePolling();
			});
		} else {
			if (DEBUG_MODE) console.warn("[CONTENT][initTabId] Failed to get tab ID:", response?.error);
		}
	});

	// Run other initializations
	await initializeAGOTabRenaming();
	await initializeTabURLSaving(); //Updates currentUrl

	if (DEBUG_MODE) console.log("[CONTENT][init] Content script initialized");
};

// Call the initializer
initialize();
