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
  selectedModel
}: ArtifactEditorModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (artifact) {
      // Start animation after component mounts
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [artifact]);

  if (!artifact) return null;

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300); // Match the transition duration
  };

  return (
    <div 
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity duration-300"
      style={{ opacity: isVisible ? 1 : 0 }}
    >
      {/* We don't add an extra container here, instead let the ArtifactEditor component provide its own container */}
      <ArtifactEditor
        artifact={artifact}
        initialMessages={initialMessages}
        onClose={handleClose}
        onSave={onSave}
        selectedProvider={selectedProvider}
        selectedModel={selectedModel}
        modalTransitionState={{
          isVisible,
          inTransition: true
        }}
      />
    </div>
  );
}