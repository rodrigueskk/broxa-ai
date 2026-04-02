const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    autoHideMenuBar: true,
    backgroundColor: '#000000',
    title: 'Broxa AI'
  });

  // Load the web app. We expect the dist folder to be copied here
  mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html')).catch((err) => {
    console.error('Failed to load file, checking if using live reload or remote url', err);
    // If local file fails (e.g. not built yet), we can fallback to something else, or show an error.
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
