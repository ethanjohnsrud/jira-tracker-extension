# Jira Tracking Extension

The **Jira Tracking Extension** is a Chrome extension designed to enhance productivity for development teams by providing an efficient way to track recently visited Jira links and development websites. The extension offers the following key features:

- **Track Recent Jira Links**: Automatically records and organizes recently visited Jira links, making it easy to revisit relevant issues and tasks.
- **Save and Rename Links**: Users can save important Jira links and development URLs for quick access. The extension allows for renaming saved links for better organization.
- **Link to Development Websites**: Easily link and navigate between Jira issues and related development websites, streamlining the workflow between tracking tasks and working on the code.
- **Convenient Navigation**: Users can filter and navigate through development websites based on region, environment, and common pages, providing a tailored and efficient browsing experience.

This extension is designed to improve the workflow for development teams, making it easier to manage and access the most relevant project information in real-time.

## Production
1. To build the extension in production mode using the webpack.prod config, run
  `yarn build`. This will minify the code.
2. You can then install the extension file inside the dist folder on Google Chrome

## Install the Extension in Chrome

1. Open **Google Chrome** and go to:  chrome://extensions/
2. Enable **Developer mode** (toggle in the top-right corner).  
3. Click on **"Load unpacked"**.  
4. Select the **dist/** folder in your project.  
5. The extension should now be installed and visible in Chrome.  


## Development
1. Install node modules, run `yarn`
2. Build extension dev mode, run `yarn dev`
3. Install the extension in the dist folder on Google Chrome

### Key File Structure
- **`/constants`** — Dropdown Configurations: `environments.json`, `regions.json`, `routes.json`
- **`constants.js`** — Regex Url Matching
- **`content.jsx`** — Injected into web pages; it reads or modifies page content and listens for messages from the background or popup scripts.
- **`background.jsx`** — Runs persistently in the background, handling alarms, storage, and event listeners like `chrome.alarms.onAlarm`, managing extension-wide state and cross-script messaging.
- **`popup.jsx`** — The UI code for the extension's popup window; displays data from storage, triggers actions like starting/stopping timers, and communicates with the background script.


#### Chrome Extension Refresh & Code Update Behavior
- **When you run `yarn dev`**  
  → Webpack rebuilds your extension bundle and shows `compiled successfully` in the terminal.

- **When you change service worker (`background.jsx`) code**  
  → Must click **“Reload” in chrome://extensions** to load the updated background script.

- **When you change popup UI code (`popup.jsx`)**  
  → The popup reloads automatically when opened, unless you’ve changed the manifest or permissions.

- **When you change content scripts (`content.jsx`)**  
  → Must click **“Reload” in [chrome://extensions/](chrome://extensions/)** and refresh the target page for the new content script to be injected.

- **Service worker (background)**  
  → Can auto-terminate when idle; any variables declared in global scope are reset when it restarts.

- **“Reload” button in [chrome://extensions/](chrome://extensions/)**  
  → Fully reloads as-if uninstalling/re-installing.

- **No need to “Remove and reinstall”**  
  → Unless the manifest version changes significantly or you need to clear/reset extension storage.

#### Debugging: Where `console.log` Appears
- **From `background.jsx` (service worker)**  
  → Go to [chrome://extensions/](chrome://extensions/), click **“Service Worker” link under your extension**, opens a console for background logs.

- **From `content.jsx` (content scripts)**  
  → Open **DevTools on the active tab (F12)**, logs appear in the **Console tab of that page's DevTools**.

- **From `popup.jsx` (popup window)**  
  → Right-click your extension icon → **Inspect popup**, logs appear in the **Console tab** of that popup’s DevTools.


## Additional Information
This extension is built with ReactJs, Tailwind and webpack.

- The cache clear URL and the time interval are located in the `background.jsx` file.  It is only initiated in the `Local` environment; according to `Popup.jsx.handleCacheClick`.

### Colors
- Primary color is set in the `tailwind.config.js` file.
- The background color is set in `src/index.css` file `line 20`

### Config
The JavaScript files that you want to be in the extension as following in **webpack.config.js**
```
  entry: {
    popup: "./src/popup.jsx",
    content: "./src/content.jsx",
    background: "./src/background.jsx",
  },
```

### Author
**Ethan Johnsrud**
- [Github](https://github.com/ethanjohnsrud)
- [Portfolio](https://ethanjohnsrud.com/)
 