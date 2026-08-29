package com.enacademy;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class EnacademyApiApplication {

	public static void main(String[] args) {
		SpringApplication.run(EnacademyApiApplication.class, args);
	}

}
