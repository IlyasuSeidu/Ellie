import { WakeWordError, wakeWordService } from '../WakeWordService';
import {
  createPorcupineManagerFromBuiltIns,
  createPorcupineManagerFromKeywordPaths,
} from '../wakeWordNative';
import {
  addOpenWakeWordDetectionListener,
  addOpenWakeWordErrorListener,
  addOpenWakeWordInferenceListener,
  getOpenWakeWordConfig,
  initializeOpenWakeWord,
  startOpenWakeWord,
  stopOpenWakeWord,
} from '../openWakeWordNative';

jest.mock('../wakeWordNative', () => ({
  isWakeWordNativeAvailable: true,
  getBuiltInKeywordsMap: jest.fn(() => ({ PORCUPINE: 'porcupine' })),
  createPorcupineManagerFromBuiltIns: jest.fn(),
  createPorcupineManagerFromKeywordPaths: jest.fn(),
}));

jest.mock('../openWakeWordNative', () => ({
  isOpenWakeWordNativeAvailable: true,
  initializeOpenWakeWord: jest.fn(() => Promise.resolve()),
  startOpenWakeWord: jest.fn(() => Promise.resolve()),
  stopOpenWakeWord: jest.fn(() => Promise.resolve()),
  destroyOpenWakeWord: jest.fn(() => Promise.resolve()),
  getOpenWakeWordConfig: jest.fn(() => null),
  addOpenWakeWordDetectionListener: jest.fn(() => ({ remove: jest.fn() })),
  addOpenWakeWordErrorListener: jest.fn(() => ({ remove: jest.fn() })),
  addOpenWakeWordInferenceListener: jest.fn(() => ({ remove: jest.fn() })),
}));

const manager = {
  start: jest.fn(() => Promise.resolve()),
  stop: jest.fn(() => Promise.resolve()),
  delete: jest.fn(),
};

const baseConfig = {
  provider: 'porcupine' as const,
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
    (initializeOpenWakeWord as jest.Mock).mockResolvedValue(undefined);
    (getOpenWakeWordConfig as jest.Mock).mockReturnValue(null);
    (startOpenWakeWord as jest.Mock).mockResolvedValue(undefined);
    (stopOpenWakeWord as jest.Mock).mockResolvedValue(undefined);
    (addOpenWakeWordDetectionListener as jest.Mock).mockReturnValue({ remove: jest.fn() });
    (addOpenWakeWordErrorListener as jest.Mock).mockReturnValue({ remove: jest.fn() });
    (addOpenWakeWordInferenceListener as jest.Mock).mockReturnValue({ remove: jest.fn() });
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

  it('falls back to built-in keywords when custom model is invalid/incompatible', async () => {
    (createPorcupineManagerFromKeywordPaths as jest.Mock).mockRejectedValue(
      new Error('Initialization failed: invalid keyword model (.ppn)')
    );

    const onError = jest.fn();
    const initialized = await wakeWordService.initialize(
      {
        ...baseConfig,
        keywordPaths: ['ellie_android.ppn'],
      },
      { onDetection: jest.fn(), onError }
    );

    expect(initialized).toBe(true);
    expect(createPorcupineManagerFromBuiltIns).toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(wakeWordService.isUnavailableForSession()).toBe(false);
  });

  it('uses literal built-in keyword fallback when BuiltInKeywords map is unavailable', async () => {
    const wakeWordNative = jest.requireMock('../wakeWordNative') as {
      getBuiltInKeywordsMap: jest.Mock;
    };
    wakeWordNative.getBuiltInKeywordsMap.mockReturnValue({});
    (createPorcupineManagerFromKeywordPaths as jest.Mock).mockRejectedValue(
      new Error('Initialization failed: invalid keyword model (.ppn)')
    );

    const onError = jest.fn();
    const initialized = await wakeWordService.initialize(
      {
        ...baseConfig,
        keywordPaths: ['ellie_android.ppn'],
      },
      { onDetection: jest.fn(), onError }
    );

    expect(initialized).toBe(true);
    const firstBuiltInCall = (createPorcupineManagerFromBuiltIns as jest.Mock).mock.calls[0];
    expect(firstBuiltInCall?.[0]).toBe('test-access-key');
    expect(firstBuiltInCall?.[1]).toEqual(['porcupine']);
    expect(typeof firstBuiltInCall?.[2]).toBe('function');
    expect(typeof firstBuiltInCall?.[3]).toBe('function');
    expect(onError).not.toHaveBeenCalled();
  });

  it('disables wake-word session when built-in initialization is incompatible', async () => {
    (createPorcupineManagerFromKeywordPaths as jest.Mock).mockRejectedValue(
      new Error('Initialization failed: invalid keyword model (.ppn)')
    );
    (createPorcupineManagerFromBuiltIns as jest.Mock)
      .mockRejectedValueOnce(new Error('Initialization failed: invalid model'))
      .mockRejectedValueOnce(new Error('Initialization failed: invalid model'));

    const onError = jest.fn();
    const initialized = await wakeWordService.initialize(
      {
        ...baseConfig,
        keywordPaths: ['ellie_android.ppn'],
      },
      { onDetection: jest.fn(), onError }
    );

    expect(initialized).toBe(false);
    expect(wakeWordService.isUnavailableForSession()).toBe(true);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'configuration_error',
        fatal: true,
        retryable: false,
      })
    );
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

  it('initializes OpenWakeWord provider with model path', async () => {
    const onError = jest.fn();
    const initialized = await wakeWordService.initialize(
      {
        ...baseConfig,
        provider: 'openwakeword',
        openWakeWordModelPath: 'openwakeword/hey_ellie.onnx',
        openWakeWordKeywordLabel: 'Hey Ellie',
      },
      { onDetection: jest.fn(), onError }
    );

    expect(initialized).toBe(true);
    expect(initializeOpenWakeWord).toHaveBeenCalledWith(
      expect.objectContaining({
        modelPath: 'openwakeword/hey_ellie.onnx',
        keywordLabel: 'Hey Ellie',
      })
    );
    expect(addOpenWakeWordDetectionListener).toHaveBeenCalled();
    expect(addOpenWakeWordErrorListener).toHaveBeenCalled();
    expect(addOpenWakeWordInferenceListener).toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('returns fatal configuration error when OpenWakeWord model path is missing', async () => {
    const onError = jest.fn();
    const initialized = await wakeWordService.initialize(
      {
        ...baseConfig,
        provider: 'openwakeword',
        openWakeWordModelPath: '',
      },
      { onDetection: jest.fn(), onError }
    );

    expect(initialized).toBe(false);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'configuration_error',
        fatal: true,
        retryable: false,
      })
    );
    expect(wakeWordService.isUnavailableForSession()).toBe(true);
  });
});
