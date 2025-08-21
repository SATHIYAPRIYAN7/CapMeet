const { app, BrowserWindow, systemPreferences, ipcMain, desktopCapturer, session } = require('electron');
const path = require('path');

let win;
let selectedSourceId = null; // Global variable to store the selected source ID

async function createWindow() {
  win = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // safe bridge
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Set up display media request handler for audio capture
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    // Use the globally stored selected source ID if available
    const sourceIdToUse = selectedSourceId || request.frameId || request.sourceId;
    
    if (sourceIdToUse) {
      // Find the specific requested source
      desktopCapturer.getSources({ types: ['screen', 'window'] }).then((sources) => {
        const requestedSource = sources.find(source => source.id === sourceIdToUse);
        if (requestedSource) {
          console.log(`Using selected source: ${requestedSource.name} (${requestedSource.id})`);
          callback({ 
            video: requestedSource, 
            audio: 'loopback' // This enables system audio capture
          });
        } else {
          console.log('Requested source not found, falling back to first available');
          // Fallback to first source if requested source not found
          callback({ 
            video: sources[0], 
            audio: 'loopback'
          });
        }
      }).catch((error) => {
        console.error('Error in display media handler:', error);
        callback({ video: false, audio: false });
      });
    } else {
      console.log('No source ID specified, using first available');
      // No specific source requested, use first available
      desktopCapturer.getSources({ types: ['screen', 'window'] }).then((sources) => {
        callback({ 
          video: sources[0], 
          audio: 'loopback' // This enables system audio capture
        });
      }).catch((error) => {
        console.error('Error in display media handler:', error);
        callback({ video: false, audio: false });
      });
    }
  }, { useSystemPicker: false });

  await win.loadFile('index.html');

  // Ask for mic access early so the OS prompt shows once.
  try {
    const status = systemPreferences.getMediaAccessStatus('microphone');
    if (status !== 'granted') {
      const allowed = await systemPreferences.askForMediaAccess('microphone');
      console.log('[Mic permission]', allowed ? 'granted' : 'denied');
    } else {
      console.log('[Mic permission] already granted');
    }
  } catch (err) {
    console.error('askForMediaAccess error:', err);
  }

  // Check screen recording permission status (macOS specific)
  if (process.platform === 'darwin') {
    try {
      const screenStatus = systemPreferences.getMediaAccessStatus('screen');
      console.log('[Screen permission status]:', screenStatus);
      // Note: macOS will prompt for screen recording permission when first used
    } catch (err) {
      console.error('Screen permission check error:', err);
    }
  }
}

// IPC handler to get available screen sources
ipcMain.handle('get-screen-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({ 
      types: ['screen', 'window'],
      thumbnailSize: { width: 150, height: 150 }
    });
    return sources.map(source => ({
      id: source.id,
      name: source.name,
      type: source.display_id ? 'screen' : 'window',
      thumbnail: source.thumbnail.toDataURL()
    }));
  } catch (error) {
    console.error('Error getting screen sources:', error);
    throw error;
  }
});

// IPC handler to capture a specific screen source
ipcMain.handle('capture-screen-source', async (event, sourceId) => {
  try {
    const sources = await desktopCapturer.getSources({ 
      types: ['screen', 'window']
    });
    
    const source = sources.find(s => s.id === sourceId);
    if (!source) {
      throw new Error('Source not found');
    }
    
    return source;
  } catch (error) {
    console.error('Error capturing screen source:', error);
    throw error;
  }
});

// IPC handler to start capture of a specific source
ipcMain.handle('start-source-capture', async (event, sourceId) => {
  try {
    const sources = await desktopCapturer.getSources({ 
      types: ['screen', 'window']
    });
    
    const source = sources.find(s => s.id === sourceId);
    if (!source) {
      throw new Error('Source not found');
    }
    
    // Store the selected source ID globally
    selectedSourceId = sourceId;
    
    // Return the source with additional metadata
    return {
      id: source.id,
      name: source.name,
      type: source.display_id ? 'screen' : 'window',
      display_id: source.display_id
    };
  } catch (error) {
    console.error('Error starting source capture:', error);
    throw error;
  }
});

// IPC handler to set the selected source ID
ipcMain.handle('set-selected-source', async (event, sourceId) => {
  selectedSourceId = sourceId;
  console.log('Selected source ID set to:', sourceId);
  return true;
});

// Note: get-screen-sources IPC handler removed - using getDisplayMedia session handler instead
// for better audio capture support

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // On macOS, apps usually stay active until Cmd+Q
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
