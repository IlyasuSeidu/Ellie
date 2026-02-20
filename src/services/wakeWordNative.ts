/**
 * Wake-word native adapter.
 *
 * Loads Porcupine defensively so stale native builds do not crash app startup.
 */

import { logger } from '@/utils/logger';

export interface PorcupineManagerInstance {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  delete: () => void;
}

type DetectionCallback = (keywordIndex: number) => void;
type ProcessErrorCallback = (error: Error) => void;

interface PorcupineManagerStatic {
  fromBuiltInKeywords: (
    accessKey: string,
    keywords: string[],
    detectionCallback: DetectionCallback,
    processErrorCallback?: ProcessErrorCallback,
    modelPath?: string,
    device?: string,
    sensitivities?: number[]
  ) => Promise<PorcupineManagerInstance>;
  fromKeywordPaths: (
    accessKey: string,
    keywordPaths: string[],
    detectionCallback: DetectionCallback,
    processErrorCallback?: ProcessErrorCallback,
    modelPath?: string,
    device?: string,
    sensitivities?: number[]
  ) => Promise<PorcupineManagerInstance>;
}

type BuiltInKeywordsMap = Record<string, string>;

interface WakeWordPackage {
  PorcupineManager?: PorcupineManagerStatic;
  BuiltInKeywords?: BuiltInKeywordsMap;
}

const unavailableMessage =
  'Wake-word native module is unavailable. Rebuild the app after installing Porcupine native packages.';

let wakeWordPackage: WakeWordPackage | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  wakeWordPackage = require('@picovoice/porcupine-react-native') as WakeWordPackage;
} catch (error) {
  logger.warn('Porcupine wake-word module is unavailable in this runtime', {
    error: error instanceof Error ? error.message : String(error),
  });
}

function getNativeManager(): PorcupineManagerStatic {
  const manager = wakeWordPackage?.PorcupineManager;
  if (!manager) {
    throw new Error(unavailableMessage);
  }
  return manager;
}

export const isWakeWordNativeAvailable = Boolean(wakeWordPackage?.PorcupineManager);

export function getBuiltInKeywordsMap(): BuiltInKeywordsMap {
  return wakeWordPackage?.BuiltInKeywords ?? {};
}

export async function createPorcupineManagerFromBuiltIns(
  accessKey: string,
  keywords: string[],
  detectionCallback: DetectionCallback,
  processErrorCallback?: ProcessErrorCallback,
  modelPath?: string,
  device?: string,
  sensitivities?: number[]
): Promise<PorcupineManagerInstance> {
  const manager = getNativeManager();
  return manager.fromBuiltInKeywords(
    accessKey,
    keywords,
    detectionCallback,
    processErrorCallback,
    modelPath,
    device,
    sensitivities
  );
}

export async function createPorcupineManagerFromKeywordPaths(
  accessKey: string,
  keywordPaths: string[],
  detectionCallback: DetectionCallback,
  processErrorCallback?: ProcessErrorCallback,
  modelPath?: string,
  device?: string,
  sensitivities?: number[]
): Promise<PorcupineManagerInstance> {
  const manager = getNativeManager();
  return manager.fromKeywordPaths(
    accessKey,
    keywordPaths,
    detectionCallback,
    processErrorCallback,
    modelPath,
    device,
    sensitivities
  );
}

