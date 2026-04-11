import { getFromStorage } from "@/controllers/storageController";
import { DEBUG_MODE } from "@/utils/state";
import { LOGIN_URL_REGEX } from "@/constants/regex";
import { AUTO_LOGIN_SELECTORS } from "@/constants/dom-selectors";
import { selectElement } from "@/utils/dom-extractor";
import { LoginCredentials } from "@/types/dropdown-types";

export const initAutoLogin = async () => {
  try {
    const { preferences, loginCredentials } = await getFromStorage(["preferences", "loginCredentials"]);

    if (!preferences?.autoLogin) {
      if (DEBUG_MODE) console.log("[CONTENT][AutoLogin] Auto Login disabled in preferences.");
      return;
    }

    const urlMatch = window.location.href.match(LOGIN_URL_REGEX);
    if (!urlMatch || !urlMatch.groups?.region || !urlMatch.groups?.environment) {
      if (DEBUG_MODE) console.log("[CONTENT][AutoLogin] URL does not match region/environment pattern.");
      return;
    }

    const regionStr = urlMatch.groups.region.toLowerCase();
    let environmentStr = urlMatch.groups.environment.toLowerCase();

    // Ensure "localhost" matches for environments correctly
    if (window.location.hostname.includes("localhost")) {
      environmentStr = "localhost";
    }

    if (DEBUG_MODE) console.log("[CONTENT][AutoLogin] Detected Region:", regionStr, "Env:", environmentStr);

    const credentialsList = (loginCredentials as LoginCredentials[]) || [];
    const creds = credentialsList.find(
      (c) => c.environment.toLowerCase() === environmentStr && c.region.toLowerCase() === regionStr
    );
    if (!creds || !creds.username || !creds.password) {
      if (DEBUG_MODE) console.log("[CONTENT][AutoLogin] No credentials found for", environmentStr, regionStr);
      return;
    }

    const { username, password } = creds;

    // Briefly wait to ensure forms have fully rendered (mostly for client-rendered applications)
    setTimeout(() => executeMatchedFlow(username, password), 500);
  } catch (e) {
    if (DEBUG_MODE) console.error("[CONTENT][AutoLogin] Error initializing", e);
  }
};

const triggerInput = (element: HTMLInputElement, value: string) => {
  element.value = value;
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const executeMatchedFlow = async (userName: string, passWord: string) => {
  const S = AUTO_LOGIN_SELECTORS;

  // 1. Localhost Protected Warning
  const detailsButton = await selectElement<HTMLButtonElement>(S.LOCALHOST_PROTECTED.DETAILS_BUTTON);
  const proceedLink = await selectElement<HTMLAnchorElement>(S.LOCALHOST_PROTECTED.PROCEED_LINK);
  if (detailsButton && proceedLink) {
    if (DEBUG_MODE) console.log("[CONTENT][AutoLogin] Flow: Localhost Protected");
    detailsButton.click();
    setTimeout(() => proceedLink.click(), 500);
    return;
  }

  // 2. Localhost Login
  const jUser = await selectElement<HTMLInputElement>(S.LOCALHOST_LOGIN.USERNAME);
  const jPass = await selectElement<HTMLInputElement>(S.LOCALHOST_LOGIN.PASSWORD);
  if (jUser && jPass) {
    if (DEBUG_MODE) console.log("[CONTENT][AutoLogin] Flow: Localhost Login");
    triggerInput(jUser, userName);
    triggerInput(jPass, passWord);
    const loginBtn = await selectElement<HTMLInputElement>(S.LOCALHOST_LOGIN.SUBMIT_BUTTON);
    if (loginBtn) loginBtn.click();
    return;
  }

  // 3. Two Step Login
  const step1User = await selectElement<HTMLInputElement>(S.TWO_STEP_LOGIN.STEP_1_USERNAME);
  const step1Form = await selectElement<HTMLFormElement>(S.TWO_STEP_LOGIN.STEP_1_FORM);
  if (step1User || step1Form) {
    if (DEBUG_MODE) console.log("[CONTENT][AutoLogin] Flow: Two Step Login");
    if (step1User) triggerInput(step1User, userName);
    const continueBtn = await selectElement<HTMLButtonElement>(S.TWO_STEP_LOGIN.STEP_1_CONTINUE_BUTTON);
    if (continueBtn) continueBtn.click();

    // Observe or poll for Step 2
    let attempts = 0;
    const checkStep2 = setInterval(async () => {
      attempts++;
      const step2Pass = await selectElement<HTMLInputElement>(S.TWO_STEP_LOGIN.STEP_2_PASSWORD);
      if (step2Pass && (step2Pass.offsetWidth > 0 || step2Pass.offsetHeight > 0)) {
        clearInterval(checkStep2);
        triggerInput(step2Pass, passWord);
        const login2Btn = await selectElement<HTMLButtonElement>(S.TWO_STEP_LOGIN.STEP_2_LOGIN_BUTTON);
        if (login2Btn) login2Btn.click();
      } else if (attempts > 20) {
        // wait up to 10 seconds
        clearInterval(checkStep2);
      }
    }, 500);
    return;
  }

  // 4. Basic Login (General)
  const basicUser = await selectElement<HTMLInputElement>(S.BASIC_LOGIN.USERNAME);
  const basicPass = await selectElement<HTMLInputElement>(S.BASIC_LOGIN.PASSWORD);
  if (basicUser && basicPass) {
    if (DEBUG_MODE) console.log("[CONTENT][AutoLogin] Flow: Basic Login");
    triggerInput(basicUser, userName);
    triggerInput(basicPass, passWord);
    const basicLoginBtn = await selectElement<HTMLButtonElement>(S.BASIC_LOGIN.SUBMIT_BUTTON);
    if (basicLoginBtn) basicLoginBtn.click();
    return;
  }

  if (DEBUG_MODE) console.log("[CONTENT][AutoLogin] No matching login form flow detected.");
};
