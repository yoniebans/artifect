"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function NavigationProgress() {
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);
  const pathname = usePathname();

  // Reset progress and trigger animation on route change
  useEffect(() => {
    // Start navigation progress
    setIsNavigating(true);
    setProgress(0);

    const timer1 = setTimeout(() => setProgress(30), 100);
    const timer2 = setTimeout(() => setProgress(60), 300);
    const timer3 = setTimeout(() => setProgress(80), 600);

    // Complete the progress and hide the bar
    const timer4 = setTimeout(() => {
      setProgress(100);
      setTimeout(() => setIsNavigating(false), 200); // Wait for fade-out
    }, 800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [pathname]);

  if (!isNavigating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 h-1 z-[100] bg-transparent">
      <div
        className="h-full bg-primary transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress >= 100 ? 0 : 1,
        }}
      />
    </div>
  );
}
