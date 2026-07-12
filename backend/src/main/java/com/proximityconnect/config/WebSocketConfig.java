package com.proximityconnect.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final StompAuthChannelInterceptor authInterceptor;

    public WebSocketConfig(StompAuthChannelInterceptor authInterceptor) {
        this.authInterceptor = authInterceptor;
    }

    @Override
    public void configureMessageBroker(@NonNull MessageBrokerRegistry registry) {
        // /topic is for broadcast-style channels (unused today, kept for
        // future features like "online now"); /queue is per-user delivery.
        registry.enableSimpleBroker("/topic", "/queue");
        // Messages the client sends are prefixed /app (see ChatController's
        // @MessageMapping); /user is how convertAndSendToUser resolves targets.
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(@NonNull StompEndpointRegistry registry) {
        // withSockJS() falls back to long-polling for networks/proxies that
        // block raw WebSocket connections - handles itself transparently.
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*") // CORS is enforced by SecurityConfig for REST; loosened here for the handshake
                .withSockJS();
    }

    @Override
    public void configureClientInboundChannel(@NonNull ChannelRegistration registration) {
        registration.interceptors(authInterceptor);
    }
}
