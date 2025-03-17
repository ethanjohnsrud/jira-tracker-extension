import { v4 as uuidv4 } from "uuid";
import { getFromStorage, saveToStorage } from "./controllers/storageController";
import {
    JIRA_REGEX,
    JIRA_URL_MATCHING_REGEX,
    AGO_URL_MATCHING_REGEX,
    AGO_CAPTURE_NAMING_REGEX,
    AGO_CAPTURE_URL_PARTS_REGEX,
    JIRA_CAPTURE_SAVE_URL_REGEX,
    AGO_PLAN_CAPTURE_URL_REGEX,
    MAX_LIST_LENGTH
} from "./constants/constants";
import REGIONS from "./constants/regions.json";
import ENVIRONMENTS from "./constants/environments.json";
import ROUTES from "./constants/routes.json";

/* background.jsx is for the service worker which is always running in the background; however cannot access the DOM */


//Assumes "CacheOn" or manual Call
const clearCache = () => {
    return new Promise(async (resolve, reject) => {
        const { cacheUrl } = await getFromStorage("cacheUrl");
        if(!cacheUrl || cacheUrl.length === 0) {
            console.log('clearCache-blocked', cacheUrl);
            return resolve(false);
        }

        try {
            const res = await fetch(cacheUrl);
            if(res.status !== 200) {
                return resolve(false);
            }
            resolve(true);
        } catch (e) {
            console.error('Failed to Clear Cache with:', cacheUrl);
            resolve(false);
        }
    });
};


const getListEntryDisplayName = (url, jiraSprint, agoClientName) => {
    /* Jira List Entries */
    if(JIRA_URL_MATCHING_REGEX.test(url)) {
        console.log('NAME for JIRA', url.match(JIRA_URL_MATCHING_REGEX)[1]);
        return url.match(JIRA_URL_MATCHING_REGEX)[1] 
            + (jiraSprint && jiraSprint.length > 0) ? ` [${jiraSprint}]` : '';
  
    /* AGO List Entries */
    } else if((AGO_URL_MATCHING_REGEX.test(url))) {
        const urlMatchGroups = url.match(AGO_CAPTURE_NAMING_REGEX);

        if (!urlMatchGroups || urlMatchGroups.length < 5) {
            console.log('Invalid AGO Name Match', url, AGO_CAPTURE_NAMING_REGEX, urlMatchGroups);
            return 'AGO';
        }

        const region = urlMatchGroups[1].toUpperCase();
        const environmentPrefix = (ENVIRONMENTS.find(env => env.value === urlMatchGroups[2])?.prefix || 'ENV').toUpperCase();
        const clientSuffix = urlMatchGroups[3];
        const planSuffix = urlMatchGroups[4];

        return (agoClientName && agoClientName.length > 0) ? `${region}-${environmentPrefix}-${agoClientName}`
                : `${region}-${environmentPrefix}-${clientSuffix}-${planSuffix}`;

    } else {
        console.error('DisplayName - Did Not Match', url, JIRA_URL_MATCHING_REGEX, AGO_URL_MATCHING_REGEX);
        return false;
    }
};


// Utility method to update the last visited timestamp

    //TODO refactor to match: AGO_CLIENT_CAPTURE_URL_REGEX

const updateLastVisited = (urlList, mainUrl) => {
    const existingUrl = urlList.find((u) => u.url === mainUrl);
    if (existingUrl) {
        console.log('**Revisited URL:', existingUrl);
        existingUrl.lastVisited = new Date().toISOString();
        return urlList;
    }
    console.log('**NEW URL:', mainUrl, urlList);
    return false;
};

// Utility method to trim list size to the maximum length
const evaluateMaxListLength = (urlList) => {
    if (urlList.length > MAX_LIST_LENGTH) {
        urlList.sort((a, b) => new Date(a.lastVisited) - new Date(b.lastVisited));
        const indexToRemove = urlList.findIndex((url) => url.favorite === false);
        if (indexToRemove !== -1) {
            console.log('Max Length Reached:', urlList.length, indexToRemove, urlList[indexToRemove]);
            urlList.splice(indexToRemove, 1);
        }
    } else
        console.log('List length fine', urlList.length, urlList);
    return urlList;
};


//TODO support LOCAL

