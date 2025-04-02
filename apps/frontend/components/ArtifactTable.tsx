"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Maximize2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FullscreenPreview } from "@/components/FullscreenPreview";
import { IArtifact as Artifact, IPhase as Phase } from "@artifect/shared";

const artifactTypeColors: { [key: string]: string } = {
  "Vision Document": "bg-purple-500",
  "Functional Requirements": "bg-blue-500",
  "Non-Functional Requirements": "bg-green-500",
  "Use Cases": "bg-yellow-500",
  "C4 Context": "bg-red-500",
  "C4 Container": "bg-indigo-500",
  "C4 Component": "bg-pink-500",
};

interface ArtifactTableProps {
  phase: Phase;
  isDisabled: boolean;
  onEditArtifact: (artifact: Artifact) => void;
  onStartArtifact: (artifact: Artifact) => void;
  onApproveArtifact: (artifact: Artifact) => void;
  onAddArtifact: (newArtifact: Artifact) => void;
  onUpdateArtifact: (updatedArtifact: Artifact) => void;
}

export function ArtifactTable({
  phase,
  isDisabled,
  onEditArtifact,
  onStartArtifact,
  onApproveArtifact,
  onAddArtifact,
  onUpdateArtifact,
}: ArtifactTableProps) {
  const [editingArtifact, setEditingArtifact] = useState<string | null>(null);
  const [editedName, setEditedName] = useState("");
  const [previewArtifact, setPreviewArtifact] = useState<Artifact | null>(null);
  const { toast } = useToast();

  const isArtifactDisabled = (artifact: Artifact): boolean => {
    if (!artifact.dependent_type_id) return false;

    const dependentArtifact = phase.artifacts.find(
      (a) => a.artifact_type_id === artifact.dependent_type_id
    );

    return !dependentArtifact || dependentArtifact.state_name !== "Approved";
  };

  const handleAddArtifact = () => {
    let newArtifactTypeName = "";
    let newArtifactTypeId = "";
    if (phase.name === "Requirements") {
      newArtifactTypeName = "Use Cases";
      newArtifactTypeId = "4";
    } else if (phase.name === "Design") {
      newArtifactTypeName = "C4 Component";
      newArtifactTypeId = "7";
    } else {
      toast({
        title: "Error",
        description: "Invalid phase for adding artifact",
        variant: "destructive",
      });
      return;
    }

    const newArtifact: Artifact = {
      artifact_id: "",
      artifact_type_id: newArtifactTypeId,
      artifact_type_name: newArtifactTypeName,
      artifact_version_number: "",
      artifact_version_content: "",
      name: `New ${newArtifactTypeName}`,
      dependent_type_id: null,
      state_id: "1",
      state_name: "To Do",
      available_transitions: [
        {
          state_id: "2",
          state_name: "In Progress",
        },
      ],
    };

    onAddArtifact(newArtifact);
    toast({
      title: "Success",
      description: `New ${newArtifactTypeName} artifact added.`,
    });
  };

  const handleNameClick = (artifact: Artifact) => {
    if (!artifact.artifact_id) return;

    setEditingArtifact(artifact.artifact_id);
    setEditedName(artifact.name || `New ${artifact.artifact_type_name}`);
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEditedName(event.target.value);
  };

  const handleNameSubmit = async (artifact: Artifact) => {
    if (!artifact.artifact_id || editedName.trim() === "") return;

    const originalName = artifact.name || `New ${artifact.artifact_type_name}`;

    if (editedName.trim() === originalName) {
      setEditingArtifact(null);
      return;
    }

    try {
      const response = await fetch(`/api/artifact/${artifact.artifact_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: editedName }),
      });

      if (!response.ok) {
        throw new Error("Failed to update artifact name");
      }

      const updatedArtifact = await response.json();

      onUpdateArtifact(updatedArtifact);

      toast({
        title: "Success",
        description: "Artifact name updated successfully.",
      });
    } catch (error) {
      console.error("Error updating artifact name:", error);
      setEditedName(originalName);
      toast({
        title: "Error",
        description: "Failed to update artifact name. Please try again.",
        variant: "destructive",
      });
    }

    setEditingArtifact(null);
  };

  const isAddArtifactDisabled = !phase.artifacts.every(
    (artifact) => artifact.state_name === "Approved"
  );

  return (
    <>
      <div
        className={`space-y-4 ${
          isDisabled ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">{phase.name}</h2>
          <Button
            variant="outline"
            disabled={isDisabled || isAddArtifactDisabled}
            onClick={handleAddArtifact}
          >
            <Plus className="mr-2 h-4 w-4" /> Artifact
          </Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Artifact</TableHead>
                <TableHead className="w-[120px] text-center">Status</TableHead>
                <TableHead className="w-[200px] text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {phase.artifacts.map((artifact) => {
                const isEditing = editingArtifact === artifact.artifact_id;
                const hasContent = !!artifact.artifact_version_content?.trim();

                return (
                  <TableRow
                    key={artifact.artifact_id || artifact.artifact_type_id}
                  >
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Badge
                          className={`${
                            artifactTypeColors[artifact.artifact_type_name] ||
                            "bg-gray-500"
                          } text-white`}
                        >
                          {artifact.artifact_type_name}
                        </Badge>
                        {isEditing ? (
                          <Input
                            value={editedName}
                            onChange={handleNameChange}
                            onBlur={() => handleNameSubmit(artifact)}
                            onKeyPress={(e) => {
                              if (e.key === "Enter") {
                                handleNameSubmit(artifact);
                              }
                            }}
                            className="w-full"
                            autoFocus
                          />
                        ) : (
                          <span
                            className={`${
                              artifact.artifact_id
                                ? "cursor-pointer hover:underline"
                                : "cursor-not-allowed"
                            }`}
                            onClick={() => handleNameClick(artifact)}
                          >
                            {artifact.name ||
                              `New ${artifact.artifact_type_name}`}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center w-[120px] whitespace-nowrap">
                      <Badge className="bg-gray-500 text-white">
                        {artifact.state_name || "Not Started"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      <div className="flex justify-center items-center space-x-2">
                        {(!artifact.artifact_id ||
                          artifact.state_name === "To Do") && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={
                              isDisabled || isArtifactDisabled(artifact)
                            }
                            onClick={() => onStartArtifact(artifact)}
                          >
                            Start
                          </Button>
                        )}
                        {artifact.state_name === "In Progress" && (
                          <>
                            {hasContent && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={
                                  isDisabled || isArtifactDisabled(artifact)
                                }
                                onClick={() => onApproveArtifact(artifact)}
                              >
                                Approve
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={
                                isDisabled || isArtifactDisabled(artifact)
                              }
                              onClick={() => onEditArtifact(artifact)}
                            >
                              Edit
                            </Button>
                          </>
                        )}
                        {artifact.state_name === "Approved" && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isDisabled}
                            onClick={() => onEditArtifact(artifact)}
                          >
                            Edit
                          </Button>
                        )}
                        {hasContent && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setPreviewArtifact(artifact)}
                          >
                            <Maximize2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {previewArtifact && (
        <FullscreenPreview
          content={previewArtifact.artifact_version_content || ""}
          contentType={previewArtifact.artifact_type_name}
          onClose={() => setPreviewArtifact(null)}
        />
      )}
    </>
  );
}
