package com.bnbu.user.DTO;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class OperationLogVO {
    private String id;
    private String userId;
    private String username;
    private String action;
    private String detail;
    private LocalDateTime createTime;
}
