const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    frame: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    title: 'Broxa AI'
  });

  // Load the remote live URL
  mainWindow.loadURL('https://broxaa-ai.vercel.app');

  // Handle links opening in external browser if needed, though most things stay in app.
  // Actually, keeping everything in the app avoids deep linking complexity.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // If it's a google auth link, it could open in a new popup window, but firebase popup handles itself.
    return { action: 'allow' };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
