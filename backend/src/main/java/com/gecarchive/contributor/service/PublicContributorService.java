package com.gecarchive.contributor.service;

import com.gecarchive.common.dto.PageResponse;
import com.gecarchive.contributor.dto.PublicContributorResponse;
import com.gecarchive.contributor.repository.ContributorProfileRepository;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Public read side of the contributor directory.
 *
 * <p>Only published, non-deleted profiles are visible, and the response carries
 * no account identifiers or contact details.</p>
 */
@Service
public class PublicContributorService {

    private static final int MAX_PAGE_SIZE = 100;

    private final ContributorProfileRepository contributors;

    public PublicContributorService(ContributorProfileRepository contributors) {
        this.contributors = contributors;
    }

    @Transactional(readOnly = true)
    public PageResponse<PublicContributorResponse> directory(int page, int size) {
        var pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), MAX_PAGE_SIZE),
                Sort.by(Sort.Direction.ASC, "displayName").and(Sort.by(Sort.Direction.ASC, "id")));
        return PageResponse.from(contributors.findByPublishedTrueAndDeletedAtIsNull(pageable),
                PublicContributorResponse::from);
    }
}
