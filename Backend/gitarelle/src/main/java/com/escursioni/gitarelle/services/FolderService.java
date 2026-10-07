package com.escursioni.gitarelle.services;

import com.escursioni.gitarelle.dto.FolderRequestDto;
import com.escursioni.gitarelle.dto.FolderResponseDto;
import com.escursioni.gitarelle.entities.Folder;
import com.escursioni.gitarelle.exceptions.FolderAlreadyExistsException;
import com.escursioni.gitarelle.exceptions.FolderNotFoundException;
import com.escursioni.gitarelle.repositories.FolderRepository;
import com.escursioni.gitarelle.repositories.TrekRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class FolderService {

    private final FolderRepository folderRepository;
    private final TrekRepository trekRepository;

    public FolderService(FolderRepository folderRepository, TrekRepository trekRepository) {
        this.folderRepository = folderRepository;
        this.trekRepository = trekRepository;
    }

    public List<FolderResponseDto> findAllFolders() {
        return this.folderRepository.findAllByOrderByNameAsc().stream()
                .map(FolderResponseDto::from)
                .toList();
    }

    public Folder findFolderById(Long id) {
        return this.folderRepository.findById(id)
                .orElseThrow(() -> new FolderNotFoundException(id));
    }

    public FolderResponseDto createFolder(FolderRequestDto requestDto) {
        String name = requestDto.name().trim();
        if (this.folderRepository.existsByNameIgnoreCase(name)) {
            throw new FolderAlreadyExistsException(name);
        }
        Folder folder = new Folder();
        folder.setName(name);
        return FolderResponseDto.from(this.folderRepository.save(folder));
    }

    @Transactional
    public FolderResponseDto renameFolder(Long id, FolderRequestDto requestDto) {
        Folder folder = findFolderById(id);
        String name = requestDto.name().trim();
        if (this.folderRepository.existsByNameIgnoreCaseAndIdNot(name, id)) {
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
