"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArtifactTable } from "@/components/ArtifactTable";
import { useToast } from "@/hooks/use-toast";
import { downloadArtifacts } from "@/lib/artifact-download-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { useLoadingApi } from "@/components/loading/useLoadingApi";
import { ArtifactEditorModal } from "@/components/transitions/ArtifactEditorModal";
import { ClientPageTransition } from "@/components/transitions/ClientPageTransition";
import {
  IProject as Project,
  IArtifact as Artifact,
  IMessage as Message,
  IPhase as Phase,
  IAIProvider as AIProvider,
  IArtifactEditorResponse,
} from "@artifect/shared";
import { BackendAuthErrorDisplay } from "@/components/BackendAuthDisplay";

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [editingArtifact, setEditingArtifact] = useState<Artifact | null>(null);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const { toast } = useToast();
  const router = useRouter();
  const {
    fetchWithLoading,
    isAuthenticated,
    isAuthLoading,
    hasBackendAuthFailed,
  } = useLoadingApi();
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [aiProviders, setAIProviders] = useState<AIProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [hasApprovedArtifacts, setHasApprovedArtifacts] = useState(false);

  // Use refs to prevent infinite fetch loops
  const providersLoaded = useRef(false);
  const projectLoaded = useRef(false);

  const fetchProjectDetails = useCallback(async () => {
    if (projectLoaded.current || hasBackendAuthFailed) return;

    try {
      setIsInitialLoading(true);

      const projectData = await fetchWithLoading<Project>(
        `/project/${id}`,
        "GET",
        undefined,
        undefined,
        "Loading project details...",
        true,
        1000 // 1-second minimum loading time
      );
      setProject(projectData);
      projectLoaded.current = true;
    } catch (error) {
      console.error("Error fetching project details:", error);
      // Error handling is already done in fetchWithLoading
    } finally {
      setIsInitialLoading(false);
    }
  }, [id, fetchWithLoading, hasBackendAuthFailed]);

  const fetchAIProviders = useCallback(async () => {
    if (providersLoaded.current || hasBackendAuthFailed) return;

    try {
      const data = await fetchWithLoading<AIProvider[]>(
        "/ai-providers",
        "GET",
        undefined,
        undefined,
        "Loading AI providers..."
      );
      setAIProviders(data);
      if (data.length > 0) {
        setSelectedProvider(data[0].id);
        setSelectedModel(data[0].models[0]);
      }
      providersLoaded.current = true;
    } catch (error) {
      console.error("Error fetching AI providers:", error);
      // Error handling is already done in fetchWithLoading
    }
  }, [fetchWithLoading, hasBackendAuthFailed]);

  // Auth check and initial data loading
  useEffect(() => {
    if (!isAuthLoading) {
      if (!isAuthenticated && !hasBackendAuthFailed) {
        router.push("/sign-in");
        return;
      }

      // Only fetch if not already loaded and no backend auth failure
      if (!projectLoaded.current && !hasBackendAuthFailed) {
        fetchProjectDetails();
      }

      if (!providersLoaded.current && !hasBackendAuthFailed) {
        fetchAIProviders();
      }
    }
  }, [
    isAuthLoading,
    isAuthenticated,
    router,
    fetchProjectDetails,
    fetchAIProviders,
    hasBackendAuthFailed,
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
    if (hasBackendAuthFailed) return;

    try {
      const data = await fetchWithLoading<IArtifactEditorResponse>(
        "/artifact/new",
        "POST",
        {
          project_id: id,
          artifact_type_name: artifact.artifact_type_name,
        },
        {
          "X-AI-Provider": selectedProvider,
          "X-AI-Model": selectedModel,
        },
        `Creating ${artifact.artifact_type_name}...`,
        true,
        1000 // 1-second minimum loading time
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
      // Error handling is already done in fetchWithLoading
    }
  };

  const editArtifact = async (artifact: Artifact) => {
    if (!artifact.artifact_id || hasBackendAuthFailed) return;

    try {
      const artifactDetail = await fetchWithLoading<IArtifactEditorResponse>(
        `/artifact/${artifact.artifact_id}`,
        "GET",
        undefined,
        {
          "X-AI-Provider": selectedProvider,
          "X-AI-Model": selectedModel,
        },
        `Loading ${artifact.name}...`,
        true,
        1000 // 1-second minimum loading time
      );

      setEditingArtifact(artifactDetail.artifact);
      setInitialMessages(artifactDetail.chat_completion.messages);
    } catch (error) {
      console.error("Error loading artifact:", error);
      // Error handling is already done in fetchWithLoading
    }
  };

  const approveArtifact = async (artifact: Artifact) => {
    if (!artifact.artifact_id || hasBackendAuthFailed) return;

    try {
      const approvedStateId = artifact.available_transitions.find(
        (transition) => transition.state_name === "Approved"
      )?.state_id;

      if (!approvedStateId) {
        throw new Error("Approved state not found in available transitions");
      }

      const data = await fetchWithLoading<{ artifact: Artifact }>(
        `/artifact/${artifact.artifact_id}/state/${approvedStateId}`,
        "PUT",
        undefined,
        undefined,
        "Approving artifact...",
        true,
        1000 // 1-second minimum loading time
      );

      updateExistingArtifact(data.artifact);

      toast({
        title: "Success",
        description: "Artifact approved successfully.",
      });
    } catch (error) {
      console.error("Error approving artifact:", error);
      // Error handling is already done in fetchWithLoading
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
    if (!project || hasBackendAuthFailed) return;

    try {
      await fetchWithLoading(
        "", // No actual endpoint, just for loading state
        "GET",
        undefined,
        undefined,
        "Preparing download...",
        true,
        1000 // 1-second minimum loading time
      );
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
    }
  };

  // Show backend auth error UI if there's a backend auth failure
  if (hasBackendAuthFailed) {
    return <BackendAuthErrorDisplay />;
  }

  // Don't render if still checking auth or not authenticated
  if (isAuthLoading || !isAuthenticated) {
    return null;
  }

  if (!project && !isInitialLoading) {
    return <div className="text-center p-8 fade-in">No project found.</div>;
  }

  if (isInitialLoading) return null;

  return (
    <ClientPageTransition>
      <div className="min-h-[93vh] bg-background text-foreground p-4 sm:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Top section with project name and user button */}
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold slide-in-right">
              {project?.name || "Loading..."}
            </h1>
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard")}
              >
                Back to Dashboard
              </Button>
            </div>
          </div>

          {/* AI Provider selection section */}
          <div className="flex items-center justify-between slide-in-right animation-delay-150">
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

            // Add staggered animation delay based on index
            const staggerClass = `stagger-item stagger-delay-${index + 1}`;

            return (
              <div key={phase.phase_id} className={staggerClass}>
                <ArtifactTable
                  phase={phase}
                  isDisabled={!isPreviousPhaseApproved}
                  onEditArtifact={editArtifact}
                  onStartArtifact={startArtifact}
                  onApproveArtifact={approveArtifact}
                  onAddArtifact={createStubArtifactHandler(phase)}
                  onUpdateArtifact={updateExistingArtifact}
                />
              </div>
            );
          })}
        </div>

        {/* Artifact editor modal using our new component */}
        <ArtifactEditorModal
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
      </div>
    </ClientPageTransition>
  );
}
