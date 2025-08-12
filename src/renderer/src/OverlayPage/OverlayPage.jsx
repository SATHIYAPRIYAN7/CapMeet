import React, { useState, useEffect } from 'react';
import { Square } from 'lucide-react';

const WaveformSVG = ({ isRecording }) => {
  const [barHeights, setBarHeights] = useState([3.52334, 14.9742, 11.4509, 6.60627, 3.52334]);
  const [barYPositions, setBarYPositions] = useState([12.2384, 6.51294, 8.27466, 10.6969, 12.2384]);

  useEffect(() => {
    if (!isRecording) return;

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
  }, [isRecording, barHeights]);

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
  onMenuClick
}) => {
  return (
    <div className="w-full  h-full flex justify-center items-center">
      <div className="rounded-xl ">
        <div className="flex items-center px-4 py-3 gap-4">
          {/* Waveform Indicator */}
          <div className="flex items-center justify-center py-2 rounded-xl">
            <WaveformSVG isRecording={isRecording} />
          </div>

          {/* Divider */}
          {/* <div className="w-px h-8 bg-gray-600/50" /> */}

          {/* Stop Recording Button */}
          <button
            onClick={onStop}
            className="w-10 h-10 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg"
          >
            <Square className="w-4 h-4 text-white fill-white" />
          </button>

          {/* Divider */}
          <div className="w-px h-20 bg-gray-600/50" />

          {/* Menu Button */}
          <button
          style={{ WebkitAppRegion: 'drag' }}
            className="py-2 px-1 rounded-xl transition-colors duration-200 "
          >
            <div className="grid grid-cols-2 gap-1" style={{ WebkitAppRegion: 'drag' }}>
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

export function OverlayPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Add overlay-page class to body for transparent background
  useEffect(() => {
    document.body.classList.add('overlay-page');
    return () => {
      document.body.classList.remove('overlay-page');
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
      />
    </div>
  );
}
