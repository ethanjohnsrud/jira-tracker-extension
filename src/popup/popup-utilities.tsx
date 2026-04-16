import URLItemElement from "@/components/URLItemElement";
import { UrlListItem } from "@/types/list-types";
import { AgoUrlListItem, JiraUrlListItem } from "@/types/storage-types";
import { Accordion, cn } from "@heroui/react";
import { FolderIcon } from "lucide-react";
import { ReactNode } from "react";

const ARCHIVED_COLLECTION_NAME = "Archived";

enum ItemDisplayType {
  INDIVIDUAL = 'INDIVIDUAL',
  COLLECTION = 'COLLECTION',
}

type GroupedListEntry<T extends UrlListItem> =
  | {
    displayType: ItemDisplayType.INDIVIDUAL;
    id: string;
    lastVisitedMS: number;
    item: T;
  }
  | {
    displayType: ItemDisplayType.COLLECTION;
    id: string;
    lastVisitedMS: number;
    collectionName: string;
    items: T[];
  };

export const sortByRecentAndFavorite = <T extends UrlListItem>(a: T, b: T) => {
  if (a.favorite && !b.favorite) return -1;
  if (!a.favorite && b.favorite) return 1;
  return b.lastVisitedMS - a.lastVisitedMS;
};

export const sortGroupedEntries = <T extends UrlListItem>(a: GroupedListEntry<T>, b: GroupedListEntry<T>) => {
  const aIsFavoriteIndividual = a.displayType === ItemDisplayType.INDIVIDUAL && a.item.favorite;
  const bIsFavoriteIndividual = b.displayType === ItemDisplayType.INDIVIDUAL && b.item.favorite;

  // Priority 1: Favorited individual items come before everything else
  if (aIsFavoriteIndividual && !bIsFavoriteIndividual) return -1;
  if (!aIsFavoriteIndividual && bIsFavoriteIndividual) return 1;

  const aArchived = a.displayType === ItemDisplayType.COLLECTION && a.collectionName === ARCHIVED_COLLECTION_NAME;
  const bArchived = b.displayType === ItemDisplayType.COLLECTION && b.collectionName === ARCHIVED_COLLECTION_NAME;

  // Priority 3: Archived collection always goes last
  if (aArchived && !bArchived) return 1;
  if (!aArchived && bArchived) return -1;

  // Priority 2: Then sort by most recent visit, regardless of collection or individual item
  return b.lastVisitedMS - a.lastVisitedMS;
};

export const buildGroupedListEntries = <T extends UrlListItem>(urlList: T[]): GroupedListEntry<T>[] => {
  const collectionGroups = new Map<string, T[]>();
  const rootItems: GroupedListEntry<T>[] = [];

  for (const item of urlList) {
    if (item.collectionName) {
      const existingItems = collectionGroups.get(item.collectionName) ?? [];
      existingItems.push(item);
      collectionGroups.set(item.collectionName, existingItems);
      continue;
    }

    rootItems.push({
      displayType: ItemDisplayType.INDIVIDUAL,
      id: item.id,
      lastVisitedMS: item.lastVisitedMS,
      item,
    });
  }

  const folderItems: GroupedListEntry<T>[] = Array.from(collectionGroups.entries()).map(([collectionName, items]) => ({
    displayType: ItemDisplayType.COLLECTION,
    id: `folder-${collectionName}`,
    collectionName,
    lastVisitedMS: Math.max(...items.map((item) => item.lastVisitedMS)),
    items: [...items].sort(sortByRecentAndFavorite),
  }));

  return [...rootItems, ...folderItems].sort(sortGroupedEntries);
};

export enum StorageListKey {
  JIRA = "jiraUrlList",
  AGO = "agoUrlList",
}

export const renderGroupedList = <T extends JiraUrlListItem | AgoUrlListItem>(
  entries: GroupedListEntry<T>[],
  storageListKey: StorageListKey,
  latestId: string
): ReactNode =>
  entries.map((entry, idx) => {
    if (entry.displayType === ItemDisplayType.INDIVIDUAL) {
      return (
        <URLItemElement
          key={entry.id}
          storageListKey={storageListKey}
          urlItem={entry.item}
          linkReady={entry.item.id === latestId}
          className={cn(idx % 2 == 0 ? "bg-[#2d2d2d]" : "")}
        />
      );
    } else if (entry.displayType === ItemDisplayType.COLLECTION) {
      return (
        <Accordion key={entry.id} hideSeparator className="px-0">
          <Accordion.Item id={entry.id} className="border border-default-200 rounded-md bg-content1/40 overflow-hidden">
            <Accordion.Heading>
              <Accordion.Trigger className="w-full px-0 py-2 hover:bg-content2/60 transition-colors">
                <div className="flex w-full items-center gap-2 text-left">
                  <FolderIcon className="size-4 text-primary shrink-0" />
                  <span className="flex-1 truncate text-sm font-semibold text-white">{entry.collectionName}</span>
                  <span className="text-xs text-default-400 whitespace-nowrap">{entry.items.length}</span>
                  <Accordion.Indicator className="size-4 text-default-400 shrink-0" />
                </div>
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className="pl-6 pr-0 pb-2 pt-0">
                <div className="flex flex-col gap-2">
                  {entry.items.map((item, idx) => (
                    <URLItemElement
                      key={item.id}
                      storageListKey={storageListKey}
                      urlItem={item}
                      linkReady={item.id === latestId}
                      className={cn(idx % 2 == 0 ? "bg-[#2d2d2d]" : "")}
                    />
                  ))}
                </div>
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      );
    }
  });