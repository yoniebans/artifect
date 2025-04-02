// components/FullscreenPreview.tsx
"use client";

import { useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";

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
        mermaid.initialize({ startOnLoad: true });
        mermaid.run({ nodes: [mermaidRef.current] }).then(() => {
          if (mermaidRef.current) {
            mermaidRef.current.classList.remove("opacity-0");
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

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className={`relative bg-background border rounded-lg shadow-lg w-full ${
          isMermaid ? "max-w-[95vw]" : "max-w-5xl"
        } h-[90vh] flex flex-col`}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute right-4 top-4 h-8 w-8 rounded-full bg-background/95 shadow-md hover:bg-accent"
          aria-label="Close fullscreen"
        >
          <X className="h-4 w-4" />
        </Button>
        <div
          className={`flex-1 overflow-y-auto ${
            isMermaid ? "p-2 justify-center" : "p-8"
          }`}
        >
          <div
            className={isMermaid ? "justify-center h-full" : "markdown-preview"}
          >
            {renderPreview()}
          </div>
        </div>
      </div>
    </div>
  );
}
