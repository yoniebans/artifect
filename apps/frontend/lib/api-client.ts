'use client';

import { useCallback, useState } from 'react';
import { useAuth } from '@clerk/nextjs';

// Rename global auth failure to be more specific about backend errors
let globalBackendAuthFailure = false;

// Base URL for the backend - DIRECT CONNECTION TO BACKEND
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// Track ongoing requests to prevent duplicates
const ongoingRequests = new Map<string, Promise<unknown>>();

/**
 * Hook that provides an authenticated API client for direct backend requests
 */
export function useApiClient() {
    const { getToken, userId, isLoaded, isSignedIn } = useAuth();
    // Track backend auth failures separately from Clerk auth state
    const [backendAuthFailed, setBackendAuthFailed] = useState(globalBackendAuthFailure);

    /**
     * Make a direct authenticated request to the backend API
     */
    const fetchApi = useCallback(async (
        endpoint: string,
        method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
        body?: Record<string, unknown>,
        additionalHeaders?: Record<string, string>
    ) => {
        // If we already detected a backend auth failure globally, fail immediately
        if (globalBackendAuthFailure) {
            setBackendAuthFailed(true);
            throw new Error("Backend authentication failed. Please try signing in again.");
        }

        // Wait until Clerk auth is loaded
        if (!isLoaded) {
            throw new Error('Auth not loaded yet');
        }

        // Check Clerk authentication
        if (!isSignedIn || !userId) {
            throw new Error('User not authenticated with Clerk');
        }

        try {
            // Normalize the endpoint
            const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

            // Create a request key to track duplicate requests
            const requestKey = `${method}:${normalizedEndpoint}:${JSON.stringify(body || {})}`;

            // If there's an ongoing request with this key, return its promise
            if (method === 'GET' && ongoingRequests.has(requestKey)) {
                return ongoingRequests.get(requestKey);
            }

            // Get token for authentication
            const token = await getToken();
            if (!token) {
                throw new Error('No Clerk authentication token available');
            }

            // Set up request options
            const requestOptions: RequestInit = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    ...additionalHeaders
                },
            };

            // Add body for POST/PUT requests
            if (body && (method === 'POST' || method === 'PUT')) {
                requestOptions.body = JSON.stringify(body);
            }

            // Direct request to the backend
            const fullUrl = `${API_BASE_URL}${normalizedEndpoint}`;

            // Create the request promise
            const requestPromise = (async () => {
                try {
                    console.log(`Making request to: ${fullUrl}`);
                    const response = await fetch(fullUrl, requestOptions);

                    if (!response.ok) {
                        // Special handling for 401 Unauthorized errors from backend
                        if (response.status === 401) {
                            console.error("Backend authentication failed - possible user creation error");
                            globalBackendAuthFailure = true; // Set global flag
                            setBackendAuthFailed(true);
                            throw new Error("Backend authentication failed. This might happen if your social login didn't provide required information.");
                        }

                        const errorData = await response.json().catch(() => ({
                            message: `Failed with status: ${response.status}`
                        }));
                        console.error(`API request failed: ${fullUrl}`, errorData);
                        throw new Error(errorData.message || `Request failed with status ${response.status}`);
                    }

                    return await response.json();
                } finally {
                    // Remove from ongoing requests when done
                    ongoingRequests.delete(requestKey);
                }
            })();

            // Store the promise for GET requests
            if (method === 'GET') {
                ongoingRequests.set(requestKey, requestPromise);
            }

            return requestPromise;
        } catch (error) {
            console.error(`Error in API request to ${endpoint}:`, error);
            throw error;
        }
    }, [getToken, userId, isLoaded, isSignedIn]); // Properly memoize with dependencies

    // Return backend auth status separately from Clerk auth status
    return {
        fetchApi,
        isAuthenticated: isSignedIn && !!userId && !backendAuthFailed,
        isLoading: !isLoaded,
        userId,
        hasBackendAuthFailed: backendAuthFailed
    };
}

// Add a reset function that can be called when the user signs in again
export function resetBackendAuthFailure() {
    globalBackendAuthFailure = false;
}