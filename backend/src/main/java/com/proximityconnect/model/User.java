package com.proximityconnect.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "app_user")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private IdentityType identityType;

    // Nullable: only STRAIGHT users are required to set this (enforced in
    // AuthService), LGBTQ users are matched by orientationTag instead.
    @Enumerated(EnumType.STRING)
    private Gender gender;

    // Only set when identityType == LGBTQ. Null for STRAIGHT users.
    @Enumerated(EnumType.STRING)
    private OrientationTag orientationTag;

    private Double latitude;
    private Double longitude;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    private boolean active = true;

    public User() {}

    // --- getters and setters ---

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public IdentityType getIdentityType() { return identityType; }
    public void setIdentityType(IdentityType identityType) { this.identityType = identityType; }

    public Gender getGender() { return gender; }
    public void setGender(Gender gender) { this.gender = gender; }

    public OrientationTag getOrientationTag() { return orientationTag; }
    public void setOrientationTag(OrientationTag orientationTag) { this.orientationTag = orientationTag; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
