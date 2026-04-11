import type { ComponentProps, MouseEvent, ReactNode } from "react";
import { useState, useEffect, useRef } from "react";
import REGIONS from "@/constants/regions";
import ENVIRONMENTS from "@/constants/environments";
import ROUTES from "@/constants/routes";
import {
  ROUTE_DEPRIORITIZED_LABELS,
  AGO_HEADER_HYPERLINK_DEFAULT,
  JIRA_HEADER_HYPERLINK_DEFAULT,
  UK_HOSTED_TEST_REGIONS,
  QA_TEST_REGIONS,
} from "@/constants/constants";

import Dropdown from "@/components/Dropdown";
import {
  ArrowDownToLineIcon,
  ArrowUpToLineIcon,
  CalendarDaysIcon,
  EllipsisVerticalIcon,
  FilterIcon,
  FolderIcon,
  LinkIcon,
} from "lucide-react";

import { removeFromStorage, getFromStorage } from "@/controllers/storageController";
import TableItem from "@/components/TableItem";
import { AgoUrlListItem, JiraUrlListItem, StorageChangeCallback } from "@/types/storage-types";
import { Accordion, Button as HerouiButton, PressEvent, Popover } from "@heroui/react";
import { EnvironmentSelectionOption, RegionSelection, RouteSelection } from "@/types/dropdown-types";
import { AGO_URL_REGEX } from "@/constants/regex";
import { isAgoUrl } from "@/utils/url";
import { UrlListItem, validateJiraList, validateAGOList } from "@/types/list-types";
import { validateCredentials } from "@/types/dropdown-types";
import { CheckboxWrapper } from "@/components/CheckboxWrapper";
import { useStorage } from "@/hooks/useStorage";
import { DEBUG_MODE } from "@/utils/state";

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

/**************************************************
 * popup.tsx is the React extension popup display *
 **************************************************/
