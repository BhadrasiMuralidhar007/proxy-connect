package com.proximityconnect.controller;

import com.proximityconnect.dto.ChatMessageRequest;
import com.proximityconnect.dto.ChatMessageResponse;
import com.proximityconnect.model.Message;
import com.proximityconnect.repository.MessageRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;
import java.util.stream.Collectors;

@RestController
public class ChatController {

    private final MessageRepository messageRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatController(MessageRepository messageRepository, SimpMessagingTemplate messagingTemplate) {
        this.messageRepository = messageRepository;
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * WebSocket entry point. The frontend publishes to /app/chat.send;
     * Spring routes it here based on the @MessageMapping path. `principal`
     * is the one StompAuthChannelInterceptor attached during CONNECT, so
     * senderId always comes from the verified token, never from the payload.
     */
    @MessageMapping("/chat.send")
    public void send(@Payload ChatMessageRequest request, Principal principal) {
        Long senderId = Long.valueOf(principal.getName());

        Message saved = messageRepository.save(new Message(senderId, request.getRecipientId(), request.getContent()));
        ChatMessageResponse response = ChatMessageResponse.from(saved);

        // Deliver to the recipient's personal queue...
        messagingTemplate.convertAndSendToUser(String.valueOf(request.getRecipientId()), "/queue/messages", response);
        // ...and echo back to the sender too, so their own other open tabs/devices stay in sync.
        messagingTemplate.convertAndSendToUser(String.valueOf(senderId), "/queue/messages", response);
    }

    /**
     * REST fallback for loading history when a chat screen first opens -
     * WebSocket only delivers messages sent *while* connected, so the
     * frontend calls this once on load, then relies on the socket for
     * anything sent after that.
     */
    @GetMapping("/api/chat/history/{otherUserId}")
    public ResponseEntity<List<ChatMessageResponse>> history(Authentication authentication, @PathVariable Long otherUserId) {
        Long selfId = (Long) authentication.getPrincipal();
        List<ChatMessageResponse> messages = messageRepository.findConversation(selfId, otherUserId).stream()
                .map(ChatMessageResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(messages);
    }
}
