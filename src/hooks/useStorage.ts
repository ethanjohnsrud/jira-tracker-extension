import { useEffect, useState } from "react";
import { Preferences, StorageChangeCallback, StorageSchema } from "../types/storage-types";
import { getFromStorage, saveToStorage as saveToStorageController } from "@/controllers/storageController";
import { DEFAULT_STORAGE_STATE } from "@/constants/constants";

interface UseStorageReturn {
  storageState: StorageSchema;
  preferences: Preferences;
  /* Save storage with partial changes and update hook state */
  saveToStorage: (changes: Partial<StorageSchema>) => Promise<void>;
  changePreference: (preference: keyof Preferences, value: boolean) => void;
}

export const useStorage = (): UseStorageReturn => {
  const [storageState, setStorageState] = useState<StorageSchema>(DEFAULT_STORAGE_STATE);

  const saveToStorage = async (changes: Partial<StorageSchema>) => {
    setStorageState((prev) => ({ ...prev, ...changes }));
    await saveToStorageController(changes);
  };

  const changePreference = (preference: keyof Preferences, value: boolean) => {
    setStorageState((prev) => ({ ...prev, preferences: { ...prev.preferences, [preference]: value } }));
    saveToStorageController({ preferences: { ...storageState.preferences, [preference]: value } });
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
    saveToStorage,
    changePreference,
  };
};
