import { getFromStorage, saveToStorage } from "./controllers/storageController";
import {  JIRA_REGEX, COMPANY_REGEX, AGO_REGEX, DOM_NAMING_TIMEOUT, AGO_CLIENT_NAME_ELEMENT_ID, JIRA_SPRINT_ELEMENT_SELECTOR, URL_SAVING_INTERVAL, AGO_TAB_RENAMING_INTERVAL, LOCAL_CACHE_INTERVAL } from "./constants/constants";
import REGIONS from "./constants/regions.json";
import ENVIRONMENTS from "./constants/environments.json";
import ROUTES from "./constants/routes.json";

/* **********************************************************
* content.jsx | Used for is for manipulating the DOM        *
* Runs in current tab, so console.log will be under inspect *
*************************************************************/

/* Global */
let DEBUG_MODE = true;
let currentUrl = '';

let thisTabId = null;

/* Interval Clear Cache */
let cacheInterval;
let cacheUrl = "";



/*  Create cache URL for local AGO environment */
const createCacheURL = (url = currentUrl) => {
    if(DEBUG_MODE) console.log('[CONTENT][createCacheURL] URL:', url);
    if(!AGO_REGEX.test(url)){
        if(DEBUG_MODE) console.log('[CONTENT][createCacheURL] Not an AGO URL');
        return null;
    }
    const matched = url.match(AGO_REGEX);
    if(!matched || matched.length < 4) {
        if(DEBUG_MODE) console.log('[CONTENT][createCacheURL] Regex failed', matched);
        return null;
    }
    const regionValue = matched[2];
    const environmentValue = matched[4];
    const localEnvironmentValue = ENVIRONMENTS.find(l => l.label === 'Local')?.value;
    if(environmentValue !== localEnvironmentValue){
        if(DEBUG_MODE) console.log('[CONTENT][createCacheURL] Not local environment');
        return null;
    }
    const cacheRoute = ROUTES.find(r => r.label==='Cache');
    if(!cacheRoute){
        if(DEBUG_MODE) console.error('[CONTENT][createCacheURL] Cache route not found');
        return null;
    }
    cacheUrl = `https://${regionValue}.${environmentValue}/${cacheRoute.value}`;
    if(DEBUG_MODE) console.log('[CONTENT][createCacheURL] cacheUrl:', cacheUrl);
    return cacheUrl;
};

