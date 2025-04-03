"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArtifactTable } from "@/components/ArtifactTable";
import ArtifactEditor from "@/components/ArtifactEditor";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { downloadArtifacts } from "@/lib/artifact-download-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useApiClient } from "@/lib/api-client";
import {
  IProject as Project,
  IArtifact as Artifact,
  IMessage as Message,
  IPhase as Phase,
  IAIProvider as AIProvider,
} from "@artifect/shared";

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [editingArtifact, setEditingArtifact] = useState<Artifact | null>(null);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const {
    fetchApi,
    isAuthenticated,
    isLoading: isAuthLoading,
  } = useApiClient();

  const [aiProviders, setAIProviders] = useState<AIProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [hasApprovedArtifacts, setHasApprovedArtifacts] = useState(false);

  const fetchProjectDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      const projectData = await fetchApi(`/project/${id}`);
      setProject(projectData);
    } catch (error) {
      console.error("Error fetching project details:", error);
      toast({
        title: "Error",
        description: "Failed to load project details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [id, fetchApi, toast]);

  const fetchAIProviders = useCallback(async () => {
    try {
      const data = await fetchApi("/ai-providers");
      setAIProviders(data);
      if (data.length > 0) {
        setSelectedProvider(data[0].id);
        setSelectedModel(data[0].models[0]);
      }
    } catch (error) {
      console.error("Error fetching AI providers:", error);
      toast({
        title: "Error",
        description: "Failed to load AI providers. Please try again.",
        variant: "destructive",
      });
    }
  }, [fetchApi, toast]);

  useEffect(() => {
    if (!isAuthLoading) {
      if (!isAuthenticated) {
        router.push("/sign-in");
        return;
      }
      fetchProjectDetails();
      fetchAIProviders();
    }
  }, [
    isAuthLoading,
    isAuthenticated,
    router,
    fetchProjectDetails,
    fetchAIProviders,
  ]);

  const handleProviderChange = (providerId: string) => {
    setSelectedProvider(providerId);
    const provider = aiProviders.find((p) => p.id === providerId);
    if (provider && provider.models.length > 0) {
      setSelectedModel(provider.models[0]);
    } else {
      setSelectedModel("");
    }
  };

  const updateExistingArtifact = (updatedArtifact: Artifact) => {
    if (!project || !updatedArtifact.artifact_id) return;

    setProject((prevProject) => {
      if (!prevProject) return null;

      const updatedPhases = prevProject.phases.map((phase) => ({
        ...phase,
        artifacts: phase.artifacts.map((artifact) =>
          artifact.artifact_id === updatedArtifact.artifact_id
            ? { ...artifact, ...updatedArtifact }
            : artifact
        ),
      }));

      return {
        ...prevProject,
        phases: updatedPhases,
      };
    });
  };

  const replaceStubWithRealArtifact = (newArtifact: Artifact) => {
    if (!project) return;

    setProject((prevProject) => {
      if (!prevProject) return null;

      const updatedPhases = prevProject.phases.map((phase) => {
        // Only modify the phase that contains the matching stub
        const stubIndex = phase.artifacts.findIndex(
          (artifact) =>
            !artifact.artifact_id &&
            artifact.artifact_type_id === newArtifact.artifact_type_id
        );

        if (stubIndex === -1) {
          return phase;
        }

        // Create new artifacts array with the replacement at the same index
        const updatedArtifacts = [...phase.artifacts];
        updatedArtifacts[stubIndex] = newArtifact;

        return {
          ...phase,
          artifacts: updatedArtifacts,
        };
      });

      return {
        ...prevProject,
        phases: updatedPhases,
      };
    });
  };

  const createStubArtifactHandler =
    (phase: Phase) => (newStubArtifact: Artifact) => {
      if (!project) return;

      setProject((prevProject) => {
        if (!prevProject) return null;

        return {
          ...prevProject,
          phases: prevProject.phases.map((p) =>
            p.phase_id === phase.phase_id
              ? { ...p, artifacts: [...p.artifacts, newStubArtifact] }
              : p
          ),
        };
      });
    };

  const startArtifact = async (artifact: Artifact) => {
    setIsLoading(true);
    try {
      const data = await fetchApi(
        "/artifact/new",
        "POST",
        {
          project_id: id,
          artifact_type_name: artifact.artifact_type_name,
        },
        {
          "X-AI-Provider": selectedProvider,
          "X-AI-Model": selectedModel,
        }
      );

      // Replace the stub with the newly created artifact
      replaceStubWithRealArtifact(data.artifact);

      // Open the editor for the new artifact
      setEditingArtifact(data.artifact);
      setInitialMessages(data.chat_completion.messages);

      toast({
        title: "Success",
        description: "New artifact created successfully.",
      });
    } catch (error) {
      console.error("Error starting artifact:", error);
      toast({
        title: "Error",
        description: "Failed to start artifact. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const editArtifact = async (artifact: Artifact) => {
    if (!artifact.artifact_id) return;

    setIsLoading(true);
    try {
      const artifactDetail = await fetchApi(
        `/artifact/${artifact.artifact_id}`,
        "GET",
        undefined,
        {
          "X-AI-Provider": selectedProvider,
          "X-AI-Model": selectedModel,
        }
      );

      setEditingArtifact(artifactDetail.artifact);
      setInitialMessages(artifactDetail.chat_completion.messages);
    } catch (error) {
      console.error("Error updating artifact:", error);
      toast({
        title: "Error",
        description: "Failed to update artifact. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const approveArtifact = async (artifact: Artifact) => {
    if (!artifact.artifact_id) return;

    setIsLoading(true);
    try {
      const approvedStateId = artifact.available_transitions.find(
        (transition) => transition.state_name === "Approved"
      )?.state_id;

      if (!approvedStateId) {
        throw new Error("Approved state not found in available transitions");
      }

      const data = await fetchApi(
        `/artifact/${artifact.artifact_id}/state/${approvedStateId}`,
        "PUT"
      );

      updateExistingArtifact(data.artifact);

      toast({
        title: "Success",
        description: "Artifact approved successfully.",
      });
    } catch (error) {
      console.error("Error approving artifact:", error);
      toast({
        title: "Error",
        description: "Failed to approve artifact. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (project) {
      const approvedArtifacts = project.phases.flatMap((phase) =>
        phase.artifacts.filter((artifact) => artifact.state_name === "Approved")
      );
      setHasApprovedArtifacts(approvedArtifacts.length > 0);
    }
  }, [project]);

  const handleDownloadArtifacts = async () => {
    if (!project) return;

    try {
      setIsLoading(true);
      await downloadArtifacts(project.phases);
      toast({
        title: "Success",
        description: "Artifacts downloaded successfully.",
      });
    } catch (error) {
      console.error("Error downloading artifacts:", error);
      toast({
        title: "Error",
        description: "Failed to download artifacts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || isAuthLoading)
    return <div className="text-center p-8">Loading...</div>;
  if (!project) return <div className="text-center p-8">No project found.</div>;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top section with project name and user button */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">
            {project?.name || "Loading..."}
          </h1>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </div>

        {/* AI Provider selection section */}
        <div className="flex items-center justify-between">
          <div className="flex space-x-4">
            <Select
              value={selectedProvider}
              onValueChange={handleProviderChange}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select AI Provider" />
              </SelectTrigger>
              <SelectContent>
                {aiProviders.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select AI Model" />
              </SelectTrigger>
              <SelectContent>
                {aiProviders
                  .find((p) => p.id === selectedProvider)
                  ?.models.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleDownloadArtifacts}
            disabled={!hasApprovedArtifacts}
            variant="secondary"
          >
            Download Artifacts
          </Button>
        </div>

        {/* Artifact tables section */}
        {project?.phases.map((phase, index) => {
          const isPreviousPhaseApproved =
            index === 0 ||
            project.phases[index - 1].artifacts.every(
              (artifact) => artifact.state_name === "Approved"
            );
          return (
            <ArtifactTable
              key={phase.phase_id}
              phase={phase}
              isDisabled={!isPreviousPhaseApproved}
              onEditArtifact={editArtifact}
              onStartArtifact={startArtifact}
              onApproveArtifact={approveArtifact}
              onAddArtifact={createStubArtifactHandler(phase)}
              onUpdateArtifact={updateExistingArtifact}
            />
          );
        })}
      </div>

      {/* Artifact editor modal */}
      {editingArtifact && (
        <ArtifactEditor
          artifact={editingArtifact}
          initialMessages={initialMessages}
          selectedProvider={selectedProvider}
          selectedModel={selectedModel}
          onClose={() => {
            setEditingArtifact(null);
            setInitialMessages([]);
          }}
          onSave={(updatedArtifact) => {
            updateExistingArtifact(updatedArtifact);
            toast({
              title: "Success",
              description: "Artifact updated successfully.",
            });
          }}
        />
      )}
      <Toaster />
    </div>
  );
}
