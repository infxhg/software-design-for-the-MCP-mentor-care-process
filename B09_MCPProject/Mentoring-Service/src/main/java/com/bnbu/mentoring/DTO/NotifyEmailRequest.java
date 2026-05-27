package com.bnbu.mentoring.DTO;

import lombok.Data;

@Data
public class NotifyEmailRequest {
    private String to;
    private String subject;
    private String body;
}
