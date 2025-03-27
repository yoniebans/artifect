'use client';

import { useAuth } from '@clerk/nextjs';

// Base URL for the backend
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

            // Direct request to the backend
            console.log(`Making request to: ${API_BASE_URL}${endpoint}`);
            const response = await fetch(`${API_BASE_URL}${endpoint}`, requestOptions);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error(`API request failed: ${API_BASE_URL}${endpoint}`, errorData);
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