// MCP functionality disabled - stub hook

import useSWR, { SWRConfiguration } from "swr";

export function useMcpList(options?: SWRConfiguration) {
  return useSWR("/api/mcp/list", null, {
    revalidateOnFocus: false,
    errorRetryCount: 0,
    focusThrottleInterval: 1000 * 60 * 5,
    fallbackData: [],
    onSuccess: () => {
      // MCP functionality disabled
    },
    ...options,
  });
}
