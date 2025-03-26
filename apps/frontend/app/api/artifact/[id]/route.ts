import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { config } from '@/lib/config'

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const artifactId = params.id;
        const response = await fetch(
            config.getBackendUrl(`/artifact/${artifactId}`),
            config.getGetRequestOptions()
        );
        if (!response.ok) {
            throw new Error('Failed to fetch artifact details');
        }
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching artifact details:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const artifactId = params.id;
        const body = await request.json();
        const { name, content } = body;
        const response = await fetch(
            config.getBackendUrl(`/artifact/${artifactId}`),
            config.getPutRequestOptions({
                name,
                content
            })
        );
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to update artifact');
        }
        const updatedArtifact = await response.json();
        return NextResponse.json(updatedArtifact);
    } catch (error) {
        console.error('Error updating artifact:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 }
        );
    }
}