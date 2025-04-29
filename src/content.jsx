import { getFromStorage } from "./controllers/storageController";
import {  JIRA_REGEX, VOYANT_REGEX, AGO_REGEX, DOM_NAMING_TIMEOUT, AGO_CLIENT_NAME_ELEMENT_ID, JIRA_SPRINT_ELEMENT_SELECTOR, URL_SAVING_INTERVAL, AGO_TAB_RENAMING_INTERVAL } from "./constants/constants";
import REGIONS from "./constants/regions.json";
import ENVIRONMENTS from "./constants/environments.json";
import ROUTES from "./constants/routes.json";

/* **********************************************************
* content.jsx | Used for is for manipulating the DOM        *
* Runs in current tab, so console.log will be under inspect *
*************************************************************/

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
        const agoClientName = VOYANT_REGEX.test(url) ? await extractAGOClientLastName() : ''; //Empty string when not applicable
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

const getListEntryDisplayName = (url) => {
    /* AGO List Entries */
    if ((AGO_REGEX.test(url))) {
        const urlMatchGroups = url.match(AGO_REGEX);

        if (!urlMatchGroups || urlMatchGroups.length < 5) {
            console.log('Invalid AGO Name Match', url, AGO_REGEX, urlMatchGroups);
            return 'AGO';
        }

        const region = urlMatchGroups[1].toUpperCase();
        const environmentPrefix = (ENVIRONMENTS.find(env => env.value === urlMatchGroups[2])?.prefix || 'ENV').toUpperCase();
        const clientSuffix = urlMatchGroups[3];
        const planSuffix = urlMatchGroups[4];

        return `${region}-${environmentPrefix}-${clientSuffix}-${planSuffix}`;

    } else {
        console.error('DisplayName - Did Not Match', url, JIRA_REGEX, AGO_REGEX);
        return false;
    }
};


const renameAGOTab = async (url) => {
    //Rename AGO Tabs
    if (AGO_REGEX.test(url)) {
        const tabOn = await getFromStorage("tabOn");
        const displayName = await getListEntryDisplayName(url);

        if (tabOn && displayName) {
            document.title = displayName;
            console.log('AGO-renaimg', displayName);

            setTimeout(() => {
                document.title = displayName;
                console.log('timeout-renaimg', displayName);
            }, (10 * 1000)); //Override AGO
        }
    }
}


const initializeAGOTabRenaming = async () => {

    const renameAGOTab = async () => {
        const tabOn = await getFromStorage("tabOn");
        const url = window.location.href;
        const matched = url.match(AGO_REGEX);

        console.log('RENAMING-', tabOn, matched);

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

/* Initialize Extension on Chrome Start */
console.log("Initiating Content Script...");
initializeAGOTabRenaming();
initializeTabURLSaving();
