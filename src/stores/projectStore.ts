import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import type { Project, KnowledgeFile } from "@/types/project";

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
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
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
      },

      // Delete a project
      deleteProject: (projectId: string) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== projectId),
          // Clear active project if it's the one being deleted
          activeProjectId:
            state.activeProjectId === projectId ? null : state.activeProjectId,
        }));

        console.log(`✓ Deleted project: ${projectId}`);
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

        console.log(
          `✓ Removed knowledge file ${fileId} from project ${projectId}`
        );
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
      },
    }),
    {
      name: "proxii-projects", // localStorage key
      partialize: (state) => ({
        projects: state.projects,
        activeProjectId: state.activeProjectId,
      }),
      onRehydrateStorage: () => (state) => {
        // Convert date strings back to Date objects when loading from storage
        if (state?.projects) {
          state.projects = state.projects.map((project: any) => ({
            ...project,
            createdAt: new Date(project.createdAt),
            updatedAt: new Date(project.updatedAt),
            knowledgeFiles: project.knowledgeFiles.map((file: any) => ({
              ...file,
              uploadedAt: new Date(file.uploadedAt),
            })),
          }));
        }
      },
    }
  )
);
