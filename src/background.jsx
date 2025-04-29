import { v4 as uuidv4 } from "uuid";
import { getFromStorage, saveToStorage, removeFromStorage } from "./controllers/storageController";
import {
    JIRA_REGEX,
    MAX_LIST_LENGTH,
    AGO_REGEX,
    VOYANT_REGEX
} from "./constants/constants";
import REGIONS from "./constants/regions.json";
import ENVIRONMENTS from "./constants/environments.json";
import ROUTES from "./constants/routes.json";


/*********************************************************************************************************************
* background.jsx is for the service worker which is always running in the background; however cannot access the DOM  *
**********************************************************************************************************************/

//Global 
let DEBUG_MODE = false;


/*/ Derives display name for JIRA and AGO URLs */
const getListEntryDisplayName = (url,jiraSprint,agoClientName)=>{
    if(JIRA_REGEX.test(url)){
        const match = url.match(JIRA_REGEX);
        const name = match[2] +((jiraSprint&&jiraSprint.length>0)?` [${jiraSprint}]`: '');
        if(DEBUG_MODE) console.log('[BACKGROUND][getListEntryDisplayName] JIRA name', name);
        return name;
    } else if(AGO_REGEX.test(url)){
        const groups = url.match(AGO_REGEX);
        if(!groups||groups.length<5) {
            if(DEBUG_MODE) console.log('[BACKGROUND][getListEntryDisplayName] Invalid AGO Match', url, groups);
            return 'AGO';
        }

        const region = groups[2].toUpperCase();
        const environmentPrefix = (ENVIRONMENTS.find(e=>e.value===groups[3]||e.value===groups[4])?.prefix||'ENV').toUpperCase();
        const clientSuffix = groups[5];
        const planSuffix = groups[6];
        const display = (agoClientName && agoClientName.length > 0) ? 
                        `${region}-${environmentPrefix}-${agoClientName}`
                        : `${region}-${environmentPrefix}-${clientSuffix}-${planSuffix}`;

        if(DEBUG_MODE) console.log('[BACKGROUND][getListEntryDisplayName] AGO name', display, 'from:', region, environmentPrefix, clientSuffix, planSuffix);
        return display;
    } else {
        if(DEBUG_MODE) console.error('[BACKGROUND][getListEntryDisplayName] No regex match', url);
        return false;
    }
};

/*/ Trims URL list to MAX_LIST_LENGTH removing oldest non-favorites */
const evaluateMaxListLength = urlList=>{
    if(urlList.length>MAX_LIST_LENGTH) {
        urlList.sort((a,b)=>new Date(a.lastVisited)-new Date(b.lastVisited));
        const idx=urlList.findIndex(u=>u.favorite===false);
        if(idx!==-1) urlList.splice(idx,1);
    }
    if(DEBUG_MODE) console.log('[BACKGROUND][evaluateMaxListLength] List length', urlList.length);
    return urlList;
};

/*/ Processes and saves visited URLs into storage lists */
const saveJiraUrl = async(url, jiraSprint) => {
    const isJiraUrl = JIRA_REGEX.test(url);
    if(!isJiraUrl) return false;

    const storageKey = 'jiraUrlList';
    const storedList = await getFromStorage(storageKey) || [];
    const urlList = Array.isArray(storedList) ? storedList : [];

    const capturedUrl = url.match(JIRA_REGEX)?.[1];
    if(DEBUG_MODE) console.log('[BACKGROUND][saveJiraUrl] Captured:', capturedUrl);

    if(!capturedUrl) {
        if(DEBUG_MODE) console.log('[BACKGROUND][saveJiraUrl] URL Not Captured', url);
        return false;
    }

    const displayName = getListEntryDisplayName(url, jiraSprint, null);
    if(!displayName) return false;

    let updatedUrlList = [];
    const existing = urlList.find((u) => u.url === capturedUrl);
    if(existing) {
        if(DEBUG_MODE) console.log('[BACKGROUND][saveJiraUrl] Revisiting:', displayName);
        existing.lastVisited = new Date().toISOString();
        if(!existing.preserveCustomName)
            existing.displayName = displayName;
        updatedUrlList = urlList;
    } else {
        urlList.push({
            id: uuidv4(),
            url: capturedUrl,
            displayName,
            lastVisited: new Date().toISOString(),
            favorite: false,
            preserveCustomName: false,
        });
        updatedUrlList = evaluateMaxListLength(urlList);
        if(DEBUG_MODE) console.log('[BACKGROUND][saveJiraUrl] New Entry:', capturedUrl);
    }

    await saveToStorage({ [storageKey]: updatedUrlList });
    if(DEBUG_MODE) console.log('[BACKGROUND][saveJiraUrl] Saved List', updatedUrlList.length);
    return true;
};



