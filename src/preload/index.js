import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import os from 'os'
import path from 'path'

// Custom APIs for renderer
const api = {
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  getSources: () => ipcRenderer.invoke('get-sources'),
  startRecording: (options) => ipcRenderer.invoke('start-recording', options),
  stopRecording: () => ipcRenderer.invoke('stop-recording'),
  onRecordingStarted: (callback) => ipcRenderer.on('recording-started', callback),
  onRecordingStopped: (callback) => ipcRenderer.on('recording-stopped', callback),
  getDisplayMedia: async (options) => {
    return await ipcRenderer.invoke('get-display-sources');
  },
  startSourceCapture: async (sourceId) => {
    return await ipcRenderer.invoke('start-source-capture', sourceId);
  },
  testScreenCapture: async () => {
    return await ipcRenderer.invoke('test-screen-capture');
  },
  // Recording overlay APIs
  showRecordingOverlay: () => ipcRenderer.invoke('show-recording-overlay'),
  hideRecordingOverlay: () => ipcRenderer.invoke('hide-recording-overlay'),
  stopRecordingFromOverlay: () => ipcRenderer.invoke('stop-recording-from-overlay'),
  onStopRecordingFromOverlay: (callback) => {
    ipcRenderer.on('stop-recording-from-overlay', () => callback());
  },
  // Microphone control
  toggleMicrophoneMute: (isMuted) => ipcRenderer.invoke('toggle-microphone-mute', { isMuted }),
  getCurrentMicrophoneState: () => ipcRenderer.invoke('get-current-microphone-state'),
  updateMicrophoneEnabled: (isEnabled) => ipcRenderer.invoke('update-microphone-enabled', { isEnabled }),
  checkMicrophonePermission: () => ipcRenderer.invoke('check-microphone-permission'),
  requestMicrophonePermission: () => ipcRenderer.invoke('request-microphone-permission'),
  resetMicrophonePermissionState: () => ipcRenderer.invoke('reset-microphone-permission-state'),
  getMicrophonePermissionState: () => ipcRenderer.invoke('get-microphone-permission-state'),
  onMicrophoneMuteToggle: (callback) => {
    ipcRenderer.on('microphone-mute-toggled', callback);
  },
  removeMicrophoneMuteToggle: (callback) => {
    ipcRenderer.removeListener('microphone-mute-toggled', callback);
  },
  onMicrophoneEnabledUpdate: (callback) => {
    ipcRenderer.on('microphone-enabled-updated', callback);
  },
  removeMicrophoneEnabledUpdate: (callback) => {
    ipcRenderer.removeListener('microphone-enabled-updated', callback);
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
