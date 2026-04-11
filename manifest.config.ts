import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json";

export default defineManifest({
  manifest_version: 3,
  name: pkg.displayName,
  version: pkg.version,
  description: pkg.description,
  // @ts-ignore
  author: "Ethan",
  homepage_url: "https://ethanjohnsrud.com/",
  icons: {
    16: "public/icons/16.png",
    32: "public/icons/32.png",
    48: "public/icons/48.png",
    64: "public/icons/64.png",
    128: "public/icons/128.png",
  },
  action: {
    default_icon: {
      16: "public/icons/16.png",
      32: "public/icons/32.png",
      48: "public/icons/48.png",
      64: "public/icons/64.png",
      128: "public/icons/128.png",
    },
    default_popup: "src/popup/index.html",
  },
  background: {
    service_worker: "src/background.ts",
    type: "module",
  },
  content_scripts: [
    {
      matches: ["https://jira.ethanjohnsrud.com/*", "https://*.ethanjohnsrud.com/*"],
      run_at: "document_start",
      js: ["src/content/index.ts"],
    },
  ],
  commands: {
    "activate-extension": {
      suggested_key: {
        default: "Alt+A",
        mac: "Ctrl+A",
      },
      description: "Open the extension popup window",
    },
  },
  permissions: ["storage", "alarms", "activeTab", "cookies"],
  host_permissions: ["https://jira.ethanjohnsrud.com/*", "https://*.ethanjohnsrud.com/*"],
});
