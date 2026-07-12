package com.proximityconnect.dto;

import com.proximityconnect.model.Message;
import java.time.Instant;

public class ChatMessageResponse {

    private Long id;
    private Long senderId;
    private Long recipientId;
    private String content;
    private Instant sentAt;

    public static ChatMessageResponse from(Message m) {
        ChatMessageResponse dto = new ChatMessageResponse();
        dto.id = m.getId();
        dto.senderId = m.getSenderId();
        dto.recipientId = m.getRecipientId();
        dto.content = m.getContent();
        dto.sentAt = m.getSentAt();
        return dto;
    }

    public Long getId() { return id; }
    public Long getSenderId() { return senderId; }
    public Long getRecipientId() { return recipientId; }
    public String getContent() { return content; }
    public Instant getSentAt() { return sentAt; }
}
