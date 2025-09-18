"use client";
import useSWR, { SWRConfiguration } from "swr";
import { handleErrorWithToast } from "ui/shared-toast";
import { fetcher } from "lib/utils";

export function useMcpList(options?: SWRConfiguration) {
  return useSWR("/api/mcp/list", fetcher, {
    revalidateOnFocus: false,
    errorRetryCount: 0,
    focusThrottleInterval: 1000 * 60 * 5,
    fallbackData: [],
    onError: handleErrorWithToast,
    onSuccess: (data) => {
      // MCP functionality has been removed, this hook is kept for backwards compatibility
      // TODO: Remove this hook when MCP references are fully cleaned up
      console.log("MCP list received but functionality is disabled:", data);
    },
    ...options,
  });
}
