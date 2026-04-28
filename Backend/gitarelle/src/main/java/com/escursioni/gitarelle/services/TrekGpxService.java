package com.escursioni.gitarelle.services;

import com.escursioni.gitarelle.entities.Trek;
import com.escursioni.gitarelle.entities.TrekGpx;
import com.escursioni.gitarelle.repositories.TrekGpxRepository;
import com.escursioni.gitarelle.repositories.TrekRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

@Service
public class TrekGpxService {

    private final TrekRepository trekRepository;
    private final TrekGpxRepository trekGpxRepository;

    public TrekGpxService(TrekRepository trekRepository, TrekGpxRepository trekGpxRepository) {
        this.trekRepository = trekRepository;
        this.trekGpxRepository = trekGpxRepository;
    }

    public List<TrekGpx> findAllGpx() {
        return this.trekGpxRepository.findAll();
    }

    public TrekGpx findGpxById(Long gpxId) {
        Optional<TrekGpx> optionalTrekGpx = this.trekGpxRepository.findById(gpxId);
        return optionalTrekGpx.orElse(null); //TODO GESTIRE CASO NULL new ResponseStatusException(HttpStatus.NOT_FOUND, "No GPX for this trek"));
    }

    public TrekGpx uploadGpxForTrek(Long trekId, String title, MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Empty file");
        }
        Trek trek = trekRepository.findById(trekId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trek not found"));
        TrekGpx gpx = new TrekGpx();
        gpx.setTrek(trek);
        gpx.setTitle(title);
        gpx.setFilename(file.getOriginalFilename());
        gpx.setContentType(file.getContentType());
        gpx.setData(file.getBytes());

        return trekGpxRepository.save(gpx);
    }

}
