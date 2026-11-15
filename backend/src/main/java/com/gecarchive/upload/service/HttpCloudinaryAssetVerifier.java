package com.gecarchive.upload.service;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.Map;

import com.gecarchive.upload.config.CloudinaryProperties;

import org.springframework.context.annotation.Profile;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriUtils;

@Component
@Profile("!test")
public class HttpCloudinaryAssetVerifier implements CloudinaryAssetVerifier {

    private final CloudinaryProperties properties;
    private final RestClient restClient;

    public HttpCloudinaryAssetVerifier(CloudinaryProperties properties) {
        this.properties = properties;
        this.restClient = RestClient.builder()
                .baseUrl("https://api.cloudinary.com/v1_1/" + properties.cloudName())
                .build();
    }

    @Override
    public CloudinaryAsset verify(String publicId) {
        requireConfiguration();
        // A Cloudinary public ID may contain folder separators. Encode each
        // path component while preserving `/`; the Admin API uses those
        // separators to address nested public IDs.
        String encoded = UriUtils.encodePath(publicId, StandardCharsets.UTF_8);
        Map<String, Object> response = restClient.get()
                .uri("/resources/image/upload/" + encoded)
                .header(HttpHeaders.AUTHORIZATION, basicAuth())
                .retrieve()
                .body(new ParameterizedTypeReference<>() {});
        if (response == null) throw new IllegalStateException("Cloudinary returned an empty asset response");
        return new CloudinaryAsset(
                text(response, "asset_id"),
                text(response, "public_id"),
                text(response, "resource_type"),
                text(response, "type"),
                text(response, "format"),
                number(response, "width").intValue(),
                number(response, "height").intValue(),
                number(response, "bytes").longValue(),
                parseInstant(text(response, "created_at")));
    }

    @Override
    public void delete(String publicId) {
        requireConfiguration();
        String encodedPublicId = UriUtils.encodeQueryParam(publicId, StandardCharsets.UTF_8);
        restClient.method(HttpMethod.DELETE).uri("/resources/image/upload")
                .header(HttpHeaders.AUTHORIZATION, basicAuth())
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body("public_ids[]=" + encodedPublicId)
                .retrieve().toBodilessEntity();
    }

    private String basicAuth() {
        return "Basic " + Base64.getEncoder().encodeToString(
                (properties.apiKey() + ":" + properties.apiSecret()).getBytes(StandardCharsets.UTF_8));
    }

    private void requireConfiguration() {
        if (properties.cloudName() == null || properties.cloudName().isBlank()
                || properties.apiKey() == null || properties.apiKey().isBlank()
                || properties.apiSecret() == null || properties.apiSecret().isBlank()) {
            throw new IllegalStateException("Cloudinary credentials are not configured");
        }
    }

    private String text(Map<String, Object> values, String key) {
        Object value = values.get(key);
        return value == null ? null : value.toString();
    }

    private Number number(Map<String, Object> values, String key) {
        Object value = values.get(key);
        if (!(value instanceof Number number)) throw new IllegalStateException("Cloudinary response is missing " + key);
        return number;
    }

    private Instant parseInstant(String value) {
        return OffsetDateTime.parse(value).toInstant();
    }
}
