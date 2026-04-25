/* eslint-disable @typescript-eslint/no-var-requires, require-await, @typescript-eslint/no-explicit-any */

import type * as FirebaseFirestoreWeb from 'firebase/firestore';
import { shouldUseFirebaseJsSdk, shouldUseNativeFirebaseFullStack } from './nativeAvailability';

type FirestoreModule = typeof FirebaseFirestoreWeb & {
  getPersistentCacheIndexManager?: (
    firestore: FirebaseFirestoreWeb.Firestore
  ) => { enableIndexAutoCreation: () => Promise<void> } | null;
};

function loadFirebaseJsFirestoreSdk(): typeof FirebaseFirestoreWeb {
  const defaults = {
    getFirestore: () => ({}),
    collection: () => ({}),
    doc: () => ({ id: 'mock-doc-id' }),
    getDoc: async () => ({
      exists: () => false,
      id: 'mock-doc-id',
      data: () => ({}),
    }),
    getDocFromCache: async () => ({
      exists: () => false,
      id: 'mock-doc-id',
      data: () => ({}),
    }),
    setDoc: async () => undefined,
    updateDoc: async () => undefined,
    deleteDoc: async () => undefined,
    query: () => ({}),
    where: () => ({}),
    getDocs: async () => ({
      forEach: () => undefined,
      empty: true,
      size: 0,
      docs: [],
    }),
    getDocsFromCache: async () => ({
      forEach: () => undefined,
      empty: true,
      size: 0,
      docs: [],
    }),
    onSnapshot: () => () => undefined,
    enableNetwork: async () => undefined,
    disableNetwork: async () => undefined,
    Timestamp: {
      fromDate: (date: Date) => ({
        toDate: () => date,
      }),
    },
  } as unknown as typeof FirebaseFirestoreWeb;

  if (process.env.JEST_WORKER_ID !== undefined) {
    try {
      return {
        ...defaults,
        ...(require('firebase/firestore') as typeof FirebaseFirestoreWeb),
      };
    } catch {
      return defaults;
    }
  }

  return require('firebase/firestore') as typeof FirebaseFirestoreWeb;
}

function loadNativeFirebaseFirestoreSdk(): FirestoreModule {
  try {
    return require('@react-native-firebase/firestore/lib/modular') as FirestoreModule;
  } catch {
    return loadFirebaseJsFirestoreSdk() as FirestoreModule;
  }
}

function resolveSdk(): FirestoreModule {
  return shouldUseFirebaseJsSdk() || !shouldUseNativeFirebaseFullStack()
    ? (loadFirebaseJsFirestoreSdk() as FirestoreModule)
    : loadNativeFirebaseFirestoreSdk();
}

export function nativeFirebaseFirestoreAvailable(): boolean {
  return shouldUseNativeFirebaseFullStack();
}

export type Firestore = FirebaseFirestoreWeb.Firestore;
export type QueryConstraint = FirebaseFirestoreWeb.QueryConstraint;
export type DocumentData = FirebaseFirestoreWeb.DocumentData;
export type Unsubscribe = FirebaseFirestoreWeb.Unsubscribe;
export type FirestoreError = FirebaseFirestoreWeb.FirestoreError;
export type Query = FirebaseFirestoreWeb.Query<DocumentData>;
export type QuerySnapshot = FirebaseFirestoreWeb.QuerySnapshot<DocumentData>;
export type DocumentSnapshot = FirebaseFirestoreWeb.DocumentSnapshot<DocumentData>;

export function getFirestore(app?: unknown): Firestore {
  const sdk = resolveSdk() as {
    getFirestore: (appArg?: unknown) => Firestore;
  };
  return sdk.getFirestore(app);
}

export function collection(parent: unknown, path: string, ...pathSegments: string[]): unknown {
  const sdk = resolveSdk() as {
    collection: (parentArg: unknown, pathArg: string, ...segments: string[]) => unknown;
  };
  return sdk.collection(parent, path, ...pathSegments);
}

export function doc(parent: unknown, path?: string, ...pathSegments: string[]): { id: string } {
  const sdk = resolveSdk() as unknown as {
    doc: (parentArg: unknown, pathArg?: string, ...segments: string[]) => { id: string };
  };
  return sdk.doc(parent, path, ...pathSegments);
}

