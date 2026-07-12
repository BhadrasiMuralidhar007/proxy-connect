package com.proximityconnect.controller;

import com.proximityconnect.dto.LocationUpdateRequest;
import com.proximityconnect.dto.ProfileResponse;
import com.proximityconnect.model.User;
import com.proximityconnect.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final UserRepository userRepository;

    public ProfileController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/me")
    public ResponseEntity<ProfileResponse> me(Authentication authentication) {
        Long selfId = (Long) authentication.getPrincipal();
        User self = userRepository.findById(selfId)
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found."));
        return ResponseEntity.ok(ProfileResponse.from(self));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProfileResponse> byId(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("No user with that id."));
        return ResponseEntity.ok(ProfileResponse.from(user));
    }

    /**
     * The frontend should call this whenever it gets a fresh device
     * location (on login, on app foreground, or periodically) so
     * discovery results stay accurate as the person moves around.
     */
    @PutMapping("/location")
    public ResponseEntity<ProfileResponse> updateLocation(Authentication authentication,
                                                            @Valid @RequestBody LocationUpdateRequest req) {
        Long selfId = (Long) authentication.getPrincipal();
        User self = userRepository.findById(selfId)
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found."));

        self.setLatitude(req.getLatitude());
        self.setLongitude(req.getLongitude());
        User saved = userRepository.save(self);

        return ResponseEntity.ok(ProfileResponse.from(saved));
    }
}
