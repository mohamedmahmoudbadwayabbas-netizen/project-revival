import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes cache - instant 0ms loads
        gcTime: 1000 * 60 * 30, // 30 minutes in memory
        refetchOnWindowFocus: false, // Stop laggy refetches on focus
        refetchOnReconnect: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent", // Preload chunk and data on hover/touch
    defaultPreloadDelay: 30, // 30ms hover intent trigger
    defaultPreloadStaleTime: 1000 * 60 * 5, // 5 minutes preload stale time
    defaultStaleTime: 1000 * 60 * 5,
    defaultGcTime: 1000 * 60 * 30,
  });

  return router;
};
