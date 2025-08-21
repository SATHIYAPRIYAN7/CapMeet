# Microphone Permission Fix for macOS

## Problem
The microphone permission was looping on macOS due to multiple permission requests and improper permission handling flow between the main process and renderer process.

## Root Causes
1. **Multiple permission requests**: Both `useAudioActivity` and `useScreenRecorder` hooks were independently requesting microphone access
2. **Permission checking loops**: The main process was requesting permissions at startup, but the renderer process was also trying to request them
3. **Lack of permission state coordination**: No proper coordination between main process permission state and renderer process permission requests

## Solution
Implemented a comprehensive permission management system that:

### 1. Main Process Changes (`src/main/index.js`)
- **Prevented multiple permission requests** by using global flags (`microphonePermissionRequested`, `microphonePermissionGranted`)
- **Improved permission request handler** to deny microphone access if not already granted (prevents looping)
- **Added permission state management** with functions to check, reset, and debug permission state
- **Enhanced logging** for better debugging

### 2. Renderer Process Changes
- **`useAudioActivity` hook**: Now checks permissions before requesting microphone access
- **`useScreenRecorder` hook**: Simplified permission flow using centralized `getMicrophoneAccess` function
- **Permission coordination**: Both hooks now use the same permission checking logic

### 3. New Debug Tools
- **`PermissionDebugger` component**: Visual tool to monitor and manage permission state
- **Permission state functions**: `getMicrophonePermissionState` and `resetMicrophonePermissionState`

## Key Changes Made

### Main Process (`src/main/index.js`)
```javascript
// Prevent multiple permission requests
if (micPermission !== 'granted' && !global.microphonePermissionRequested) {
  global.microphonePermissionRequested = true;
  // ... request permission
}

// Deny permission to prevent looping
if (micPermission !== 'granted' && !global.microphonePermissionGranted) {
  callback(false); // Deny to prevent looping
  return;
}
```

### Renderer Process (`src/renderer/src/hooks/useAudioActivity.jsx`)
```javascript
// Check permission before requesting access
if (window.api && window.api.checkMicrophonePermission) {
  const permissionStatus = await window.api.checkMicrophonePermission();
  if (permissionStatus.isGranted) {
    // Only request microphone access if permission granted
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  }
}
```

## Testing the Fix

### 1. Build and Run
```bash
npm run build
npm run electron:dev
```

### 2. Check Console Logs
Look for these log messages:
- "Setting up macOS-specific permissions..."
- "Microphone permission status checked: [status]"
- "Permission handler - Current microphone permission status: [status]"

### 3. Use Debug Component
The `PermissionDebugger` component will appear in development mode showing:
- Current permission status
- Global permission flags
- Buttons to refresh, reset, and request permissions

### 4. Test Permission Flow
1. **First run**: App should request permission once at startup
2. **Subsequent runs**: App should check existing permission without requesting again
3. **Permission denied**: App should show clear error message and not loop

## Expected Behavior

### ✅ Working Correctly
- Permission requested only once at startup
- No permission loops
- Clear error messages when permission denied
- Proper permission state management

### ❌ Still Problematic
- Multiple permission dialogs
- Console errors about permission loops
- App crashes or freezes

## Troubleshooting

### If Permission Still Loops
1. **Reset permission state** using the debug component
2. **Check System Preferences** > Security & Privacy > Privacy > Microphone
3. **Restart the app completely** after granting permission
4. **Check console logs** for permission-related messages

### Debug Commands
```javascript
// In renderer console
await window.api.getMicrophonePermissionState()
await window.api.resetMicrophonePermissionState()
await window.api.requestMicrophonePermission()
```

## Files Modified
- `src/main/index.js` - Main process permission handling
- `src/renderer/src/hooks/useAudioActivity.jsx` - Audio activity hook
- `src/renderer/src/hooks/useScreenRecorder.js` - Screen recorder hook
- `src/preload/index.js` - Preload script APIs
- `src/renderer/src/components/PermissionDebugger.jsx` - Debug component
- `src/renderer/src/App.jsx` - App component (debug component)

## Notes
- This fix is specifically for macOS (`darwin` platform)
- Other platforms will continue to use standard permission handling
- The debug component only appears in development mode
- Permission state is maintained across app sessions using global variables
