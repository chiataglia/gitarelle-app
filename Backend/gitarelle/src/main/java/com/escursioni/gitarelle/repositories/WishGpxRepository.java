package com.escursioni.gitarelle.repositories;

import com.escursioni.gitarelle.entities.WishGpx;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface WishGpxRepository extends JpaRepository<WishGpx, Long> {

    // solo gli id, senza caricare i blob dei file
    @Query("select g.wishId from WishGpx g")
    List<Long> findAllWishIds();
}
