import React, { useState, useEffect, useCallback, useRef } from "react";
import "./index.css";
import REGIONS from "./constants/regions.json";
import ENVIRONMENTS from "./constants/environments.json";
import ROUTES from "./constants/routes.json";
import {
	ROUTE_DEPRIORITIZED_LABELS,
	AGO_HEADER_HYPERLINK_DEFAULT,
	JIRA_HEADER_HYPERLINK_DEFAULT,
	UK_HOSTED_TEST_REGIONS,
	QA_TEST_REGIONS,
	AGO_REGEX
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


//Global Setting
let DEBUG_MODE = false;

/**************************************************
 * popup.jsx is the React extension popup display *
 **************************************************/
const Popup = () => {
	const [dropdowns, setDropdowns] = useState({
		region: REGIONS[0],
		environment: ENVIRONMENTS[1],
		route: ROUTES[0],
	});
	const [currentTabURL, setCurrentTabURL] = useState('');
	const [agoLink, setAgoLink] = useState(AGO_HEADER_HYPERLINK_DEFAULT);
	const [jiraLink, setJiraLink] = useState(JIRA_HEADER_HYPERLINK_DEFAULT);
	const [tabOn, setTabOn] = useState(false);
	const [cacheOn, setCacheOn] = useState(false);
	const [cacheLoading, setCacheLoading] = useState(false);
	const [jiraDisplayList, setJiraDisplayList] = useState([]);
	const [latestJiraId, setLatestJiraId] = useState("");
	const [agoDisplayList, setAgoDisplayList] = useState([]);
	const [latestAgoId, setLatestAgoId] = useState("");

	const [timerSecondsLeft, setTimerSecondsLeft] = useState(0);
	const timerRef = useRef(null);

	/* Initialize Header Button Links */
	useEffect(() => {
		(async () => {
			const storedAgo = await getFromStorage('ago_header_link');
			const storedJira = await getFromStorage('jira_header_link');
			if(storedAgo) setAgoLink(storedAgo);
			if(storedJira) setJiraLink(storedJira);
		})();
	}, []);

	/* Open URL in new or current tab */
	const openUrlTab = (event, url) => {
    // event.preventDefault();

	      // Check if Ctrl (Windows/Linux) or Cmd (Mac) key is held down
	if(event.ctrlKey || event.metaKey) {
			chrome.tabs.create({ url }); //Redirect current Tab
			if(DEBUG_MODE) console.log('[POPUP][openUrlTab] New tab:', url);
		} else {
			chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
				chrome.tabs.update(tabs[0].id, { url });
				if(DEBUG_MODE) console.log('[POPUP][openUrlTab] Updated tab:', url);
			});
		}
	};

	/* Navigate based on dropdown config */
	const navigateTabOnChange = (event, config) => {
		const regionValue = config.region.value.toUpperCase();
		let environmentValue = config.environment.value.toLowerCase();
		const routeValue = config.route.value;
		let domain = '';

		if(environmentValue.includes('localhost')) {
			domain = `${regionValue.toLowerCase()}.${environmentValue}`;

		} else { //Unique Testing Domains
			if(environmentValue === 'test') {
				if (QA_TEST_REGIONS.includes(regionValue)) environmentValue = "qa";
        		else if (regionValue === "UNI") regionValue = "global";
			}
			const tld =
				environmentValue === 'test' && UK_HOSTED_TEST_REGIONS.includes(regionValue) ? 'co.uk' : 'com';
			domain = `${regionValue.toLowerCase()}-${environmentValue}.domain.${tld}`; //TODO: source domain from settings
		}

		const url = `https://${domain}/${routeValue}`;
		if(DEBUG_MODE) console.log('[POPUP][navigateTabOnChange] Navigating to:', url, config);
		return openUrlTab(event, url);
	};

	/* Handle route dropdown change */
	const onRouteChange = async (event, route) => {
		const validRoute = ROUTES.find(
			(r) => r.value.toLowerCase() === (route ?? '').toLowerCase()
		);
		setDropdowns((prev) => ({ ...prev, route: validRoute }));
		if(DEBUG_MODE) console.log('[POPUP][onRouteChange] New route:', validRoute);
		navigateTabOnChange(event, { ...dropdowns, route: validRoute });
	};

	/* Handle region dropdown change */
	const onRegionChange = async (event, region) => {
		const validRegion = REGIONS.find(
			(r) => r.value.toLowerCase() === (region ?? '').toLowerCase()
		);
		setDropdowns((prev) => ({ ...prev, region: validRegion }));
		if(DEBUG_MODE) console.log('[POPUP][onRegionChange] New region:', validRegion);
		navigateTabOnChange(event, { ...dropdowns, region: validRegion });
	};

	/* Handle environment dropdown change */
	const onEnvironmentChange = async (event, environment) => {
		const validEnvironment = ENVIRONMENTS.find(
			(e) => e.value.toLowerCase() === (environment ?? '').toLowerCase()
		);
		setDropdowns((prev) => ({ ...prev, environment: validEnvironment }));
		if(DEBUG_MODE) console.log('[POPUP][onEnvironmentChange] New environment:', validEnvironment);
		navigateTabOnChange(event, { ...dropdowns, environment: validEnvironment });
	};

	/* Toggle tab linking feature */
	const handleTabToggle = async () => {
		const newTabOn = !tabOn;
		setTabOn(newTabOn);
		await saveToStorage({ tabOn: newTabOn });
		if(DEBUG_MODE) console.log('[POPUP][handleTabToggle] tabOn:', newTabOn);
	};

	/* Toggle cache polling on/off */
	const handleCacheClick = async () => {
		try {
			const environment = await getFromStorage('environment');
			const newCacheState = !cacheOn;
			const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

			if(newCacheState) {
				if(environment.includes('localhost')) {
					setCacheOn(true);
					await saveToStorage({ cacheTabId: tab.id });
					if(DEBUG_MODE) console.log('[POPUP][handleCacheClick] Cache polling started');
				} else {
					if(DEBUG_MODE) console.log('[POPUP][handleCacheClick] Cache polling Blocked outside localhost');
				}
			} else {
				setCacheOn(false);
				await removeFromStorage('cacheTabId');
				if(DEBUG_MODE) console.log('[POPUP][handleCacheClick] Cache polling stopped');
			}
		} catch (error) {
			if(DEBUG_MODE) console.error('[POPUP][handleCacheClick][ERROR]', error);
		}
	};

	//Alternative Manager for Cache Button
	const handleDynamicButtonClick = async(event) => {
		const matched = currentTabURL.match(AGO_REGEX);

		//Local Environment -> Auto Cache Button
		if(currentTabURL.includes('localhost')) {
			handleCacheClick();

		//Current tab is AGO CLient -> Export
		} else if(matched) {
			const exportUrl = `${matched[1]}/client-export`;
    		if(DEBUG_MODE) console.log('[CONTENT][handleDynamicButtonClick] exportUrl:', exportUrl, matched);
			openUrlTab(event, exportUrl);

		//Other webpage -> Import	
		} else {
			const importRoute = ROUTES.find((r) => r.label === "Import");
			if(DEBUG_MODE) console.log('[CONTENT][handleDynamicButtonClick] importRoute:', importRoute);
			navigateTabOnChange(event, { ...dropdowns, route: importRoute});
		}
	}

