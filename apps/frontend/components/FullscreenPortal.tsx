"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface FullscreenPortalProps {
  children: React.ReactNode;
}

export function FullscreenPortal({ children }: FullscreenPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Only render the portal on the client side
  if (!mounted) return null;

  // Create a portal to render at the document.body level
  return createPortal(children, document.body);
}
