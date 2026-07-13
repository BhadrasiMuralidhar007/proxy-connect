package com.proximityconnect.controller;

import com.proximityconnect.dto.ChatMessageResponse;
import com.proximityconnect.model.Message;
import com.proximityconnect.repository.MessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    @Autowired
    private MessageRepository messageRepository;

    @GetMapping("/history/{otherUserId}")
    public ResponseEntity<?> getChatHistory(@PathVariable Long otherUserId) {
        try {
            Long currentUserId = Long.valueOf(SecurityContextHolder.getContext().getAuthentication().getName());
            List<Message> messages = messageRepository.findConversation(currentUserId, otherUserId);

            List<ChatMessageResponse> resp = messages.stream()
                    .map(m -> new ChatMessageResponse(
                            m.getId(),
                            m.getSenderId(),
                            m.getRecipientId(),
                            m.getContent(),
                            m.getSentAt()
                    ))
                    .collect(Collectors.toList());

            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }
}
