/**
 * Speech recognition native adapter.
 *
 * expo-speech-recognition is not available in Expo Go, so we load it
 * defensively to avoid crashing app startup when the native module is missing.
 */

import { logger } from '@/utils/logger';

type SpeechRecognitionEventName = 'result' | 'error' | 'end';

interface PermissionStatus {
  granted: boolean;
}

interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultEvent {
  results?: SpeechRecognitionResult[];
  isFinal: boolean;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

interface SpeechRecognitionEventMap {
  result: SpeechRecognitionResultEvent;
  error: SpeechRecognitionErrorEvent;
  end: undefined;
}

interface StartOptions {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  addsPunctuation: boolean;
}

interface SpeechRecognitionModuleShape {
  requestPermissionsAsync: () => Promise<PermissionStatus>;
  getPermissionsAsync: () => Promise<PermissionStatus>;
  start: (options: StartOptions) => void;
  stop: () => void;
  abort: () => void;
}

type UseSpeechRecognitionEvent = <TEventName extends SpeechRecognitionEventName>(
  eventName: TEventName,
  listener: (event: SpeechRecognitionEventMap[TEventName]) => void
) => void;

const unavailableMessage =
  'Speech recognition native module is unavailable. Build a development/production app (Expo Go does not include ExpoSpeechRecognition).';

const unavailableModule: SpeechRecognitionModuleShape = {
  requestPermissionsAsync() {
    return Promise.resolve({ granted: false });
  },
  getPermissionsAsync() {
    return Promise.resolve({ granted: false });
  },
  start() {
    throw new Error(unavailableMessage);
  },
  stop() {
    throw new Error(unavailableMessage);
  },
  abort() {
    throw new Error(unavailableMessage);
  },
};

const noopUseSpeechRecognitionEvent: UseSpeechRecognitionEvent = () => {};

type SpeechRecognitionPackage = {
  ExpoSpeechRecognitionModule?: SpeechRecognitionModuleShape;
  useSpeechRecognitionEvent?: UseSpeechRecognitionEvent;
};

let speechRecognitionPackage: SpeechRecognitionPackage | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  speechRecognitionPackage = require('expo-speech-recognition') as SpeechRecognitionPackage;
} catch (error) {
  logger.warn('expo-speech-recognition is unavailable in this runtime', {
    error: error instanceof Error ? error.message : String(error),
  });
}

export const isSpeechRecognitionNativeAvailable = Boolean(
  speechRecognitionPackage?.ExpoSpeechRecognitionModule &&
    speechRecognitionPackage?.useSpeechRecognitionEvent
);

export const ExpoSpeechRecognitionModule =
  speechRecognitionPackage?.ExpoSpeechRecognitionModule ?? unavailableModule;

export const useSpeechRecognitionEvent =
  speechRecognitionPackage?.useSpeechRecognitionEvent ?? noopUseSpeechRecognitionEvent;
