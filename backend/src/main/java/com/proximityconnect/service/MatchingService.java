package com.proximityconnect.service;

import com.proximityconnect.dto.ProfileResponse;
import com.proximityconnect.model.User;
import com.proximityconnect.model.IdentityType;
import com.proximityconnect.model.Gender;
import com.proximityconnect.model.OrientationTag;
import com.proximityconnect.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class MatchingService {

    @Autowired
    private UserRepository userRepository;

    public List<ProfileResponse> getDiscoveryFeed(Long currentUserId, Double radiusKm) {
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        double finalRadius = radiusKm != null ? radiusKm : 25.0;

        List<User> allUsers = userRepository.findAll();

        return allUsers.stream()
                .filter(u -> !u.getId().equals(currentUserId))
                .filter(User::isActive)
                .filter(u -> {
                    // Compatibility filtering
                    if (currentUser.getIdentityType() == IdentityType.STRAIGHT) {
                        return u.getIdentityType() == IdentityType.STRAIGHT && u.getGender() != currentUser.getGender();
                    } else {
                        if (u.getIdentityType() != IdentityType.LGBTQ) {
                            return false;
                        }
                        Set<OrientationTag> compat = getCompatibleTags(currentUser.getOrientationTag());
                        return compat.contains(u.getOrientationTag());
                    }
                })
                .map(u -> {
                    Double dist = null;
                    if (currentUser.getLatitude() != null && currentUser.getLongitude() != null &&
                            u.getLatitude() != null && u.getLongitude() != null) {
                        dist = calculateDistance(
                                currentUser.getLatitude(), currentUser.getLongitude(),
                                u.getLatitude(), u.getLongitude()
                        );
                    }
                    ProfileResponse resp = new ProfileResponse(
                            u.getId(),
                            u.getDisplayName(),
                            u.getIdentityType(),
                            u.getGender(),
                            u.getOrientationTag(),
                            dist
                    );
                    resp.setPublicKey(u.getPublicKey());
                    return resp;
                })
                .filter(p -> {
                    // If radius filter is active, only include profiles within the radius.
                    // Profiles with no distance are excluded if we require a valid location.
                    if (p.getDistanceKm() == null) {
                        return false;
                    }
                    return p.getDistanceKm() <= finalRadius;
                })
                .sorted((p1, p2) -> {
                    if (p1.getDistanceKm() == null) return 1;
                    if (p2.getDistanceKm() == null) return -1;
                    return p1.getDistanceKm().compareTo(p2.getDistanceKm());
                })
                .collect(Collectors.toList());
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

    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Radius of Earth in KM
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
