/**
 * Ellie Brain Service
 *
 * HTTP client for the Ellie Brain Cloud Function backend.
 * Sends user queries with context and conversation history,
 * receives natural language responses with optional shift data.
 */

import { ellieBrainConfig, voiceAssistantConfig } from '@/config/env';
import { logger } from '@/utils/logger';
import type {
  EllieBrainRequest,
  EllieBrainResponse,
  VoiceAssistantUserContext,
  VoiceMessage,
} from '@/types/voiceAssistant';

class EllieBrainService {
  private abortController: AbortController | null = null;

  /**
   * Send a query to the Ellie Brain backend.
   *
   * @param query - The user's transcribed speech
   * @param userContext - User context (name, shift cycle, current date, etc.)
   * @param conversationHistory - Recent messages for multi-turn conversation
   * @returns The brain's response with text and optional shift data
   */
  async query(
    query: string,
    userContext: VoiceAssistantUserContext,
    conversationHistory: VoiceMessage[] = []
  ): Promise<EllieBrainResponse> {
    // Sanitize and truncate query
    const sanitizedQuery = query
      .replace(/<[^>]*>/g, '')
      .trim()
      .slice(0, ellieBrainConfig.maxQueryLength);

    if (!sanitizedQuery) {
      throw new Error('Empty query');
    }

    // Build conversation history (last N messages)
    const history = conversationHistory
      .slice(-voiceAssistantConfig.maxHistoryMessages)
      .map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        text: msg.text,
      }));

    const requestBody: EllieBrainRequest = {
      query: sanitizedQuery,
      userContext,
      conversationHistory: history,
    };

    // Cancel any in-flight request
    this.abort();
    this.abortController = new AbortController();

    // Set up explicit timeout
    const timeoutId = setTimeout(() => {
      this.abortController?.abort();
    }, ellieBrainConfig.timeout);

    try {
      logger.info('Sending query to Ellie Brain', {
        queryLength: sanitizedQuery.length,
        historyCount: history.length,
      });

      const response = await fetch(ellieBrainConfig.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment before asking again.');
        }
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Backend error (${response.status}): ${errorText}`);
      }

      const data: EllieBrainResponse = await response.json();

      if (!data.text) {
        throw new Error('Invalid response from backend');
      }

      logger.info('Received response from Ellie Brain', {
        responseLength: data.text.length,
        hasShiftData: !!data.shiftData,
      });

      return data;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      logger.error('Ellie Brain query failed', error as Error);
      throw error;
    } finally {
      clearTimeout(timeoutId);
      this.abortController = null;
    }
  }

  /**
   * Abort any in-flight request.
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Clean up.
   */
  destroy(): void {
    this.abort();
  }
}

export const ellieBrainService = new EllieBrainService();
