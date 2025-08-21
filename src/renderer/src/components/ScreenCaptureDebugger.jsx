import React, { useState } from 'react';

export function ScreenCaptureDebugger() {
  const [testResult, setTestResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const testScreenCapture = async () => {
    setIsLoading(true);
    try {
      if (window.api && window.api.testScreenCapture) {
        const result = await window.api.testScreenCapture();
        setTestResult(result);
        console.log('Screen capture test result:', result);
      } else {
        setTestResult({ success: false, error: 'Test API not available' });
      }
    } catch (error) {
      setTestResult({ success: false, error: error.message });
      console.error('Screen capture test failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testGetDisplayMedia = async () => {
    setIsLoading(true);
    try {
      console.log('Testing getDisplayMedia...');
      
      // Test if getDisplayMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        setTestResult({ 
          success: false, 
          error: 'getDisplayMedia not available in this browser/context' 
        });
        return;
      }

      // Try to get display media
      const stream = await navigator.mediaDevices.getDisplayMedia({
        audio: true,
        video: {
          width: { ideal: 100, max: 100 },
          height: { ideal: 100, max: 100 }
        }
      });

      console.log('getDisplayMedia successful:', stream);
      console.log('Tracks:', stream.getTracks().length);
      stream.getTracks().forEach((track, index) => {
        console.log(`Track ${index}:`, track.kind, track.label, track.enabled);
      });

      // Stop all tracks
      stream.getTracks().forEach(track => track.stop());

      setTestResult({ 
        success: true, 
        message: 'getDisplayMedia successful',
        tracks: stream.getTracks().length,
        trackInfo: stream.getTracks().map(track => ({
          kind: track.kind,
          label: track.label,
          enabled: track.enabled
        }))
      });

    } catch (error) {
      console.error('getDisplayMedia test failed:', error);
      setTestResult({ 
        success: false, 
        error: error.message,
        errorName: error.name,
        errorStack: error.stack
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-4">Screen Capture Debugger</h3>
      
      <div className="space-y-3">
        <button
          onClick={testScreenCapture}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? 'Testing...' : 'Test Screen Capture API'}
        </button>
        
        <button
          onClick={testGetDisplayMedia}
          disabled={isLoading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 ml-2"
        >
          {isLoading ? 'Testing...' : 'Test getDisplayMedia'}
        </button>
      </div>

      {testResult && (
        <div className="mt-4 p-3 border rounded bg-white">
          <h4 className="font-medium mb-2">Test Result:</h4>
          <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify(testResult, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-600">
        <p><strong>Platform:</strong> {navigator.platform}</p>
        <p><strong>User Agent:</strong> {navigator.userAgent}</p>
        <p><strong>getDisplayMedia available:</strong> {navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia ? 'Yes' : 'No'}</p>
      </div>
    </div>
  );
}
