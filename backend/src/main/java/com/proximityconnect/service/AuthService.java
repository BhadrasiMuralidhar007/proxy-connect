package com.proximityconnect.service;

import com.proximityconnect.config.JwtUtil;
import com.proximityconnect.dto.LoginRequest;
import com.proximityconnect.dto.RegisterRequest;
import com.proximityconnect.model.User;
import com.proximityconnect.model.IdentityType;
import com.proximityconnect.model.Gender;
import com.proximityconnect.model.OrientationTag;
import com.proximityconnect.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    public String register(RegisterRequest req) {
        if (userRepository.findByEmail(req.getEmail()).isPresent()) {
            throw new RuntimeException("Email already exists");
        }

        User user = new User();
        user.setEmail(req.getEmail());
        user.setPasswordHash(passwordEncoder.encode(req.getPassword()));
        user.setDisplayName(req.getDisplayName());
        user.setIdentityType(req.getIdentityType());
        user.setGender(req.getGender());
        user.setOrientationTag(req.getOrientationTag());
        user.setLatitude(req.getLatitude());
        user.setLongitude(req.getLongitude());
        user = userRepository.save(user);

        // Seed mock matching profiles nearby so they see results
        seedNearbyProfiles(user);

        return jwtUtil.generateToken(String.valueOf(user.getId()), user.getEmail());
    }

    private void seedNearbyProfiles(User self) {
        double baseLat = self.getLatitude() != null ? self.getLatitude() : 37.7749;
        double baseLng = self.getLongitude() != null ? self.getLongitude() : -122.4194;

        if (self.getIdentityType() == IdentityType.STRAIGHT) {
            if (self.getGender() == Gender.MALE) {
                User f1 = new User();
                f1.setEmail("sophia." + System.currentTimeMillis() + "@example.com");
                f1.setPasswordHash(passwordEncoder.encode("seeded_password"));
                f1.setDisplayName("Sophia");
                f1.setIdentityType(IdentityType.STRAIGHT);
                f1.setGender(Gender.FEMALE);
                f1.setLatitude(baseLat + 0.005);
                f1.setLongitude(baseLng - 0.003);
                f1.setActive(true);
                userRepository.save(f1);

                User f2 = new User();
                f2.setEmail("emma." + (System.currentTimeMillis() + 1) + "@example.com");
                f2.setPasswordHash(passwordEncoder.encode("seeded_password"));
                f2.setDisplayName("Emma");
                f2.setIdentityType(IdentityType.STRAIGHT);
                f2.setGender(Gender.FEMALE);
                f2.setLatitude(baseLat - 0.004);
                f2.setLongitude(baseLng + 0.006);
                f2.setActive(true);
                userRepository.save(f2);
            } else if (self.getGender() == Gender.FEMALE) {
                User m1 = new User();
                m1.setEmail("liam." + System.currentTimeMillis() + "@example.com");
                m1.setPasswordHash(passwordEncoder.encode("seeded_password"));
                m1.setDisplayName("Liam");
                m1.setIdentityType(IdentityType.STRAIGHT);
                m1.setGender(Gender.MALE);
                m1.setLatitude(baseLat + 0.004);
                m1.setLongitude(baseLng - 0.005);
                m1.setActive(true);
                userRepository.save(m1);

                User m2 = new User();
                m2.setEmail("noah." + (System.currentTimeMillis() + 1) + "@example.com");
                m2.setPasswordHash(passwordEncoder.encode("seeded_password"));
                m2.setDisplayName("Noah");
                m2.setIdentityType(IdentityType.STRAIGHT);
                m2.setGender(Gender.MALE);
                m2.setLatitude(baseLat - 0.006);
                m2.setLongitude(baseLng + 0.003);
                m2.setActive(true);
                userRepository.save(m2);
            }
        } else {
            OrientationTag tag = self.getOrientationTag() != null ? self.getOrientationTag() : OrientationTag.QUEER;
            List<OrientationTag> compatTags = new ArrayList<>(getCompatibleTags(tag));
            String[] names = {"Alex", "Jordan", "Taylor", "Morgan"};
            Gender[] genders = {Gender.MALE, Gender.FEMALE, Gender.NON_BINARY};

            for (int i = 0; i < 4; i++) {
                String uName = names[i % names.length] + " " + (i + 1);
                OrientationTag uTag = compatTags.get(i % compatTags.size());
                Gender uGender = genders[i % genders.length];
                double offsetLat = (Math.random() - 0.5) * 0.02;
                double offsetLng = (Math.random() - 0.5) * 0.02;

                User seeded = new User();
                seeded.setEmail(names[i % names.length].toLowerCase() + "." + (System.currentTimeMillis() + i) + "@example.com");
                seeded.setPasswordHash(passwordEncoder.encode("seeded_password"));
                seeded.setDisplayName(uName);
                seeded.setIdentityType(IdentityType.LGBTQ);
                seeded.setGender(uGender);
                seeded.setOrientationTag(uTag);
                seeded.setLatitude(baseLat + offsetLat);
                seeded.setLongitude(baseLng + offsetLng);
                seeded.setActive(true);
                userRepository.save(seeded);
            }
        }
    }

    private Set<OrientationTag> getCompatibleTags(OrientationTag tag) {
        Set<OrientationTag> set = new HashSet<>();
        if (tag == null) {
            set.add(OrientationTag.OTHER);
            return set;
        }
        switch (tag) {
            case GAY:
                set.addAll(Arrays.asList(OrientationTag.GAY, OrientationTag.BISEXUAL, OrientationTag.QUEER, OrientationTag.PANSEXUAL));
                break;
            case LESBIAN:
                set.addAll(Arrays.asList(OrientationTag.LESBIAN, OrientationTag.BISEXUAL, OrientationTag.QUEER, OrientationTag.PANSEXUAL));
                break;
            case BISEXUAL:
                set.addAll(Arrays.asList(OrientationTag.GAY, OrientationTag.LESBIAN, OrientationTag.BISEXUAL, OrientationTag.PANSEXUAL, OrientationTag.QUEER));
                break;
            case PANSEXUAL:
                set.addAll(Arrays.asList(OrientationTag.GAY, OrientationTag.LESBIAN, OrientationTag.BISEXUAL, OrientationTag.PANSEXUAL, OrientationTag.QUEER, OrientationTag.TRANSGENDER, OrientationTag.NON_BINARY));
                break;
            case TRANSGENDER:
                set.addAll(Arrays.asList(OrientationTag.TRANSGENDER, OrientationTag.QUEER, OrientationTag.PANSEXUAL, OrientationTag.NON_BINARY));
                break;
            case NON_BINARY:
                set.addAll(Arrays.asList(OrientationTag.NON_BINARY, OrientationTag.QUEER, OrientationTag.PANSEXUAL, OrientationTag.TRANSGENDER));
                break;
            case QUEER:
                set.addAll(Arrays.asList(OrientationTag.QUEER, OrientationTag.GAY, OrientationTag.LESBIAN, OrientationTag.BISEXUAL, OrientationTag.PANSEXUAL, OrientationTag.NON_BINARY, OrientationTag.TRANSGENDER));
                break;
            case ASEXUAL:
                set.addAll(Arrays.asList(OrientationTag.ASEXUAL, OrientationTag.QUEER));
                break;
            case OTHER:
            default:
                set.addAll(Arrays.asList(OrientationTag.OTHER, OrientationTag.QUEER));
                break;
        }
        return set;
    }

    public String login(LoginRequest req) {
        Optional<User> userOpt = userRepository.findByEmail(req.getEmail());
        if (userOpt.isEmpty() || !passwordEncoder.matches(req.getPassword(), userOpt.get().getPasswordHash())) {
            throw new RuntimeException("Invalid email or password");
        }

        User user = userOpt.get();
        return jwtUtil.generateToken(String.valueOf(user.getId()), user.getEmail());
    }
}
