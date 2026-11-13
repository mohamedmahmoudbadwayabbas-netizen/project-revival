// @lovable.dev/vite-tanstack-config already includes the core TanStack/Lovable plugins.
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    server: { entry: "server" },
  },
  vite: {
    plugins: [mcpPlugin()],
    server: {
      host: "0.0.0.0",
      port: 3000,
      allowedHosts: true,
    },
    optimizeDeps: {
      include: ["cmdk", "@radix-ui/react-alert-dialog", "xlsx"],
    },
  },
});
