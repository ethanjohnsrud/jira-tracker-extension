import { isLocalhostUrl } from "@/utils/url";
import { useCallback, useEffect, useState } from "react";

type ReturnType = {
  tab: chrome.tabs.Tab | null;
  isLocalhost: boolean;
  query: () => Promise<chrome.tabs.Tab>;
  id: number | null;
  url: string;
};

const useActiveTab = (): ReturnType => {
  const [tab, setTab] = useState<chrome.tabs.Tab | null>(null);
  const [isLocalhost, setIsLocalhost] = useState<boolean>(false);

  /** Queries for the active tab and updates the state */
  const query = useCallback(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    setTab(tab);
    setIsLocalhost(isLocalhostUrl(tab?.url ?? ""));
    return tab;
  }, []);

  useEffect(() => {
    query();
  }, []);

  return {
    tab,
    isLocalhost,
    query,
    id: tab?.id ?? null,
    url: tab?.url ?? "",
  };
};

export default useActiveTab;