import { NextResponse } from 'next/server'
import { config } from '@/lib/config'

export async function GET() {
    try {
        const response = await fetch(
            config.getBackendUrl('/project'),
            config.getGetRequestOptions()
        );
        if (!response.ok) {
            throw new Error('Failed to fetch projects')
        }
        const data = await response.json()
        return NextResponse.json(data)
    } catch (error) {
        console.error('Error fetching projects:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}