export async function getDoc(reference: unknown): Promise<{
  exists: () => boolean;
  id: string;
  data: () => unknown;
}> {
  const sdk = resolveSdk() as {
    getDoc: (referenceArg: unknown) => Promise<{
      exists: () => boolean;
      id: string;
      data: () => unknown;
    }>;
  };
  return sdk.getDoc(reference);
}

export async function getDocFromCache(reference: unknown): Promise<{
  exists: () => boolean;
  id: string;
  data: () => unknown;
}> {
  const sdk = resolveSdk() as {
    getDocFromCache: (referenceArg: unknown) => Promise<{
      exists: () => boolean;
      id: string;
      data: () => unknown;
    }>;
  };
  return sdk.getDocFromCache(reference);
}

export async function setDoc(
  reference: unknown,
  data: Record<string, unknown>,
  options?: { merge?: boolean }
): Promise<void> {
  const sdk = resolveSdk() as {
    setDoc: (
      referenceArg: unknown,
      dataArg: Record<string, unknown>,
      optionsArg?: { merge?: boolean }
    ) => Promise<void>;
  };
  return sdk.setDoc(reference, data, options);
}

export async function updateDoc(reference: unknown, data: Record<string, unknown>): Promise<void> {
  const sdk = resolveSdk() as {
    updateDoc: (referenceArg: unknown, dataArg: Record<string, unknown>) => Promise<void>;
  };
  return sdk.updateDoc(reference, data);
}

export async function deleteDoc(reference: unknown): Promise<void> {
  const sdk = resolveSdk() as {
    deleteDoc: (referenceArg: unknown) => Promise<void>;
  };
  return sdk.deleteDoc(reference);
}

export function query(baseQuery: unknown, ...constraints: QueryConstraint[]): Query {
  const sdk = resolveSdk() as {
    query: (baseQueryArg: unknown, ...constraintArgs: QueryConstraint[]) => Query;
  };
  return sdk.query(baseQuery, ...constraints);
}

export function where(...args: unknown[]): QueryConstraint {
  const sdk = resolveSdk() as {
    where: (...whereArgs: unknown[]) => QueryConstraint;
  };
  return sdk.where(...args);
}

export async function getDocs(queryRef: unknown): Promise<QuerySnapshot> {
  const sdk = resolveSdk() as {
    getDocs: (queryArg: unknown) => Promise<QuerySnapshot>;
  };
  return sdk.getDocs(queryRef);
}

export async function getDocsFromCache(queryRef: unknown): Promise<QuerySnapshot> {
  const sdk = resolveSdk() as {
    getDocsFromCache: (queryArg: unknown) => Promise<QuerySnapshot>;
  };
  return sdk.getDocsFromCache(queryRef);
}

export function onSnapshot(
  reference: unknown,
  onNext: (snapshot: any) => void,
  onError?: (error: any) => void
): Unsubscribe {
  const sdk = resolveSdk() as unknown as {
    onSnapshot: (
      referenceArg: unknown,
      onNextArg: (snapshot: any) => void,
      onErrorArg?: (error: any) => void
    ) => Unsubscribe;
  };
  return sdk.onSnapshot(reference, onNext, onError);
}

export async function enableNetwork(firestore: Firestore): Promise<void> {
  const sdk = resolveSdk() as {
    enableNetwork: (firestoreArg: Firestore) => Promise<void>;
  };
  return sdk.enableNetwork(firestore);
}

export async function disableNetwork(firestore: Firestore): Promise<void> {
  const sdk = resolveSdk() as {
    disableNetwork: (firestoreArg: Firestore) => Promise<void>;
  };
  return sdk.disableNetwork(firestore);
}

export function getPersistentCacheIndexManager(
  firestore: Firestore
): { enableIndexAutoCreation?: () => Promise<void> } | null | undefined {
  const sdk = resolveSdk() as unknown as {
    getPersistentCacheIndexManager?: (
      firestoreArg: Firestore
    ) => { enableIndexAutoCreation?: () => Promise<void> } | null;
  };
  return sdk.getPersistentCacheIndexManager?.(firestore);
}

export const Timestamp = loadFirebaseJsFirestoreSdk().Timestamp;
