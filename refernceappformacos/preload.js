const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script loaded, ipcRenderer available:', !!ipcRenderer);

// Note: We're now using navigator.mediaDevices.getDisplayMedia() directly in the renderer
// which handles both audio and video capture through Electron's session handler
contextBridge.exposeInMainWorld('electronAPI', {
  // getScreenSources removed - using getDisplayMedia instead for better audio support
  getScreenSources: () => ipcRenderer.invoke('get-screen-sources'),
  captureScreenSource: (sourceId) => ipcRenderer.invoke('capture-screen-source', sourceId),
  startSourceCapture: (sourceId) => ipcRenderer.invoke('start-source-capture', sourceId),
  setSelectedSource: (sourceId) => ipcRenderer.invoke('set-selected-source', sourceId)
});

contextBridge.exposeInMainWorld('micAPI', {
  // nothing needed right now; we'll use getUserMedia in the renderer directly
  // but keeping this file for future IPC-safe bridges is a good practice
});

console.log('Preload script completed, APIs exposed via IPC');
