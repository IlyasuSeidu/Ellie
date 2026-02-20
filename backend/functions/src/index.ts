/**
 * Ellie Brain — Firebase Cloud Function Entry Point
 *
 * HTTPS callable function that processes voice assistant queries.
 * Validates requests, calls OpenAI API with tool use, returns responses.
 */

import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { processQuery } from './ellie-brain';
import { EllieBrainRequest } from './types';

const openaiApiKey = defineSecret('OPENAI_API_KEY');

/**
 * Main HTTPS endpoint for the Ellie Brain.
 *
 * POST /ellieBrain
 * Body: EllieBrainRequest
 * Response: EllieBrainResponse
 */
export const ellieBrain = onRequest(
  {
    secrets: [openaiApiKey],
    cors: true,
    maxInstances: 20,
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  async (req, res) => {
    // Only allow POST
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const body = req.body as EllieBrainRequest;

      // Validate required fields
      if (!body.query || typeof body.query !== 'string') {
        res.status(400).json({ error: 'Missing or invalid query' });
        return;
      }

      if (!body.userContext?.name || !body.userContext?.shiftCycle) {
        res.status(400).json({ error: 'Missing user context' });
        return;
      }

      if (!body.userContext.shiftCycle.startDate || body.userContext.shiftCycle.daysOff === undefined) {
        res.status(400).json({ error: 'Invalid shift cycle data' });
        return;
      }

      // Sanitize query length
      if (body.query.length > 500) {
        body.query = body.query.slice(0, 500);
      }

      const apiKey = openaiApiKey.value();
      if (!apiKey) {
        console.error('OPENAI_API_KEY secret is not configured');
        res.status(500).json({ error: 'Service configuration error' });
        return;
      }

      const response = await processQuery(body, apiKey);
      res.status(200).json(response);
    } catch (error) {
      console.error('Ellie Brain error:', error);

      const message = error instanceof Error ? error.message : 'Unknown error';

      // Don't leak internal errors to client
      if (message.includes('rate_limit') || message.includes('429')) {
        res.status(429).json({ error: 'Too many requests. Please try again in a moment.' });
      } else {
        res.status(500).json({ error: 'Something went wrong. Please try again.' });
      }
    }
  }
);
