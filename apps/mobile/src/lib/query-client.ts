import { QueryClient } from "@tanstack/react-query";
import { ApiFetchError } from "./api";

// Single QueryClient for the app. Defaults are tuned for a content
// app where staleness for a minute is fine (no aggressive refetch on
// focus), and 401s shouldn't be retried — apiFetch already handled
// the refresh dance; if it still surfaces 401, the user is signed out.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof ApiFetchError && error.status === 401) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
