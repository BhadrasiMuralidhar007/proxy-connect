package com.proximityconnect.dto;

import com.proximityconnect.model.Gender;
import com.proximityconnect.model.IdentityType;
import com.proximityconnect.model.OrientationTag;
import com.proximityconnect.model.User;

public class ProfileResponse {

    private Long id;
    private String displayName;
    private IdentityType identityType;
    private Gender gender;
    private OrientationTag orientationTag;

    public static ProfileResponse from(User user) {
        ProfileResponse dto = new ProfileResponse();
        dto.id = user.getId();
        dto.displayName = user.getDisplayName();
        dto.identityType = user.getIdentityType();
        dto.gender = user.getGender();
        dto.orientationTag = user.getOrientationTag();
        return dto;
    }

    public Long getId() { return id; }
    public String getDisplayName() { return displayName; }
    public IdentityType getIdentityType() { return identityType; }
    public Gender getGender() { return gender; }
    public OrientationTag getOrientationTag() { return orientationTag; }
}
