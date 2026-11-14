package com.gecarchive.common.security;

import jakarta.servlet.http.HttpServletRequest;

public record ClientInfo(String ipAddress, String userAgent) {

    private static final int MAX_USER_AGENT_LENGTH = 255;

    public static ClientInfo from(HttpServletRequest request) {
        if (request == null) {
            return new ClientInfo(null, null);
        }
        String userAgent = request.getHeader("User-Agent");
        if (userAgent != null && userAgent.length() > MAX_USER_AGENT_LENGTH) {
            userAgent = userAgent.substring(0, MAX_USER_AGENT_LENGTH);
        }
        return new ClientInfo(request.getRemoteAddr(), userAgent);
    }
}
