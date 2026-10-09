import { defineConfig, devices } from "@playwright/test";

/**
 * E2E del asistente clínico: Chromium contra e2e/harness (el MedicalChat real
 * empaquetado con Vite, sin Next ni Supabase). Las respuestas de Graph las
 * pone cada prueba interceptando /api/clinical/assistant/chat.
 * Uso: npm run test:e2e (con los navegadores de Playwright ya instalados).
 */
const PORT = 4179;

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npx vite build --config e2e/vite.config.ts && npx vite preview --config e2e/vite.config.ts",
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
