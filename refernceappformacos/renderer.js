let mediaRecorder;
let recordedChunks = [];
let stream = null;
let selectedSource = null;
let availableSources = [];

const logEl = document.getElementById('log');
const audioEl = document.getElementById('monitor');
const btn = document.getElementById('btn');
const previewEl = document.getElementById('preview');
const screenSelectEl = document.getElementById('screenSelect');
const selectScreenBtn = document.getElementById('selectScreen');
const startRecordingBtn = document.getElementById('startRecording');
const stopRecordingBtn = document.getElementById('stopRecording');
const downloadRecordingBtn = document.getElementById('downloadRecording');
const cleanupStreamBtn = document.getElementById('cleanupStream');
const statusEl = document.getElementById('status');

function log(line) {
  logEl.textContent += new Date().toLocaleTimeString() + ': ' + line + '\n';
  logEl.scrollTop = logEl.scrollHeight;
}

function updateStatus(isRecording) {
  if (isRecording) {
    statusEl.textContent = 'Recording...';
    statusEl.className = 'status recording';
  } else {
    statusEl.textContent = 'Not Recording';
    statusEl.className = 'status stopped';
  }
}

function updateButtons() {
  const hasStream = stream !== null;
  const isRecording = mediaRecorder && mediaRecorder.state === 'recording';
  const hasSelectedSource = getSelectedSource() !== null;
  
  selectScreenBtn.disabled = isRecording || !hasSelectedSource;
  startRecordingBtn.disabled = !hasStream || isRecording;
  stopRecordingBtn.disabled = !isRecording;
  downloadRecordingBtn.disabled = recordedChunks.length === 0;
  cleanupStreamBtn.disabled = isRecording; // Can't cleanup while recording
}

// Microphone functionality (existing)
btn.addEventListener('click', async () => {
  try {
    log('Requesting microphone…');
    const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Optional: play back mic input so you can verify it works
    audioEl.srcObject = micStream;
    log('Microphone granted ✅');

    // Example: inspect tracks
    micStream.getAudioTracks().forEach(t => log(`Track: ${t.label} (${t.kind})`));
  } catch (err) {
    log('Microphone denied or error ❌');
    log(String(err));
  }
});

// Screen recording functionality
async function selectScreen() {
  try {
    // Check if a source is selected
    const selectedSource = getSelectedSource();
    if (!selectedSource) {
      log('Please select a screen or window from the dropdown first');
      return;
    }
    
    log(`Requesting screen capture for: ${selectedSource.name} (${selectedSource.type})`);
    
    // Set the selected source in the main process before starting capture
    if (window.electronAPI && window.electronAPI.setSelectedSource) {
      try {
        await window.electronAPI.setSelectedSource(selectedSource.id);
        log(`Source set to: ${selectedSource.name}`);
      } catch (error) {
        log('Error setting source: ' + error.message);
      }
    }
    
    // Get the specific source from Electron
    let electronSource;
    if (window.electronAPI && window.electronAPI.startSourceCapture) {
      try {
        electronSource = await window.electronAPI.startSourceCapture(selectedSource.id);
        log(`Electron source obtained: ${electronSource.name}`);
      } catch (error) {
        log('Failed to get Electron source, falling back to getDisplayMedia: ' + error.message);
      }
    }
    
    // Use getDisplayMedia - the Electron session handler should now use the selected source
    // since we've set useSystemPicker: false and the handler checks for requested sources
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      audio: true, // This will capture system audio
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 }
      }
    });
    
    // Check if the selected source matches what was actually captured
    const videoTrack = screenStream.getVideoTracks()[0];
    if (videoTrack) {
      log(`Captured video track: ${videoTrack.label}`);
      if (videoTrack.label !== selectedSource.name) {
        log(`Warning: Captured source "${videoTrack.label}" differs from selected "${selectedSource.name}"`);
        log('This may happen if the system picker was used instead of direct source selection');
        log('The system may have used a different source than requested');
      }
    }

    // Then, get the microphone stream
    log('Requesting microphone access...');
    const micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    // Combine both streams
    const combinedStream = new MediaStream();
    
    // Add all video tracks from screen capture
    screenStream.getVideoTracks().forEach(track => {
      combinedStream.addTrack(track);
    });
    
    // Add all audio tracks from both sources
    screenStream.getAudioTracks().forEach(track => {
      combinedStream.addTrack(track);
    });
    
    micStream.getAudioTracks().forEach(track => {
      // Rename the mic track to distinguish it
      track.label = 'Microphone';
      combinedStream.addTrack(track);
    });

    // Use the combined stream
    stream = combinedStream;
    
    // Show preview
    previewEl.srcObject = stream;
    log('Combined stream obtained: Screen + System Audio + Microphone ✅');
    
    // Log the tracks to verify everything is captured
    const audioTracks = stream.getAudioTracks();
    const videoTracks = stream.getVideoTracks();
    log(`Audio tracks: ${audioTracks.length}, Video tracks: ${videoTracks.length}`);
    
    if (audioTracks.length > 0) {
      audioTracks.forEach((track, index) => {
        log(`Audio track ${index + 1}: ${track.label} (enabled: ${track.enabled}, muted: ${track.muted})`);
      });
    } else {
      log('⚠️ No audio tracks found - audio may not be captured');
    }
    
    if (videoTracks.length > 0) {
      videoTracks.forEach((track, index) => {
        log(`Video track ${index}: ${track.label} (enabled: ${track.enabled})`);
      });
    }
    
    updateButtons();
    createAudioTrackControls(); // Update UI with new audio controls
    
    // Start monitoring audio levels
    startAudioLevelMonitoring();
    
  } catch (err) {
    log('Error selecting screen: ' + err.message);
    if (err.message.includes('permission')) {
      log('Permission denied. Check System Preferences > Security & Privacy > Screen Recording and Microphone');
    }
    console.error(err);
  }
}

