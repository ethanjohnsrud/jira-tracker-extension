import { getFromStorage } from "../controllers/storageController";

/** This is a global state initialized from storage */
export let DEBUG_MODE = false;

export let stateInitPromise: Promise<void> | null = null;

stateInitPromise = getFromStorage("debug")
  .then((res) => {
    //Initialize DEBUG_MODE from storage
    DEBUG_MODE = res.debug === true;
    if (DEBUG_MODE) console.log("[STATE] DEBUG_MODE enabled");
  })
  .finally(() => {
    stateInitPromise = null;
  });