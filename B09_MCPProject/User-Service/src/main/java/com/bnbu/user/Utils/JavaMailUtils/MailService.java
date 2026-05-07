package com.bnbu.user.Utils.JavaMailUtils;

public interface MailService {

    void sendRegisterMail(String to, int verificationCode);
}
