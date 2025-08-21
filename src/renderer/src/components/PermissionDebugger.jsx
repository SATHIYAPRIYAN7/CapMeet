import React, { useState, useEffect } from 'react';

export default function PermissionDebugger() {
  const [permissionState, setPermissionState] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkPermissionState = async () => {
    if (!window.api?.getMicrophonePermissionState) return;
    
    setIsLoading(true);
    try {
      const state = await window.api.getMicrophonePermissionState();
      setPermissionState(state);
    } catch (error) {
      console.error('Error checking permission state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetPermissionState = async () => {
    if (!window.api?.resetMicrophonePermissionState) return;
    
    setIsLoading(true);
    try {
      const result = await window.api.resetMicrophonePermissionState();
      if (result.success) {
        await checkPermissionState();
      }
    } catch (error) {
      console.error('Error resetting permission state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const requestPermission = async () => {
    if (!window.api?.requestMicrophonePermission) return;
    
    setIsLoading(true);
    try {
      const result = await window.api.requestMicrophonePermission();
      console.log('Permission request result:', result);
      await checkPermissionState();
    } catch (error) {
      console.error('Error requesting permission:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkPermissionState();
  }, []);

  if (!window.api?.getMicrophonePermissionState) {
    return null; // Only show on macOS
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg max-w-sm">
      <h3 className="text-sm font-semibold mb-2">Microphone Permission Debug</h3>
      
      {permissionState && (
        <div className="text-xs space-y-1 mb-3">
          <div>Status: <span className="font-mono">{permissionState.currentStatus}</span></div>
          <div>Global Granted: <span className="font-mono">{permissionState.globalGranted ? 'true' : 'false'}</span></div>
          <div>Global Requested: <span className="font-mono">{permissionState.globalRequested ? 'true' : 'false'}</span></div>
        </div>
      )}
      
      <div className="flex space-x-2">
        <button
          onClick={checkPermissionState}
          disabled={isLoading}
          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-xs"
        >
          Refresh
        </button>
        
        <button
          onClick={resetPermissionState}
          disabled={isLoading}
          className="px-2 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded text-xs"
        >
          Reset
        </button>
        
        <button
          onClick={requestPermission}
          disabled={isLoading}
          className="px-2 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded text-xs"
        >
          Request
        </button>
      </div>
      
      {isLoading && (
        <div className="text-xs text-gray-400 mt-2">Loading...</div>
      )}
    </div>
  );
}
