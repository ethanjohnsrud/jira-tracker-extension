import { getFromStorage } from "./controllers/storageController";
import { AGO_URL_MATCHING_REGEX, AGO_CAPTURE_NAMING_REGEX } from "./constants/constants";
import REGIONS from "./constants/regions.json";
import ENVIRONMENTS from "./constants/environments.json";
import ROUTES from "./constants/routes.json";

/* content.jsx is for manipulating the DOM */
let currentUrl = '';

const extractJiraSprint = async() => {
    try {
        let sprintElement = await document.querySelector('div[data-testid="issue-field-sprint-readview-full.ui.sprint.sprint-content.view-sprint-content"] a');

        //TODO Remove after testing
        const options = ["ACTIVE", "February 28th, 2025", "March 5, 2025", "Triage"];
        const randomIndex = Math.floor(Math.random() * options.length);
        sprintElement = {innerText: options[randomIndex] };


        if(!sprintElement?.innerText) 
            return "";

        const rawText = sprintElement ? sprintElement.innerText.trim() : "";
        const parsedDate = Date.parse(rawText);
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
        let element = await document.getElementById("client-actions-dropdown");

        //TODO Remove after testing
        const options = ["Testing", "Hanson, Hannah", "Phillips, Emily", "Sadergaski, Paul"];
        const randomIndex = Math.floor(Math.random() * options.length);
        element = {innerText: options[randomIndex] };


        if(!element?.innerText) 
            return "";

        const text = element.innerText.trim();
        return text.split(",")[0].trim(); 
    } catch(error) {
        console.warn('NOTE-ERROR in extractAGOClientLastName', error)
        return "";
    }
};


const saveUrl = async () => {
    const url = window.location.href;

    /* Extract Page Text and pass to background.jsx */
    const jiraSprint = await extractJiraSprint(); //Empty string when not applicable
    const agoClientName = await extractAGOClientLastName(); //Empty string when not applicable
    console.log(`CONTENT SENDING 'SAVE_ULR'`, jiraSprint, agoClientName, url);

    const response = await chrome.runtime.sendMessage({
        command: "SAVE_URL",
        url,
        jiraSprint,
        agoClientName
    });
    // console.log(response);
};

const getListEntryDisplayName = (url) => {
    /* AGO List Entries */
    if ((AGO_URL_MATCHING_REGEX.test(url))) {
        const urlMatchGroups = url.match(AGO_CAPTURE_NAMING_REGEX);

        if (!urlMatchGroups || urlMatchGroups.length < 5) {
            console.log('Invalid AGO Name Match', url, AGO_CAPTURE_NAMING_REGEX, urlMatchGroups);
            return 'AGO';
        }

        const region = urlMatchGroups[1].toUpperCase();
        const environmentPrefix = (ENVIRONMENTS.find(env => env.value === urlMatchGroups[2])?.prefix || 'ENV').toUpperCase();
        const clientSuffix = urlMatchGroups[3];
        const planSuffix = urlMatchGroups[4];

        return `${region}-${environmentPrefix}-${clientSuffix}-${planSuffix}`;

    } else {
        console.error('DisplayName - Did Not Match', url, JIRA_URL_MATCHING_REGEX, AGO_URL_MATCHING_REGEX);
        return false;
    }
};


const renameAGOTab = async (url) => {
    //Rename AGO Tabs
    if (AGO_URL_MATCHING_REGEX.test(url)) {
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
        const { tabOn } = await getFromStorage("tabOn");

        const url = window.location.href;
        const matched = url.match(AGO_CAPTURE_NAMING_REGEX);

        if (!matched || matched.length !== 3)
            return false;
        const displayName = `${matched[1].toUpperCase()}-${matched[2]}-${matched[3]}`;

        if (tabOn) document.title = displayName;
    };

    setInterval(async () => {
        renameAGOTab();
    }, (10 * 1000));

    renameAGOTab();
};


/* Initialize Extension on Chrome Start */
// initializeAGOTabRenaming();
saveUrl();

setInterval(() => {
    if (currentUrl !== window.location.href) {
        currentUrl = window.location.href;
        console.log("SAVING NEW URL", currentUrl)
        saveUrl();
        renameAGOTab(currentUrl);
    }
}, 1000);

console.log("Initiating Content Script...");
