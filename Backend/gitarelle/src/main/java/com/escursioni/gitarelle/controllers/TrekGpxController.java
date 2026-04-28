package com.escursioni.gitarelle.controllers;

import com.escursioni.gitarelle.entities.TrekGpx;
import com.escursioni.gitarelle.services.TrekGpxService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@CrossOrigin(origins = "http://localhost:5173")
@RequestMapping("/api/treks")
public class TrekGpxController {

    private final TrekGpxService trekGpxService;

    public TrekGpxController(TrekGpxService trekGpxService) {
        this.trekGpxService = trekGpxService;
    }

    @GetMapping("/gpx")
    public List<TrekGpx> getAll() {
        return this.trekGpxService.findAllGpx();
    }

    @GetMapping("/{id}/gpx")
    public ResponseEntity<byte[]> getById(@PathVariable Long id) {
        TrekGpx trekGpx = this.trekGpxService.findGpxById(id);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(
                        trekGpx.getContentType() != null ? trekGpx.getContentType() : "application/gpx+xml"
                ))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + trekGpx.getFilename() + "\"")
                .body(trekGpx.getData());
    }

    @PostMapping(path = "/{id}/gpx", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Void> upload(@PathVariable Long id, @RequestParam("file") MultipartFile file, @RequestParam(value = "title", required = false) String title) throws IOException {

        this.trekGpxService.uploadGpxForTrek(id, title, file);
        return ResponseEntity.noContent().build();
    }
}