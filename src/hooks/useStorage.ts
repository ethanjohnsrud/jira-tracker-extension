import { useEffect, useState } from "react";
import { DEFAULT_STORAGE_STATE, Preferences, StorageChangeCallback, StorageSchema } from "../types/storage-types";
import { getFromStorage, saveToStorage as saveToStorageController } from "@/controllers/storageController";
import { SETTINGS } from "@/types/settings-types";

interface UseStorageReturn {
  storageState: StorageSchema;
  preferences: Preferences;
  settings: SETTINGS;
  /* Save storage with partial changes and update hook state */
  saveToStorage: (changes: Partial<StorageSchema>) => Promise<void>;
  changePreference: (preference: keyof Preferences, value: boolean) => Promise<void>;
}

export const useStorage = (): UseStorageReturn => {
  const [storageState, setStorageState] = useState<StorageSchema>(DEFAULT_STORAGE_STATE);

  const saveToStorage = async (changes: Partial<StorageSchema>) => {
    setStorageState((prev) => ({ ...prev, ...changes }));
    await saveToStorageController(changes);
  };

  const changePreference = async (preference: keyof Preferences, value: boolean) => {
    const nextPreferences = { ...storageState.preferences, [preference]: value };
    setStorageState((prev) => ({ ...prev, preferences: nextPreferences }));
    await saveToStorageController({ preferences: nextPreferences });
  };

  /* Initialize storage state and listen for changes */
  useEffect(() => {
    getFromStorage(null).then((data) => {
      setStorageState(data as StorageSchema);
    });

    const onStorageChange: StorageChangeCallback = (changes, namespace) => {
      const allChanges: Partial<StorageSchema> = {};
      for (const key in changes) {
        //@ts-ignore
        allChanges[key] = changes[key].newValue;
      }
      setStorageState((prev) => ({ ...prev, ...allChanges }));
    };

    chrome.storage.onChanged.addListener(onStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(onStorageChange);
    };
  }, []);

  return {
    storageState,
    preferences: storageState.preferences,
    settings: storageState.settings,
    saveToStorage,
    changePreference,
  };
};
