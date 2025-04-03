"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";
import { ImageIcon, SunIcon } from "@radix-ui/react-icons";
import { Maximize2, Save } from "lucide-react";
import { FullscreenPreview } from "@/components/FullscreenPreview";
import { useApiClient } from "@/lib/api-client";
import { IArtifact as Artifact, IMessage as Message } from "@artifect/shared";
interface ArtifactEditorProps {
  artifact: Artifact;
  initialMessages: Message[];
  onClose: () => void;
  onSave: (updatedArtifact: Artifact) => void;
  selectedProvider: string;
  selectedModel: string;
}

export default function Component({
  artifact,
  initialMessages = [],
  onClose,
  onSave,
  selectedProvider,
  selectedModel,
}: ArtifactEditorProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [currentArtifact, setCurrentArtifact] = useState<Artifact>(artifact);
  const [originalContent, setOriginalContent] = useState(
    artifact.artifact_version_content
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState("preview");
  const [loadingDots, setLoadingDots] = useState(".");
  const mermaidRef = useRef<HTMLDivElement>(null);
  const { fetchApi } = useApiClient();

  const hasChanges = useCallback(() => {
    return currentArtifact.artifact_version_content !== originalContent;
  }, [currentArtifact.artifact_version_content, originalContent]);

  const handleSave = async () => {
    if (!currentArtifact.artifact_version_content?.trim()) {
      toast({
        title: "Error",
        description: "Content cannot be empty",
        variant: "destructive",
      });
      return;
    }

    if (!hasChanges()) {
      toast({
        title: "No changes",
        description: "No changes have been made to save",
      });
      return;
    }

    setIsSaving(true);
    try {
      const updatedArtifact = await fetchApi(
        `/artifact/${currentArtifact.artifact_id}`,
        "PUT",
        {
          name: currentArtifact.name,
          content: currentArtifact.artifact_version_content,
        }
      );

      setCurrentArtifact(updatedArtifact);
      setOriginalContent(updatedArtifact.artifact_version_content);
      onSave(updatedArtifact);

      toast({
        title: "Success",
        description: "Changes saved successfully",
      });
    } catch (error) {
      console.error("Error saving artifact:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save changes",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingDots((prev) => (prev.length >= 3 ? "." : prev + "."));
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSendMessage = async () => {
    if (input.trim()) {
      const newMessage: Message = { role: "user", content: input };
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      setInput("");
      setIsLoading(true);

      try {
        const data = await fetchApi(
          `/artifact/${currentArtifact.artifact_id}/ai`,
          "PUT",
          {
            messages: [newMessage],
          },
          {
            "X-AI-Provider": selectedProvider,
            "X-AI-Model": selectedModel,
          }
        );

        setCurrentArtifact(data.artifact);
        setOriginalContent(data.artifact.artifact_version_content);
        onSave(data.artifact);
        setMessages((prevMessages) => [
          ...prevMessages,
          ...data.chat_completion.messages.filter(
            (msg: Message) => msg.role === "assistant"
          ),
        ]);
      } catch (error) {
        console.error("Error in AI interaction:", error);
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            role: "assistant",
            content: "Sorry, there was an error processing your request.",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const renderMermaid = useCallback(
    (content: string) => {
      if (!content?.trim() || activeTab !== "preview") return null;

      const div = (
        <div
          ref={mermaidRef}
          key={`mermaid-preview-${activeTab}`}
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
    },
    [activeTab]
  );

  const renderPreview = () => {
    const content = currentArtifact.artifact_version_content;
    if (!content?.trim()) return null;

    if (currentArtifact.artifact_type_name.toLowerCase().includes("c4")) {
      return renderMermaid(content);
    } else {
      return (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      );
    }
  };

  const renderMessage = (message: Message) => {
    return message.content.split("\n").map((line, index) => (
      <p key={index} className={index > 0 ? "mt-2" : ""}>
        {line}
      </p>
    ));
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border rounded-lg shadow-lg w-full max-w-6xl h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-2xl font-bold">
            Artifact Editor - {currentArtifact.name}
          </h2>
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={
                !currentArtifact.artifact_version_content?.trim() ||
                !hasChanges() ||
                isSaving
              }
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
        <div className="flex flex-1 min-h-0">
          <div className="w-1/2 border-r flex flex-col">
            <div className="flex-1 overflow-y-auto">
              {messages.map((message, index) => (
                <div key={index} className="flex items-start space-x-3 p-4">
                  <Avatar className="w-8 h-8">
                    {message.role === "user" ? (
                      <AvatarFallback>
                        <ImageIcon className="w-4 h-4" />
                      </AvatarFallback>
                    ) : (
                      <AvatarFallback>
                        <SunIcon className="w-4 h-4" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 text-sm">{renderMessage(message)}</div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t flex items-end space-x-4">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message here..."
                className="flex-1 min-h-[80px] text-sm"
                disabled={isLoading}
              />
              <Button
                onClick={handleSendMessage}
                className="mb-1 w-24"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <span>Thinking</span>
                    <span className="w-4 text-left">{loadingDots}</span>
                  </span>
                ) : (
                  "Send"
                )}
              </Button>
            </div>
          </div>
          <div className="w-1/2 flex flex-col min-h-0">
            <Tabs
              value={activeTab}
              className="flex-1 flex flex-col min-h-0"
              onValueChange={setActiveTab}
            >
              <TabsList className="justify-end bg-transparent border-b">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsFullscreen(true)}
                  disabled={!currentArtifact.artifact_version_content?.trim()}
                  className="mr-2"
                  aria-label="Enter fullscreen"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
                <TabsTrigger
                  value="preview"
                  className="bg-transparent data-[state=active]:bg-transparent"
                >
                  Preview
                </TabsTrigger>
                <TabsTrigger
                  value="source"
                  className="bg-transparent data-[state=active]:bg-transparent"
                >
                  Source
                </TabsTrigger>
              </TabsList>
              <TabsContent value="preview" className="flex-1 overflow-y-auto">
                <div className="h-full">
                  <div
                    className={
                      currentArtifact.artifact_type_name
                        .toLowerCase()
                        .includes("c4")
                        ? "p-4 h-full"
                        : "markdown-preview p-4"
                    }
                  >
                    {renderPreview()}
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="source" className="flex-1 overflow-y-auto">
                <Textarea
                  value={currentArtifact.artifact_version_content}
                  onChange={(e) =>
                    setCurrentArtifact((prev) => ({
                      ...prev,
                      artifact_version_content: e.target.value,
                    }))
                  }
                  className="w-full h-full font-mono p-4 rounded-none border-0 focus:ring-0 resize-none text-sm"
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {isFullscreen && (
        <FullscreenPreview
          content={currentArtifact.artifact_version_content || ""}
          contentType={currentArtifact.artifact_type_name}
          onClose={() => setIsFullscreen(false)}
        />
      )}
    </div>
  );
}