/* Wait for a DOM element to appear */
//Utility used for extracting elements after page loads
const waitForDOM = fetchElement => {
    return new Promise((resolve, reject) => {
        const observer = new MutationObserver(() => {
            const element = fetchElement();
            if(element){
                observer.disconnect();
                resolve(element);
            }
        });
        observer.observe(document.body,{childList:true,subtree:true});
        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Element not found within ${DOM_NAMING_TIMEOUT}ms`));
        }, DOM_NAMING_TIMEOUT);
    });
};

/*  Extract the current JIRA sprint identifier */
const extractJiraSprint = async() => {
    try{
        const sprintElement = await waitForDOM(() => document.querySelector(JIRA_SPRINT_ELEMENT_SELECTOR));
        if(DEBUG_MODE) console.log('[CONTENT][extractJiraSprint] Element text:', sprintElement?.innerText);
        const rawText = sprintElement?.innerText?.trim()||'';
        if(!rawText){
            if(DEBUG_MODE) console.log('[CONTENT][extractJiraSprint] No sprint found');
            return '';
        }
        const cleanText = rawText.replace(/(\d+)(st|nd|rd|th)/, '$1');
        const parsed = Date.parse(cleanText);
        let value = isNaN(parsed)?rawText:new Date(parsed);
        if(value instanceof Date&&!isNaN(value))
            return value.toLocaleDateString('en-US', {month:'short',day:'numeric'}).replace(',','').replace(' ','-');
        if(value==='ACTIVE') return 'ACT';
        if(value==='Backlog'||value==='TRIAGED') return '';
        return '';
    }catch(error){
        if(DEBUG_MODE) console.warn('[CONTENT][extractJiraSprint] Error:', error);
        return '';
    }
};

/*  Extract AGO client last name from page */
const extractAGOClientLastName = async() => {
    try{
        const element = await waitForDOM(() => document.getElementById(AGO_CLIENT_NAME_ELEMENT_ID));
        if(DEBUG_MODE) console.log('[CONTENT][extractAGOClientLastName] Element text:', element?.innerText);
        const text = element?.innerText?.trim() || '';
        if(!text){
            if(DEBUG_MODE) console.log('[CONTENT][extractAGOClientLastName] No client name');
            return '';
        }
        return text.split(',')[0].trim();
    }catch(error){
        if(DEBUG_MODE) console.warn('[CONTENT][extractAGOClientLastName] Error:', error);
        return '';
    }
};

/*  Send URL save request to background script */
const saveUrl = async (url = currentUrl) => {
    if(JIRA_REGEX.test(url)){
      const jiraSprint = await extractJiraSprint();
      if(DEBUG_MODE) console.log('[CONTENT][saveUrl] Sending SAVE_JIRA_URL',url,jiraSprint);

      await chrome.runtime.sendMessage({
        command:'SAVE_JIRA_URL',
        url,
        jiraSprint
      });

    } else if(COMPANY_REGEX.test(url)) {
        //Dropdown storage (for popup)
        const matched = url.match(COMPANY_REGEX);
        if(matched && matched.length >= 4) {
            const route = matched[1];
            const region = matched[2];
            const environment = matched[3] || matched[4];

            await saveToStorage({ region, environment, route });
            if(DEBUG_MODE) console.log('[CONTENT][saveUrl] Saved dropdowns:', region, environment, route);
        }

        //Save AGO Plan URL
        if(AGO_REGEX.test(url)) {
            const agoClientName = await extractAGOClientLastName();
            if(DEBUG_MODE) console.log('[CONTENT][saveUrl] Sending SAVE_AGO_URL',url,agoClientName);

            await chrome.runtime.sendMessage({
                command:'SAVE_AGO_URL',
                url,
                agoClientName
            });
        }

        //Update
        createCacheURL(url);

    } else {
      if(DEBUG_MODE) console.log('[CONTENT][saveUrl] URL not tracked',url);
    }

    //Update regardless
    currentUrl = window.location.href;
  };
  

/*  Initialize AGO tab renaming based on storage setting */
const initializeAGOTabRenaming = async() => {
    const renameAGOTab = async(url = currentUrl) => {
        const tabOn = await getFromStorage('tabOn');
        if(DEBUG_MODE) console.log('[CONTENT][renameAGOTab] tabOn:', tabOn, 'URL:', url);

        const matched = url.match(AGO_REGEX);
        if(tabOn && matched){
            const storedList = await getFromStorage('agoUrlList')||[];
            const item = storedList.find(u => u.url===matched[1]);
            if(item?.displayName){
                const parts = item.displayName.split('-');
                const first = parts[0]?.toLowerCase();
                const isPref = REGIONS.some(r => r.value.toLowerCase()===first);
                document.title = isPref?parts.slice(1).join('-'):item.displayName;
                if(DEBUG_MODE) console.log('[CONTENT][renameAGOTab] New title:', document.title);
            }
        }
    };
    setInterval(renameAGOTab, AGO_TAB_RENAMING_INTERVAL);
    renameAGOTab();
};

/*  Initialize URL-saving interval */
const initializeTabURLSaving = async() => {
    setInterval(() => {
        if(currentUrl !== window.location.href){
            currentUrl = window.location.href;
            if(DEBUG_MODE) console.log('[CONTENT][initializeTabURLSaving] New URL:', currentUrl);
            saveUrl(currentUrl);
        }
    }, URL_SAVING_INTERVAL);
};

/*  Clear the local cache via fetch */
const clearCache = async() => {
    if(!cacheUrl || cacheUrl.length === 0){
        if(DEBUG_MODE) console.log('[CONTENT][clearCache] Blocked', cacheUrl);
        return false;
    }
    try{
        const res = await fetch(cacheUrl,{method:'GET',credentials:'include'});  // includes cookies automatically from content context
        if(res.status!==200){
            if(DEBUG_MODE) console.warn('[CONTENT][clearCache] Unavailable', res.status, cacheUrl);
            return false;
        }
        if(DEBUG_MODE) console.log('[CONTENT][clearCache] Cleared', res.status, cacheUrl);
        return true;
    }catch(e){
        if(DEBUG_MODE) console.error('[CONTENT][clearCache] Error:', e);
        return false;
    }
};

/*  Start the cache polling interval */
const startCachePolling = async() => {
    stopCachePolling();
    if(cacheUrl && cacheUrl.length > 10){
        if(DEBUG_MODE) console.log('[CONTENT][startCachePolling] Starting', cacheUrl);
        cacheInterval = setInterval(async() => {
            await clearCache();
            const nextDate = new Date(Date.now() + LOCAL_CACHE_INTERVAL);
            await saveToStorage({nextTimerMS: nextDate.getTime()});
        }, LOCAL_CACHE_INTERVAL);

        //Execute Immediately:
        await clearCache();
    } else {
        if(DEBUG_MODE) console.log('[CONTENT][startCachePolling] Invalid URL', cacheUrl);
    }
};

/*  Stop the cache polling interval */
const stopCachePolling = () => {
    if(cacheInterval){
        clearInterval(cacheInterval);
        cacheInterval = null;
        if(DEBUG_MODE) console.log('[CONTENT][stopCachePolling] Stopped');
    }
};

// Listen for cacheTabId changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if(namespace === 'local' && changes.cacheTabId){
        const id = changes.cacheTabId.newValue;
        if(id === thisTabId) startCachePolling();
        else stopCachePolling();
    }
});



/****************************************************
 *              Initialize Content Script           *
 ****************************************************/
const initialize = async () => {
    // Set DEBUG_MODE from storage
    DEBUG_MODE = (await getFromStorage('debug')) === true;
    if(DEBUG_MODE) console.log('[CONTENT][init] DEBUG_MODE enabled');

    //Set global variables
    await createCacheURL(window.location.href);

    // Get and cache this tab's ID
    chrome.runtime.sendMessage({ command: 'GET_TAB_ID' }, (response) => {
        if(response?.tabId !== undefined) {
            thisTabId = response.tabId;
            if(DEBUG_MODE) console.log('[CONTENT][initTabId] Tab ID:', thisTabId);

            // Check if this tab should start polling
            chrome.storage.local.get(['cacheTabId'], (result) => {
                if(result.cacheTabId === thisTabId) startCachePolling();
            });
        } else {
            if(DEBUG_MODE) console.warn('[CONTENT][initTabId] Failed to get tab ID:', response?.error);
        }
    });

    // Run other initializations
    await initializeAGOTabRenaming();
    await initializeTabURLSaving(); //Updates currentUrl

    if(DEBUG_MODE) console.log('[CONTENT][init] Content script initialized');
};

// Call the initializer
initialize();
