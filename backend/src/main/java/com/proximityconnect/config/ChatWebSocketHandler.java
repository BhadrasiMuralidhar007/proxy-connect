package com.proximityconnect.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.proximityconnect.model.Message;
import com.proximityconnect.repository.MessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.net.URI;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ChatWebSocketHandler extends TextWebSocketHandler {

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private ObjectMapper objectMapper;

    // Maps UserID to WebSocketSession
    private final Map<Long, WebSocketSession> activeSessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        URI uri = session.getUri();
        if (uri == null) {
            session.close(CloseStatus.BAD_DATA);
            return;
        }

        String query = uri.getQuery();
        String token = null;
        if (query != null && query.startsWith("token=")) {
            token = query.substring(6);
        }

        if (token == null || !jwtUtil.validateToken(token)) {
            session.close(CloseStatus.NOT_ACCEPTABLE);
            return;
        }

        try {
            String userIdStr = jwtUtil.extractUsername(token);
            Long userId = Long.valueOf(userIdStr);
            session.getAttributes().put("userId", userId);
            activeSessions.put(userId, session);
        } catch (Exception e) {
            session.close(CloseStatus.BAD_DATA);
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        Long senderId = (Long) session.getAttributes().get("userId");
        if (senderId == null) {
            session.close(CloseStatus.NOT_ACCEPTABLE);
            return;
        }

        String payload = message.getPayload();
        try {
            Map<String, Object> data = objectMapper.readValue(payload, Map.class);
            Object recipientIdObj = data.get("recipientId");
            String content = (String) data.get("content");

            if (recipientIdObj == null || content == null) {
                return;
            }

            Long recipientId = Long.valueOf(recipientIdObj.toString());

            boolean isSignal = content.startsWith("SIGNAL:") || content.contains("\"webrtcSig\"") || content.contains("\"type\":\"webrtc\"");
            Long msgId = 0L;
            String sentAtStr = java.time.LocalDateTime.now().toString();

            if (!isSignal) {
                // Save message to DB
                Message dbMessage = new Message();
                dbMessage.setSenderId(senderId);
                dbMessage.setRecipientId(recipientId);
                dbMessage.setContent(content);
                dbMessage = messageRepository.save(dbMessage);
                msgId = dbMessage.getId();
                sentAtStr = dbMessage.getSentAt().toString();
            }

            // Construct response JSON
            Map<String, Object> responseMap = new ConcurrentHashMap<>();
            responseMap.put("id", msgId);
            responseMap.put("senderId", senderId);
            responseMap.put("recipientId", recipientId);
            responseMap.put("content", content);
            responseMap.put("sentAt", sentAtStr);
            if (isSignal) {
                responseMap.put("isSignal", true);
            }

            String jsonResponse = objectMapper.writeValueAsString(responseMap);
            TextMessage textResponse = new TextMessage(jsonResponse);

            // Send to sender
            if (!isSignal) {
                session.sendMessage(textResponse);
            }

            // Send to recipient if online
            WebSocketSession recipientSession = activeSessions.get(recipientId);
            if (recipientSession != null && recipientSession.isOpen()) {
                recipientSession.sendMessage(textResponse);
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        Long userId = (Long) session.getAttributes().get("userId");
        if (userId != null) {
            activeSessions.remove(userId);
        }
    }
}
