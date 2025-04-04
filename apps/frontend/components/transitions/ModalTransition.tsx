"use client";

import React, { ReactNode, useEffect, useState } from "react";

interface ModalTransitionProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function ModalTransition({
  children,
  isOpen,
  onClose,
  className = "",
}: ModalTransitionProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animation timing
    let timer: NodeJS.Timeout;

    if (isOpen) {
      // Small delay to trigger animation after component is mounted
      timer = setTimeout(() => {
        setIsVisible(true);
      }, 10);
    } else {
      setIsVisible(false);
      // Delay actual unmounting to let the exit animation play
      timer = setTimeout(() => {
        // This will be handled by the parent component's isOpen state
      }, 300);
    }

    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity duration-300"
      style={{ opacity: isVisible ? 1 : 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`bg-background border rounded-lg shadow-lg transition-all duration-300 ${className}`}
        style={{
          transform: isVisible ? "scale(1)" : "scale(0.98)",
          opacity: isVisible ? 1 : 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}
