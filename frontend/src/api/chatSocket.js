import { WS_BASE, getToken } from './client.js';

/**
 * Opens a standard browser-native WebSocket connection and handles
 * messaging for the logged-in user.
 *
 * Returns a client compatible with the original interface so that the
 * caller can call .deactivate() on unmount and .publish(...) to send messages.
 */
export function connectChat(onMessage, onConnected) {
  const wsUrl = WS_BASE.replace(/^http/, 'ws');
  const token = getToken();
  const socketUrl = `${wsUrl}?token=${encodeURIComponent(token || '')}`;
  
  const ws = new WebSocket(socketUrl);
  let isClosed = false;

  ws.onopen = () => {
    if (!isClosed) {
      onConnected?.();
    }
  };

  ws.onmessage = (event) => {
    if (isClosed) return;
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (err) {
      console.error('Error parsing WS message:', err);
    }
  };

  ws.onerror = (err) => {
    console.error('WebSocket error:', err);
  };

  ws.onclose = () => {
    console.log('WebSocket connection closed');
  };

  return {
    deactivate: () => {
      isClosed = true;
      ws.close();
    },
    publish: ({ body }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(body);
      } else {
        console.warn('WebSocket not open, message queued or dropped');
      }
    }
  };
}

export function sendChatMessage(client, recipientId, content) {
  client.publish({
    body: JSON.stringify({ recipientId, content })
  });
}
