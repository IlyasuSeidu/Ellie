/**
 * Firebase Mocks for Testing
 *
 * Provides mock implementations of Firebase services for unit testing.
 */

/**
 * Mock Firebase App
 */
export const mockApp = {
  name: '[DEFAULT]',
  options: {
    apiKey: 'mock-api-key',
    authDomain: 'mock-auth-domain',
    projectId: 'mock-project-id',
    storageBucket: 'mock-storage-bucket',
    messagingSenderId: 'mock-sender-id',
    appId: 'mock-app-id',
  },
  automaticDataCollectionEnabled: false,
};

/**
 * Mock Firebase Auth
 */
export const mockAuth = {
  currentUser: null,
  signInWithEmailAndPassword: jest.fn().mockResolvedValue({
    user: {
      uid: 'mock-user-id',
      email: 'test@example.com',
      emailVerified: true,
    },
  }),
  createUserWithEmailAndPassword: jest.fn().mockResolvedValue({
    user: {
      uid: 'mock-user-id',
      email: 'test@example.com',
      emailVerified: false,
    },
  }),
  signOut: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendEmailVerification: jest.fn().mockResolvedValue(undefined),
  updateProfile: jest.fn().mockResolvedValue(undefined),
  updateEmail: jest.fn().mockResolvedValue(undefined),
  updatePassword: jest.fn().mockResolvedValue(undefined),
  onAuthStateChanged: jest.fn((callback) => {
    callback(null);
    return jest.fn(); // Unsubscribe function
  }),
};

/**
 * Mock Firestore Document Reference
 */
export const mockDocRef = {
  id: 'mock-doc-id',
  path: 'collection/mock-doc-id',
  set: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue({
    exists: () => true,
    data: () => ({ id: 'mock-doc-id', name: 'Test Document' }),
    id: 'mock-doc-id',
  }),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  onSnapshot: jest.fn((callback) => {
    callback({
      exists: () => true,
      data: () => ({ id: 'mock-doc-id', name: 'Test Document' }),
      id: 'mock-doc-id',
    });
    return jest.fn(); // Unsubscribe function
  }),
};

/**
 * Mock Firestore Collection Reference
 */
export const mockCollectionRef = {
  id: 'mock-collection',
  path: 'mock-collection',
  doc: jest.fn().mockReturnValue(mockDocRef),
  add: jest.fn().mockResolvedValue(mockDocRef),
  get: jest.fn().mockResolvedValue({
    docs: [
      {
        id: 'doc-1',
        data: () => ({ id: 'doc-1', name: 'Document 1' }),
        exists: () => true,
      },
      {
        id: 'doc-2',
        data: () => ({ id: 'doc-2', name: 'Document 2' }),
        exists: () => true,
      },
    ],
    empty: false,
    size: 2,
  }),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  startAfter: jest.fn().mockReturnThis(),
  endBefore: jest.fn().mockReturnThis(),
  onSnapshot: jest.fn((callback) => {
    callback({
      docs: [
        {
          id: 'doc-1',
          data: () => ({ id: 'doc-1', name: 'Document 1' }),
          exists: () => true,
        },
      ],
      empty: false,
      size: 1,
    });
    return jest.fn(); // Unsubscribe function
  }),
};

/**
 * Mock Firestore Query
 */
export const mockQuery = {
  get: jest.fn().mockResolvedValue({
    docs: [
      {
        id: 'doc-1',
        data: () => ({ id: 'doc-1', name: 'Document 1' }),
        exists: () => true,
      },
    ],
    empty: false,
    size: 1,
  }),
  onSnapshot: jest.fn((callback) => {
    callback({
      docs: [
        {
          id: 'doc-1',
          data: () => ({ id: 'doc-1', name: 'Document 1' }),
          exists: () => true,
        },
      ],
      empty: false,
      size: 1,
    });
    return jest.fn(); // Unsubscribe function
  }),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
};

/**
 * Mock Firestore
 */
