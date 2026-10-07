package com.escursioni.gitarelle.entities;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "trek_gpx")
public class TrekGpx {

    @Id
    private Long trekId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "trek_id")
    private Trek trek;

    private String title;

    private String filename;

    private String contentType;

    @Lob
    @Column(nullable = false)
    private byte[] data;

    private Instant uploadedAt = Instant.now();

    // calcolati dal file (GpxMetrics) al caricamento; null per i gpx caricati prima: li calcola StatsService
    private Double distanceMeters;

    private Double elevationGainMeters;

    public Double getDistanceMeters() {
        return distanceMeters;
    }

    public void setDistanceMeters(Double distanceMeters) {
        this.distanceMeters = distanceMeters;
    }

    public Double getElevationGainMeters() {
        return elevationGainMeters;
    }

    public void setElevationGainMeters(Double elevationGainMeters) {
        this.elevationGainMeters = elevationGainMeters;
    }

    public Long getTrekId() {
        return trekId;
    }

    public void setTrekId(Long trekId) {
        this.trekId = trekId;
    }

    public Trek getTrek() {
        return trek;
    }

    public void setTrek(Trek trek) {
        this.trek = trek;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getFilename() {
        return filename;
    }

    public void setFilename(String filename) {
        this.filename = filename;
    }

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public byte[] getData() {
        return data;
    }

    public void setData(byte[] data) {
        this.data = data;
    }

    public Instant getUploadedAt() {
        return uploadedAt;
    }

    public void setUploadedAt(Instant uploadedAt) {
        this.uploadedAt = uploadedAt;
    }
}