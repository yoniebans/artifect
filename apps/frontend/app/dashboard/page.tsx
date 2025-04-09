"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLoadingApi } from "@/components/loading/useLoadingApi";
import { ClientPageTransition } from "@/components/transitions/ClientPageTransition";
import {
  IProject as Project,
  IProjectType as ProjectType,
} from "@artifect/shared";
import { useLoading } from "@/components/loading/LoadingContext";
import { BackendAuthErrorDisplay } from "@/components/BackendAuthDisplay";

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);
  const [selectedProjectType, setSelectedProjectType] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const {
    fetchWithLoading,
    isAuthenticated,
    isAuthLoading,
    hasBackendAuthFailed,
  } = useLoadingApi();
  const { setLoading, setLoadingMessage } = useLoading();
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Use ref to prevent infinite fetch loops
  const projectsLoaded = useRef(false);
  const projectTypesLoaded = useRef(false);

  // Handle authentication loading with the central loading system
  useEffect(() => {
    // Skip loading if backend auth has failed
    if (hasBackendAuthFailed) {
      setLoading(false);
      return;
    }

    if (isAuthLoading) {
      setLoadingMessage("Checking authentication...");
      setLoading(true);
    } else {
      setLoading(false);

      // Redirect if not authenticated
      if (!isAuthenticated && !hasBackendAuthFailed) {
        router.push("/sign-in");
      }
    }

    return () => {
      // Clean up loading state when unmounting
      setLoading(false);
    };
  }, [
    isAuthLoading,
    isAuthenticated,
    router,
    setLoading,
    setLoadingMessage,
    hasBackendAuthFailed,
  ]);

  // Fetch project types
  const fetchProjectTypes = useCallback(async () => {
    if (projectTypesLoaded.current || hasBackendAuthFailed) return;

    try {
      const data = await fetchWithLoading<ProjectType[]>(
        "/project/types",
        "GET",
        undefined,
        undefined,
        "Loading project types...",
        false // Don't show full screen loading for this
      );

      setProjectTypes(data);

      // Set default selected project type if available
      if (data.length > 0) {
        setSelectedProjectType(data[0].id);
      }

      projectTypesLoaded.current = true;
    } catch (error) {
      console.error("Error fetching project types:", error);
      // Don't show error toast as this is a secondary feature
      // Just set an empty array of project types
      setProjectTypes([]);
    }
  }, [fetchWithLoading, hasBackendAuthFailed]);

  const fetchProjects = useCallback(async () => {
    if (projectsLoaded.current || hasBackendAuthFailed) return;

    try {
      setIsInitialLoading(true);

      const data = await fetchWithLoading<Project[]>(
        "/project",
        "GET",
        undefined,
        undefined,
        "Loading your projects...",
        true,
        1000 // 1-second minimum loading time
      );

      setProjects(data);
      projectsLoaded.current = true;

      if (data.length === 0) {
        toast({
          title: "No Projects Found",
          description: "Create a new project to get started.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      // Error handling is already done in fetchWithLoading
    } finally {
      setIsInitialLoading(false);
    }
  }, [fetchWithLoading, toast, hasBackendAuthFailed]);

  // Fetch projects when authenticated
  useEffect(() => {
    if (
      isAuthenticated &&
      !isAuthLoading &&
      !projectsLoaded.current &&
      !hasBackendAuthFailed
    ) {
      fetchProjects();
      fetchProjectTypes(); // Also fetch project types
    }
  }, [
    isAuthenticated,
    fetchProjects,
    fetchProjectTypes,
    isAuthLoading,
    hasBackendAuthFailed,
  ]);

  // Dialog open handler - reset form and ensure project types are loaded
  const handleOpenDialog = () => {
    setNewProjectName("");

    // Ensure project types are loaded when opening the dialog
    if (!projectTypesLoaded.current) {
      fetchProjectTypes();
    }

    setIsDialogOpen(true);
  };

  const createProject = async () => {
    if (hasBackendAuthFailed) return; // Skip if auth has failed

    if (!newProjectName.trim()) {
      toast({
        title: "Error",
        description: "Project name cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Prepare the request body with project type if selected
      const requestBody: {
        name: string;
        project_type_id?: number;
      } = {
        name: newProjectName,
      };

      // Add project_type_id if a valid one is selected
      if (selectedProjectType) {
        requestBody.project_type_id = parseInt(selectedProjectType, 10);
      }

      const newProject = await fetchWithLoading<Project>(
        "/project/new",
        "POST",
        requestBody,
        undefined,
        "Creating new project...",
        true,
        2000 // 2-second minimum loading time
      );

      setProjects((prevProjects) => [...prevProjects, newProject]);
      setNewProjectName("");
      setIsDialogOpen(false);
      toast({
        title: "Success",
        description: `Project created successfully with type: ${
          newProject.project_type_name || "Default"
        }`,
      });
    } catch (error) {
      console.error("Error creating project:", error);
      // Error handling is already done in fetchWithLoading
    }
  };

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Show backend auth error UI if there's a backend auth failure
  if (hasBackendAuthFailed) {
    return <BackendAuthErrorDisplay />;
  }

  // Don't render anything if we're loading auth or not authenticated
  if (isAuthLoading || !isAuthenticated) {
    return null;
  }

  return (
    <ClientPageTransition>
      <div className="min-h-full bg-background text-foreground p-8">
        <div className="max-w-6xl mx-auto">
          <header className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold slide-in-right">Projects</h1>
            <div className="flex items-center gap-4">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <Button
                  onClick={handleOpenDialog}
                  className="slide-in-right animation-delay-150"
                >
                  Create
                </Button>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>New Project</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        Name
                      </Label>
                      <Input
                        id="name"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        className="col-span-3"
                        autoFocus
                      />
                    </div>

                    {/* Project Type Dropdown */}
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="project-type" className="text-right">
                        Project Type
                      </Label>
                      <div className="col-span-3">
                        <Select
                          value={selectedProjectType}
                          onValueChange={setSelectedProjectType}
                        >
                          <SelectTrigger id="project-type">
                            <SelectValue placeholder="Select a project type" />
                          </SelectTrigger>
                          <SelectContent>
                            {projectTypes.length > 0 ? (
                              projectTypes.map((type) => (
                                <SelectItem key={type.id} value={type.id}>
                                  {type.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="default" disabled>
                                Loading project types...
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        {selectedProjectType && projectTypes.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {projectTypes.find(
                              (type) => type.id === selectedProjectType
                            )?.description || ""}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="secondary"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={createProject}>Create</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </header>
          <div className="relative mb-6 slide-in-right animation-delay-300">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {
              !isInitialLoading && filteredProjects.length > 0 ? (
                filteredProjects.map((project, index) => (
                  <Link
                    href={`/project/${project.project_id}`}
                    key={project.project_id}
                    className={`block stagger-item stagger-delay-${
                      (index % 5) + 1
                    }`}
                  >
                    <Card className="transition-all duration-300 hover:shadow-md hover:scale-[1.01]">
                      <CardHeader>
                        <CardTitle>{project.name}</CardTitle>
                        <CardDescription className="flex flex-col gap-1">
                          <span>
                            Created{" "}
                            {new Date(project.created_at).toLocaleDateString()}
                          </span>
                          {project.project_type_name && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                              {project.project_type_name}
                            </span>
                          )}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
                ))
              ) : !isInitialLoading ? (
                <div className="col-span-2 text-center text-muted-foreground fade-in">
                  No projects found.{" "}
                  {searchTerm
                    ? "Try a different search term."
                    : "Create a new project to get started."}
                </div>
              ) : null /* Don't show anything while initially loading */
            }
          </div>
        </div>
      </div>
    </ClientPageTransition>
  );
}
