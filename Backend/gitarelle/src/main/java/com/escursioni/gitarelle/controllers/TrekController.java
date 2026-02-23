package com.escursioni.gitarelle.controllers;

import com.escursioni.gitarelle.dto.CreateTrekRequestDto;
import com.escursioni.gitarelle.entities.Trek;
import com.escursioni.gitarelle.services.TrekService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@CrossOrigin(origins = "http://localhost:5173")
@RequestMapping("/api/treks")
public class TrekController {

    private final TrekService trekService;

    public TrekController(TrekService trekService){
        this.trekService = trekService;
    }

    @GetMapping
    public List<Trek> getAll() {
        return this.trekService.findAllTreks();
    }

    @GetMapping("/{id}")
    public Trek getById(@PathVariable Long id) {
        return this.trekService.findTrekById(id);
    }

    @PostMapping
    public Trek create(@Valid @RequestBody CreateTrekRequestDto requestDto) {
        return this.trekService.createTrek(requestDto);
    }


//TODO: GESTIRE ERRORI, PREPARARE RESPONSEDTOSUCCESS E RESPONSEDTOERROR


}
