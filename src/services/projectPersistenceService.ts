import type { LocalProject } from "../types/project";

/**
 * Service for managing project persistence through Electron IPC
 * This acts as a bridge between the React app and the file system
 */
export class ProjectPersistenceService {
  private isDirty = new Set<string>(); // Track projects that need saving

  /**
   * Initialize the persistence service
   */
  async initialize(): Promise<void> {
    // Set up cleanup on page unload
    window.addEventListener("beforeunload", () => {
      // Save any pending dirty projects before closing
      console.log("💾 App closing, ensuring all projects are saved");
    });
  }

  /**
   * Load all projects from disk
   */
  async loadAllProjects(): Promise<LocalProject[]> {
    try {
      if (!window.electronAPI) {
        console.warn("Electron API not available, running in browser mode");
        return [];
      }

      const projects = await window.electronAPI.projects.loadAll();
      console.log(`📂 Loaded ${projects.length} projects from disk`);
      return projects;
    } catch (error) {
      console.error("Failed to load projects:", error);
      return [];
    }
  }

  /**
   * Save a project to disk
   */
  async saveProject(project: LocalProject): Promise<void> {
    try {
      if (!window.electronAPI) {
        console.warn(
          "Electron API not available, saving to localStorage as fallback"
        );
        this.saveToLocalStorage(project);
        return;
      }

      await window.electronAPI.projects.save(project);
      this.isDirty.delete(project.id);
      console.log(`📂 Saved project: ${project.name}`);
    } catch (error) {
      console.error("Failed to save project:", error);
      throw error;
    }
  }

  /**
   * Delete a project from disk (including all conversations and knowledge files)
   */
  async deleteProject(projectId: string): Promise<void> {
    try {
      if (!window.electronAPI) {
        console.warn(
          "Electron API not available, deleting from localStorage as fallback"
        );
        this.deleteFromLocalStorage(projectId);
        return;
      }

      await window.electronAPI.projects.delete(projectId);
      this.isDirty.delete(projectId);
      console.log(`📂 Deleted project: ${projectId}`);
    } catch (error) {
      console.error("Failed to delete project:", error);
      throw error;
    }
  }

  /**
   * Get the projects directory path
   */
  async getProjectsPath(): Promise<string | null> {
    try {
      if (!window.electronAPI) {
        return null;
      }

      return await window.electronAPI.app.getProjectsPath();
    } catch (error) {
      console.error("Failed to get projects path:", error);
      return null;
    }
  }

  /**
   * Open the projects folder in the file manager
   */
  async openProjectsFolder(): Promise<void> {
    try {
      if (!window.electronAPI) {
        console.warn(
          "Electron API not available, cannot open folder in browser mode"
        );
        return;
      }

      await window.electronAPI.app.openProjectsFolder();
    } catch (error) {
      console.error("Failed to open projects folder:", error);
    }
  }

  /**
   * Mark a project as dirty (needs saving)
   */
  markDirty(projectId: string): void {
    this.isDirty.add(projectId);
  }

  /**
   * Save all dirty projects
   */
  async saveAllDirty(projects: LocalProject[]): Promise<void> {
    const dirtyProjects = projects.filter((proj) =>
      this.isDirty.has(proj.id)
    );

    if (dirtyProjects.length === 0) return;

    console.log(`📂 Auto-saving ${dirtyProjects.length} dirty projects...`);

    const savePromises = dirtyProjects.map(async (project) => {
      try {
        await this.saveProject(project);
      } catch (error) {
        console.error(`Failed to auto-save project ${project.id}:`, error);
      }
    });

    await Promise.allSettled(savePromises);
  }

  /**
   * Save a project immediately (event-based)
   */
  async saveProjectImmediately(project: LocalProject): Promise<void> {
    try {
      if (!window.electronAPI) {
        console.warn(
          "Electron API not available, saving to localStorage as fallback"
        );
        this.saveToLocalStorage(project);
        return;
      }

      await window.electronAPI.projects.save(project);
      this.isDirty.delete(project.id);
      console.log(`💾 Saved project immediately: ${project.name}`);
    } catch (error) {
      console.error("Failed to save project immediately:", error);
      throw error;
    }
  }

  /**
   * Fallback: Save to localStorage when Electron API is not available
   */
  private saveToLocalStorage(project: LocalProject): void {
    try {
      const key = `proxii-project-${project.id}`;
      localStorage.setItem(key, JSON.stringify(project));
    } catch (error) {
      console.error("Failed to save to localStorage:", error);
    }
  }

  /**
   * Fallback: Delete from localStorage
   */
  private deleteFromLocalStorage(projectId: string): void {
    try {
      const key = `proxii-project-${projectId}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.error("Failed to delete from localStorage:", error);
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.isDirty.clear();
  }
}

// Create singleton instance
export const projectPersistence = new ProjectPersistenceService();
