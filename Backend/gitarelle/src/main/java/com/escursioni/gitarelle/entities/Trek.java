package com.escursioni.gitarelle.entities;

import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

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

    // facoltativi: un trek può nascere senza punto sulla mappa
    private Double lat;

    private Double lon;

    // regione italiana (o "Estero") calcolata dal punto o, se manca, dalla partenza del gpx: vedi RegionLocator
    private String region;

    // valutazione (tutto facoltativo): stelle da 1 a 5 a mezzi punti, fatica e paesaggio da 1 a 10,
    // tratti pericolosi sì/no (null = non indicato), etichette. Il testo della recensione sono le note
    private Double rating;

    private Integer effort;

    private Integer scenery;

    private Boolean dangerous;

    // etichette del percorso (lago, bosco, malga...): l'elenco delle possibili lo tiene il frontend
    @ElementCollection
    @CollectionTable(name = "trek_tag", joinColumns = @JoinColumn(name = "trek_id"))
    @Column(name = "tag", nullable = false)
    private Set<String> tags = new HashSet<>();

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    // un trek può stare in nessuna, una o più cartelle
    @ManyToMany
    @JoinTable(name = "trek_folder",
            joinColumns = @JoinColumn(name = "trek_id"),
            inverseJoinColumns = @JoinColumn(name = "folder_id"))
    private Set<Folder> folders = new HashSet<>();

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

    public String getRegion() {
        return region;
    }

    public void setRegion(String region) {
        this.region = region;
    }

    public Double getRating() {
        return rating;
    }

    public void setRating(Double rating) {
        this.rating = rating;
    }

    public Integer getEffort() {
        return effort;
    }

    public void setEffort(Integer effort) {
        this.effort = effort;
    }

    public Integer getScenery() {
        return scenery;
    }

    public void setScenery(Integer scenery) {
        this.scenery = scenery;
    }

    public Boolean getDangerous() {
        return dangerous;
    }

    public void setDangerous(Boolean dangerous) {
        this.dangerous = dangerous;
    }

    public Set<String> getTags() {
        return tags;
    }

    public void setTags(Set<String> tags) {
        this.tags = tags;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Set<Folder> getFolders() {
        return folders;
    }

    public void setFolders(Set<Folder> folders) {
        this.folders = folders;
    }

    public AppUser getOwner() {
        return owner;
    }

    public void setOwner(AppUser owner) {
        this.owner = owner;
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