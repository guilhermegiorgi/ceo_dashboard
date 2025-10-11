import { Router } from 'express';
import { queryCognito } from '../services/cognitoService.js';

const router = Router();

router.post('/query-stream', async (req, res) => {
  const { query, sessionId } = req.body;

  if (!query || !sessionId) {
    return res.status(400).json({ error: 'query and sessionId are required' });
  }

  try {
    const stream = await queryCognito(query, { sessionId, stream: true });

    if (stream.error) {
      return res.status(500).json({ error: stream.errorDetails || 'An error occurred during the stream.' });
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    stream.on('data', (chunk) => {
      res.write(chunk);
    });

    stream.on('end', () => {
      res.end();
    });

    stream.on('error', (err) => {
      console.error('Stream error:', err);
      res.status(500).json({ error: 'An error occurred during the stream.' });
    });

  } catch (error) {
    console.error('Error in query-stream:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
