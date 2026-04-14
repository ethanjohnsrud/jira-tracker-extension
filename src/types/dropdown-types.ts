/***************************************************
 * URL SELECTION TYPES                             *
 * These are for URL Parsing & Dropdown Selections *
 * Current Files include:                          *
 * - src/constants/environments.json               *
 * - src/constants/regions.json                    *
 * - src/constants/routes.json                     *
 ***************************************************/

/* Dropdowns */
export interface RegionSelection {
  label: string;
  value: string;
}

export interface EnvironmentSelectionOption extends RegionSelection {
  prefix: string;
}

export interface RouteSelection extends RegionSelection {
  regex: string;
}

/* Auto Login */
export type LoginCredentials = {
  region: string;
  environment: string;

  username: string;
  password: string;
};

export interface DropdownSelections {
  region: RegionSelection;
  environment: EnvironmentSelectionOption;
  route: RouteSelection;
}

/* Validate Jira  URL List on Import */
export const validateCredentials = (credentialsList: Object[], debugMode: boolean): boolean => {
  let valid = true;
  const list = credentialsList as LoginCredentials[];

  if (!Array.isArray(list)) {
    if (debugMode) console.log("[Credentials Validation] Failed: invalid credentials list.");
    return false;
  }

  for (const item of list) {
    try {
      if (!item.region || !item.environment || !item.username || !item.password)
        throw new Error("Invalid LoginCredentials.");
      if (list.filter((credential) => credential?.username === item.username).length > 1)
        throw new Error("Duplicate username.");
    } catch (error) {
      if (debugMode) console.log("[Credentials Validation] Failed: invalid LoginCredentials item.", item, error);
      valid = false;
    }
  }

  if (debugMode) console.log(`[Credentials Validation] ${valid ? "Passed" : "Failed"}`);

  return valid;
};
