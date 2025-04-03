"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

// Dynamically import the NavigationProgress component with SSR disabled
const NavigationProgressComponent = dynamic(
  () => import("./NavigationProgress").then((mod) => mod.NavigationProgress),
  { ssr: false }
);

export function ClientNavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressComponent />
    </Suspense>
  );
}
