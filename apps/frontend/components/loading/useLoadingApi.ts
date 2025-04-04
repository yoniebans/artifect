"use client";

import { useCallback, useEffect } from "react";
import { useApiClient } from "@/lib/api-client";
import { useLoading } from "./LoadingContext";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export function useLoadingApi() {
    const { fetchApi, isAuthenticated, isLoading: isAuthLoading, userId, hasAuthFailed } = useApiClient();
    const { setLoading, setLoadingMessage } = useLoading();
    const { toast } = useToast();
    const router = useRouter();

    // Show a toast and redirect once when auth fails
    useEffect(() => {
        if (hasAuthFailed) {
            // Show auth error toast only once
            toast({
                title: "Authentication Error",
                description: "There was a problem with your account. Please sign in again.",
                variant: "destructive",
            });

            // Redirect to sign-in page after a short delay
            setTimeout(() => {
                router.push("/sign-in?error=auth_failed");
            }, 500);
        }
    }, [hasAuthFailed, toast, router]);

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
            // Skip the request if we already had an auth failure
            if (hasAuthFailed) {
                throw new Error("Authentication failed. Please sign in again.");
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

                // Only show non-auth errors (auth errors are handled in the useEffect)
                if (!hasAuthFailed && !errorMessage.includes("Authentication") &&
                    !errorMessage.includes("auth")) {
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
        [fetchApi, setLoading, setLoadingMessage, toast, hasAuthFailed]
    );

    return {
        fetchWithLoading,
        isAuthenticated,
        isAuthLoading,
        userId,
        hasAuthFailed,
    };
}