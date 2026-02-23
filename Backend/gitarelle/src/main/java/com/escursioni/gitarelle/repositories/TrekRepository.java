package com.escursioni.gitarelle.repositories;

import com.escursioni.gitarelle.entities.Trek;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrekRepository extends JpaRepository<Trek, Long> {
}
