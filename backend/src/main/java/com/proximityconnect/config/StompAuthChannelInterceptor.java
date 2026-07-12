package com.proximityconnect.config;

import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.security.Principal;

/**
 * The browser's WebSocket handshake can't carry a custom Authorization
 * header the way a normal fetch() can, so instead we authenticate on the
 * STOMP CONNECT frame itself - the frontend's STOMP client sends the JWT
 * as a "connectHeaders" value, which arrives here as a native STOMP header.
 *
 * Once verified, we attach a Principal whose name is the user's id. Spring's
 * user-destination routing (convertAndSendToUser) keys off Principal.getName(),
 * which is how a message sent to user 42 only reaches user 42's session.
 */
@Component
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private final JwtUtil jwtUtil;

    public StompAuthChannelInterceptor(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");

            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                throw new IllegalArgumentException("Missing Authorization header on STOMP CONNECT.");
            }

            String token = authHeader.substring(7);
            if (!jwtUtil.isValid(token)) {
                throw new IllegalArgumentException("Invalid or expired token on STOMP CONNECT.");
            }

            Long userId = jwtUtil.extractUserId(token);
            Principal principal = new StompPrincipal(String.valueOf(userId));
            accessor.setUser(principal);
        }

        return message;
    }

    /** Minimal Principal - only the user id (as a String) matters for routing. */
    private record StompPrincipal(String name) implements Principal {
        @Override
        public String getName() {
            return name;
        }
    }
}
