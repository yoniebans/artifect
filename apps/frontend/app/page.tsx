"use client";

import { useState, useEffect } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import Link from "next/link";
import { Project } from "@/types/artifact";

export default function Component() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      console.log("Fetching projects...");
      const response = await fetch("/api/project", {
        method: "GET",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Pragma: "no-cache",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
      console.log("Fetch response status:", response.status);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch projects: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("Fetched data:", data);

      if (!Array.isArray(data)) {
        console.error("Received data is not an array:", data);
        throw new Error("Invalid data format received from server");
      }

      setProjects(data);
      if (data.length === 0) {
        toast({
          title: "No Projects Found",
          description: "Create a new project to get started.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast({
        title: "Error",
        description: `Failed to fetch projects: ${error}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
      const response = await fetch("/api/project/new", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newProjectName }),
      });
      if (!response.ok) {
        throw new Error("Failed to create project");
      }
      const newProject = await response.json();
      setProjects((prevProjects) => [...prevProjects, newProject]);
      setNewProjectName("");
      setIsDialogOpen(false);
      toast({
        title: "Success",
        description: "Project created successfully.",
      });
    } catch (error) {
      console.error("Error creating project:", error);
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Projects</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>Create</Button>
            </DialogTrigger>
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
                  />
                </div>
              </div>
              <Button onClick={createProject}>Create</Button>
            </DialogContent>
          </Dialog>
        </header>
        <div className="relative mb-6">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {isLoading ? (
          <div className="text-center">Loading projects...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredProjects.length > 0 ? (
              filteredProjects.map((project) => (
                <Link
                  href={`/project/${project.project_id}`}
                  key={project.project_id}
                  className="block"
                >
                  <Card className="transition-shadow hover:shadow-md">
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
            ) : (
              <div className="col-span-2 text-center text-muted-foreground">
                No projects found.{" "}
                {searchTerm
                  ? "Try a different search term."
                  : "Create a new project to get started."}
              </div>
            )}
          </div>
        )}
      </div>
      <Toaster />
    </div>
  );
}
