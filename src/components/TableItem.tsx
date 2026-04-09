import React, { useEffect, useRef } from "react";
import { useState } from "react";
import { saveToStorage, getFromStorage } from "../controllers/storageController";
import { StarIcon } from "lucide-react";
import { Button } from "@heroui/react";
import { AgoUrlListItem, JiraUrlListItem, StorageKey } from "../types/storage-types";
import { DEBUG_MODE } from "../utils/state";
import { formatDistanceToNowStrict } from "date-fns";
import { URLType } from "../types/list-types";

type Props = {
	urlItem: JiraUrlListItem | AgoUrlListItem;
	storageListKey: StorageKey;
	className?: string;
	linkReady?: boolean;
};

export default function TableItem({
	storageListKey,
	className,
	linkReady,
	urlItem,
	...props
}: Props & React.ComponentProps<"div">) {
	const { displayName, favorite, id, url, lastVisited, preserveCustomName } = urlItem;
	const [showEditMenu, setShowEditMenu] = useState(false);
	const [displayNameValue, setDisplayNameValue] = useState(displayName);
	const [urlValue, setUrlValue] = useState(url);
	const tableItemRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (urlItem.type == URLType.JIRA) {
			setDisplayNameValue(urlItem.title || urlItem.jiraCode);
		} else if (urlItem.type == URLType.AGO) {
			//TODO: Add AGO display name logic
		}
	}, [urlItem]);

	const getUrlList = async () => {
		let stored = await getFromStorage(storageListKey);
		const urlList = Array.isArray(stored[storageListKey]) ? stored[storageListKey] : [];
		return urlList as (JiraUrlListItem | AgoUrlListItem)[];
	};

	const onLabelClick: React.MouseEventHandler<HTMLElement> = (e) => {
		// if(showEditMenu) return;
		setShowEditMenu(false);

		if (e.ctrlKey || e.metaKey) {
			return chrome.tabs.create({ url });
		}

		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			chrome.tabs.update(tabs[0].id, { url });
		});
	};

	const onDeleteClick = async () => {
		const urlList = await getUrlList();
		const updatedUrls = urlList.filter((u) => u.id !== id);

		await saveToStorage({ [storageListKey]: updatedUrls });
		setShowEditMenu(false);
	};

	const onSaveClick = async () => {
		const urlList = await getUrlList();

		const urlItem = urlList.find((u) => u.id === id);
		if (!urlItem) {
			if (DEBUG_MODE) console.log("[TableItem] URL Item not found", id);
			return;
		}
		urlItem.displayName = displayNameValue;
		urlItem.preserveCustomName = true;
		urlItem.url = urlValue;

		await saveToStorage({ [storageListKey]: urlList });
		setShowEditMenu(false);
	};

	const handleFavPress = async () => {
		const urlList = await getUrlList();

		//To trigger update: Find the index instead of modifying the reference directly
		const index = urlList.findIndex((u) => u.id === id);
		console.log({ urlList, index, id, storageListKey });
		if (index > -1) {
			urlList[index] = {
				...urlList[index],
				favorite: !urlList[index].favorite,
			};
			await saveToStorage({ [storageListKey]: urlList });
			console.log("Updated favorite status: ", urlList[index]);
		}
	};

	//Close Menu when lose focus
	useEffect(() => {
		if (!showEditMenu) return;

		const onOutsideClick = (e: MouseEvent) => {
			if (tableItemRef.current && !tableItemRef.current.contains(e.target as Node)) {
				setShowEditMenu(false);
			}
		};

		document.addEventListener("mousedown", onOutsideClick);
		return () => {
			document.removeEventListener("mousedown", onOutsideClick);
		};
	}, [showEditMenu]);

	return (
		<div
			ref={tableItemRef}
			className={`flex justify-start gap-x-2 w-full items-center ${className} rounded-md`}
			onContextMenu={(e) => {
				e.preventDefault();
				setShowEditMenu((p) => !p);
			}}
			{...props}
		>
			{showEditMenu ? (
				<div className="hide-scrollbar">
					{/* Row 1: label input */}
					<input
						type="text"
						className="w-full px-0 py-1 border-none bg-transparent mb-1 text-left whitespace-nowrap"
						value={displayNameValue}
						onChange={(e) => setDisplayNameValue(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								onSaveClick();
							}
						}}
					/>
					{/* Row 2: URL input */}
					<textarea
						className="w-full px-0 py-0 border-none bg-transparent mb-1 text-xs text-primary break-words hide-scrollbar"
						style={{ minHeight: "4rem" }}
						value={urlValue}
						onChange={(e) => setUrlValue(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								onSaveClick();
							}
						}}
					/>
					{/* Row 3: Buttons */}
					<div className="flex space-between">
						<button className="px-3 py-0 bg-green-600 text-white rounded" onClick={onSaveClick}>
							Save
						</button>
						<button className="ml-auto bg-[#8B0000] text-white px-2 py-[2px] rounded" onClick={onDeleteClick}>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								className="w-4 h-4"
							>
								<line x1="18" y1="6" x2="6" y2="18" />
								<line x1="6" y1="6" x2="18" y2="18" />
							</svg>
						</button>
					</div>
				</div>
			) : (
				<div className="w-full flex flex-col">
					<div className="flex items-center gap-2">
						<Button
							isIconOnly
							aria-label="Favorite"
							className={`p-0 m-0 min-w-4 w-4 h-4 bg-transparent hover:bg-transparent`}
							onClick={handleFavPress}
						>
							<StarIcon
								className="size-4.5"
								fill={favorite ? "#ffffff" : "none"}
								stroke={favorite ? "#ffffff" : "#ffffff"}
							/>
						</Button>
						<div
							className={`text-[14px] flex-1 whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer border border-gray-500 py-2 px-1 ${linkReady ? "text-primary" : "text-white"}`}
							onClick={onLabelClick}
						>
							{displayName}
						</div>
					</div>
					<div className="flex items-center gap-2 mt-1">
						<div className="w-4"></div>
						{urlItem.type == URLType.JIRA ? (
							<div className="w-full flex justify-between gap-2 flex-wrap">
								<span className="text-slate-300">{urlItem.jiraCode}</span>
								<span className="text-slate-300">{urlItem.sprint}</span>
								{urlItem.targetDateMS && (
									<span className="text-slate-300">
										{formatDistanceToNowStrict(urlItem.targetDateMS)}
									</span>
								)}
							</div>
						) : urlItem.type == URLType.AGO && (
							<div className="w-full flex justify-between gap-2 flex-wrap">
								{/* Region-Environment */}
								<span className="text-slate-300">
									<span className="uppercase">{urlItem.region}</span>
									-
									<span className="capitalize">{urlItem.environment}</span>
								</span>
								{urlItem.jiraCode && (
									<span className="text-slate-300">{urlItem.jiraCode}</span>
								)}
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
