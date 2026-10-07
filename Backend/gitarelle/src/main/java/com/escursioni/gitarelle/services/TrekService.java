package com.escursioni.gitarelle.services;

import com.escursioni.gitarelle.dto.CreateTrekRequestDto;
import com.escursioni.gitarelle.dto.TrekResponseDto;
import com.escursioni.gitarelle.dto.UpdateTrekLocationRequestDto;
import com.escursioni.gitarelle.entities.Trek;
import com.escursioni.gitarelle.exceptions.TrekNotFoundException;
import com.escursioni.gitarelle.repositories.TrekGpxRepository;
import com.escursioni.gitarelle.repositories.TrekRepository;
import com.escursioni.gitarelle.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;


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

    public List<TrekResponseDto> findAllTreks(){
        Set<Long> treksWithGpx = new HashSet<>(this.trekGpxRepository.findAllTrekIds());
        return this.trekRepository.findAllByOwnerId(this.currentUser.id()).stream()
                .map(trek -> TrekResponseDto.from(trek, treksWithGpx.contains(trek.getId())))
                .toList();
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
        return TrekResponseDto.from(trek, this.trekGpxRepository.existsById(trek.getId()));
    }

}
