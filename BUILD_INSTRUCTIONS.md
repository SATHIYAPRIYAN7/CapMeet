# CapMeet Build Instructions

## Overview

This document provides instructions for building CapMeet for different platforms, with special focus on Mac builds that require proper entitlements for screen recording and audio capture.

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

## Local Build Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Development Mode

```bash
npm run dev
```

### 3. Build for Different Platforms

#### Windows
```bash
npm run build:win
```

#### macOS
```bash
npm run build:mac
```

#### Linux
```bash
npm run build:linux
```

#### All Platforms
```bash
npm run build:all
```

## Mac Build Configuration

### Entitlements

The Mac build requires specific entitlements for screen recording and audio capture. These are configured in:

- `build/entitlements.mac.plist` - Contains all necessary permissions
- `build/Info.plist` - Contains app metadata and usage descriptions

### Required Permissions

The app requires the following permissions on macOS:

- **Screen Recording**: `com.apple.security.device.camera`
- **Microphone Access**: `com.apple.security.device.audio-input`
- **Camera Access**: `com.apple.security.device.camera`
- **File System Access**: Various file access permissions
- **Network Access**: For API calls and updates

### Usage Descriptions

The app includes proper usage descriptions that will be shown to users:

- Microphone access for audio recording
- Camera access for video recording
- Screen capture for screen recording
- File system access for saving recordings

## GitHub Actions Build

### Automatic Builds

The repository includes GitHub Actions workflows that automatically build the app on:

- Push to `main` or `develop` branches
- Pull requests to `main` branch
- Release creation

### Workflows

1. **`.github/workflows/build.yml`** - Cross-platform builds
2. **`.github/workflows/mac-build.yml`** - Specialized Mac builds with entitlements verification

### Accessing Build Artifacts

1. Go to your GitHub repository
2. Click on "Actions" tab
3. Select the workflow run
4. Download artifacts from the "Artifacts" section

### Mac Build Artifacts

Mac builds will create:
- `.dmg` files for distribution (universal binary)
- `.zip` files for direct installation (universal binary)
- **Universal binaries** that work on both Intel (x64) and Apple Silicon (arm64) Macs

## Build Configuration

### electron-builder.yml

The build configuration includes:

- **App ID**: `com.capmeet.app`
- **Product Name**: `CapMeet`
- **Platform-specific settings** for Windows, Mac, and Linux
- **Proper entitlements** and Info.plist references
- **Icon configuration** using `resources/icon.png`

### Key Build Settings

```yaml
mac:
  target:
    - target: dmg
      arch: [universal]
    - target: zip
      arch: [universal]
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist
  extendInfo: build/Info.plist
  hardenedRuntime: false
```

## Troubleshooting

### Mac Build Issues

1. **Entitlements not found**: Ensure `build/entitlements.mac.plist` exists
2. **Info.plist not found**: Ensure `build/Info.plist` exists
3. **Permission denied**: Check that all required permissions are in entitlements

### Windows Build Issues

1. **NSIS errors**: Ensure Windows build tools are installed
2. **Icon not found**: Ensure `resources/icon.png` exists

### Linux Build Issues

1. **AppImage creation failed**: Install required dependencies
2. **Snap build failed**: Ensure snapcraft is configured

## Release Process

### Creating a Release

1. Create a new release on GitHub
2. Tag it with a version (e.g., `v1.0.0`)
3. GitHub Actions will automatically build and upload artifacts
4. Download and test the builds
5. Publish the release

### Version Management

- Update version in `package.json`
- Update version in `build/Info.plist` for Mac
- Tag releases with semantic versioning

## Security Considerations

### Code Signing

For production releases, consider:

1. **Apple Developer Account** for Mac code signing
2. **Windows Certificate** for Windows code signing
3. **Notarization** for Mac builds (requires Apple Developer account)

### Entitlements Security

The entitlements file grants necessary permissions but should be reviewed for:

- **Principle of least privilege**: Only grant required permissions
- **Regular audits**: Review permissions periodically
- **Documentation**: Keep track of why each permission is needed

## Development Tips

### Testing Mac Builds

1. Use GitHub Actions for Mac builds (free for public repos)
2. Test on actual Mac hardware when possible
3. Verify entitlements work correctly
4. Test screen recording and audio capture

### Debugging Build Issues

1. Check GitHub Actions logs for detailed error messages
2. Verify all required files exist
3. Test builds locally when possible
4. Use `npm run build` to test the build process

## Support

For build-related issues:

1. Check the GitHub Actions logs
2. Verify all configuration files exist
3. Test with minimal changes
4. Review the electron-builder documentation 