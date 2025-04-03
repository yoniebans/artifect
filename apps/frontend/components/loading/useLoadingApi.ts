"use client";

import { useCallback } from "react";
import { useApiClient } from "@/lib/api-client";
import { useLoading } from "./LoadingContext";
import { useToast } from "@/hooks/use-toast";

export function useLoadingApi() {
    const { fetchApi, isAuthenticated, isLoading: isAuthLoading, userId } = useApiClient();
    const { setLoading, setLoadingMessage } = useLoading();
    const { toast } = useToast();

    // Enhanced version of fetchApi that displays loading overlay with optional minimum duration
    const fetchWithLoading = useCallback(
        async <T,>(
            endpoint: string,
            method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
            body?: Record<string, unknown>,
            additionalHeaders?: Record<string, string>,
            loadingMessage = "Loading...",
            showLoadingOverlay = true,
            minLoadTime = 0 // New parameter for minimum loading time in ms
        ): Promise<T> => {
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

                // Show error toast if it's a significant failure
                toast({
                    title: "Error",
                    description: error instanceof Error ? error.message : "An unexpected error occurred",
                    variant: "destructive",
                });

                throw error;
            } finally {
                if (showLoadingOverlay) {
                    setLoading(false);
                }
            }
        },
        [fetchApi, setLoading, setLoadingMessage, toast]
    );

    return {
        fetchWithLoading,
        isAuthenticated,
        isAuthLoading,
        userId,
    };
}