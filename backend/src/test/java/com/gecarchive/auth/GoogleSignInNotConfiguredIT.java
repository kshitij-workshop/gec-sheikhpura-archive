package com.gecarchive.auth;

import com.gecarchive.support.AbstractAuthIntegrationTest;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Without a Client ID the feature must stay inert rather than accept tokens it
 * cannot validate. The frontend hides its button in the same situation.
 */
class GoogleSignInNotConfiguredIT extends AbstractAuthIntegrationTest {

    @Test
    void answersServiceUnavailableInsteadOfAcceptingTokens() throws Exception {
        mockMvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"idToken":"unverified-token"}"""))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.detail")
                        .value("Google sign-in is not configured for this deployment."));
    }
}
