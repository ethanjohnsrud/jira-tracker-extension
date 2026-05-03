import { getFromStorage, getSettings, saveToStorage } from "@/controllers/storageController";
import { DEBUG_MODE } from "@/utils/state";
import { AUTO_EXPORT_IMPORT_SELECTORS } from "@/constants/dom-selectors";
import { getElement, waitForUserGesture } from "@/utils/dom-extractor";
import { blobToBase64, sleep } from "@/utils/functions";
import { parseUrlOrigin, testRegexStr } from "@/utils/url";

export const initAutoExportImport = async () => {
  try {
    const { preferences } = await getFromStorage(["preferences"]);
    const settings = await getSettings();

    if (!preferences?.autoExportImport) {
      if (DEBUG_MODE) console.log("[AutoExportImport] Auto Export/Import disabled");
      return;
    }

    const url = window.location.href;

    if (testRegexStr(url, settings.others.EXPORT_ROUTE_REGEX)) {
      if (DEBUG_MODE) console.log("[AutoExportImport] Detected export page");
      await handleExportPage();
    } else if (testRegexStr(url, settings.others.IMPORT_ROUTE_REGEX)) {
      if (DEBUG_MODE) console.log("[AutoExportImport] Detected import page");
      await handleImportPage();
    } else {
      if (DEBUG_MODE) console.log("[AutoExportImport] URL does not match export or import route");
    }
  } catch (e) {
    if (DEBUG_MODE) console.error("[AutoExportImport] Error initializing", e);
  }
};

const handleExportPage = async () => {
  const { VYT_EXPORT_BUTTON } = AUTO_EXPORT_IMPORT_SELECTORS.EXPORT;
  const exportButton = await getElement<HTMLAnchorElement>(VYT_EXPORT_BUTTON);
  if (exportButton?.href) {
    const parsedUrl = await parseUrlOrigin(window.location.href);
    if (!parsedUrl?.region || !parsedUrl?.environment) {
      if (DEBUG_MODE) console.error("[AutoExportImport] Could not parse region and environment from URL");
      return;
    }

    if (DEBUG_MODE) console.log("[AutoExportImport] Fetching data");
    const response = await fetch(exportButton.href);

    if (!response.ok) {
      if (DEBUG_MODE) console.error("[AutoExportImport] Fetch failed", response.status, response.statusText);
      return;
    }

    const blob = await response.blob();
    const base64Data = await blobToBase64(blob);
    const contentType = blob.type;

    const { importedFileData } = await getFromStorage("importedFileData");

    await saveToStorage({
      importedFileData: {
        ...importedFileData,
        [parsedUrl.region]: {
          ...importedFileData?.[parsedUrl.region],
          [parsedUrl.environment]: {
            data: base64Data,
            contentType,
          },
        },
      },
    });

    if (DEBUG_MODE) console.log("[AutoExportImport] Saved exported data to storage", parsedUrl.region, parsedUrl.environment);
  } else if (exportButton) {
    if (DEBUG_MODE) console.log("[AutoExportImport] Clicking .VYT Export button");
    exportButton.click();
  } else {
    if (DEBUG_MODE) console.warn("[AutoExportImport] Export button not found");
  }
};

const handleImportPage = async () => {
  const { VYT_FILE_IMPORT_BUTTON, CHOOSE_FILE_BUTTON, FILE_INPUT, UPLOAD_FILE_BUTTON } =
    AUTO_EXPORT_IMPORT_SELECTORS.IMPORT;

  const importButton = await getElement<HTMLButtonElement>(VYT_FILE_IMPORT_BUTTON);
  if (importButton) {
    if (DEBUG_MODE) console.log("[AutoExportImport] Clicking .VYT File import button", importButton);
    importButton.click();

    await sleep(500); // Wait for file input to appear
    const fileInput = await getElement<HTMLInputElement>(FILE_INPUT);

    const parsedUrl = await parseUrlOrigin(window.location.href);
    const { importedFileData } =
      parsedUrl?.region && parsedUrl?.environment
        ? await getFromStorage("importedFileData")
        : { importedFileData: undefined };

    //TODO: add a system to choose preferred environment 
    const storedEntry =
      parsedUrl?.region && parsedUrl?.environment
        ? importedFileData?.[parsedUrl.region]?.[parsedUrl.environment]
        : undefined;

    if (fileInput) {
      if (storedEntry?.data) {
        if (DEBUG_MODE) console.log("[AutoExportImport] Injecting file from storage", parsedUrl!.region, parsedUrl!.environment);
        const decodedText = decodeURIComponent(escape(atob(storedEntry.data)));
        const file = new File([decodedText], "import", { type: storedEntry.contentType });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;

        fileInput.addEventListener("change", async () => {
          if (fileInput.files && fileInput.files.length > 0) {
            const uploadButton = await getElement<HTMLButtonElement>(UPLOAD_FILE_BUTTON);
            if (uploadButton && !uploadButton.disabled) {
              if (DEBUG_MODE) console.log("[AutoExportImport] File injected, clicking Upload File button");
              uploadButton.click();
            }
          }
        });

        fileInput.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        if (DEBUG_MODE) console.log("[AutoExportImport] Waiting for user gesture before clicking file input");
        await waitForUserGesture(); // filepicker is an user-gesture restricted feature
        fileInput.click(); // It doesn't work programmatically on page load without user gesture

        fileInput.addEventListener("change", async () => {
          if (fileInput.files && fileInput.files.length > 0) {
            const uploadButton = await getElement<HTMLButtonElement>(UPLOAD_FILE_BUTTON);
            if (uploadButton && !uploadButton.disabled) {
              if (DEBUG_MODE) console.log("[AutoExportImport] File selected, clicking Upload File button");
              uploadButton.click();
            }
          }
        });
      }
    } else {
      const chooseFileButton = await getElement<HTMLButtonElement>(CHOOSE_FILE_BUTTON);
      if (chooseFileButton) {
        if (DEBUG_MODE) console.log("[AutoExportImport] Clicking Choose File button", chooseFileButton);
        chooseFileButton.focus();
        await sleep(100);
        chooseFileButton.click();
      }
    }
  } else {
    if (DEBUG_MODE) console.warn("[AutoExportImport] Import button not found");
  }
};
