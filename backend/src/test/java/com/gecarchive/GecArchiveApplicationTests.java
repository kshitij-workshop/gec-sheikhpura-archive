package com.gecarchive;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class GecArchiveApplicationTests extends AbstractIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void contextLoadsAndFlywayBaselineIsApplied() {
        Integer appliedMigrations = jdbcTemplate.queryForObject(
                "select count(*) from flyway_schema_history where success = true",
                Integer.class);
        Integer metadataRows = jdbcTemplate.queryForObject(
                "select count(*) from app_metadata",
                Integer.class);
        String schemaPhase = jdbcTemplate.queryForObject(
                "select metadata_value from app_metadata where metadata_key = 'schema_phase'",
                String.class);

        assertThat(appliedMigrations).isGreaterThanOrEqualTo(4);
        assertThat(metadataRows).isEqualTo(1);
        assertThat(schemaPhase).isEqualTo("phase-04");
    }
}
