import { StorageKey, StorageSchema } from "../types/storage-types";

export const saveToStorage = (obj: Partial<StorageSchema>) => {
	return chrome.storage.local.set(obj);
};

export const removeFromStorage = (keys: StorageKey | StorageKey[]) =>
	new Promise<void>((resolve, reject) => {
		chrome.storage.local.remove(keys, () => {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
			} else {
				resolve();
			}
		});
	});

/**
 * Retrieves values from Chrome's local storage for one or more keys.
 * @returns An object with each key and `undefined` for missing keys.
 */
export const getFromStorage = async <K extends StorageKey>(
	keys: K | K[]
): Promise<Partial<Pick<StorageSchema, K>>> => {
	if (!chrome?.runtime?.id || !chrome?.storage?.local) {
		throw new Error("Extension context invalidated");
	}

	const res = await chrome.storage.local.get<Partial<Pick<StorageSchema, K>>>(keys);

	if (Array.isArray(keys)) {
		const result: Partial<Pick<StorageSchema, K>> = {};
		keys.forEach((key) => {
			result[key] = res[key];
		});
		return result;
	}

	return { [keys]: res[keys] } as Partial<Pick<StorageSchema, K>>;
};