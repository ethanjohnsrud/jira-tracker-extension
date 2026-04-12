import { Popover, Button } from "@heroui/react";
import { CheckboxWrapper } from "./CheckboxWrapper";
import { useStorage } from "@/hooks/useStorage";
import { ArrowDownToLineIcon, ArrowUpToLineIcon, EllipsisVerticalIcon } from "lucide-react";
import { handleExport, handleImport } from "@/controllers/importExportController";

/**
 * Renders a vertical 3-dot icon. When clicked, it opens a popover for managing preferences.
 */
export default function PreferencePopover() {
  const { preferences, changePreference } = useStorage();

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
            <Button
              onPress={() => handleImport("jira")}
              className="w-full h-5 justify-start text-white hover:text-primary bg-transparent p-0"
            >
              <ArrowUpToLineIcon className="size-3.5" /> Jira links
            </Button>
            <Button
              onPress={() => handleExport("jira")}
              className="w-full h-5 justify-start text-white hover:text-primary bg-transparent p-0"
            >
              <ArrowDownToLineIcon className="size-3.5" /> Jira links
            </Button>
            <Button
              onPress={() => handleImport("ago")}
              className="w-full h-5 justify-start text-white hover:text-primary bg-transparent p-0"
            >
              <ArrowUpToLineIcon className="size-3.5" /> AGO links
            </Button>
            <Button
              onPress={() => handleExport("ago")}
              className="w-full h-5 justify-start text-white hover:text-primary bg-transparent p-0"
            >
              <ArrowDownToLineIcon className="size-3.5" /> AGO links
            </Button>
            {/* TODO: Add functionality to import/export */}
            <Button className="w-full h-5 justify-start text-white hover:text-primary bg-transparent p-0">
              <ArrowUpToLineIcon className="size-3.5" /> Settings
            </Button>
            <Button className="w-full h-5 justify-start text-white hover:text-primary bg-transparent p-0">
              <ArrowDownToLineIcon className="size-3.5" /> Settings
            </Button>
            <Button
              onPress={() => handleImport("credentials")}
              className="w-full h-5 justify-start text-white hover:text-primary bg-transparent p-0"
            >
              <ArrowUpToLineIcon className="size-3.5" /> Auto Login Credentials
            </Button>
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
