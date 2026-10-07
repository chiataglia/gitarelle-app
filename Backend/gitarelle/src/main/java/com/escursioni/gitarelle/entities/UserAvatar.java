package com.escursioni.gitarelle.entities;

import jakarta.persistence.*;

import java.time.Instant;

// Immagine del profilo (tabella separata per non caricarla a ogni lettura dell'utente).
// Il frontend la ridimensiona a 256x256 prima di inviarla: pochi KB.
@Entity
@Table(name = "user_avatar")
public class UserAvatar {

    @Id
    private Long userId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private AppUser user;

    @Column(nullable = false)
    private String contentType;

    @Column(nullable = false, columnDefinition = "bytea")
    private byte[] data;

    // cambia a ogni caricamento: il frontend lo usa nell'url per non mostrare l'immagine vecchia dalla cache
    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public AppUser getUser() {
        return user;
    }

    public void setUser(AppUser user) {
        this.user = user;
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

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
