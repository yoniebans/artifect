import { NextRequest } from 'next/server';
import { makeAuthenticatedRequest } from '@/lib/api';

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string; stateId: string } }
) {
    return makeAuthenticatedRequest(
        request,
        `/artifact/${params.id}/state/${params.stateId}`,
        'PUT'
    );
}