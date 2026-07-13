package com.proximityconnect.dto;

import com.proximityconnect.model.Gender;
import com.proximityconnect.model.IdentityType;
import com.proximityconnect.model.OrientationTag;

public class ProfileResponse {
    private Long id;
    private String displayName;
    private IdentityType identityType;
    private Gender gender;
    private OrientationTag orientationTag;
    private Double distanceKm;
    private String publicKey;

    public ProfileResponse() {}

    public ProfileResponse(Long id, String displayName, IdentityType identityType, Gender gender, OrientationTag orientationTag) {
        this.id = id;
        this.displayName = displayName;
        this.identityType = identityType;
        this.gender = gender;
        this.orientationTag = orientationTag;
    }

    public ProfileResponse(Long id, String displayName, IdentityType identityType, Gender gender, OrientationTag orientationTag, Double distanceKm) {
        this.id = id;
        this.displayName = displayName;
        this.identityType = identityType;
        this.gender = gender;
        this.orientationTag = orientationTag;
        this.distanceKm = distanceKm;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public IdentityType getIdentityType() { return identityType; }
    public void setIdentityType(IdentityType identityType) { this.identityType = identityType; }

    public Gender getGender() { return gender; }
    public void setGender(Gender gender) { this.gender = gender; }

    public OrientationTag getOrientationTag() { return orientationTag; }
    public void setOrientationTag(OrientationTag orientationTag) { this.orientationTag = orientationTag; }

    public Double getDistanceKm() { return distanceKm; }
    public void setDistanceKm(Double distanceKm) { this.distanceKm = distanceKm; }

    public String getPublicKey() { return publicKey; }
    public void setPublicKey(String publicKey) { this.publicKey = publicKey; }
}
