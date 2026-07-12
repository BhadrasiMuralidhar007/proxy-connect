package com.proximityconnect.dto;

import jakarta.validation.constraints.NotNull;

public class LocationUpdateRequest {

    @NotNull
    private Double latitude;

    @NotNull
    private Double longitude;

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
}
