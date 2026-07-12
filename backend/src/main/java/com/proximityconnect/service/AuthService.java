package com.proximityconnect.service;

import com.proximityconnect.config.JwtUtil;
import com.proximityconnect.dto.LoginRequest;
import com.proximityconnect.dto.RegisterRequest;
import com.proximityconnect.model.IdentityType;
import com.proximityconnect.model.User;
import com.proximityconnect.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    public String register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new IllegalArgumentException("An account with this email already exists.");
        }
        if (req.getIdentityType() == IdentityType.LGBTQ && req.getOrientationTag() == null) {
            throw new IllegalArgumentException("orientationTag is required when identityType is LGBTQ.");
        }
        if (req.getIdentityType() == IdentityType.STRAIGHT && req.getGender() == null) {
            throw new IllegalArgumentException("gender is required when identityType is STRAIGHT.");
        }

        User user = new User();
        user.setEmail(req.getEmail());
        user.setPasswordHash(passwordEncoder.encode(req.getPassword()));
        user.setDisplayName(req.getDisplayName());
        user.setIdentityType(req.getIdentityType());
        user.setGender(req.getGender());
        // Only persist the tag for LGBTQ users - keeps STRAIGHT profiles clean.
        user.setOrientationTag(req.getIdentityType() == IdentityType.LGBTQ ? req.getOrientationTag() : null);
        user.setLatitude(req.getLatitude());
        user.setLongitude(req.getLongitude());

        User saved = userRepository.save(user);
        return jwtUtil.generateToken(saved.getId(), saved.getEmail());
    }

    public String login(LoginRequest req) {
        User user = userRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password."));

        if (!passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid email or password.");
        }

        return jwtUtil.generateToken(user.getId(), user.getEmail());
    }
}
