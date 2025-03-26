import { NextResponse } from 'next/server'
import { AIProvider } from '@/types/ai-provider'
import { config } from '@/lib/config'

export async function GET() {
    try {
        const response = await fetch(
            config.getBackendUrl('/ai-providers'),
            config.getDefaultRequestOptions()
        );

        if (!response.ok) {
            throw new Error('Failed to fetch AI providers')
        }

        const data: AIProvider[] = await response.json()

        // Validate and transform the data
        const validatedData: AIProvider[] = data.map((provider: AIProvider) => ({
            id: provider.id,
            name: provider.name,
            models: Array.isArray(provider.models) ? provider.models : []
        }))

        return NextResponse.json(validatedData)
    } catch (error) {
        console.error('Error fetching AI providers:', error)
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}