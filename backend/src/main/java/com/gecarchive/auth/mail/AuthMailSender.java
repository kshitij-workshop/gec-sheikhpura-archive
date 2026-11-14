package com.gecarchive.auth.mail;

import com.gecarchive.user.entity.User;

public interface AuthMailSender {

    void sendVerificationEmail(User user, String token);

    void sendPasswordResetEmail(User user, String token);
}
