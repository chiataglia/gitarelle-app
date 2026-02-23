package com.escursioni.gitarelle.entities;

import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "trek")
public class Trek {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    private LocalDate trekDate;

    @Column(columnDefinition = "text")
    private String notes;

    @Column(columnDefinition = "text")
    private String amichetti;

    @Column(nullable = false)
    private Double lat;

    @Column(nullable = false)
    private Double lon;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();


    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public LocalDate getTrekDate() {
        return trekDate;
    }

    public void setTrekDate(LocalDate trekDate) {
        this.trekDate = trekDate;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public String getAmichetti() {
        return amichetti;
    }

    public void setAmichetti(String amichettiText) {
        this.amichetti = amichettiText;
    }

    public Double getLat() {
        return lat;
    }

    public void setLat(Double lat) {
        this.lat = lat;
    }

    public Double getLon() {
        return lon;
    }

    public void setLon(Double lon) {
        this.lon = lon;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    @Override
    public String toString() {
        return "Trek{" +
                "id=" + id +
                ", title='" + title + '\'' +
                ", trekDate=" + trekDate +
                ", notes='" + notes + '\'' +
                ", amichettiText='" + amichetti + '\'' +
                ", lat=" + lat +
                ", lon=" + lon +
                ", createdAt=" + createdAt +
                '}';
    }
}