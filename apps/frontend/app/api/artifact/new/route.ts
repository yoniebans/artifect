import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { config } from '@/lib/config'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        // Extract AI provider and model from headers
        const aiProvider = request.headers.get('X-AI-Provider')
        const aiModel = request.headers.get('X-AI-Model')

        const response = await fetch(
            config.getBackendUrl('/artifact/new'),
            config.getPostRequestOptions(body, {
                'X-AI-Provider': aiProvider || '',
                'X-AI-Model': aiModel || '',
            })
        );

        if (!response.ok) {
            throw new Error('Failed to create artifact')
        }

        const data = await response.json()
        return NextResponse.json(data)
    } catch (error) {
        console.error('Error creating artifact:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}