package com.escursioni.gitarelle.repositories;

import com.escursioni.gitarelle.entities.TrekGpx;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrekGpxRepository extends JpaRepository<TrekGpx, Long> {}