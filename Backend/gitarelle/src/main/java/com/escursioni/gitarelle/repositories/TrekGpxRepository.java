package com.escursioni.gitarelle.repositories;

import com.escursioni.gitarelle.entities.TrekGpx;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TrekGpxRepository extends JpaRepository<TrekGpx, Long> {

    // solo gli id, senza caricare i blob dei file
    @Query("select g.trekId from TrekGpx g")
    List<Long> findAllTrekIds();

    // distanza e dislivello dei gpx di un utente, senza caricare i file
    @Query("select new com.escursioni.gitarelle.repositories.TrekGpxMetricsRow(g.trekId, g.distanceMeters, g.elevationGainMeters) "
            + "from TrekGpx g where g.trek.owner.id = :ownerId")
    List<TrekGpxMetricsRow> findMetricsByOwnerId(@Param("ownerId") Long ownerId);

    // gpx caricati prima del calcolo automatico: vanno calcolati una volta (qui il file serve)
    @Query("select g from TrekGpx g where g.trek.owner.id = :ownerId and g.distanceMeters is null")
    List<TrekGpx> findWithoutMetricsByOwnerId(@Param("ownerId") Long ownerId);
}
