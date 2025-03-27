import { NextRequest } from 'next/server';
import { makeAuthenticatedRequest } from '@/lib/api';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  return makeAuthenticatedRequest(request, `/artifact/${params.id}/ai`, 'PUT', body);
}
