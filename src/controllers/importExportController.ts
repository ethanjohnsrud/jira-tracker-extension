import { DEBUG_MODE } from "@/utils/state";
import { getFromStorage, saveToStorage } from "./storageController";
import { validateAGOList, validateJiraList } from "@/types/list-types";
import { validateCredentials } from "@/types/dropdown-types";
import { validateSettings } from "@/types/settings-types";

type ExportableKey = "jiraUrlList" | "agoUrlList" | "settings";
export const handleExport = async (key: ExportableKey) => {
  try {
    const data = await getFromStorage(key);
    const list = data[key] || [];

    const blob = new Blob([JSON.stringify(list, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${key}_export_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    if (DEBUG_MODE) console.error(`[POPUP][handleExport] Failed to export ${key}:`, error);
  }
};

type ImportableKey = "jiraUrlList" | "agoUrlList" | "loginCredentials" | "settings";
export const handleImport = (key: ImportableKey) => {
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
        if (key === "jiraUrlList") isValid = validateJiraList(parsed, DEBUG_MODE);
        else if (key === "agoUrlList") isValid = validateAGOList(parsed, DEBUG_MODE);
        else if (key === "loginCredentials") isValid = validateCredentials(parsed, DEBUG_MODE);
        else if (key === "settings") isValid = validateSettings(parsed, DEBUG_MODE);

        if (isValid) {
          if (key === "jiraUrlList") await saveToStorage({ jiraUrlList: parsed });
          else if (key === "agoUrlList") await saveToStorage({ agoUrlList: parsed });
          else if (key === "loginCredentials") await saveToStorage({ loginCredentials: parsed });
          else if (key === "settings") await saveToStorage({ settings: parsed });
          // UI will be updated via storage listener calling loadDisplayLists
          if (DEBUG_MODE) console.log(`[POPUP][handleImport] Successfully imported ${key}`);
        } else {
          alert(`Invalid ${key} JSON file format.`);
        }
      } catch (error) {
        if (DEBUG_MODE) console.error(`[POPUP][handleImport] Failed to parse ${key} import:`, error);
        alert(`Failed to parse ${key} JSON file.`);
      }
    };
    reader.readAsText(file);
  };
  input.click();
};
