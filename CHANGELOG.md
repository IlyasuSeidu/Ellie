# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial project setup with Expo SDK 54
- TypeScript configuration with strict mode
- React Navigation setup (native stack and bottom tabs)
- Firebase integration for authentication and backend services
- React Native Paper UI component library
- Comprehensive testing setup (Jest + Detox)
- ESLint and Prettier code quality tools
- Pre-commit hooks with Husky and lint-staged
- GitHub Actions CI/CD pipelines
- Comprehensive project documentation

### Changed

- N/A

### Deprecated

- N/A

### Removed

- N/A

### Fixed

- N/A

### Security

- N/A

## [1.0.0] - YYYY-MM-DD

### Added

- Initial release
- User authentication (sign up, sign in, password reset)
- User profile management
- Firebase Firestore integration
- Firebase Storage for file uploads
- Offline support with AsyncStorage
- Push notification support
- Dark mode support
- Accessibility features

### Changed

- N/A

### Fixed

- N/A

### Security

- Implemented secure token storage with Expo SecureStore
- Added Firebase security rules for data protection

---

## Version Format

Versions follow Semantic Versioning (SemVer): `MAJOR.MINOR.PATCH`

- **MAJOR**: Incompatible API changes
- **MINOR**: New functionality (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

## Change Categories

### Added

New features added to the application.

### Changed

Changes in existing functionality.

### Deprecated

Features that will be removed in upcoming releases.

### Removed

Features that have been removed.

### Fixed

Bug fixes and corrections.

### Security

Security improvements and vulnerability patches.

## Release Process

1. Update version in `app.json`:

   ```json
   {
     "expo": {
       "version": "X.Y.Z",
       "ios": { "buildNumber": "N" },
       "android": { "versionCode": N }
     }
   }
   ```

2. Update `CHANGELOG.md` with release date

3. Create release commit:

   ```bash
   git commit -m "chore: release version X.Y.Z"
   ```

4. Create git tag:

   ```bash
   git tag -a vX.Y.Z -m "Release version X.Y.Z"
   git push origin vX.Y.Z
   ```

5. Build and deploy:
   ```bash
   eas build --platform all --profile production
   ```

## Example Entries

### Version 1.1.0 - 2024-02-15

#### Added

- User profile editing functionality
- Avatar upload with Firebase Storage
- Email verification flow
- Push notifications for important events
- In-app messaging system

#### Changed

- Updated authentication flow UI
- Improved error messages
- Enhanced loading states

#### Fixed

- Fixed crash on app startup for new users
- Resolved navigation back button issue
- Fixed keyboard hiding input fields

#### Security

- Updated Firebase SDK to latest version
- Implemented rate limiting for API calls

### Version 1.0.1 - 2024-01-20

#### Fixed

- Fixed login button not responding on some Android devices
- Resolved memory leak in image picker
- Fixed incorrect date formatting in user profiles

#### Security

- Patched vulnerability in authentication flow

---

## Migration Guides

### Upgrading from 0.x to 1.0

#### Breaking Changes

1. **Authentication API**: Changed from custom auth to Firebase Auth

   ```typescript
   // Before
   import { login } from './auth';

   // After
   import { signInWithEmailAndPassword } from 'firebase/auth';
   ```

2. **Navigation Structure**: Updated to React Navigation 7.x

   ```typescript
   // Before
   navigation.navigate('Home', { userId: '123' });

   // After
   navigation.navigate('Home', { screen: 'Profile', params: { userId: '123' } });
   ```

#### New Features

- Firebase integration
- Enhanced UI with React Native Paper
- Comprehensive testing suite

#### Migration Steps

1. Update dependencies: `npm install`
2. Update Firebase configuration
3. Run database migrations (if applicable)
4. Update authentication code
5. Test thoroughly

---

## Links

- [Repository](https://github.com/IlyasuSeidu/Ellie)
- [Issue Tracker](https://github.com/IlyasuSeidu/Ellie/issues)
- [Documentation](./README.md)

---

**Note**: This changelog is updated with each release. For a complete history, see the [git commit history](https://github.com/IlyasuSeidu/Ellie/commits/main).
