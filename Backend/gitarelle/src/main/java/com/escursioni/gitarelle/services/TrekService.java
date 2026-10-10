package com.escursioni.gitarelle.services;

import com.escursioni.gitarelle.dto.CreateTrekRequestDto;
import com.escursioni.gitarelle.dto.TrekResponseDto;
import com.escursioni.gitarelle.dto.UpdateTrekLocationRequestDto;
import com.escursioni.gitarelle.entities.Trek;
import com.escursioni.gitarelle.entities.TrekGpx;
import com.escursioni.gitarelle.repositories.TrekGpxMetricsRow;
import com.escursioni.gitarelle.exceptions.TrekNotFoundException;
import com.escursioni.gitarelle.repositories.TrekGpxRepository;
import com.escursioni.gitarelle.repositories.TrekRepository;
import com.escursioni.gitarelle.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;


@Service
public class TrekService {

    private final TrekRepository trekRepository;
    private final TrekGpxRepository trekGpxRepository;
    private final FolderService folderService;
    private final CurrentUser currentUser;

    public TrekService(TrekRepository trekRepository, TrekGpxRepository trekGpxRepository, FolderService folderService, CurrentUser currentUser){
        this.trekRepository = trekRepository;
        this.trekGpxRepository = trekGpxRepository;
        this.folderService = folderService;
        this.currentUser = currentUser;
    }

    @Transactional
    public List<TrekResponseDto> findAllTreks(){
        Long userId = this.currentUser.id();
        backfillGpxMetrics(userId);
        Map<Long, TrekGpxMetricsRow> metrics = this.trekGpxRepository.findMetricsByOwnerId(userId).stream()
                .collect(Collectors.toMap(TrekGpxMetricsRow::trekId, Function.identity()));
        return this.trekRepository.findAllByOwnerId(userId).stream()
                .map(trek -> TrekResponseDto.from(trek, metrics.get(trek.getId())))
                .toList();
    }

    // gpx caricati prima che distanza e dislivello venissero calcolati all'upload: si calcolano una volta qui
    // (va chiamato dentro una transazione: le modifiche si salvano alla fine)
    public void backfillGpxMetrics(Long userId) {
        for (TrekGpx gpx : this.trekGpxRepository.findWithoutMetricsByOwnerId(userId)) {
            GpxMetrics m = GpxMetrics.computeOrZero(gpx.getData());
            gpx.setDistanceMeters(m.distanceMeters());
            gpx.setElevationGainMeters(m.elevationGainMeters());
        }
    }

    public TrekResponseDto getTrek(Long id) {
        return toResponse(findTrekById(id));
    }

    // solo tra i trek dell'utente corrente: quelli degli altri risultano "non trovati"
    public Trek findTrekById(Long id) {
        return this.trekRepository.findByIdAndOwnerId(id, this.currentUser.id())
                .orElseThrow(() -> new TrekNotFoundException(id));
    }

    public Trek createTrek(@Valid CreateTrekRequestDto requestDto) {
        Trek trek = new Trek();
        trek.setOwner(this.currentUser.reference());
        applyFields(trek, requestDto);
        return this.trekRepository.save(trek);
    }

    // Modifica tutti i campi inseriti alla creazione (il gpx resta com'è)
    @Transactional
    public TrekResponseDto updateTrek(Long id, CreateTrekRequestDto requestDto) {
        Trek trek = findTrekById(id);
        applyFields(trek, requestDto);
        return toResponse(this.trekRepository.save(trek));
    }

    // Elimina il trek insieme al suo gpx (che ha la foreign key verso il trek)
    @Transactional
    public void deleteTrek(Long id) {
        Trek trek = findTrekById(id);
        if (this.trekGpxRepository.existsById(id)) {
            this.trekGpxRepository.deleteById(id);
        }
        this.trekRepository.delete(trek);
    }

    private void applyFields(Trek trek, CreateTrekRequestDto requestDto) {
        trek.setTitle(requestDto.title().trim());
        trek.setTrekDate(requestDto.trekDate());
        trek.setNotes(requestDto.notes());
        trek.setAmichetti(requestDto.amichetti());
        trek.setLat(requestDto.lat());
        trek.setLon(requestDto.lon());
        trek.setFolder(requestDto.folderId() != null ? this.folderService.findFolderById(requestDto.folderId()) : null);
    }

    @Transactional
    public TrekResponseDto updateLocation(Long id, UpdateTrekLocationRequestDto requestDto) {
        Trek trek = findTrekById(id);
        trek.setLat(requestDto.lat());
        trek.setLon(requestDto.lon());
        return toResponse(this.trekRepository.save(trek));
    }

    private TrekResponseDto toResponse(Trek trek) {
        return TrekResponseDto.from(trek, this.trekGpxRepository.findMetricsByTrekId(trek.getId()).orElse(null));
    }

}
