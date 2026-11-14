package com.gecarchive;

import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Starts one PostgreSQL container per test JVM.
 *
 * <p>A singleton container is required because Spring caches application contexts
 * across test classes. Restarting the container per class would change its port
 * while a cached context still points at the old one.</p>
 */
public abstract class AbstractIntegrationTest {

    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(
            DockerImageName.parse("postgres:17.12-alpine"));

    static {
        POSTGRES.start();
    }
}
