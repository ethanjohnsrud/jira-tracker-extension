import { DEBUG_MODE } from "@/utils/state";
import { getFromStorage, saveToStorage } from "./storageController";
import { validateAGOList, validateJiraList } from "@/types/list-types";
import { validateCredentials } from "@/types/dropdown-types";

export const handleExport = async (type: "jira" | "ago" | "credentials") => {
  try {
    const storageKey = type === "jira" ? "jiraUrlList" : type === "ago" ? "agoUrlList" : ("loginCredentials" as const);
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

export const handleImport = (type: "jira" | "ago" | "credentials") => {
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
        if (type === "jira") isValid = validateJiraList(parsed, DEBUG_MODE);
        else if (type === "ago") isValid = validateAGOList(parsed, DEBUG_MODE);
        else if (type === "credentials") isValid = validateCredentials(parsed, DEBUG_MODE);

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
