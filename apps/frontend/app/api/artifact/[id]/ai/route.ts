import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { config } from '@/lib/config';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const artifactId = params.id
    const body = await request.json()
    const aiProvider = request.headers.get('X-AI-Provider')
    const aiModel = request.headers.get('X-AI-Model')

    const response = await fetch(
      config.getBackendUrl(`/artifact/${artifactId}/ai`),
      config.getPutRequestOptions(body, {
        'X-AI-Provider': aiProvider || '',
        'X-AI-Model': aiModel || '',
      })
    );

    if (!response.ok) {
      throw new Error('Failed to update artifact with AI')
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating artifact with AI:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}