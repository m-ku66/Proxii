import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import started from "electron-squirrel-startup";
import { ConversationFileService } from "./services/conversationFileService";
import { ProjectFileService } from "./services/projectFileService";
import type { Conversation } from "./preload";
import type { LocalProject } from "./types/project";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Initialize file services
const conversationService = new ConversationFileService();
const projectService = new ProjectFileService();

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false, // Security best practice
      contextIsolation: true, // Security best practice
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  // Open the DevTools in development
  // if (process.env.NODE_ENV === "development") {
  //   mainWindow.webContents.openDevTools();
  // }
};

// IPC Handlers for conversation management
ipcMain.handle("conversations:load-all", async () => {
  try {
    return await conversationService.loadAllConversations();
  } catch (error) {
    console.error("Failed to load conversations:", error);
    return [];
  }
});

ipcMain.handle("conversations:save", async (_, conversation: Conversation) => {
  try {
    await conversationService.saveConversation(conversation);
  } catch (error) {
    console.error("Failed to save conversation:", error);
    throw error;
  }
});

ipcMain.handle(
  "conversations:delete",
  async (_, conversationId: string, projectId?: string | null) => {
    try {
      // Pass projectId to the file service so it knows exactly where to look
      await conversationService.deleteConversation(conversationId, projectId);
    } catch (error) {
      console.error("Failed to delete conversation:", error);
      throw error;
    }
  }
);

ipcMain.handle(
  "conversations:export",
  async (
    _,
    conversation: Conversation,
    format: "json" | "markdown" | "txt"
  ) => {
    try {
      // SANITIZE THE FILENAME
      const sanitizedTitle = conversation.title
        .replace(/\s+/g, "_") // Replace spaces with underscores
        .replace(/[^\w\-_]/g, "") // Remove special chars (keep letters, numbers, hyphens, underscores)
        .replace(/_{2,}/g, "_") // Replace multiple underscores with single
        .replace(/^_+|_+$/g, ""); // Remove leading/trailing underscores

      // Fallback if title becomes empty after sanitization
      const filename = sanitizedTitle || `conversation_${conversation.id}`;

      // Open save dialog
      const result = await dialog.showSaveDialog({
        title: "Export Conversation",
        defaultPath: `${filename}.${format === "markdown" ? "md" : format}`, // ✨ USE SANITIZED NAME
        filters: [
          {
            name: `${format.toUpperCase()} Files`,
            extensions: [format === "markdown" ? "md" : format],
          },
          { name: "All Files", extensions: ["*"] },
        ],
      });

      if (result.canceled || !result.filePath) {
        return null;
      }

      await conversationService.exportConversation(
        conversation,
        result.filePath,
        format
      );
      return result.filePath;
    } catch (error) {
      console.error("Failed to export conversation:", error);
      throw error;
    }
  }
);

ipcMain.handle("app:get-conversations-path", async () => {
  return conversationService.getConversationsPath();
});

ipcMain.handle("app:open-conversations-folder", async () => {
  const conversationsPath = conversationService.getConversationsPath();
  await shell.openPath(conversationsPath);
});

// IPC Handlers for project management
ipcMain.handle("projects:load-all", async () => {
  try {
    return await projectService.loadAllProjects();
  } catch (error) {
    console.error("Failed to load projects:", error);
    return [];
  }
});

ipcMain.handle("projects:save", async (_, project: LocalProject) => {
  try {
    await projectService.saveProject(project);
  } catch (error) {
    console.error("Failed to save project:", error);
    throw error;
  }
});

ipcMain.handle("projects:delete", async (_, projectId: string) => {
  try {
    await projectService.deleteProject(projectId);
  } catch (error) {
    console.error("Failed to delete project:", error);
    throw error;
  }
});

ipcMain.handle("app:get-projects-path", async () => {
  return projectService.getProjectsPath();
});

ipcMain.handle("app:open-projects-folder", async () => {
  const projectsPath = projectService.getProjectsPath();
  await shell.openPath(projectsPath);
});

// Save an asset file to conversation's asset directory
ipcMain.handle(
  "assets:save",
  async (
    _,
    conversationId: string,
    filename: string,
    buffer: ArrayBuffer,
    projectId?: string | null
  ) => {
    try {
      // Get or create the assets directory with projectId for correct routing
      const assetsDir = await conversationService.getOrCreateAssetsDir(
        conversationId,
        projectId
      );

      // Write the file
      const filePath = path.join(assetsDir, filename);
      await fs.writeFile(filePath, Buffer.from(buffer));

      console.log(
        `💾 Saved asset: ${filename} for conversation ${conversationId} ${projectId ? `(project: ${projectId})` : "(global)"}`
      );
    } catch (error) {
      console.error("Failed to save asset:", error);
      throw error;
    }
  }
);

// Load an asset file from conversation's asset directory
ipcMain.handle(
  "assets:load",
  async (
    _,
    conversationId: string,
    filename: string,
    projectId?: string | null
  ) => {
    try {
      // Get the assets directory with projectId for correct routing
      const assetsDir = await conversationService.getOrCreateAssetsDir(
        conversationId,
        projectId
      );
      const filePath = path.join(assetsDir, filename);

      const buffer = await fs.readFile(filePath);
      return buffer.buffer; // Return ArrayBuffer
    } catch (error) {
      console.error("Failed to load asset:", error);
      throw error;
    }
  }
);

// Delete a specific asset file
ipcMain.handle(
  "assets:delete",
  async (
    _,
    conversationId: string,
    filename: string,
    projectId?: string | null
  ) => {
    try {
      // Get the assets directory with projectId for correct routing
      const assetsDir = await conversationService.getOrCreateAssetsDir(
        conversationId,
        projectId
      );
      const filePath = path.join(assetsDir, filename);

      await fs.unlink(filePath);
      console.log(
        `🗑️ Deleted asset: ${filename} for conversation ${conversationId}`
      );
    } catch (error) {
      // Don't throw if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error("Failed to delete asset:", error);
        throw error;
      }
    }
  }
);

// Delete all assets for a conversation
ipcMain.handle(
  "assets:delete-all",
  async (_, conversationId: string, projectId?: string | null) => {
    try {
      // Get the assets directory with projectId for correct routing
      const assetsDir = await conversationService.getOrCreateAssetsDir(
        conversationId,
        projectId
      );

      await fs.rm(assetsDir, { recursive: true, force: true });
      console.log(`🗑️ Deleted all assets for conversation ${conversationId}`);
    } catch (error) {
      console.error("Failed to delete conversation assets:", error);
      // Don't throw if directory doesn't exist
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }
);

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on("ready", async () => {
  // Ensure directories exist
  await conversationService.ensureConversationsDirectory();
  await projectService.ensureProjectsDirectory();
  createWindow();
});

// Quit when all windows are closed, except on macOS.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Save all conversations before app quits
app.on("before-quit", async () => {
  // This could trigger a final save of any unsaved conversations
  // We'll implement this when we add the auto-save system
});
