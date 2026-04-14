import React, { useState } from "react";
import { Button } from "@heroui/react";
import { StarIcon } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import UrlItemEditor from "@/components/UrlItemEditor";
import { useStorage } from "@/hooks/useStorage";
import { AgoUrlListItem, JiraUrlListItem, StorageKey } from "@/types/storage-types";
import { URLType } from "@/types/list-types";

type Props = {
  urlItem: JiraUrlListItem | AgoUrlListItem;
  storageListKey: Extract<StorageKey, "jiraUrlList" | "agoUrlList">;
  className?: string;
  linkReady?: boolean;
};

export default function URLItemElement({
  storageListKey,
  className,
  linkReady,
  urlItem,
  ...props
}: Props & React.ComponentProps<"div">) {
  const { storageState, saveToStorage } = useStorage();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const { favorite, id, url } = urlItem;

  const onLabelClick: React.MouseEventHandler<HTMLElement> = (e) => {
    if (e.ctrlKey || e.metaKey) {
      return chrome.tabs.create({ url });
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.update(tabs[0].id, { url });
    });
  };

  const handleFavPress = () => {
    const urlList = storageState[storageListKey];
    const index = urlList.findIndex((item) => item.id === id);
    if (index === -1) return;

    const updatedList = [...urlList];
    updatedList[index] = {
      ...updatedList[index],
      favorite: !updatedList[index].favorite,
    };

    saveToStorage({ [storageListKey]: updatedList });
  };

  return (
    <>
      <div
        className={`flex justify-start gap-x-2 w-full items-center ${className} rounded-md`}
        onContextMenu={(e) => {
          e.preventDefault();
          setIsEditorOpen(true);
        }}
        {...props}
      >
        <div className="w-full flex flex-col">
          <div className="flex items-center gap-2">
            <Button
              isIconOnly
              aria-label="Favorite"
              className="p-0 m-0 min-w-4 w-4 h-4 bg-transparent hover:bg-transparent"
              onPress={handleFavPress}
            >
              <StarIcon
                className="size-4.5"
                fill={favorite ? "#ffffff" : "none"}
                stroke={favorite ? "#ffffff" : "#ffffff"}
              />
            </Button>
            <div
              className={`text-[12px] flex-1 whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer border border-gray-500 py-1 px-1 ${linkReady ? "text-primary" : "text-white"}`}
              onClick={onLabelClick}
            >
              {urlItem.displayName}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1 text-[9px]">
            <div className="w-4"></div>
            {urlItem.type === URLType.JIRA ? (
              <div className="w-full flex justify-between gap-2 flex-wrap">
                <span className="text-slate-300">{urlItem.jiraCode}</span>
                <span className="text-slate-300">{urlItem.sprint}</span>
                {urlItem.targetDateMS && (
                  <span className="text-slate-300">{formatDistanceToNowStrict(urlItem.targetDateMS)}</span>
                )}
              </div>
            ) : (
              <div className="w-full flex justify-between gap-2 flex-wrap">
                <span className="text-slate-300">
                  <span className="uppercase">{urlItem.region}</span>-
                  <span className="capitalize">{urlItem.environment}</span>
                </span>
                {urlItem.jiraCode && <span className="text-slate-300">{urlItem.jiraCode}</span>}
              </div>
            )}
          </div>
        </div>
      </div>
      <UrlItemEditor
        isOpen={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        storageListKey={storageListKey}
        urlItem={urlItem}
      />
    </>
  );
}
