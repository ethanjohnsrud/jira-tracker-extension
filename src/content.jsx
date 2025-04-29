import { getFromStorage, saveToStorage } from "./controllers/storageController";
import {  JIRA_REGEX, VOYANT_REGEX, AGO_REGEX, DOM_NAMING_TIMEOUT, AGO_CLIENT_NAME_ELEMENT_ID, JIRA_SPRINT_ELEMENT_SELECTOR, URL_SAVING_INTERVAL, AGO_TAB_RENAMING_INTERVAL, LOCAL_CACHE_INTERVAL } from "./constants/constants";
import REGIONS from "./constants/regions.json";
import ENVIRONMENTS from "./constants/environments.json";
import ROUTES from "./constants/routes.json";

/* **********************************************************
* content.jsx | Used for is for manipulating the DOM        *
* Runs in current tab, so console.log will be under inspect *
*************************************************************/

/* GLobal Context */
let thisTabId = null;

// Get and cache this tab's ID on content script initialization
    //Content.jsx does not know it's own tabId, so must proxy from background.jsx
chrome.runtime.sendMessage({ command: "GET_TAB_ID" }, (tabId) => {
  thisTabId = tabId;
  console.log("Tab ID initialized:", thisTabId);
  // Optionally: you could call initializeLocalClearCache() right here if needed
});


