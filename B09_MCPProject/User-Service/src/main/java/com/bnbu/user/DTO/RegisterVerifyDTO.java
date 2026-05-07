package com.bnbu.user.DTO;

import com.bnbu.user.Entity.User;
import lombok.Data;

@Data
public class RegisterVerifyDTO {

    private User user;                    // 用户信息
    private String verificationCode;      // 验证码
}
