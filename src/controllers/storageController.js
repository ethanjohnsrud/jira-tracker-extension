export const saveToStorage = (obj) => new Promise(resolve => {
    chrome.storage.local.set(obj, res => resolve(true));
})

// export const getFromStorage = (arr) => new Promise(resolve => {
//     chrome.storage.local.get(arr, res => resolve(res));
// })


/**
 * Retrieves values from Chrome's local storage for one or more keys.
 * If a single key is requested, returns its value or `undefined` if missing. 
 * If multiple keys are requested, returns an object with each key and `undefined` for missing keys.
 */
export const getFromStorage = (keys) => new Promise((resolve) => {
    chrome.storage.local.get(keys, (res) => {
        if (Array.isArray(keys)) {
            // Ensure all requested keys exist in the returned object (with undefined if missing)
            const result = keys.reduce((acc, key) => {
                acc[key] = res.hasOwnProperty(key) ? res[key] : undefined;
                return acc;
            }, {});
            resolve(result);
        } else {
            // If a single key is requested, return its value or undefined
            resolve(res.hasOwnProperty(keys) ? res[keys] : undefined);
        }
    });
});
