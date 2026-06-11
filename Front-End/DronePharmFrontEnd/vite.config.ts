import path from "path";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

function getProxyTargets(mode: string): { apiTarget: string; wsTarget: string } {
  const env = loadEnv(mode, process.cwd(), "");
  let apiTarget = env.VITE_API_URL?.trim();

  // Garante que o target do proxy seja uma URL válida, caso a variável falhe ou seja relativa
  if (!apiTarget || apiTarget.startsWith("/")) {
    apiTarget = "http://localhost:8000";
  } else if (!apiTarget.startsWith("http")) {
    apiTarget = `http://${apiTarget}`;
  }

  let apiUrl: URL;
  try {
    apiUrl = new URL(apiTarget);
  } catch {
    apiUrl = new URL("http://localhost:8000");
    apiTarget = "http://localhost:8000";
  }

  const wsProtocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
  const wsTarget = env.VITE_WS_URL?.trim() || `${wsProtocol}//${apiUrl.host}`;

  return { apiTarget, wsTarget };
}

export default defineConfig(({ mode }) => {
  const { apiTarget, wsTarget } = getProxyTargets(mode);

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
    server: {
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
        },
        "/ws": {
          target: wsTarget,
          ws: true,
          changeOrigin: true,
        },
      },
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
      css: true,
    },
  };
});
