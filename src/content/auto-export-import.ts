import { getFromStorage } from "@/controllers/storageController";
import { DEBUG_MODE } from "@/utils/state";
import { AUTO_EXPORT_IMPORT_SELECTORS } from "@/constants/dom-selectors";
import { getElement, waitForUserGesture } from "@/utils/dom-extractor";
import { sleep } from "@/utils/functions";

const EXPORT_ROUTE_REGEX = /\/client-export/;
const IMPORT_ROUTE_REGEX = /\/client-import|\/integration/;

export const initAutoExportImport = async () => {
  try {
    const { preferences } = await getFromStorage(["preferences"]);

    if (!preferences?.autoExportImport) {
      if (DEBUG_MODE) console.log("[AutoExportImport] Auto Export/Import disabled");
      return;
    }

    const url = window.location.href;

    if (EXPORT_ROUTE_REGEX.test(url)) {
      if (DEBUG_MODE) console.log("[AutoExportImport] Detected export page");
      await handleExportPage();
    } else if (IMPORT_ROUTE_REGEX.test(url)) {
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
  if (exportButton) {
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

    if (fileInput) {
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
