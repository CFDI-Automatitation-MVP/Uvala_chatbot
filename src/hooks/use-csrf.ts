"use client";

import { useState, useEffect, useCallback } from "react";
import logger from "logger";

interface CSRFTokenData {
  csrfToken: string;
  cookieName: string;
  expires: string;
}

interface UseCSRFReturn {
  token: string | null;
  loading: boolean;
  error: string | null;
  refreshToken: () => Promise<void>;
  getCSRFHeaders: () => Record<string, string>;
}

/**
 * Hook for managing CSRF tokens on the client side
 */
export function useCSRF(): UseCSRFReturn {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCSRFToken = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/csrf-token", {
        method: "GET",
        credentials: "include", // Include cookies
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.status}`);
      }

      const data: CSRFTokenData = await response.json();
      setToken(data.csrfToken);

      // Store token in memory and localStorage as backup
      if (typeof window !== "undefined") {
        localStorage.setItem("csrf-token", data.csrfToken);
        localStorage.setItem("csrf-expires", data.expires);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      logger.error("Failed to fetch CSRF token:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshToken = useCallback(async () => {
    await fetchCSRFToken();
  }, [fetchCSRFToken]);

  const getCSRFHeaders = useCallback(() => {
    if (!token) {
      return {};
    }

    return {
      "x-csrf-token": token,
    };
  }, [token]);

  // Check if stored token is still valid
  const isTokenValid = useCallback(() => {
    if (!token) return false;

    if (typeof window !== "undefined") {
      const expires = localStorage.getItem("csrf-expires");
      if (expires && new Date(expires) < new Date()) {
        return false;
      }
    }

    return true;
  }, [token]);

  useEffect(() => {
    // Try to load token from localStorage first
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("csrf-token");
      const expires = localStorage.getItem("csrf-expires");

      if (storedToken && expires && new Date(expires) > new Date()) {
        setToken(storedToken);
        return;
      }
    }

    // Fetch new token if none stored or expired
    fetchCSRFToken();
  }, [fetchCSRFToken]);

  // Auto-refresh token when it's about to expire
  useEffect(() => {
    if (!token) return;

    const checkTokenExpiry = () => {
      if (!isTokenValid()) {
        fetchCSRFToken();
      }
    };

    // Check every 30 minutes
    const interval = setInterval(checkTokenExpiry, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [token, isTokenValid, fetchCSRFToken]);

  return {
    token,
    loading,
    error,
    refreshToken,
    getCSRFHeaders,
  };
}

/**
 * Helper function to make CSRF-protected API requests
 */
export async function fetchWithCSRF(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  // Get CSRF token from localStorage
  const csrfToken =
    typeof window !== "undefined" ? localStorage.getItem("csrf-token") : null;

  if (!csrfToken) {
    throw new Error("No CSRF token available. Please refresh the page.");
  }

  const headers = new Headers(options.headers);
  headers.set("x-csrf-token", csrfToken);

  return fetch(url, {
    ...options,
    headers,
    credentials: "include", // Always include cookies
  });
}

/**
 * Higher-order function to wrap existing fetch calls with CSRF protection
 */
export function withCSRF<T extends (...args: any[]) => Promise<Response>>(
  _fetchFunction: T,
): T {
  return (async (...args: any[]) => {
    const [url, options = {}] = args;

    return fetchWithCSRF(url, options);
  }) as T;
}
