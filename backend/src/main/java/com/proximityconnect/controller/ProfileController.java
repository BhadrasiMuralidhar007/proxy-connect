package com.proximityconnect.controller;

import com.proximityconnect.dto.LocationUpdateRequest;
import com.proximityconnect.dto.ProfileResponse;
import com.proximityconnect.model.User;
import com.proximityconnect.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/me")
    public ResponseEntity<?> getMe() {
        try {
            Long userId = Long.valueOf(SecurityContextHolder.getContext().getAuthentication().getName());
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            ProfileResponse resp = new ProfileResponse(
                    user.getId(),
                    user.getDisplayName(),
                    user.getIdentityType(),
                    user.getGender(),
                    user.getOrientationTag()
            );
            resp.setPublicKey(user.getPublicKey());
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getProfileById(@PathVariable Long id) {
        try {
            User user = userRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            ProfileResponse resp = new ProfileResponse(
                    user.getId(),
                    user.getDisplayName(),
                    user.getIdentityType(),
                    user.getGender(),
                    user.getOrientationTag()
            );
            resp.setPublicKey(user.getPublicKey());
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(404).body(err);
        }
    }

    @PutMapping("/public-key")
    public ResponseEntity<?> updatePublicKey(@RequestBody Map<String, String> req) {
        try {
            Long userId = Long.valueOf(SecurityContextHolder.getContext().getAuthentication().getName());
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            user.setPublicKey(req.get("publicKey"));
            userRepository.save(user);

            Map<String, String> resp = new HashMap<>();
            resp.put("status", "public key updated");
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @PutMapping("/location")
    public ResponseEntity<?> updateLocation(@RequestBody LocationUpdateRequest req) {
        try {
            Long userId = Long.valueOf(SecurityContextHolder.getContext().getAuthentication().getName());
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            user.setLatitude(req.getLatitude());
            user.setLongitude(req.getLongitude());
            userRepository.save(user);

            Map<String, String> resp = new HashMap<>();
            resp.put("status", "location updated");
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }
}
