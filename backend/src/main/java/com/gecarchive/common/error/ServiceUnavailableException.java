package com.gecarchive.common.error;

/**
 * Raised when a feature exists but its deployment configuration is missing.
 * The response explains nothing about servers or credentials.
 */
public class ServiceUnavailableException extends RuntimeException {

    public ServiceUnavailableException(String message) {
        super(message);
    }
}
