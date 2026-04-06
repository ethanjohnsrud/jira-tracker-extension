import type { ComponentProps, MouseEvent } from "react";
import React, { useState, useEffect, useRef } from "react";
import "./index.css";
import REGIONS from "./constants/regions";
import ENVIRONMENTS from "./constants/environments";
import ROUTES from "./constants/routes";
import {
	ROUTE_DEPRIORITIZED_LABELS,
	AGO_HEADER_HYPERLINK_DEFAULT,
	JIRA_HEADER_HYPERLINK_DEFAULT,
	UK_HOSTED_TEST_REGIONS,
	QA_TEST_REGIONS,
} from "./constants/constants";

import Dropdown from "./components/Dropdown";
import Button from "./components/Button";

import { saveToStorage, removeFromStorage, getFromStorage } from "./controllers/storageController";
import { createRoot } from "react-dom/client";
import TableItem from "./components/TableItem";
import { AgoUrlListItem, JiraUrlListItem, StorageChangeCallback, UrlListItem } from "./types/storage-types";
import { Button as HeroButton } from "@heroui/react";
import { EnvironmentSelectionOption, RegionSelection, RouteSelection } from "./types/dropdown-types";
import { AGO_URL_REGEX } from "./constants/regex";
import { isAgoUrl } from "./utils/url";

type HeroButtonPressEvent = Parameters<NonNullable<ComponentProps<typeof HeroButton>["onPress"]>>[0];
type NavigationEvent = MouseEvent<HTMLAnchorElement, globalThis.MouseEvent> | HeroButtonPressEvent;

interface DropdownSelections {
	region: RegionSelection;
	environment: EnvironmentSelectionOption;
	route: RouteSelection;
}

//Global Setting
let DEBUG_MODE = false;

/**************************************************
 * popup.tsx is the React extension popup display *
 **************************************************/
