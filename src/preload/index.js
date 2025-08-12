import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import os from 'os'
import path from 'path'

// Custom APIs for renderer
const api = {
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  getSources: () => ipcRenderer.invoke('get-sources'),
  startRecording: (options) => ipcRenderer.invoke('start-recording', options),
  stopRecording: () => ipcRenderer.invoke('stop-recording'),
  onRecordingStarted: (callback) => ipcRenderer.on('recording-started', callback),
  onRecordingStopped: (callback) => ipcRenderer.on('recording-stopped', callback),
  getDisplayMedia: async (options) => {
    return await ipcRenderer.invoke('get-display-sources');
  },
  // Recording overlay APIs
  showRecordingOverlay: () => ipcRenderer.invoke('show-recording-overlay'),
  hideRecordingOverlay: () => ipcRenderer.invoke('hide-recording-overlay'),
  stopRecordingFromOverlay: () => ipcRenderer.invoke('stop-recording-from-overlay'),
  onStopRecordingFromOverlay: (callback) => {
    ipcRenderer.on('stop-recording-from-overlay', () => callback());
  },
  // Open external URL
  openExternalUrl: (url) => ipcRenderer.invoke('open-external-url', { url })
}

// Additional electronAPI for file operations
const electronAPIExtended = {
  getDownloadsPath: () => {
    return path.join(os.homedir(), 'Downloads')
  },
  saveFile: (filePath, buffer) => {
    ipcRenderer.send('save-recording', { filePath, buffer })
  },
  uploadFileToS3: (filePath, buffer, filename, contentType) => {
    const authToken = localStorage.getItem('authToken')
    return ipcRenderer.invoke('upload-recording-to-s3', { filePath, buffer, filename, authToken, contentType })
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('electronAPI', electronAPIExtended)
    console.log('Preload script loaded successfully - APIs exposed')
  } catch (error) {
    console.error('Error in preload script:', error)
  }
} else {
  window.electron = electronAPI
  window.api = api
  window.electronAPI = electronAPIExtended
  console.log('Preload script loaded successfully - APIs exposed (non-isolated)')
}
