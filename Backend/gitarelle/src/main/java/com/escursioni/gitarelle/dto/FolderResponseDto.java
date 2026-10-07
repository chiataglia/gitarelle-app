package com.escursioni.gitarelle.dto;

import com.escursioni.gitarelle.entities.Folder;

public record FolderResponseDto(Long id, String name) {

    public static FolderResponseDto from(Folder folder) {
        return new FolderResponseDto(folder.getId(), folder.getName());
    }
}
