import React, { useState, useEffect } from 'react';
import { Square, Mic, MicOff } from 'lucide-react';
import { PiMicrophoneSlashBold, PiMicrophoneBold } from 'react-icons/pi';
import useAudioActivity from '@/hooks/useAudioActivity';

const WaveformSVG = ({ isRecording }) => {
  const [barHeights, setBarHeights] = useState([3.52334, 14.9742, 11.4509, 6.60627, 3.52334]);
  const [barYPositions, setBarYPositions] = useState([12.2384, 6.51294, 8.27466, 10.6969, 12.2384]);
  const { isMicActive, isSystemActive } = useAudioActivity(0.1);

  useEffect(() => {
    // Only animate when recording AND there's audio activity
    if (!isRecording || (!isMicActive && !isSystemActive)) {
      // Reset to base heights when no audio activity
      setBarHeights([3.52334, 14.9742, 11.4509, 6.60627, 3.52334]);
      setBarYPositions([12.2384, 6.51294, 8.27466, 10.6969, 12.2384]);
      return;
    }

    const interval = setInterval(() => {
      const newHeights = barHeights.map((_, index) => {
        // Generate random heights with some variation
        const minHeight = 3.52334;
        const maxHeight = index === 1 ? 14.9742 : index === 2 ? 11.4509 : index === 3 ? 8.60627 : 6.52334;
        return Math.random() * (maxHeight - minHeight) + minHeight;
      });
      
      const newYPositions = newHeights.map(height => {
        const centerY = 14; // Center of the 28px height
        return centerY - (height / 2);
      });

      setBarHeights(newHeights);
      setBarYPositions(newYPositions);
    }, 150);

    return () => clearInterval(interval);
  }, [isRecording, isMicActive, isSystemActive, barHeights]);

  return (
    <svg width="37" height="28" viewBox="0 0 37 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect 
        x="1.53611" 
        y="1.66831" 
        width="34.3526" 
        height="24.6634" 
        rx="3.52334" 
        stroke="#FAFAFA" 
        strokeWidth="1.76167"
      />
      <rect 
        x="11.6658" 
        y={barYPositions[0]} 
        width="1.76167" 
        height={barHeights[0]} 
        rx="0.880836" 
        fill="#FAFAFA"
        style={{ 
          transition: 'all 0.15s ease-out',
          opacity: isRecording ? 1 : 0.5
        }}
      />
      <rect 
        x="15.1891" 
        y={barYPositions[1]} 
        width="1.76167" 
        height={barHeights[1]} 
        rx="0.880836" 
        fill="#FAFAFA"
        style={{ 
          transition: 'all 0.15s ease-out',
          opacity: isRecording ? 1 : 0.5
        }}
      />
      <rect 
        x="18.7125" 
        y={barYPositions[2]} 
        width="1.76167" 
        height={barHeights[2]} 
        rx="0.880836" 
        fill="#FAFAFA"
        style={{ 
          transition: 'all 0.15s ease-out',
          opacity: isRecording ? 1 : 0.5
        }}
      />
      <rect 
        x="22.2357" 
        y={barYPositions[3]} 
        width="1.76167" 
        height={barHeights[3]} 
        rx="0.880836" 
        fill="#FAFAFA"
        style={{ 
          transition: 'all 0.15s ease-out',
          opacity: isRecording ? 1 : 0.5
        }}
      />
      <rect 
        x="25.759" 
        y={barYPositions[4]} 
        width="1.76167" 
        height={barHeights[4]} 
        rx="0.880836" 
        fill="#FAFAFA"
        style={{ 
          transition: 'all 0.15s ease-out',
          opacity: isRecording ? 1 : 0.5
        }}
      />
    </svg>
  );
};

