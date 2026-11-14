package com.gecarchive;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
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

        assertThat(appliedMigrations).isPositive();
        assertThat(metadataRows).isEqualTo(1);
    }
}
