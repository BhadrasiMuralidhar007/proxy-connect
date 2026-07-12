package com.proximityconnect.repository;

import com.proximityconnect.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    /**
     * Straight matching: opposite gender, same STRAIGHT identity, within radius.
     * Distance computed with the Haversine formula directly in SQL so we only
     * pull back candidates that are actually in range, ordered nearest-first.
     *
     * H2 and Postgres both support the trig functions used here (radians, sin,
     * cos, atan2, sqrt) so this works unmodified against the dev H2 DB and a
     * production Postgres instance. For larger scale, swap this for PostGIS
     * (ST_DWithin) and a spatial index instead of computing over every row.
     */
    @Query(value = """
        SELECT * FROM app_user u
        WHERE u.active = true
          AND u.id <> :selfId
          AND u.identity_type = 'STRAIGHT'
          AND u.gender <> :selfGender
          AND u.latitude IS NOT NULL AND u.longitude IS NOT NULL
          AND (6371 * acos(
                cos(radians(:selfLat)) * cos(radians(u.latitude)) *
                cos(radians(u.longitude) - radians(:selfLng)) +
                sin(radians(:selfLat)) * sin(radians(u.latitude))
              )) <= :radiusKm
        ORDER BY (6371 * acos(
                cos(radians(:selfLat)) * cos(radians(u.latitude)) *
                cos(radians(u.longitude) - radians(:selfLng)) +
                sin(radians(:selfLat)) * sin(radians(u.latitude))
              )) ASC
        """, nativeQuery = true)
    List<User> findNearbyStraightMatches(
            @Param("selfId") Long selfId,
            @Param("selfGender") String selfGender,
            @Param("selfLat") double selfLat,
            @Param("selfLng") double selfLng,
            @Param("radiusKm") double radiusKm
    );

    /**
     * LGBTQ+ matching: same (or compatible) orientation tag, within radius.
     * The set of "compatible" tags is resolved in MatchingService and passed
     * in as a list, since compatibility isn't a strict equality - e.g. a
     * BISEXUAL user should see GAY, LESBIAN, BISEXUAL, PANSEXUAL, etc.
     */
    @Query(value = """
        SELECT * FROM app_user u
        WHERE u.active = true
          AND u.id <> :selfId
          AND u.identity_type = 'LGBTQ'
          AND u.orientation_tag IN (:compatibleTags)
          AND u.latitude IS NOT NULL AND u.longitude IS NOT NULL
          AND (6371 * acos(
                cos(radians(:selfLat)) * cos(radians(u.latitude)) *
                cos(radians(u.longitude) - radians(:selfLng)) +
                sin(radians(:selfLat)) * sin(radians(u.latitude))
              )) <= :radiusKm
        ORDER BY (6371 * acos(
                cos(radians(:selfLat)) * cos(radians(u.latitude)) *
                cos(radians(u.longitude) - radians(:selfLng)) +
                sin(radians(:selfLat)) * sin(radians(u.latitude))
              )) ASC
        """, nativeQuery = true)
    List<User> findNearbyLgbtqMatches(
            @Param("selfId") Long selfId,
            @Param("compatibleTags") List<String> compatibleTags,
            @Param("selfLat") double selfLat,
            @Param("selfLng") double selfLng,
            @Param("radiusKm") double radiusKm
    );
}
