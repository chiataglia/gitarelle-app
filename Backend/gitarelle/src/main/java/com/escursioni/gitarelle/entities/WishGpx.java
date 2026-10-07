package com.escursioni.gitarelle.entities;

import jakarta.persistence.*;

import java.time.Instant;

// Traccia gpx di un tour da fare (tabella separata per non caricare il file con la lista)
@Entity
@Table(name = "wish_gpx")
public class WishGpx {

    @Id
    private Long wishId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "wish_id")
    private Wish wish;

    private String filename;

    private String contentType;

    @Lob
    @Column(nullable = false)
    private byte[] data;

    private Instant uploadedAt = Instant.now();

    public Long getWishId() {
        return wishId;
    }

    public void setWishId(Long wishId) {
        this.wishId = wishId;
    }

    public Wish getWish() {
        return wish;
    }

    public void setWish(Wish wish) {
        this.wish = wish;
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
