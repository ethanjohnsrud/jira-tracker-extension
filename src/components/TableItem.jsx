import React, { useEffect, useRef } from "react";
import { useState } from "react";
import StarButton from "./StarButton";
import { saveToStorage, getFromStorage } from "../controllers/storageController";

export default function TableItem({
    storageListKey,
    displayName,
    favorite,
    className,
    id,
    url,
    lastVisited,
    preserveCustomName,
    linkReady,
    ...props
}) {
    const [showEditMenu, setShowEditMenu] = useState(false);
    const [showLabelEdit, setShowLabelEdit] = useState(false);
    const itemRef = useRef(null);

    const handleClick = (e) => {
        if (showLabelEdit) return;

        if (e.ctrlKey || e.metaKey) {
            return chrome.tabs.create({ url });
        }

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.update(tabs[0].id, { url });
        });
    };

    const handleDelete = async () => {
        let storedList = await getFromStorage(storageListKey) ?? [];
        const urlList = Array.isArray(storedList) ? storedList : [];

        const updatedUrls = urlList.filter((u) => u.id !== id);

        await saveToStorage({ [storageListKey]: updatedUrls });
        setShowLabelEdit(false);
    };

    const handleSave = async () => {
        let storedList = await getFromStorage(storageListKey) ?? [];
        const urlList = Array.isArray(storedList) ? storedList : [];

        const urlItem = urlList.find((u) => u.id === id);
        urlItem.displayName = itemRef.current.innerText.trim();
        urlItem.preserveCustomName = true;

        await saveToStorage({ [storageListKey]: urlList });
        setShowLabelEdit(false);
    };

    const handleFavPress = async () => {
        // const storageKey = isJiraUrl ? 'jiraUrlList' : 'agoUrlList';

        let storedList = await getFromStorage(storageListKey) ?? [];
        const urlList = Array.isArray(storedList) ? storedList : [];

        // const storageKey = isJiraUrl ? 'jiraUrlList' : 'agoUrlList';
        // let storedData = await getFromStorage(storageKey) || {}; //Fetch storage once and ensure it's an array
        // const urlList = Array.isArray(storedData[storageKey]) ? storedData[storageKey] : [];

        //To trigger update: Find the index instead of modifying the reference directly
        const index = urlList.findIndex((u) => u.id === id);
        if (index > -1) {
            urlList[index] = { ...urlList[index], favorite: !urlList[index].favorite };
            await saveToStorage({ [storageListKey]: urlList });
            console.log("Updated favorite status: ", urlList[index]);
        }
        // const url = urlList.find((u) => u.id === id);
        // url?.favorite = !favorite;
    };

    const handleEdit = () => {
        setShowLabelEdit(true);
        itemRef.current.focus();
    };

    const handleContextMenu = (e) => {
        e.preventDefault();
        if(showLabelEdit) return;
        setShowEditMenu(true);
    };

    useEffect(() => {
        if (showEditMenu) {
            document.addEventListener("click", () => setShowEditMenu(false));
        }
        return () => {
            document.removeEventListener("click", () => setShowEditMenu(false));
        };
    }, [showEditMenu]);

    return (
        <div
            className={`flex justify-start gap-x-2 w-full items-center p-2 ${className} rounded-md`}
            onContextMenu={handleContextMenu}
            {...props}
        >
            <StarButton
                fill={favorite ? "#ffffff" : "none"}
                size={16}
                onClick={handleFavPress}
            />
            <div
                ref={itemRef}
                className={`text-[14px] rounded-md w-full px-2 outline-none cursor-pointer
          ${showEditMenu ? " break-words" : " whitespace-nowrap"} 
          ${showLabelEdit ? " border border-alternative-background" : ""} 
          ${(!showLabelEdit && !showEditMenu && linkReady) ? " text-primary" : " text-white"}`}
                contentEditable={showLabelEdit}
                suppressContentEditableWarning={true}
                onClick={handleClick}
            >
                {displayName}
            </div>
            {showEditMenu && (
                <button
                    className="ml-auto bg-[#7bbd4a] text-white px-2 py-[2px] rounded"
                    onClick={handleEdit}
                >
                    Edit
                </button>
            )}
            {showEditMenu && (
                <button
                    className="ml-auto bg-[#8B0000] text-white px-2 py-[2px] rounded"
                    onClick={handleDelete}
                >
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
            )}
            {showLabelEdit && (
                <button
                    className="bg-[#7bbd4a] text-white px-2 py-[2px] rounded"
                    onClick={handleSave}
                >
                    Save
                </button>
            )}
        </div>
    );
}
