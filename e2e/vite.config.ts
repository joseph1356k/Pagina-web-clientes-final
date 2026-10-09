import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

/**
 * Empaqueta e2e/harness (el MedicalChat real sin Next, Supabase ni Graph) para
 * la prueba de Playwright. La API apunta al mismo origen de la página, así que
 * Playwright intercepta /api/clinical/assistant/chat sin CORS.
 */
const E2E_PORT = 4179;
const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));
const repoRoot = here("../");

export default defineConfig({
  root: here("./harness"),
  resolve: {
    alias: [
      { find: "@/lib/supabase/client", replacement: here("./harness/stubs/supabase-client.ts") },
      { find: "next/navigation", replacement: here("./harness/stubs/next-navigation.ts") },
      { find: /^@\/(.*)$/, replacement: `${repoRoot}$1` },
    ],
  },
  define: {
    "process.env.NEXT_PUBLIC_API_BASE_URL": JSON.stringify(`http://127.0.0.1:${E2E_PORT}`),
  },
  build: { outDir: here("./.dist"), emptyOutDir: true },
  preview: { host: "127.0.0.1", port: E2E_PORT, strictPort: true },
});