const Popup = () => {
  const { storageState, preferences, saveToStorage, changePreference } = useStorage();
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

  const handleExport = async (type: "jira" | "ago" | "credentials") => {
    try {
      const storageKey =
        type === "jira" ? "jiraUrlList" : type === "ago" ? "agoUrlList" : ("loginCredentials" as const);
      const data = await getFromStorage(storageKey);
      const list = data[storageKey] || [];

      const blob = new Blob([JSON.stringify(list, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}_export_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      if (DEBUG_MODE) console.error(`[POPUP][handleExport] Failed to export ${type}:`, error);
    }
  };

  const handleImport = (type: "jira" | "ago" | "credentials") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          const parsed = JSON.parse(content);

          let isValid = false;
          if (type === "jira") isValid = validateJiraList(parsed, preferences.debugMode);
          else if (type === "ago") isValid = validateAGOList(parsed, preferences.debugMode);
          else if (type === "credentials") isValid = validateCredentials(parsed, preferences.debugMode);

          if (isValid) {
            if (type === "jira") {
              await saveToStorage({ jiraUrlList: parsed });
            } else if (type === "ago") {
              await saveToStorage({ agoUrlList: parsed });
            } else if (type === "credentials") {
              await saveToStorage({ loginCredentials: parsed });
            }
            // UI will be updated via storage listener calling loadDisplayLists
            if (DEBUG_MODE) console.log(`[POPUP][handleImport] Successfully imported ${type}`);
          } else {
            alert(`Invalid ${type.toUpperCase()} JSON file format.`);
          }
        } catch (error) {
          if (DEBUG_MODE) console.error(`[POPUP][handleImport] Failed to parse ${type} import:`, error);
          alert(`Failed to parse ${type.toUpperCase()} JSON file.`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
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

    const folderItems: GroupedListEntry<T>[] = Array.from(collectionGroups.entries()).map(
      ([collectionName, items]) => ({
        kind: "folder",
        id: `folder-${collectionName}`,
        collectionName,
        lastVisitedMS: Math.max(...items.map((item) => item.lastVisitedMS)),
        items: [...items].sort(sortByRecentAndFavorite),
      })
    );

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
          <TableItem
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
                    <TableItem
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

  /* Load and sort Jira and AGO URL lists from storage */
  const loadDisplayLists = async () => {
    try {
      const { jiraUrlList = [], agoUrlList = [] } = await getFromStorage(["jiraUrlList", "agoUrlList"]);

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

  /* Initialize popup state and storage listeners */
  useEffect(() => {
    const onStorageChange: StorageChangeCallback = (changes, namespace) => {
      if (namespace === "local" && (changes.jiraUrlList || changes.agoUrlList)) {
        loadDisplayLists();
      }
    };

    const init = async () => {
      const stored = await getFromStorage(["cacheTabId", "tabOn", "environment", "region", "route"]);
      const { cacheTabId, tabOn, environment, region, route } = stored;

      if (DEBUG_MODE) console.log("[POPUP][init] Debug mode enabled");

      loadDisplayLists();

      chrome.storage.onChanged.addListener(onStorageChange);

      setTabOn(tabOn === true || tabOn === "true");
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      setCacheOn(cacheTabId === tab.id);
      if (tab.url) setCurrentTabURL(tab.url);

      const validRegion = REGIONS.find((r) => r.value.toLowerCase() === (region || "").toLowerCase()) || REGIONS[0];

      const validEnvironment =
        ENVIRONMENTS.find((e) => e.value.toLowerCase() === (environment || "").toLowerCase()) || ENVIRONMENTS[1];

      const sortedRoutes = [...ROUTES].sort(
        (a, b) =>
          Number(ROUTE_DEPRIORITIZED_LABELS.includes(a.label)) - Number(ROUTE_DEPRIORITIZED_LABELS.includes(b.label))
      );
      //Some have general regex; where could be more specific
      const validRoute = !!route ? sortedRoutes.find((r) => new RegExp(r.regex).test(route)) || ROUTES[0] : ROUTES[0];

      setDropdowns({ region: validRegion, environment: validEnvironment, route: validRoute });
      if (DEBUG_MODE) console.log("[POPUP][init] Dropdowns set:", validRegion, validEnvironment, validRoute);
    };
    init();

    return () => chrome.storage.onChanged.removeListener(onStorageChange);
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center space-y-4">
      <div className="w-full flex justify-between items-center">
        <h1 className="text-xl font-semibold text-primary">Jira Tracker</h1>
        {/* Preferences */}
        <Popover>
          <Popover.Trigger aria-label="Preferences">
            <HerouiButton
              size="sm"
              variant="ghost"
              isIconOnly
              className="rounded-full text-white hover:text-primary bg-transparent"
            >
              <EllipsisVerticalIcon className="size-5" />
            </HerouiButton>
          </Popover.Trigger>
          <Popover.Content className="w-[320px]">
            <Popover.Dialog>
              <Popover.Heading className="text-base font-semibold">Preferences</Popover.Heading>
              <CheckboxWrapper
                id="debug"
                label="Debug Mode"
                isSelected={preferences.debugMode}
                onChange={() => changePreference("debugMode", !preferences.debugMode)}
              />
              <CheckboxWrapper
                id="autoLogin"
                label="Auto Login"
                isSelected={preferences.autoLogin}
                onChange={() => changePreference("autoLogin", !preferences.autoLogin)}
              />
              <CheckboxWrapper
                id="autoExportImport"
                label="Auto Export/Import"
                isSelected={preferences.autoExportImport}
                onChange={() => changePreference("autoExportImport", !preferences.autoExportImport)}
              />
              <CheckboxWrapper
                id="renameAGOTab"
                label="AGO Tab Renaming"
                isSelected={preferences.renameAGOTab}
                onChange={() => changePreference("renameAGOTab", !preferences.renameAGOTab)}
              />
              <CheckboxWrapper
                id="localCacheClearing"
                label="Local Cache Clearing"
                isSelected={preferences.localCacheClearing}
                onChange={() => changePreference("localCacheClearing", !preferences.localCacheClearing)}
              />

              <p className="text-base font-semibold mt-2">Import/Export</p>
              <div className="flex flex-col gap-y-1 mt-1">
                <HerouiButton
                  onPress={() => handleImport("jira")}
                  className="w-full h-5 justify-start text-white hover:text-primary bg-transparent p-0"
                >
                  <ArrowUpToLineIcon className="size-3.5" /> Jira links
                </HerouiButton>
                <HerouiButton
                  onPress={() => handleExport("jira")}
                  className="w-full h-5 justify-start text-white hover:text-primary bg-transparent p-0"
                >
                  <ArrowDownToLineIcon className="size-3.5" /> Jira links
                </HerouiButton>
                <HerouiButton
                  onPress={() => handleImport("ago")}
                  className="w-full h-5 justify-start text-white hover:text-primary bg-transparent p-0"
                >
                  <ArrowUpToLineIcon className="size-3.5" /> AGO links
                </HerouiButton>
                <HerouiButton
                  onPress={() => handleExport("ago")}
                  className="w-full h-5 justify-start text-white hover:text-primary bg-transparent p-0"
                >
                  <ArrowDownToLineIcon className="size-3.5" /> AGO links
                </HerouiButton>
                {/* TODO: Add functionality to import/export */}
                <HerouiButton className="w-full h-5 justify-start text-white hover:text-primary bg-transparent p-0">
                  <ArrowUpToLineIcon className="size-3.5" /> Settings
                </HerouiButton>
                <HerouiButton className="w-full h-5 justify-start text-white hover:text-primary bg-transparent p-0">
                  <ArrowDownToLineIcon className="size-3.5" /> Settings
                </HerouiButton>
                <HerouiButton
                  onPress={() => handleImport("credentials")}
                  className="w-full h-5 justify-start text-white hover:text-primary bg-transparent p-0"
                >
                  <ArrowUpToLineIcon className="size-3.5" /> Auto Login Credentials
                </HerouiButton>
              </div>
            </Popover.Dialog>
          </Popover.Content>
        </Popover>
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
                className="text-primary text-[14px] font-bold pl-3"
              >
                Jira
              </a>
              <span className="group rounded-full p-2 cursor-pointer hover:bg-success-hover">
                <CalendarDaysIcon size={18} className="text-green-500 group-hover:text-white" />
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2 flex-1 h-full max-h-[300px] overflow-y-auto hide-scrollbar p-0">
            {renderGroupedList(buildGroupedListEntries(jiraDisplayList), "jiraUrlList", latestJiraId)}
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
              <span className="group rounded-full p-2 cursor-pointer hover:bg-success-hover">
                <FilterIcon size={18} className="text-green-500 group-hover:text-white" />
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2 w-full h-full max-h-[300px] overflow-x-hidden overflow-y-auto hide-scrollbar">
            {renderGroupedList(buildGroupedListEntries(agoDisplayList), "agoUrlList", latestAgoId)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Popup;
