package com.escursioni.gitarelle.repositories;

import com.escursioni.gitarelle.entities.TrekGpx;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface TrekGpxRepository extends JpaRepository<TrekGpx, Long> {

    // solo gli id, senza caricare i blob dei file
    @Query("select g.trekId from TrekGpx g")
    List<Long> findAllTrekIds();
}
