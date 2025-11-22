import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";
import { ConversationFileService } from "./services/conversationFileService";
import type { Conversation } from "./preload";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Initialize conversation file service
const conversationService = new ConversationFileService();

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
  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }
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

ipcMain.handle("conversations:delete", async (_, conversationId: string) => {
  try {
    await conversationService.deleteConversation(conversationId);
  } catch (error) {
    console.error("Failed to delete conversation:", error);
    throw error;
  }
});

ipcMain.handle(
  "conversations:export",
  async (
    _,
    conversation: Conversation,
    format: "json" | "markdown" | "txt"
  ) => {
    try {
      // Open save dialog
      const result = await dialog.showSaveDialog({
        title: "Export Conversation",
        defaultPath: `${conversation.title}.${format}`,
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

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on("ready", async () => {
  // Ensure conversations directory exists
  await conversationService.ensureConversationsDirectory();
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
