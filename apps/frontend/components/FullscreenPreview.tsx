"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";
import { FullscreenPortal } from "./FullscreenPortal";

interface FullscreenPreviewProps {
  content: string;
  contentType: string;
  onClose: () => void;
}

export function FullscreenPreview({
  content = "",
  contentType,
  onClose,
}: FullscreenPreviewProps) {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Start animation after component mounts
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 10);

    // Prevent body scrolling
    document.body.style.overflow = "hidden";

    return () => {
      clearTimeout(timer);
      // Restore scrolling
      document.body.style.overflow = "";
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    // Restore scrolling
    document.body.style.overflow = "";
    setTimeout(() => {
      onClose();
    }, 300); // Match the transition duration
  };

  const renderMarkdown = (content: string) => {
    return <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>;
  };

  const renderMermaid = useCallback((content: string) => {
    const div = (
      <div
        ref={mermaidRef}
        key={`mermaid-fullscreen`}
        className="mermaid flex justify-center opacity-0 transition-opacity duration-200"
      >
        {content}
      </div>
    );

    setTimeout(() => {
      if (mermaidRef.current) {
        mermaid.initialize({
          startOnLoad: true,
          theme: "dark",
          securityLevel: "loose",
        });

        mermaid.run({ nodes: [mermaidRef.current] }).then(() => {
          if (mermaidRef.current) {
            mermaidRef.current.classList.remove("opacity-0");

            // Find and resize SVG elements
            const svgs = mermaidRef.current.querySelectorAll("svg");
            svgs.forEach((svg) => {
              svg.setAttribute("width", "100%");
              svg.setAttribute("height", "auto");
              svg.style.maxWidth = "100%";
            });
          }
        });
      }
    }, 0);

    return div;
  }, []);

  const renderPreview = () => {
    if (!content?.trim()) return null;

    const isMermaid = contentType.toLowerCase().includes("c4");
    if (isMermaid) {
      return renderMermaid(content);
    }
    return renderMarkdown(content);
  };

  const isMermaid = contentType.toLowerCase().includes("c4");

  // Use portal to render the fullscreen preview at the document body level
  return (
    <FullscreenPortal>
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-opacity duration-300"
        style={{ opacity: isVisible ? 1 : 0 }}
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose();
        }}
      >
        <div
          className={`relative bg-background border rounded-lg shadow-lg w-full max-h-[90vh] flex flex-col transition-all duration-300 ${
            isMermaid ? "max-w-[90vw]" : "max-w-4xl"
          }`}
          style={{
            transform: isVisible ? "scale(1)" : "scale(0.98)",
            opacity: isVisible ? 1 : 0,
          }}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="absolute right-4 top-4 h-8 w-8 rounded-full bg-background/95 shadow-md hover:bg-accent transition-colors duration-200 z-10"
            aria-label="Close fullscreen"
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="flex-1 overflow-auto p-6">
            <div
              className={`${
                isMermaid
                  ? "w-full h-full flex justify-center"
                  : "markdown-preview"
              }`}
            >
              {renderPreview()}
            </div>
          </div>
        </div>
      </div>
    </FullscreenPortal>
  );
}
