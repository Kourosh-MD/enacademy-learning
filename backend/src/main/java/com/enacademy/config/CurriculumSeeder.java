package com.enacademy.config;

import com.enacademy.learning.LearningRepository;
import com.enacademy.learning.LearningRepository.LessonSummary;
import com.enacademy.learning.LearningRepository.ModuleRow;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class CurriculumSeeder implements ApplicationRunner {
    private final LearningRepository learning; private final ObjectMapper mapper;
    public CurriculumSeeder(LearningRepository learning,ObjectMapper mapper){this.learning=learning;this.mapper=mapper;}

    @Override @Transactional
    public void run(ApplicationArguments args) throws IOException {
        JsonNode root=mapper.readTree(new ClassPathResource("curriculum.json").getInputStream());
        Map<String,String> lessonModules=new HashMap<>(); int modulePosition=0;
        for(JsonNode module:root.path("modules")){
            modulePosition++;
            learning.insertModule(new ModuleRow(module.path("id").asText(),module.path("level").asText(),
                module.path("unit").asInt(),module.path("title").asText(),module.path("description").asText(),
                module.path("outcome").asText(),modulePosition));
            for(JsonNode id:module.path("lessonIds")) lessonModules.put(id.asText(),module.path("id").asText());
        }
        int position=0;
        for(JsonNode lesson:root.path("lessons")){
            position++;
            String slug=lesson.path("id").asText();
            learning.insertLesson(lessonModules.get(slug),new LessonSummary(slug,lesson.path("level").asText(),
                lesson.path("unit").asInt(),lesson.path("title").asText(),lesson.path("objective").asText(),
                lesson.path("duration").asInt(12),lesson.path("xp").asInt(50),position),mapper.writeValueAsString(lesson));
        }
    }
}
