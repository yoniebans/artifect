// apps/frontend/app/debug/page.tsx

"use client";

import { DebugPanel } from "@/components/DebugPanel";

export default function DebugPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Panel</h1>
      <DebugPanel />
    </div>
  );
}
