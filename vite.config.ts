import { resolve } from "path";
import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: [{ find: "@src", replacement: resolve(__dirname, "./src") }],
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: "src/manifest.json",
          dest: ".",
        },
        {
          src: "src/static",
          dest: ".",
        },
      ],
    }),
  ],
  build: {
    target: "esnext",
    modulePreload: false,
    rollupOptions: {
      input: {
        background: resolve(__dirname, "src/background.ts"),
        "scripts/sensibull/sensibull": resolve(
          __dirname,
          "src/scripts/sensibull/sensibull.ts",
        ),
        "scripts/popup/popup": resolve(__dirname, "src/scripts/popup/popup.ts"),
      },
      output: [
        {
          format: "esm",
          entryFileNames: "[name].js",
        },
      ],
    },
    outDir: "dist",
    emptyOutDir: true,
  },
});
