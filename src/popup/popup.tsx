import type { MouseEvent } from "react";
import { useState, useEffect, useMemo, useRef, Activity } from "react";
import {
  ArrowDownToLineIcon, ArrowUpToLineIcon, CalendarDaysIcon, FilterIcon, LinkIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";

import { getFromStorage } from "@/controllers/storageController";
import { Button as HerouiButton, Popover, Calendar, Chip, DateValue, Input } from "@heroui/react";
import { formatDate, isSameDay } from "date-fns";
import { DropdownSelections } from "@/types/dropdown-types";
import { parseAGOUrl } from "@/utils/url";
import { useStorage } from "@/hooks/useStorage";
import { DEBUG_MODE } from "@/utils/state";
import PreferencePopover from "@/components/PreferencePopover";
import UrlItemEditor from "@/components/UrlItemEditor";
import { buildGroupedListEntries, renderGroupedList, sortByRecentAndFavorite, StorageListKey } from "./popup-utilities";
import type { AgoUrlListItem, JiraUrlListItem, URLItemListKey } from "@/types/storage-types";
import { SelectInput } from "@/components/SelectInput";
import { getLocalTimeZone } from "@internationalized/date";
import useActiveTab from "@/hooks/useActiveTab";

type NavigationEvent = MouseEvent<HTMLAnchorElement, globalThis.MouseEvent>;

/**************************************************
 * popup.tsx is the React extension popup display *
 **************************************************/
const Popup = () => {
  const { saveToStorage, storageState, settings } = useStorage();
  const [dropdowns, setDropdowns] = useState<DropdownSelections>({
    region: settings.REGIONS[0],
    environment: settings.ENVIRONMENTS[1],
    route: settings.ROUTES[0],
  });
  const [agoLink, setAgoLink] = useState<string>(settings.CONSTANTS.AGO_HEADER_HYPERLINK);
  const [jiraLink, setJiraLink] = useState<string>(settings.CONSTANTS.JIRA_HEADER_HYPERLINK);
  const activeTab = useActiveTab();
  const [cacheProgress, setCacheProgress] = useState<number>(0);
  const [latestJiraId, setLatestJiraId] = useState<string>("");
  const [latestAgoId, setLatestAgoId] = useState<string>("");
  const [jiraTargetDateFilter, setJiraTargetDateFilter] = useState<DateValue | null>(null);
  const [isAgoFilterActive, setIsAgoFilterActive] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [editingItem, setEditingItem] = useState<JiraUrlListItem | AgoUrlListItem | null>(null);
  const [editingListKey, setEditingListKey] = useState<URLItemListKey | null>(null);

  const handleEditRequest = (
    item: JiraUrlListItem | AgoUrlListItem,
    listKey: URLItemListKey
  ) => {
    setEditingItem(item);
    setEditingListKey(listKey);
  };

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
        if (settings.regionPreferences.QA_TEST_REGIONS.includes(regionValue)) environmentValue = "qa";
        else if (regionValue === "UNI") regionValue = "global";
      }
      const tld = environmentValue === "test" && settings.regionPreferences.UK_HOSTED_TEST_REGIONS.includes(regionValue) ? "co.uk" : "com";
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
    const validRoute = settings.ROUTES.find((r) => r.value.toLowerCase() === (route ?? "").toLowerCase())!;
    updateDropdowns({ route: validRoute });
    if (DEBUG_MODE) console.log("[POPUP][onRouteChange] New route:", validRoute);
    navigateTabOnChange({ ...dropdowns, route: validRoute });
  };

  /* Handle region dropdown change */
  const onRegionChange = async (region: string) => {
    const validRegion = settings.REGIONS.find((r) => r.value.toLowerCase() === (region ?? "").toLowerCase())!;
    updateDropdowns({ region: validRegion });
    if (DEBUG_MODE) console.log("[POPUP][onRegionChange] New region:", validRegion);
    navigateTabOnChange({ ...dropdowns, region: validRegion });
  };

  /* Handle environment dropdown change */
  const onEnvironmentChange = async (environment: string) => {
    const validEnvironment = settings.ENVIRONMENTS.find((e) => e.value.toLowerCase() === (environment ?? "").toLowerCase())!;
    updateDropdowns({ environment: validEnvironment });
    if (DEBUG_MODE) console.log("[POPUP][onEnvironmentChange] New environment:", validEnvironment);
    navigateTabOnChange({ ...dropdowns, environment: validEnvironment });
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
      latestAgo.additionalLinks = latestAgo.additionalLinks || [];
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

  const isCachePollingActive = activeTab.id !== null && storageState.cacheTabId === activeTab.id;

  // Cache polling progress calculation
  useEffect(() => {
    if (!isCachePollingActive || !storageState.nextTimerMS) {
      setCacheProgress(0);
      return;
    }

    const intervalMs = Math.max(settings.CONSTANTS.LOCAL_CACHE_INTERVAL, 10000);
    const updateProgress = () => {
      const startedAt = storageState.nextTimerMS - intervalMs;
      const elapsed = Date.now() - startedAt;
      const progress = Math.max(0, Math.min(100, (elapsed / intervalMs) * 100));
      setCacheProgress(progress);
    };

    updateProgress();
    const timer = setInterval(updateProgress, 200);
    return () => clearInterval(timer);
  }, [isCachePollingActive, storageState.nextTimerMS, settings.CONSTANTS.LOCAL_CACHE_INTERVAL]);

  // Update dropdowns based on storage state
  useEffect(() => {
    const validRegion =
      settings.REGIONS.find((r) => r.value.toLowerCase() === (storageState.region || "").toLowerCase()) || settings.REGIONS[0];

    const validEnvironment =
      settings.ENVIRONMENTS.find((e) => e.value.toLowerCase() === (storageState.environment || "").toLowerCase()) ||
      settings.ENVIRONMENTS[1];

    const ROUTE_DEPRIORITIZED_LABELS = settings.routePreferences.ROUTE_DEPRIORITIZED_LABELS;
    const sortedRoutes = [...settings.ROUTES].sort(
      (a, b) =>
        Number(ROUTE_DEPRIORITIZED_LABELS.includes(a.label)) - Number(ROUTE_DEPRIORITIZED_LABELS.includes(b.label))
    );
    //Some have general regex; where could be more specific
    const validRoute = !!storageState.route
      ? sortedRoutes.find((r) => new RegExp(r.regex).test(storageState.route)) || settings.ROUTES[0]
      : settings.ROUTES[0];

    if (DEBUG_MODE) console.log("[POPUP] Dropdowns set:", validRegion, validEnvironment, validRoute);
    // setDropdowns({ region: validRegion, environment: validEnvironment, route: validRoute });
  }, [storageState.environment, storageState.region, storageState.route]);

  /* Capture typing elsewhere to focus search and handle Enter */
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // If Enter is pressed and we have a Jira code match -> redirect
      if (e.key === "Enter" && searchQuery.trim()) {
        const JIRA_CODE_REGEX = new RegExp(settings.jiraTracking.JIRA_CODE_REGEX);
        if (JIRA_CODE_REGEX.test(searchQuery.trim())) {
          const url = `${settings.jiraTracking.JIRA_SEARCH_URL_PREFIX}${searchQuery.trim().toUpperCase()}`;
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
        if (searchQuery.length === 0) setSearchQuery(e.key);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchQuery]);

  const onImportBtnClick = () => {
    const importRoute = settings.ROUTES.find((r) => r.label.toLowerCase() == "import");
    if (!importRoute) return alert("Import route not found");
    navigateTabOnChange({ ...dropdowns, route: importRoute });
  };

  const onExportBtnClick = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.url) return alert("No URL found");
    const parsedUrl = await parseAGOUrl(tab.url);
    if (parsedUrl?.capturedUrl) {
      if (DEBUG_MODE) console.log("[POPUP] AGO URL detected", parsedUrl);
      const exportPageUrl = `${parsedUrl.capturedUrl}/client-export`;
      chrome.tabs.update(tab.id, { url: exportPageUrl });
    } else {
      if (DEBUG_MODE) console.log("[POPUP] Not an AGO URL", tab.url);
    }
  };

  const onBasicPlanBtnClick = () => {
    //TODO: Implement basic plan button click
  };

  return (
    <div>
      {isCachePollingActive && activeTab.isLocalhost && (
        <div className="absolute left-0 right-0 top-0 h-1 bg-white/10 overflow-hidden">
          <div className="h-full bg-primary transition-[width] duration-200 ease-linear" style={{ width: `${cacheProgress}%` }} />
        </div>
      )}
      <div className="relative w-full h-full flex flex-col items-center space-y-4 p-4">
        <div className="w-full flex justify-between items-center">
          <h1 className="text-xl font-semibold text-primary">Jira Tracker</h1>
          <PreferencePopover />
        </div>
        <div className="w-full grid grid-cols-3 gap-x-2">
          <SelectInput options={settings.REGIONS} onChange={onRegionChange} value={dropdowns.region.value} />
          <SelectInput
            options={settings.ENVIRONMENTS}
            onChange={onEnvironmentChange}
            value={dropdowns.environment.value}
          />
          <SelectInput
            options={settings.ROUTES}
            onChange={onRouteChange}
            value={dropdowns.route.value}
          />
        </div>

        {/* Search Input */}
        <div className="h-10 w-full">
          <Activity mode={searchQuery.length > 0 ? "visible" : "hidden"}>
            <div className="w-full flex items-center bg-content2/40 rounded-lg px-3 py-0.5 gap-2 border border-default-200 focus-within:border-primary transition-colors">
              <SearchIcon className="size-4 text-default-400" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search Jira or AGO..."
                className="bg-transparent border-none outline-none text-sm w-full text-white placeholder:text-default-400 focus:ring-0"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <HerouiButton
                isIconOnly
                size="sm"
                variant="ghost"
                onPress={() => setSearchQuery("")}
                className="text-default-400 hover:text-white"
              >
                <XIcon className="size-4" />
              </HerouiButton>
            </div>
          </Activity>
          <Activity mode={searchQuery.length <= 0 ? "visible" : "hidden"}>
            <div className="w-full grid grid-cols-3 gap-3">
              <HerouiButton size="sm" className="w-full bg-primary text-white font-semibold" onClick={onImportBtnClick}>
                <ArrowUpToLineIcon className="size-4" />
                Import
              </HerouiButton>
              <HerouiButton size="sm" className="w-full bg-primary text-white font-semibold" onClick={onBasicPlanBtnClick}>
                <ArrowUpToLineIcon className="size-4" />
                Basic Plan
              </HerouiButton>
              <HerouiButton size="sm" className="w-full bg-primary text-white font-semibold" onClick={onExportBtnClick}>
                <ArrowDownToLineIcon className="size-4" />
                Export
              </HerouiButton>
            </div>
          </Activity>
        </div>
        <div className="flex justify-between w-full gap-x-2 relative">
          {/* 40% Width Column */}
          <div className="w-[40%] h-full overflow-y-auto hide-scrollbar">
            <div className="flex items-center gap-1">
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
                      <Calendar aria-label="Event date" value={jiraTargetDateFilter} onChange={setJiraTargetDateFilter}>
                        <Calendar.Header>
                          <Calendar.Heading />
                          <Calendar.NavButton slot="previous" />
                          <Calendar.NavButton slot="next" />
                        </Calendar.Header>
                        <Calendar.Grid>
                          <Calendar.GridHeader>
                            {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
                          </Calendar.GridHeader>
                          <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
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
            <div className="flex flex-col gap-2 flex-1 h-full max-h-[370px] overflow-y-auto hide-scrollbar p-0">
              {renderGroupedList(jiraGroupedEntries, StorageListKey.JIRA, latestJiraId, handleEditRequest)}
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
            <div className="flex flex-col gap-2 w-full h-full max-h-[370px] overflow-x-hidden overflow-y-auto hide-scrollbar">
              {renderGroupedList(agoGroupedEntries, StorageListKey.AGO, latestAgoId, handleEditRequest)}
            </div>
          </div>
        </div>
      </div>
      {editingItem && editingListKey && (
        <UrlItemEditor
          isOpen
          onOpenChange={(open) => {
            if (!open) {
              setEditingItem(null);
              setEditingListKey(null);
            }
          }}
          storageListKey={editingListKey}
          urlItem={editingItem}
        />
      )}
    </div>
  );
};

export default Popup;
