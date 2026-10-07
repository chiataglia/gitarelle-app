package com.escursioni.gitarelle.controllers;

import com.escursioni.gitarelle.dto.CreateTrekRequestDto;
import com.escursioni.gitarelle.dto.TrekResponseDto;
import com.escursioni.gitarelle.entities.TrekGpx;
import com.escursioni.gitarelle.services.TrekGpxService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

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
    public TrekResponseDto upload(@PathVariable Long id, @RequestParam("file") MultipartFile file, @RequestParam(value = "title", required = false) String title) {
        TrekGpx gpx = this.trekGpxService.uploadGpxForTrek(id, title, file);
        return TrekResponseDto.from(gpx.getTrek(), true);
    }

    // Crea in un colpo solo trek + gpx. Parti multipart: "trek" (JSON), "file" (gpx), "gpxTitle" (opzionale)
    @PostMapping(path = "/with-gpx", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public TrekResponseDto createWithGpx(@Valid @RequestPart("trek") CreateTrekRequestDto trek, @RequestPart("file") MultipartFile file, @RequestParam(value = "gpxTitle", required = false) String gpxTitle) {
        return TrekResponseDto.from(this.trekGpxService.createTrekWithGpx(trek, gpxTitle, file), true);
    }
}
