package com.proximityconnect.service;

import com.proximityconnect.model.Gender;
import com.proximityconnect.model.OrientationTag;
import com.proximityconnect.model.User;
import com.proximityconnect.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class MatchingService {

    private final UserRepository userRepository;

    @Value("${app.discovery.default-radius-km:25}")
    private double defaultRadiusKm;

    public MatchingService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Single entry point for "show me nearby people". Branches on the
     * caller's identity type - this is the one place that encodes the
     * matching rules, so if the rules change, they only change here.
     */
    public List<User> findNearby(User self, Double radiusKmOverride) {
        double radiusKm = radiusKmOverride != null ? radiusKmOverride : defaultRadiusKm;
        requireLocation(self);

        switch (self.getIdentityType()) {
            case STRAIGHT -> {
                return userRepository.findNearbyStraightMatches(
                        self.getId(),
                        self.getGender().name(),
                        self.getLatitude(),
                        self.getLongitude(),
                        radiusKm
                );
            }
            case LGBTQ -> {
                Set<OrientationTag> compatible = compatibleTags(self.getOrientationTag());
                List<String> tagNames = compatible.stream().map(Enum::name).collect(Collectors.toList());
                return userRepository.findNearbyLgbtqMatches(
                        self.getId(),
                        tagNames,
                        self.getLatitude(),
                        self.getLongitude(),
                        radiusKm
                );
            }
            default -> throw new IllegalStateException("Unknown identity type: " + self.getIdentityType());
        }
    }

    /**
     * Which orientation tags a given tag should see in discovery.
     * This is the part you'll want to tune with real user feedback -
     * treat it as a starting point, not gospel. Every tag sees itself
     * plus a small set of adjacent tags that commonly overlap.
     */
    private Set<OrientationTag> compatibleTags(OrientationTag tag) {
        if (tag == null) {
            // Fallback: if somehow unset, only match with others in the same boat
            // rather than crash - keeps discovery safe-by-default.
            return EnumSet.of(OrientationTag.OTHER);
        }
        return switch (tag) {
            case GAY -> EnumSet.of(OrientationTag.GAY, OrientationTag.BISEXUAL, OrientationTag.QUEER, OrientationTag.PANSEXUAL);
            case LESBIAN -> EnumSet.of(OrientationTag.LESBIAN, OrientationTag.BISEXUAL, OrientationTag.QUEER, OrientationTag.PANSEXUAL);
            case BISEXUAL -> EnumSet.of(OrientationTag.GAY, OrientationTag.LESBIAN, OrientationTag.BISEXUAL, OrientationTag.PANSEXUAL, OrientationTag.QUEER);
            case PANSEXUAL -> EnumSet.of(OrientationTag.GAY, OrientationTag.LESBIAN, OrientationTag.BISEXUAL, OrientationTag.PANSEXUAL, OrientationTag.QUEER, OrientationTag.TRANSGENDER, OrientationTag.NON_BINARY);
            case TRANSGENDER -> EnumSet.of(OrientationTag.TRANSGENDER, OrientationTag.QUEER, OrientationTag.PANSEXUAL, OrientationTag.NON_BINARY);
            case NON_BINARY -> EnumSet.of(OrientationTag.NON_BINARY, OrientationTag.QUEER, OrientationTag.PANSEXUAL, OrientationTag.TRANSGENDER);
            case QUEER -> EnumSet.of(OrientationTag.QUEER, OrientationTag.GAY, OrientationTag.LESBIAN, OrientationTag.BISEXUAL, OrientationTag.PANSEXUAL, OrientationTag.NON_BINARY, OrientationTag.TRANSGENDER);
            case ASEXUAL -> EnumSet.of(OrientationTag.ASEXUAL, OrientationTag.QUEER);
            case OTHER -> EnumSet.of(OrientationTag.OTHER, OrientationTag.QUEER);
        };
    }

    private void requireLocation(User user) {
        if (user.getLatitude() == null || user.getLongitude() == null) {
            throw new IllegalStateException("User location is not set - request device location before showing discovery.");
        }
    }
}
