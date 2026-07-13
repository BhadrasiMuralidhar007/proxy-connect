package com.proximityconnect.controller;

import com.proximityconnect.dto.ProfileResponse;
import com.proximityconnect.service.MatchingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/discovery")
public class DiscoveryController {

    @Autowired
    private MatchingService matchingService;

    @GetMapping("/nearby")
    public ResponseEntity<?> getDiscoveryFeed(@RequestParam(value = "radiusKm", required = false) Double radiusKm) {
        try {
            Long userId = Long.valueOf(SecurityContextHolder.getContext().getAuthentication().getName());
            List<ProfileResponse> feed = matchingService.getDiscoveryFeed(userId, radiusKm);
            return ResponseEntity.ok(feed);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }
}
