import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    hmr: {
      overlay: false
    }
  },
  esbuild: {
    target: "es2020",
    drop: ["console", "debugger"]
  },
  build: {
    target: "es2020",
    sourcemap: false,
    minify: "terser",
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    modulePreload: {
      polyfill: false
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 3,
        pure_funcs: [
          "console.log",
          "console.info",
          "console.debug",
          "console.warn"
        ]
      },
      format: {
        comments: false
      }
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react-router-dom")) return "router";
            if (id.includes("react") || id.includes("react-dom")) return "react-vendor";
            if (id.includes("recharts") || id.includes("chart.js")) return "charts";
            if (id.includes("jspdf") || id.includes("html2canvas")) return "pdf";
            if (id.includes("framer-motion")) return "animations";
            if (id.includes("face-api") || id.includes("tensorflow")) return "proctoring";
            return "vendor";
          }
        }
      }
    }
  }
});

