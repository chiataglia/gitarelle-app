package com.escursioni.gitarelle.controllers;

import com.escursioni.gitarelle.dto.FolderRequestDto;
import com.escursioni.gitarelle.dto.FolderResponseDto;
import com.escursioni.gitarelle.services.FolderService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/folders")
public class FolderController {

    private final FolderService folderService;

    public FolderController(FolderService folderService) {
        this.folderService = folderService;
    }

    @GetMapping
    public List<FolderResponseDto> getAll() {
        return this.folderService.findAllFolders();
    }

    @PostMapping
    public FolderResponseDto create(@Valid @RequestBody FolderRequestDto requestDto) {
        return this.folderService.createFolder(requestDto);
    }

    @PutMapping("/{id}")
    public FolderResponseDto rename(@PathVariable Long id, @Valid @RequestBody FolderRequestDto requestDto) {
        return this.folderService.renameFolder(id, requestDto);
    }

    // I trek della cartella non vengono eliminati: restano senza cartella
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        this.folderService.deleteFolder(id);
    }
}
