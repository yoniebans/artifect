import { NextRequest } from 'next/server';
import { makeAuthenticatedRequest } from '@/lib/api';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return makeAuthenticatedRequest(request, `/project/${params.id}`);
}