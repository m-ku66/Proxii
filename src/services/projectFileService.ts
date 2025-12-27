import fs from "fs/promises";
import path from "path";
import { app } from "electron";
import type { LocalProject } from "../types/project";

export class ProjectFileService {
  private projectsPath: string;

  constructor() {
    // Use the user's Documents folder for projects
    // ~/Documents/Proxii/projects/
    this.projectsPath = path.join(
      app.getPath("documents"),
      "Proxii",
      "projects"
    );
  }

  /**
   * Get the path where projects are stored
   */
  getProjectsPath(): string {
    return this.projectsPath;
  }

  /**
   * Ensure the projects directory exists
   */
  async ensureProjectsDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.projectsPath, { recursive: true });
      console.log(`📂 Projects directory ensured at: ${this.projectsPath}`);
    } catch (error) {
      console.error("Failed to create projects directory:", error);
      throw error;
    }
  }

  /**
   * Load all projects from the projects directory
   */
  async loadAllProjects(): Promise<LocalProject[]> {
    try {
      await this.ensureProjectsDirectory();

      const entries = await fs.readdir(this.projectsPath, {
        withFileTypes: true,
      });
      const projectDirs = entries.filter((entry) => entry.isDirectory());

      const projects: LocalProject[] = [];

      for (const dir of projectDirs) {
        try {
          const projectPath = path.join(
            this.projectsPath,
            dir.name,
            "project.json"
          );
          const content = await fs.readFile(projectPath, "utf-8");
          const project = JSON.parse(content);

          projects.push(project);
        } catch (fileError) {
          console.error(
            `Failed to load project from ${dir.name}:`,
            fileError
          );
          // Skip corrupted folders but continue loading others
        }
      }

      // Sort by updatedAt (most recent first)
      projects.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      console.log(`📂 Loaded ${projects.length} projects`);
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
      await this.ensureProjectsDirectory();

      // Create project folder: /projects/project-uuid/
      const projectDir = path.join(this.projectsPath, project.id);
      await fs.mkdir(projectDir, { recursive: true });

      // Create knowledge folder: /projects/project-uuid/knowledge/
      const knowledgeDir = path.join(projectDir, "knowledge");
      await fs.mkdir(knowledgeDir, { recursive: true });

      // Create conversations folder: /projects/project-uuid/conversations/
      const conversationsDir = path.join(projectDir, "conversations");
      await fs.mkdir(conversationsDir, { recursive: true });

      // Save project.json inside the folder
      const filePath = path.join(projectDir, "project.json");
      const content = JSON.stringify(project, null, 2);

      await fs.writeFile(filePath, content, "utf-8");
      console.log(`📂 Saved project: ${project.name} (${project.id})`);
    } catch (error) {
      console.error(`Failed to save project ${project.id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a project and all its contents (conversations, knowledge files, etc.)
   */
  async deleteProject(projectId: string): Promise<void> {
    try {
      // Delete the entire project folder (includes JSON, conversations, knowledge, etc.)
      const projectDir = path.join(this.projectsPath, projectId);
      await fs.rm(projectDir, { recursive: true, force: true });
      console.log(`📂 Deleted project folder: ${projectId}`);
    } catch (error) {
      console.error(`Failed to delete project ${projectId}:`, error);
      throw error;
    }
  }
}
