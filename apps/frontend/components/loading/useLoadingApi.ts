"use client";

import { useCallback, useEffect, useRef } from "react";
import { useApiClient } from "@/lib/api-client";
import { useLoading } from "./LoadingContext";
import { useToast } from "@/hooks/use-toast";

export function useLoadingApi() {
    const { fetchApi, isAuthenticated, isLoading: isAuthLoading, userId, hasBackendAuthFailed } = useApiClient();
    const { setLoading, setLoadingMessage } = useLoading();
    const { toast } = useToast();
    const hasShownBackendErrorToast = useRef(false);

    // Show toast for backend auth errors, but don't redirect automatically
    useEffect(() => {
        if (hasBackendAuthFailed && !hasShownBackendErrorToast.current) {
            hasShownBackendErrorToast.current = true;

            toast({
                title: "Backend Authentication Error",
                description: "There was a problem with your account on our servers. This might happen if your social login didn't provide all required information like an email address.",
                variant: "destructive",
            });
        }
    }, [hasBackendAuthFailed, toast]);

    // Enhanced version of fetchApi that displays loading overlay with optional minimum duration
    const fetchWithLoading = useCallback(
        async <T,>(
            endpoint: string,
            method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
            body?: Record<string, unknown>,
            additionalHeaders?: Record<string, string>,
            loadingMessage = "Loading...",
            showLoadingOverlay = true,
            minLoadTime = 0 // Parameter for minimum loading time in ms
        ): Promise<T> => {
            // Skip the request if we already had an auth failure
            if (hasBackendAuthFailed) {
                throw new Error("Backend authentication failed. Please try signing in again.");
            }

            const startTime = Date.now();

            try {
                if (showLoadingOverlay) {
                    setLoadingMessage(loadingMessage);
                    setLoading(true);
                }

                // Make the API request
                const result = await fetchApi(endpoint, method, body, additionalHeaders);

                // If we need to ensure a minimum loading time
                if (showLoadingOverlay && minLoadTime > 0) {
                    const elapsed = Date.now() - startTime;
                    const remainingTime = Math.max(0, minLoadTime - elapsed);

                    if (remainingTime > 0) {
                        // Wait for the remaining time to reach the minimum
                        await new Promise(resolve => setTimeout(resolve, remainingTime));
                    }
                }

                return result;
            } catch (error) {
                console.error(`Error in API request to ${endpoint}:`, error);

                const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";

                // Don't show duplicate backend auth errors
                if (!hasBackendAuthFailed && !errorMessage.includes("Backend authentication")) {
                    // Show error toast if it's a significant failure
                    toast({
                        title: "Error",
                        description: errorMessage,
                        variant: "destructive",
                    });
                }

                throw error;
            } finally {
                if (showLoadingOverlay) {
                    setLoading(false);
                }
            }
        },
        [fetchApi, setLoading, setLoadingMessage, toast, hasBackendAuthFailed]
    );

    return {
        fetchWithLoading,
        isAuthenticated,
        isAuthLoading,
        userId,
        hasBackendAuthFailed,
    };
}