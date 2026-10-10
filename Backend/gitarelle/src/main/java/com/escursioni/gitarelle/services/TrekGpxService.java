package com.escursioni.gitarelle.services;

import com.escursioni.gitarelle.dto.CreateTrekRequestDto;
import com.escursioni.gitarelle.entities.Trek;
import com.escursioni.gitarelle.entities.TrekGpx;
import com.escursioni.gitarelle.exceptions.EmptyGpxFileException;
import com.escursioni.gitarelle.exceptions.GpxAlreadyExistsException;
import com.escursioni.gitarelle.exceptions.GpxNotFoundException;
import com.escursioni.gitarelle.exceptions.GpxReadException;
import com.escursioni.gitarelle.repositories.TrekGpxRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Service
public class TrekGpxService {

    private final TrekGpxRepository trekGpxRepository;
    private final TrekService trekService;

    public TrekGpxService(TrekGpxRepository trekGpxRepository, TrekService trekService) {
        this.trekGpxRepository = trekGpxRepository;
        this.trekService = trekService;
    }

    public TrekGpx findGpxById(Long trekId) {
        trekService.findTrekById(trekId); // verifica che il trek sia dell'utente
        return this.trekGpxRepository.findById(trekId)
                .orElseThrow(() -> new GpxNotFoundException(trekId));
    }

    public TrekGpx uploadGpxForTrek(Long trekId, String title, MultipartFile file) {
        checkNotEmpty(file);
        Trek trek = trekService.findTrekById(trekId);
        if (trekGpxRepository.existsById(trekId)) {
            throw new GpxAlreadyExistsException(trekId);
        }
        return trekGpxRepository.save(buildGpx(trek, title, file));
    }

    // Crea trek e gpx insieme: se il salvataggio del gpx fallisce viene annullato anche il trek
    @Transactional
    public TrekGpx createTrekWithGpx(CreateTrekRequestDto trekDto, String gpxTitle, MultipartFile file) {
        checkNotEmpty(file);
        Trek trek = trekService.createTrek(trekDto);
        return trekGpxRepository.save(buildGpx(trek, gpxTitle, file));
    }

    private void checkNotEmpty(MultipartFile file) {
        if (file.isEmpty()) {
            throw new EmptyGpxFileException();
        }
    }

    private TrekGpx buildGpx(Trek trek, String title, MultipartFile file) {
        TrekGpx gpx = new TrekGpx();
        gpx.setTrek(trek);
        gpx.setTitle(title);
        gpx.setFilename(file.getOriginalFilename());
        gpx.setContentType(file.getContentType());
        try {
            gpx.setData(file.getBytes());
        } catch (IOException e) {
            throw new GpxReadException(e);
        }
        GpxMetrics metrics = GpxMetrics.computeOrZero(gpx.getData());
        gpx.setDistanceMeters(metrics.distanceMeters());
        gpx.setElevationGainMeters(metrics.elevationGainMeters());
        return gpx;
    }

}
