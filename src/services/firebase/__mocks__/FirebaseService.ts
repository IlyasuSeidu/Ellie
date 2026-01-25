/**
 * Mock Firebase Service for Testing
 *
 * Provides a controllable mock implementation of FirebaseService
 * for unit testing without actual Firebase connections.
 */

import { DocumentData, QueryConstraint, Unsubscribe } from 'firebase/firestore';

/**
 * Mock data store
 */
export class MockFirebaseService {
  // In-memory data store for testing
  private mockData: Map<string, Map<string, DocumentData>> = new Map();
  private subscriptions: Map<string, (data: unknown) => void> = new Map();
  private networkState = { isConnected: true };

  // Expose for test control
  public shouldFailNextOperation = false;
  public failureError: Error | null = null;

  constructor() {
    this.db = {} as unknown;
    this.auth = {} as unknown;
  }

  protected db: unknown;
  protected auth: unknown;

  /**
   * Reset mock state
   */
  public reset(): void {
    this.mockData.clear();
    this.subscriptions.clear();
    this.shouldFailNextOperation = false;
    this.failureError = null;
    this.networkState.isConnected = true;
  }

  /**
   * Set mock data for a collection
   */
  public setMockData(collectionName: string, docId: string, data: DocumentData): void {
    if (!this.mockData.has(collectionName)) {
      this.mockData.set(collectionName, new Map());
    }
    this.mockData.get(collectionName)!.set(docId, data);
  }

  /**
   * Get all mock data for a collection
   */
  public getMockCollection(collectionName: string): DocumentData[] {
    const collection = this.mockData.get(collectionName);
    if (!collection) return [];

    return Array.from(collection.entries()).map(([id, data]) => ({ id, ...data }));
  }

  /**
   * Simulate network failure
   */
  public simulateNetworkFailure(error?: Error): void {
    this.shouldFailNextOperation = true;
    this.failureError = error || new Error('Network error');
  }

  /**
   * Check if operation should fail
   */
  private checkForSimulatedFailure(): void {
    if (this.shouldFailNextOperation) {
      this.shouldFailNextOperation = false;
      throw this.failureError || new Error('Simulated failure');
    }
  }

  /**
   * Mock create operation
   */
  // eslint-disable-next-line require-await
  protected async create<T extends DocumentData>(
    collectionName: string,
    data: T,
    docId?: string
  ): Promise<string> {
    this.checkForSimulatedFailure();

    const id = docId || `mock-${Date.now()}`;
    this.setMockData(collectionName, id, {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return id;
  }

  /**
   * Mock read operation
   */
  protected async read<T extends DocumentData>(
  // eslint-disable-next-line require-await
    collectionName: string,
    docId: string
  ): Promise<T | null> {
    this.checkForSimulatedFailure();

    const collection = this.mockData.get(collectionName);
    if (!collection || !collection.has(docId)) {
      return null;
    }

    return { id: docId, ...collection.get(docId) } as unknown as T;
  }

  /**
   * Mock update operation
   */
  protected async update<T extends DocumentData>(
    collectionName: string,
  // eslint-disable-next-line require-await
    docId: string,
    data: Partial<T>
  ): Promise<void> {
    this.checkForSimulatedFailure();

    const collection = this.mockData.get(collectionName);
    if (!collection || !collection.has(docId)) {
      throw new Error('Document not found');
    }

    const existing = collection.get(docId)!;
    collection.set(docId, {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Mock delete operation
   */
  protected async delete(collectionName: string, docId: string): Promise<void> {
    this.checkForSimulatedFailure();

    const collection = this.mockData.get(collectionName);
  // eslint-disable-next-line require-await
    if (!collection || !collection.has(docId)) {
      throw new Error('Document not found');
    }

    collection.delete(docId);
  }

  /**
   * Mock query operation
   */
  protected async query<T extends DocumentData>(
    collectionName: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _constraints: QueryConstraint[] = []
  ): Promise<T[]> {
  // eslint-disable-next-line require-await
    this.checkForSimulatedFailure();

    return this.getMockCollection(collectionName) as T[];
  }

  /**
   * Mock subscribe operation
   */
  protected subscribe<T extends DocumentData>(
    collectionName: string,
    docId: string,
    callback: (data: T | null) => void
  ): Unsubscribe {
    const key = `${collectionName}/${docId}`;
    this.subscriptions.set(key, callback as (data: unknown) => void);

    // Immediately call with current data
    this.read<T>(collectionName, docId).then(callback);

    // Return unsubscribe function
    return () => {
      this.subscriptions.delete(key);
    };
  }

  /**
   * Mock subscribeToQuery operation
   */
  protected subscribeToQuery<T extends DocumentData>(
    collectionName: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _constraints: QueryConstraint[],
    callback: (data: T[]) => void
  ): Unsubscribe {
    const key = `query/${collectionName}`;
    this.subscriptions.set(key, callback as (data: unknown) => void);

    // Immediately call with current data
    this.query<T>(collectionName, _constraints).then(callback);

    // Return unsubscribe function
    return () => {
      this.subscriptions.delete(key);
    };
  }

  /**
   * Trigger subscription callbacks (for testing)
   */
  public triggerSubscription<T>(collectionName: string, docId: string, data: T | null): void {
    const key = `${collectionName}/${docId}`;
    const callback = this.subscriptions.get(key);
    if (callback) {
      callback(data);
    }
  }

  /**
   * Set network state
   */
  public setNetworkState(isConnected: boolean): void {
    this.networkState.isConnected = isConnected;
  }

  /**
   * Get network state
   */
  public getNetworkState(): { isConnected: boolean } {
    return { ...this.networkState };
  }

  /**
   * Check network state
   */
  protected checkNetworkState(): void {
    if (!this.networkState.isConnected) {
      throw new Error('No network connection available');
    }
  }
}

// Export as default for jest.mock
export const FirebaseService = MockFirebaseService;
