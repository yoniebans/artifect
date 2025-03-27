'use client';

import { useAuth } from '@clerk/nextjs';

// Base URL for the backend - DIRECT CONNECTION TO BACKEND
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

/**
 * Hook that provides an authenticated API client for direct backend requests
 */
export function useApiClient() {
    const { getToken, userId, isLoaded, isSignedIn } = useAuth();

    /**
     * Make a direct authenticated request to the backend API
     */
    const fetchApi = async (
        endpoint: string,
        method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
        body?: Record<string, unknown>,
        additionalHeaders?: Record<string, string>
    ) => {
        // Wait until auth is loaded
        if (!isLoaded) {
            throw new Error('Auth not loaded yet');
        }

        // Check authentication
        if (!isSignedIn || !userId) {
            throw new Error('User not authenticated');
        }

        try {
            // Get token for authentication
            const token = await getToken();

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

            // Ensure endpoint starts with a slash
            const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

            // Direct request to the backend
            const fullUrl = `${API_BASE_URL}${normalizedEndpoint}`;
            console.log(`Making request to: ${fullUrl}`);
            const response = await fetch(fullUrl, requestOptions);

            if (!response.ok) {
                // Special handling for 401 Unauthorized errors
                if (response.status === 401) {
                    console.error("Authentication failed - token may be expired or invalid");
                    throw new Error("Authentication expired. Please sign in again.");
                }

                const errorData = await response.json().catch(() => ({ message: `Failed with status: ${response.status}` }));
                console.error(`API request failed: ${fullUrl}`, errorData);
                throw new Error(errorData.message || `Request failed with status ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Error in API request to ${endpoint}:`, error);
            throw error;
        }
    };

    return {
        fetchApi,
        isAuthenticated: isSignedIn && !!userId,
        isLoading: !isLoaded,
        userId
    };
}