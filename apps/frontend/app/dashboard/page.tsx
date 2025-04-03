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
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLoadingApi } from "@/components/loading/useLoadingApi";
import { ClientPageTransition } from "@/components/transitions/ClientPageTransition";
import { IProject as Project } from "@artifect/shared";
import { useLoading } from "@/components/loading/LoadingContext";

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { fetchWithLoading, isAuthenticated, isAuthLoading } = useLoadingApi();
  const { setLoading, setLoadingMessage } = useLoading();
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Use ref to prevent infinite fetch loops
  const projectsLoaded = useRef(false);

  // Handle authentication loading with the central loading system
  useEffect(() => {
    if (isAuthLoading) {
      setLoadingMessage("Checking authentication...");
      setLoading(true);
    } else {
      setLoading(false);

      // Redirect if not authenticated
      if (!isAuthenticated) {
        router.push("/sign-in");
      }
    }

    return () => {
      // Clean up loading state when unmounting
      setLoading(false);
    };
  }, [isAuthLoading, isAuthenticated, router, setLoading, setLoadingMessage]);

  const fetchProjects = useCallback(async () => {
    if (projectsLoaded.current) return;

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
  }, [fetchWithLoading, toast]);

  // Fetch projects when authenticated
  useEffect(() => {
    if (isAuthenticated && !isAuthLoading && !projectsLoaded.current) {
      fetchProjects();
    }
  }, [isAuthenticated, fetchProjects, isAuthLoading]);

  const createProject = async () => {
    if (!newProjectName.trim()) {
      toast({
        title: "Error",
        description: "Project name cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    try {
      const newProject = await fetchWithLoading<Project>(
        "/project/new",
        "POST",
        {
          name: newProjectName,
        },
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
        description: "Project created successfully.",
      });
    } catch (error) {
      console.error("Error creating project:", error);
      // Error handling is already done in fetchWithLoading
    }
  };

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Don't render anything if we're loading auth or not authenticated
  // Let the LoadingOverlay handle the visual feedback
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
                  onClick={() => setIsDialogOpen(true)}
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
                        <CardDescription>
                          Created{" "}
                          {new Date(project.created_at).toLocaleDateString()}
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
