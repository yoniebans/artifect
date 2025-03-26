import { Artifact } from './artifact';

export interface Project {
  project_id: string;
  name: string;
  created_at: string;
  updated_at: string | null;
  phases: Phase[];
}

export interface Phase {
  name: string;
  phase_id: string;
  order: string;
  artifacts: Artifact[];
}

export interface ProjectSummary {
  project_id: string;
  name: string;
  created_at: string;
  updated_at: string | null;
}

export interface ProjectCreateRequest {
  name: string;
}