package com.escursioni.gitarelle.services;

import com.escursioni.gitarelle.dto.FolderRequestDto;
import com.escursioni.gitarelle.dto.FolderResponseDto;
import com.escursioni.gitarelle.entities.Folder;
import com.escursioni.gitarelle.exceptions.FolderAlreadyExistsException;
import com.escursioni.gitarelle.exceptions.FolderNotFoundException;
import com.escursioni.gitarelle.repositories.FolderRepository;
import com.escursioni.gitarelle.repositories.TrekRepository;
import com.escursioni.gitarelle.security.CurrentUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class FolderService {

    private final FolderRepository folderRepository;
    private final TrekRepository trekRepository;
    private final CurrentUser currentUser;

    public FolderService(FolderRepository folderRepository, TrekRepository trekRepository, CurrentUser currentUser) {
        this.folderRepository = folderRepository;
        this.trekRepository = trekRepository;
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

    // Elimina solo la cartella: i trek che conteneva restano, senza cartella
    @Transactional
    public void deleteFolder(Long id) {
        Folder folder = findFolderById(id);
        this.trekRepository.clearFolder(id);
        this.folderRepository.delete(folder);
    }
}
