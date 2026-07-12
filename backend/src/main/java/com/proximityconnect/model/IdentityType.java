package com.proximityconnect.model;

/**
 * Top-level branch chosen at registration. This alone doesn't
 * determine matching - it just decides which follow-up question
 * the onboarding flow asks next (gender vs. orientation tag).
 */
public enum IdentityType {
    STRAIGHT,
    LGBTQ
}