//Used for extracting page after DOM loads
const waitForDOM = (fetchElement) => {
    return new Promise((resolve, reject) => {
      const observer = new MutationObserver(() => {
        const element = fetchElement();
        if(element) {
          observer.disconnect();
          resolve(element);
        }
      });
  
      observer.observe(document.body, { childList: true, subtree: true });
  
      // Timeout logic
      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element not found within ${DOM_NAMING_TIMEOUT}ms`));
      }, DOM_NAMING_TIMEOUT);
    });
  };

  
const extractJiraSprint = async() => {
    try {
        let sprintElement = await waitForDOM(() => document.querySelector(JIRA_SPRINT_ELEMENT_SELECTOR));

        //TODO Remove after testing
        // const options = ["ACTIVE", "February 28th, 2025", "March 5, 2025", "Triage"];
        // const randomIndex = Math.floor(Math.random() * options.length);
        // sprintElement = {innerText: options[randomIndex] };

        console.log('CONTENT-extractJiraSprint', sprintElement?.innerText)

        if(!sprintElement?.innerText) {
            console.log('CONTENT-extractJiraSprint-coulnd\'t identify sprint');
            return "";
    }

        const rawText = sprintElement ? sprintElement.innerText.trim() : "";
        const cleanText = rawText.replace(/(\d+)(st|nd|rd|th)/, '$1'); //Removing the date Ordinals
        const parsedDate = Date.parse(cleanText);
        const value = isNaN(parsedDate) ? rawText : new Date(parsedDate);

        if(value instanceof Date && !isNaN(value))
            return value.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).replace(',', '').replace(' ', '-');
        else if(value === "ACTIVE")
            return "ACT";
        else if(value === "Backlog" || value === "TRIAGED")
            return "";
        else
            return "";
    } catch(error) {
        console.warn('NOTE-ERROR in extractJiraSprint', error)
        return "";
    }
}

const extractAGOClientLastName = async() => { 
    try {
        let element = await waitForDOM(() => document.getElementById(AGO_CLIENT_NAME_ELEMENT_ID));

        //TODO Remove after testing
        // const options = ["Testing", "Hanson, Hannah", "Phillips, Emily", "Sadergaski, Paul"];
        // const randomIndex = Math.floor(Math.random() * options.length);
        // element = {innerText: options[randomIndex] };

console.log('CONTENT-extractAGOClientLastName', element?.innerText, element);


        if(!element?.innerText) 
            return "";

        const text = element.innerText.trim();
        return text.split(",")[0].trim(); 
    } catch(error) {
        console.warn('NOTE-ERROR in extractAGOClientLastName', error)
        return "";
    }
};


const saveUrl = async(url) => {
    // const url = window.location.href;

    if(JIRA_REGEX.test(url) || VOYANT_REGEX.test(url)) {
        /* Extract Page Text and pass to background.jsx */
        const jiraSprint = JIRA_REGEX.test(url) ? await extractJiraSprint() : ''; //Empty string when not applicable
        const agoClientName = AGO_REGEX.test(url) ? await extractAGOClientLastName() : ''; //Empty string when not applicable
        console.log(`CONTENT SENDING 'SAVE_ULR'`, jiraSprint, agoClientName, url);

        const response = await chrome.runtime.sendMessage({
            command: "SAVE_URL",
            url,
            jiraSprint,
            agoClientName
        });
        // console.log(response);
    } else
        console.log('Shipping Save_URL', url);
};

// const getListEntryDisplayName = (url) => {
//     /* AGO List Entries */
//     if ((AGO_REGEX.test(url))) {
//         const urlMatchGroups = url.match(AGO_REGEX);

//         if (!urlMatchGroups || urlMatchGroups.length < 5) {
//             console.log('Invalid AGO Name Match', url, AGO_REGEX, urlMatchGroups);
//             return 'AGO';
//         }

//         const region = urlMatchGroups[1].toUpperCase();
//         const environmentPrefix = (ENVIRONMENTS.find(env => env.value === urlMatchGroups[2])?.prefix || 'ENV').toUpperCase();
//         const clientSuffix = urlMatchGroups[3];
//         const planSuffix = urlMatchGroups[4];

//         return `${region}-${environmentPrefix}-${clientSuffix}-${planSuffix}`;

//     } else {
//         console.error('DisplayName - Did Not Match', url, JIRA_REGEX, AGO_REGEX);
//         return false;
//     }
// };


// const renameAGOTab = async (url) => {
//     //Rename AGO Tabs
//     if (AGO_REGEX.test(url)) {
//         const tabOn = await getFromStorage("tabOn");
//         const displayName = await getListEntryDisplayName(url);

//         if (tabOn && displayName) {
//             document.title = displayName;
//             console.log('AGO-renaimg', displayName);

//             setTimeout(() => {
//                 document.title = displayName;
//                 console.log('timeout-renaimg', displayName);
//             }, (10 * 1000)); //Override AGO
//         }
//     }
// }


const initializeAGOTabRenaming = async () => {

    const renameAGOTab = async () => {
        const tabOn = await getFromStorage("tabOn");
        const url = window.location.href;
        const matched = url.match(AGO_REGEX);

        console.log('RENAMING-', tabOn, matched, url, AGO_REGEX);

        if(tabOn && matched) {
            const storedList = await getFromStorage('agoUrlList') || []; //Fetch storage once and ensure it's an array
            const urlList = Array.isArray(storedList) ? storedList : [];
            const item = urlList.find((u) => u.url === matched[1]);

            if(item?.displayName) {
              //Optionally remove REGIONS prefix
              const parts = item.displayName.split("-");
              const firstPart = parts[0]?.toLowerCase();
              const isRegionPrefix = REGIONS.some(r => r.value.toLowerCase() === firstPart);          
              const displayName = isRegionPrefix ? parts.slice(1).join("-") : item.displayName;
          
              document.title = displayName;
            }
          }
    };

    setInterval(async () => {
        renameAGOTab();
    }, AGO_TAB_RENAMING_INTERVAL);

    renameAGOTab();
};




/* Global */
let currentUrl = '';

const initializeTabURLSaving = async () => {
    setInterval(() => {
        if(currentUrl !== window.location.href) {
            currentUrl = window.location.href;
            console.log("SAVING NEW URL", currentUrl)
            saveUrl(currentUrl);
            // renameAGOTab(currentUrl);
        }
    }, URL_SAVING_INTERVAL);
}

/* Interval CLear Cache */
let cacheInterval;
let cacheUrl = "";

const clearCache = async () => {
    if (!cacheUrl || cacheUrl.length === 0) {
      console.log("clearCache-blocked", cacheUrl);
      return false;
    }
  
    try {
      const res = await fetch(cacheUrl, {
        method: "GET",
        credentials: "include", // includes cookies automatically from content context
      });
  
      if (res.status !== 200) {
        console.warn("Clear Cache Unavailable:", res.status, cacheUrl);
        return false;
      }
  
      console.log("Local Cache Cleared:", res.status, cacheUrl);
      return true;
    } catch (e) {
      console.error("Failed to Clear Cache with:", cacheUrl, e);
      return false;
    }
  };
  

// Starts the cache polling interval
const startCachePolling = async() => {
    stopCachePolling();

    if(cacheUrl && cacheUrl.length > 10) {  
        console.log('...starting cacheClear', cacheUrl);

        cacheInterval = setInterval(async () => {
            await clearCache();
            const nextRun = new Date(Date.now() + LOCAL_CACHE_INTERVAL).toISOString();
            await saveToStorage({ nextTimer: nextRun });
        }, LOCAL_CACHE_INTERVAL);

        //Execute Immediately:
        await clearCache();

    } else {
        console.log('Local Cache Polling blocked with invalid URL:', cacheUrl);
    }
  };
  
  // Stops the cache polling interval
  const stopCachePolling = () => {
    if (cacheInterval) {
        console.log('+++stopping cacheClear', cacheUrl);

      clearInterval(cacheInterval);
      cacheInterval = null;
    }
  };

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local" && changes.cacheTabId) {
      const newCacheTabId = changes.cacheTabId.newValue;
  
      if (newCacheTabId === thisTabId) {
        startCachePolling();
      } else {
        stopCachePolling();
      }
    }
  });
  
  
  //Cache Interval only runs on one tab at a time
  const initializeLocalClearCache = () => {
    const url = window.location.href;

    console.log('initializeLocalClearCache-cacheClear', url);

    if(!AGO_REGEX.test(url)) {
      console.log('initializeLocalClearCache-NOT AGO', url);
      return;
    }
  
    const matched = url.match(AGO_REGEX);
    if (!matched || matched.length < 4) { 
        console.log('initializeLocalClearCache-NOT AGO Regex failed', matched, url, AGO_REGEX);

        return;
    }
  
    //[Group #3] Environment planwithvoyant (integrations/staging/test) | [Group #4] Environment (local)
    const regionValue = matched[2];
    const environmentValue = matched[4];
    const localEnvironmentValue = ENVIRONMENTS.find(l => l.label === "Local")?.value;
  
    if (environmentValue !== localEnvironmentValue) {
        console.log('initializeLocalClearCache-NOT local environemnt');

        return;
    }
  
    const cacheRoute = ROUTES.find(r => r.label === "Cache");
    if (!cacheRoute) {
      console.error("Cache route not found");
      return;
    }
  
  
    //Saves on Local Tab load regardless
    cacheUrl = `https://${regionValue}.${environmentValue}/${cacheRoute.value}`;

    console.log("current-URL-matched", cacheUrl, regionValue, environmentValue, cacheRoute, matched);

  

    //Only initiate if matches existing tabId
    chrome.storage.local.get(["cacheTabId"], (result) => {
        if (result.cacheTabId === thisTabId) {
          startCachePolling();
        }
      });
  };
  






/* Initialize Extension on Chrome Start */
await initializeAGOTabRenaming();
await initializeTabURLSaving();
await initializeLocalClearCache();
console.log("Initialized Content Script...");

