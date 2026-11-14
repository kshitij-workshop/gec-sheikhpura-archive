package com.gecarchive.common.dto;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PageResponseTest {

    @Test
    void mapsPageMetadata() {
        var page = new PageImpl<>(List.of("alpha", "beta"), PageRequest.of(1, 2), 5);

        PageResponse<String> response = PageResponse.from(page);

        assertThat(response.items()).containsExactly("alpha", "beta");
        assertThat(response.page()).isEqualTo(1);
        assertThat(response.size()).isEqualTo(2);
        assertThat(response.totalElements()).isEqualTo(5);
        assertThat(response.totalPages()).isEqualTo(3);
    }

    @Test
    void mapsContentWithoutChangingPagination() {
        var page = new PageImpl<>(List.of("alpha", "beta"), PageRequest.of(0, 10), 2);

        PageResponse<String> response = PageResponse.from(page, String::toUpperCase);

        assertThat(response.items()).containsExactly("ALPHA", "BETA");
        assertThat(response.totalElements()).isEqualTo(2);
    }

    @Test
    void rejectsNullItems() {
        assertThatThrownBy(() -> new PageResponse<>(null, 0, 24, 0, 0))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("items");
    }
}
