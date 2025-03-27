// apps/frontend/lib/api.ts

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

/**
 * Helper function to handle authenticated API requests to backend
 */
export async function makeAuthenticatedRequest(
    request: NextRequest,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: Record<string, unknown>
) {
    try {
        // Use Clerk's auth() function to get authentication details
        const { userId, getToken } = auth();

        // If not authenticated, return error
        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Get the token for backend authentication
        const token = await getToken();

        // Prepare request options
        const requestOptions: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        };

        // Add request body if provided (for POST/PUT requests)
        if (body) {
            requestOptions.body = JSON.stringify(body);
        }

        // Add any additional headers from the original request
        const aiProvider = request.headers.get('X-AI-Provider');
        const aiModel = request.headers.get('X-AI-Model');

        if (aiProvider) {
            requestOptions.headers = {
                ...requestOptions.headers,
                'X-AI-Provider': aiProvider,
            };
        }

        if (aiModel) {
            requestOptions.headers = {
                ...requestOptions.headers,
                'X-AI-Model': aiModel,
            };
        }

        // Make the request to the backend
        const response = await fetch(
            config.getBackendUrl(endpoint),
            requestOptions
        );

        // Handle non-successful responses
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return NextResponse.json(
                { error: errorData.message || 'Request failed' },
                { status: response.status }
            );
        }

        // Return the successful response
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error(`Error in authenticated request to ${endpoint}:`, error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 }
        );
    }
}