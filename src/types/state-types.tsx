import { EnvironmentSelectionOption, RegionSelection, RouteSelection } from "./dropdown-types";

/**********************************************************
 * RUNTIME STATE TYPES & DEFAULTS                         *
 *                                                        *
 * PreferencesState                                       *
 * - Stored across browser restarts                       *
 * - Used for user-controlled toggles                     *
 *                                                        *
 * SessionState                                           *
 * - Reset when Chrome restarts                           *
 * - Used for active runtime/session values               *
 **********************************************************/

/* Saved to Extension Local Storage */
export interface PREFERENCES_STATE {
	isTabRenamingActive: boolean;

	isDebugModeActive: boolean;

	isAutoLoginActive: boolean;
}

export const DEFAULT_PREFERENCES_STATE: PREFERENCES_STATE = {
	isTabRenamingActive: false,
	isDebugModeActive: false,
	isAutoLoginActive: false,
};

/* Resets on Browser Restart, persists across tabs within the same window */
export interface SESSION_STATE {
	/** Local Cache Interval Management */
	isLocalCacheIntervalActive: boolean;
	localCacheTabID: number | null;
	localCacheNextTimerMS: number | null;

	/** Current URL or last Matching */
	currentEnvironment: EnvironmentSelectionOption | null;
	currentRegion: RegionSelection | null;
	currentRoute: RouteSelection | null;
}

export const DEFAULT_SESSION_STATE: SESSION_STATE = {
	isLocalCacheIntervalActive: false,
	localCacheTabID: null,
	localCacheNextTimerMS: null,
	currentEnvironment: null,
	currentRegion: null,
	currentRoute: null,
};
