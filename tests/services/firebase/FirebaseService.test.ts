/**
 * FirebaseService Tests
 *
 * Comprehensive tests for the Firebase service abstraction layer
 */

import { FirebaseService } from '@/services/firebase/FirebaseService';
import { NetworkError, FirebaseError } from '@/utils/errorUtils';
import { logger } from '@/utils/logger';

// Mock Firebase modules
jest.mock('firebase/firestore');
jest.mock('firebase/auth');
jest.mock('@/utils/logger');

// Mock retry to avoid long test timeouts
jest.mock('@/utils/reliableRetry', () => ({
  retry: jest.fn((fn) => fn()),
  criticalRetryOptions: {},
  retryFetch: jest.fn(),
}));

// Import mocked modules
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

describe('FirebaseService', () => {
  let service: FirebaseService;

  // Mock data
  const mockCollection = 'test-collection';
  const mockDocId = 'test-doc-123';
  const mockData = { name: 'Test', value: 42 };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Firebase mocks
    (getFirestore as jest.Mock).mockReturnValue({});
    (getAuth as jest.Mock).mockReturnValue({});

    service = new FirebaseService();
  });

  describe('Constructor', () => {
    it('should initialize db and auth', () => {
      expect(getFirestore).toHaveBeenCalled();
      expect(getAuth).toHaveBeenCalled();
    });

    it('should initialize with connected network state', () => {
      const networkState = service.getNetworkState();
      expect(networkState.isConnected).toBe(true);
    });
  });

  describe('create', () => {
    beforeEach(() => {
      (collection as jest.Mock).mockReturnValue('mock-collection-ref');
      (doc as jest.Mock).mockReturnValue({ id: mockDocId });
      (setDoc as jest.Mock).mockResolvedValue(undefined);
    });

    it('should create a document with auto-generated ID', async () => {
      const docId = await service['create'](mockCollection, mockData);

      expect(collection).toHaveBeenCalledWith(expect.anything(), mockCollection);
      expect(setDoc).toHaveBeenCalled();
      expect(docId).toBeDefined();
      expect(logger.info).toHaveBeenCalledWith(
        'Document created',
        expect.objectContaining({
          collection: mockCollection,
        })
      );
    });

    it('should create a document with provided ID', async () => {
      const customId = 'custom-id-456';
      const docId = await service['create'](mockCollection, mockData, customId);

      expect(docId).toBe(customId);
    });

    it('should add createdAt and updatedAt timestamps', async () => {
      await service['create'](mockCollection, mockData);

      const setDocCall = (setDoc as jest.Mock).mock.calls[0][1];
      expect(setDocCall).toHaveProperty('createdAt');
      expect(setDocCall).toHaveProperty('updatedAt');
      expect(setDocCall.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should throw NetworkError when network is unavailable', async () => {
      await Promise.resolve(); service.setNetworkState(false);

      await expect(service['create'](mockCollection, mockData)).rejects.toThrow(
        NetworkError
      );
    });

    it('should handle Firestore errors', async () => {
      (setDoc as jest.Mock).mockRejectedValue({
        code: 'permission-denied',
        message: 'Permission denied',
      });

      await expect(service['create'](mockCollection, mockData)).rejects.toThrow(
        FirebaseError
      );
    });
  });

  describe('read', () => {
    beforeEach(() => {
      (doc as jest.Mock).mockReturnValue('mock-doc-ref');
    });

    it('should read an existing document', async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        id: mockDocId,
        data: () => mockData,
      });

      const result = await service['read'](mockCollection, mockDocId);

      expect(doc).toHaveBeenCalledWith(expect.anything(), mockCollection, mockDocId);
      expect(getDoc).toHaveBeenCalled();
      expect(result).toEqual({ id: mockDocId, ...mockData });
      expect(logger.debug).toHaveBeenCalledWith(
        'Document read',
        expect.objectContaining({
          collection: mockCollection,
          docId: mockDocId,
        })
      );
    });

    it('should return null for non-existent document', async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      });

      const result = await service['read'](mockCollection, mockDocId);

      expect(result).toBeNull();
      expect(logger.debug).toHaveBeenCalledWith(
        'Document not found',
        expect.objectContaining({
          collection: mockCollection,
          docId: mockDocId,
        })
      );
    });

    it('should throw NetworkError when network is unavailable', async () => {
      await Promise.resolve(); service.setNetworkState(false);

      await expect(service['read'](mockCollection, mockDocId)).rejects.toThrow(
        NetworkError
      );
    });

    it('should handle Firestore errors', async () => {
      (getDoc as jest.Mock).mockRejectedValue({
        code: 'unavailable',
        message: 'Service unavailable',
      });

      await expect(service['read'](mockCollection, mockDocId)).rejects.toThrow(
        NetworkError
      );
    });
  });

  describe('update', () => {
    beforeEach(() => {
      (doc as jest.Mock).mockReturnValue('mock-doc-ref');
      (updateDoc as jest.Mock).mockResolvedValue(undefined);
    });

    it('should update a document', async () => {
      const updates = { value: 100 };

      await service['update'](mockCollection, mockDocId, updates);

      expect(doc).toHaveBeenCalledWith(expect.anything(), mockCollection, mockDocId);
      expect(updateDoc).toHaveBeenCalled();

      const updateCall = (updateDoc as jest.Mock).mock.calls[0][1];
      expect(updateCall).toHaveProperty('value', 100);
      expect(updateCall).toHaveProperty('updatedAt');

      expect(logger.info).toHaveBeenCalledWith(
        'Document updated',
        expect.objectContaining({
          collection: mockCollection,
          docId: mockDocId,
        })
      );
    });

    it('should add updatedAt timestamp', async () => {
      await service['update'](mockCollection, mockDocId, { value: 100 });

      const updateCall = (updateDoc as jest.Mock).mock.calls[0][1];
      expect(updateCall.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should throw NetworkError when network is unavailable', async () => {
      await Promise.resolve(); service.setNetworkState(false);

      await expect(
        service['update'](mockCollection, mockDocId, { value: 100 })
      ).rejects.toThrow(NetworkError);
    });

    it('should handle not-found errors', async () => {
      (updateDoc as jest.Mock).mockRejectedValue({
        code: 'not-found',
        message: 'Document not found',
      });

      await expect(
        service['update'](mockCollection, mockDocId, { value: 100 })
      ).rejects.toThrow(FirebaseError);
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      (doc as jest.Mock).mockReturnValue('mock-doc-ref');
      (deleteDoc as jest.Mock).mockResolvedValue(undefined);
    });

    it('should delete a document', async () => {
      await service['delete'](mockCollection, mockDocId);

      expect(doc).toHaveBeenCalledWith(expect.anything(), mockCollection, mockDocId);
      expect(deleteDoc).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Document deleted',
        expect.objectContaining({
          collection: mockCollection,
          docId: mockDocId,
        })
      );
    });

    it('should throw NetworkError when network is unavailable', async () => {
      await Promise.resolve(); service.setNetworkState(false);

      await expect(service['delete'](mockCollection, mockDocId)).rejects.toThrow(
        NetworkError
      );
    });

    it('should handle Firestore errors', async () => {
      (deleteDoc as jest.Mock).mockRejectedValue({
        code: 'permission-denied',
        message: 'Permission denied',
      });

      await expect(service['delete'](mockCollection, mockDocId)).rejects.toThrow(
        FirebaseError
      );
    });
  });

  describe('query', () => {
    beforeEach(() => {
      (collection as jest.Mock).mockReturnValue('mock-collection-ref');
      (query as jest.Mock).mockReturnValue('mock-query');
    });

    it('should query documents with no constraints', async () => {
      const mockDocs = [
        { id: 'doc1', data: () => ({ name: 'Test 1' }) },
        { id: 'doc2', data: () => ({ name: 'Test 2' }) },
      ];

      (getDocs as jest.Mock).mockResolvedValue({
        forEach: (callback: (doc: unknown) => void) => mockDocs.forEach(callback),
      });

      const results = await service['query'](mockCollection);

      expect(collection).toHaveBeenCalledWith(expect.anything(), mockCollection);
      expect(query).toHaveBeenCalled();
      expect(getDocs).toHaveBeenCalled();
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ id: 'doc1', name: 'Test 1' });
      expect(logger.debug).toHaveBeenCalledWith(
        'Query executed',
        expect.objectContaining({
          collection: mockCollection,
          resultCount: 2,
        })
      );
    });

    it('should query documents with constraints', async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockConstraints: any[] = ['constraint1', 'constraint2'];

      (getDocs as jest.Mock).mockResolvedValue({
        forEach: () => {},
      });

      await service['query'](mockCollection, mockConstraints);

      expect(query).toHaveBeenCalledWith('mock-collection-ref', ...mockConstraints);
    });

    it('should return empty array when no documents found', async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        forEach: () => {},
      });

      const results = await service['query'](mockCollection);

      expect(results).toEqual([]);
    });

    it('should throw NetworkError when network is unavailable', async () => {
      await Promise.resolve(); service.setNetworkState(false);

      await expect(service['query'](mockCollection)).rejects.toThrow(NetworkError);
    });
  });

  describe('subscribe', () => {
    let mockUnsubscribe: jest.Mock;

    beforeEach(() => {
      (doc as jest.Mock).mockReturnValue('mock-doc-ref');
      mockUnsubscribe = jest.fn();
      (onSnapshot as jest.Mock).mockReturnValue(mockUnsubscribe);
    });

    it('should create a subscription', () => {
      const callback = jest.fn();

      const unsubscribe = service['subscribe'](mockCollection, mockDocId, callback);

      expect(doc).toHaveBeenCalledWith(expect.anything(), mockCollection, mockDocId);
      expect(onSnapshot).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
      expect(logger.debug).toHaveBeenCalledWith(
        'Subscription created',
        expect.objectContaining({
          collection: mockCollection,
          docId: mockDocId,
        })
      );
    });

    it('should call callback with document data', () => {
      const callback = jest.fn();
      service['subscribe'](mockCollection, mockDocId, callback);

      // Simulate snapshot
      const snapshotCallback = (onSnapshot as jest.Mock).mock.calls[0][1];
      snapshotCallback({
        exists: () => true,
        id: mockDocId,
        data: () => mockData,
      });

      expect(callback).toHaveBeenCalledWith({ id: mockDocId, ...mockData });
    });

    it('should call callback with null for non-existent document', () => {
      const callback = jest.fn();
      service['subscribe'](mockCollection, mockDocId, callback);

      // Simulate snapshot
      const snapshotCallback = (onSnapshot as jest.Mock).mock.calls[0][1];
      snapshotCallback({
        exists: () => false,
      });

      expect(callback).toHaveBeenCalledWith(null);
    });

    it('should handle subscription errors', () => {
      const callback = jest.fn();
      service['subscribe'](mockCollection, mockDocId, callback);

      // Simulate error
      const errorCallback = (onSnapshot as jest.Mock).mock.calls[0][2];
      const error = new Error('Subscription error');
      errorCallback(error);

      expect(logger.error).toHaveBeenCalledWith(
        'Subscription error',
        error,
        expect.objectContaining({
          collection: mockCollection,
          docId: mockDocId,
        })
      );
      expect(callback).toHaveBeenCalledWith(null);
    });

    it('should return unsubscribe function', () => {
      const callback = jest.fn();
      const unsubscribe = service['subscribe'](mockCollection, mockDocId, callback);

      expect(unsubscribe).toBe(mockUnsubscribe);
    });
  });

  describe('subscribeToQuery', () => {
    let mockUnsubscribe: jest.Mock;

    beforeEach(() => {
      (collection as jest.Mock).mockReturnValue('mock-collection-ref');
      (query as jest.Mock).mockReturnValue('mock-query');
      mockUnsubscribe = jest.fn();
      (onSnapshot as jest.Mock).mockReturnValue(mockUnsubscribe);
    });

    it('should create a query subscription', () => {
      const callback = jest.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const constraints: any[] = ['constraint1'];

      const unsubscribe = service['subscribeToQuery'](
        mockCollection,
        constraints,
        callback
      );

      expect(collection).toHaveBeenCalledWith(expect.anything(), mockCollection);
      expect(query).toHaveBeenCalledWith('mock-collection-ref', ...constraints);
      expect(onSnapshot).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
    });

    it('should call callback with query results', () => {
      const callback = jest.fn();
      service['subscribeToQuery'](mockCollection, [], callback);

      // Simulate snapshot
      const snapshotCallback = (onSnapshot as jest.Mock).mock.calls[0][1];
      const mockDocs = [
        { id: 'doc1', data: () => ({ name: 'Test 1' }) },
        { id: 'doc2', data: () => ({ name: 'Test 2' }) },
      ];

      snapshotCallback({
        forEach: (cb: (doc: unknown) => void) => mockDocs.forEach(cb),
      });

      expect(callback).toHaveBeenCalledWith([
        { id: 'doc1', name: 'Test 1' },
        { id: 'doc2', name: 'Test 2' },
      ]);
    });

    it('should handle query subscription errors', () => {
      const callback = jest.fn();
      service['subscribeToQuery'](mockCollection, [], callback);

      // Simulate error
      const errorCallback = (onSnapshot as jest.Mock).mock.calls[0][2];
      const error = new Error('Query subscription error');
      errorCallback(error);

      expect(logger.error).toHaveBeenCalledWith(
        'Query subscription error',
        error,
        expect.objectContaining({
          collection: mockCollection,
        })
      );
      expect(callback).toHaveBeenCalledWith([]);
    });
  });

  describe('Network State', () => {
    it('should get network state', () => {
      const state = service.getNetworkState();
      expect(state).toEqual({ isConnected: true });
    });

    it('should set network state', () => {
      service.setNetworkState(false);
      const state = service.getNetworkState();
      expect(state.isConnected).toBe(false);
    });

    it('should throw error when offline for create', async () => {
      await Promise.resolve(); service.setNetworkState(false);
      await expect(service['create'](mockCollection, mockData)).rejects.toThrow(
        'No network connection available'
      );
    });

    it('should throw error when offline for read', async () => {
      await Promise.resolve(); service.setNetworkState(false);
      await expect(service['read'](mockCollection, mockDocId)).rejects.toThrow(
        'No network connection available'
      );
    });

    it('should throw error when offline for update', async () => {
      await Promise.resolve(); service.setNetworkState(false);
      await expect(
        service['update'](mockCollection, mockDocId, { value: 100 })
      ).rejects.toThrow('No network connection available');
    });

    it('should throw error when offline for delete', async () => {
      await Promise.resolve(); service.setNetworkState(false);
      await expect(service['delete'](mockCollection, mockDocId)).rejects.toThrow(
        'No network connection available'
      );
    });

    it('should throw error when offline for query', async () => {
      await Promise.resolve(); service.setNetworkState(false);
      await expect(service['query'](mockCollection)).rejects.toThrow(
        'No network connection available'
      );
    });
  });
});
