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
    MAX_LIST_LENGTH,
    AGO_REGEX,
    VOYANT_REGEX
} from "./constants/constants";
import REGIONS from "./constants/regions.json";
import ENVIRONMENTS from "./constants/environments.json";
import ROUTES from "./constants/routes.json";

/* background.jsx is for the service worker which is always running in the background; however cannot access the DOM */

//Global | Local Environment when 'cacheOn' was initialized
let cacheUrl = "";

//Assumes "CacheOn" or manual Called
const clearCache = () => {
    return new Promise(async (resolve, reject) => {
        if(!cacheUrl || cacheUrl.length === 0) {
            console.log('clearCache-blocked', cacheUrl);
            return resolve(false);
        }

        try {
            const res = await fetch(cacheUrl);
            if(res.status !== 200) {
                console.warn('Clear Cache Unavailable: ', res.status, cacheUrl);
                return resolve(false);
            } else {
                console.log('Local Cache Cleared: ', res.status, cacheUrl)
                resolve(true);
            }
        } catch (e) {
            console.error('Failed to Clear Cache with:', cacheUrl);
            resolve(false);
        }
    });
};


const getListEntryDisplayName = (url, jiraSprint, agoClientName) => {
    /* Jira List Entries */
    if(JIRA_URL_MATCHING_REGEX.test(url)) {
        console.log('NAME for JIRA', jiraSprint, url.match(JIRA_URL_MATCHING_REGEX)[1] + ((jiraSprint && jiraSprint.length > 0) ? ` [${jiraSprint}]` : ''));
        return url.match(JIRA_URL_MATCHING_REGEX)[1] 
                + ((jiraSprint && jiraSprint.length > 0) ? ` [${jiraSprint}]` : '');
  
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

// const updateLastVisited = (urlList, mainUrl) => {
//     const existingUrl = urlList.find((u) => u.url === mainUrl);
//     if(existingUrl) {
//         console.log('**Revisited URL:', existingUrl);
//         existingUrl.lastVisited = new Date().toISOString();
//         return urlList;
//     }
//     console.log('**NEW URL:', mainUrl, urlList);
//     return false;
// };

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
    if((JIRA_URL_MATCHING_REGEX.test(url) || AGO_REGEX.test(url))) {


        //TODO refactor into updateOrAddEntry(), maybe with enum type matched

        const isJiraUrl = JIRA_URL_MATCHING_REGEX.test(url);
        const storageKey = isJiraUrl ? 'jiraUrlList' : 'agoUrlList';
        let storedList = await getFromStorage(storageKey) || []; //Fetch storage once and ensure it's an array
        const urlList = Array.isArray(storedList) ? storedList : [];
        console.log('Current List', storageKey, urlList.length, urlList);

        const regexToUse = isJiraUrl ? JIRA_CAPTURE_SAVE_URL_REGEX : AGO_PLAN_CAPTURE_URL_REGEX;
        let capturedUrl = url.match(regexToUse)?.[1];

        console.log('SaveURL-Captured:', capturedUrl, url.match(regexToUse), regexToUse, url);

        if(capturedUrl) {
            /* Save URL as Bookmark List Entry */
            const displayName = getListEntryDisplayName(url, jiraSprint, agoClientName);
            if(!displayName || displayName.length === 0) return false;

            // Update the URL list if the URL already exists
            let updatedUrlList = [];
            const existingUrl = urlList.find((u) => u.url === capturedUrl);
            if(existingUrl) {
                console.log('**Revisited URL:', existingUrl);
                existingUrl.lastVisited = new Date().toISOString();

                if(!existingUrl.preserveCustomName && (isJiraUrl || !existingUrl.favorite))
                    existingUrl.displayName = displayName; //Updates Jira Sprint & AGO last name
                updatedUrlList = urlList;
            } else {
                console.log('**NEW URL:', url, urlList);
            //TODO refactor to match: AGO_CLIENT_CAPTURE_URL_REGEX

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

            console.log("Saved URL ==> ", isJiraUrl ? 'JIRA' : 'AGO', updatedUrlList.length, updatedUrlList);

        } else
            console.log('URL Not captures', capturedUrl, regexToUse, url);


    } else {
        console.log('**URL did not for link saving', url);
    }


    /* Save AGO URL parts for Popup Link Dropdowns */
    if(VOYANT_REGEX.test(url)) {
        const matched = url.match(VOYANT_REGEX);

        if(matched && matched.length >= 4) { 
            const route = matched[1];
            const region = matched[2];
            //[Group #3] Environment planwithvoyant (integrations/staging/test) | [Group #4] Environment (local)
            const environment = matched[3] || matched[4];
    
            console.log('current-URL-matched', matched, route, region, environment);

            // Store each value separately
            await saveToStorage({ region });
            console.log('Saved region:', region);
    
            await saveToStorage({ environment });
            console.log('Saved environment:', environment);
    
            await saveToStorage({ route });
            console.log('Saved route:', route);

            //Initialize LOCAL Cache URL | (only update with cacheOn is deactivated)
            // const cacheOn = await getFromStorage("cacheOn");
            // if(!cacheOn) {
            //     const validRegion = REGIONS.find((r) => r.value.toLowerCase() === (region ?? '').toLowerCase());
            //     const localEnvironment = ENVIRONMENTS.find((l) => l.label === "Local");  
            //     const cacheRoute = ROUTES.find((l) => l.label === "Cache");

            //     //ONLY Local Cache URL
            //     const cacheUrl = (validRegion && localEnvironment && cacheRoute) ?
            //         `https://${validRegion.value}.${localEnvironment.value}/${cacheRoute.value}`
            //         : ''; //Clear if invalid
            //     await saveToStorage({ cacheUrl });
            //     console.log('Saved LOCAL cacheUrl:', cacheUrl);

            // }

            // console.log('Initializing cacheUrl', cacheUrl, matched);
        }
    } else {
        console.log('**URL did not for dropdown syncing', url);
    }

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

    //LOCAL Environment only | (Regulated in: Popup.handleCacheClick)
    const validRegion = REGIONS.find((r) => r.value.toLowerCase() === (region ?? '').toLowerCase());
    const localEnvironment = ENVIRONMENTS.find((l) => l.label === "Local");  
    const cacheRoute = ROUTES.find((l) => l.label === "Cache");

    if(!validRegion) {
        console.error('Region not Identified');
        return;
    }

    //Global variable assigned
    cacheUrl = (validRegion && localEnvironment && cacheRoute) ?
        `https://${validRegion.value}.${localEnvironment.value}/${cacheRoute.value}`
        : ''; //Clear if invalid

    const cacheOn = await getFromStorage("cacheOn");
    if(cacheOn) {
        chrome.alarms.create("cache-interval-timer", {
            periodInMinutes: 0.5,
            });
    }

    //Execute Immediately
    const res = await clearCache();
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
                console.log(`Background Recieveing 'SAVE_ULR'`, jiraSprint, agoClientName, url);
                const saved = await saveUrl(url, jiraSprint, agoClientName);
                if(saved) sendResponse({ message: "URL saved" });
                break;
        }
    })();
    return true;
});
