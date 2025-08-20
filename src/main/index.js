import { app, shell, BrowserWindow, ipcMain, session, systemPreferences, desktopCapturer, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import fs from 'fs'
import path from 'path'

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('Another instance is already running, quitting...');
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    console.log('Second instance attempted, bringing existing window to front...');
    
    // Find the main window and bring it to front
    const windows = BrowserWindow.getAllWindows();
    const mainWindow = windows.find(w => !w.isDestroyed() && w !== recordingOverlayWindow);
    
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
      mainWindow.show();
    }
  });
}

let recordingOverlayWindow = null;
let currentMicrophoneMuted = false; // Track microphone state globally - start unmuted
let currentMicrophoneEnabled = true; // Track if microphone is enabled (not disabled)

function createRecordingOverlayWindow() {
  if (recordingOverlayWindow) {
    return recordingOverlayWindow;
  }

  // Get primary display bounds
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  
  const overlayWidth = 60;
  const overlayHeight = 200;
  const x = screenWidth - overlayWidth; // Position at full right
  const y = Math.round(screenHeight - overlayHeight - 50); // 50px from bottom

  recordingOverlayWindow = new BrowserWindow({
    width: overlayWidth,
    height: overlayHeight,
    x: x,
    y: y,
    frame: false,
   // transparent: true,
    backgroundColor: '#000000',
    alwaysOnTop: true,
    resizable: false, 
    skipTaskbar: true,
    hasShadow: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: false,
    icon: icon,
    show: false,
     autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
    }
  });

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    recordingOverlayWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/overlay`);
  } else {
    recordingOverlayWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/overlay' });
  }

  recordingOverlayWindow.setMovable(true);
  recordingOverlayWindow.setAlwaysOnTop(true, 'screen-saver');
  recordingOverlayWindow.setMenuBarVisibility(false);
  recordingOverlayWindow.setMenu(null);

  recordingOverlayWindow.on('closed', () => {
    recordingOverlayWindow = null;
  });

  return recordingOverlayWindow;
}

// // Only disable problematic GPU caches, keep application data intact
// app.commandLine.appendSwitch('--disable-gpu-cache');
// app.commandLine.appendSwitch('--disable-background-timer-throttling');
// app.commandLine.appendSwitch('--disable-renderer-backgrounding');
// app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');
// app.commandLine.appendSwitch('--disable-features', 'TranslateUI');
// app.commandLine.appendSwitch('--disable-ipc-flooding-protection');

// // Additional fixes for Windows (from working reference app)
// app.commandLine.appendSwitch('--disable-gpu-sandbox');
// app.commandLine.appendSwitch('--disable-software-rasterizer');
// app.commandLine.appendSwitch('--disable-dev-shm-usage');
// app.commandLine.appendSwitch('--no-sandbox');

// // Set custom cache directory to avoid permission issues (from working reference app)
// const userDataPath = app.getPath('userData');
// const cachePath = join(userDataPath, 'Cache');
// app.commandLine.appendSwitch('--disk-cache-dir', cachePath);
// app.commandLine.appendSwitch('--media-cache-dir', cachePath);

// // Ensure persistent storage for local storage and cookies
// app.commandLine.appendSwitch('--enable-features', 'PersistentStorage');
// app.commandLine.appendSwitch('--enable-features', 'LocalStorage');
// app.commandLine.appendSwitch('--enable-features', 'Cookies');

const userDataPath = path.join(app.getPath('appData'), 'CapMeet'); // change 'MyElectronApp' to your app name
app.setPath('userData', userDataPath);

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 460,
    height: 690,
    show: false,
    frame: false, 
    titleBarStyle: 'default', 
    title: 'CapMeet',
    icon: icon,
    resizable:false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      enableWebContents: true,
      webSecurity: true,
      partition: 'persist:main'
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.capmeet.app')

  // Configure session for persistent storage
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    // Ensure requests for local storage are not blocked
    callback({});
  });

  // macOS-specific setup for microphone permissions
  if (process.platform === 'darwin') {
    console.log('Setting up macOS-specific permissions...');
    
    // Check current microphone permission status
    const micPermission = systemPreferences.getMediaAccessStatus('microphone');
    console.log('Current microphone permission status:', micPermission);
    
    // Request microphone permissions using systemPreferences if not already granted
    if (micPermission !== 'granted') {
      systemPreferences.askForMediaAccess('microphone').then((granted) => {
        console.log('Microphone permission requested and granted:', granted);
        
        // Store the permission status for future use
        if (granted) {
          // Set a flag to remember permission was granted
          global.microphonePermissionGranted = true;
        }
      }).catch((error) => {
        console.error('Error requesting microphone permission:', error);
      });
    } else {
      console.log('Microphone permission already granted');
      global.microphonePermissionGranted = true;
    }
  }

  // Set permission request handler (only once)
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    console.log('Permission requested:', permission);
    
    if (permission === 'microphone') {
      // Check if we already have permission or if it was previously granted
      if (process.platform === 'darwin') {
        const micPermission = systemPreferences.getMediaAccessStatus('microphone');
        if (micPermission === 'granted' || global.microphonePermissionGranted) {
          console.log('Microphone permission already granted - allowing access');
          callback(true);
          return;
        }
      }
      
      console.log('Microphone permission requested - granting');
      callback(true);
      
      // Mark as granted for future requests
      if (process.platform === 'darwin') {
        global.microphonePermissionGranted = true;
      }
    } else if (permission === 'media') {
      console.log('Media permission requested - granting for microphone access');
      callback(true);
    } else if (['display-capture', 'desktop-capture'].includes(permission)) {
      console.log('Screen capture permission requested - granting');
      callback(true);
    } else {
      console.log('Denying permission:', permission);
      callback(false);
    }
  });

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })


  // Window control handlers
  ipcMain.handle('window-minimize', () => {
    const window = BrowserWindow.getFocusedWindow()
    if (window) {
      window.minimize()
    }
  })

  ipcMain.handle('window-maximize', () => {
    const window = BrowserWindow.getFocusedWindow()
    if (window) {
      if (window.isMaximized()) {
        window.unmaximize()
      } else {
        window.maximize()
      }
    }
  })

  ipcMain.handle('window-close', () => {
    const window = BrowserWindow.getFocusedWindow()
    if (window) {
      window.close()
    }
  })

  // Microphone mute control
  ipcMain.handle('toggle-microphone-mute', (event, { isMuted }) => {
    try {
      // Update global microphone state
      currentMicrophoneMuted = isMuted;
      
      // Send the mute state to all renderer processes
      const windows = BrowserWindow.getAllWindows();
      windows.forEach(window => {
        if (!window.isDestroyed()) {
          window.webContents.send('microphone-mute-toggled', { isMuted });
        }
      });
      
      console.log('Microphone mute state changed:', isMuted);
      return { success: true, isMuted };
    } catch (error) {
      console.error('Error toggling microphone mute:', error);
      return { success: false, error: error.message };
    }
  })

  // Get current microphone state
  ipcMain.handle('get-current-microphone-state', () => {
    try {
      console.log('Getting current microphone state:', currentMicrophoneMuted);
      return { success: true, isMuted: currentMicrophoneMuted };
    } catch (error) {
      console.error('Error getting current microphone state:', error);
      return { success: false, error: error.message };
    }
  })

  // Update microphone enabled state
  ipcMain.handle('update-microphone-enabled', (event, { isEnabled }) => {
    try {
      currentMicrophoneEnabled = isEnabled;
      console.log('Microphone enabled state updated:', isEnabled);
      
      // Send the enabled state to all renderer processes
      const windows = BrowserWindow.getAllWindows();
      windows.forEach(window => {
        if (!window.isDestroyed()) {
          window.webContents.send('microphone-enabled-updated', { isEnabled });
        }
      });
      
      return { success: true, isEnabled };
    } catch (error) {
      console.error('Error updating microphone enabled state:', error);
      return { success: false, error: error.message };
    }
  })



  // Get display sources handler
  ipcMain.handle('get-display-sources', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 0, height: 0 },
        fetchWindowIcons: false
      });
      return sources;
    } catch (error) {
      console.error('Error getting display sources:', error);
      throw error;
    }
  });

  // Check microphone permission status
  ipcMain.handle('check-microphone-permission', () => {
    try {
      if (process.platform === 'darwin') {
        const micPermission = systemPreferences.getMediaAccessStatus('microphone');
        console.log('Microphone permission status checked:', micPermission);
        return {
          status: micPermission,
          isGranted: micPermission === 'granted',
          platform: 'darwin'
        };
      } else {
        // For other platforms, return a default status
        return {
          status: 'unknown',
          isGranted: false,
          platform: process.platform
        };
      }
    } catch (error) {
      console.error('Error checking microphone permission:', error);
      return {
        status: 'error',
        isGranted: false,
        error: error.message,
        platform: process.platform
      };
    }
  });

  // Request microphone permission explicitly
  ipcMain.handle('request-microphone-permission', async () => {
    try {
      if (process.platform === 'darwin') {
        console.log('Requesting microphone permission explicitly...');
        const granted = await systemPreferences.askForMediaAccess('microphone');
        console.log('Microphone permission request result:', granted);
        
        if (granted) {
          global.microphonePermissionGranted = true;
        }
        
        return {
          success: true,
          granted,
          status: systemPreferences.getMediaAccessStatus('microphone')
        };
      } else {
        return {
          success: false,
          granted: false,
          error: 'Permission request only supported on macOS'
        };
      }
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      return {
        success: false,
        granted: false,
        error: error.message
      };
    }
  });



  // File saving handler
  ipcMain.on('save-recording', (event, { filePath, buffer }) => {
    // Convert Uint8Array to Buffer for fs.writeFile
    const bufferData = Buffer.from(buffer);
    // i want to upload this file in s3 bucket i want to create function in RCservice.js i want to pass the file in the function
    fs.writeFile(filePath, bufferData, (err) => {
      if (err) {
        console.error('Error saving file:', err)
      } else {
        console.log('Recording saved successfully:', filePath)
      }
    })
  })

  // Upload recording to S3 handler
  ipcMain.handle('upload-recording-to-s3', async (event, { filePath, buffer, filename, authToken, contentType = 'video/webm' }) => {
    try {
      const bufferData = Buffer.from(buffer);
      const fileSize = bufferData.length;
      const fileSizeMB = fileSize / 1024 / 1024;
      
      console.log('Starting S3 upload process...', {
        filename: filename,
        fileSizeMB: fileSizeMB.toFixed(2),
        bufferSize: fileSize,
        hasAuthToken: !!authToken,
        authTokenLength: authToken ? authToken.length : 0,
        contentType: contentType
      });

      if (!authToken) {
        throw new Error('No authentication token available. Please login first.');
      }

      // API base URL
      const API_BASE_URL = 'https://api-dev-classcapsule.nfndev.com';
      console.log('Using API base URL:', API_BASE_URL);

      if (fileSizeMB < 0) {
        // Small file - use regular upload
        console.log('Using regular upload for small file');
        return await uploadSmallFile(bufferData, filename, authToken, API_BASE_URL, contentType);
      } else {
        // Large file - use multipart upload
        console.log('Using multipart upload for large file');
        return await uploadLargeFile(bufferData, filename, authToken, API_BASE_URL, contentType);
      }
    } catch (error) {
      console.error('S3 upload error:', error);
      return { success: false, error: error.message };
    }
  })

  // Helper function for small file upload
  async function uploadSmallFile(buffer, filename, authToken, apiUrl, contentType = 'video/webm') {
    try {
      // Create FormData equivalent for Node.js
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('file', buffer, {
        filename: filename || `recording-${Date.now()}.webm`,
        contentType: contentType || 'video/webm'
      });

      // Prepare headers
      const headers = {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${authToken}`
      };

      // Send to API
      const https = require('https');
      const http = require('http');
      
      const url = new URL(`${apiUrl}/recordings/upload`);
      const client = url.protocol === 'https:' ? https : http;

      const requestOptions = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: headers
      };

      return new Promise((resolve, reject) => {
        const req = client.request(requestOptions, (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                const responseData = JSON.parse(data);
                console.log('Upload successful:', responseData);
                resolve({ success: true, data: responseData });
              } catch (parseError) {
                resolve({ success: true, data: { message: 'Upload successful' } });
              }
            } else {
              let errorMessage = `Upload failed: ${res.statusCode}`;
              if (res.statusCode === 401) {
                errorMessage = 'Authentication failed: Invalid or expired token. Please login again.';
              } else if (res.statusCode === 413) {
                errorMessage = 'File too large for single upload. Please try again or contact support for large file uploads.';
              } else if (res.statusCode === 500) {
                errorMessage = 'Server error: Please try again later.';
              } else {
                errorMessage = `Upload failed: ${res.statusCode} ${res.statusMessage}`;
              }
              reject(new Error(errorMessage));
            }
          });
        });

        req.on('error', (error) => {
          console.error('Upload error:', error);
          reject(error);
        });

        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Upload timeout'));
        });

        req.setTimeout(120000); // 2 minute timeout
        formData.pipe(req);
      });
    } catch (error) {
      console.error('Small file upload error:', error);
      return { success: false, error: error.message };
    }
  }

  // Helper function for large file upload
  async function uploadLargeFile(buffer, filename, authToken, apiUrl, contentType = 'video/webm') {
    try {
      console.log('Attempting multipart upload for large file...');
      
      // Start multipart upload
      const startResponse = await startMultipartUpload(filename, buffer.length, authToken, apiUrl, contentType);
      const { uploadId } = startResponse.data;

      // Generate presigned URLs
      const presignedResponse = await generatePresignedUrls(filename, uploadId, buffer.length, authToken, apiUrl, contentType);
      const presignedUrls = presignedResponse.data.presignedUrls;

      // Upload parts
      const parts = [];
      const chunkSize = Math.ceil(buffer.length / presignedUrls.length);

      for (let i = 0; i < presignedUrls.length; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, buffer.length);
        const chunk = buffer.slice(start, end);
        const presignedUrl = presignedUrls[i];

        console.log(`Uploading part ${i + 1}/${presignedUrls.length}`);

        // Upload part with retry logic
        const partResult = await uploadPartWithRetry(presignedUrl, chunk, contentType || 'video/webm', i + 1);
        
        parts.push({
          etag: partResult.etag,
          PartNumber: i + 1
        });
      }

      // Complete multipart upload
      const completeResponse = await completeMultipartUpload(filename, uploadId, parts, authToken, apiUrl, contentType);

      console.log('Multipart upload completed:', completeResponse.data);
      return { success: true, data: completeResponse.data };
      
    } catch (error) {
      console.error('Large file upload error:', error);
      
      // For files just slightly over 10MB, try small file upload as fallback
      const fileSizeMB = buffer.length / 1024 / 1024;
      if (fileSizeMB < 15) { // If file is less than 15MB, try small file upload
        console.log('Multipart upload failed, trying small file upload as fallback...');
        try {
          return await uploadSmallFile(buffer, filename, authToken, apiUrl);
        } catch (fallbackError) {
          console.error('Fallback small file upload also failed:', fallbackError);
          return { success: false, error: `Multipart upload failed: ${error.message}. Fallback also failed: ${fallbackError.message}` };
        }
      }
      
      return { success: false, error: error.message };
    }
  }

  // Helper function to start multipart upload
  async function startMultipartUpload(filename, fileSize, authToken, apiUrl, contentType = 'video/webm') {
    const https = require('https');
    const http = require('http');
    
    const url = new URL(`${apiUrl}/recordings/start-multipart-upload`);
    const client = url.protocol === 'https:' ? https : http;

    const requestData = JSON.stringify({
      fileName: filename,
      fileSize: fileSize,
      contentType: contentType || 'video/webm'
    });

    const requestOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'Content-Length': Buffer.byteLength(requestData)
      }
    };

    return new Promise((resolve, reject) => {
      const req = client.request(requestOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          console.log('Multipart upload response status:', res.statusCode);
          console.log('Multipart upload response headers:', res.headers);
          console.log('Multipart upload response data:', data);
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const responseData = JSON.parse(data);
              console.log('Multipart upload started:', responseData);
              resolve({ success: true, data: responseData });
            } catch (parseError) {
              console.error('Failed to parse multipart upload response:', parseError);
              reject(new Error('Invalid response format'));
            }
          } else {
            let errorMessage = `Failed to start multipart upload: ${res.statusCode}`;
            if (res.statusCode === 401) {
              errorMessage = 'Authentication failed: Invalid or expired token.';
            } else if (res.statusCode === 502) {
              errorMessage = 'Bad Gateway: Server is temporarily unavailable.';
            } else if (res.statusCode === 500) {
              errorMessage = 'Internal Server Error: Server encountered an error.';
            }
            console.error('Multipart upload failed with status:', res.statusCode, 'Response:', data);
            reject(new Error(errorMessage));
          }
        });
      });

      req.on('error', (error) => {
        console.error('Start multipart upload error:', error);
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.setTimeout(30000); // 30 second timeout
      req.write(requestData);
      req.end();
    });
  }

  // Helper function to generate presigned URLs
  async function generatePresignedUrls(filename, uploadId, fileSize, authToken, apiUrl, contentType = 'video/webm') {
    const https = require('https');
    const http = require('http');
    
    const url = new URL(`${apiUrl}/recordings/generate-presigned-url`);
    const client = url.protocol === 'https:' ? https : http;

    const requestData = JSON.stringify({
      fileName: filename,
      uploadId: uploadId,
      fileSize: fileSize
    });

    const requestOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'Content-Length': Buffer.byteLength(requestData)
      }
    };

    return new Promise((resolve, reject) => {
      const req = client.request(requestOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const responseData = JSON.parse(data);
              console.log('Presigned URLs generated:', responseData.presignedUrls?.length || 0);
              resolve({ success: true, data: responseData });
            } catch (parseError) {
              reject(new Error('Invalid response format'));
            }
          } else {
            let errorMessage = `Failed to generate presigned URLs: ${res.statusCode}`;
            if (res.statusCode === 401) {
              errorMessage = 'Authentication failed: Invalid or expired token.';
            }
            reject(new Error(errorMessage));
          }
        });
      });

      req.on('error', (error) => {
        console.error('Generate presigned URLs error:', error);
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.setTimeout(30000); // 30 second timeout
      req.write(requestData);
      req.end();
    });
  }

  // Helper function to upload part with retry logic
  async function uploadPartWithRetry(presignedUrl, chunk, contentType, partNumber, maxRetries = 3) {
    const https = require('https');
    const http = require('http');
    
    const url = new URL(presignedUrl);
    const client = url.protocol === 'https:' ? https : http;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const requestOptions = {
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname + url.search,
          method: 'PUT',
          headers: {
            'Content-Type': contentType,
            'Content-Length': chunk.length
          }
        };

        return new Promise((resolve, reject) => {
          const req = client.request(requestOptions, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
              data += chunk;
            });
            
            res.on('end', () => {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                const etag = res.headers.etag;
                if (!etag) {
                  reject(new Error('Missing ETag in response'));
                  return;
                }
                console.log(`Part ${partNumber} uploaded successfully`);
                resolve({ success: true, etag: etag.replace(/"/g, '') });
              } else {
                reject(new Error(`Part upload failed: ${res.statusCode} ${res.statusMessage}`));
              }
            });
          });

          req.on('error', (error) => {
            console.error(`Error uploading part ${partNumber} (attempt ${attempt}/${maxRetries}):`, error.message);
            
            if (attempt === maxRetries) {
              reject(new Error(`Failed to upload part ${partNumber} after ${maxRetries} attempts`));
            } else {
              // Wait before retry with exponential backoff
              setTimeout(() => {
                req.destroy();
                reject(error);
              }, Math.pow(2, attempt) * 1000);
            }
          });

          req.on('timeout', () => {
            req.destroy();
            reject(new Error('Part upload timeout'));
          });

          req.setTimeout(300000); // 5 minute timeout for large parts
          req.write(chunk);
          req.end();
        });
        
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  // Helper function to complete multipart upload
  async function completeMultipartUpload(filename, uploadId, parts, authToken, apiUrl, contentType = 'video/webm') {
    const https = require('https');
    const http = require('http');
    
    const url = new URL(`${apiUrl}/recordings/complete-multipart-upload`);
    const client = url.protocol === 'https:' ? https : http;

    const requestData = JSON.stringify({
      fileName: filename,
      uploadId: uploadId,
      parts: parts.sort((a, b) => a.PartNumber - b.PartNumber)
    });

    const requestOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'Content-Length': Buffer.byteLength(requestData)
      }
    };

    return new Promise((resolve, reject) => {
      const req = client.request(requestOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const responseData = JSON.parse(data);
              console.log('Multipart upload completed:', responseData);
              resolve({ success: true, data: responseData });
            } catch (parseError) {
              reject(new Error('Invalid response format'));
            }
          } else {
            let errorMessage = `Failed to complete multipart upload: ${res.statusCode}`;
            if (res.statusCode === 401) {
              errorMessage = 'Authentication failed: Invalid or expired token.';
            }
            reject(new Error(errorMessage));
          }
        });
      });

      req.on('error', (error) => {
        console.error('Complete multipart upload error:', error);
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.setTimeout(30000); // 30 second timeout
      req.write(requestData);
      req.end();
    });
  }

  // Recording overlay handlers
  ipcMain.handle('show-recording-overlay', async () => {
    try {
      if (!recordingOverlayWindow) {
        createRecordingOverlayWindow();
      }
      recordingOverlayWindow.show();
      
      // Send current microphone state to overlay window
      if (recordingOverlayWindow && !recordingOverlayWindow.isDestroyed()) {
        console.log('Sending microphone state to overlay window:', currentMicrophoneMuted);
        recordingOverlayWindow.webContents.send('microphone-mute-toggled', { isMuted: currentMicrophoneMuted });
        console.log('Sent current microphone state to overlay:', currentMicrophoneMuted);
        
        // Also send microphone enabled state
        recordingOverlayWindow.webContents.send('microphone-enabled-updated', { isEnabled: currentMicrophoneEnabled });
        console.log('Sent microphone enabled state to overlay:', currentMicrophoneEnabled);
      }
      
      return true;
    } catch (error) {
      console.error('Error showing recording overlay:', error);
      return false;
    }
  });

  ipcMain.handle('hide-recording-overlay', async () => {
    try {
      if (recordingOverlayWindow) {
        recordingOverlayWindow.hide();
      }
      return true;
    } catch (error) {
      console.error('Error hiding recording overlay:', error);
      return false;
    }
  });



  ipcMain.handle('stop-recording-from-overlay', async () => {
    try {
      // Send stop signal to main window
      const windows = BrowserWindow.getAllWindows();
      const mainWindow = windows.find(w => !w.isDestroyed() && w !== recordingOverlayWindow);
      if (mainWindow) {
        mainWindow.webContents.send('stop-recording-from-overlay');
      }
      
      // Hide overlay
      if (recordingOverlayWindow) {
        recordingOverlayWindow.hide();
      }
      return true;
    } catch (error) {
      console.error('Error stopping recording from overlay:', error);
      return false;
    }
  });

  // Open external URL handler
  ipcMain.handle('open-external-url', async (event, { url }) => {
    try {
      const { shell } = require('electron');
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      console.error('Error opening external URL:', error);
      return { success: false, error: error.message };
    }
  });

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
