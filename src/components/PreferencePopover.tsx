import { Popover, Button } from "@heroui/react";
import { CheckboxWrapper } from "./CheckboxWrapper";
import { useStorage } from "@/hooks/useStorage";
import { ArrowDownToLineIcon, ArrowUpToLineIcon, EllipsisVerticalIcon } from "lucide-react";
import { handleExport, handleImport } from "@/controllers/importExportController";
import { removeFromStorage } from "@/controllers/storageController";
import { isLocalhostUrl } from "@/utils/url";
import useActiveTab from "@/hooks/useActiveTab";

/**
 * Renders a vertical 3-dot icon. When clicked, it opens a popover for managing preferences.
 */
export default function PreferencePopover() {
  const { preferences, changePreference, saveToStorage, storageState } = useStorage();
  const activeTab = useActiveTab()

  const isCachePollingActive = activeTab.id !== null && storageState.cacheTabId === activeTab.id;

  const handleCachePollingToggle = async (isSelected: boolean) => {
    const tab = await activeTab.query();
    if (!tab?.id || !tab.url || !isLocalhostUrl(tab.url)) return;

    if (isSelected) {
      await changePreference("localCacheClearing", true);
      await saveToStorage({ cacheTabId: tab.id });
    } else {
      await changePreference("localCacheClearing", false);
      await removeFromStorage(["cacheTabId", "nextTimerMS"]);
    }
  };

  return (
    <Popover>
      <Popover.Trigger aria-label="Preferences">
        <Button
          size="sm"
          variant="ghost"
          isIconOnly
          className="rounded-full text-white hover:text-primary bg-transparent"
        >
          <EllipsisVerticalIcon className="size-5" />
        </Button>
      </Popover.Trigger>
      <Popover.Content className="w-[320px] bg-background">
        <Popover.Dialog>
          <Popover.Heading className="text-base font-semibold text-primary">Preferences</Popover.Heading>
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
          {activeTab.isLocalhost && (
            <CheckboxWrapper
              id="localCacheClearing"
              label="Local Cache Clearing"
              isSelected={isCachePollingActive}
              onChange={handleCachePollingToggle}
            />
          )}

          <p className="text-base font-semibold mt-2 text-primary">Import</p>
          <div className="flex flex-col gap-y-1 mt-1">
            <Button
              onPress={() => handleImport("jiraUrlList")}
              className="w-full h-5 justify-start text-white hover:text-primary bg-transparent p-0"
            >
              <ArrowUpToLineIcon className="size-3.5" /> Jira links
            </Button>
            <Button
              onPress={() => handleImport("agoUrlList")}
              className="w-full h-5 justify-start text-white hover:text-primary bg-transparent p-0"
            >
              <ArrowUpToLineIcon className="size-3.5" /> AGO links
            </Button>
            <Button
              onPress={() => handleImport("settings")}
              className="w-full h-5 justify-start text-white hover:text-primary bg-transparent p-0"
            >
              <ArrowUpToLineIcon className="size-3.5" /> Settings
            </Button>
            <Button
              onPress={() => handleImport("loginCredentials")}
              className="w-full h-5 justify-start text-white hover:text-primary bg-transparent p-0"
            >
              <ArrowUpToLineIcon className="size-3.5" /> Auto Login Credentials
            </Button>
          </div>

          <p className="text-base font-semibold mt-2 text-primary">Export</p>
          <div className="flex flex-col gap-y-1 mt-1">
            <Button
              onPress={() => handleExport("jiraUrlList")}
              className="w-full h-5 justify-start text-white hover:text-primary bg-transparent p-0"
            >
              <ArrowDownToLineIcon className="size-3.5" /> Jira links
            </Button>
            <Button
              onPress={() => handleExport("agoUrlList")}
              className="w-full h-5 justify-start text-white hover:text-primary bg-transparent p-0"
            >
              <ArrowDownToLineIcon className="size-3.5" /> AGO links
            </Button>
            <Button
              onPress={() => handleExport("settings")}
              className="w-full h-5 justify-start text-white hover:text-primary bg-transparent p-0"
            >
              <ArrowDownToLineIcon className="size-3.5" /> Settings
            </Button>
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
