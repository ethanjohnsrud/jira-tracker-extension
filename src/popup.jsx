import React, { useState, useEffect, useCallback, useRef } from "react";
import "./index.css";
import REGIONS from "./constants/regions.json";
import ENVIRONMENTS from "./constants/environments.json";
import ROUTES from "./constants/routes.json";
import {
  AGO_HEADER_HYPERLINK,
  JIRA_HEADER_HYPERLINK,
  UK_HOSTED_TEST_REGIONS,
  QA_TEST_REGIONS,
  LOCAL_CACHE_INTERVAL,
} from "./constants/constants.js";

import Dropdown from "./components/Dropdown.jsx";
import Button from "./components/Button.jsx";

import {
  saveToStorage,
  getFromStorage,
  removeFromStorage
} from "./controllers/storageController.js";
import { createRoot } from "react-dom/client";
import TableItem from "./components/TableItem.jsx";

/**************************************************
 * popup.jsx is the React extension popup display *
 **************************************************/
const Popup = () => {
  const [dropdowns, setDropdowns] = useState({
    region: REGIONS[0],
    environment: ENVIRONMENTS[1],
    route: ROUTES[0],
  });
  const [tabOn, setTabOn] = useState(false);
  const [cacheOn, setCacheOn] = useState(false);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [jiraDisplayList, setJiraDisplayList] = useState([]);
  const [latestJiraId, setLatestJiraId] = useState("");
  const [agoDisplayList, setAgoDisplayList] = useState([]);
  const [latestAgoId, setLatestAgoId] = useState("");
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(0);
  const timerRef = useRef(null);

  const openUrlTab = (event, url) => {
    // event.preventDefault();

    //Open new Tab
    if (event.ctrlKey || event.metaKey)
      // Check if Ctrl (Windows/Linux) or Cmd (Mac) key is held down
      chrome.tabs.create({ url });
    //Redirect current Tab
    else {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.update(tabs[0].id, { url });
      });
    }
  };

  const navigateTabOnChange = (event, config) => {
    let regionValue = config.region.value.toUpperCase();
    let environmentValue = config.environment.value.toLowerCase();
    const routeValue = config.route.value;

    let domain = "";
    if (environmentValue.includes("localhost")) {
      domain = `${regionValue.toLowerCase()}.${environmentValue}`;
    } else {
      //Unique Testing Domains
      if (environmentValue === "test") {
        if (QA_TEST_REGIONS.includes(regionValue)) environmentValue = "qa";
        else if (regionValue === "UNI") regionValue = "global";
      }

      const tld =
        environmentValue === "test" &&
        UK_HOSTED_TEST_REGIONS.includes(regionValue)
          ? "co.uk"
          : "com";
      domain = `${regionValue.toLowerCase()}-${environmentValue.toLowerCase()}.planwithvoyant.${tld}`;
    }

    const url = `https://${domain}/${routeValue}`;

    console.log("NAVIGATING", url, config);

    return openUrlTab(event, url);
  };

  // const saveDropDown = (data) => {
  // 	return saveToStorage({ dropdowns: data });
  // };

  const onRouteChange = async (event, route) => {
    const validRoute = ROUTES.find(
      (r) => r.value.toLowerCase() === (route ?? "").toLowerCase()
    );

    setDropdowns((prev) => ({ ...prev, route: validRoute }));
    // await saveDropDown({ ...dropdowns, route: validRoute });
    navigateTabOnChange(event, { ...dropdowns, route: validRoute });
  };

  const onRegionChange = async (event, region) => {
    const validRegion = REGIONS.find(
      (r) => r.value.toLowerCase() === (region ?? "").toLowerCase()
    );

    setDropdowns((prev) => ({ ...prev, region: validRegion }));
    // await saveDropDown({ ...dropdowns, region: validRegion });
    navigateTabOnChange(event, { ...dropdowns, region: validRegion });
  };

  const onEnvironmentChange = async (event, environment) => {
    const validEnvironment = ENVIRONMENTS.find(
      (e) => e.value.toLowerCase() === (environment ?? "").toLowerCase()
    );

    setDropdowns((prev) => ({ ...prev, environment: validEnvironment }));
    // await saveDropDown({ ...dropdowns, environment: validEnvironment });
    navigateTabOnChange(event, { ...dropdowns, environment: validEnvironment });
  };

  //Rename AGO Links
  const handleTabToggle = async () => {
    setTabOn(!tabOn);
    await saveToStorage({ tabOn: !tabOn });
  };

  // const handleCacheClick = async () => {
  //   const cacheRoute = ROUTES.find((l) => l.label === "Cache")?.value;
  //   const cacheUrl = `https://${config.region}-${config.environment}.planwithvoyant.com/${cacheRoute}`;
  //   await saveToStorage({ cacheUrl: cacheUrl });
  //   console.log('Setting cacheUrl', cacheUrl, cacheOn);

  //   setCacheOn((prev) => !prev);
  //   chrome.runtime.sendMessage({ command: "CLEAR_CACHE" });
  //   await saveToStorage({ cacheOn: !cacheOn });
  // };

  const handleCacheClick = async () => {
    try {
      // const cacheUrl = `https://${dropdowns.region.value}-${dropdowns.environment.value}.planwithvoyant.com/${cacheRoute}`;          //TODO support LOCAL
      // await saveToStorage({ cacheUrl });
      // console.log('Setting cacheUrl in storage:', cacheUrl);

      const environment = await getFromStorage("environment");

      const newCacheState = !cacheOn;
      // console.log('Toggling cache status from', cacheOn, 'to', newCacheState);

      // setCacheOn(newCacheState);
      // await saveToStorage({ cacheOn: newCacheState });

      // Send message to clear cache
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if(newCacheState) {
        if(environment.includes("localhost")) {
          setCacheOn(true);
          await saveToStorage({ cacheTabId: tab.id });

        //   chrome.tabs.sendMessage(tab.id, { command: "START_CACHE_POLLING" });
        } else {
          console.log("Blocked outside localhost");
        }
      } else {
        setCacheOn(false);
        await removeFromStorage("cacheTabId");

        // chrome.tabs.sendMessage(tab.id, { command: "STOP_CACHE_POLLING" });
      }
    } catch (error) {
      console.error("Error in handleCacheClick:", error);
    }
  };

  /* Links most recently visited Jira to AGO and appends Jira ticket to AGO name */
  const handleLinkClick = async () => {
    const { jiraUrlList, agoUrlList } = await getFromStorage([
      "jiraUrlList",
      "agoUrlList",
    ]);

    // Get the last visited Jira URL
    // const lastJiraUrl = jiraUrlList?.find((url) => url.id === latestJiraId);

    // Get the last visited Adviser Go URL
    let latestAgo = agoUrlList?.find((url) => url.id === latestAgoId);

    const latestJira =
      jiraUrlList.length > 0
        ? jiraUrlList.reduce((latest, current) =>
            new Date(current.lastVisited) > new Date(latest.lastVisited)
              ? current
              : latest
          )
        : undefined;

    // const latestAgo = agoUrlList.length > 0
    // 	? agoUrlList.reduce((latest, current) => new Date(current.lastVisited) > new Date(latest.lastVisited) ? current : latest)
    // 	: undefined;

    //Check Findings
    if (!latestJira || !latestAgo) {
      console.log(
        "LINKING cannot proceed with latest:",
        latestJiraId,
        latestJira,
        latestAgoId,
        latestAgo
      );
      return;
    }

    //Modify Labels
    latestAgo.displayName = `${latestJira.displayName} | ${latestAgo.displayName}`;
    latestAgo.preserveCustomName = true;
    console.log("Linking:", latestAgo.displayName, latestAgo);

    await saveToStorage({ agoUrlList });
  };

  const loadDisplayLists = async () => {
    const { jiraUrlList = [], agoUrlList = [] } = await getFromStorage([
      "jiraUrlList",
      "agoUrlList",
    ]);

    console.log("loadDisplayLists....", jiraUrlList, agoUrlList);

    const jiraSortedList = !jiraUrlList
      ? []
      : [...jiraUrlList].sort((a, b) => {
          if (a.favorite && !b.favorite) return -1;
          if (!a.favorite && b.favorite) return 1;
          return new Date(b.lastVisited) - new Date(a.lastVisited);
        });

    const agoSortedList = !agoUrlList
      ? []
      : [...agoUrlList].sort((a, b) => {
          if (a.favorite && !b.favorite) return -1;
          if (!a.favorite && b.favorite) return 1;
          return new Date(b.lastVisited) - new Date(a.lastVisited);
        });

    setJiraDisplayList(jiraSortedList);
    setAgoDisplayList(agoSortedList);

    /* Determine Link Ready URLs */
    if (jiraUrlList && jiraUrlList.length > 0)
      setLatestJiraId(
        jiraUrlList.reduce((latest, current) =>
          new Date(current.lastVisited) > new Date(latest.lastVisited)
            ? current
            : latest
        ).id
      );

    if (agoUrlList && agoUrlList.length > 0)
      setLatestAgoId(
        agoUrlList.reduce((latest, current) =>
          new Date(current.lastVisited) > new Date(latest.lastVisited)
            ? current
            : latest
        ).id
      );

    const latestJira =
      jiraUrlList.length > 0
        ? jiraUrlList.reduce((latest, current) =>
            new Date(current.lastVisited) > new Date(latest.lastVisited)
              ? current
              : latest
          )
        : null;

    const latestAgo =
      agoUrlList.length > 0
        ? agoUrlList.reduce((latest, current) =>
            new Date(current.lastVisited) > new Date(latest.lastVisited)
              ? current
              : latest
          )
        : null;

    console.log("DisplayList Calculated:", {
      "Jira URL List": jiraUrlList,
      "AGO URL List": agoUrlList,
      "Sorted Jira List": jiraSortedList,
      "Sorted AGO List": agoSortedList,
      "Latest Jira ID": latestJira,
      "Latest AGO ID": latestAgo,
    });
  };

  const fetchNextTimer = async () => {
    const nextTimerMS = await getFromStorage("nextTimerMS");
    const now = new Date().getTime();
    const msLeft = nextTimerMS - now;

	console.log('NEXT SET', msLeft, nextTimerMS, now);

    if (isNaN(nextTimerMS) || isNaN(msLeft) || msLeft <= 0) {
      // In the past: show 0 and retry every second
      setTimerSecondsLeft(0);
      return;
    }

    setTimerSecondsLeft(Math.ceil(msLeft / 1000));
  };

  useEffect(() => {
    const startCountdown = async () => {

		if(cacheOn)
			await fetchNextTimer();

		timerRef.current = setInterval(() => {
			setTimerSecondsLeft((prev) => {
			if (prev <= 1) {
				fetchNextTimer(); // Re-fetch if expired
				return 0;
			}

			return prev - 1;
			});
      }, 1000);
    };

	if(cacheOn) {
		startCountdown();
	} else {
		clearInterval(timerRef.current);
	}

    return () => {
      clearInterval(timerRef.current);
    };
  }, [cacheOn]);
  

  /************************
   * POPUP INITIALIZATION *
   ************************/

  useEffect(() => {
    console.log("INITALIZING-POPUP......");

    loadDisplayLists();

    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (
        namespace === "local" &&
        (changes.jiraUrlList || changes.agoUrlList)
      ) {
        loadDisplayLists();
      }
    });

    /* This runs every time the extension icon is clicked and initiated */
    const init = async () => {
      const { cacheTabId, tabOn, region, environment, route } =
        await getFromStorage([
          "cacheTabId",
          "tabOn",
          "environment",
          "region",
          "route",
        ]);

      setTabOn(tabOn === true || tabOn === "true");

	  const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      setCacheOn(cacheTabId === tab.id);


      // Validate the values against the predefined lists
      const validRegion =
        REGIONS.find(
          (r) => r.value.toLowerCase() === (region ?? "").toLowerCase()
        ) ?? REGIONS[0];
      const validEnvironment =
        environment === "local"
          ? ENVIRONMENTS.find((e) => e.label.toLowerCase() === "local")
          : ENVIRONMENTS.find(
              (e) => e.value.toLowerCase() === (environment || "").toLowerCase()
            ) || ENVIRONMENTS[1];
      const validRoute =
        ROUTES.find((r) => new RegExp(r.regex).test(route)) ?? ROUTES[0];

      console.log(
        "initialize-dropdowns...",
        region,
        validRegion,
        environment,
        validEnvironment,
        route,
        validRoute
      );

      //Assign full object: { "label": "US", "value": "US" } or undefined
      setDropdowns({
        region: validRegion,
        environment: validEnvironment,
        route: validRoute,
      });
    };

    init();

    // Cleanup: Remove storage listener when component unmounts
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);


  return (
    <div className="w-full h-full flex flex-col items-center ">
      <div className="w-full h-4 flex justify-center items-center py-3 gap-x-2 mt-2 mb-4">
        <Dropdown
          options={REGIONS}
          onChange={onRegionChange}
          value={dropdowns.region.value}
        />
        <Dropdown
          options={ENVIRONMENTS}
          onChange={onEnvironmentChange}
          value={dropdowns.environment.value}
        />
        <Dropdown
          options={ROUTES}
          onChange={onRouteChange}
          value={dropdowns.route.value}
        />
      </div>
      <div className="flex gap-x-2 justify-start w-full">
        <Button
          label={"Tab"}
          type={tabOn ? "primary" : "alternative-background"}
          onClick={handleTabToggle}
        />
        <Button
          label={"Link"}
          className={"min-w-[50%]"}
          onClick={handleLinkClick}
        />
        <Button
          label={cacheOn ? `Cache (${timerSecondsLeft})` : "Cache"}
          type={cacheOn ? "primary" : "alternative-background"}
          loading={cacheLoading}
          onClick={handleCacheClick}
        />
      </div>
      <div className="flex justify-between w-full mt-2 gap-x-2 overflow-hidden">
        {/* 35% Width Column */}
        <div className="w-[35%] h-full" id="scrollable">
          <a
            href={JIRA_HEADER_HYPERLINK}
            target="_self"
            onClick={(e) => openUrlTab(e, JIRA_HEADER_HYPERLINK)}
            className="text-primary text-[14px] font-bold pl-3"
          >
            Jira
          </a>
          <div className="border-b-2 border-primary mb-2" />
          <div className="flex flex-col w-full h-full max-h-[400px] overflow-x-hidden overflow-y-auto hide-scrollbar p-0">
            {jiraDisplayList.map((item, index) => (
              <TableItem
                key={index}
                storageListKey="jiraUrlList"
                {...item}
                linkReady={item.id == latestJiraId}
                className={index % 2 === 0 ? "bg-alternative-background" : ""}
              />
            ))}
          </div>
        </div>

        {/* 65% Width Column */}
        <div className="w-[65%] h-full" id="scrollable">
          <a
            href={AGO_HEADER_HYPERLINK}
            target="_self"
            onClick={(e) => openUrlTab(e, AGO_HEADER_HYPERLINK)}
            className="text-primary text-[14px] font-bold pl-3"
          >
            Adviser Go
          </a>
          <div className="border-b-2 border-primary mb-2" />
          <div className="flex flex-col w-full h-full max-h-[400px] overflow-x-hidden overflow-y-auto hide-scrollbar">
            {agoDisplayList.map((item, index) => (
              <TableItem
                key={index}
                storageListKey="agoUrlList"
                {...item}
                linkReady={item.id == latestAgoId}
                className={index % 2 === 0 ? "bg-alternative-background" : ""}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("react-target"));
root.render(<Popup />);
