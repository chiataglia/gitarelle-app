package com.escursioni.gitarelle.repositories;

import com.escursioni.gitarelle.entities.TrekGpx;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TrekGpxRepository extends JpaRepository<TrekGpx, Long> {

    // distanza e dislivello del gpx di un trek, senza caricare il file
    @Query("select new com.escursioni.gitarelle.repositories.TrekGpxMetricsRow(g.trekId, g.distanceMeters, g.elevationGainMeters) "
            + "from TrekGpx g where g.trekId = :trekId")
    Optional<TrekGpxMetricsRow> findMetricsByTrekId(@Param("trekId") Long trekId);

    // distanza e dislivello dei gpx di un utente, senza caricare i file
    @Query("select new com.escursioni.gitarelle.repositories.TrekGpxMetricsRow(g.trekId, g.distanceMeters, g.elevationGainMeters) "
            + "from TrekGpx g where g.trek.owner.id = :ownerId")
    List<TrekGpxMetricsRow> findMetricsByOwnerId(@Param("ownerId") Long ownerId);

    // gpx caricati prima del calcolo automatico: vanno calcolati una volta (qui il file serve)
    @Query("select g from TrekGpx g where g.trek.owner.id = :ownerId and g.distanceMeters is null")
    List<TrekGpx> findWithoutMetricsByOwnerId(@Param("ownerId") Long ownerId);
}
