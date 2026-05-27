package com.bnbu.user.DTO;

import lombok.Data;

@Data
public class RecordOperationLogRequest {
    private String userId;
    private String username;
    private String action;
    private String detail;
}
