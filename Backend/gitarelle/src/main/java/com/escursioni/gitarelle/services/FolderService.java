package com.escursioni.gitarelle.services;

import com.escursioni.gitarelle.dto.FolderRequestDto;
import com.escursioni.gitarelle.dto.FolderResponseDto;
import com.escursioni.gitarelle.dto.FolderTreksRequestDto;
import com.escursioni.gitarelle.dto.TrekResponseDto;
import com.escursioni.gitarelle.entities.Folder;
import com.escursioni.gitarelle.entities.Trek;
import com.escursioni.gitarelle.exceptions.FolderAlreadyExistsException;
import com.escursioni.gitarelle.exceptions.FolderNotFoundException;
import com.escursioni.gitarelle.exceptions.TrekNotFoundException;
import com.escursioni.gitarelle.repositories.FolderRepository;
import com.escursioni.gitarelle.repositories.TrekGpxMetricsRow;
import com.escursioni.gitarelle.repositories.TrekGpxRepository;
import com.escursioni.gitarelle.repositories.TrekRepository;
import com.escursioni.gitarelle.security.CurrentUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class FolderService {

    private final FolderRepository folderRepository;
    private final TrekRepository trekRepository;
    private final TrekGpxRepository trekGpxRepository;
    private final CurrentUser currentUser;

    public FolderService(FolderRepository folderRepository, TrekRepository trekRepository, TrekGpxRepository trekGpxRepository, CurrentUser currentUser) {
        this.folderRepository = folderRepository;
        this.trekRepository = trekRepository;
        this.trekGpxRepository = trekGpxRepository;
        this.currentUser = currentUser;
    }

    public List<FolderResponseDto> findAllFolders() {
        return this.folderRepository.findAllByOwnerIdOrderByNameAsc(this.currentUser.id()).stream()
                .map(FolderResponseDto::from)
                .toList();
    }

    // solo tra le cartelle dell'utente corrente
    public Folder findFolderById(Long id) {
        return this.folderRepository.findByIdAndOwnerId(id, this.currentUser.id())
                .orElseThrow(() -> new FolderNotFoundException(id));
    }

    // cartelle scelte per un trek: tutte devono essere dell'utente corrente (null = nessuna)
    public Set<Folder> findFoldersByIds(Collection<Long> ids) {
        Set<Folder> folders = new HashSet<>();
        if (ids != null) {
            for (Long id : new HashSet<>(ids)) folders.add(findFolderById(id));
        }
        return folders;
    }

    public FolderResponseDto createFolder(FolderRequestDto requestDto) {
        String name = requestDto.name().trim();
        if (this.folderRepository.existsByOwnerIdAndNameIgnoreCase(this.currentUser.id(), name)) {
            throw new FolderAlreadyExistsException(name);
        }
        Folder folder = new Folder();
        folder.setOwner(this.currentUser.reference());
        folder.setName(name);
        return FolderResponseDto.from(this.folderRepository.save(folder));
    }

    @Transactional
    public FolderResponseDto renameFolder(Long id, FolderRequestDto requestDto) {
        Folder folder = findFolderById(id);
        String name = requestDto.name().trim();
        if (this.folderRepository.existsByOwnerIdAndNameIgnoreCaseAndIdNot(this.currentUser.id(), name, id)) {
            throw new FolderAlreadyExistsException(name);
        }
        folder.setName(name);
        return FolderResponseDto.from(this.folderRepository.save(folder));
    }

    // Elimina solo la cartella: i trek che conteneva restano (nelle altre cartelle o senza)
    @Transactional
    public void deleteFolder(Long id) {
        Folder folder = findFolderById(id);
        this.trekRepository.clearFolder(id);
        this.folderRepository.delete(folder);
    }

    // Aggiunge più trek alla cartella (quelli che c'erano già restano come sono); restituisce i trek aggiornati
    @Transactional
    public List<TrekResponseDto> addTreks(Long id, FolderTreksRequestDto requestDto) {
        Folder folder = findFolderById(id);
        List<Trek> treks = findTreks(requestDto.trekIds());
        treks.forEach(t -> t.getFolders().add(folder));
        return toResponses(treks);
    }

    // solo tra i trek dell'utente corrente: se uno manca la richiesta fallisce senza modificare nulla
    private List<Trek> findTreks(Collection<Long> trekIds) {
        Set<Long> ids = new HashSet<>(trekIds);
        List<Trek> treks = this.trekRepository.findAllByIdInAndOwnerId(ids, this.currentUser.id());
        if (treks.size() < ids.size()) {
            Set<Long> found = treks.stream().map(Trek::getId).collect(Collectors.toSet());
            throw new TrekNotFoundException(ids.stream().filter(i -> !found.contains(i)).findFirst().orElseThrow());
        }
        return treks;
    }

    private List<TrekResponseDto> toResponses(List<Trek> treks) {
        Map<Long, TrekGpxMetricsRow> metrics = this.trekGpxRepository.findMetricsByOwnerId(this.currentUser.id()).stream()
                .collect(Collectors.toMap(TrekGpxMetricsRow::trekId, Function.identity()));
        return treks.stream().map(t -> TrekResponseDto.from(t, metrics.get(t.getId()))).toList();
    }
}
