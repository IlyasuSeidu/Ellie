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
import { asyncStorageService } from '@/services/AsyncStorageService';
import { logger } from '@/utils/logger';
import { FirebaseError, NetworkError } from '@/utils/errorUtils';
import { retry, criticalRetryOptions } from '@/utils/reliableRetry';
import { networkService } from '@/services/NetworkService';

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
  private static readonly DOC_CACHE_PREFIX = 'firestore:cache:doc:';
  private static readonly QUERY_CACHE_PREFIX = 'firestore:cache:query:';
  private static readonly QUERY_CACHE_INDEX_PREFIX = 'firestore:cache:query-index:';
  protected db: Firestore;
  protected auth: Auth;
  private networkState: NetworkState = { isConnected: true };
  private unsubscribeNetwork: (() => void) | null = null;

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
    this.unsubscribeNetwork?.();
    this.unsubscribeNetwork = networkService.subscribe((snapshot) => {
      this.networkState.isConnected = snapshot.status === 'online';
    });
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
    return retry(
      async () => {
        try {
          const collectionRef = collection(this.db, collectionName);
          const documentId = docId || doc(collectionRef).id;
          const docRef = doc(collectionRef, documentId);
          const sanitizedData = this.stripUndefinedValues(data) as T;
          const now = new Date().toISOString();

          await setDoc(docRef, {
            ...sanitizedData,
            createdAt: now,
            updatedAt: now,
          });

          const cachedDocument = {
            id: documentId,
            ...sanitizedData,
            createdAt: now,
            updatedAt: now,
          } as unknown as T;
          await this.cacheDocument(collectionName, documentId, cachedDocument);
          await this.invalidateCollectionQueryCaches(collectionName);

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
    if (!this.networkState.isConnected) {
      const cached = await this.getCachedDocument<T>(collectionName, docId);
      if (cached !== null) {
        logger.debug('Document served from local cache', {
          collection: collectionName,
          docId,
        });
        return cached;
      }
    }

    return retry(
      async () => {
        try {
          const docRef = doc(this.db, collectionName, docId);
          const docSnap = await getDoc(docRef);

          if (!docSnap.exists()) {
            await this.removeCachedDocument(collectionName, docId);
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

          const result = { id: docSnap.id, ...docSnap.data() } as unknown as T;
          await this.cacheDocument(collectionName, docId, result);
          return result;
        } catch (error) {
          const handledError = this.handleFirestoreError(error as FirestoreError, 'read');
          if (handledError instanceof NetworkError) {
            const cached = await this.getCachedDocument<T>(collectionName, docId);
            if (cached !== null) {
              logger.warn('Falling back to cached document after Firestore read failure', {
                collection: collectionName,
                docId,
              });
              return cached;
            }
          }

          throw handledError;
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
    return retry(
      async () => {
        try {
          const docRef = doc(this.db, collectionName, docId);
          const sanitizedData = this.stripUndefinedValues(data) as Partial<T>;
          const now = new Date().toISOString();

          await updateDoc(docRef, {
            ...sanitizedData,
            updatedAt: now,
          });

          await this.mergeCachedDocument(collectionName, docId, {
            ...sanitizedData,
            updatedAt: now,
          });
          await this.invalidateCollectionQueryCaches(collectionName);

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
   * Upsert a document in Firestore while preserving a caller-provided createdAt.
   * Uses setDoc so callers can safely replay a full locally-owned document snapshot.
   */
  // eslint-disable-next-line require-await
  protected async upsert<T extends DocumentData>(
    collectionName: string,
    docId: string,
    data: T,
    options: { merge?: boolean } = {}
  ): Promise<void> {
    return retry(
      async () => {
        try {
          const docRef = doc(this.db, collectionName, docId);
          const sanitizedData = this.stripUndefinedValues(data) as T;
          const payload = {
            ...sanitizedData,
            createdAt:
              typeof (sanitizedData as { createdAt?: unknown }).createdAt === 'string'
                ? (sanitizedData as unknown as { createdAt: string }).createdAt
                : new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          await setDoc(docRef, payload, { merge: options.merge ?? true });

          await this.cacheDocument(collectionName, docId, {
            id: docId,
            ...payload,
          } as unknown as T);
          await this.invalidateCollectionQueryCaches(collectionName);

          logger.info('Document upserted', {
            collection: collectionName,
            docId,
          });
        } catch (error) {
          throw this.handleFirestoreError(error as FirestoreError, 'upsert');
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
    return retry(
      async () => {
        try {
          const docRef = doc(this.db, collectionName, docId);
          await deleteDoc(docRef);
          await this.removeCachedDocument(collectionName, docId);
          await this.invalidateCollectionQueryCaches(collectionName);

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
    if (!this.networkState.isConnected) {
      const cached = await this.getCachedQueryResults<T>(collectionName, constraints);
      if (cached !== null) {
        logger.debug('Query served from local cache', {
          collection: collectionName,
          resultCount: cached.length,
        });
        return cached;
      }
    }

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

          await this.cacheQueryResults(collectionName, constraints, results);

          logger.debug('Query executed', {
            collection: collectionName,
            resultCount: results.length,
          });

          return results;
        } catch (error) {
          const handledError = this.handleFirestoreError(error as FirestoreError, 'query');
          if (handledError instanceof NetworkError) {
            const cached = await this.getCachedQueryResults<T>(collectionName, constraints);
            if (cached !== null) {
              logger.warn('Falling back to cached query after Firestore query failure', {
                collection: collectionName,
                resultCount: cached.length,
              });
              return cached;
            }
          }

          throw handledError;
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

      if (!this.networkState.isConnected) {
        void this.getCachedDocument<T>(collectionName, docId).then((cached) => {
          if (cached !== null) {
            callback(cached);
          }
        });
      }

      const unsubscribe = onSnapshot(
        docRef,
        (docSnap) => {
          if (!docSnap.exists()) {
            void this.removeCachedDocument(collectionName, docId);
            callback(null);
            return;
          }

          const result = { id: docSnap.id, ...docSnap.data() } as unknown as T;
          void this.cacheDocument(collectionName, docId, result);
          callback(result);
        },
        async (error) => {
          logger.error('Subscription error', error, {
            collection: collectionName,
            docId,
          });
          const cached = await this.getCachedDocument<T>(collectionName, docId);
          callback(cached);
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

      if (!this.networkState.isConnected) {
        void this.getCachedQueryResults<T>(collectionName, constraints).then((cached) => {
          if (cached !== null) {
            callback(cached);
          }
        });
      }

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const results: T[] = [];
          querySnapshot.forEach((doc) => {
            results.push({ id: doc.id, ...doc.data() } as unknown as T);
          });
          void this.cacheQueryResults(collectionName, constraints, results);
          callback(results);
        },
        async (error) => {
          logger.error('Query subscription error', error, {
            collection: collectionName,
          });
          const cached = await this.getCachedQueryResults<T>(collectionName, constraints);
          callback(cached ?? []);
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

  private getDocumentCacheKey(collectionName: string, docId: string): string {
    return `${FirebaseService.DOC_CACHE_PREFIX}${collectionName}:${docId}`;
  }

  private getQueryCacheKey(collectionName: string, constraints: QueryConstraint[]): string {
    const fingerprint = this.hashCacheKeyPayload(
      this.normalizeCacheKeyValue({ collectionName, constraints })
    );
    return `${FirebaseService.QUERY_CACHE_PREFIX}${collectionName}:${fingerprint}`;
  }

  private getQueryCacheIndexKey(collectionName: string): string {
    return `${FirebaseService.QUERY_CACHE_INDEX_PREFIX}${collectionName}`;
  }

  private async getCachedDocument<T extends DocumentData>(
    collectionName: string,
    docId: string
  ): Promise<T | null> {
    try {
      return await asyncStorageService.get<T>(this.getDocumentCacheKey(collectionName, docId));
    } catch (error) {
      logger.warn('Failed to read cached Firestore document', {
        collection: collectionName,
        docId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private async cacheDocument<T extends DocumentData>(
    collectionName: string,
    docId: string,
    data: T
  ): Promise<void> {
    try {
      await asyncStorageService.set(this.getDocumentCacheKey(collectionName, docId), data);
    } catch (error) {
      logger.warn('Failed to cache Firestore document', {
        collection: collectionName,
        docId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async mergeCachedDocument<T extends DocumentData>(
    collectionName: string,
    docId: string,
    partial: Partial<T> & { updatedAt?: string }
  ): Promise<void> {
    const cached = await this.getCachedDocument<T>(collectionName, docId);
    const merged = cached
      ? ({ ...cached, ...partial } as T)
      : ({ id: docId, ...partial } as unknown as T);
    await this.cacheDocument(collectionName, docId, merged);
  }

  private async removeCachedDocument(collectionName: string, docId: string): Promise<void> {
    try {
      await asyncStorageService.remove(this.getDocumentCacheKey(collectionName, docId));
    } catch (error) {
      logger.warn('Failed to remove cached Firestore document', {
        collection: collectionName,
        docId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async getCachedQueryResults<T extends DocumentData>(
    collectionName: string,
    constraints: QueryConstraint[]
  ): Promise<T[] | null> {
    try {
      return await asyncStorageService.get<T[]>(this.getQueryCacheKey(collectionName, constraints));
    } catch (error) {
      logger.warn('Failed to read cached Firestore query', {
        collection: collectionName,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private async cacheQueryResults<T extends DocumentData>(
    collectionName: string,
    constraints: QueryConstraint[],
    results: T[]
  ): Promise<void> {
    const cacheKey = this.getQueryCacheKey(collectionName, constraints);
    const indexKey = this.getQueryCacheIndexKey(collectionName);

    try {
      await asyncStorageService.set(cacheKey, results);

      const existingIndex = (await asyncStorageService.get<string[]>(indexKey)) ?? [];
      if (!existingIndex.includes(cacheKey)) {
        await asyncStorageService.set(indexKey, [...existingIndex, cacheKey]);
      }
    } catch (error) {
      logger.warn('Failed to cache Firestore query', {
        collection: collectionName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async invalidateCollectionQueryCaches(collectionName: string): Promise<void> {
    const indexKey = this.getQueryCacheIndexKey(collectionName);

    try {
      const cachedKeys = (await asyncStorageService.get<string[]>(indexKey)) ?? [];
      await Promise.all(cachedKeys.map((cacheKey) => asyncStorageService.remove(cacheKey)));
      await asyncStorageService.remove(indexKey);
    } catch (error) {
      logger.warn('Failed to invalidate Firestore query cache', {
        collection: collectionName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private normalizeCacheKeyValue(value: unknown, seen = new WeakSet<object>()): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return value.map((entry) => this.normalizeCacheKeyValue(entry, seen));
    }

    if (typeof value === 'object') {
      if (seen.has(value as object)) {
        return '[Circular]';
      }

      seen.add(value as object);

      const record = value as Record<string, unknown>;
      const keys = Object.keys(record).sort();
      if (keys.length === 0) {
        const tag = Object.prototype.toString.call(value);
        return tag === '[object Object]' ? {} : String(value);
      }

      const normalizedEntries = keys
        .filter((key) => typeof record[key] !== 'function' && typeof record[key] !== 'undefined')
        .map((key) => [key, this.normalizeCacheKeyValue(record[key], seen)]);

      seen.delete(value as object);
      return Object.fromEntries(normalizedEntries);
    }

    return String(value);
  }

  private hashCacheKeyPayload(value: unknown): string {
    const source = JSON.stringify(value);
    let hash = 5381;

    for (let index = 0; index < source.length; index += 1) {
      hash = (hash * 33) ^ source.charCodeAt(index);
    }

    return (hash >>> 0).toString(36);
  }

  private stripUndefinedValues(value: unknown): unknown {
    if (value === undefined) {
      return undefined;
    }

    if (value === null || typeof value !== 'object') {
      return value;
    }

    if (value instanceof Date) {
      return value;
    }

    if (Array.isArray(value)) {
      return value
        .map((entry) => this.stripUndefinedValues(entry))
        .filter((entry) => entry !== undefined);
    }

    const result: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
      const sanitizedEntry = this.stripUndefinedValues(entry);
      if (sanitizedEntry !== undefined) {
        result[key] = sanitizedEntry;
      }
    });

    return result;
  }
}
