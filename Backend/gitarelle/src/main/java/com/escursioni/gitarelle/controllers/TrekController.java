package com.escursioni.gitarelle.controllers;

import com.escursioni.gitarelle.dto.CreateTrekRequestDto;
import com.escursioni.gitarelle.dto.TrekColorRequestDto;
import com.escursioni.gitarelle.dto.TrekIdsRequestDto;
import com.escursioni.gitarelle.dto.TrekResponseDto;
import com.escursioni.gitarelle.dto.TrekReviewRequestDto;
import com.escursioni.gitarelle.dto.UpdateTrekLocationRequestDto;
import com.escursioni.gitarelle.services.TrekService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/treks")
public class TrekController {

    private final TrekService trekService;

    public TrekController(TrekService trekService){
        this.trekService = trekService;
    }

    @GetMapping
    public List<TrekResponseDto> getAll() {
        return this.trekService.findAllTreks();
    }

    @GetMapping("/{id}")
    public TrekResponseDto getById(@PathVariable Long id) {
        return this.trekService.getTrek(id);
    }

    @PostMapping
    public TrekResponseDto create(@Valid @RequestBody CreateTrekRequestDto requestDto) {
        return TrekResponseDto.from(this.trekService.createTrek(requestDto), null);
    }

    // Modifica i dati del trek (titolo, data, amichetti, note, punto)
    @PutMapping("/{id}")
    public TrekResponseDto update(@PathVariable Long id, @Valid @RequestBody CreateTrekRequestDto requestDto) {
        return this.trekService.updateTrek(id, requestDto);
    }

    // Elimina il trek e l'eventuale gpx associato
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        this.trekService.deleteTrek(id);
    }

    // Elimina più trek in una volta (scelti nello storico), con i loro gpx: tutti o nessuno
    @PostMapping("/delete")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMany(@Valid @RequestBody TrekIdsRequestDto requestDto) {
        this.trekService.deleteTreks(requestDto.trekIds());
    }

    // Aggiunge o sposta il punto sulla mappa di un trek esistente
    @PutMapping("/{id}/location")
    public TrekResponseDto updateLocation(@PathVariable Long id, @Valid @RequestBody UpdateTrekLocationRequestDto requestDto) {
        return this.trekService.updateLocation(id, requestDto);
    }

    // Colore della traccia sulla mappa (null = automatico)
    @PutMapping("/{id}/color")
    public TrekResponseDto updateColor(@PathVariable Long id, @Valid @RequestBody TrekColorRequestDto requestDto) {
        return this.trekService.updateColor(id, requestDto);
    }

    // Valuta il trek: stelle, fatica, paesaggio, tratti pericolosi e recensione
    @PutMapping("/{id}/review")
    public TrekResponseDto updateReview(@PathVariable Long id, @Valid @RequestBody TrekReviewRequestDto requestDto) {
        return this.trekService.updateReview(id, requestDto);
    }

}
