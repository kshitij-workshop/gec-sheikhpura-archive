package com.gecarchive.common.security;

import java.io.IOException;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;

public final class ProblemResponseWriter {

    private ProblemResponseWriter() {
    }

    public static void write(HttpServletResponse response, int status, String title, String detail)
            throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("""
                {"type":"about:blank","title":"%s","status":%d,"detail":"%s"}"""
                .formatted(escape(title), status, escape(detail)));
    }

    private static String escape(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
