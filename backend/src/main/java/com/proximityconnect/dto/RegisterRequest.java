package com.proximityconnect.dto;

import com.proximityconnect.model.Gender;
import com.proximityconnect.model.IdentityType;
import com.proximityconnect.model.OrientationTag;

public class RegisterRequest {
    private String email;
    private String password;
    private String displayName;
    private IdentityType identityType;
    private Gender gender;
    private OrientationTag orientationTag;
    private Double latitude;
    private Double longitude;

    // Getters and Setters
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

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
}