// Core saveUrl function
const saveUrl = async (url, jiraSprint, agoClientName) => {
    // console.log('saveURL-testing', url, JIRA_URL_MATCHING_REGEX, AGO_URL_MATCHING_REGEX);
    if (!(JIRA_URL_MATCHING_REGEX.test(url) || AGO_URL_MATCHING_REGEX.test(url))) {
        console.log('**URL did not match', url);
        return false;
    }

    //TODO refactor into updateOrAddEntry(), maybe with enum type matched

    const isJiraUrl = JIRA_URL_MATCHING_REGEX.test(url);
    const storageKey = isJiraUrl ? 'jiraUrlList' : 'agoUrlList';
    let storedList = await getFromStorage(storageKey) || []; //Fetch storage once and ensure it's an array
    const urlList = Array.isArray(storedList) ? storedList : [];
    console.log('Current List', storageKey, urlList.length, urlList);

    const regexToUse = isJiraUrl ? JIRA_CAPTURE_SAVE_URL_REGEX : AGO_PLAN_CAPTURE_URL_REGEX;
    let capturedUrl = url.match(regexToUse)?.[1];

    if (!capturedUrl) {
        console.log('URL Not captures', capturedUrl, regexToUse, url);
        return false;
    }

    /* Save URL as Bookmark List Entry */
    let displayName = getListEntryDisplayName(url, jiraSprint, agoClientName);
    if (!displayName) return false;

    // Update the URL list if the URL already exists
    let updatedUrlList = updateLastVisited(urlList, capturedUrl);
    //TODO refactor to match: AGO_CLIENT_CAPTURE_URL_REGEX

    if(!updatedUrlList) {
        urlList.push({
            id: uuidv4(),
            url: capturedUrl,
            displayName,
            lastVisited: new Date().toISOString(),
            favorite: false,
        });

        updatedUrlList = evaluateMaxListLength(urlList);
    }
    // Save the updated list back to storage
    await saveToStorage({ [storageKey]: updatedUrlList });


    /* Save AGO URL parts for Popup Link Dropdowns */
    if(!isJiraUrl) {
        const matched = url.match(AGO_CAPTURE_URL_PARTS_REGEX);

        console.log('current-URL-matched', matched, matched[1], matched[2], matched[3]);

        if (matched && matched.length >= 4) { //Savings ".value"
            const region = matched[1];
            const environment = matched[2];
            const route = matched[3];
    
            // Store each value separately
            await saveToStorage({ region });
            console.log('Saved region:', region);
    
            await saveToStorage({ environment });
            console.log('Saved environment:', environment);
    
            await saveToStorage({ route });
            console.log('Saved route:', route);

            //Initialize Cache URL | (only update with cacheOn is deactivated)
            const { cacheOn } = await getFromStorage("cacheOn");
            if(!cacheOn) {
                const validRegion = REGIONS.find((r) => r.value.toLowerCase() === (region ?? '').toLowerCase());
                const validEnvironment = ENVIRONMENTS.find((e) => e.value.toLowerCase() === (environment ?? '').toLowerCase());    
                const cacheRoute = ROUTES.find((l) => l.label === "Cache")?.value;
                
                const cacheUrl = (validRegion && validEnvironment && cacheRoute) ?
                    `https://${validRegion.value}-${validEnvironment.value}.planwithvoyant.com/${cacheRoute}`         //TODO support LOCAL
                    : ''; //Clear if invalid
                await saveToStorage({ cacheUrl });
                console.log('Saved cacheUrl:', cacheUrl);

            }

            // console.log('Initializing cacheUrl', cacheUrl, matched);
        }
    }

    console.log("Saved URL ==> ", isJiraUrl ? 'JIRA' : 'AGO', updatedUrlList.length, updatedUrlList);
    return true;
};

// Clear existing alarms
const stopCacheIntervalTimer = async() => {
    const alarms = await chrome.alarms.getAll();
    alarms.forEach((alarm) => {
        if (alarm.name === "cache-interval-timer") {
            console.log("TIMERS CLEARED");
            chrome.alarms.clear(alarm.name);
        }
    });
}

//Clear Cache Interval Timer
const startCacheIntervalTimer = async () => {
    // Clear existing alarms
    await stopCacheIntervalTimer();

    const now = new Date();
    const thirtySecondsLater = new Date(now.getTime() + 30 * 1000).toISOString();  //Chrome limits to 30 seconds

    await saveToStorage({ nextTimer: thirtySecondsLater });

    const { cacheOn } = await getFromStorage("cacheOn");
    if(cacheOn) {
      chrome.alarms.create("cache-interval-timer", {
        periodInMinutes: 0.5,
      });
    }
};

//Cache Timer
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "cache-interval-timer") {
        const now = new Date();
        const thirtySecondsLater = new Date(
            now.getTime() + (30 * 1000)
        ).toISOString();

        const res = await clearCache();
        console.log("CLEAR CACHE RESPONSE ==> ", res);
        console.log("Timer fired at: ", now.toLocaleTimeString());
        console.log({ nextTimer: thirtySecondsLater });
        await saveToStorage({ nextTimer: thirtySecondsLater });
    }
});


//Global Actions
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    (async () => {
        switch (request.command) {
            case "START_CACHE_INTERVAL":
                const success = await clearCache();
                startCacheIntervalTimer();
                sendResponse({ message: "Cache Interval Started", success });
                break;

            case "STOP_CACHE_INTERVAL":
                stopCacheIntervalTimer();
                sendResponse({ message: "Cache Interval Stopped", success });
                break;

            case "SAVE_URL":
                const { url, jiraSprint, agoClientName } = request;
                const saved = await saveUrl(url, jiraSprint, agoClientName);
                if(saved) sendResponse({ message: "URL saved" });
                break;
        }
    })();
    return true;
});
