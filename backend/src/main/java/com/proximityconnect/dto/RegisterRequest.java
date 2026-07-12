package com.proximityconnect.dto;

import com.proximityconnect.model.Gender;
import com.proximityconnect.model.IdentityType;
import com.proximityconnect.model.OrientationTag;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class RegisterRequest {

    @Email
    @NotNull
    private String email;

    @Size(min = 8, message = "Password must be at least 8 characters")
    private String password;

    @NotNull
    private String displayName;

    @NotNull
    private IdentityType identityType;

    // Required for STRAIGHT users, optional for LGBTQ users - enforced
    // conditionally in AuthService rather than with @NotNull here, since
    // the LGBTQ onboarding step doesn't collect this field at all.
    private Gender gender;

    // Required only when identityType == LGBTQ; validated in AuthService.
    private OrientationTag orientationTag;

    private Double latitude;
    private Double longitude;

    // --- getters and setters ---

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
