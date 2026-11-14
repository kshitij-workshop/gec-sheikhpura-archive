package com.gecarchive.analytics.service;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.gecarchive.album.repository.AlbumRepository;
import com.gecarchive.analytics.dto.AnalyticsResponse;
import com.gecarchive.contributor.repository.ContributorProfileRepository;
import com.gecarchive.event.repository.AcademicYearRepository;
import com.gecarchive.event.repository.CategoryRepository;
import com.gecarchive.event.repository.EventRepository;
import com.gecarchive.event.repository.EventSuggestionRepository;
import com.gecarchive.event.entity.SuggestionStatus;
import com.gecarchive.moderation.entity.RemovalRequestStatus;
import com.gecarchive.moderation.entity.ReportStatus;
import com.gecarchive.moderation.repository.PhotoRemovalRequestRepository;
import com.gecarchive.moderation.repository.PhotoReportRepository;
import com.gecarchive.photo.entity.PhotoStatus;
import com.gecarchive.photo.entity.SubmissionStatus;
import com.gecarchive.photo.repository.PhotoRepository;
import com.gecarchive.photo.repository.PhotoSubmissionRepository;
import com.gecarchive.user.entity.Role;
import com.gecarchive.user.entity.UserStatus;
import com.gecarchive.user.repository.UserRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AnalyticsService {

    private final PhotoRepository photos;
    private final PhotoSubmissionRepository submissions;
    private final PhotoReportRepository reports;
    private final PhotoRemovalRequestRepository removalRequests;
    private final EventSuggestionRepository suggestions;
    private final UserRepository users;
    private final EventRepository events;
    private final AlbumRepository albums;
    private final AcademicYearRepository academicYears;
    private final CategoryRepository categories;
    private final ContributorProfileRepository contributors;

    public AnalyticsService(
            PhotoRepository photos,
            PhotoSubmissionRepository submissions,
            PhotoReportRepository reports,
            PhotoRemovalRequestRepository removalRequests,
            EventSuggestionRepository suggestions,
            UserRepository users,
            EventRepository events,
            AlbumRepository albums,
            AcademicYearRepository academicYears,
            CategoryRepository categories,
            ContributorProfileRepository contributors) {
        this.photos = photos;
        this.submissions = submissions;
        this.reports = reports;
        this.removalRequests = removalRequests;
        this.suggestions = suggestions;
        this.users = users;
        this.events = events;
        this.albums = albums;
        this.academicYears = academicYears;
        this.categories = categories;
        this.contributors = contributors;
    }

    @Transactional(readOnly = true)
    public AnalyticsResponse summary() {
        return new AnalyticsResponse(
                statusCounts(photos.countGroupedByStatus(), PhotoStatus.class),
                statusCounts(submissions.countGroupedByStatus(), SubmissionStatus.class),
                statusCounts(reports.countGroupedByStatus(), ReportStatus.class),
                statusCounts(removalRequests.countGroupedByStatus(), RemovalRequestStatus.class),
                statusCounts(suggestions.countGroupedByStatus(), SuggestionStatus.class),
                statusCounts(users.countGroupedByStatus(), UserStatus.class),
                statusCounts(users.countGroupedByRole(), Role.class),
                events.count(),
                events.countByPublishedTrueAndDeletedAtIsNull(),
                albums.count(),
                albums.countByPublishedTrueAndDeletedAtIsNull(),
                academicYears.count(),
                categories.count(),
                categories.countByActiveTrue(),
                contributors.countByPublishedTrueAndDeletedAtIsNull());
    }

    /**
     * Materialises every enum constant with a zero default so the dashboard can
     * render a stable table regardless of which states currently occur.
     */
    @SuppressWarnings("unchecked")
    private static <E extends Enum<E>> Map<String, Long> statusCounts(List<Object[]> rows, Class<E> type) {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (E value : type.getEnumConstants()) {
            counts.put(value.name(), 0L);
        }
        for (Object[] row : rows) {
            counts.put(((E) row[0]).name(), (Long) row[1]);
        }
        return Collections.unmodifiableMap(counts);
    }
}
