import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { WS_BASE, getToken } from './client.js';

/**
 * Opens a STOMP connection and subscribes to this user's personal message
 * queue. `onMessage` fires for every message addressed to the logged-in
 * user - callers filter down to the conversation they care about.
 *
 * Returns the client so the caller can call .deactivate() on unmount and
 * .publish(...) to send messages.
 */
export function connectChat(onMessage, onConnected) {
  const client = new Client({
    webSocketFactory: () => new SockJS(WS_BASE),
    connectHeaders: {
      Authorization: `Bearer ${getToken()}`,
    },
    reconnectDelay: 3000,
    onConnect: () => {
      client.subscribe('/user/queue/messages', (frame) => {
        onMessage(JSON.parse(frame.body));
      });
      onConnected?.();
    },
  });

  client.activate();
  return client;
}

export function sendChatMessage(client, recipientId, content) {
  client.publish({
    destination: '/app/chat.send',
    body: JSON.stringify({ recipientId, content }),
  });
}
