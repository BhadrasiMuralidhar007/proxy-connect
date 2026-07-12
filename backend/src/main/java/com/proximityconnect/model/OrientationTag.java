package com.proximityconnect.model;

/**
 * Self-selected tag for users who choose IdentityType.LGBTQ.
 * This drives who shows up in their discovery feed - see
 * MatchingService for the compatibility rules between tags.
 *
 * Keep this list editable: it's presented as a single-select
 * dropdown at registration, and users can update it later from
 * their profile settings.
 */
public enum OrientationTag {
    GAY,
    LESBIAN,
    BISEXUAL,
    PANSEXUAL,
    TRANSGENDER,
    NON_BINARY,
    QUEER,
    ASEXUAL,
    OTHER
}
