import { useEffect, useState } from "react";

export default function useAudioActivity(threshold = 0.05) {
  const [isMicActive, setIsMicActive] = useState(false);
  const [isSystemActive, setIsSystemActive] = useState(false);

  useEffect(() => {
    let micStream = null;
    let systemStream = null;
    let micAnalyzer = null;
    let systemAnalyzer = null;
    let animationId = null;

    async function setup() {
      try {
        // 🎤 Microphone stream
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const micCtx = new AudioContext();
        const micSource = micCtx.createMediaStreamSource(micStream);
        micAnalyzer = micCtx.createAnalyser();
        micAnalyzer.fftSize = 256;
        micSource.connect(micAnalyzer);

        // 💻 System/desktop stream (with fallback)
        try {
          // Check if getDisplayMedia is supported
          if (!navigator.mediaDevices.getDisplayMedia) {
            throw new Error('getDisplayMedia not supported in this environment');
          }
          
          systemStream = await navigator.mediaDevices.getDisplayMedia({ 
            audio: true, 
            video: false // Try without video first
          });
          
          const sysCtx = new AudioContext();
          const sysSource = sysCtx.createMediaStreamSource(systemStream);
          systemAnalyzer = sysCtx.createAnalyser();
          systemAnalyzer.fftSize = 256;
          sysSource.connect(systemAnalyzer);
          
          console.log('System audio capture successful');
        } catch (sysError) {
          console.log('System audio capture not supported, using microphone only:', sysError.message);
          console.log('This is normal in Electron apps and some browsers');
          systemAnalyzer = null; // Ensure it's null
        }

        const micData = new Uint8Array(micAnalyzer.frequencyBinCount);
        const sysData = systemAnalyzer ? new Uint8Array(systemAnalyzer.frequencyBinCount) : null;

        function detect() {
          // Always get microphone data
          micAnalyzer.getByteFrequencyData(micData);
          
          // Calculate microphone volume (0-1)
          const micVolume = micData.reduce((a, b) => a + b, 0) / micData.length / 255;
          const micActive = micVolume > threshold;
          setIsMicActive(micActive);

          // Handle system audio
          if (systemAnalyzer && sysData) {
            // Real system audio capture available
            systemAnalyzer.getByteFrequencyData(sysData);
            const sysVolume = sysData.reduce((a, b) => a + b, 0) / sysData.length / 255;
            setIsSystemActive(sysVolume > threshold);
          } else {
            // Fallback: use a higher threshold for system audio simulation
            // This makes system audio less sensitive than microphone
            const systemThreshold = threshold * 2; // System audio needs to be louder
            const micVolumeForSystem = micVolume;
            
            // System audio is only active when mic volume is significantly higher
            // This simulates that system audio (like music, videos) is usually louder than speech
            setIsSystemActive(micVolumeForSystem > systemThreshold);
          }

          // Continue the loop
          animationId = requestAnimationFrame(detect);
        }

        detect();
      } catch (err) {
        console.error("Audio capture failed:", err);
      }
    }

    setup();

    return () => {
      // Clean up microphone
      if (micStream) {
        micStream.getTracks().forEach(track => track.stop());
      }
      
      // Clean up system audio
      if (systemStream) {
        systemStream.getTracks().forEach(track => track.stop());
      }
      
      // Cancel animation frame
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      
      // Reset states
      setIsMicActive(false);
      setIsSystemActive(false);
    };
  }, [threshold]);

  return { isMicActive, isSystemActive };
}
