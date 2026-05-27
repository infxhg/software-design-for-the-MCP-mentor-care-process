package com.bnbu.user.DTO;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateFacultyConsultantRequest {

    @NotBlank(message = "username is required")
    private String username;

    @NotBlank(message = "password is required")
    @Size(min = 6, message = "password must be at least 6 characters")
    private String password;

    private String realName;

    private String phone;

    @NotBlank(message = "email is required")
    @Email(message = "invalid email format")
    private String email;

    /** 1=启用 0=停用，默认启用 */
    private Integer status;
}
