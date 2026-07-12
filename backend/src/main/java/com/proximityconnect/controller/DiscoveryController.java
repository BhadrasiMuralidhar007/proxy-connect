package com.proximityconnect.controller;

import com.proximityconnect.dto.ProfileResponse;
import com.proximityconnect.model.User;
import com.proximityconnect.repository.UserRepository;
import com.proximityconnect.service.MatchingService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/discovery")
public class DiscoveryController {

    private final MatchingService matchingService;
    private final UserRepository userRepository;

    public DiscoveryController(MatchingService matchingService, UserRepository userRepository) {
        this.matchingService = matchingService;
        this.userRepository = userRepository;
    }

    /**
     * Returns nearby profiles for the logged-in user, already filtered
     * according to the straight/LGBTQ+ matching rules in MatchingService.
     * The caller's identity is never a query param - it's derived from the
     * JWT so a user can't request someone else's feed.
     */
    @GetMapping("/nearby")
    public ResponseEntity<?> nearby(Authentication authentication,
                                     @RequestParam(required = false) Double radiusKm) {
        Long selfId = (Long) authentication.getPrincipal();
        User self = userRepository.findById(selfId)
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found."));

        try {
            List<ProfileResponse> results = matchingService.findNearby(self, radiusKm).stream()
                    .map(ProfileResponse::from)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(results);
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
