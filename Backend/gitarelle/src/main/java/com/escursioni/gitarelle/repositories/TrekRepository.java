package com.escursioni.gitarelle.repositories;

import com.escursioni.gitarelle.entities.Trek;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TrekRepository extends JpaRepository<Trek, Long> {

    // toglie la cartella a tutti i suoi trek (prima di eliminarla)
    @Modifying
    @Query("update Trek t set t.folder = null where t.folder.id = :folderId")
    void clearFolder(@Param("folderId") Long folderId);
}
