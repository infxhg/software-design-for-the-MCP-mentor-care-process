package com.bnbu.user.DTO;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateFacultyConsultantRequest {

    private String realName;

    private String phone;

    @Email(message = "invalid email format")
    private String email;

    private Integer status;

    @Size(min = 6, message = "password must be at least 6 characters")
    private String password;
}
