package com.escursioni.gitarelle.entities;

import jakarta.persistence.*;

import java.time.Instant;

// Tour da fare (wish list): separato dai trek dello storico.
// Può essere solo un nome, oppure avere un punto, un link esterno e/o un gpx (in WishGpx)
@Entity
@Table(name = "wish")
public class Wish {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(columnDefinition = "text")
    private String notes;

    // es. Komoot, Wikiloc, AllTrails, un blog...
    @Column(length = 1000)
    private String link;

    // testo libero: "estate", "ottobre", "con la neve"...
    @Column(length = 60)
    private String idealPeriod;

    private Double lat;

    private Double lon;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    // proprietario: ogni utente vede solo i propri dati (null solo per dati creati prima del login)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    private AppUser owner;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public String getLink() {
        return link;
    }

    public void setLink(String link) {
        this.link = link;
    }

    public String getIdealPeriod() {
        return idealPeriod;
    }

    public void setIdealPeriod(String idealPeriod) {
        this.idealPeriod = idealPeriod;
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

    public AppUser getOwner() {
        return owner;
    }

    public void setOwner(AppUser owner) {
        this.owner = owner;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