function startRecording() {
  if (!stream) {
    log('No stream available');
    return;
  }

  try {
    recordedChunks = [];
    
    // Check available MIME types and select the best one
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm'
    ];
    
    let selectedMimeType = null;
    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        selectedMimeType = mimeType;
        break;
      }
    }
    
    if (!selectedMimeType) {
      log('No supported MIME type found, using default');
      selectedMimeType = 'video/webm';
    }
    
    log(`Using MIME type: ${selectedMimeType}`);
    
    // Create MediaRecorder with the selected MIME type
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: selectedMimeType,
      videoBitsPerSecond: 5000000 // 5 Mbps
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      log('Recording stopped. Total chunks: ' + recordedChunks.length);
      updateStatus(false);
      updateButtons();
      
      // Stop audio level monitoring
      stopAudioLevelMonitoring();
    };

    mediaRecorder.onerror = (event) => {
      log('MediaRecorder error: ' + event.error);
    };

    // Start recording
    mediaRecorder.start(1000); // Collect data every second
    log('Recording started with audio and video...');
    
    // Log which audio tracks are being recorded
    const recordingAudioTracks = stream.getAudioTracks().filter(track => track.enabled);
    if (recordingAudioTracks.length > 0) {
      log(`Recording ${recordingAudioTracks.length} audio track(s):`);
      recordingAudioTracks.forEach((track, index) => {
        log(`  - Track ${index + 1}: ${track.label}`);
      });
    } else {
      log('⚠️ Warning: No audio tracks are enabled for recording');
    }
    
    updateStatus(true);
    updateButtons();
    
  } catch (err) {
    log('Error starting recording: ' + err.message);
    console.error(err);
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    log('Recording stopped by user');
  }
}

