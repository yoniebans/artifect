import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { config } from '@/lib/config';

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string; stateId: string } }
) {
    try {
        const { id: artifactId, stateId } = params;
        const response = await fetch(
            config.getBackendUrl(`/artifact/${artifactId}/state/${stateId}`),
            config.getPutRequestOptions({})
        );
        if (!response.ok) {
            throw new Error('Failed to update artifact state');
        }
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error updating artifact state:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}