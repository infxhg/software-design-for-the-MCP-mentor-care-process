package com.bnbu.mentoring.DTO;

import lombok.Data;

@Data
public class ForwardCaseRequest {
    private String studentId;
    private String description;
    private String targetCoordinatorId;
    private String targetConsultantId;
}
