import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Button, Chip, Input, Label, Modal, useOverlayState } from "@heroui/react";
import { CircleMinus, CircleMinusIcon, CopyIcon, LinkIcon, PaperclipIcon, PlusCircleIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { useStorage } from "@/hooks/useStorage";
import { AgoUrlListItem, JiraUrlListItem, URLItemListKey } from "@/types/storage-types";
import { AGOListItem, ARCHIVED_COLLECTION_NAME, JiraListItem, URLType } from "@/types/list-types";
import { CustomTextAreaField, CustomTextField } from "./CustomField";
import { CheckboxWrapper } from "./CheckboxWrapper";

type UrlItemEditorProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  storageListKey: URLItemListKey;
  urlItem: JiraUrlListItem | AgoUrlListItem;
};

type EditableUrlItem = JiraUrlListItem | AgoUrlListItem;
type SaveState = "idle" | "saving" | "saved";

const parseOptionalNumber = (value: string) => {
  if (!value.trim()) return undefined;
  const parsedValue = Number(value);
  return Number.isNaN(parsedValue) ? undefined : parsedValue;
};

const toSnapshot = (item: EditableUrlItem) => JSON.stringify(item);

export default function UrlItemEditor({ isOpen, onOpenChange, storageListKey, urlItem }: UrlItemEditorProps) {
  const overlayState = useOverlayState({ isOpen, onOpenChange });
  const { storageState, saveToStorage } = useStorage();
  const storageList = storageState[storageListKey] as EditableUrlItem[];
  const [draft, setDraft] = useState<EditableUrlItem>(urlItem);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const lookupIdRef = useRef(urlItem.id);
  const lookupUrlRef = useRef(urlItem.url);
  const lastSavedSnapshotRef = useRef(toSnapshot(urlItem));
  const isHydratingRef = useRef(true);

  useEffect(() => {
    setDraft(urlItem);
    setSaveState("idle");
    lookupIdRef.current = urlItem.id;
    lookupUrlRef.current = urlItem.url;
    lastSavedSnapshotRef.current = toSnapshot(urlItem);
    isHydratingRef.current = true;
  }, [urlItem]);

  useEffect(() => {
    if (!overlayState.isOpen) return;
    if (isHydratingRef.current) {
      isHydratingRef.current = false;
      return;
    }
    if (toSnapshot(draft) === lastSavedSnapshotRef.current) {
      if (saveState !== "idle") setSaveState("idle");
      return;
    }

    setSaveState("saving");
    const timeout = window.setTimeout(() => {
      const itemIndex = storageList.findIndex(
        (item) => item.id === lookupIdRef.current || item.url === lookupUrlRef.current
      );
      if (itemIndex === -1) {
        setSaveState("idle");
        return;
      }

      const updatedList = [...storageList];
      updatedList[itemIndex] = draft;
      saveToStorage({ [storageListKey]: updatedList });
      lookupIdRef.current = draft.id;
      lookupUrlRef.current = draft.url;
      lastSavedSnapshotRef.current = toSnapshot(draft);
      setSaveState("saved");
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [draft, overlayState.isOpen, saveToStorage, saveState, storageList, storageListKey]);

  const updateDraft = (updater: (previous: EditableUrlItem) => EditableUrlItem) => {
    setDraft((previous) => updater(previous));
  };

  const bindTextField =
    <T extends keyof JiraListItem | keyof AGOListItem>(key: T) =>
      (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value = event.target.value;
        updateDraft((previous) => ({ ...previous, [key]: value }));
      };

  const handleAddEmptyLink = () => {
    updateDraft((prev) => {
      const additionalLinks = [...(prev.additionalLinks ?? []), { name: "", link: "" }];
      return { ...prev, additionalLinks };
    });
  };

  const handleAddCurrentPage = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab?.url) return;
      updateDraft((prev) => ({
        ...prev,
        additionalLinks: [...(prev.additionalLinks ?? []), { name: tab.title ?? "", link: tab.url! }],
      }));
    });
  };

  const handleUpdateLink = (index: number, field: "name" | "link", value: string) => {
    updateDraft((prev) => {
      const links = [...(prev.additionalLinks ?? [])];
      links[index] = { ...links[index], [field]: value };
      return { ...prev, additionalLinks: links };
    });
  };

  const handleRemoveLink = (index: number) => {
    updateDraft((prev) => ({ ...prev, additionalLinks: (prev.additionalLinks ?? []).filter((_, i) => i !== index) }));
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
  };

  const handleDelete = () => {
    if (!confirm("Are you sure you want to delete this URL item?")) return;
    const updatedList = storageList.filter(
      (item) => item.id !== lookupIdRef.current && item.url !== lookupUrlRef.current
    );
    saveToStorage({ [storageListKey]: updatedList });
    overlayState.close();
  };

  return (
    <Modal state={overlayState}>
      <Modal.Backdrop className="bg-black/70">
        <Modal.Container size="cover" scroll="inside" placement="center" className="p-2">
          <Modal.Dialog className="overflow-hidden bg-background">
            <Modal.Header className="px-1">
              <Modal.Heading className="text-lg font-semibold">Edit {draft.type} Item</Modal.Heading>
              <div className="flex items-center justify-between gap-3">
                <CheckboxWrapper
                  id="url-item-favorite"
                  isSelected={Boolean(draft.favorite)}
                  onChange={() => updateDraft((previous) => ({ ...previous, favorite: !previous.favorite }))}
                  label="Favorite"
                />
                <span className="text-xs text-zinc-400">
                  {saveState === "saving" ? "Saving..." : saveState === "saved" ? "All changes saved" : "Ready"}
                </span>
              </div>
              <Modal.CloseTrigger
                aria-label="Close editor"
                className="rounded-md border border-zinc-700 bg-alternative-background text-zinc-200 hover:bg-zinc-700"
              >
                <XIcon className="size-4" />
              </Modal.CloseTrigger>
            </Modal.Header>

            <Modal.Body className="hide-scrollbar space-y-4 px-1">
              <CustomTextField
                id="url-item-display-name"
                value={draft.displayName}
                onChange={bindTextField("displayName")}
                placeholder="Display Name"
                label="Display Name"
              />
              <CustomTextAreaField
                id="url-item-description"
                value={draft.description ?? ""}
                onChange={bindTextField("description")}
                placeholder="Description"
                label="Description Details"
              />
              <div className="space-y-2">
                <div className="grid grid-cols-3 items-center justify-between">
                  <span className="col-span-1 flex items-center gap-1.5 font-medium text-primary">
                    <PaperclipIcon className="size-4" />
                    Additional
                  </span>
                  <div className="col-span-2 flex items-center justify-between gap-1.5">
                    <span className="text-primary">Links</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-primary"
                      onPress={handleAddCurrentPage}
                    >
                      <PlusCircleIcon className="size-4" /> Add Link
                    </Button>
                  </div>
                </div>
                {(draft.additionalLinks ?? []).length > 0 && (
                  <div className="space-y-1.5">
                    {(draft.additionalLinks ?? []).map((link, index) => (
                      <div key={index} className="grid grid-cols-3 items-center gap-2">
                        <div className="col-span-1 flex items-center gap-2">
                          <Button
                            onPress={() => handleCopyLink(link.link)}
                            aria-label="Copy link"
                            size="sm"
                            variant="outline"
                            className="border-zinc-700 hover:border-zinc-600"
                          >
                            <CopyIcon className="size-3.5" />
                          </Button>
                          <Input
                            value={link.name}
                            onChange={(e) => handleUpdateLink(index, "name", e.target.value)}
                            placeholder="Name"
                            className="w-full focus:ring-primary focus:ring-1"
                          />
                        </div>
                        <div className="col-span-2 flex items-center gap-2">
                          <Input
                            value={link.link}
                            onChange={(e) => handleUpdateLink(index, "link", e.target.value)}
                            placeholder="URL"
                            className="flex-1 focus:ring-primary focus:ring-1"
                          />
                          <Button
                            onPress={() => handleRemoveLink(index)}
                            aria-label="Remove link"
                            size="sm"
                            variant="ghost"
                            className="text-red-500"
                            isIconOnly
                          >
                            <CircleMinusIcon className="size-5 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <CustomTextField
                id="url-item-url"
                value={draft.url}
                onChange={bindTextField("url")}
                placeholder="URL"
                label="URL"
              />
              <CustomTextField
                id="url-item-original-url"
                value={draft.originalUrl}
                onChange={bindTextField("originalUrl")}
                placeholder="Original URL"
                label="Original URL"
              />

              <div className="grid grid-cols-5 gap-3">
                <div className="flex flex-col col-span-3 gap-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="url-item-collection-name" className="text-primary">Collection (Optional)</Label>
                    <CheckboxWrapper
                      id="url-item-preserve-custom-name"
                      isSelected={Boolean(draft.preserveCustomName)}
                      onChange={() =>
                        updateDraft((previous) => ({
                          ...previous,
                          preserveCustomName: !previous.preserveCustomName,
                        }))
                      }
                      label="Preserve Custom Name"
                    />
                  </div>
                  <Input
                    id="url-item-collection-name"
                    placeholder="Collection Name"
                    type="text"
                    value={draft.collectionName ?? ""}
                    onChange={bindTextField("collectionName")}
                    disabled={draft.collectionName === ARCHIVED_COLLECTION_NAME}
                    className="focus:ring-primary focus:ring-1"
                  />
                </div>
                <div className="flex flex-col col-span-2 gap-1">
                  <Label htmlFor="url-item-last-visited" className="text-sm">
                    Last Visited
                  </Label>
                  <input
                    id="url-item-last-visited"
                    type="datetime-local"
                    value={
                      draft.lastVisitedMS && !Number.isNaN(new Date(draft.lastVisitedMS).getTime())
                        ? new Date(draft.lastVisitedMS).toISOString().slice(0, 16)
                        : ""
                    }
                    onChange={(event) => {
                      const date = new Date(event.target.value);
                      if (Number.isNaN(date.getTime())) return;
                      updateDraft((previous) => ({
                        ...previous,
                        lastVisited: date.toISOString(),
                        lastVisitedMS: date.getTime(),
                      }));
                    }}
                    className="rounded-md border border-zinc-700 bg-alternative-background px-3 py-2 text-sm text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <CheckboxWrapper
                  id="url-item-archived"
                  isSelected={draft.collectionName === ARCHIVED_COLLECTION_NAME}
                  onChange={(isSelected) => {
                    updateDraft((previous) => ({
                      ...previous,
                      collectionName: isSelected ? ARCHIVED_COLLECTION_NAME : undefined,
                    }));
                  }}
                  label="Archived"
                />
              </div>

              {draft.type === URLType.JIRA ? (
                <div className="space-y-3 rounded-lg border border-zinc-700 bg-alternative-background p-3">
                  <h3 className="text-sm font-semibold text-zinc-300">Jira Fields</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <CustomTextField
                      id="jira-code"
                      value={draft.jiraCode}
                      onChange={bindTextField("jiraCode")}
                      placeholder="Jira Code"
                      label="Jira Code"
                    />
                    <CustomTextField
                      id="jira-sprint"
                      value={draft.sprint}
                      onChange={bindTextField("sprint")}
                      placeholder="Sprint"
                      label="Sprint"
                    />
                  </div>
                  <CustomTextField
                    id="jira-title"
                    value={draft.title}
                    onChange={bindTextField("title")}
                    placeholder="Title"
                    label="Title"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <CustomTextField
                      id="jira-status"
                      value={draft.status}
                      onChange={bindTextField("status")}
                      placeholder="Status"
                      label="Status"
                    />
                    <CustomTextField
                      id="jira-target-date-ms"
                      value={draft.targetDateMS?.toString() ?? ""}
                      onChange={(event) =>
                        updateDraft((previous) => ({
                          ...previous,
                          targetDateMS: parseOptionalNumber(event.target.value),
                        }))
                      }
                      placeholder="Target Date MS"
                      label="Target Date MS"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3 rounded-lg border border-zinc-700 bg-alternative-background p-3">
                  <h3 className="text-sm font-semibold text-zinc-300">AGO Fields</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <CustomTextField
                      id="ago-region"
                      value={draft.region}
                      onChange={bindTextField("region")}
                      placeholder="Region"
                      label="Region"
                    />
                    <CustomTextField
                      id="ago-environment"
                      value={draft.environment}
                      onChange={bindTextField("environment")}
                      placeholder="Environment"
                      label="Environment"
                    />
                  </div>
                  <CustomTextField
                    id="ago-route"
                    value={draft.route}
                    onChange={bindTextField("route")}
                    placeholder="Route"
                    label="Route"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <CustomTextField
                      id="ago-plan-name"
                      value={draft.planName}
                      onChange={bindTextField("planName")}
                      placeholder="Plan Name"
                      label="Plan Name"
                    />
                    <CustomTextField
                      id="ago-jira-code"
                      value={draft.jiraCode ?? ""}
                      onChange={(event) => {
                        const value = event.target.value.trim();
                        updateDraft((previous) => ({
                          ...previous,
                          jiraCode: value ? value : "",
                        }));
                      }}
                      placeholder="Jira Code"
                      label="Jira Code"
                    />
                  </div>
                  <CustomTextField
                    id="ago-client-full-name"
                    value={draft.clientFullName}
                    onChange={bindTextField("clientFullName")}
                    placeholder="Client Full Name"
                    label="Client Full Name"
                  />
                  <CustomTextField
                    id="ago-client-last-name"
                    value={draft.clientLastName}
                    onChange={bindTextField("clientLastName")}
                    placeholder="Client Last Name"
                    label="Client Last Name"
                  />
                </div>
              )}
            </Modal.Body>

            <Modal.Footer className="flex items-center justify-between">
              <Button variant="danger" onPress={handleDelete}>
                <Trash2Icon className="size-4" /> Delete
              </Button>
              <Button
                variant="ghost"
                className="border border-zinc-700 bg-alternative-background text-white hover:bg-zinc-700"
                onPress={() => overlayState.close()}
              >
                Close
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
