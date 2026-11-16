package com.gecarchive.auth.controller;

import com.gecarchive.auth.dto.CsrfResponse;
import com.gecarchive.auth.dto.ForgotPasswordRequest;
import com.gecarchive.auth.dto.GoogleSignInRequest;
import com.gecarchive.auth.dto.LoginRequest;
import com.gecarchive.auth.dto.MessageResponse;
import com.gecarchive.auth.dto.RegisterRequest;
import com.gecarchive.auth.dto.ResendVerificationRequest;
import com.gecarchive.auth.dto.ResetPasswordRequest;
import com.gecarchive.auth.dto.TokenResponse;
import com.gecarchive.auth.dto.VerifyEmailRequest;
import com.gecarchive.auth.service.AuthenticationService;
import com.gecarchive.auth.service.GoogleSignInService;
import com.gecarchive.auth.service.JwtTokenService;
import com.gecarchive.auth.service.PasswordResetService;
import com.gecarchive.auth.service.RegistrationService;
import com.gecarchive.auth.web.RefreshCookieFactory;
import com.gecarchive.common.security.ClientInfo;
import com.gecarchive.user.dto.UserResponse;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final RegistrationService registrationService;
    private final AuthenticationService authenticationService;
    private final GoogleSignInService googleSignInService;
    private final PasswordResetService passwordResetService;
    private final JwtTokenService jwtTokenService;
    private final RefreshCookieFactory cookieFactory;
    private final CookieCsrfTokenRepository csrfTokenRepository;

    public AuthController(
            RegistrationService registrationService,
            AuthenticationService authenticationService,
            GoogleSignInService googleSignInService,
            PasswordResetService passwordResetService,
            JwtTokenService jwtTokenService,
            RefreshCookieFactory cookieFactory,
            CookieCsrfTokenRepository csrfTokenRepository) {
        this.registrationService = registrationService;
        this.authenticationService = authenticationService;
        this.googleSignInService = googleSignInService;
        this.passwordResetService = passwordResetService;
        this.jwtTokenService = jwtTokenService;
        this.cookieFactory = cookieFactory;
        this.csrfTokenRepository = csrfTokenRepository;
    }

    @PostMapping("/register")
    public ResponseEntity<MessageResponse> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest) {
        registrationService.register(request, ClientInfo.from(httpRequest));
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(new MessageResponse(
                "If the address can be registered, a verification email has been sent."));
    }

    @PostMapping("/verify-email")
    public ResponseEntity<Void> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        registrationService.verifyEmail(request.token());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<MessageResponse> resendVerification(
            @Valid @RequestBody ResendVerificationRequest request,
            HttpServletRequest httpRequest) {
        registrationService.resendVerification(request.email(), ClientInfo.from(httpRequest));
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(new MessageResponse(
                "If an unverified account exists, a new verification email has been sent."));
    }

    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        AuthenticationService.Session session = authenticationService.login(
                request, httpRequest.getRemoteAddr());
        return tokenResponse(session, HttpStatus.OK);
    }

    @PostMapping("/google")
    public ResponseEntity<TokenResponse> google(
            @Valid @RequestBody GoogleSignInRequest request,
            HttpServletRequest httpRequest) {
        AuthenticationService.Session session = googleSignInService.signIn(
                request, ClientInfo.from(httpRequest));
        return tokenResponse(session, HttpStatus.OK);
    }

    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(HttpServletRequest httpRequest) {
        AuthenticationService.Session session = authenticationService.refresh(
                readRefreshCookie(httpRequest));
        return tokenResponse(session, HttpStatus.OK);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest httpRequest) {
        authenticationService.logout(readRefreshCookie(httpRequest));
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, cookieFactory.clear().toString())
                .build();
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<MessageResponse> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request,
            HttpServletRequest httpRequest) {
        passwordResetService.requestReset(request, ClientInfo.from(httpRequest));
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(new MessageResponse(
                "If an account exists for that address, a password reset email has been sent."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request,
            HttpServletRequest httpRequest) {
        passwordResetService.resetPassword(request, ClientInfo.from(httpRequest));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/csrf")
    public CsrfResponse csrf(HttpServletRequest request, HttpServletResponse response) {
        CsrfToken token = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
        if (token == null) {
            token = csrfTokenRepository.generateToken(request);
            csrfTokenRepository.saveToken(token, request, response);
        }
        return new CsrfResponse(token.getToken(), token.getHeaderName());
    }

    private ResponseEntity<TokenResponse> tokenResponse(
            AuthenticationService.Session session,
            HttpStatus status) {
        TokenResponse body = new TokenResponse(
                session.accessToken(),
                "Bearer",
                jwtTokenService.accessTokenTtlSeconds(),
                UserResponse.from(session.user()));
        return ResponseEntity.status(status)
                .header(HttpHeaders.SET_COOKIE,
                        cookieFactory.create(session.refreshToken(), session.refreshExpiresAt()).toString())
                .body(body);
    }

    private String readRefreshCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        String cookieName = cookieFactory.cookieName();
        for (Cookie cookie : cookies) {
            if (cookieName.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }
}
