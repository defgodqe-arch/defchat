const { app, BrowserWindow, shell } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    title: 'defchat', width: 1440, height: 900, minWidth: 360, minHeight: 560,
    backgroundColor: '#111318', autoHideMenuBar: true, show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  if (app.isPackaged) win.loadFile('dist/index.html');
  else win.loadURL('http://localhost:5173');
}
app.whenReady().then(() => {
  app.setAppUserModelId('gg.defgodqe.defchat');
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
