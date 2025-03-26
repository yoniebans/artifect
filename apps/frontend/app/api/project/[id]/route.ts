import { NextRequest, NextResponse } from "next/server"
import { config } from '@/lib/config'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const response = await fetch(
      config.getBackendUrl(`/project/${params.id}`),
      config.getGetRequestOptions()
    );
    if (!response.ok) {
      throw new Error("Failed to fetch project details");
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching project details:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
