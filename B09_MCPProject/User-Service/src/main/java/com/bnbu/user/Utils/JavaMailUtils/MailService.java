package com.bnbu.user.Utils.JavaMailUtils;

public interface MailService {

    void sendRegisterMail(String to, int verificationCode);

    /**
     * Demo：案例/预约等业务通知（模拟对接邮件服务，失败不抛给调用方）
     */
    void sendNotificationMail(String to, String subject, String body);
}
