# API Reference

## Overview

This document provides comprehensive information about the APIs, services, and integrations used in the Ellie application.

## Table of Contents

- [Environment Variables](#environment-variables)
- [Firebase Configuration](#firebase-configuration)
- [Service APIs](#service-apis)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Authentication](#authentication)

## Environment Variables

### Required Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Firebase Configuration
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
FIREBASE_MEASUREMENT_ID=your_measurement_id

# App Configuration
APP_ENV=development  # development | staging | production
API_TIMEOUT=30000    # API request timeout in milliseconds

# Feature Flags (Optional)
ENABLE_ANALYTICS=true
ENABLE_CRASH_REPORTING=true
```

### Environment-Specific Configuration

#### Development (`.env.development`)

```env
APP_ENV=development
FIREBASE_PROJECT_ID=ellie-dev
API_TIMEOUT=60000
ENABLE_ANALYTICS=false
ENABLE_CRASH_REPORTING=false
```

#### Staging (`.env.staging`)

```env
APP_ENV=staging
FIREBASE_PROJECT_ID=ellie-staging
API_TIMEOUT=45000
ENABLE_ANALYTICS=true
ENABLE_CRASH_REPORTING=true
```

#### Production (`.env.production`)

```env
APP_ENV=production
FIREBASE_PROJECT_ID=ellie-prod
API_TIMEOUT=30000
ENABLE_ANALYTICS=true
ENABLE_CRASH_REPORTING=true
```

### Accessing Environment Variables

```typescript
import Constants from 'expo-constants';

const config = {
  firebaseApiKey: Constants.expoConfig?.extra?.firebaseApiKey,
  apiTimeout: Constants.expoConfig?.extra?.apiTimeout,
};
```

## Firebase Configuration

### Firebase Setup

#### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Add iOS and Android apps
4. Download configuration files:
   - iOS: `GoogleService-Info.plist`
   - Android: `google-services.json`

#### 2. Enable Firebase Services

- **Authentication**: Email/Password, Google Sign-In
- **Cloud Firestore**: NoSQL database
- **Cloud Storage**: File storage
- **Cloud Functions**: Serverless functions
- **Analytics**: User analytics
- **Crashlytics**: Crash reporting

### Firebase SDK Configuration

```typescript
// src/config/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
```

### Firebase Authentication

#### Sign Up with Email/Password

```typescript
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/config/firebase';

async function signUp(email: string, password: string) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw new Error(`Sign up failed: ${error.message}`);
  }
}
```

#### Sign In with Email/Password

```typescript
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/config/firebase';

async function signIn(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw new Error(`Sign in failed: ${error.message}`);
  }
}
```

#### Sign Out

```typescript
import { signOut } from 'firebase/auth';
import { auth } from '@/config/firebase';

async function logout() {
  try {
    await signOut(auth);
  } catch (error) {
    throw new Error(`Sign out failed: ${error.message}`);
  }
}
```

#### Password Reset

```typescript
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/config/firebase';

async function resetPassword(email: string) {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    throw new Error(`Password reset failed: ${error.message}`);
  }
}
```

### Firebase Firestore

#### Data Structure

```
users/
  {userId}/
    - email: string
    - displayName: string
    - photoURL: string
    - createdAt: timestamp
    - updatedAt: timestamp

profiles/
  {userId}/
    - bio: string
    - preferences: object
    - settings: object
```

#### Read Document

```typescript
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

async function getUser(userId: string) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    throw new Error(`Failed to fetch user: ${error.message}`);
  }
}
```

#### Write Document

```typescript
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

