import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type {
  Project,
  KnowledgeFile,
  LocalProject,
  LocalKnowledgeFile,
} from "@/types/project";
import { projectPersistence } from "../services/projectPersistenceService";

/**
 * Convert Project (in-memory with Dates) to LocalProject (for disk with strings)
 */
function projectToLocal(project: Project): LocalProject {
  return {
    ...project,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    knowledgeFiles: project.knowledgeFiles.map((file) => ({
      ...file,
      uploadedAt: file.uploadedAt.toISOString(),
    })),
  };
}

interface ProjectStore {
  // State
  projects: Project[];
  activeProjectId: string | null;

  // Project CRUD
  createProject: (name: string, description?: string) => Project;
  updateProject: (
    projectId: string,
    updates: Partial<
      Omit<Project, "id" | "createdAt" | "updatedAt" | "knowledgeFiles">
    >
  ) => void;
  deleteProject: (projectId: string) => void;
  getProject: (projectId: string) => Project | undefined;

  // Active project management
  setActiveProject: (projectId: string | null) => void;
  getActiveProject: () => Project | null;

  // Knowledge base management
  addKnowledgeFile: (
    projectId: string,
    file: Omit<KnowledgeFile, "id" | "uploadedAt">
  ) => void;
  removeKnowledgeFile: (projectId: string, fileId: string) => void;
  getKnowledgeFiles: (projectId: string) => KnowledgeFile[];

  // Utility
  getAllProjects: () => Project[];
  toggleStar: (projectId: string) => void;

  // Persistence methods
  setProjectsFromDisk: (projects: LocalProject[]) => void; // Accepts LocalProject[] and converts dates
  saveAllDirtyProjects: () => Promise<void>;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  // Initial state
  projects: [],
  activeProjectId: null,

  // Create a new project
  createProject: (name: string, description?: string) => {
    const newProject: Project = {
      id: uuidv4(),
      name,
      description,
      instructions: "",
      knowledgeFiles: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    set((state) => ({
      projects: [...state.projects, newProject],
    }));

    console.log(`✓ Created project: ${name}`);

    // Save immediately to disk
    projectPersistence
      .saveProjectImmediately(projectToLocal(newProject))
      .catch((error) => {
        console.error("Failed to save new project:", error);
      });

    return newProject;
  },

  // Update an existing project
  updateProject: (projectId: string, updates) => {
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === projectId
          ? { ...project, ...updates, updatedAt: new Date() }
          : project
      ),
    }));

    console.log(`✓ Updated project: ${projectId}`);

    // Mark as dirty for auto-save
    projectPersistence.markDirty(projectId);
  },

  // Delete a project
  deleteProject: async (projectId: string) => {
    try {
      // Delete from disk first (includes conversations and knowledge)
      await projectPersistence.deleteProject(projectId);

      // Then remove from state
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== projectId),
        // Clear active project if it's the one being deleted
        activeProjectId:
          state.activeProjectId === projectId ? null : state.activeProjectId,
      }));

      console.log(`✓ Deleted project: ${projectId}`);
    } catch (error) {
      console.error("Failed to delete project:", error);
      throw error;
    }
  },

  // Get a specific project
  getProject: (projectId: string) => {
    return get().projects.find((p) => p.id === projectId);
  },

  // Set the active project
  setActiveProject: (projectId: string | null) => {
    set({ activeProjectId: projectId });
    console.log(
      `✓ Active project: ${projectId ? get().getProject(projectId)?.name : "None"}`
    );
  },

  // Get the active project
  getActiveProject: () => {
    const { activeProjectId, projects } = get();
    if (!activeProjectId) return null;
    return projects.find((p) => p.id === activeProjectId) || null;
  },

  // Add a knowledge file to a project
  addKnowledgeFile: (projectId: string, file) => {
    const knowledgeFile: KnowledgeFile = {
      id: uuidv4(),
      ...file,
      uploadedAt: new Date(),
    };

    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === projectId
          ? {
              ...project,
              knowledgeFiles: [...project.knowledgeFiles, knowledgeFile],
              updatedAt: new Date(),
            }
          : project
      ),
    }));

    console.log(
      `✓ Added knowledge file to project ${projectId}: ${file.filename}`
    );

    // Mark as dirty for auto-save
    projectPersistence.markDirty(projectId);
  },

  // Remove a knowledge file from a project
  removeKnowledgeFile: (projectId: string, fileId: string) => {
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === projectId
          ? {
              ...project,
              knowledgeFiles: project.knowledgeFiles.filter(
                (f) => f.id !== fileId
              ),
              updatedAt: new Date(),
            }
          : project
      ),
    }));

    console.log(`✓ Removed knowledge file ${fileId} from project ${projectId}`);

    // Mark as dirty for auto-save
    projectPersistence.markDirty(projectId);
  },

  // Get all knowledge files for a project
  getKnowledgeFiles: (projectId: string) => {
    const project = get().projects.find((p) => p.id === projectId);
    return project?.knowledgeFiles || [];
  },

  // Get all projects
  getAllProjects: () => {
    return get().projects;
  },

  // Toggle star on a project
  toggleStar: (projectId: string) => {
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === projectId
          ? { ...project, starred: !project.starred }
          : project
      ),
    }));

    // Mark as dirty for auto-save
    projectPersistence.markDirty(projectId);
  },

  // Persistence methods
  setProjectsFromDisk: (projects) => {
    // Convert date strings back to Date objects
    const transformedProjects = projects.map((proj) => ({
      ...proj,
      createdAt: new Date(proj.createdAt),
      updatedAt: new Date(proj.updatedAt),
      knowledgeFiles: proj.knowledgeFiles.map((file) => ({
        ...file,
        uploadedAt: new Date(file.uploadedAt),
      })),
    }));

    set({ projects: transformedProjects });
  },

  saveAllDirtyProjects: async () => {
    try {
      const { projects } = get();
      // Convert Date objects to ISO strings for disk storage
      const localProjects = projects.map(projectToLocal);
      await projectPersistence.saveAllDirty(localProjects);
    } catch (error) {
      console.error("Failed to save dirty projects:", error);
    }
  },
}));
