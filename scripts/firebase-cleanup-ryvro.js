#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-console */

const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const PROJECT_ID = 'ryvro-shift-planner';
const RELATED_COLLECTIONS = ['users', 'shiftLogs', 'notifications', 'sessions'];

const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');
const confirmIndex = args.indexOf('--confirm');
const confirmedProjectId = confirmIndex >= 0 ? args[confirmIndex + 1] : undefined;

function requireConfirmation() {
  if (!dryRun && confirmedProjectId !== PROJECT_ID) {
    console.error(
      `Refusing to delete data. Run with --execute --confirm ${PROJECT_ID} to confirm the target project.`
    );
    process.exit(1);
  }
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function listAuthUserIds(auth) {
  const userIds = [];
  let pageToken;

  do {
    const page = await auth.listUsers(1000, pageToken);
    userIds.push(...page.users.map((user) => user.uid));
    pageToken = page.pageToken;
  } while (pageToken);

  return userIds;
}

async function countCollectionDocuments(db, collectionName) {
  const snapshot = await db.collection(collectionName).count().get();
  return snapshot.data().count ?? 0;
}

function isDisabledFirestoreError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('Cloud Firestore API has not been used') ||
    message.includes('firestore.googleapis.com') ||
    message.includes('it is disabled')
  );
}

function isMissingFirestoreDatabaseError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('5 NOT_FOUND') || message.includes('NOT_FOUND');
}

async function getFirestoreCounts(db) {
  const counts = [];

  for (const collectionName of RELATED_COLLECTIONS) {
    const count = await countCollectionDocuments(db, collectionName);
    counts.push({ collectionName, count });
  }

  return counts;
}

async function deleteAuthUsers(auth, userIds) {
  let deleted = 0;
  let failed = 0;

  for (const userIdChunk of chunk(userIds, 1000)) {
    const result = await auth.deleteUsers(userIdChunk);
    deleted += result.successCount;
    failed += result.failureCount;

    for (const error of result.errors) {
      console.error(
        `Failed to delete Auth user at batch index ${error.index}: ${error.error.message}`
      );
    }
  }

  return { deleted, failed };
}

async function deleteRelatedFirestoreData(db) {
  const deletedCollections = [];

  for (const collectionName of RELATED_COLLECTIONS) {
    await db.recursiveDelete(db.collection(collectionName));
    deletedCollections.push(collectionName);
  }

  return deletedCollections;
}

async function main() {
  requireConfirmation();

  const app = initializeApp({ projectId: PROJECT_ID });

  const auth = getAuth(app);
  const db = getFirestore(app);

  console.log(`Target Firebase project: ${PROJECT_ID}`);
  console.log(
    dryRun ? 'Mode: dry run. No data will be deleted.' : 'Mode: execute. Data will be deleted.'
  );

  const userIds = await listAuthUserIds(auth);
  console.log(`Firebase Auth users found: ${userIds.length}`);

  let firestoreAvailable = true;
  try {
    const firestoreCounts = await getFirestoreCounts(db);
    for (const { collectionName, count } of firestoreCounts) {
      console.log(`Firestore documents found in ${collectionName}: ${count}`);
    }
  } catch (error) {
    if (isMissingFirestoreDatabaseError(error)) {
      firestoreAvailable = false;
      console.log(
        'Firestore data check skipped because no Firestore database exists for this project.'
      );
    } else if (isDisabledFirestoreError(error)) {
      firestoreAvailable = false;
      console.log(
        'Firestore data check skipped because the Cloud Firestore API is disabled for this project.'
      );
    } else {
      throw error;
    }
  }

  if (dryRun) {
    console.log(
      `To delete these accounts and related data, run with --execute --confirm ${PROJECT_ID}.`
    );
    return;
  }

  const authResult = await deleteAuthUsers(auth, userIds);
  console.log(`Firebase Auth users deleted: ${authResult.deleted}`);
  console.log(`Firebase Auth users failed: ${authResult.failed}`);

  if (firestoreAvailable) {
    const deletedCollections = await deleteRelatedFirestoreData(db);
    console.log(`Firestore collections cleared: ${deletedCollections.join(', ')}`);
  } else {
    console.log(
      'Firestore collections were not cleared because there is no reachable Firestore database.'
    );
  }

  console.log('Firebase cleanup completed.');
}

main().catch((error) => {
  console.error('Firebase cleanup failed.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
