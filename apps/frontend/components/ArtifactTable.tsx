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

// Generate colors dynamically from the artifact type name
// This avoids hardcoding specific artifact types
const getArtifactTypeColor = (typeName: string): string => {
  // Create a deterministic hash from the type name
  const hash = Array.from(typeName).reduce(
    (acc, char) => char.charCodeAt(0) + ((acc << 5) - acc),
    0
  );

  // Use the hash to select from a list of nice colors
  const colors = [
    "bg-purple-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-red-500",
    "bg-indigo-500",
    "bg-pink-500",
    "bg-emerald-500",
    "bg-sky-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-violet-500",
    "bg-cyan-500",
    "bg-orange-500",
    "bg-lime-500",
    "bg-fuchsia-500",
  ];

  return colors[Math.abs(hash) % colors.length];
};

interface ArtifactTableProps {
  phase: Phase;
  isDisabled: boolean;
  projectTypeName?: string;
  onEditArtifact: (artifact: Artifact) => void;
  onStartArtifact: (artifact: Artifact) => void;
  onApproveArtifact: (artifact: Artifact) => void;
  onAddArtifact: (newArtifact: Artifact) => void;
  onUpdateArtifact: (updatedArtifact: Artifact) => void;
}

export function ArtifactTable({
  phase,
  isDisabled,
  projectTypeName,
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
    // First, find artifacts in this phase that don't have IDs yet (stubs)
    const stubArtifacts = phase.artifacts.filter((a) => !a.artifact_id);

    // If we have a stub, use its type
    if (stubArtifacts.length > 0) {
      const stub = stubArtifacts[0];

      // Create an empty stub artifact with just the phase information
      const newArtifact: Artifact = {
        artifact_id: "",
        artifact_type_id: "",
        artifact_type_name: "",
        artifact_version_number: "",
        artifact_version_content: "",
        name: "",
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

      // Let the parent component fill in the appropriate artifact type details
      onAddArtifact(newArtifact);

      toast({
        title: "Adding Artifact",
        description: `New artifact will be added to ${phase.name} phase.`,
      });
    }
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

  // Determine if we can add more artifacts to this phase
  // This uses a more generic approach without hardcoding specific artifact types
  const canAddMoreArtifacts = (): boolean => {
    // Get the count of non-empty artifacts
    const realArtifactsCount = phase.artifacts.filter(
      (a) => a.artifact_id
    ).length;

    // If no real artifacts, we can always add
    if (realArtifactsCount === 0) return true;

    // Check if there are any artifacts that have repeatable types
    // We'll use a heuristic - if an artifact type appears more than once,
    // it's probably repeatable
    const artifactTypeCounts = phase.artifacts.reduce(
      (counts: { [key: string]: number }, artifact) => {
        const typeName = artifact.artifact_type_name;
        counts[typeName] = (counts[typeName] || 0) + 1;
        return counts;
      },
      {}
    );

    // If any type appears more than once already, assume it's repeatable
    const hasRepeatableTypes = Object.values(artifactTypeCounts).some(
      (count) => count > 1
    );
    if (hasRepeatableTypes) return true;

    // As a fallback, check if all existing artifacts are approved
    return phase.artifacts.every(
      (artifact) => artifact.state_name === "Approved"
    );
  };

  return (
    <>
      <div
        className={`space-y-4 ${
          isDisabled ? "opacity-50 pointer-events-none" : ""
        } transition-opacity duration-300`}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">{phase.name}</h2>
          <Button
            variant="outline"
            disabled={
              isDisabled || (isAddArtifactDisabled && !canAddMoreArtifacts())
            }
            onClick={handleAddArtifact}
            className="transition-all duration-300 hover:shadow-md"
          >
            <Plus className="mr-2 h-4 w-4" /> Artifact
          </Button>
        </div>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Artifact</TableHead>
                <TableHead className="w-[120px] text-center">Status</TableHead>
                <TableHead className="w-[200px] text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {phase.artifacts.map((artifact, index) => {
                const isEditing = editingArtifact === artifact.artifact_id;
                const hasContent = !!artifact.artifact_version_content?.trim();

                return (
                  <TableRow
                    key={artifact.artifact_id || artifact.artifact_type_id}
                    className={`transition-colors duration-200 ${
                      index % 2 === 0 ? "bg-muted/40" : ""
                    }`}
                  >
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Badge
                          className={`${getArtifactTypeColor(
                            artifact.artifact_type_name
                          )} text-white transition-all duration-200`}
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
                            } transition-colors duration-200`}
                            onClick={() => handleNameClick(artifact)}
                          >
                            {artifact.name ||
                              `New ${artifact.artifact_type_name}`}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center w-[120px] whitespace-nowrap">
                      <Badge
                        className={`transition-all duration-300 ${
                          artifact.state_name === "Approved"
                            ? "bg-green-500"
                            : artifact.state_name === "In Progress"
                            ? "bg-blue-500"
                            : "bg-gray-500"
                        } text-white`}
                      >
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
                            className="transition-all duration-200 hover:bg-primary hover:text-primary-foreground"
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
                                className="transition-all duration-200 hover:bg-green-500 hover:text-white"
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
                              className="transition-all duration-200 hover:bg-blue-500 hover:text-white"
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
                            className="transition-all duration-200 hover:bg-blue-500 hover:text-white"
                          >
                            Edit
                          </Button>
                        )}
                        {hasContent && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setPreviewArtifact(artifact)}
                            className="transition-all duration-200 hover:bg-accent"
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
