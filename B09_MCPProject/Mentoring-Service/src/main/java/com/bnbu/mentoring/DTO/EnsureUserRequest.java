package com.bnbu.mentoring.DTO;

import lombok.Data;

@Data
public class EnsureUserRequest {
    private String id;
    private String username;
    private String email;
    private String realName;
    private String phone;
    private String roleCode;
    private String password;
    private Integer status;
}
