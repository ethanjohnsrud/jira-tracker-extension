import { StorageChangeCallback } from "@/types/storage-types";
import { getFromStorage } from "../controllers/storageController";

/** This is a global state initialized from storage */
export let DEBUG_MODE = false;

export let stateInitPromise: Promise<void> | null = null;

stateInitPromise = getFromStorage("preferences")
  .then(({ preferences }) => {
    //Initialize DEBUG_MODE from storage
    DEBUG_MODE = preferences?.debugMode ?? false;
    if (DEBUG_MODE) console.log("[state] DEBUG_MODE enabled");
  })
  .finally(() => {
    stateInitPromise = null;
  });

const onStorageChange: StorageChangeCallback = (changes) => {
  if ("preferences" in changes) {
    DEBUG_MODE = changes.preferences?.newValue?.debugMode ?? false;
    if (DEBUG_MODE) console.log("[state] DEBUG_MODE enabled");
    else console.log("[state] DEBUG_MODE disabled");
  }
};

chrome.storage.onChanged.addListener(onStorageChange);
