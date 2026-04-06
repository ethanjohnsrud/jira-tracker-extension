/*********************************************************
 * LIST CONTENT TYPES                                    *
 * These are the bookmarks being tracked.                *
 * No defaults, but may be imported to initialize state. *
 *********************************************************/

export interface UrlListItem {
	type: "jira" | "ago";
	/**@deprecated use `url` instead */
	id: string; //Deprecate if possible
	url: string; //Unique use as identifier
	originalUrl: string;

	displayName: string;
	preserveCustomName?: boolean; //Toggle when edited within extension, prevents override on next visit

	favorite?: boolean;
	collectionName?: string; //Optional, filtered from root list at render
	/**@deprecated use `lastVisitedMS` instead */
	lastVisited: string;
	lastVisitedMS: number; //Timestamp in milliseconds
	additionalLinks?: { name: string; link: string; }[];
}

export interface JiraListItem extends UrlListItem {
	type: "jira";
	jiraCode: string;
	title: string;
	sprint: string;
	status: string;
	targetDateMS?: number; //Optional, Set within extension
}

export interface AGOListItem extends UrlListItem {
	type: "ago";
	region: string;
	environment: string;
	route: string;

	planName: string;
	clientFullName: string;
	clientLastName: string; //Usually indicates topic description
	jiraCode?: string; //Added when linking
}

/* Validate Jira  URL List on Import */
export const validateJiraList = (objectList: Object[], debugMode: boolean): boolean => {
	let valid = true;
	const list = objectList as JiraListItem[];

	if (!Array.isArray(list)) {
		if (debugMode) console.log("[Jira URL List Validation] Failed: invalid Jira list.");
		return false;
	}

	for (const item of list) {
		try {
			if (
				!item.id ||
				!item.url ||
				!item.originalUrl ||
				!item.displayName ||
				typeof item.lastVisitedMS !== "number" ||
				!item.jiraCode ||
				!item.title ||
				!item.sprint ||
				!item.status ||
				list.filter((listItem) => listItem?.url === item.url).length > 1
			)
				throw new Error("Invalid JiraListItem.");

			if (item.targetDateMS !== undefined && typeof item.targetDateMS !== "number")
				throw new Error("Invalid JiraListItem.targetDateMS.");
			if (item.preserveCustomName !== undefined && typeof item.preserveCustomName !== "boolean")
				throw new Error("Invalid JiraListItem.preserveCustomName.");
			if (item.favorite !== undefined && typeof item.favorite !== "boolean")
				throw new Error("Invalid JiraListItem.favorite.");
			if (item.collectionName !== undefined && !item.collectionName)
				throw new Error("Invalid JiraListItem.collectionName.");

			if (item.additionalLinks !== undefined) {
				if (!Array.isArray(item.additionalLinks)) throw new Error("Invalid JiraListItem.additionalLinks.");
				for (const link of item.additionalLinks) {
					if (!link?.name || !link?.link) throw new Error("Invalid JiraListItem.additionalLinks item.");
				}
			}
		} catch (error) {
			if (debugMode) console.log("[Jira URL List Validation] Failed: invalid JiraListItem.", item, error);
			valid = false;
		}
	}

	if (debugMode) console.log(`[Jira URL List Validation] Jira list ${valid ? "Passed" : "Failed"}`);

	return valid;
};

/* Validate AGO URL List on Import */
export const validateAGOList = (objectList: Object[], debugMode: boolean): boolean => {
	let valid = true;
	const list = objectList as AGOListItem[];

	if (!Array.isArray(list)) {
		if (debugMode) console.log("[AGO URL List Validation] Failed: invalid AGO list.");
		return false;
	}

	for (const item of list) {
		try {
			if (
				!item.id ||
				!item.url ||
				!item.originalUrl ||
				!item.displayName ||
				typeof item.lastVisitedMS !== "number" ||
				!item.region ||
				!item.environment ||
				!item.route ||
				!item.planName ||
				!item.clientFullName ||
				!item.clientLastName ||
				list.filter((listItem) => listItem?.url === item.url).length > 1
			)
				throw new Error("Invalid AGOListItem.");

			if (item.preserveCustomName !== undefined && typeof item.preserveCustomName !== "boolean")
				throw new Error("Invalid AGOListItem.preserveCustomName.");
			if (item.favorite !== undefined && typeof item.favorite !== "boolean")
				throw new Error("Invalid AGOListItem.favorite.");
			if (item.collectionName !== undefined && !item.collectionName)
				throw new Error("Invalid AGOListItem.collectionName.");
			if (item.jiraCode !== undefined && !item.jiraCode) throw new Error("Invalid AGOListItem.jiraCode.");

			if (item.additionalLinks !== undefined) {
				if (!Array.isArray(item.additionalLinks)) throw new Error("Invalid AGOListItem.additionalLinks.");
				for (const link of item.additionalLinks) {
					if (!link?.name || !link?.link) throw new Error("Invalid AGOListItem.additionalLinks item.");
				}
			}
		} catch (error) {
			if (debugMode) console.log("[AGO URL List Validation] Failed: invalid AGOListItem.", item, error);
			valid = false;
		}
	}

	if (debugMode) console.log(`[AGO URL List Validation] AGO list ${valid ? "Passed" : "Failed"}`);

	return valid;
};
