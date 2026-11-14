package com.gecarchive.common.text;

import java.util.Locale;

public final class Emails {

    private Emails() {
    }

    public static String normalize(String email) {
        if (email == null) {
            return null;
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