export const mockFirestore = {
  collection: jest.fn().mockReturnValue(mockCollectionRef),
  doc: jest.fn().mockReturnValue(mockDocRef),
  runTransaction: jest.fn().mockResolvedValue(undefined),
  batch: jest.fn().mockReturnValue({
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn().mockResolvedValue(undefined),
  }),
  enableNetwork: jest.fn().mockResolvedValue(undefined),
  disableNetwork: jest.fn().mockResolvedValue(undefined),
  clearPersistence: jest.fn().mockResolvedValue(undefined),
  terminate: jest.fn().mockResolvedValue(undefined),
};

/**
 * Mock Storage Reference
 */
const mockMetadata = {
  name: 'file',
  fullPath: 'path/to/file',
  size: 1024,
  contentType: 'image/png',
};

export const mockStorageRef: Record<string, unknown> = {
  fullPath: 'path/to/file',
  name: 'file',
  bucket: 'mock-bucket',
  put: jest.fn(),
  putString: jest.fn(),
  getDownloadURL: jest.fn().mockResolvedValue('https://mock-url.com/file'),
  delete: jest.fn().mockResolvedValue(undefined),
  getMetadata: jest.fn().mockResolvedValue(mockMetadata),
  updateMetadata: jest.fn().mockResolvedValue(mockMetadata),
  child: jest.fn().mockReturnThis(),
};

// Set up put and putString after mockStorageRef is defined
(mockStorageRef.put as jest.Mock).mockImplementation(() =>
  Promise.resolve({
    ref: mockStorageRef,
    metadata: mockMetadata,
  })
);

(mockStorageRef.putString as jest.Mock).mockImplementation(() =>
  Promise.resolve({
    ref: mockStorageRef,
    metadata: { ...mockMetadata, contentType: 'text/plain' },
  })
);

/**
 * Mock Storage
 */
export const mockStorage = {
  ref: jest.fn().mockReturnValue(mockStorageRef),
  refFromURL: jest.fn().mockReturnValue(mockStorageRef),
  maxUploadRetryTime: 120000,
  maxOperationRetryTime: 120000,
};

/**
 * Mock Cloud Functions
 */
export const mockFunctions = {
  httpsCallable: jest.fn((name: string) => {
    return jest.fn().mockResolvedValue({
      data: { result: `Mock result from ${name}` },
    });
  }),
  region: jest.fn().mockReturnThis(),
};

/**
 * Mock Firebase initialization
 */
export const initializeFirebase = jest.fn().mockReturnValue({
  app: mockApp,
  auth: mockAuth,
  firestore: mockFirestore,
  storage: mockStorage,
  functions: mockFunctions,
});

/**
 * Mock Firebase instances getter
 */
export const getFirebaseInstances = jest.fn().mockReturnValue({
  app: mockApp,
  auth: mockAuth,
  firestore: mockFirestore,
  storage: mockStorage,
  functions: mockFunctions,
});

/**
 * Export mock instances
 */
export const app = mockApp;
export const auth = mockAuth;
export const firestore = mockFirestore;
export const storage = mockStorage;
export const functions = mockFunctions;

/**
 * Export getters
 */
export const getFirebaseApp = jest.fn().mockReturnValue(mockApp);
export const getFirebaseAuth = jest.fn().mockReturnValue(mockAuth);
export const getFirebaseFirestore = jest.fn().mockReturnValue(mockFirestore);
export const getFirebaseStorage = jest.fn().mockReturnValue(mockStorage);
export const getCloudFunctions = jest.fn().mockReturnValue(mockFunctions);

/**
 * Export initialization check
 */
export const isFirebaseInitialized = jest.fn().mockReturnValue(true);

/**
 * Default export
 */
export default {
  app: mockApp,
  auth: mockAuth,
  firestore: mockFirestore,
  storage: mockStorage,
  functions: mockFunctions,
  initializeFirebase,
  getFirebaseInstances,
  isInitialized: isFirebaseInitialized,
};

/**
 * Helper to reset all mocks
 */
export const resetFirebaseMocks = (): void => {
  jest.clearAllMocks();
  mockAuth.currentUser = null;
};
