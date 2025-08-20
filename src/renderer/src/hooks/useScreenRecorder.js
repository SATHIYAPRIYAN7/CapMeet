import { useRef, useState, useEffect } from 'react';

export function useScreenRecorder({
  micEnabled,
  systemAudioEnabled,
  audioOnly,
  selectedScreenSource
}) {
  const mediaRecorderRef = useRef(null);
  const chunks = useRef([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const micStreamRef = useRef(null);
  const screenStreamRef = useRef(null);

  // Listen for microphone mute state changes from overlay
  useEffect(() => {
    const handleMicrophoneMuteToggle = (event, { isMuted }) => {
      setIsMicMuted(isMuted);
      
      // Apply mute state to microphone tracks in real-time
      if (micStreamRef.current) {
        micStreamRef.current.getAudioTracks().forEach(track => {
          track.enabled = !isMuted;
        });
        console.log('Microphone tracks muted:', isMuted);
      }
    };

    // Listen for mute state changes from main process
    if (window.api && window.api.onMicrophoneMuteToggle) {
      window.api.onMicrophoneMuteToggle(handleMicrophoneMuteToggle);
    }

    return () => {
      // Cleanup listener if needed
      if (window.api && window.api.removeMicrophoneMuteToggle) {
        window.api.removeMicrophoneMuteToggle(handleMicrophoneMuteToggle);
      }
    };
  }, []);

  // Background upload function (non-blocking)
  const uploadRecordingInBackground = async (filePath, buffer, filename, contentType) => {
    try {
      console.log('Starting background upload to S3...', { contentType });
      setIsUploading(true);
      
      // Try to upload to S3 first
      const uploadResult = await window.electronAPI.uploadFileToS3(filePath, buffer, filename, contentType);
      
      if (uploadResult.success) {
        console.log('Recording uploaded to S3 successfully:', uploadResult.data);
        // Show success notification
        if (window.showNotification) {
          window.showNotification('Recording uploaded to S3 successfully!', 'success');
        }
      } else {
        console.error('S3 upload failed:', uploadResult.error);
        // Fallback to local save
        console.log('Falling back to local save...');

        const latestRecordedData = {
          filename: filename,
          filePath: filePath,
          fileSize: buffer.length,
          fileSizeMB: (buffer.length / 1024 / 1024)?.toFixed(2),
          status: 'Failed to upload',
          startTime: new Date().toISOString(),
        }
    
        localStorage.setItem('latestRecordedData', JSON.stringify(latestRecordedData))
        window.electronAPI.saveFile(filePath, buffer);
        
        if (window.showNotification) {
          window.showNotification('S3 upload failed, saved locally instead', 'warning');
        }
      }
    } catch (uploadError) {
      console.error('S3 upload error:', uploadError);
      // Fallback to local save
      console.log('Falling back to local save due to upload error...');
      const latestRecordedData = {
        filename: filename,
        filePath: filePath,
        fileSize: buffer.length,
        fileSizeMB: (buffer.length / 1024 / 1024)?.toFixed(2),
        status: 'Failed to upload',
        startTime: new Date().toISOString(),
      }
  
      localStorage.setItem('latestRecordedData', JSON.stringify(latestRecordedData))
      window.electronAPI.saveFile(filePath, buffer);
      
      if (window.showNotification) {
        window.showNotification('S3 upload failed, saved locally instead', 'warning');
      }
    } finally {
      setIsUploading(false);
    }
  };

  // Helper function to get supported MIME type
  function getSupportedMimeType() {
    // Prioritize audio MIME types when in audio-only mode
    const types = audioOnly ? [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4'
    ] : [
      // 'video/webm;codecs=vp9,opus',
      // 'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
      'audio/webm;codecs=opus',
      'audio/webm'
    ];
    
    console.log(`Checking supported MIME types for ${audioOnly ? 'audio-only' : 'video+audio'} mode...`);
    for (const type of types) {
      const isSupported = MediaRecorder.isTypeSupported(type);
      console.log(`MIME type "${type}": ${isSupported ? 'SUPPORTED' : 'NOT SUPPORTED'}`);
      if (isSupported) {
        console.log('Using MIME type:', type);
        return type;
      }
    }
    
    // Fallback based on mode
    const fallback = audioOnly ? 'audio/webm' : 'video/webm';
    console.log(`No specific MIME type supported, using fallback: ${fallback}`);
    return fallback;
  }

  // Helper function to test microphone access
  async function testMicrophoneAccess() {
    try {
      console.log('Testing microphone access...');
      
      // Try the simplest possible approach
      const testStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });
      
      console.log('Microphone test successful!');
      console.log('Test stream tracks:', testStream.getAudioTracks().length);
      testStream.getAudioTracks().forEach((track, index) => {
        console.log(`Test track ${index}:`, track.label, track.enabled, track.readyState);
      });
      
      // Stop the test stream
      testStream.getTracks().forEach(track => track.stop());
      
      return true;
    } catch (error) {
      console.error('Microphone test failed:', error);
      return false;
    }
  }

  // Helper function to get microphone access (matching working reference app)
  async function getMicrophoneAccess() {
    try {
      console.log('Requesting microphone access...');
      console.log('Platform:', navigator.platform);
      console.log('User agent:', navigator.userAgent);
      
      // Use simpler constraints that work (from working reference app)
      const micConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        },
        video: false
      };
      
      console.log('Microphone constraints:', micConstraints);
      
      // For macOS, try a more permissive approach (same as working reference app)
      if (navigator.platform === 'MacIntel' || navigator.platform === 'MacPPC') {
        console.log('macOS detected - using enhanced microphone access');
        
        // First try to get microphone access directly
        try {
          const micStream = await navigator.mediaDevices.getUserMedia(micConstraints);
          console.log('Microphone access granted successfully on macOS');
          console.log('Microphone tracks:', micStream.getAudioTracks().length);
          micStream.getAudioTracks().forEach((track, index) => {
            console.log(`Track ${index}:`, track.label, track.enabled, track.readyState);
          });
          return micStream;
        } catch (directError) {
          console.log('Direct microphone access failed, trying alternative approach:', directError.message);
          
          // Try with more basic constraints
          const micStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
          });
          console.log('Microphone access granted with basic constraints on macOS');
          console.log('Microphone tracks:', micStream.getAudioTracks().length);
          micStream.getAudioTracks().forEach((track, index) => {
            console.log(`Track ${index}:`, track.label, track.enabled, track.readyState);
          });
          return micStream;
        }
      } else {
        // For other platforms, use standard approach
        console.log('Non-macOS platform - using standard microphone access');
        const micStream = await navigator.mediaDevices.getUserMedia(micConstraints);
        console.log('Microphone access granted successfully');
        console.log('Microphone tracks:', micStream.getAudioTracks().length);
        micStream.getAudioTracks().forEach((track, index) => {
          console.log(`Track ${index}:`, track.label, track.enabled, track.readyState);
        });
        return micStream;
      }
    } catch (micError) {
      console.error('Microphone access failed:', micError);
      console.error('Error name:', micError.name);
      console.error('Error message:', micError.message);
      
      // Enhanced error messages for macOS (same as working reference app)
      if (micError.name === 'NotAllowedError') {
        if (navigator.platform === 'MacIntel' || navigator.platform === 'MacPPC') {
          throw new Error('Microphone access denied on macOS. Please:\n1. Go to System Preferences > Security & Privacy > Privacy > Microphone\n2. Add "ClassCapsule Recorder" to the list\n3. Check the box next to the app\n4. Restart the app completely');
        } else {
          throw new Error('Microphone access denied. Please grant microphone permission and restart the app.');
        }
      } else if (micError.name === 'NotFoundError') {
        throw new Error('No microphone found. Please connect a microphone and try again.');
      } else if (micError.name === 'NotSupportedError') {
        throw new Error('Microphone not supported or not available on this device.');
      } else {
        throw new Error(`Microphone access failed: ${micError.message}`);
      }
    }
  }

  // Helper function to create mixed audio stream
  async function createMixedAudioStream() {
    try {
      console.log('Creating mixed audio stream...');
      
      // Create audio context for mixing
      const audioContext = new AudioContext();
      console.log('AudioContext created');
      const mixedAudio = audioContext.createMediaStreamDestination();
      console.log('MediaStreamDestination created');
      
      let audioSourcesAdded = 0;
      
      // Add system audio if available
      if (screenStreamRef.current && screenStreamRef.current.getAudioTracks().length > 0) {
        try {
          console.log('Adding system audio to mix...');
          const screenSource = audioContext.createMediaStreamSource(screenStreamRef.current);
          screenSource.connect(mixedAudio);
          console.log('System audio added to mix');
          audioSourcesAdded++;
        } catch (screenError) {
          console.warn('Failed to add system audio to mix:', screenError);
        }
      } else {
        console.log('No system audio available for mixing');
      }
      
      // Add microphone audio if available
      if (micStreamRef.current && micStreamRef.current.getAudioTracks().length > 0) {
        try {
          console.log('Adding microphone audio to mix...');
          const micSource = audioContext.createMediaStreamSource(micStreamRef.current);
          micSource.connect(mixedAudio);
          console.log('Microphone audio added to mix');
          audioSourcesAdded++;
        } catch (micError) {
          console.warn('Failed to add microphone audio to mix:', micError);
        }
      } else {
        console.log('No microphone audio available for mixing');
      }

      if (audioSourcesAdded === 0) {
        throw new Error('No audio sources could be added to the mix');
      }

      console.log(`Mixed audio stream created successfully with ${audioSourcesAdded} audio sources`);
      
      // Create a new MediaStream with the mixed audio
      const mixedStream = new MediaStream();
      console.log('New MediaStream created');
      
      // Add mixed audio tracks
      if (mixedAudio.stream.getAudioTracks().length > 0) {
        mixedAudio.stream.getAudioTracks().forEach(track => {
          console.log('Adding mixed audio track:', track.label);
          mixedStream.addTrack(track);
        });
      } else {
        console.error('No audio tracks in mixed audio stream');
        throw new Error('No audio tracks in mixed stream');
      }
      
      // Add video tracks from screen stream (for screen recording mode only)
      if (screenStreamRef.current && screenStreamRef.current.getVideoTracks().length > 0) {
        screenStreamRef.current.getVideoTracks().forEach(track => {
          console.log('Adding video track:', track.label);
          mixedStream.addTrack(track);
        });
      }
      
      console.log('Final mixed stream tracks:', mixedStream.getTracks().length);
      mixedStream.getTracks().forEach((track, index) => {
        console.log(`Mixed stream track ${index}:`, track.kind, track.label, track.enabled, track.readyState);
      });
      
      return mixedStream;
    } catch (error) {
      console.error('Failed to create mixed audio stream:', error);
      // Fallback to microphone only if mixing fails
      if (micStreamRef.current && micStreamRef.current.getAudioTracks().length > 0) {
        console.log('Falling back to microphone only');
        return micStreamRef.current;
      } else if (screenStreamRef.current && screenStreamRef.current.getAudioTracks().length > 0) {
        console.log('Falling back to system audio only');
        return screenStreamRef.current;
      } else {
        throw new Error('No audio sources available for mixing');
      }
    }
  }

  async function startRecording() {
    try {
      console.log('Starting recording...');
      console.log('window.api available:', !!window.api);
      console.log('window.api.getDisplayMedia available:', !!(window.api && window.api.getDisplayMedia));
      
      // Automatically unmute microphone when starting a new recording
      if (isMicMuted) {  
        setIsMicMuted(false);
        
        // Apply unmute state to microphone tracks in real-time
        if (micStreamRef.current) {
          micStreamRef.current.getAudioTracks().forEach(track => {
            track.enabled = true;
          });
        }
        
        // Send unmute state to main process
        if (window.api && window.api.toggleMicrophoneMute) {
          window.api.toggleMicrophoneMute(false);
        }
      }
      
      // Test microphone access first
      if (micEnabled) {
        console.log('Testing microphone access before recording...');
        const micTestResult = await testMicrophoneAccess();
        console.log('Microphone test result:', micTestResult);
      }
      
      const tracks = [];

      // Audio-only mode
      if (audioOnly) {
        console.log('Starting audio-only recording...');

        // Get system audio using the working reference app approach
        screenStreamRef.current = null;
        if (systemAudioEnabled) {
          try {
            console.log('Requesting system audio for audio-only recording...');
            
            // If we have screen sources, try using them first (like video+audio mode)
            if (window.api && window.api.getDisplayMedia) {
              const sources = await window.api.getDisplayMedia();
              if (sources && sources.length > 0) {
                console.log('Using screen sources for system audio capture...');
                
                // Use selected source if available, otherwise use the first available source
                let source;
                if (selectedScreenSource) {
                  source = sources.find(s => s.id === selectedScreenSource);
                  if (!source) {
                    console.warn('Selected source not found for audio-only, falling back to first available source');
                    source = sources[0];
                  }
                } else {
                  source = sources[0];
                }
                
                console.log('Selected source for audio-only:', source.name);
                
                try {
                  // Try using getDisplayMedia first (same as video+audio mode)
                  screenStreamRef.current = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                      width: { ideal: 1280, max: 1920 },
                      height: { ideal: 720, max: 1080 },
                      frameRate: { ideal: 24, max: 30 }
                    },
                    audio: systemAudioEnabled
                  });
                  console.log('Using getDisplayMedia successfully for audio-only');
                } catch (displayMediaError) {
                  console.log('getDisplayMedia failed, trying getUserMedia with source ID');
                  
                  // Fallback to getUserMedia with source ID (same as video+audio mode)
                  screenStreamRef.current = await navigator.mediaDevices.getUserMedia({
                    audio: {
                      mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: source.id
                      }
                    },
                    video: {
                      mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: source.id
                      }
                    }
                  });
                }
              } else {
                // Fallback to multiple approaches if no sources available
                console.log('No screen sources available, trying multiple approaches...');
                
                // Try multiple approaches for system audio capture
                const approaches = [
                  // Approach 1: Minimal video with audio
                  {
                    video: { width: 1, height: 1, frameRate: 1 },
                    audio: true
                  },
                  // Approach 2: No video, audio only (if supported)
                  {
                    video: false,
                    audio: true
                  },
                  // Approach 3: Standard video with audio
                  {
                    video: {
                      width: { ideal: 1280, max: 1920 },
                      height: { ideal: 720, max: 1080 },
                      frameRate: { ideal: 24, max: 30 }
                    },
                    audio: true
                  }
                ];
                
                let success = false;
                for (let i = 0; i < approaches.length; i++) {
                  try {
                    console.log(`Trying system audio approach ${i + 1}...`);
                    screenStreamRef.current = await navigator.mediaDevices.getDisplayMedia(approaches[i]);
                    
                    if (screenStreamRef.current && screenStreamRef.current.getAudioTracks().length > 0) {
                      console.log(`System audio access granted with approach ${i + 1}`);
                      console.log('System audio tracks:', screenStreamRef.current.getAudioTracks().length);
                      success = true;
                      break;
                    } else {
                      console.warn(`Approach ${i + 1} failed - no audio tracks`);
                      screenStreamRef.current = null;
                    }
                  } catch (approachError) {
                    console.warn(`Approach ${i + 1} failed:`, approachError.message);
                    screenStreamRef.current = null;
                  }
                }
                
                if (!success) {
                  console.error('All system audio capture approaches failed');
                  screenStreamRef.current = null;
                }
              }
            } else {
              console.warn('getDisplayMedia API not available');
            }
          } catch (screenError) {
            console.warn('System audio access denied for audio-only recording:', screenError);
            screenStreamRef.current = null;
          }
        } else {
          console.log('System audio disabled for audio-only recording');
        }

        // Get microphone audio using the working reference app approach
        micStreamRef.current = null;
        if (micEnabled) {
          try {
            console.log('Requesting microphone access for audio-only recording...');
            
            // Use the same microphone constraints as the working reference app
            const micConstraints = {
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 48000,
                channelCount: 2
              },
              video: false
            };
            
            // For macOS, try a more permissive approach (same as working reference app)
            if (navigator.platform === 'MacIntel' || navigator.platform === 'MacPPC') {
              console.log('macOS detected - using enhanced microphone access');
              
              // First try to get microphone access directly
              try {
                micStreamRef.current = await navigator.mediaDevices.getUserMedia(micConstraints);
                console.log('Microphone access granted successfully on macOS');
              } catch (directError) {
                console.log('Direct microphone access failed, trying alternative approach:', directError.message);
                
                // Try with more basic constraints
                micStreamRef.current = await navigator.mediaDevices.getUserMedia({
                  audio: true,
                  video: false
                });
                console.log('Microphone access granted with basic constraints on macOS');
              }
            } else {
              // For other platforms, use standard approach
              micStreamRef.current = await navigator.mediaDevices.getUserMedia(micConstraints);
              console.log('Microphone access granted successfully');
            }
            
            // Verify microphone access
            if (micStreamRef.current && micStreamRef.current.getAudioTracks().length > 0) {
              console.log(`Microphone access confirmed: ${micStreamRef.current.getAudioTracks().length} audio track(s)`);
            } else {
              throw new Error('No audio tracks available from microphone');
            }
            
          } catch (micError) {
            console.error('Microphone access failed:', micError);
            
            // Enhanced error messages for macOS (same as working reference app)
            if (micError.name === 'NotAllowedError') {
              if (navigator.platform === 'MacIntel' || navigator.platform === 'MacPPC') {
                throw new Error('Microphone access denied on macOS. Please:\n1. Go to System Preferences > Security & Privacy > Privacy > Microphone\n2. Add "ClassCapsule Recorder" to the list\n3. Check the box next to the app\n4. Restart the app completely');
              } else {
                throw new Error('Microphone access denied. Please grant microphone permission and restart the app.');
              }
            } else if (micError.name === 'NotFoundError') {
              throw new Error('No microphone found. Please connect a microphone and try again.');
            } else if (micError.name === 'NotSupportedError') {
              throw new Error('Microphone not supported or not available on this device.');
            } else {
              throw new Error(`Microphone access failed: ${micError.message}`);
            }
          }
        } else {
          console.log('Microphone recording disabled by user');
        }

        // Check if we have at least one audio source (same as working reference app)
        console.log('Audio source check:');
        console.log('- System audio enabled:', systemAudioEnabled);
        console.log('- Microphone enabled:', micEnabled);
        console.log('- Screen stream available:', !!screenStreamRef.current);
        console.log('- Mic stream available:', !!micStreamRef.current);
        
        if (screenStreamRef.current) {
          console.log('- Screen stream audio tracks:', screenStreamRef.current.getAudioTracks().length);
        }
        if (micStreamRef.current) {
          console.log('- Mic stream audio tracks:', micStreamRef.current.getAudioTracks().length);
        }
        
        // Check if we have at least one working audio source
        const hasScreenAudio = screenStreamRef.current && screenStreamRef.current.getAudioTracks().length > 0;
        const hasMicAudio = micStreamRef.current && micStreamRef.current.getAudioTracks().length > 0;
        
        console.log('- Has screen audio:', hasScreenAudio);
        console.log('- Has mic audio:', hasMicAudio);
        
        if (!hasScreenAudio && !hasMicAudio) {
          // Provide more specific error message based on what was attempted
          if (systemAudioEnabled && micEnabled) {
            throw new Error('Both system audio and microphone capture failed. Please check your permissions and try again. If you only want to record microphone, disable system audio and try again.');
          } else if (systemAudioEnabled) {
            throw new Error('System audio capture failed. Please check your screen sharing permissions and try again. You can also try enabling microphone as an alternative.');
          } else if (micEnabled) {
            throw new Error('Microphone capture failed. Please check your microphone permissions and try again.');
          } else {
            throw new Error('No audio sources available. Please enable system audio or microphone in the settings.');
          }
        }

        // Create audio context for mixing (same as working reference app)
        console.log('Creating audio context for mixing...');
        const audioContext = new AudioContext();
        const mixedAudio = audioContext.createMediaStreamDestination();
        
        let audioSourcesAdded = 0;
        
        // Add system audio if available
        if (screenStreamRef.current && screenStreamRef.current.getAudioTracks().length > 0) {
          try {
            const screenSource = audioContext.createMediaStreamSource(screenStreamRef.current);
            screenSource.connect(mixedAudio);
            console.log('System audio added to mix');
            audioSourcesAdded++;
          } catch (screenError) {
            console.warn('Failed to add system audio to mix:', screenError);
          }
        }
        
        // Add microphone audio if available
        if (micStreamRef.current && micStreamRef.current.getAudioTracks().length > 0) {
          try {
            const micSource = audioContext.createMediaStreamSource(micStreamRef.current);
            micSource.connect(mixedAudio);
            console.log('Microphone audio added to mix');
            audioSourcesAdded++;
          } catch (micError) {
            console.warn('Failed to add microphone audio to mix:', micError);
          }
        }

        if (audioSourcesAdded === 0) {
          throw new Error('No audio sources could be added to the mix');
        }

        console.log(`Mixed audio stream created successfully with ${audioSourcesAdded} audio sources`);
        
        // Add mixed audio tracks to the final stream
        mixedAudio.stream.getAudioTracks().forEach((track) => {
          track.enabled = true;
          tracks.push(track);
        });
        
        console.log('Audio-only tracks added:', tracks.length);
      } else {
        // Screen + Audio mode
        try {
          if (!window.api || !window.api.getDisplayMedia) {
            throw new Error('Screen capture API not available');
          }

          const sources = await window.api.getDisplayMedia();
          if (sources.length === 0) {
            throw new Error('No screen sources available');
          }

          // Use selected source if available, otherwise use the first available source
          let source;
          if (selectedScreenSource) {
            source = sources.find(s => s.id === selectedScreenSource);
            if (!source) {
              console.warn('Selected source not found, falling back to first available source');
              source = sources[0];
            }
          } else {
            source = sources[0];
          }
          
          console.log('Selected source:', source.name, source.id);
          console.log('Available sources:', sources.map(s => ({ name: s.name, id: s.id, type: s.type })));
          
          // Get screen stream with system audio
          screenStreamRef.current = await navigator.mediaDevices.getUserMedia({
            audio: systemAudioEnabled ? {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: source.id
              }
            } : false,
            video: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: source.id,
                minWidth: 1280,
                maxWidth: 1920,
                minHeight: 720,
                maxHeight: 1080
              }
            }
          });

          console.log('Screen stream obtained:', screenStreamRef.current.getTracks().length, 'tracks');
          
          // Get microphone stream separately if enabled
          if (micEnabled) {
            try {
              micStreamRef.current = await getMicrophoneAccess();
              console.log('Microphone stream obtained:', micStreamRef.current.getAudioTracks().length, 'tracks');
            } catch (error) {
              console.error('Microphone access failed:', error);
              throw error; // Re-throw to show user-friendly error
            }
          }

          // Create mixed audio stream using AudioContext (like working reference app)
          let finalStream;
          if (micStreamRef.current && micStreamRef.current.getAudioTracks().length > 0) {
            console.log('Creating mixed audio stream with AudioContext...');
            finalStream = await createMixedAudioStream();
          } else {
            console.log('Using screen stream only (no microphone)');
            finalStream = screenStreamRef.current;
          }

          // Add video tracks from screen stream
          finalStream.getVideoTracks().forEach((track) => {
            track.enabled = true;
            tracks.push(track);
          });

          // Add audio tracks from mixed stream
          finalStream.getAudioTracks().forEach((track) => {
            track.enabled = true;
            tracks.push(track);
          });
        } catch (error) {
          console.error('Failed to get display media:', error);
          throw new Error('Screen capture permission denied or not supported');
        }
      }

      if (tracks.length === 0) {
        throw new Error('No audio or video tracks available for recording');
      }

      console.log('Total tracks for recording:', tracks.length);
      tracks.forEach((track, index) => {
        console.log(`Track ${index}:`, track.kind, track.enabled, track.readyState, track.label);
      });

      const combinedStream = new MediaStream(tracks);
      const mimeType = getSupportedMimeType();
      
      console.log('Recording with MIME type:', mimeType, 'for', audioOnly ? 'audio-only' : 'video+audio', 'mode');

      const recorder = new MediaRecorder(combinedStream, {
        mimeType: mimeType
      });

      console.log('MediaRecorder created with MIME type:', mimeType);
      console.log('Combined stream tracks:', combinedStream.getTracks().length);
      combinedStream.getTracks().forEach((track, index) => {
        console.log(`Combined stream track ${index}:`, track.kind, track.label, track.enabled, track.readyState);
      });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.current.push(event.data);
          console.log('Data chunk received:', event.data.size, 'bytes, type:', event.data.type);
        }
      };

      recorder.onstart = () => {
        console.log('MediaRecorder started successfully');
        console.log('Recording state:', recorder.state);
      };

      recorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
      };

      recorder.onstop = async () => {
        console.log('MediaRecorder stopped, processing recording...');
        console.log('Total chunks:', chunks.current.length);
        console.log('Total data size:', chunks.current.reduce((sum, chunk) => sum + chunk.size, 0), 'bytes');
        
        try {
          const blob = new Blob(chunks.current, { type: mimeType });
          chunks.current = [];

          console.log('Blob created:', blob.size, 'bytes, type:', blob.type);

          const arrayBuffer = await blob.arrayBuffer();
          // Convert ArrayBuffer to Uint8Array for Electron
          const uint8Array = new Uint8Array(arrayBuffer);

          const downloadsPath = await window.electronAPI.getDownloadsPath();
          const filePath = `${downloadsPath}/recording-${Date.now()}.webm`;
          const filename = `recording-${Date.now()}.webm`;

          console.log('Starting background upload to S3...');
          
          // Start upload in background (non-blocking)
          uploadRecordingInBackground(filePath, uint8Array, filename, mimeType);
          
        } catch (error) {
          console.error('Error processing recording:', error);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000); // Start with 1-second timeslice for better handling
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert(`Recording failed: ${error.message}`);
    }
  }

  function stopRecording() {
    setTimeout(()=>{
      localStorage.removeItem('latestRecordedData')
    }, 500)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    // Clean up streams
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    
    setIsRecording(false);
  }

  return {
    startRecording,
    stopRecording,
    isRecording,
    isUploading,
    isMicMuted, // Expose the new state
    // Add microphone-only recording for testing
    startMicrophoneOnlyRecording: async () => {
      try {
        console.log('Starting microphone-only recording for testing...');
        
        const micStream = await getMicrophoneAccess();
        console.log('Microphone stream for testing:', micStream.getAudioTracks().length, 'tracks');
        
        const tracks = [];
        micStream.getAudioTracks().forEach((track) => {
          track.enabled = true;
          tracks.push(track);
        });
        
        const stream = new MediaStream(tracks);
        const mimeType = 'audio/webm;codecs=opus';
        
        console.log('Microphone-only recording with MIME type:', mimeType);
        
        const recorder = new MediaRecorder(stream, { mimeType });
        
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.current.push(event.data);
            console.log('Microphone-only data chunk:', event.data.size, 'bytes');
          }
        };
        
        recorder.onstop = async () => {
          const blob = new Blob(chunks.current, { type: mimeType });
          chunks.current = [];
          
          const arrayBuffer = await blob.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          
          const downloadsPath = await window.electronAPI.getDownloadsPath();
          const filePath = `${downloadsPath}/microphone-only-${Date.now()}.webm`;
          const filename = `microphone-only-${Date.now()}.webm`;
          
          console.log('Starting background upload for microphone-only recording...');
          
          // Start upload in background (non-blocking)
          uploadRecordingInBackground(filePath, uint8Array, filename, mimeType);
        };
        
        mediaRecorderRef.current = recorder;
        recorder.start(1000);
        setIsRecording(true);
        
        console.log('Microphone-only recording started');
      } catch (error) {
        console.error('Microphone-only recording failed:', error);
        alert(`Microphone-only recording failed: ${error.message}`);
      }
    }
  };
}
