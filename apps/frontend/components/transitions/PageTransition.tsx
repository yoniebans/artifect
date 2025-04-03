"use client";

import React, { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Start animation after component mounts
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 10);

    return () => clearTimeout(timer);
  }, []);

  // Listen for navigation events
  useEffect(() => {
    const handleRouteChangeStart = () => {
      setIsVisible(false);
    };

    // Note: This is a workaround since App Router doesn't have the same events as Pages Router
    // In a production app, you might want to use a proper solution for App Router
    window.addEventListener("beforeunload", handleRouteChangeStart);

    return () => {
      window.removeEventListener("beforeunload", handleRouteChangeStart);
    };
  }, [router]);

  return (
    <div
      className={`min-h-screen transition-all duration-300 ease-in-out ${
        isVisible
          ? "opacity-100 transform translate-y-0"
          : "opacity-0 transform translate-y-4"
      }`}
    >
      {children}
    </div>
  );
}