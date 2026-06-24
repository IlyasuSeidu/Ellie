export {
  answerWithLocalShiftBrain as tryOfflineFallback,
  buildLocalShiftBrainUnsupportedResponse as buildOfflineUnsupportedResponse,
  classifyLocalShiftBrainIntent as classifyOfflineIntent,
} from './localShiftBrain';

export type {
  LocalShiftBrainIntentClassification as OfflineIntentClassification,
  LocalShiftBrainIntentGuess as OfflineIntentGuess,
  LocalShiftBrainResult as OfflineFallbackResult,
} from './localShiftBrain';
