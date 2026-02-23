package com.escursioni.gitarelle.services;

import com.escursioni.gitarelle.dto.CreateTrekRequestDto;
import com.escursioni.gitarelle.entities.Trek;
import com.escursioni.gitarelle.repositories.TrekRepository;
import jakarta.validation.Valid;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;


@Service
public class TrekService {

    private final TrekRepository trekRepository;

    public TrekService(TrekRepository trekRepository){
        this.trekRepository = trekRepository;
    }

    public List<Trek> findAllTreks(){
        return this.trekRepository.findAll();
    }

    public Trek findTrekById(Long id) {
        Optional<Trek> optionalTrek = this.trekRepository.findById(id);
        return optionalTrek.orElse(null); //TODO GESTIRE CASO NULL
    }

    public Trek createTrek(@Valid CreateTrekRequestDto requestDto) {
        Trek trek = new Trek(); //TODO un bel mapper per fare sotto
        trek.setTitle(requestDto.title());
        trek.setTrekDate(requestDto.trekDate());
        trek.setNotes(requestDto.notes());
        trek.setAmichetti(requestDto.amichetti());
        trek.setLat(requestDto.lat());
        trek.setLon(requestDto.lon());

        return this.trekRepository.save(trek);
    }

}
