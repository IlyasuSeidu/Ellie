/**
 * Tests for EllieBrainService
 *
 * Tests the HTTP client for the Ellie Brain Cloud Function,
 * including query sanitization, timeout handling, error handling,
 * and abort functionality.
 */

import { ellieBrainService } from '../EllieBrainService';
import type { VoiceAssistantUserContext } from '@/types/voiceAssistant';
import { ShiftPattern, ShiftSystem } from '@/types';

// ── Fixtures ───────────────────────────────────────────────────────

const mockUserContext: VoiceAssistantUserContext = {
  name: 'Alex',
  shiftCycle: {
    patternType: ShiftPattern.STANDARD_4_4_4,
    shiftSystem: ShiftSystem.TWO_SHIFT,
    daysOn: 4,
    nightsOn: 4,
    daysOff: 4,
    startDate: '2024-01-01',
    phaseOffset: 0,
  },
  currentDate: '2024-06-15',
  currentTime: '14:30',
  shiftSystem: '2-shift',
};

// ── Mock fetch ─────────────────────────────────────────────────────

const mockFetch = jest.fn();
global.fetch = mockFetch;

// ── Tests ──────────────────────────────────────────────────────────

describe('EllieBrainService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ellieBrainService.destroy();
  });

  describe('query', () => {
    it('should send a POST request to the brain URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ text: 'Response' })),
      });

      await ellieBrainService.query('What shift today?', mockUserContext);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should include query and user context in request body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ text: 'Response' })),
      });

      await ellieBrainService.query('Test query', mockUserContext);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.query).toBe('Test query');
      expect(body.userContext).toEqual(mockUserContext);
    });

    it('should return the response text', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              text: 'You have a day shift.',
              shiftData: { toolName: 'get_current_status', data: {} },
            })
          ),
      });

      const result = await ellieBrainService.query('What shift?', mockUserContext);

      expect(result.text).toBe('You have a day shift.');
      expect(result.shiftData).toBeDefined();
    });

    it('should support normalized success envelope responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              ok: true,
              requestId: 'req-1',
              data: { text: 'Envelope response' },
            })
          ),
      });

      const result = await ellieBrainService.query('What shift?', mockUserContext);
      expect(result.text).toBe('Envelope response');
      expect(result.requestId).toBe('req-1');
    });

    it('should strip HTML tags from query', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ text: 'Response' })),
      });

      await ellieBrainService.query('<script>alert("xss")</script>What shift?', mockUserContext);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.query).not.toContain('<script>');
      expect(body.query).toContain('What shift?');
    });

    it('should truncate long queries', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ text: 'Response' })),
      });

      const longQuery = 'a'.repeat(1000);
      await ellieBrainService.query(longQuery, mockUserContext);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.query.length).toBeLessThanOrEqual(500);
    });

    it('should throw for empty queries', async () => {
      await expect(ellieBrainService.query('   ', mockUserContext)).rejects.toThrow('Empty query');
    });

    it('should include conversation history trimmed to max messages', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ text: 'Response' })),
      });

      const history = Array.from({ length: 20 }, (_, i) => ({
        id: `msg_${i}`,
        role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
        text: `Message ${i}`,
        timestamp: Date.now() + i,
      }));

      await ellieBrainService.query('New query', mockUserContext, history);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      // maxHistoryMessages is 6 in test config
      expect(body.conversationHistory.length).toBeLessThanOrEqual(6);
    });

    it('should throw for 429 rate limit response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Too many requests'),
      });

      await expect(ellieBrainService.query('Test', mockUserContext)).rejects.toThrow(
        'Too many requests'
      );
    });

    it('should throw for 500 server error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal server error'),
      });

      await expect(ellieBrainService.query('Test', mockUserContext)).rejects.toThrow(
        'service is temporarily unavailable'
      );
    });

    it('should throw for invalid response without text', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('{}'),
      });

      await expect(ellieBrainService.query('Test', mockUserContext)).rejects.toThrow(
        'malformed response'
      );
    });
  });

  describe('abort', () => {
    it('should abort an in-flight request', async () => {
      // Create a fetch that hangs until aborted
      mockFetch.mockImplementation((_url: string, options: { signal: AbortSignal }) => {
        return new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () => {
            const abortError = new Error('The operation was aborted');
            abortError.name = 'AbortError';
            reject(abortError);
          });
        });
      });

      const queryPromise = ellieBrainService.query('Test', mockUserContext);

      // Wait a tick for the fetch to be called
      await new Promise((r) => setTimeout(r, 10));

      ellieBrainService.abort();

      await expect(queryPromise).rejects.toThrow('Request cancelled');
    }, 10000);

    it('should not throw when aborting with no active request', () => {
      expect(() => {
        ellieBrainService.abort();
      }).not.toThrow();
    });
  });

  describe('destroy', () => {
    it('should abort any in-flight request', () => {
      expect(() => {
        ellieBrainService.destroy();
      }).not.toThrow();
    });
  });
});
