import { useQuery } from "@tanstack/react-query";

import { getPlatformOverview } from "@/lib/api/platform.functions";

export const PLATFORM_OVERVIEW_QUERY_KEY = ["platform", "overview"] as const;

export function usePlatformOverview() {
  return useQuery({
    queryKey: PLATFORM_OVERVIEW_QUERY_KEY,
    queryFn: () => getPlatformOverview(),
    staleTime: 15_000,
  });
}
