import path from "node:path";
import { crx } from "@crxjs/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig, PluginOption } from "vite";
import zip from "vite-plugin-zip-pack";
import { visualizer } from "rollup-plugin-visualizer";
import manifest from "./manifest.config.js";
import { name, version } from "./package.json";

export default defineConfig({
  resolve: {
    alias: {
      "@": `${path.resolve(__dirname, "src")}`,
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("@heroui")) {
              return "heroui";
            }
            if (id.includes("react")) {
              return "react";
            }
            return "vendor";
          }
        },
      },
    },
  },
  plugins: [
    react(),
    crx({ manifest }),
    zip({ outDir: "release", outFileName: `${name}-${version}.zip` }),
    visualizer({
      filename: 'bundle-stats.html'
    }) as PluginOption,
  ],
  server: {
    cors: {
      origin: [/chrome-extension:\/\//],
    },
  },
});
