import { WakeWordError, wakeWordService } from '../WakeWordService';
import {
  createPorcupineManagerFromBuiltIns,
  createPorcupineManagerFromKeywordPaths,
} from '../wakeWordNative';

jest.mock('../wakeWordNative', () => ({
  isWakeWordNativeAvailable: true,
  getBuiltInKeywordsMap: jest.fn(() => ({ PORCUPINE: 'porcupine' })),
  createPorcupineManagerFromBuiltIns: jest.fn(),
  createPorcupineManagerFromKeywordPaths: jest.fn(),
}));

const manager = {
  start: jest.fn(() => Promise.resolve()),
  stop: jest.fn(() => Promise.resolve()),
  delete: jest.fn(),
};

const baseConfig = {
  accessKey: 'test-access-key',
  keywordPaths: [],
  builtInKeywords: ['PORCUPINE'],
  sensitivity: 0.65,
};

describe('WakeWordService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await wakeWordService.destroy();
    wakeWordService.resetSessionAvailability();
    (createPorcupineManagerFromBuiltIns as jest.Mock).mockResolvedValue(manager);
    (createPorcupineManagerFromKeywordPaths as jest.Mock).mockResolvedValue(manager);
  });

  it('falls back to built-in keywords when custom model init fails non-fatally', async () => {
    (createPorcupineManagerFromKeywordPaths as jest.Mock).mockRejectedValue(
      new Error('Temporary custom model issue')
    );

    const onError = jest.fn();
    const initialized = await wakeWordService.initialize(
      {
        ...baseConfig,
        keywordPaths: ['ellie_ios.ppn'],
      },
      { onDetection: jest.fn(), onError }
    );

    expect(initialized).toBe(true);
    expect(createPorcupineManagerFromBuiltIns).toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('disables wake-word for session after fatal activation-limit error', async () => {
    const activationError = new Error('Activation limit reached');
    activationError.name = 'PorcupineActivationLimitError';
    (createPorcupineManagerFromKeywordPaths as jest.Mock).mockRejectedValue(activationError);

    const onError = jest.fn();
    const initialized = await wakeWordService.initialize(
      {
        ...baseConfig,
        keywordPaths: ['ellie_ios.ppn'],
      },
      { onDetection: jest.fn(), onError }
    );

    expect(initialized).toBe(false);
    expect(createPorcupineManagerFromBuiltIns).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.any(WakeWordError));
    expect(wakeWordService.isUnavailableForSession()).toBe(true);
  });

  it('skips further initialization attempts once session is disabled', async () => {
    const activationError = new Error('Activation limit reached');
    activationError.name = 'PorcupineActivationLimitError';
    (createPorcupineManagerFromKeywordPaths as jest.Mock).mockRejectedValue(activationError);

    await wakeWordService.initialize(
      {
        ...baseConfig,
        keywordPaths: ['ellie_ios.ppn'],
      },
      { onDetection: jest.fn(), onError: jest.fn() }
    );

    jest.clearAllMocks();

    const secondAttempt = await wakeWordService.initialize(baseConfig, {
      onDetection: jest.fn(),
      onError: jest.fn(),
    });

    expect(secondAttempt).toBe(false);
    expect(createPorcupineManagerFromBuiltIns).not.toHaveBeenCalled();
    expect(createPorcupineManagerFromKeywordPaths).not.toHaveBeenCalled();
  });
});
