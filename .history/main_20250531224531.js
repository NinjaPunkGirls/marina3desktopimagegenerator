const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs'); // Require the file system module

// Require electron-reloader
if (process.env.NODE_ENV === 'development') {
  require('electron-reloader')(module);
}

// Path to the configuration file for the default folder
const configPath = path.join(app.getPath('userData'), 'config.json');

// Function to save the default folder path
function saveDefaultFolderPath(folderPath) {
  const config = { defaultFolder: folderPath };
  fs.writeFileSync(configPath, JSON.stringify(config));
}

// Function to load the default folder path
function loadDefaultFolderPath() {
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return config.defaultFolder || null;
    }
  } catch (error) {
    console.error('Error loading default folder path:', error);
  }
  return null;
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // After the window is ready, load the default folder and send it to the renderer
  mainWindow.webContents.on('did-finish-load', () => {
    const defaultFolder = loadDefaultFolderPath();
    if (defaultFolder) {
      mainWindow.webContents.send('load-default-directory', defaultFolder);
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handler for selecting a directory for browsing images
ipcMain.on('open-directory-dialog', async (event) => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });

  if (!canceled && filePaths.length > 0) {
    event.reply('selected-directory', filePaths[0]); // Send the selected directory path back to the renderer process
  } else {
    event.reply('selected-directory', null); // Send null if selection was canceled
  }
});

// New IPC handler for setting the default directory
ipcMain.on('set-default-directory', async (event) => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });

  if (!canceled && filePaths.length > 0) {
    const selectedFolder = filePaths[0];
    saveDefaultFolderPath(selectedFolder);
    console.log('Default folder set to:', selectedFolder);
    // Optionally, send a confirmation back to the renderer
    event.reply('default-directory-set', selectedFolder);
  } else {
    console.log('Setting default folder canceled.');
    // Optionally, send a cancellation signal back
    event.reply('default-directory-set', null);
  }
}); 