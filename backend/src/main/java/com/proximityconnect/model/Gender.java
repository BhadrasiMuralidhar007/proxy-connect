package com.proximityconnect.model;

/**
 * The user's own gender. Used directly for straight matching
 * (opposite gender) and stored for LGBTQ+ users too, since some
 * orientation tags still key off it (e.g. gay/lesbian filtering).
 */
public enum Gender {
    MALE,
    FEMALE,
    NON_BINARY
}
