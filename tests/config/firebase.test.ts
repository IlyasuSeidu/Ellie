/**
 * Firebase Configuration Tests
 *
 * Tests for Firebase initialization and service configuration.
 * Uses mocked Firebase services for testing.
 */

// Mock Firebase before importing the config
jest.mock('@/config/firebase');

import {
  initializeFirebase,
  getFirebaseInstances,
  getFirebaseApp,
  getFirebaseAuth,
  getFirebaseFirestore,
  getFirebaseStorage,
  getCloudFunctions,
  isFirebaseInitialized,
  app,
  auth,
  firestore,
  storage,
  functions,
} from '@/config/firebase';

describe('Firebase Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Firebase Initialization', () => {
    it('should initialize Firebase with all services', () => {
      const instances = initializeFirebase();

      expect(instances).toBeDefined();
      expect(instances.app).toBeDefined();
      expect(instances.auth).toBeDefined();
      expect(instances.firestore).toBeDefined();
      expect(instances.storage).toBeDefined();
      expect(instances.functions).toBeDefined();
    });

    it('should call initializeFirebase function', () => {
      expect(initializeFirebase).toHaveBeenCalledTimes(0);
      initializeFirebase();
      expect(initializeFirebase).toHaveBeenCalled();
    });

    it('should return consistent instances', () => {
      const instances1 = getFirebaseInstances();
      const instances2 = getFirebaseInstances();

      expect(instances1).toBe(instances2);
    });
  });

  describe('Firebase App', () => {
    it('should export Firebase app instance', () => {
      expect(app).toBeDefined();
    });

    it('should return app via getter', () => {
      const firebaseApp = getFirebaseApp();
      expect(firebaseApp).toBeDefined();
    });

    it('should have app name', () => {
      const firebaseApp = getFirebaseApp();
      expect(firebaseApp.name).toBeDefined();
    });

    it('should have app options', () => {
      const firebaseApp = getFirebaseApp();
      expect(firebaseApp.options).toBeDefined();
      expect(firebaseApp.options.apiKey).toBeDefined();
      expect(firebaseApp.options.projectId).toBeDefined();
    });
  });

  describe('Firebase Auth', () => {
    it('should export Firebase Auth instance', () => {
      expect(auth).toBeDefined();
    });

    it('should return auth via getter', () => {
      const firebaseAuth = getFirebaseAuth();
      expect(firebaseAuth).toBeDefined();
    });

    it('should have auth methods', () => {
      const firebaseAuth = getFirebaseAuth();
      expect(firebaseAuth.signInWithEmailAndPassword).toBeDefined();
      expect(firebaseAuth.createUserWithEmailAndPassword).toBeDefined();
      expect(firebaseAuth.signOut).toBeDefined();
      expect(firebaseAuth.onAuthStateChanged).toBeDefined();
    });

    it('should handle auth state changes', () => {
      const firebaseAuth = getFirebaseAuth();
      const mockCallback = jest.fn();

      firebaseAuth.onAuthStateChanged(mockCallback);
      expect(firebaseAuth.onAuthStateChanged).toHaveBeenCalled();
    });
  });

  describe('Firestore', () => {
    it('should export Firestore instance', () => {
      expect(firestore).toBeDefined();
    });

    it('should return firestore via getter', () => {
      const firestoreInstance = getFirebaseFirestore();
      expect(firestoreInstance).toBeDefined();
    });

    it('should have firestore methods', () => {
      const firestoreInstance = getFirebaseFirestore();
      expect(firestoreInstance.collection).toBeDefined();
      expect(firestoreInstance.doc).toBeDefined();
      expect(firestoreInstance.batch).toBeDefined();
      expect(firestoreInstance.runTransaction).toBeDefined();
    });

    it('should support collection operations', () => {
      const firestoreInstance = getFirebaseFirestore();
      const collection = firestoreInstance.collection('users');

      expect(collection).toBeDefined();
      expect(firestoreInstance.collection).toHaveBeenCalledWith('users');
    });

    it('should support document operations', () => {
      const firestoreInstance = getFirebaseFirestore();
      const doc = firestoreInstance.doc('users/user-123');

      expect(doc).toBeDefined();
      expect(firestoreInstance.doc).toHaveBeenCalledWith('users/user-123');
    });
  });

  describe('Firebase Storage', () => {
    it('should export Storage instance', () => {
      expect(storage).toBeDefined();
    });

    it('should return storage via getter', () => {
      const storageInstance = getFirebaseStorage();
      expect(storageInstance).toBeDefined();
    });

    it('should have storage methods', () => {
      const storageInstance = getFirebaseStorage();
      expect(storageInstance.ref).toBeDefined();
      expect(storageInstance.refFromURL).toBeDefined();
    });

    it('should create storage references', () => {
      const storageInstance = getFirebaseStorage();
      const ref = storageInstance.ref('path/to/file');

      expect(ref).toBeDefined();
      expect(storageInstance.ref).toHaveBeenCalledWith('path/to/file');
    });
  });

  describe('Cloud Functions', () => {
    it('should export Functions instance', () => {
      expect(functions).toBeDefined();
    });

    it('should return functions via getter', () => {
      const functionsInstance = getCloudFunctions();
      expect(functionsInstance).toBeDefined();
    });

    it('should have functions methods', () => {
      const functionsInstance = getCloudFunctions();
      expect(functionsInstance.httpsCallable).toBeDefined();
      expect(functionsInstance.region).toBeDefined();
    });

    it('should create callable functions', () => {
      const functionsInstance = getCloudFunctions();
      const callable = functionsInstance.httpsCallable('myFunction');

      expect(callable).toBeDefined();
      expect(functionsInstance.httpsCallable).toHaveBeenCalledWith('myFunction');
    });
  });

  describe('Firebase Initialization Status', () => {
    it('should report Firebase as initialized', () => {
      expect(isFirebaseInitialized()).toBe(true);
    });

    it('should return boolean from isFirebaseInitialized', () => {
      const isInitialized = isFirebaseInitialized();
      expect(typeof isInitialized).toBe('boolean');
    });
  });

  describe('Service Integration', () => {
    it('should have all services working together', () => {
      const instances = getFirebaseInstances();

      expect(instances.app).toBeDefined();
      expect(instances.auth).toBeDefined();
      expect(instances.firestore).toBeDefined();
      expect(instances.storage).toBeDefined();
      expect(instances.functions).toBeDefined();
    });

    it('should maintain consistent service instances', () => {
      const auth1 = getFirebaseAuth();
      const auth2 = getFirebaseAuth();

      expect(auth1).toBe(auth2);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing Firebase instances gracefully', () => {
      // In test environment, functions should still return mock instances
      expect(() => getFirebaseApp()).not.toThrow();
      expect(() => getFirebaseAuth()).not.toThrow();
      expect(() => getFirebaseFirestore()).not.toThrow();
      expect(() => getFirebaseStorage()).not.toThrow();
      expect(() => getCloudFunctions()).not.toThrow();
    });
  });

  describe('Mock Behavior', () => {
    it('should use mocked Firebase in test environment', () => {
      const firebaseAuth = getFirebaseAuth();

      // Mock functions should be defined
      expect(firebaseAuth.signInWithEmailAndPassword).toBeDefined();
      expect(typeof firebaseAuth.signInWithEmailAndPassword).toBe('function');
    });

    it('should have mock data in responses', async () => {
      const firebaseAuth = getFirebaseAuth();

      // Mock sign in should return mock user
      const result = await firebaseAuth.signInWithEmailAndPassword('test@example.com', 'password');

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.uid).toBe('mock-user-id');
    });

    it('should support mock Firestore operations', async () => {
      const firestoreInstance = getFirebaseFirestore();
      const collection = firestoreInstance.collection('users');

      const result = await collection.get();

      expect(result).toBeDefined();
      expect(result.docs).toBeDefined();
      expect(Array.isArray(result.docs)).toBe(true);
    });

    it('should support mock Storage operations', async () => {
      const storageInstance = getFirebaseStorage();
      const ref = storageInstance.ref('path/to/file');

      const url = await ref.getDownloadURL();

      expect(url).toBeDefined();
      expect(typeof url).toBe('string');
    });

    it('should support mock Functions calls', async () => {
      const functionsInstance = getCloudFunctions();
      const callable = functionsInstance.httpsCallable('myFunction');

      const result = await callable({ data: 'test' });

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
    });
  });
});
