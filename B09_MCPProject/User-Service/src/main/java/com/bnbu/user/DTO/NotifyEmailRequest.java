package com.bnbu.user.DTO;

import lombok.Data;

@Data
public class NotifyEmailRequest {
    private String to;
    private String subject;
    private String body;
}
