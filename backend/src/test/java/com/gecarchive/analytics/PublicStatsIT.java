package com.gecarchive.analytics;

import java.util.UUID;

import com.gecarchive.support.AbstractAuthIntegrationTest;
import com.gecarchive.user.entity.Role;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PublicStatsIT extends AbstractAuthIntegrationTest {

    @Test
    void guestsCanReadAggregateArchiveStats() throws Exception {
        createActiveUser(uniqueEmail("stats-reader"), defaultPassword(), Role.USER);

        mockMvc.perform(get("/api/v1/public-stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalVisitors").isNumber())
                .andExpect(jsonPath("$.visitorsToday").isNumber())
                .andExpect(jsonPath("$.registeredUsers").isNumber())
                .andExpect(jsonPath("$.activeUsers").isNumber())
                .andExpect(jsonPath("$.visitorId").doesNotExist())
                .andExpect(jsonPath("$.email").doesNotExist());
    }

    @Test
    void registeredUsersCountsVerifiedAccounts() throws Exception {
        long before = readStat("$.registeredUsers");
        createActiveUser(uniqueEmail("stats-member"), defaultPassword(), Role.USER);

        assertThat(readStat("$.registeredUsers")).isEqualTo(before + 1);
    }

    @Test
    void repeatVisitsFromOneBrowserCountOncePerDay() throws Exception {
        long visitorsBefore = readStat("$.totalVisitors");
        long todayBefore = readStat("$.visitorsToday");
        UUID visitor = UUID.randomUUID();

        recordVisit(visitor);
        recordVisit(visitor);

        assertThat(readStat("$.totalVisitors")).isEqualTo(visitorsBefore + 1);
        assertThat(readStat("$.visitorsToday")).isEqualTo(todayBefore + 1);
    }

    @Test
    void eachBrowserIsCountedSeparately() throws Exception {
        long visitorsBefore = readStat("$.totalVisitors");

        recordVisit(UUID.randomUUID());
        recordVisit(UUID.randomUUID());

        assertThat(readStat("$.totalVisitors")).isEqualTo(visitorsBefore + 2);
    }

    @Test
    void malformedVisitorIdentifiersAreRejected() throws Exception {
        mockMvc.perform(post("/api/v1/public-stats/visits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"visitorId\":\"not-a-uuid\"}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/v1/public-stats/visits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    private void recordVisit(UUID visitorId) throws Exception {
        mockMvc.perform(post("/api/v1/public-stats/visits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"visitorId\":\"%s\"}".formatted(visitorId)))
                .andExpect(status().isNoContent());
    }

    private long readStat(String path) throws Exception {
        String body = mockMvc.perform(get("/api/v1/public-stats"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return ((Number) com.jayway.jsonpath.JsonPath.read(body, path)).longValue();
    }
}