function downloadRecording() {
  if (recordedChunks.length === 0) {
    log('No recording to download');
    return;
  }

  try {
    // Get the MIME type from the MediaRecorder if available
    const mimeType = mediaRecorder ? mediaRecorder.mimeType : 'video/webm';
    const blob = new Blob(recordedChunks, { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Determine file extension based on MIME type
    let extension = 'webm';
    if (mimeType.includes('mp4')) extension = 'mp4';
    else if (mimeType.includes('webm')) extension = 'webm';
    
    a.download = `screen-recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    log(`Recording downloaded successfully as .${extension} file`);
  } catch (err) {
    log('Error downloading recording: ' + err.message);
    console.error(err);
  }
}

// Audio track control functions
function toggleAudioTrack(trackIndex, enabled) {
  if (stream && stream.getAudioTracks()[trackIndex]) {
    const track = stream.getAudioTracks()[trackIndex];
    track.enabled = enabled;
    log(`Audio track ${trackIndex + 1} (${track.label}) ${enabled ? 'enabled' : 'disabled'}`);
  }
}

function muteAllAudioTracks() {
  if (stream) {
    stream.getAudioTracks().forEach((track, index) => {
      track.enabled = false;
      log(`Audio track ${index + 1} (${track.label}) muted`);
    });
  }
}

function unmuteAllAudioTracks() {
  if (stream) {
    stream.getAudioTracks().forEach((track, index) => {
      track.enabled = true;
      log(`Audio track ${index + 1} (${track.label}) unmuted`);
    });
  }
}

// Function to create audio track controls
function createAudioTrackControls() {
  if (!stream) return;
  
  const audioTracks = stream.getAudioTracks();
  if (audioTracks.length === 0) return;
  
  // Remove existing controls
  const existingControls = document.getElementById('audioControls');
  if (existingControls) {
    existingControls.remove();
  }
  
  // Create new controls container
  const controlsContainer = document.createElement('div');
  controlsContainer.id = 'audioControls';
  controlsContainer.className = 'audio-controls';
  controlsContainer.innerHTML = '<h4>Audio Track Controls:</h4>';
  
  audioTracks.forEach((track, index) => {
    const trackControl = document.createElement('div');
    trackControl.className = 'track-control';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = track.enabled;
    checkbox.id = `track-${index}`;
    
    const label = document.createElement('label');
    label.htmlFor = `track-${index}`;
    label.textContent = `${track.label || `Track ${index + 1}`}`;
    
    checkbox.addEventListener('change', (e) => {
      toggleAudioTrack(index, e.target.checked);
    });
    
    trackControl.appendChild(checkbox);
    trackControl.appendChild(label);
    controlsContainer.appendChild(trackControl);
  });
  
  // Add mute/unmute all buttons
  const muteAllBtn = document.createElement('button');
  muteAllBtn.textContent = 'Mute All Audio';
  muteAllBtn.onclick = muteAllAudioTracks;
  
  const unmuteAllBtn = document.createElement('button');
  unmuteAllBtn.textContent = 'Unmute All Audio';
  unmuteAllBtn.onclick = unmuteAllAudioTracks;
  
  controlsContainer.appendChild(muteAllBtn);
  controlsContainer.appendChild(unmuteAllBtn);
  
  // Insert after the preview element
  previewEl.parentNode.insertBefore(controlsContainer, previewEl.nextSibling);
}

// Audio level monitoring
let audioLevelInterval = null;

function startAudioLevelMonitoring() {
  if (!stream) return;
  
  const audioTracks = stream.getAudioTracks();
  if (audioTracks.length === 0) return;
  
  // Create audio context for level monitoring
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  audioTracks.forEach((track, index) => {
    if (track.enabled) {
      const source = audioContext.createMediaStreamSource(new MediaStream([track]));
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const level = Math.round((average / 255) * 100);
        
        // Update the track control with level indicator
        const trackControl = document.querySelector(`#track-${index}`);
        if (trackControl) {
          const levelIndicator = trackControl.querySelector('.level-indicator') || 
            (() => {
              const indicator = document.createElement('span');
              indicator.className = 'level-indicator';
              indicator.style.marginLeft = '1rem';
              indicator.style.fontSize = '12px';
              indicator.style.color = '#6c757d';
              trackControl.appendChild(indicator);
              return indicator;
            })();
          
          levelIndicator.textContent = `Level: ${level}%`;
          levelIndicator.style.color = level > 50 ? '#28a745' : level > 20 ? '#ffc107' : '#6c757d';
        }
      };
      
      // Update level every 100ms
      const interval = setInterval(updateLevel, 100);
      
      // Store interval for cleanup
      if (!audioLevelInterval) audioLevelInterval = [];
      audioLevelInterval.push(interval);
    }
  });
}

function stopAudioLevelMonitoring() {
  if (audioLevelInterval) {
    audioLevelInterval.forEach(interval => clearInterval(interval));
    audioLevelInterval = null;
  }
}

// Function to clean up the current stream
function cleanupStream() {
  if (stream) {
    // Stop all tracks
    stream.getTracks().forEach(track => {
      track.stop();
    });
    
    // Stop audio level monitoring
    stopAudioLevelMonitoring();
    
    // Clear the stream
    stream = null;
    
    // Clear preview
    if (previewEl.srcObject) {
      previewEl.srcObject = null;
    }
    
    // Remove audio controls
    const existingControls = document.getElementById('audioControls');
    if (existingControls) {
      existingControls.remove();
    }
    
    log('Stream cleaned up');
    updateButtons();
  }
}