/* Save AGO URL to Storage List and update popup dropdowns */
const saveAGOUrl = async(url, agoClientName) => {
    const isAgoUrl = AGO_REGEX.test(url);
    if(!isAgoUrl) return false;

    const storageKey = 'agoUrlList';
    const storedList = await getFromStorage(storageKey) || [];
    const urlList = Array.isArray(storedList) ? storedList : [];

    const capturedUrl = url.match(AGO_REGEX)?.[1];
    if(DEBUG_MODE) console.log('[BACKGROUND][saveAGOUrl] Captured:', capturedUrl);

    if(!capturedUrl) {
        if(DEBUG_MODE) console.log('[BACKGROUND][saveAGOUrl] URL Not Captured', url);
        return false;
    }

    const displayName = getListEntryDisplayName(url, null, agoClientName);
    if(!displayName) return false;

    let updatedUrlList = [];
    const existing = urlList.find((u) => u.url === capturedUrl);
    if(existing) {
        if(DEBUG_MODE) console.log('[BACKGROUND][saveAGOUrl] Revisiting:', displayName);
        existing.lastVisited = new Date().toISOString();
        if(!existing.preserveCustomName && !existing.favorite)
            existing.displayName = displayName;
        updatedUrlList = urlList;
    } else {
        urlList.push({
            id: uuidv4(),
            url: capturedUrl,
            displayName,
            lastVisited: new Date().toISOString(),
            favorite: false,
            preserveCustomName: false,
        });
        updatedUrlList = evaluateMaxListLength(urlList);
        if(DEBUG_MODE) console.log('[BACKGROUND][saveAGOUrl] New Entry:', capturedUrl);
    }

    await saveToStorage({ [storageKey]: updatedUrlList });
    if(DEBUG_MODE) console.log('[BACKGROUND][saveAGOUrl] Saved List', updatedUrlList.length);

    // Additional dropdown storage (for popup)
    if(VOYANT_REGEX.test(url)) {
        const matched = url.match(VOYANT_REGEX);
        if(matched && matched.length >= 4) {
            const route = matched[1];
            const region = matched[2];
            const environment = matched[3] || matched[4];

            await saveToStorage({ region, environment, route });
            if(DEBUG_MODE) console.log('[BACKGROUND][saveAGOUrl] Saved dropdowns:', region, environment, route);
        }
    }

    return true;
};



/* Handles incoming extension messages */
chrome.runtime.onMessage.addListener((request,sender,sendResponse) => {
    (async()=>{
        switch(request.command){
            case 'GET_TAB_ID':
                if(sender?.tab?.id!==undefined) sendResponse({tabId:sender.tab.id});
                else if(DEBUG_MODE) console.warn('[BACKGROUND][onMessage] GET_TAB_ID missing sender.tab');
                break;

            case 'SAVE_JIRA_URL':
                if(DEBUG_MODE) console.log('[BACKGROUND][onMessage] SAVE_JIRA_URL',request.url);
                const savedJira = await saveJiraUrl(request.url,request.jiraSprint);
                if(savedJira) sendResponse({message:'JIRA URL saved'});
                break;
        
            case 'SAVE_AGO_URL':
                if(DEBUG_MODE) console.log('[BACKGROUND][onMessage] SAVE_AGO_URL',request.url);
                const savedAgo = await saveAGOUrl(request.url,request.agoClientName);
                if(savedAgo) sendResponse({message:'AGO URL saved'});
                break;           
        }
    })();
    return true;
});


/*/ Initializes background service worker and settings on install */
chrome.runtime.onInstalled.addListener(async()=>{
    // Initialize DEBUG_MODE after potentially saving it
    DEBUG_MODE = (await getFromStorage('debug')) === true;
    if(DEBUG_MODE) console.log('[BACKGROUND][onInstalled] DEBUG_MODE enabled');

    //Only set default values if not present
    const defaults = {
        debug: false,
        jira_header_link: JIRA_HEADER_HYPERLINK_DEFAULT,
        ago_header_link: AGO_HEADER_HYPERLINK_DEFAULT
    };

    for(const key in defaults){
        const existing = await getFromStorage(key);
        if(existing===undefined){
            await saveToStorage({[key]:defaults[key]});
            if(DEBUG_MODE) console.log(`[BACKGROUND][onInstalled] Set default: ${key} = ${defaults[key]}`);
        }
    }

    //Reset on CHrome restart
    await removeFromStorage('cacheTabId');

    if(DEBUG_MODE) console.log('[BACKGROUND][onInstalled] Service Worker initialized');
});

