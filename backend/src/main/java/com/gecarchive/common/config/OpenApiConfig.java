package com.gecarchive.common.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    OpenAPI archiveOpenApi() {
        return new OpenAPI().info(new Info()
                .title("GEC Sheikhpura Archive API")
                .version("v1")
                .description("Public archive and contribution API. Phase 00 foundation."));
    }
}
