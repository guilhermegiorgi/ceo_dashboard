export function setupWebSocketHandlers(wss) {
  const clients = new Set();

  wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection established');
    clients.add(ws);

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connection',
      message: 'Connected to GG.AI Labs Dashboard',
      timestamp: new Date().toISOString()
    }));

    // Handle incoming messages
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await handleWebSocketMessage(ws, message);
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
          timestamp: new Date().toISOString()
        }));
      }
    });

    // Handle connection close
    ws.on('close', () => {
      console.log('WebSocket connection closed');
      clients.delete(ws);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  // Broadcast function for sending updates to all clients
  function broadcast(message) {
    const data = JSON.stringify({
      ...message,
      timestamp: new Date().toISOString()
    });

    clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(data);
      }
    });
  }

  // Store broadcast function globally for use in other modules
  global.broadcastToClients = broadcast;

  return { broadcast, clients };
}

async function handleWebSocketMessage(ws, message) {
  const { type, data } = message;

  switch (type) {
    case 'ping':
      ws.send(JSON.stringify({
        type: 'pong',
        timestamp: new Date().toISOString()
      }));
      break;

    case 'subscribe':
      // Handle subscription to specific data streams
      ws.subscriptions = ws.subscriptions || new Set();
      if (data.stream) {
        ws.subscriptions.add(data.stream);
        ws.send(JSON.stringify({
          type: 'subscribed',
          stream: data.stream,
          timestamp: new Date().toISOString()
        }));
      }
      break;

    case 'unsubscribe':
      if (ws.subscriptions && data.stream) {
        ws.subscriptions.delete(data.stream);
        ws.send(JSON.stringify({
          type: 'unsubscribed',
          stream: data.stream,
          timestamp: new Date().toISOString()
        }));
      }
      break;

    case 'request_insights':
      // Trigger insight generation
      try {
        const insights = await generateAIInsights(data.context);
        ws.send(JSON.stringify({
          type: 'insights_generated',
          data: insights,
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to generate insights',
          timestamp: new Date().toISOString()
        }));
      }
      break;

    default:
      ws.send(JSON.stringify({
        type: 'error',
        message: `Unknown message type: ${type}`,
        timestamp: new Date().toISOString()
      }));
  }
}