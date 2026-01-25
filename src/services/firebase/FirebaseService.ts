/**
 * Firebase Service Base Class
 *
 * Provides a centralized abstraction layer for all Firebase operations with:
 * - Type-safe CRUD operations
 * - Automatic retry logic for network errors
 * - Network state awareness
 * - Structured error handling
 * - Realtime subscription management
 */

import {
  getFirestore,
  Firestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  getDocs,
  onSnapshot,
  QueryConstraint,
  DocumentData,
  Unsubscribe,
  FirestoreError,
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { logger } from '@/utils/logger';
import { FirebaseError, NetworkError } from '@/utils/errorUtils';
import { retry, criticalRetryOptions } from '@/utils/reliableRetry';

/**
 * Network state type
 */
export interface NetworkState {
  isConnected: boolean;
}

/**
 * Base Firebase Service
 * All Firebase services should extend this class
 */
export class FirebaseService {
  protected db: Firestore;
  protected auth: Auth;
  private networkState: NetworkState = { isConnected: true };

  constructor() {
    this.db = getFirestore();
    this.auth = getAuth();
    this.initializeNetworkListener();
  }

  /**
   * Initialize network state listener
   * In a real app, this would listen to network state changes
   */
  private initializeNetworkListener(): void {
    // For now, assume always connected
    // In production, integrate with NetInfo or similar
    this.networkState.isConnected = true;
  }

  /**
   * Check if network is available
   */
  protected checkNetworkState(): void {
    if (!this.networkState.isConnected) {
      throw new NetworkError('No network connection available', 'NETWORK_UNAVAILABLE');
    }
  }

  /**
   * Create a new document in Firestore
   * @param collectionName - Firestore collection name
   * @param data - Document data
   * @param docId - Optional document ID (auto-generated if not provided)
   * @returns Document ID
   */
  // eslint-disable-next-line require-await
  protected async create<T extends DocumentData>(
    collectionName: string,
    data: T,
    docId?: string
  ): Promise<string> {
    this.checkNetworkState();

    return retry(
      async () => {
        try {
          const collectionRef = collection(this.db, collectionName);
          const documentId = docId || doc(collectionRef).id;
          const docRef = doc(collectionRef, documentId);

          await setDoc(docRef, {
            ...data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

          logger.info('Document created', {
            collection: collectionName,
            docId: documentId,
          });

          return documentId;
        } catch (error) {
          throw this.handleFirestoreError(error as FirestoreError, 'create');
        }
      },
      {
        ...criticalRetryOptions,
        shouldRetry: (error) =>
          error instanceof NetworkError ||
          error.message.includes('network') ||
          error.message.includes('unavailable'),
      }
    );
  }

  /**
   * Read a document from Firestore
   * @param collectionName - Firestore collection name
   * @param docId - Document ID
   * @returns Document data or null if not found
   */
  // eslint-disable-next-line require-await
  protected async read<T extends DocumentData>(
    collectionName: string,
    docId: string
  ): Promise<T | null> {
    this.checkNetworkState();

    return retry(
      async () => {
        try {
          const docRef = doc(this.db, collectionName, docId);
          const docSnap = await getDoc(docRef);

          if (!docSnap.exists()) {
            logger.debug('Document not found', {
              collection: collectionName,
              docId,
            });
            return null;
          }

          logger.debug('Document read', {
            collection: collectionName,
            docId,
          });

          return { id: docSnap.id, ...docSnap.data() } as unknown as T;
        } catch (error) {
          throw this.handleFirestoreError(error as FirestoreError, 'read');
        }
      },
      {
        ...criticalRetryOptions,
        shouldRetry: (error) =>
          error instanceof NetworkError ||
          error.message.includes('network') ||
          error.message.includes('unavailable'),
      }
    );
  }

  /**
   * Update a document in Firestore
   * @param collectionName - Firestore collection name
   * @param docId - Document ID
   * @param data - Partial document data to update
   */
  // eslint-disable-next-line require-await
  protected async update<T extends DocumentData>(
    collectionName: string,
    docId: string,
    data: Partial<T>
  ): Promise<void> {
    this.checkNetworkState();

    return retry(
      async () => {
        try {
          const docRef = doc(this.db, collectionName, docId);

          await updateDoc(docRef, {
            ...data,
            updatedAt: new Date().toISOString(),
          });

          logger.info('Document updated', {
            collection: collectionName,
            docId,
          });
        } catch (error) {
          throw this.handleFirestoreError(error as FirestoreError, 'update');
        }
      },
      {
        ...criticalRetryOptions,
        shouldRetry: (error) =>
          error instanceof NetworkError ||
          error.message.includes('network') ||
          error.message.includes('unavailable'),
      }
    );
  }

  /**
   * Delete a document from Firestore
   * @param collectionName - Firestore collection name
   * @param docId - Document ID
   */
  // eslint-disable-next-line require-await
  protected async delete(collectionName: string, docId: string): Promise<void> {
    this.checkNetworkState();

    return retry(
      async () => {
        try {
          const docRef = doc(this.db, collectionName, docId);
          await deleteDoc(docRef);

          logger.info('Document deleted', {
            collection: collectionName,
            docId,
          });
        } catch (error) {
          throw this.handleFirestoreError(error as FirestoreError, 'delete');
        }
      },
      {
        ...criticalRetryOptions,
        shouldRetry: (error) =>
          error instanceof NetworkError ||
          error.message.includes('network') ||
          error.message.includes('unavailable'),
      }
    );
  }

  /**
   * Query documents from Firestore
   * @param collectionName - Firestore collection name
   * @param constraints - Query constraints (where, orderBy, limit, etc.)
   * @returns Array of documents
   */
  // eslint-disable-next-line require-await
  protected async query<T extends DocumentData>(
    collectionName: string,
    constraints: QueryConstraint[] = []
  ): Promise<T[]> {
    this.checkNetworkState();

    return retry(
      async () => {
        try {
          const collectionRef = collection(this.db, collectionName);
          const q = query(collectionRef, ...constraints);
          const querySnapshot = await getDocs(q);

          const results: T[] = [];
          querySnapshot.forEach((doc) => {
            results.push({ id: doc.id, ...doc.data() } as unknown as T);
          });

          logger.debug('Query executed', {
            collection: collectionName,
            resultCount: results.length,
          });

          return results;
        } catch (error) {
          throw this.handleFirestoreError(error as FirestoreError, 'query');
        }
      },
      {
        ...criticalRetryOptions,
        shouldRetry: (error) =>
          error instanceof NetworkError ||
          error.message.includes('network') ||
          error.message.includes('unavailable'),
      }
    );
  }

  /**
   * Subscribe to realtime updates for a document
   * @param collectionName - Firestore collection name
   * @param docId - Document ID
   * @param callback - Callback function called on data changes
   * @returns Unsubscribe function
   */
  protected subscribe<T extends DocumentData>(
    collectionName: string,
    docId: string,
    callback: (data: T | null) => void
  ): Unsubscribe {
    try {
      const docRef = doc(this.db, collectionName, docId);

      const unsubscribe = onSnapshot(
        docRef,
        (docSnap) => {
          if (!docSnap.exists()) {
            callback(null);
            return;
          }

          callback({ id: docSnap.id, ...docSnap.data() } as unknown as T);
        },
        (error) => {
          logger.error('Subscription error', error, {
            collection: collectionName,
            docId,
          });
          callback(null);
        }
      );

      logger.debug('Subscription created', {
        collection: collectionName,
        docId,
      });

      return unsubscribe;
    } catch (error) {
      throw this.handleFirestoreError(error as FirestoreError, 'subscribe');
    }
  }

  /**
   * Subscribe to realtime updates for a query
   * @param collectionName - Firestore collection name
   * @param constraints - Query constraints
   * @param callback - Callback function called on data changes
   * @returns Unsubscribe function
   */
  protected subscribeToQuery<T extends DocumentData>(
    collectionName: string,
    constraints: QueryConstraint[],
    callback: (data: T[]) => void
  ): Unsubscribe {
    try {
      const collectionRef = collection(this.db, collectionName);
      const q = query(collectionRef, ...constraints);

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const results: T[] = [];
          querySnapshot.forEach((doc) => {
            results.push({ id: doc.id, ...doc.data() } as unknown as T);
          });
          callback(results);
        },
        (error) => {
          logger.error('Query subscription error', error, {
            collection: collectionName,
          });
          callback([]);
        }
      );

      logger.debug('Query subscription created', {
        collection: collectionName,
      });

      return unsubscribe;
    } catch (error) {
      throw this.handleFirestoreError(error as FirestoreError, 'subscribeToQuery');
    }
  }

  /**
   * Handle Firestore errors and convert to appropriate error types
   */
  private handleFirestoreError(error: FirestoreError, operation: string): Error {
    const errorCode = error.code;
    const errorMessage = error.message;

    logger.error(`Firestore ${operation} error`, error, {
      code: errorCode,
      operation,
    });

    // Map Firestore error codes to custom errors
    switch (errorCode) {
      case 'unavailable':
      case 'deadline-exceeded':
        return new NetworkError(
          `Network error during ${operation}: ${errorMessage}`,
          `FIRESTORE_${errorCode.toUpperCase()}`
        );

      case 'permission-denied':
        return new FirebaseError(
          `Permission denied for ${operation}`,
          'FIRESTORE_PERMISSION_DENIED'
        );

      case 'not-found':
        return new FirebaseError(`Document not found during ${operation}`, 'FIRESTORE_NOT_FOUND');

      default:
        return new FirebaseError(
          `Firestore ${operation} failed: ${errorMessage}`,
          `FIRESTORE_${errorCode.toUpperCase()}`
        );
    }
  }

  /**
   * Set network state (for testing)
   */
  public setNetworkState(isConnected: boolean): void {
    this.networkState.isConnected = isConnected;
  }

  /**
   * Get current network state
   */
  public getNetworkState(): NetworkState {
    return { ...this.networkState };
  }
}
