import { NextResponse } from 'next/server'
import { config } from '@/lib/config'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const response = await fetch(
            config.getBackendUrl('/project/new'),
            config.getPostRequestOptions(body)
        );
        if (!response.ok) {
            throw new Error('Failed to create project')
        }
        const data = await response.json()
        return NextResponse.json(data)
    } catch (error) {
        console.error('Error creating project:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}