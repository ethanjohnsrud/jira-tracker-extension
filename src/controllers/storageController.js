export const saveToStorage = (obj) => new Promise(resolve => {
    chrome.storage.local.set(obj, res => resolve(true));
});

export const removeFromStorage = (keys) => new Promise((resolve, reject) => {
      chrome.storage.local.remove(keys, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  

// export const getFromStorage = (arr) => new Promise(resolve => {
//     chrome.storage.local.get(arr, res => resolve(res));
// })


/**
 * Retrieves values from Chrome's local storage for one or more keys.
 * If a single key is requested, returns its value or `undefined` if missing. 
 * If multiple keys are requested, returns an object with each key and `undefined` for missing keys.
 */
export const getFromStorage = (keys) => new Promise((resolve, reject) => {
  try {
    // Guard: check if extension context is still valid
    if (!chrome?.storage?.local || !chrome.runtime?.id) {
      return reject(new Error("Extension context invalidated"));
    }

    chrome.storage.local.get(keys, (res) => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }

      if (Array.isArray(keys)) {
        const result = keys.reduce((acc, key) => {
          acc[key] = res.hasOwnProperty(key) ? res[key] : undefined;
          return acc;
        }, {});
        resolve(result);
      } else {
        resolve(res.hasOwnProperty(keys) ? res[keys] : undefined);
      }
    });
  } catch (e) {
    reject(e);
  }
});

