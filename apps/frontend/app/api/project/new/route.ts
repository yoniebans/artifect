import { NextRequest } from 'next/server';
import { makeAuthenticatedRequest } from '@/lib/api';

export async function POST(request: NextRequest) {
    const body = await request.json();
    return makeAuthenticatedRequest(request, '/project/new', 'POST', body);
}