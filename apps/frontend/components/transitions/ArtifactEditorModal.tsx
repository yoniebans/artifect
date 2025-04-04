"use client";

import React, { useEffect, useState } from "react";
import ArtifactEditor from "@/components/ArtifactEditor";
import { IArtifact as Artifact, IMessage as Message } from "@artifect/shared";

interface ArtifactEditorModalProps {
  artifact: Artifact | null;
  initialMessages: Message[];
  onClose: () => void;
  onSave: (updatedArtifact: Artifact) => void;
  selectedProvider: string;
  selectedModel: string;
}

export function ArtifactEditorModal({
  artifact,
  initialMessages,
  onClose,
  onSave,
  selectedProvider,
  selectedModel,
}: ArtifactEditorModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (artifact) {
      // Start animation after component mounts
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 10);
      // When the modal opens, prevent body scrolling
      document.body.style.overflow = "hidden";
      return () => {
        clearTimeout(timer);
        // Restore scrolling when modal closes
        document.body.style.overflow = "";
      };
    } else {
      setIsVisible(false);
      // Ensure scrolling is restored if the component unmounts without the close handler
      document.body.style.overflow = "";
    }
  }, [artifact]);

  if (!artifact) return null;

  const handleClose = () => {
    setIsVisible(false);
    // Restore scrolling
    document.body.style.overflow = "";
    setTimeout(() => {
      onClose();
    }, 300); // Match the transition duration
  };

  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-start justify-center pt-8 px-4 pb-4 overflow-hidden transition-opacity duration-300"
      style={{ opacity: isVisible ? 1 : 0 }}
    >
      <ArtifactEditor
        artifact={artifact}
        initialMessages={initialMessages}
        onClose={handleClose}
        onSave={onSave}
        selectedProvider={selectedProvider}
        selectedModel={selectedModel}
        modalTransitionState={{
          isVisible,
          inTransition: true,
        }}
      />
    </div>
  );
}
