package com.bnbu.user.DTO;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class FacultyConsultantVO {
    private String id;
    private String username;
    private String realName;
    private String phone;
    private String email;
    private Integer status;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