const RecordingOverlay = ({
  isRecording = true,
  onStop,
  onMenuClick,
  onMicToggle,
  isMicMuted = false,
  isMicDisabled = false,
  audioLevel = 0,
  isMicrophoneEnabled = true
}) => {
  return (
    <div className="w-full h-full flex justify-center items-center">
      <div className="rounded-xl ">
        <div className="flex flex-col items-center px-1 py-3 gap-2">
          {/* Waveform Indicator */}
          <div className="flex items-center justify-center py-2 rounded-xl">
            <WaveformSVG isRecording={isRecording} />
          </div>

           {/* Stop Recording Button */}
           <button
            onClick={onStop}
            className="w-10 h-10 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg"
          >
            <Square className="w-4 h-4 text-white fill-white" />
          </button>

          {/* Microphone Mute/Unmute Button - Only show when microphone is enabled */}
          {isMicrophoneEnabled ? (
            <button
              onClick={onMicToggle}
              disabled={isMicDisabled}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-105 hover:bg-gray-500 shadow-lg `}
              title={isMicDisabled ? "Microphone disabled" : isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {isMicMuted ? (
                <PiMicrophoneSlashBold className="w-5 h-5 text-gray-400" />
              ) : (
                <PiMicrophoneBold className="w-5 h-5 text-white" />
              )}
            </button>
          ): <button
          disabled={!isMicrophoneEnabled}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-105 hover:bg-gray-500 shadow-lg `}
          title="Microphone disabled"
        >
            <PiMicrophoneSlashBold className="w-5 h-5 text-gray-400" />
        </button> }

         

          {/* Divider */}
          <div className="w-full h-px bg-gray-600/90" />

          {/* Menu Button */}
          <button
          style={{ WebkitAppRegion: 'drag' }}
            className="py-2 px-1 rounded-xl transition-colors duration-200 "
          >
            <div className="grid grid-rows-2 grid-cols-3 gap-1" style={{ WebkitAppRegion: 'drag' }}>
              <div className="w-1 h-1 bg-white rounded-full" />
              <div className="w-1 h-1 bg-white rounded-full" />
              <div className="w-1 h-1 bg-white rounded-full" />
              <div className="w-1 h-1 bg-white rounded-full" />
              <div className="w-1 h-1 bg-white rounded-full" />
              <div className="w-1 h-1 bg-white rounded-full" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export function OverlayPage({isMicMuted, setIsMicMuted}) {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  // const [isMicMuted, setIsMicMuted] = useState(false);
  const [isMicDisabled, setIsMicDisabled] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isMicrophoneEnabled, setIsMicrophoneEnabled] = useState(true);

  // Add overlay-page class to body for transparent background
  useEffect(() => {
    document.body.classList.add('overlay-page');
    return () => {
      document.body.classList.remove('overlay-page');
    };
  }, []);

  // Listen for microphone mute state changes from main process
  useEffect(() => {
    const handleMicrophoneMuteToggle = (event, { isMuted }) => {
      console.log('OverlayPage received microphone mute toggle:', isMuted);
      setIsMicMuted(isMuted);
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
  }, [setIsMicMuted]);

  // Listen for microphone enabled state changes from main process
  useEffect(() => {
    const handleMicrophoneEnabledUpdate = (event, { isEnabled }) => {
      console.log('OverlayPage received microphone enabled update:', isEnabled);
      setIsMicrophoneEnabled(isEnabled);
    };

    // Listen for enabled state changes from main process
    if (window.api && window.api.onMicrophoneEnabledUpdate) {
      window.api.onMicrophoneEnabledUpdate(handleMicrophoneEnabledUpdate);
    }

    return () => {
      // Cleanup listener if needed
      if (window.api && window.api.removeMicrophoneEnabledUpdate) {
        window.api.removeMicrophoneEnabledUpdate(handleMicrophoneEnabledUpdate);
      }
    };
  }, []);

  // Debug: Log microphone state changes
  useEffect(() => {
    console.log('OverlayPage microphone state changed:', isMicMuted);
  }, [isMicMuted]);

  // Query current microphone state when overlay mounts (since it's in a separate window)
  useEffect(() => {
    const queryCurrentMicrophoneState = async () => {
      try {
        if (window.api && window.api.getCurrentMicrophoneState) {
          const result = await window.api.getCurrentMicrophoneState();
          console.log('OverlayPage queried current microphone state:', result);
          if (result && result.success && typeof result.isMuted === 'boolean') {
            setIsMicMuted(result.isMuted);
          }
        }
      } catch (error) {
        console.log('Could not query current microphone state:', error);
      }
    };

    // Query after a short delay to ensure the main process is ready
    const timer = setTimeout(queryCurrentMicrophoneState, 100);
    return () => clearTimeout(timer);
  }, []);

  // Debug: Log microphone enabled state changes
  useEffect(() => {
    console.log('OverlayPage microphone enabled state changed:', isMicrophoneEnabled);
  }, [isMicrophoneEnabled]);



  // Audio level detection
  useEffect(() => {
    let audioContext = null;
    let analyser = null;
    let microphone = null;
    let animationFrame = null;

    const startAudioDetection = async () => {
      try {
        // Get microphone stream
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Create audio context and analyser
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        
        // Connect microphone to analyser
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        
        // Start monitoring audio levels
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        const updateAudioLevel = () => {
          analyser.getByteFrequencyData(dataArray);
          
          // Calculate average audio level (0-1)
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
          const normalizedLevel = average / 255;
          
          setAudioLevel(normalizedLevel);
          animationFrame = requestAnimationFrame(updateAudioLevel);
        };
        
        updateAudioLevel();
        
      } catch (error) {
        console.log('Audio detection not available:', error.message);
        // If microphone access fails, just show static logo
        setAudioLevel(0);
      }
    };

    startAudioDetection();

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      if (microphone) {
        microphone.disconnect();
      }
      if (audioContext) {
        audioContext.close();
      }
    };
  }, []);

  // Mouse event handlers for dragging
  const handleMouseDown = (e) => {
    if (e.target.closest('button')) return; // Don't drag when clicking buttons
    
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    // Keep overlay within screen bounds
    const maxX = window.innerWidth - 300; // overlay width
    const maxY = window.innerHeight - 80; // overlay height
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add/remove global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  // Handle stop recording
  const handleStopRecording = () => {
    if (window.api && window.api.stopRecordingFromOverlay) {
      window.api.stopRecordingFromOverlay();
    }
  };

  // Handle microphone toggle
  const handleMicToggle = () => {
    const newMuteState = !isMicMuted;
    setIsMicMuted(newMuteState);
    
    // Send mute state to main process
    if (window.api && window.api.toggleMicrophoneMute) {
      window.api.toggleMicrophoneMute(newMuteState);
    }
  };

  // Handle menu click
  const handleMenuClick = () => {
    // TODO: Implement menu functionality
    console.log('Menu clicked');
  };

  return (
    <div
      className="flex justify-center items-center rounded-2xl fixed inset-0 w-full h-full"
      onMouseDown={handleMouseDown}
    >
      <RecordingOverlay
        isRecording={true}
        onStop={handleStopRecording}
        onMenuClick={handleMenuClick}
        onMicToggle={handleMicToggle}
        isMicMuted={isMicMuted}
        isMicDisabled={isMicDisabled}
        audioLevel={audioLevel}
        isMicrophoneEnabled={isMicrophoneEnabled}
      />
    </div>
  );
}