async function createUser(userId: string, userData: object) {
  try {
    await setDoc(doc(db, 'users', userId), {
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }
}
```

#### Update Document

```typescript
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

async function updateUser(userId: string, updates: object) {
  try {
    await updateDoc(doc(db, 'users', userId), {
      ...updates,
      updatedAt: new Date(),
    });
  } catch (error) {
    throw new Error(`Failed to update user: ${error.message}`);
  }
}
```

#### Delete Document

```typescript
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

async function deleteUser(userId: string) {
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (error) {
    throw new Error(`Failed to delete user: ${error.message}`);
  }
}
```

#### Query Collection

```typescript
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';

async function getUsersByEmail(email: string) {
  try {
    const q = query(collection(db, 'users'), where('email', '==', email));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    throw new Error(`Failed to query users: ${error.message}`);
  }
}
```

#### Real-time Listeners

```typescript
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';

function subscribeToUser(userId: string, callback: (data: any) => void) {
  const unsubscribe = onSnapshot(doc(db, 'users', userId), (doc) => {
    if (doc.exists()) {
      callback(doc.data());
    }
  });

  return unsubscribe; // Call to unsubscribe
}
```

### Firebase Cloud Storage

#### Upload File

```typescript
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/config/firebase';

async function uploadProfileImage(userId: string, imageUri: string) {
  try {
    const response = await fetch(imageUri);
    const blob = await response.blob();

    const storageRef = ref(storage, `profile-images/${userId}/avatar.jpg`);
    const snapshot = await uploadBytes(storageRef, blob);

    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }
}
```

#### Delete File

```typescript
import { ref, deleteObject } from 'firebase/storage';
import { storage } from '@/config/firebase';

async function deleteProfileImage(userId: string) {
  try {
    const storageRef = ref(storage, `profile-images/${userId}/avatar.jpg`);
    await deleteObject(storageRef);
  } catch (error) {
    throw new Error(`Failed to delete image: ${error.message}`);
  }
}
```

## Service APIs

### Authentication Service

```typescript
// src/services/auth.service.ts
interface AuthService {
  signUp(email: string, password: string): Promise<User>;
  signIn(email: string, password: string): Promise<User>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  getCurrentUser(): User | null;
  onAuthStateChanged(callback: (user: User | null) => void): () => void;
}
```

### User Service

```typescript
// src/services/user.service.ts
interface UserService {
  getUser(userId: string): Promise<User>;
  createUser(userId: string, userData: Partial<User>): Promise<void>;
  updateUser(userId: string, updates: Partial<User>): Promise<void>;
  deleteUser(userId: string): Promise<void>;
  uploadAvatar(userId: string, imageUri: string): Promise<string>;
}
```

### Storage Service

```typescript
// src/services/storage.service.ts
interface StorageService {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}
```

## Error Handling

### Error Types

```typescript
enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

interface AppError {
  type: ErrorType;
  message: string;
  code?: string;
  details?: any;
}
```

### Firebase Error Codes

| Error Code                  | Description                 | Handling                       |
| --------------------------- | --------------------------- | ------------------------------ |
| `auth/email-already-in-use` | Email is already registered | Prompt user to sign in         |
| `auth/invalid-email`        | Email format is invalid     | Show validation error          |
| `auth/weak-password`        | Password is too weak        | Show password requirements     |
| `auth/user-not-found`       | User doesn't exist          | Show error message             |
| `auth/wrong-password`       | Incorrect password          | Show error message             |
| `permission-denied`         | Insufficient permissions    | Check security rules           |
| `unavailable`               | Service unavailable         | Retry with exponential backoff |

### Error Handler

```typescript
function handleFirebaseError(error: any): AppError {
  switch (error.code) {
    case 'auth/email-already-in-use':
      return {
        type: ErrorType.AUTH_ERROR,
        message: 'This email is already registered',
        code: error.code,
      };
    case 'auth/invalid-email':
      return {
        type: ErrorType.VALIDATION_ERROR,
        message: 'Invalid email format',
        code: error.code,
      };
    case 'permission-denied':
      return {
        type: ErrorType.PERMISSION_ERROR,
        message: 'You do not have permission to perform this action',
        code: error.code,
      };
    default:
      return {
        type: ErrorType.UNKNOWN_ERROR,
        message: error.message || 'An unexpected error occurred',
        code: error.code,
      };
  }
}
```

## Rate Limiting

### Firebase Quotas

- **Firestore Reads**: 50,000/day (free tier)
- **Firestore Writes**: 20,000/day (free tier)
- **Storage**: 5 GB (free tier)
- **Authentication**: Unlimited (free tier)

### Implementing Rate Limiting

```typescript
// src/utils/rateLimiter.ts
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  canMakeRequest(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];

    // Filter out old requests
    const recentRequests = requests.filter((time) => now - time < windowMs);

    if (recentRequests.length >= maxRequests) {
      return false;
    }

    recentRequests.push(now);
    this.requests.set(key, recentRequests);
    return true;
  }
}

export const rateLimiter = new RateLimiter();
```

## Authentication

### JWT Tokens

Firebase Authentication uses JWT tokens for user sessions.

```typescript
import { auth } from '@/config/firebase';

async function getAuthToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (user) {
    return await user.getIdToken();
  }
  return null;
}
```

### Token Refresh

Firebase automatically refreshes tokens. To manually refresh:

```typescript
async function refreshToken(): Promise<string> {
  const user = auth.currentUser;
  if (user) {
    return await user.getIdToken(true); // Force refresh
  }
  throw new Error('No user signed in');
}
```

### Secure Storage

Use Expo SecureStore for sensitive data:

```typescript
import * as SecureStore from 'expo-secure-store';

async function saveToken(token: string) {
  await SecureStore.setItemAsync('authToken', token);
}

async function getToken(): Promise<string | null> {
  return await SecureStore.getItemAsync('authToken');
}

async function deleteToken() {
  await SecureStore.deleteItemAsync('authToken');
}
```

## Security Rules

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Public read, authenticated write
    match /public/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### Storage Security Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Users can only access their own files
    match /profile-images/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## API Response Types

### User Response

```typescript
interface User {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Error Response

```typescript
interface ErrorResponse {
  error: {
    type: ErrorType;
    message: string;
    code?: string;
    details?: any;
  };
}
```

## Future API Integrations

### Planned Integrations

1. **Push Notifications**: Firebase Cloud Messaging
2. **Analytics**: Firebase Analytics
3. **Crash Reporting**: Firebase Crashlytics
4. **Remote Config**: Firebase Remote Config
5. **A/B Testing**: Firebase A/B Testing

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Expo Firebase](https://docs.expo.dev/guides/using-firebase/)
- [Firebase Auth](https://firebase.google.com/docs/auth)
- [Cloud Firestore](https://firebase.google.com/docs/firestore)
- [Cloud Storage](https://firebase.google.com/docs/storage)
