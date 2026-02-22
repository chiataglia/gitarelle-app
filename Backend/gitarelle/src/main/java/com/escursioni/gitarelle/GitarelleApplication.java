package com.escursioni.gitarelle;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class GitarelleApplication {

	public static void main(String[] args) {
		SpringApplication.run(GitarelleApplication.class, args);
		Prova.method();
	}

}
