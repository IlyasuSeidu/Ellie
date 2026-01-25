/* eslint-disable no-console */
import { logger, __testing__ } from '@/utils/logger';

const { formatLogMessage, shouldLog, config } = __testing__;

describe('Logger', () => {
  // Store original console methods
  const originalConsole = {
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };

  // Mock console methods
  beforeEach(() => {
    console.debug = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original console methods
    console.debug = originalConsole.debug;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });

  describe('formatLogMessage', () => {
    it('should format message with timestamp and level', () => {
      const message = formatLogMessage('info', 'Test message');
      expect(message).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*\] \[INFO\] Test message/);
    });

    it('should include context in message', () => {
      const message = formatLogMessage('info', 'Test message', { userId: '123' });
      expect(message).toContain('Test message');
      expect(message).toContain('"userId": "123"');
    });

    it('should handle empty context', () => {
      const message = formatLogMessage('info', 'Test message', {});
      expect(message).not.toContain('{}');
    });

    it('should format all log levels', () => {
      expect(formatLogMessage('debug', 'Debug')).toContain('[DEBUG]');
      expect(formatLogMessage('info', 'Info')).toContain('[INFO]');
      expect(formatLogMessage('warn', 'Warn')).toContain('[WARN]');
      expect(formatLogMessage('error', 'Error')).toContain('[ERROR]');
    });
  });

  describe('shouldLog', () => {
    it('should respect minimum log level', () => {
      const originalMinLevel = config.minLevel;

      config.minLevel = 'info';
      expect(shouldLog('debug')).toBe(false);
      expect(shouldLog('info')).toBe(true);
      expect(shouldLog('warn')).toBe(true);
      expect(shouldLog('error')).toBe(true);

      // Restore
      config.minLevel = originalMinLevel;
    });

    it('should allow all levels when minLevel is debug', () => {
      const originalMinLevel = config.minLevel;

      config.minLevel = 'debug';
      expect(shouldLog('debug')).toBe(true);
      expect(shouldLog('info')).toBe(true);
      expect(shouldLog('warn')).toBe(true);
      expect(shouldLog('error')).toBe(true);

      // Restore
      config.minLevel = originalMinLevel;
    });

    it('should only allow error when minLevel is error', () => {
      const originalMinLevel = config.minLevel;

      config.minLevel = 'error';
      expect(shouldLog('debug')).toBe(false);
      expect(shouldLog('info')).toBe(false);
      expect(shouldLog('warn')).toBe(false);
      expect(shouldLog('error')).toBe(true);

      // Restore
      config.minLevel = originalMinLevel;
    });
  });

  describe('logger.debug', () => {
    it('should call console.debug with formatted message', () => {
      logger.debug('Debug message');
      expect(console.debug).toHaveBeenCalledWith(expect.stringContaining('[DEBUG] Debug message'));
    });

    it('should include context', () => {
      logger.debug('Debug message', { key: 'value' });
      expect(console.debug).toHaveBeenCalledWith(expect.stringContaining('"key": "value"'));
    });
  });

  describe('logger.info', () => {
    it('should call console.info with formatted message', () => {
      logger.info('Info message');
      expect(console.info).toHaveBeenCalledWith(expect.stringContaining('[INFO] Info message'));
    });

    it('should include context', () => {
      logger.info('Info message', { count: 42 });
      expect(console.info).toHaveBeenCalledWith(expect.stringContaining('"count": 42'));
    });
  });

  describe('logger.warn', () => {
    it('should call console.warn with formatted message', () => {
      logger.warn('Warning message');
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('[WARN] Warning message'));
    });

    it('should include context', () => {
      logger.warn('Warning message', { retry: true });
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('"retry": true'));
    });
  });

  describe('logger.error', () => {
    it('should call console.error with formatted message', () => {
      logger.error('Error message');
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('[ERROR] Error message'));
    });

    it('should include error details', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error);

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Test error'));
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('"name": "Error"'));
    });

    it('should include context with error', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error, { userId: '123' });

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('"userId": "123"'));
    });

    it('should work without error object', () => {
      logger.error('Error message', undefined, { action: 'fetch' });
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('"action": "fetch"'));
    });
  });

  describe('logger.setMinLevel', () => {
    it('should update minimum log level', () => {
      const originalMinLevel = config.minLevel;

      logger.setMinLevel('error');
      expect(config.minLevel).toBe('error');

      logger.debug('Should not log');
      expect(console.debug).not.toHaveBeenCalled();

      logger.error('Should log');
      expect(console.error).toHaveBeenCalled();

      // Restore
      config.minLevel = originalMinLevel;
    });

    it('should affect all log levels', () => {
      const originalMinLevel = config.minLevel;

      logger.setMinLevel('warn');

      logger.debug('Debug');
      logger.info('Info');
      expect(console.debug).not.toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();

      logger.warn('Warn');
      logger.error('Error');
      expect(console.warn).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();

      // Restore
      config.minLevel = originalMinLevel;
    });
  });

  describe('Integration', () => {
    it('should log complete message with all features', () => {
      const error = new Error('Database connection failed');
      logger.error('Failed to connect to database', error, {
        host: 'localhost',
        port: 5432,
        retries: 3,
      });

      expect(console.error).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[.*\] \[ERROR\] Failed to connect to database.*"host": "localhost".*"port": 5432.*"retries": 3/s
        )
      );
    });

    it('should handle nested context objects', () => {
      logger.info('User action', {
        user: {
          id: '123',
          name: 'John',
        },
        action: {
          type: 'click',
          target: 'button',
        },
      });

      expect(console.info).toHaveBeenCalledWith(expect.stringContaining('"id": "123"'));
      expect(console.info).toHaveBeenCalledWith(expect.stringContaining('"type": "click"'));
    });
  });
});
