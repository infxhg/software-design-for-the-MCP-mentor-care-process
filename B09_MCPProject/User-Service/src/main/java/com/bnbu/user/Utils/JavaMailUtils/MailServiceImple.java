package com.bnbu.user.Utils.JavaMailUtils;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class MailServiceImple implements MailService{

    @Autowired
    JavaMailSender mailSender;

    @Override
    public void sendRegisterMail(String to, int verificationCode) {

        SimpleMailMessage registerMessage = new SimpleMailMessage();
        registerMessage.setFrom("shuoran2026career@163.com");
        registerMessage.setTo(to);
        registerMessage.setSubject("[Verification] You are registering B09_MCPMS account");
        registerMessage.setText("Your verification code is " +
                verificationCode+
                " please enter your verification code within 5 minutes");

        mailSender.send(registerMessage);
    }

    @Override
    public void sendNotificationMail(String to, String subject, String body) {
        if (to == null || to.isBlank()) {
            return;
        }
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom("shuoran2026career@163.com");
        message.setTo(to);
        message.setSubject(subject != null ? subject : "[MCS Notification]");
        message.setText(body != null ? body : "");
        mailSender.send(message);
    }
}
