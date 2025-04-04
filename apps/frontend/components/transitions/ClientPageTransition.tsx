"use client";

import dynamic from "next/dynamic";
import { ReactNode, Suspense } from "react";

// Import the PageTransition component without SSR
const PageTransitionComponent = dynamic(
  () => import("./PageTransition").then((mod) => mod.PageTransition),
  { ssr: false }
);

interface ClientPageTransitionProps {
  children: ReactNode;
}

export function ClientPageTransition({ children }: ClientPageTransitionProps) {
  return (
    <Suspense fallback={<div>{children}</div>}>
      <PageTransitionComponent>{children}</PageTransitionComponent>
    </Suspense>
  );
}
