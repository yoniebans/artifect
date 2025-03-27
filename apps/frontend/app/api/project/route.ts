import { NextRequest } from 'next/server';
import { makeAuthenticatedRequest } from '@/lib/api';

export async function GET(request: NextRequest) {
    return makeAuthenticatedRequest(request, '/project');
}