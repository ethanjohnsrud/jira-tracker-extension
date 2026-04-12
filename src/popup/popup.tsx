import type { ComponentProps, MouseEvent, ReactNode } from "react";
import { useState, useEffect, useRef, useMemo } from "react";
import REGIONS from "@/constants/regions";
import ENVIRONMENTS from "@/constants/environments";
import ROUTES from "@/constants/routes";
import {
  UK_HOSTED_TEST_REGIONS,
  QA_TEST_REGIONS,
  JIRA_SEARCH_URL_PREFIX,
  AGO_HEADER_HYPERLINK_DEFAULT,
  JIRA_HEADER_HYPERLINK_DEFAULT,
  ROUTE_DEPRIORITIZED_LABELS,
} from "@/constants/constants";

import Dropdown from "@/components/Dropdown";
import {
  ArrowDownToLineIcon,
  ArrowUpToLineIcon,
  CalendarDaysIcon,
  FilterIcon,
  FolderIcon,
  LinkIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";

import { removeFromStorage, getFromStorage } from "@/controllers/storageController";
import URLItemElement from "@/components/URLItemElement";
import { AgoUrlListItem, JiraUrlListItem } from "@/types/storage-types";
import { Accordion, Button as HerouiButton, PressEvent, Popover, Calendar, Chip, DateValue } from "@heroui/react";
import { getLocalTimeZone } from "@internationalized/date";
import { formatDate, isSameDay } from "date-fns";
import { EnvironmentSelectionOption, RegionSelection, RouteSelection } from "@/types/dropdown-types";
import { AGO_URL_REGEX, JIRA_CODE_REGEX } from "@/constants/regex";
import { isAgoUrl } from "@/utils/url";
import { UrlListItem } from "@/types/list-types";
import { useStorage } from "@/hooks/useStorage";
import { DEBUG_MODE } from "@/utils/state";
import PreferencePopover from "@/components/PreferencePopover";

type HerouiButtonPressEvent = Parameters<NonNullable<ComponentProps<typeof HerouiButton>["onPress"]>>[0];
type NavigationEvent = MouseEvent<HTMLAnchorElement, globalThis.MouseEvent> | HerouiButtonPressEvent;

interface DropdownSelections {
  region: RegionSelection;
  environment: EnvironmentSelectionOption;
  route: RouteSelection;
}

const ARCHIVED_COLLECTION_NAME = "Archived";

type GroupedListEntry<T extends UrlListItem> =
  | {
      kind: "item";
      id: string;
      lastVisitedMS: number;
      item: T;
    }
  | {
      kind: "folder";
      id: string;
      lastVisitedMS: number;
      collectionName: string;
      items: T[];
    };

const sortByRecentAndFavorite = <T extends UrlListItem>(a: T, b: T) => {
  if (a.favorite && !b.favorite) return -1;
  if (!a.favorite && b.favorite) return 1;
  return b.lastVisitedMS - a.lastVisitedMS;
};

const sortGroupedEntries = <T extends UrlListItem>(a: GroupedListEntry<T>, b: GroupedListEntry<T>) => {
  const aArchived = a.kind === "folder" && a.collectionName === ARCHIVED_COLLECTION_NAME;
  const bArchived = b.kind === "folder" && b.collectionName === ARCHIVED_COLLECTION_NAME;
  if (aArchived && !bArchived) return 1;
  if (!aArchived && bArchived) return -1;
  return b.lastVisitedMS - a.lastVisitedMS;
};

const buildGroupedListEntries = <T extends UrlListItem>(urlList: T[]): GroupedListEntry<T>[] => {
  const collectionGroups = new Map<string, T[]>();
  const rootItems: GroupedListEntry<T>[] = [];

  for (const item of urlList) {
    if (item.collectionName) {
      const existingItems = collectionGroups.get(item.collectionName) ?? [];
      existingItems.push(item);
      collectionGroups.set(item.collectionName, existingItems);
      continue;
    }

    rootItems.push({
      kind: "item",
      id: item.id,
      lastVisitedMS: item.lastVisitedMS,
      item,
    });
  }

  const folderItems: GroupedListEntry<T>[] = Array.from(collectionGroups.entries()).map(([collectionName, items]) => ({
    kind: "folder",
    id: `folder-${collectionName}`,
    collectionName,
    lastVisitedMS: Math.max(...items.map((item) => item.lastVisitedMS)),
    items: [...items].sort(sortByRecentAndFavorite),
  }));

  return [...rootItems, ...folderItems].sort(sortGroupedEntries);
};

const renderGroupedList = <T extends JiraUrlListItem | AgoUrlListItem>(
  entries: GroupedListEntry<T>[],
  storageListKey: "jiraUrlList" | "agoUrlList",
  latestId: string
): ReactNode =>
  entries.map((entry) => {
    if (entry.kind === "item") {
      return (
        <URLItemElement
          key={entry.id}
          storageListKey={storageListKey}
          urlItem={entry.item}
          linkReady={entry.item.id === latestId}
        />
      );
    }

    return (
      <Accordion key={entry.id} hideSeparator className="px-0">
        <Accordion.Item id={entry.id} className="border border-default-200 rounded-md bg-content1/40 overflow-hidden">
          <Accordion.Heading>
            <Accordion.Trigger className="w-full px-0 py-2 hover:bg-content2/60 transition-colors">
              <div className="flex w-full items-center gap-2 text-left">
                <FolderIcon className="size-4 text-primary shrink-0" />
                <span className="flex-1 truncate text-sm font-semibold text-white">{entry.collectionName}</span>
                <span className="text-xs text-default-400 whitespace-nowrap">{entry.items.length}</span>
                <Accordion.Indicator className="size-4 text-default-400 shrink-0" />
              </div>
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body className="pl-2 pr-0 pb-2 pt-0">
              <div className="flex flex-col gap-2">
                {entry.items.map((item) => (
                  <URLItemElement
                    key={item.id}
                    storageListKey={storageListKey}
                    urlItem={item}
                    linkReady={item.id === latestId}
                  />
                ))}
              </div>
            </Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    );
  });

/**************************************************
 * popup.tsx is the React extension popup display *
 **************************************************/
const Popup = () => {
  const { saveToStorage, storageState } = useStorage();
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
  const [latestJiraId, setLatestJiraId] = useState<string>("");
  const [latestAgoId, setLatestAgoId] = useState<string>("");
  const [jiraTargetDateFilter, setJiraTargetDateFilter] = useState<DateValue | null>(null);
  const [isAgoFilterActive, setIsAgoFilterActive] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Memoized Filtered and Sorted Jira List
  const jiraEntries = useMemo(() => {
    const filteredAndSorted = storageState.jiraUrlList
      .filter((item) => {
        const matchesDate =
          !jiraTargetDateFilter ||
          (item.targetDateMS &&
            isSameDay(new Date(item.targetDateMS), jiraTargetDateFilter.toDate(getLocalTimeZone())));

        const searchAbleFields = [item.displayName, item.jiraCode, item.title, item.sprint, item.status];
        const matchesSearch =
          !searchQuery || searchAbleFields.some((val) => val?.toLowerCase().includes(searchQuery.toLowerCase()));

        return matchesDate && matchesSearch;
      })
      .sort(sortByRecentAndFavorite);
    return filteredAndSorted;
  }, [storageState.jiraUrlList, jiraTargetDateFilter, searchQuery]);

  // Memoized Filtered and Sorted AGO List
  const agoEntries = useMemo(() => {
    const filteredAndSorted = storageState.agoUrlList
      .filter((item) => {
        const matchesFilter =
          !isAgoFilterActive ||
          (item.region.toLowerCase() === dropdowns.region.value.toLowerCase() &&
            item.environment.toLowerCase() === dropdowns.environment.value.toLowerCase());

        const searchAbleFields = [
          item.displayName,
          item.planName,
          item.clientFullName,
          item.jiraCode,
          item.region,
          item.environment,
          item.route,
        ];
        const matchesSearch =
          !searchQuery || searchAbleFields.some((val) => val?.toLowerCase().includes(searchQuery.toLowerCase()));

        return matchesFilter && matchesSearch;
      })
      .sort(sortByRecentAndFavorite);
    return filteredAndSorted;
  }, [storageState.agoUrlList, isAgoFilterActive, searchQuery, dropdowns]);

  const jiraGroupedEntries = useMemo(() => buildGroupedListEntries(jiraEntries), [jiraEntries]);
  const agoGroupedEntries = useMemo(() => buildGroupedListEntries(agoEntries), [agoEntries]);

  const updateDropdowns = (dropdowns: Partial<DropdownSelections>) => {
    setDropdowns((prev) => ({ ...prev, ...dropdowns }));
  };

  /* Initialize Header Button Links */
  useEffect(() => {
    getFromStorage(["ago_header_link", "jira_header_link"]).then(({ ago_header_link, jira_header_link }) => {
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
    const validRoute = ROUTES.find((r) => r.value.toLowerCase() === (route ?? "").toLowerCase())!;
    updateDropdowns({ route: validRoute });
    if (DEBUG_MODE) console.log("[POPUP][onRouteChange] New route:", validRoute);
    navigateTabOnChange({ ...dropdowns, route: validRoute });
  };

  /* Handle region dropdown change */
  const onRegionChange = async (region: string) => {
    const validRegion = REGIONS.find((r) => r.value.toLowerCase() === (region ?? "").toLowerCase())!;
    updateDropdowns({ region: validRegion });
    if (DEBUG_MODE) console.log("[POPUP][onRegionChange] New region:", validRegion);
    navigateTabOnChange({ ...dropdowns, region: validRegion });
  };

  /* Handle environment dropdown change */
  const onEnvironmentChange = async (environment: string) => {
    const validEnvironment = ENVIRONMENTS.find((e) => e.value.toLowerCase() === (environment ?? "").toLowerCase())!;
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
        if (environment?.includes("localhost")) {
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
  const handleDynamicButtonClick = async (event: PressEvent) => {
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
      const importRoute = ROUTES.find((r) => r.label === "Import")!;
      if (DEBUG_MODE) console.log("[CONTENT][handleDynamicButtonClick] importRoute:", importRoute);
      navigateTabOnChange({ ...dropdowns, route: importRoute });
    }
  };

  /* Link the most recently visited Jira to AGO and update AGO label */
  const handleLinkClick = async () => {
    try {
      const { jiraUrlList = [], agoUrlList = [] } = await getFromStorage(["jiraUrlList", "agoUrlList"]);
      const latestJira = jiraUrlList.reduce(
        (latest, current) => (current.lastVisitedMS > latest.lastVisitedMS ? current : latest),
        jiraUrlList[0]
      );

      const latestAgo = agoUrlList.reduce(
        (latest, current) => (current.lastVisitedMS > latest.lastVisitedMS ? current : latest),
        agoUrlList[0]
      );
      if (!latestJira || !latestAgo) {
        if (DEBUG_MODE)
          console.log("[popup:handleLinkClick] Missing URLs:", { latestJiraId, latestJira, latestAgoId, latestAgo });
        return;
      }

      latestAgo.displayName = `${latestJira.displayName} | ${latestAgo.displayName}`;
      latestAgo.preserveCustomName = true;
      latestAgo.jiraCode = latestJira.jiraCode;
      latestAgo.additionalLinks = latestJira.additionalLinks || [];
      const existingLink = latestAgo.additionalLinks.find((link) => link.link === latestJira.url);
      if (!existingLink) {
        latestAgo.additionalLinks.push({ link: latestJira.url, name: latestJira.jiraCode });
      }
      await saveToStorage({ agoUrlList });

      if (DEBUG_MODE) console.log("[POPUP][handleLinkClick] Linked:", latestAgo.displayName);
    } catch (error) {
      if (DEBUG_MODE) console.error("[POPUP][handleLinkClick][ERROR]", error);
    }
  };

  // Set latest Jira and AGO IDs based on storage state
  useEffect(() => {
    const jiraSortedList = storageState.jiraUrlList.sort(sortByRecentAndFavorite);
    const agoSortedList = storageState.agoUrlList.sort(sortByRecentAndFavorite);

    // Determine Link Ready URLs
    if (jiraSortedList.length > 0) {
      const latest = jiraSortedList.reduce(
        (latest, current) => (current.lastVisitedMS > latest.lastVisitedMS ? current : latest),
        jiraSortedList[0]
      );
      setLatestJiraId(latest.id);
    }

    if (agoSortedList.length > 0) {
      const latest = agoSortedList.reduce(
        (latest, current) => (current.lastVisitedMS > latest.lastVisitedMS ? current : latest),
        agoSortedList[0]
      );
      setLatestAgoId(latest.id);
    }

    if (DEBUG_MODE) console.log("[popup:loadDisplayLists] Lists loaded", { jiraSortedList, agoSortedList });
  }, [storageState.jiraUrlList, storageState.agoUrlList]);

  // Fetch next timer from storage and compute seconds left
  const fetchNextTimer = async () => {
    try {
      const now = Date.now();
      const { nextTimerMS = now } = await getFromStorage("nextTimerMS");
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
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cacheOn]);

  // Initialize tab states based on storage state and current tab
  useEffect(() => {
    setTabOn(storageState.tabOn === true || storageState.tabOn === "true");

    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      setCacheOn(storageState.cacheTabId === tab.id);
      if (tab.url) setCurrentTabURL(tab.url);
    });
  }, [storageState.tabOn, storageState.cacheTabId]);

  // Update dropdowns based on storage state
  useEffect(() => {
    const validRegion =
      REGIONS.find((r) => r.value.toLowerCase() === (storageState.region || "").toLowerCase()) || REGIONS[0];

    const validEnvironment =
      ENVIRONMENTS.find((e) => e.value.toLowerCase() === (storageState.environment || "").toLowerCase()) ||
      ENVIRONMENTS[1];

    const sortedRoutes = [...ROUTES].sort(
      (a, b) =>
        Number(ROUTE_DEPRIORITIZED_LABELS.includes(a.label)) - Number(ROUTE_DEPRIORITIZED_LABELS.includes(b.label))
    );
    //Some have general regex; where could be more specific
    const validRoute = !!storageState.route
      ? sortedRoutes.find((r) => new RegExp(r.regex).test(storageState.route)) || ROUTES[0]
      : ROUTES[0];

    if (DEBUG_MODE) console.log("[POPUP] Dropdowns set:", validRegion, validEnvironment, validRoute);
    // setDropdowns({ region: validRegion, environment: validEnvironment, route: validRoute });
  }, [storageState.environment, storageState.region, storageState.route]);

  /* Capture typing elsewhere to focus search and handle Enter */
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // If Enter is pressed and we have a Jira code match -> redirect
      if (e.key === "Enter" && searchQuery.trim()) {
        if (JIRA_CODE_REGEX.test(searchQuery.trim())) {
          const url = `${JIRA_SEARCH_URL_PREFIX}${searchQuery.trim().toUpperCase()}`;
          openUrlTab(e as unknown as NavigationEvent, url);
          return;
        }
      }

      // If typing and not in an input, autofocus search
      const activeElement = document.activeElement;
      const isInput =
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.tagName === "SELECT" ||
          (activeElement as HTMLElement).isContentEditable);

      if (!isInput && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchQuery]);

  return (
    <div className="w-full h-full flex flex-col items-center space-y-4">
      <div className="w-full flex justify-between items-center">
        <h1 className="text-xl font-semibold text-primary">Jira Tracker</h1>
        <PreferencePopover />
      </div>
      <div className="w-full grid grid-cols-3 gap-x-2">
        <Dropdown label="Region" options={REGIONS} onChange={onRegionChange} value={dropdowns.region.value} />
        <Dropdown
          label="Environment"
          options={ENVIRONMENTS}
          onChange={onEnvironmentChange}
          value={dropdowns.environment.value}
        />
        <Dropdown label="Route" options={ROUTES} onChange={onRouteChange} value={dropdowns.route.value} />
      </div>

      {/* Search Input */}
      <div className="w-full flex items-center bg-content2/40 rounded-lg px-3 py-0.5 gap-2 border border-default-200 focus-within:border-primary transition-colors">
        <SearchIcon className="size-4 text-default-400" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search Jira or AGO..."
          className="bg-transparent border-none outline-none text-sm w-full h-8 text-white placeholder:text-default-400"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <HerouiButton
            isIconOnly
            size="sm"
            variant="ghost"
            onPress={() => setSearchQuery("")}
            className="text-default-400 hover:text-white"
          >
            <XIcon className="size-4" />
          </HerouiButton>
        )}
      </div>

      <div className="w-full grid grid-cols-3 gap-3">
        <HerouiButton className="w-full h-8 bg-primary text-white font-semibold">
          <ArrowUpToLineIcon className="size-4" />
          Import
        </HerouiButton>
        <HerouiButton className="w-full h-8 bg-primary text-white font-semibold">
          <ArrowUpToLineIcon className="size-4" />
          Basic Plan
        </HerouiButton>
        <HerouiButton className="w-full h-8 bg-primary text-white font-semibold">
          <ArrowDownToLineIcon className="size-4" />
          Export
        </HerouiButton>
      </div>
      {/* TODO: Remove these section after migration */}
      {/* <div className="flex gap-x-2 justify-start w-full">
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
			</div> */}
      <div className="flex justify-between w-full mt-2 gap-x-2 relative">
        {/* 40% Width Column */}
        <div className="w-[40%] h-full overflow-y-auto hide-scrollbar">
          <div className="flex items-center gap-1">
            <div className="w-5">{/* Empty space for the layout */}</div>
            <div className="flex-1 flex justify-between items-center border-b-2 border-primary mb-2 sticky top-0 z-10 bg-background">
              <a
                href={jiraLink}
                target="_self"
                onClick={(e) => openUrlTab(e, jiraLink)}
                className="text-primary text-[14px] font-bold pl-1"
              >
                Jira
              </a>
              {/* Date Picker for filtering */}
              <Popover>
                <Popover.Trigger className="group rounded-full p-2 cursor-pointer hover:bg-success-hover">
                  <CalendarDaysIcon size={18} className="text-green-500 group-hover:text-white" />
                </Popover.Trigger>
                <Popover.Content className="max-w-64">
                  <Popover.Dialog>
                    <Calendar aria-label="Event date" value={jiraTargetDateFilter}>
                      <Calendar.Header>
                        <Calendar.Heading />
                        <Calendar.NavButton slot="previous" />
                        <Calendar.NavButton slot="next" />
                      </Calendar.Header>
                      <Calendar.Grid>
                        <Calendar.GridHeader>
                          {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
                        </Calendar.GridHeader>
                        <Calendar.GridBody>
                          {(date) => <Calendar.Cell date={date} onClick={() => setJiraTargetDateFilter(date)} />}
                        </Calendar.GridBody>
                      </Calendar.Grid>
                    </Calendar>
                    <div className="flex justify-end mt-2">
                      {jiraTargetDateFilter && (
                        <Chip>{formatDate(jiraTargetDateFilter.toDate(getLocalTimeZone()), "MMM dd, yyyy")}</Chip>
                      )}
                      <HerouiButton size="sm" variant="ghost" onPress={() => setJiraTargetDateFilter(null)}>
                        Clear
                      </HerouiButton>
                    </div>
                  </Popover.Dialog>
                </Popover.Content>
              </Popover>
            </div>
          </div>
          <div className="flex flex-col gap-2 flex-1 h-full max-h-[300px] overflow-y-auto hide-scrollbar p-0">
            {renderGroupedList(jiraGroupedEntries, "jiraUrlList", latestJiraId)}
          </div>
        </div>

        {/* 60% Width Column */}
        <div className="flex-1 h-full overflow-y-auto overflow-x-hidden hide-scrollbar" id="scrollable">
          <div className="flex items-center gap-1">
            <span
              onClick={handleLinkClick}
              className="flex items-center justify-center p-0.5 mb-2 cursor-pointer hover:text-success-hover"
            >
              <LinkIcon className="size-4 text-primary" />
            </span>
            <div className="flex-1 flex justify-between items-center border-b-2 border-primary mb-2 sticky top-0 z-10 bg-background">
              <a
                href={agoLink}
                target="_self"
                onClick={(e) => openUrlTab(e, agoLink)}
                className="text-primary text-[14px] font-bold pl-3"
              >
                Adviser Go
              </a>
              <span
                onClick={() => setIsAgoFilterActive(!isAgoFilterActive)}
                className={`group rounded-full p-2 cursor-pointer hover:bg-success-hover ${isAgoFilterActive ? "bg-success-hover/20" : ""}`}
              >
                <FilterIcon
                  size={18}
                  className={`${isAgoFilterActive ? "text-white" : "text-green-500"} group-hover:text-white`}
                />
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2 w-full h-full max-h-[300px] overflow-x-hidden overflow-y-auto hide-scrollbar">
            {renderGroupedList(agoGroupedEntries, "agoUrlList", latestAgoId)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Popup;
