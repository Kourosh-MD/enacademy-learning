package com.enacademy.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class VerificationMailer {
    private final JavaMailSender mailSender;
    private final String publicUrl;
    public VerificationMailer(JavaMailSender mailSender, @Value("${app.public-url}") String publicUrl) {
        this.mailSender = mailSender; this.publicUrl = publicUrl;
    }

    public void send(String name, String email, String rawToken) {
        var message = new SimpleMailMessage();
        message.setFrom("hello@enacademy.local");
        message.setTo(email);
        message.setSubject("Verify your ENAcademy account");
        message.setText("Hello " + name + ",\n\nVerify your email to join the admin approval queue:\n" +
            publicUrl + "/verify?token=" + rawToken +
            "\n\nThis link expires in 24 hours. If you did not create this account, ignore this message.\n\nENAcademy");
        mailSender.send(message);
    }
}