const Popup = () => {
	const [dropdowns, setDropdowns] = useState<DropdownSelections>({
		region: REGIONS[0],
		environment: ENVIRONMENTS[1],
		route: ROUTES[0],
	});
	const [currentTabURL, setCurrentTabURL] = useState<string>("");
	const [agoLink, setAgoLink] = useState<string>(AGO_HEADER_HYPERLINK_DEFAULT);
	const [jiraLink, setJiraLink] = useState<string>(JIRA_HEADER_HYPERLINK_DEFAULT);
	const [tabOn, setTabOn] = useState<boolean>(false);
	const [cacheOn, setCacheOn] = useState<boolean>(false);
	const [cacheLoading, setCacheLoading] = useState<boolean>(false);
	const [jiraDisplayList, setJiraDisplayList] = useState<JiraUrlListItem[]>([]);
	const [latestJiraId, setLatestJiraId] = useState<string>("");
	const [agoDisplayList, setAgoDisplayList] = useState<AgoUrlListItem[]>([]);
	const [latestAgoId, setLatestAgoId] = useState<string>("");

	const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>(0);
	const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const updateDropdowns = (dropdowns: Partial<DropdownSelections>) => {
		setDropdowns((prev) => ({ ...prev, ...dropdowns }));
	};

	/* Initialize Header Button Links */
	useEffect(() => {
		getFromStorage(["ago_header_link", "jira_header_link"])
			.then(({ ago_header_link, jira_header_link }) => {
				if (ago_header_link) setAgoLink(ago_header_link);
				if (jira_header_link) setJiraLink(jira_header_link);
			});
	}, []);

	/* Open URL in new or current tab */
	const openUrlTab = (event: NavigationEvent, url: string) => {
		// event.preventDefault();

		// Check if Ctrl (Windows/Linux) or Cmd (Mac) key is held down
		if (event.ctrlKey || event.metaKey) {
			chrome.tabs.create({ url }); //Redirect current Tab
			if (DEBUG_MODE) console.log("[POPUP][openUrlTab] New tab:", url);
		} else {
			chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
				chrome.tabs.update(tabs[0].id, { url });
				if (DEBUG_MODE) console.log("[POPUP][openUrlTab] Updated tab:", url);
			});
		}
	};

	/* Navigate based on dropdown config */
	const navigateTabOnChange = (config: DropdownSelections) => {
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
			const tld = environmentValue === "test" && UK_HOSTED_TEST_REGIONS.includes(regionValue) ? "co.uk" : "com";
			domain = `${regionValue.toLowerCase()}-${environmentValue}.domain.${tld}`; //TODO: source domain from settings
		}

		const url = `https://${domain}/${routeValue}`;
		if (DEBUG_MODE) console.log("[POPUP][navigateTabOnChange] Navigating to:", url, config);
		return chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			chrome.tabs.update(tabs[0].id, { url });
			if (DEBUG_MODE) console.log("[POPUP][navigateTabOnChange] Updated tab:", url);
		});
	};

	/* Handle route dropdown change */
	const onRouteChange = async (route: string) => {
		const validRoute = ROUTES.find((r) => r.value.toLowerCase() === (route ?? "").toLowerCase());
		updateDropdowns({ route: validRoute });
		if (DEBUG_MODE) console.log("[POPUP][onRouteChange] New route:", validRoute);
		navigateTabOnChange({ ...dropdowns, route: validRoute });
	};

	/* Handle region dropdown change */
	const onRegionChange = async (region: string) => {
		const validRegion = REGIONS.find((r) => r.value.toLowerCase() === (region ?? "").toLowerCase());
		updateDropdowns({ region: validRegion });
		if (DEBUG_MODE) console.log("[POPUP][onRegionChange] New region:", validRegion);
		navigateTabOnChange({ ...dropdowns, region: validRegion });
	};

	/* Handle environment dropdown change */
	const onEnvironmentChange = async (environment: string) => {
		const validEnvironment = ENVIRONMENTS.find((e) => e.value.toLowerCase() === (environment ?? "").toLowerCase());
		updateDropdowns({ environment: validEnvironment });
		if (DEBUG_MODE) console.log("[POPUP][onEnvironmentChange] New environment:", validEnvironment);
		navigateTabOnChange({ ...dropdowns, environment: validEnvironment });
	};

	/* Toggle tab linking feature */
	const handleTabToggle = async () => {
		const newTabOn = !tabOn;
		setTabOn(newTabOn);
		await saveToStorage({ tabOn: newTabOn });
		if (DEBUG_MODE) console.log("[POPUP][handleTabToggle] tabOn:", newTabOn);
	};

	/* Toggle cache polling on/off */
	const handleCacheClick = async () => {
		try {
			const { environment } = await getFromStorage("environment");
			const newCacheState = !cacheOn;
			const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

			if (newCacheState) {
				if (environment.includes("localhost")) {
					setCacheOn(true);
					await saveToStorage({ cacheTabId: tab.id });
					if (DEBUG_MODE) console.log("[POPUP][handleCacheClick] Cache polling started");
				} else {
					if (DEBUG_MODE) console.log("[POPUP][handleCacheClick] Cache polling Blocked outside localhost");
				}
			} else {
				setCacheOn(false);
				await removeFromStorage("cacheTabId");
				if (DEBUG_MODE) console.log("[POPUP][handleCacheClick] Cache polling stopped");
			}
		} catch (error) {
			if (DEBUG_MODE) console.error("[POPUP][handleCacheClick][ERROR]", error);
		}
	};

	//Alternative Manager for Cache Button
	const handleDynamicButtonClick = async (event) => {
		const matched = currentTabURL.match(AGO_URL_REGEX);

		//Local Environment -> Auto Cache Button
		if (currentTabURL.includes("localhost")) {
			handleCacheClick();

			//Current tab is AGO CLient -> Export
		} else if (matched) {
			const exportUrl = `${matched[1]}/client-export`;
			if (DEBUG_MODE) console.log("[CONTENT][handleDynamicButtonClick] exportUrl:", exportUrl, matched);
			openUrlTab(event, exportUrl);

			//Other webpage -> Import
		} else {
			const importRoute = ROUTES.find((r) => r.label === "Import");
			if (DEBUG_MODE) console.log("[CONTENT][handleDynamicButtonClick] importRoute:", importRoute);
			navigateTabOnChange({ ...dropdowns, route: importRoute });
		}
	};

	/* Link the most recently visited Jira to AGO and update AGO label */
	const handleLinkClick = async () => {
		try {
			const { jiraUrlList = [], agoUrlList = [] } = await getFromStorage(["jiraUrlList", "agoUrlList"]);
			const latestJira = jiraUrlList.reduce(
				(latest, current) => (new Date(current.lastVisited) > new Date(latest.lastVisited) ? current : latest),
				jiraUrlList[0]
			);

			const latestAgo = agoUrlList.reduce(
				(latest, current) => (new Date(current.lastVisited) > new Date(latest.lastVisited) ? current : latest),
				agoUrlList[0]
			);
			if (!latestJira || !latestAgo) {
				if (DEBUG_MODE)
					console.log("[popup:handleLinkClick] Missing URLs:", { latestJiraId, latestJira, latestAgoId, latestAgo });
				return;
			}

			latestAgo.displayName = `${latestJira.displayName} | ${latestAgo.displayName}`;
			latestAgo.preserveCustomName = true;
			await saveToStorage({ agoUrlList });

			if (DEBUG_MODE) console.log("[POPUP][handleLinkClick] Linked:", latestAgo.displayName);
		} catch (error) {
			if (DEBUG_MODE) console.error("[POPUP][handleLinkClick][ERROR]", error);
		}
	};

	/* Load and sort Jira and AGO URL lists from storage */
	const loadDisplayLists = async () => {
		try {
			const { jiraUrlList = [], agoUrlList = [] } = await getFromStorage(["jiraUrlList", "agoUrlList"]);

			const sortByRecentAndFavorite = <T extends UrlListItem>(a: T, b: T) => {
				if (a.favorite && !b.favorite) return -1;
				if (!a.favorite && b.favorite) return 1;
				return new Date(b.lastVisited).getTime() - new Date(a.lastVisited).getTime();
			};

			const jiraSortedList = jiraUrlList.sort(sortByRecentAndFavorite);
			const agoSortedList = agoUrlList.sort(sortByRecentAndFavorite);

			setJiraDisplayList(jiraSortedList);
			setAgoDisplayList(agoSortedList);

			/* Determine Link Ready URLs */
			if (jiraSortedList.length > 0) {
				const latest = jiraSortedList.reduce(
					(latest, current) => (new Date(current.lastVisited) > new Date(latest.lastVisited) ? current : latest),
					jiraSortedList[0]
				);
				setLatestJiraId(latest.id);
			}

			if (agoSortedList.length > 0) {
				const latest = agoSortedList.reduce(
					(latest, current) => (new Date(current.lastVisited) > new Date(latest.lastVisited) ? current : latest),
					agoSortedList[0]
				);
				setLatestAgoId(latest.id);
			}

			if (DEBUG_MODE) console.log("[popup:loadDisplayLists] Lists loaded", { jiraSortedList, agoSortedList });
		} catch (error) {
			if (DEBUG_MODE) console.error("[popup:loadDisplayLists] Error:", error);
		}
	};

	/* Fetch next timer from storage and compute seconds left */
	const fetchNextTimer = async () => {
		try {
			const { nextTimerMS } = await getFromStorage("nextTimerMS");
			const now = Date.now();
			const msLeft = nextTimerMS - now;
			const seconds = msLeft > 0 ? Math.ceil(msLeft / 1000) : 0;
			setTimerSecondsLeft(seconds);
			if (DEBUG_MODE) console.log("[POPUP][fetchNextTimer] Seconds left:", seconds);
		} catch (error) {
			if (DEBUG_MODE) console.error("[POPUP][fetchNextTimer][ERROR]", error);
		}
	};

	/* Manage cache polling countdown */
	useEffect(() => {
		if (cacheOn) {
			const startCountdown = async () => {
				await fetchNextTimer();
				timerRef.current = setInterval(async () => {
					setTimerSecondsLeft((prev) => {
						if (prev <= 1) {
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
		const onStorageChange: StorageChangeCallback = (changes, namespace) => {
			if (namespace === "local" && (changes.jiraUrlList || changes.agoUrlList)) {
				loadDisplayLists();
			}
		};

		const init = async () => {
			const { debug, cacheTabId, tabOn, environment, region, route }
				= await getFromStorage(["debug", "cacheTabId", "tabOn", "environment", "region", "route"]);

			DEBUG_MODE = debug == true;
			if (DEBUG_MODE) console.log("[POPUP][init] Debug mode enabled");

			loadDisplayLists();

			chrome.storage.onChanged.addListener(onStorageChange);

			setTabOn(tabOn === true || tabOn === "true");
			const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
			setCacheOn(cacheTabId === tab.id);
			setCurrentTabURL(tab.url);

			const validRegion = REGIONS.find((r) => r.value.toLowerCase() === (region || "").toLowerCase()) || REGIONS[0];

			const validEnvironment =
				ENVIRONMENTS.find((e) => e.value.toLowerCase() === (environment || "").toLowerCase()) || ENVIRONMENTS[1];

			//Some have general regex; where could be more specific
			const validRoute =
				[...ROUTES]
					.sort(
						(a, b) =>
							Number(ROUTE_DEPRIORITIZED_LABELS.includes(a.label)) -
							Number(ROUTE_DEPRIORITIZED_LABELS.includes(b.label))
					)
					.find((r) => new RegExp(r.regex).test(route)) || ROUTES[0];

			setDropdowns({ region: validRegion, environment: validEnvironment, route: validRoute });
			if (DEBUG_MODE) console.log("[POPUP][init] Dropdowns set:", validRegion, validEnvironment, validRoute);
		};
		init();

		return () => chrome.storage.onChanged.removeListener(onStorageChange);
	}, []);

	return (
		<div className="w-full h-full flex flex-col items-center space-y-4">
			<div className="w-full grid grid-cols-3 gap-x-2 mt-4">
				<Dropdown label="Region" options={REGIONS} onChange={onRegionChange} value={dropdowns.region.value} />
				<Dropdown label="Environment" options={ENVIRONMENTS} onChange={onEnvironmentChange} value={dropdowns.environment.value} />
				<Dropdown label="Route" options={ROUTES} onChange={onRouteChange} value={dropdowns.route.value} />
			</div>
			<div className="w-full grid grid-cols-3 gap-3">
				<HeroButton className="w-full h-8 bg-primary text-white">Import</HeroButton>
				<HeroButton className="w-full h-8 bg-primary text-white">Basic Plan</HeroButton>
				<HeroButton className="w-full h-8 bg-primary text-white">Export</HeroButton>
			</div>
			<div className="flex gap-x-2 justify-start w-full">
				<Button label={"✎ Tab"} type={tabOn ? "primary" : "alternative-background"} onClick={handleTabToggle} />
				<Button label={"☍ Link"} className={"min-w-[50%]"} onClick={handleLinkClick} />
				{currentTabURL.includes("localhost") ? (
					<Button
						label={cacheOn ? `✨ Cache (${timerSecondsLeft})` : "✨ Cache"}
						type={cacheOn ? "primary" : "alternative-background"}
						loading={cacheLoading}
						onClick={handleCacheClick}
					/>
				) : isAgoUrl(currentTabURL) ? (
					<Button label="⇪ Export" type="primary" loading={false} onClick={handleDynamicButtonClick} />
				) : (
					<Button label="⇩ Import" type="primary" loading={false} onClick={handleDynamicButtonClick} />
				)}
			</div>
			<div className="flex justify-between w-full mt-2 gap-x-2 overflow-hidden">
				{/* 35% Width Column */}
				<div className="w-[35%] h-full overflow-y-auto overflow-x-hidden hide-scrollbar" id="scrollable">
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
				<div className="w-[65%] h-full overflow-y-auto overflow-x-hidden hide-scrollbar" id="scrollable">
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
