package com.escursioni.gitarelle.controllers;

import com.escursioni.gitarelle.dto.WishRequestDto;
import com.escursioni.gitarelle.dto.WishResponseDto;
import com.escursioni.gitarelle.entities.WishGpx;
import com.escursioni.gitarelle.services.WishService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

// Tour da fare (wish list)
@RestController
@RequestMapping("/api/wishes")
public class WishController {

    private final WishService wishService;

    public WishController(WishService wishService) {
        this.wishService = wishService;
    }

    @GetMapping
    public List<WishResponseDto> getAll() {
        return this.wishService.findAllWishes();
    }

    @PostMapping
    public WishResponseDto create(@Valid @RequestBody WishRequestDto requestDto) {
        return this.wishService.createWish(requestDto);
    }

    @PutMapping("/{id}")
    public WishResponseDto update(@PathVariable Long id, @Valid @RequestBody WishRequestDto requestDto) {
        return this.wishService.updateWish(id, requestDto);
    }

    // Elimina il tour e l'eventuale gpx
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        this.wishService.deleteWish(id);
    }

    @GetMapping("/{id}/gpx")
    public ResponseEntity<byte[]> getGpx(@PathVariable Long id) {
        WishGpx gpx = this.wishService.findGpx(id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(
                        gpx.getContentType() != null ? gpx.getContentType() : "application/gpx+xml"
                ))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + gpx.getFilename() + "\"")
                .body(gpx.getData());
    }

    // Carica o sostituisce la traccia del tour
    @PutMapping(path = "/{id}/gpx", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public WishResponseDto saveGpx(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        return this.wishService.saveGpx(id, file);
    }

    @DeleteMapping("/{id}/gpx")
    public WishResponseDto deleteGpx(@PathVariable Long id) {
        return this.wishService.deleteGpx(id);
    }
}