/* Link the most recently visited Jira to AGO and update AGO label */
	const handleLinkClick = async () => {
		try {
			const { jiraUrlList = [], agoUrlList = [] } = await getFromStorage([
				'jiraUrlList',
				'agoUrlList',
			]);
			const latestJira = jiraUrlList.reduce((latest, current) =>
				new Date(current.lastVisited) > new Date(latest.lastVisited)
				  ? current : latest,
				jiraUrlList[0]
			  );
		  
			  const latestAgo = agoUrlList.reduce((latest, current) =>
				new Date(current.lastVisited) > new Date(latest.lastVisited)
				  ? current : latest,
				agoUrlList[0]
			  );
			if(!latestJira || !latestAgo) {
				if(DEBUG_MODE) console.log("[popup:handleLinkClick] Missing URLs:", { latestJiraId, latestJira, latestAgoId, latestAgo });
				return;
			}

			latestAgo.displayName = `${latestJira.displayName} | ${latestAgo.displayName}`;
			latestAgo.preserveCustomName = true;
			await saveToStorage({ agoUrlList });

			if(DEBUG_MODE) console.log('[POPUP][handleLinkClick] Linked:', latestAgo.displayName);
		} catch (error) {
			if(DEBUG_MODE) console.error('[POPUP][handleLinkClick][ERROR]', error);
		}
	};

	/* Load and sort Jira and AGO URL lists from storage */
	const loadDisplayLists = async () => {
		try {
			const { jiraUrlList = [], agoUrlList = [] } = await getFromStorage([
				'jiraUrlList',
				'agoUrlList',
			]);

	const sortByRecentAndFavorite = (a, b) => {
		if (a.favorite && !b.favorite) return -1;
		if (!a.favorite && b.favorite) return 1;
		return new Date(b.lastVisited) - new Date(a.lastVisited);
		};

    const jiraSortedList = jiraUrlList.sort(sortByRecentAndFavorite);
    const agoSortedList = agoUrlList.sort(sortByRecentAndFavorite);

			setJiraDisplayList(jiraSortedList);
			setAgoDisplayList(agoSortedList);

			/* Determine Link Ready URLs */
			if(jiraSortedList.length > 0) {
				const latest = jiraSortedList.reduce((latest, current) =>
				  new Date(current.lastVisited) > new Date(latest.lastVisited)
					? current
					: latest,
				  jiraSortedList[0]
				);
				setLatestJiraId(latest.id);
			  }
		  
			  if(agoSortedList.length > 0) {
				const latest = agoSortedList.reduce((latest, current) =>
				  new Date(current.lastVisited) > new Date(latest.lastVisited)
					? current
					: latest,
				  agoSortedList[0]
				);
				setLatestAgoId(latest.id);
			  }
		  
			  if(DEBUG_MODE)
				console.log("[popup:loadDisplayLists] Lists loaded", {jiraSortedList, agoSortedList,});
			} catch (error) {
			  if(DEBUG_MODE) console.error("[popup:loadDisplayLists] Error:", error);
			}
		  };

	/* Fetch next timer from storage and compute seconds left */
	const fetchNextTimer = async () => {
		try {
			const nextTimerMS = await getFromStorage('nextTimerMS');
			const now = Date.now();
			const msLeft = nextTimerMS - now;
			const seconds = msLeft > 0 ? Math.ceil(msLeft / 1000) : 0;
			setTimerSecondsLeft(seconds);
			if(DEBUG_MODE) console.log('[POPUP][fetchNextTimer] Seconds left:', seconds);
		} catch (error) {
			if(DEBUG_MODE) console.error('[POPUP][fetchNextTimer][ERROR]', error);
		}
	};

	/* Manage cache polling countdown */
	useEffect(() => {
		if(cacheOn) {
			const startCountdown = async () => {
				await fetchNextTimer();
				timerRef.current = setInterval(async () => {
					setTimerSecondsLeft((prev) => {
						if(prev <= 1) {
							fetchNextTimer();
							return 0;
						}
						return prev - 1;
					});
				}, 1000);
			};
			startCountdown();
		} else {
			clearInterval(timerRef.current);
		}
		return () => clearInterval(timerRef.current);
	}, [cacheOn]);

	/* Initialize popup state and storage listeners */
	useEffect(() => {
		const init = async () => {
			DEBUG_MODE = (await getFromStorage('debug')) == true;
			if(DEBUG_MODE) console.log('[POPUP][init] Debug mode enabled');

			loadDisplayLists();

			chrome.storage.onChanged.addListener((changes, namespace) => {
				if(namespace === 'local' && (changes.jiraUrlList || changes.agoUrlList)) {
					loadDisplayLists();
				}
			});


			const { cacheTabId, tabOn, environment, region, route } = await getFromStorage([
				'cacheTabId',
				'tabOn',
				'environment',
				'region',
				'route',
			]);

			setTabOn(tabOn === true || tabOn === 'true');
			const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
			setCacheOn(cacheTabId === tab.id);
			setCurrentTabURL(tab.url);

			const validRegion = REGIONS.find((r) => r.value.toLowerCase() === (region || '').toLowerCase()) || REGIONS[0];

			const validEnvironment = ENVIRONMENTS.find((e) => e.value.toLowerCase() === (environment || '').toLowerCase()) || ENVIRONMENTS[1];

			//Some have general regex; where could be more specific
			const validRoute = [...ROUTES].sort((a, b) => ROUTE_DEPRIORITIZED_LABELS.includes(a.label) - ROUTE_DEPRIORITIZED_LABELS.includes(b.label))
				.find((r) => new RegExp(r.regex).test(route)) || ROUTES[0];

			setDropdowns({ region: validRegion, environment: validEnvironment, route: validRoute });
			if(DEBUG_MODE)
				console.log('[POPUP][init] Dropdowns set:', validRegion, validEnvironment, validRoute);
		};
		init();
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
					label={"✎ Tab"}
					type={tabOn ? "primary" : "alternative-background"}
					onClick={handleTabToggle}
				/>
				<Button
					label={"☍ Link"}
					className={"min-w-[50%]"}
					onClick={handleLinkClick}
				/>
				{currentTabURL.includes('localhost') ? (
					<Button
						label={cacheOn ? `✨ Cache (${timerSecondsLeft})` : '✨ Cache'}
						type={cacheOn ? 'primary' : 'alternative-background'}
						loading={cacheLoading}
						onClick={handleCacheClick}
					/>
					) : currentTabURL.match(AGO_REGEX) ? (
					<Button
						label="⇪ Export"
						type="primary"
						loading={false}
						onClick={handleDynamicButtonClick}
					/>
					) : (
					<Button
						label="⇩ Import"
						type="primary"
						loading={false}
						onClick={handleDynamicButtonClick}
					/>
				)}
			</div>
			<div className="flex justify-between w-full mt-2 gap-x-2 overflow-hidden">
				{/* 35% Width Column */}
				<div className="w-[35%] h-full" id="scrollable">
					<a
						href={jiraLink}
						target="_self"
						onClick={(e) => openUrlTab(e, jiraLink)}
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
						href={agoLink}
						target="_self"
						onClick={(e) => openUrlTab(e, agoLink)}
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
