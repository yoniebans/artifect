"use client";

import React from "react";
import { useLoading } from "./LoadingContext";

export const LoadingOverlay = () => {
  const { isLoading, loadingMessage } = useLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center transition-opacity duration-300">
      <div className="h-16 w-16 relative">
        <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
        <div className="absolute inset-2 rounded-full border-4 border-t-transparent border-r-primary border-b-transparent border-l-transparent animate-spin animation-delay-150"></div>
        <div className="absolute inset-4 rounded-full border-4 border-t-transparent border-r-transparent border-b-primary border-l-transparent animate-spin animation-delay-300"></div>
      </div>
      <div className="mt-4 text-foreground font-medium">
        {loadingMessage || "Loading..."}
      </div>
    </div>
  );
};
