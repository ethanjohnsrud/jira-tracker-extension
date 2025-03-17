import React, { useState, useEffect, useCallback, useRef } from "react";
import "./index.css";
import REGIONS from "./constants/regions.json";
import ENVIRONMENTS from "./constants/environments.json";
import ROUTES from "./constants/routes.json";

import Dropdown from "./components/Dropdown.jsx";
import Button from "./components/Button.jsx";

import { saveToStorage, getFromStorage } from "./controllers/storageController.js";
import { createRoot } from "react-dom/client";
import TableItem from "./components/TableItem.jsx";
import { JIRA_URL_MATCHING_REGEX, AGO_URL_MATCHING_REGEX, AGO_HEADER_HYPERLINK, JIRA_HEADER_HYPERLINK } from "./constants/constants.js";


/* popup.jsx is the React extension popup display */

const Popup = () => {
	const [dropdowns, setDropdowns] = useState({
		region: "",
		environment: "",
		route: "",
	});
	const [tabOn, setTabOn] = useState(false);
	const [cacheOn, setCacheOn] = useState(false);
	const [cacheLoading, setCacheLoading] = useState(false);
	const [jiraDisplayList, setJiraDisplayList] = useState([]);
	const [latestJiraId, setLatestJiraId] = useState("");
	const [agoDisplayList, setAgoDisplayList] = useState([]);
	const [latestAgoId, setLatestAgoId] = useState("");
	const [nextTime, setNextTime] = useState(
		new Date(Date.now() + 30000).toISOString()
	);
	const [nextTimer, setNextTimer] = useState("00");
	const timerRef = useRef(null);


	const openUrlTab = (event, url) => {
		// event.preventDefault();

		//Open new Tab
		if (event.ctrlKey || event.metaKey)  // Check if Ctrl (Windows/Linux) or Cmd (Mac) key is held down
			chrome.tabs.create({ url });

		//Redirect current Tab
		else {
			chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
				chrome.tabs.update(tabs[0].id, { url });
			});
		}
	};

	const openUrlOnChange = (event, config) => {
		const url = `https://${config.region.value}-${config.environment.value}.planwithvoyant.com/${config.route.value}`;       //TODO support LOCAL

		console.log('NAVIGATING', url, config);

		return openUrlTab(event, url);
	};


	const saveDropDown = (data) => {
		return saveToStorage({ dropdowns: data });
	};

	const onRouteChange = async (event, route) => {
		const validRoute = ROUTES.find((r) => r.value.toLowerCase() === (route ?? '').toLowerCase());

		setDropdowns((prev) => ({ ...prev, route: validRoute }));
		await saveDropDown({ ...dropdowns, route: validRoute });
		openUrlOnChange(event, { ...dropdowns, route: validRoute });
	};

	const onRegionChange = async (event, region) => {
		const validRegion = REGIONS.find((r) => r.value.toLowerCase() === (region ?? '').toLowerCase());

		setDropdowns((prev) => ({ ...prev, region: validRegion }));
		await saveDropDown({ ...dropdowns, region: validRegion });
		openUrlOnChange(event, { ...dropdowns, region: validRegion });
	};

	const onEnvironmentChange = async (event, environment) => {
		const validEnvironment = ENVIRONMENTS.find((e) => e.value.toLowerCase() === (environment ?? '').toLowerCase());

		setDropdowns((prev) => ({ ...prev, environment: validEnvironment }));
		await saveDropDown({ ...dropdowns, environment: validEnvironment });
		openUrlOnChange(event, { ...dropdowns, environment: validEnvironment });
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
			const cacheRoute = ROUTES.find((l) => l.label === "Cache")?.value;
			if (!cacheRoute) {
				console.error("Cache route not found in ROUTES");
				return;
			}

			const cacheUrl = `https://${dropdowns.region.value}-${dropdowns.environment.value}.planwithvoyant.com/${cacheRoute}`;          //TODO support LOCAL
			await saveToStorage({ cacheUrl });
			console.log('Setting cacheUrl in storage:', cacheUrl);

			const newCacheState = !cacheOn;
			console.log('Toggling cache status from', cacheOn, 'to', newCacheState);

			setCacheOn(newCacheState);
			await saveToStorage({ cacheOn: newCacheState });

			// Send message to clear cache
			if(newCacheState) {
				console.log('Sending START_CACHE_INTERVAL message to initiate cache Interval');
				chrome.runtime.sendMessage({ command: "START_CACHE_INTERVAL" }); //Triggers Interval Alarm
			} else {
				console.log('Sending STOP_CACHE_INTERVAL message to initiate cache Interval');
				chrome.runtime.sendMessage({ command: "STOP_CACHE_INTERVAL" }); 
			}

		} catch (error) {
			console.error("Error in handleCacheClick:", error);
		}
	};



	/* Links most recently visited Jira to AGO and appends Jira ticket to AGO name */
	const handleLinkClick = async () => {
		const { jiraUrlList, agoUrlList } = await getFromStorage(["jiraUrlList", "agoUrlList"]);

		// Get the last visited Jira URL
		// const lastJiraUrl = jiraUrlList?.find((url) => url.id === latestJiraId);

		// Get the last visited Adviser Go URL
		let latestAgo = agoUrlList?.find((url) => url.id === latestAgoId);

		const latestJira = jiraUrlList.length > 0
			? jiraUrlList.reduce((latest, current) => new Date(current.lastVisited) > new Date(latest.lastVisited) ? current : latest)
			: undefined;

		// const latestAgo = agoUrlList.length > 0
		// 	? agoUrlList.reduce((latest, current) => new Date(current.lastVisited) > new Date(latest.lastVisited) ? current : latest)
		// 	: undefined;

		//Check Findings
		if (!latestJira || !latestAgo) {
			console.log('LINKING cannot proceed with latest:', latestJiraId, latestJira, latestAgoId, latestAgo);
			return;
		}

		//Modify Labels
		latestAgo.displayName = `${latestJira.displayName} | ${latestAgo.displayName}`;
		console.log('Linking:', latestAgo.displayName, latestAgo);

		await saveToStorage({ agoUrlList });
	}


	const loadDisplayLists = async () => {

		const { jiraUrlList = [], agoUrlList = [] } = await getFromStorage(["jiraUrlList", "agoUrlList"]);

		console.log('loadDisplayLists....', jiraUrlList, agoUrlList);


		const jiraSortedList = !jiraUrlList ? [] : [...jiraUrlList]
			.sort((a, b) => {
				if (a.favorite && !b.favorite) return -1;
				if (!a.favorite && b.favorite) return 1;
				return new Date(b.lastVisited) - new Date(a.lastVisited);
			});

		const agoSortedList = !agoUrlList ? [] : [...agoUrlList]
			.sort((a, b) => {
				if (a.favorite && !b.favorite) return -1;
				if (!a.favorite && b.favorite) return 1;
				return new Date(b.lastVisited) - new Date(a.lastVisited);
			});

		setJiraDisplayList(jiraSortedList);
		setAgoDisplayList(agoSortedList);

		/* Determine Link Ready URLs */
		 
		if (jiraUrlList && jiraUrlList.length > 0)
			setLatestJiraId(jiraUrlList.reduce((latest, current) => new Date(current.lastVisited) > new Date(latest.lastVisited) ? current : latest).id);

		if (agoUrlList && agoUrlList.length > 0)
			setLatestAgoId(agoUrlList.reduce((latest, current) => new Date(current.lastVisited) > new Date(latest.lastVisited) ? current : latest).id);



		const latestJira = jiraUrlList.length > 0
        ? jiraUrlList.reduce((latest, current) => new Date(current.lastVisited) > new Date(latest.lastVisited) ? current : latest)
        : null;

    const latestAgo = agoUrlList.length > 0
        ? agoUrlList.reduce((latest, current) => new Date(current.lastVisited) > new Date(latest.lastVisited) ? current : latest)
        : null;


		console.log('DisplayList Calculated:', {
			'Jira URL List': jiraUrlList,
			'AGO URL List': agoUrlList,
			'Sorted Jira List': jiraSortedList,
			'Sorted AGO List': agoSortedList,
			'Latest Jira ID': latestJira,
			'Latest AGO ID': latestAgo
		});
	};

	const loadTime = async () => {
		const { nextTimer } = await getFromStorage("nextTimer");
		if (nextTimer) setNextTime(nextTimer);
	};

	const loadCountdown = useCallback(async () => {
		if (timerRef.current) clearInterval(timerRef.current);
		const updateTimer = () => {
			const now = new Date().getTime();
			const distance = new Date(nextTime).getTime() - now;

			if (distance < 0) {
				setNextTimer("00");
				return;
			}
			const seconds = Math.floor((distance % (1000 * 60)) / 1000);
			setNextTimer(`${seconds.toString().padStart(2, "0")}`);
		};

		updateTimer();
		timerRef.current = setInterval(updateTimer, 1000);
	}, [nextTime]);



	useEffect(() => {

		console.log('INITALIZING-POPUP......');


		loadDisplayLists();
		loadTime();

		chrome.storage.onChanged.addListener((changes, namespace) => {
			if (namespace === "local" && changes.nextTimer) {
				setNextTime(changes.nextTimer.newValue);
			}
			if (namespace === "local" && (changes.jiraUrlList || changes.agoUrlList)) {
				loadDisplayLists();
			}
		});

		/* This runs every time the extension icon is clicked and initiated */
		const init = async () => {
			const { tabOn, cacheOn, region, environment, route } = await getFromStorage([
				"tabOn",
				"cacheOn",
				"region",
				"environment",
				"route"
			]);

			console.log('init-popup', tabOn, tabOn === true || tabOn === 'true', cacheOn, cacheOn === true || cacheOn === 'true');

			setTabOn(tabOn === true || tabOn === 'true');
			setCacheOn(cacheOn === true || cacheOn === 'true');

			// Validate the values against the predefined lists
			const validRegion = REGIONS.find((r) => r.value.toLowerCase() === (region ?? '').toLowerCase());
			const validEnvironment = ENVIRONMENTS.find((e) => e.value.toLowerCase() === (environment ?? '').toLowerCase());
			const validRoute = ROUTES.find((r) => new RegExp(r.regex).test(route));

			console.log('initialize-dropdowns...', region, validRegion, environment, validEnvironment, route, validRoute);

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

	
	useEffect(() => {
		console.log('useEffect-loadCountdown');
		loadCountdown();
	}, [nextTime, loadCountdown]);

	return (
		<div className="w-full h-full flex flex-col items-center ">
			<div className="w-full h-4 flex justify-center items-center py-3 gap-x-2 mt-3 mb-5">
				<Dropdown
					options={ENVIRONMENTS}
					onChange={onEnvironmentChange}
					value={dropdowns.environment.value}
				/>
				<Dropdown
					options={REGIONS}
					onChange={onRegionChange}
					value={dropdowns.region.value}
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
					label={cacheOn ? `Cache (${nextTimer})` : "Cache"}
					type={cacheOn ? "primary" : "alternative-background"}
					loading={cacheLoading}
					onClick={handleCacheClick}
				/>
			</div>
			<div className="flex justify-between w-full mt-3 gap-x-2 overflow-hidden">
				{/* 35% Width Column */}
				<div className="w-[35%] h-full" id="scrollable">
					<a href={JIRA_HEADER_HYPERLINK} target="_self" onClick={(e) => openUrlTab(e, JIRA_HEADER_HYPERLINK)} className="text-primary text-[16px] font-bold pl-3">Jira</a>
					<div className="border-b-2 border-primary pb-2 mb-2" />
					<div className="flex flex-col w-full h-full max-h-[400px] overflow-y-auto scrollbar p-0">
						{jiraDisplayList.map((item, index) => (
							<TableItem
								key={index}
								storageListKey="jiraUrlList"
								{...item}
								linkReady={(item.id == latestJiraId)}
								className={index % 2 === 0 ? "bg-alternative-background" : ""}
							/>
						))}
					</div>
				</div>

				{/* 65% Width Column */}
				<div className="w-[65%] h-full" id="scrollable">
					<a href={AGO_HEADER_HYPERLINK} target="_self" onClick={(e) => openUrlTab(e, AGO_HEADER_HYPERLINK)} className="text-primary text-[16px] font-bold pl-3">Adviser Go</a>
					<div className="border-b-2 border-primary pb-2 mb-2" />
					<div className="flex flex-col w-full h-full max-h-[400px] overflow-y-auto scrollbar">
						{agoDisplayList.map((item, index) => (
							<TableItem
								key={index}
								storageListKey="agoUrlList"
								{...item}
								linkReady={(item.id == latestAgoId)}
								className={index % 2 === 0 ? "bg-alternative-background" : ""}
							/>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

const root = createRoot(document.getElementById("react-target"));
root.render(<Popup />);
