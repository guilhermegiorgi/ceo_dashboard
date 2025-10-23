import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom", // Usar jsdom para testes de componentes React
    pool: "threads",
    minThreads: 1,
    maxThreads: 1,
    include: [
      "server/**/*.test.ts", 
      "server/**/*.spec.js",
      "src/components/workflow/**/__tests__/*.test.tsx"
    ],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
    coverage: {
      provider: "c8",
      reporter: ["text", "json", "html", "lcov"],
      include: [
        "server/**/*.{ts,js}",
        "src/components/workflow/**/*.{ts,tsx}"
      ],
      exclude: [
        "server/**/*.test.ts",
        "server/**/*.spec.js",
        "server/**/__tests__/**",
        "server/**/__mocks__/**",
        "src/components/workflow/**/__tests__/**"
      ],
      reportsDirectory: "./coverage-backend",
    },
    mockReset: true,
    restoreMocks: true,
    setupFiles: ["./src/components/__tests__/setup.ts"], // Setup para React Testing Library
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@server": path.resolve(__dirname, "./server"),
    },
  },
});
