package com.gecarchive.upload.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

import com.gecarchive.upload.config.CloudinaryProperties;

import org.springframework.stereotype.Service;

@Service
public class CloudinarySignatureService {

    private final CloudinaryProperties properties;

    public CloudinarySignatureService(CloudinaryProperties properties) {
        this.properties = properties;
    }

    public String sign(Map<String, String> parameters) {
        String payload = new TreeMap<>(parameters).entrySet().stream()
                .filter(entry -> entry.getValue() != null && !entry.getValue().isBlank())
                .map(entry -> entry.getKey() + "=" + entry.getValue())
                .collect(Collectors.joining("&"));
        return sha1(payload + properties.apiSecret());
    }

    private String sha1(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-1")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-1 is not available", exception);
        }
    }
}