// Event listeners for screen recording
selectScreenBtn.addEventListener('click', selectScreen);
startRecordingBtn.addEventListener('click', startRecording);
stopRecordingBtn.addEventListener('click', stopRecording);
downloadRecordingBtn.addEventListener('click', downloadRecording);
cleanupStreamBtn.addEventListener('click', cleanupStream);

// Add refresh button for screen sources
const refreshScreensBtn = document.createElement('button');
refreshScreensBtn.textContent = '🔄 Refresh Screens';
refreshScreensBtn.className = 'btn-primary refresh-btn';
refreshScreensBtn.onclick = populateScreenDropdown;

// Insert refresh button after the dropdown
screenSelectEl.parentNode.appendChild(refreshScreensBtn);

// Add source info display
const sourceInfoEl = document.createElement('div');
sourceInfoEl.className = 'source-info';
sourceInfoEl.style.display = 'none';
screenSelectEl.parentNode.appendChild(sourceInfoEl);

// Add change event listener to show source info
screenSelectEl.addEventListener('change', () => {
  const selectedSource = getSelectedSource();
  if (selectedSource) {
    sourceInfoEl.style.display = 'block';
    sourceInfoEl.innerHTML = `
      <strong>Selected:</strong> ${selectedSource.name}<br>
      <strong>Type:</strong> ${selectedSource.type === 'screen' ? 'Screen' : 'Window'}
    `;
    
    // Set the selected source in the main process
    if (window.electronAPI && window.electronAPI.setSelectedSource) {
      window.electronAPI.setSelectedSource(selectedSource.id).then(() => {
        log(`Source set to: ${selectedSource.name}`);
      }).catch(error => {
        log('Error setting source: ' + error.message);
      });
    }
  } else {
    sourceInfoEl.style.display = 'none';
  }
  
  // Update button states
  updateButtons();
});

// Populate dropdown on page load
populateScreenDropdown().then(() => {
  updateButtons();
});

// Good to show current permission state (Chrome permission model in renderer)
(async () => {
  if (navigator.permissions && navigator.permissions.query) {
    try {
      const status = await navigator.permissions.query({ name: 'microphone' });
      log('Initial renderer permission state: ' + status.state);
      status.onchange = () => log('Permission state changed: ' + status.state);
    } catch (_) {
      // some Chromium versions may not expose this permission
    }
  }
})();

// Initialize
log('Screen & Audio Recorder initialized');

// Debug: Check what APIs are available
log('Checking available APIs...');
if (window.electronAPI) {
  log('electronAPI available with methods: ' + Object.keys(window.electronAPI).join(', '));
} else {
  log('ERROR: electronAPI not available');
}

if (window.micAPI) {
  log('micAPI available with methods: ' + Object.keys(window.micAPI).join(', '));
} else {
  log('ERROR: micAPI not available');
}

updateButtons();

// Function to populate the screen dropdown
async function populateScreenDropdown() {
  try {
    // Show loading state
    screenSelectEl.innerHTML = '<option value="">Loading screens...</option>';
    screenSelectEl.disabled = true;
    refreshScreensBtn.disabled = true;
    
    if (window.electronAPI && window.electronAPI.getScreenSources) {
      availableSources = await window.electronAPI.getScreenSources();
      
      // Clear existing options
      screenSelectEl.innerHTML = '';
      
      // Add default option
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = 'Select a screen or window...';
      screenSelectEl.appendChild(defaultOption);
      
      // Add screen sources
      availableSources.forEach(source => {
        const option = document.createElement('option');
        option.value = source.id;
        option.textContent = `${source.type === 'screen' ? '🖥️' : '🪟'} ${source.name}`;
        screenSelectEl.appendChild(option);
      });
      
      log(`Loaded ${availableSources.length} screen sources`);
    } else {
      log('electronAPI not available, using default screen selection');
      screenSelectEl.innerHTML = '<option value="">API not available</option>';
    }
  } catch (error) {
    log('Error loading screen sources: ' + error.message);
    console.error(error);
    screenSelectEl.innerHTML = '<option value="">Error loading sources</option>';
  } finally {
    // Re-enable controls
    screenSelectEl.disabled = false;
    refreshScreensBtn.disabled = false;
  }
}

// Function to get the currently selected source
function getSelectedSource() {
  const selectedId = screenSelectEl.value;
  if (!selectedId) return null;
  
  return availableSources.find(source => source.id === selectedId);
}
