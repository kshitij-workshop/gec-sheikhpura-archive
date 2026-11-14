package com.gecarchive.common.error;

public class ForbiddenException extends RuntimeException {

    public ForbiddenException() {
        super("You are not allowed to perform this action.");
    }

    public ForbiddenException(String message) {
        super(message);
    }
}
